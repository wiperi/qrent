## 使用先前的提取方式

import pandas as pd
from datetime import datetime
import os
import sys
import mysql.connector
from tqdm import tqdm
from mysql.connector import Error

def csv_to_sql(csv_file, table_name, sql_file):
    try:
        df = pd.read_csv(csv_file)
    except FileNotFoundError:
        print(f"error {csv_file} does not exist")
        return
    except Exception as e:
        print(f"error:{e}")
        return

    sql_statements = f"DELETE FROM `{table_name}`;\n\n"

    columns = df.columns
    insert_stmt = f"INSERT INTO `{table_name}` ({', '.join(['`' + col + '`' for col in columns])}) VALUES\n"
    values = []

    for index, row in df.iterrows():
        row_values = []
        for item in row:
            if pd.isnull(item):
                row_values.append("NULL")
            elif isinstance(item, (int, float)):
                row_values.append(str(item))
            else:
                escaped_item = str(item).replace("'", "\\'")
                row_values.append(f"'{escaped_item}'")
        values.append(f"  ({', '.join(row_values)})")

    insert_stmt += ",\n".join(values) + ";\n"
    sql_statements += insert_stmt


    try:
        with open(sql_file, 'w', encoding='utf-8') as f:
            f.write(sql_statements)
        print(f"save {csv_file} to {sql_file}, change {table_name}")
    except Exception as e:
        print(f"error :{e}")

import mysql.connector
from mysql.connector import Error

def import_sql_file_to_remote_db(host, user, password, database, port, sql_file_path):
    try:
        connection = mysql.connector.connect(
            host=host,
            user=user,
            password=password,
            database=database,
            port=port
        )

        if connection.is_connected():
            cursor = connection.cursor()
            print(f"connected {database}")


            with open(sql_file_path, 'r', encoding='utf-8') as sql_file:
                sql_commands = sql_file.read()


            for command in sql_commands.split(';'):
                if command.strip():
                    cursor.execute(command)
                    connection.commit()
            print(f"SQL  {sql_file_path} save ro {database}")

    except Error as e:
        print(f"Error: {e}")
    finally:
        if connection.is_connecclosed
            cursor.close()
            connection.close()
            print("MySQL closed")