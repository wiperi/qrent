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
    清空数据库中指定表的数据（使用 DELETE FROM 形式），
    然后将 CSV 文件中的所有记录全部 INSERT 到数据库中，
    同时在本地生成一个 SQL 文件保存这些插入操作的 SQL 语句。
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

        # 清空表内所有数据（使用 DELETE FROM）
        delete_sql = f"DELETE FROM `{table_name}`"
        cursor.execute(delete_sql)
        connection.commit()
        print(f"表 `{table_name}` 内的数据已清空。")

        # 将 CSV 文件中的所有数据全部插入
        columns = new_df.columns.tolist()
        placeholders = ', '.join(['%s'] * len(columns))
        col_names = ', '.join([f"`{col}`" for col in columns])
        insert_sql = f"INSERT INTO `{table_name}` ({col_names}) VALUES ({placeholders})"
        
        insert_data = []
        sql_statements = []
        for index, row in new_df.iterrows():
            row_data = [None if pd.isna(x) else x for x in row]
            insert_data.append(tuple(row_data))
            # 生成文本版 SQL 语句记录
            values_str = ', '.join(format_sql_value(x) for x in row_data)
            sql_statements.append(f"INSERT INTO `{table_name}` ({col_names}) VALUES ({values_str});")
        
        if insert_data:
            cursor.executemany(insert_sql, insert_data)
            connection.commit()
            print(f"成功插入 {len(insert_data)} 条记录。")
        
        # 将生成的 SQL 语句写入本地文件
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