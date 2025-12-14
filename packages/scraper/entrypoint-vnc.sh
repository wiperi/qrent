#!/bin/bash
# QRent Scraper 入口脚本 - 带 VNC 支持
# 可以通过浏览器访问 http://localhost:6080 查看容器内桌面

set -e

echo "=========================================="
echo "QRent Scraper with VNC"
echo "=========================================="

# 启动 Xvfb 虚拟显示器
echo "Starting Xvfb..."
Xvfb :99 -screen 0 1920x1080x24 -ac &
sleep 2

export DISPLAY=:99

# 启动简单窗口管理器
echo "Starting Fluxbox..."
fluxbox &
sleep 1

# 启动 x11vnc
echo "Starting x11vnc..."
x11vnc -display :99 -forever -shared -nopw -rfbport 5900 &
sleep 1

# 启动 noVNC (web 访问)
echo "Starting noVNC on port 6080..."
websockify --web=/usr/share/novnc/ 6080 localhost:5900 &
sleep 1

echo ""
echo "=========================================="
echo "VNC Ready!"
echo "Open browser: http://localhost:6080/vnc.html"
echo "=========================================="
echo ""

# 运行传入的命令
echo "Running command: $@"
exec "$@"

