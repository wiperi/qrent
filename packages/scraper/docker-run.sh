#!/bin/bash
# QRent Scraper - Docker 一键运行脚本
# 用法: ./docker-run.sh [选项]
#
# 示例:
#   ./docker-run.sh                    # 运行默认配置
#   ./docker-run.sh --build            # 重新构建镜像
#   ./docker-run.sh UNSW               # 只爬取 UNSW
#   ./docker-run.sh UNSW USYD --build  # 爬取 UNSW 和 USYD，重新构建

set -e

echo "=========================================="
echo "QRent Scraper - Docker Runner"
echo "=========================================="

# 默认参数
UNIVERSITIES="UNSW USYD"
BUILD_FLAG=""
SCRAPERS="domain realestate"

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --build)
            BUILD_FLAG="--build"
            shift
            ;;
        --domain-only)
            SCRAPERS="domain"
            shift
            ;;
        --realestate-only)
            SCRAPERS="realestate"
            shift
            ;;
        UNSW|USYD|UTS)
            if [[ "$UNIVERSITIES" == "UNSW USYD" ]]; then
                UNIVERSITIES="$1"
            else
                UNIVERSITIES="$UNIVERSITIES $1"
            fi
            shift
            ;;
        *)
            echo "未知参数: $1"
            shift
            ;;
    esac
done

echo "大学: $UNIVERSITIES"
echo "爬虫: $SCRAPERS"
echo ""

# 创建必要目录
mkdir -p output logs browser_profiles/domain browser_profiles/rea

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "创建示例 .env 文件..."
    cat > .env << EOF
# QRent Scraper 环境变量
# 数据库配置 (可选)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_DATABASE=qrent

# API Keys (可选)
DASHSCOPE_API_KEY=
GOOGLE_MAPS_API_KEY=
EOF
    echo "请编辑 .env 文件配置必要的环境变量"
fi

# 构建并运行
echo ""
echo "启动 Docker 容器..."
echo ""

docker-compose run --rm $BUILD_FLAG scraper python main.py run \
    --universities $UNIVERSITIES \
    --scrapers $SCRAPERS \
    --no-database

echo ""
echo "=========================================="
echo "完成! CSV 文件保存在 ./output 目录"
echo "=========================================="
ls -la output/*.csv 2>/dev/null || echo "没有找到 CSV 文件"

