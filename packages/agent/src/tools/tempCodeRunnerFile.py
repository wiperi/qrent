import pymysql

try:
    conn = pymysql.connect(
        host="139.180.164.78",
        user="readonly",
        password="j234k5lmnooij!some",
        database="qrent",
        port=3306,
        connect_timeout=5
    )
    print("✅ readonly 用户连接成功")

    with conn.cursor() as cur:
        cur.execute("SHOW TABLES;")
        print(cur.fetchall())

    with conn.cursor() as cursor:
        sql = "SELECT * FROM `properties` LIMIT 10;"
        cursor.execute(sql)
        rows = cursor.fetchall()

        print(f"📄 `properties` 前 10 行数据（共 {len(rows)} 行）：")
        for i, row in enumerate(rows, start=1):
            print(f"{i}: {row}")

except Exception as e:
    print("❌ 连接失败:", e)

finally:
    try:
        conn.close()
    except:
        pass
