import os
import sys
import pandas as pd
import mysql.connector
from mysql.connector import Error
from tqdm import tqdm
from datetime import datetime
from dotenv import load_dotenv

load_dotenv('.env')

host = os.getenv("DB_HOST")        
user = os.getenv("DB_USER")         
password = os.getenv("DB_PASSWORD") 
database = os.getenv("DB_DATABASE") 
port = int(os.getenv("DB_PORT", 3306)) 

def format_sql_value(val):
    if val is None or pd.isna(val):
        return "NULL"
    elif isinstance(val, (int, float)):
        return str(val)
    else:
        return "'" + str(val).replace("'", "''") + "'"

def push_delta_to_remote_db(csv_file, table_name, key_column, host, user, password, database, port):
# remove the data and insert the new data from the csv file
    try:
        new_df = pd.read_csv(csv_file)
    except FileNotFoundError:
        print(f"cannot find {csv_file} ")
        return
    except Exception as e:
        print(f"error:{e}")
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
            print("cannot connect to the database")
            return
        cursor = connection.cursor()
        print(f"connected {database}")

        # delete all data from the table
        delete_sql = f"DELETE FROM `{table_name}`"
        cursor.execute(delete_sql)
        connection.commit()
        print(f"table `{table_name}` cleaned。")

        # insert new data from the CSV file
        columns = new_df.columns.tolist()
        placeholders = ', '.join(['%s'] * len(columns))
        col_names = ', '.join([f"`{col}`" for col in columns])
        insert_sql = f"INSERT INTO `{table_name}` ({col_names}) VALUES ({placeholders})"
        
        insert_data = []
        sql_statements = []
        for index, row in new_df.iterrows():
            row_data = [None if pd.isna(x) else x for x in row]
            insert_data.append(tuple(row_data))
            values_str = ', '.join(format_sql_value(x) for x in row_data)
            sql_statements.append(f"INSERT INTO `{table_name}` ({col_names}) VALUES ({values_str});")
        
        if insert_data:
            cursor.executemany(insert_sql, insert_data)
            connection.commit()
            print(f"insert {len(insert_data)} data")
        
        sql_file = f"delta_{datetime.now().strftime('%y%m%d')}.sql"
        with open(sql_file, "w", encoding="utf-8") as f:
            f.write("\n".join(sql_statements))
        print(f"SQL save to {sql_file}")
                
    except Error as e:
        print(f"error: {e}")
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()
            print("MySQL disconnected")