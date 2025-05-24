#!/bin/sh
# filepath: /Users/zach/rent/qrent/packages/backend/scraper/start_crawler.sh

# 使脚本遇到错误时退出
set -e

echo "Starting crawler..."

# 如果需要先等待某些服务启动（例如数据库或网络资源），可增加等待逻辑
# echo "Waiting for dependencies..."
# sleep 5

# 运行 Python 爬虫，不同场景下，可根据具体需要执行不同命令
python property.py

echo "Crawler exited."