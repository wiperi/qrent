#!/bin/bash
# QRent Scraper 入口脚本
# 启动 Xvfb 虚拟显示器，然后运行爬虫

set -e

echo "=========================================="
echo "QRent Scraper - Starting..."
echo "=========================================="

# 启动 Xvfb 虚拟显示器
echo "Starting Xvfb virtual display on :99..."
Xvfb :99 -screen 0 1920x1080x24 -ac &
XVFB_PID=$!

# 等待 Xvfb 启动
sleep 2

# 检查 Xvfb 是否运行
if ! kill -0 $XVFB_PID 2>/dev/null; then
    echo "ERROR: Xvfb failed to start"
    exit 1
fi

echo "Xvfb started successfully (PID: $XVFB_PID)"
echo ""

# 设置显示器
export DISPLAY=:99

# 运行传入的命令
echo "Running command: $@"
echo "=========================================="
echo ""

exec "$@"

