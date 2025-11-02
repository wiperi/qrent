#!/bin/bash

set -e

echo "=========================================="
echo "🚀 部署爬虫服务"
echo "=========================================="

# 进入 scraper 目录
cd "$(dirname "$0")"

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "❌ .env 文件不存在，请先创建"
    echo "   可以复制 .env.example: cp .env.example .env"
    exit 1
fi

# 停止旧容器
echo "🛑 停止旧容器..."
docker-compose down || true

# 构建新镜像
echo "🔨 构建新镜像..."
docker-compose build --no-cache

# 启动容器
echo "🚀 启动容器..."
docker-compose up -d

# 等待容器启动
sleep 3

# 查看状态
echo ""
echo "=========================================="
echo "📊 容器状态"
echo "=========================================="
docker-compose ps

echo ""
echo "=========================================="
echo "📝 常用命令："
echo "----------------------------------------"
echo "查看日志："
echo "  docker-compose logs -f scraper"
echo ""
echo "手动运行爬虫："
echo "  docker-compose exec scraper ./run_scraper.sh"
echo ""
echo "重启服务："
echo "  docker-compose restart scraper"
echo ""
echo "停止服务："
echo "  docker-compose down"
echo ""
echo "查看定时任务："
echo "  docker-compose exec scraper crontab -l"
echo "=========================================="
echo "✅ 部署完成！"
