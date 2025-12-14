#!/bin/bash
# QRent 爬虫服务器部署脚本
# 
# 使用方法:
#   1. 上传到服务器: scp -r packages/scraper user@server:/path/to/qrent/
#   2. SSH 到服务器: ssh user@server
#   3. 运行部署: cd /path/to/qrent/scraper && chmod +x deploy.sh && ./deploy.sh

set -e

echo "=========================================="
echo "QRent Scraper Deployment"
echo "=========================================="

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "Python3 not found, installing..."
    sudo apt-get update
    sudo apt-get install -y python3 python3-pip python3-venv
fi

# 创建虚拟环境
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# 安装 Playwright (用于 RealEstate)
echo "Installing Playwright..."
pip install playwright
playwright install chromium
playwright install-deps chromium

# 创建必要目录
mkdir -p logs
mkdir -p output
mkdir -p rea_profile

# 检查环境变量
if [ ! -f ".env" ]; then
    echo ""
    echo "WARNING: .env file not found!"
    echo "Please create .env with the following variables:"
    echo "  DB_HOST=your_database_host"
    echo "  DB_USER=your_database_user"
    echo "  DB_PASSWORD=your_database_password"
    echo "  DB_DATABASE=qrent"
    echo "  DASHSCOPE_API_KEY=your_api_key"
    echo "  GOOGLE_MAPS_API_KEY=your_api_key"
    echo ""
fi

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Usage:"
echo "  # Activate virtual environment"
echo "  source venv/bin/activate"
echo ""
echo "  # Run full pipeline (Domain + RealEstate)"
echo "  python main.py run --universities UNSW USYD"
echo ""
echo "  # Run Domain only"
echo "  python main.py run --scrapers domain --universities UNSW"
echo ""
echo "  # Run RealEstate only (requires browser)"
echo "  python main.py run --scrapers realestate --universities UNSW"
echo ""
echo "  # Skip scoring/commute (no API keys needed)"
echo "  python main.py run --no-scoring --no-commute --no-database"
echo ""
