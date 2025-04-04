import os
import sys
import pandas as pd
import mysql.connector
from mysql.connector import Error
from tqdm import tqdm
from datetime import datetime
from dotenv import load_dotenv

# 加载 .env 文件
load_dotenv('.env')

# 从环境变量中提取数据库连接信息
host = os.getenv("DB_HOST")        
user = os.getenv("DB_USER")         
password = os.getenv("DB_PASSWORD") 
database = os.getenv("DB_DATABASE") 
port = int(os.getenv("DB_PORT", 3306)) 

def format_sql_value(val):
    """将Python值格式化为SQL字面量"""
    if val is None or pd.isna(val):
        return "NULL"
    elif isinstance(val, (int, float)):
        return str(val)
    else:
        # 转换为字符串，并转义单引号
        return "'" + str(val).replace("'", "''") + "'"

def push_delta_to_remote_db(csv_file, table_name, key_column, host, user, password, database, port):
    """
    同步 CSV 数据与数据库中记录的差异，仅对比 key_column（这里为 houseId）。
    对于 CSV 中存在但数据库中不存在的记录执行 INSERT，
    对于存在的记录若数据不同则执行 UPDATE。
    同时在本地生成一个 SQL 文件保存这些差异操作语句。
    """
    try:
        new_df = pd.read_csv(csv_file)
    except FileNotFoundError:
        print(f"错误：文件 {csv_file} 未找到。")
        return
    except Exception as e:
        print(f"读取 CSV 文件时错误：{e}")
        return

    try:
        connection = mysql.connector.connect(
            host=host,
            user=user,
            password=password,
            database=database,
            port=port
        )
        if not connection.is_connected():
            print("无法连接到数据库")
            return
        cursor = connection.cursor()
        print(f"成功连接到数据库 {database}")

        # 查询数据库中现有的数据
        cursor.execute(f"SELECT * FROM `{table_name}`")
        rows = cursor.fetchall()
        db_columns = [desc[0] for desc in cursor.description]
        db_df = pd.DataFrame(rows, columns=db_columns)
        
        # 将 CSV 中和数据库中的 key_column (houseId) 转换为整数（使用 pd.to_numeric，并转换为 Int64 类型）
        new_df[key_column] = pd.to_numeric(new_df[key_column], errors='coerce').astype('Int64')
        if not db_df.empty:
            db_df[key_column] = pd.to_numeric(db_df[key_column], errors='coerce').astype('Int64')
        else:
            db_df = pd.DataFrame(columns=new_df.columns)
        
        # 构建两边的 keys 集合（剔除缺失值），保证 key 类型为 int
        new_keys = set(new_df[key_column].dropna().astype(int))
        db_keys = set(db_df[key_column].dropna().astype(int))
        
        # 仅将 CSV 中不存在于数据库中的记录插入进来
        to_insert_df = new_df[new_df[key_column].isin(new_keys - db_keys)]
        
        # 对于公共数据，找出那些数据存在差异的记录（需要更新）
        common_keys = new_keys.intersection(db_keys)
        update_rows = []
        for key in common_keys:
            new_row = new_df[new_df[key_column] == key].iloc[0]
            db_row = db_df[db_df[key_column] == key].iloc[0]
            differences = False
            for col in new_df.columns:
                if col == key_column:
                    continue
                # 简单采用字符串比较，若不一致则认为记录有差异
                if str(new_row[col]) != str(db_row[col]):
                    differences = True
                    break
            if differences:
                update_rows.append(new_row)
        to_update_df = pd.DataFrame(update_rows)
        
        # 用于保存生成的 SQL 语句
        sql_statements = []
        
        # 构造 INSERT 语句（参数化查询执行，同时保存文本版SQL供记录）
        if not to_insert_df.empty:
            columns = new_df.columns.tolist()
            placeholders = ', '.join(['%s'] * len(columns))
            col_names = ', '.join([f"`{col}`" for col in columns])
            insert_sql = f"INSERT INTO `{table_name}` ({col_names}) VALUES ({placeholders})"
            insert_data = []
            for index, row in to_insert_df.iterrows():
                row_data = [None if pd.isna(x) else x for x in row]
                insert_data.append(tuple(row_data))
                # 生成文本版 SQL 语句
                values_str = ', '.join(format_sql_value(x) for x in row_data)
                sql_statements.append(f"INSERT INTO `{table_name}` ({col_names}) VALUES ({values_str});")
            cursor.executemany(insert_sql, insert_data)
            connection.commit()
            print(f"成功插入 {len(insert_data)} 条新记录。")
        
        # 构造 UPDATE 语句（更新除 key_column 外的所有字段）
        if not to_update_df.empty:
            update_cols = [col for col in new_df.columns if col != key_column]
            set_clause = ', '.join([f"`{col}` = %s" for col in update_cols])
            update_sql = f"UPDATE `{table_name}` SET {set_clause} WHERE `{key_column}` = %s"
            update_count = 0
            for index, row in to_update_df.iterrows():
                update_values = []
                # 生成文本更新语句使用
                set_parts = []
                for col in update_cols:
                    val = None if pd.isna(row[col]) else row[col]
                    update_values.append(val)
                    set_parts.append(f"`{col}` = {format_sql_value(val)}")
                update_values.append(row[key_column])
                cursor.execute(update_sql, update_values)
                update_count += 1
                # 生成文本版 SQL 语句
                set_clause_text = ', '.join(set_parts)
                sql_statements.append(f"UPDATE `{table_name}` SET {set_clause_text} WHERE `{key_column}` = {format_sql_value(row[key_column])};")
            connection.commit()
            print(f"成功更新 {update_count} 条记录。")
        
        # 将SQL语句写入本地文件
        sql_file = f"delta_{datetime.now().strftime('%y%m%d')}.sql"
        with open(sql_file, "w", encoding="utf-8") as f:
            f.write("\n".join(sql_statements))
        print(f"SQL 语句已写入 {sql_file}")
            
    except Error as e:
        print(f"数据库错误: {e}")
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()
            print("MySQL 连接已关闭")