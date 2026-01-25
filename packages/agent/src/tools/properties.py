import pymysql
from dotenv import load_dotenv
import os

load_dotenv()

try:
    conn = pymysql.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_DATABASE"),
        port=int(os.getenv("DB_PORT")),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=5
    )

    with conn.cursor() as cursor:
        cursor.execute("SHOW TABLES;")
        tables = cursor.fetchall()

        print("📦 当前数据库中的表：")
        for t in tables:
            # key 名是 Tables_in_数据库名
            print(list(t.values())[0])

    with conn.cursor() as cursor:
        sql = "SELECT * FROM `regions` LIMIT 10;"
        cursor.execute(sql)
        rows = cursor.fetchall()

        print(f"📄 `regions` 前 10 行数据（共 {len(rows)} 行）：")
        for i, row in enumerate(rows, start=1):
            print(f"{i}: {row}")

except pymysql.MySQLError as e:
    print("❌ DB error:", e)

finally:
    try:
        conn.close()
    except:
        pass
