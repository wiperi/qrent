FROM python:3.11-slim-bullseye

# 设置环境变量
ENV PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    TZ=Australia/Sydney

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    unzip \
    cron \
    curl \
    git \
    libglib2.0-0 \
    libnss3 \
    libfontconfig1 \
    libxcomposite1 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    libgtk-3-0 \
    libxshmfence1 \
    libdrm2 \
    libxkbcommon0 \
    libatspi2.0-0 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libpango-1.0-0 \
    libgdk-pixbuf2.0-0 \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# 安装 Google Chrome
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# 安装 ChromeDriver
RUN CHROME_VERSION=$(google-chrome --version | awk '{print $3}' | cut -d. -f1) \
    && echo "Chrome version: $CHROME_VERSION" \
    && CHROMEDRIVER_VERSION=$(curl -s "https://googlechromelabs.github.io/chrome-for-testing/LATEST_RELEASE_$CHROME_VERSION") \
    && wget -q "https://storage.googleapis.com/chrome-for-testing-public/$CHROMEDRIVER_VERSION/linux64/chromedriver-linux64.zip" \
    && unzip chromedriver-linux64.zip \
    && mv chromedriver-linux64/chromedriver /usr/local/bin/ \
    && chmod +x /usr/local/bin/chromedriver \
    && rm -rf chromedriver-linux64.zip chromedriver-linux64

# 创建工作目录
WORKDIR /app

# 复制依赖文件
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制项目文件
COPY . .

# 创建日志目录
RUN mkdir -p /app/logs

# 设置执行权限
RUN chmod +x run_scraper.sh

# 设置 cron 任务（每天凌晨 0 点运行）
RUN echo "0 0 * * * cd /app && /app/run_scraper.sh >> /app/logs/scraper_\$(date +\%Y\%m\%d).log 2>&1" > /etc/cron.d/scraper-cron \
    && chmod 0644 /etc/cron.d/scraper-cron \
    && crontab /etc/cron.d/scraper-cron

# 创建启动脚本
RUN echo '#!/bin/bash\n\
echo "🚀 Starting scraper service..."\n\
\n\
# 启动 cron\n\
service cron start\n\
\n\
echo "✅ Cron service started"\n\
echo "📅 Scheduled to run daily at 0:00 (midnight, Sydney time)"\n\
echo "📝 Logs will be saved to /app/logs/"\n\
\n\
# 保持容器运行\n\
tail -f /dev/null' > /entrypoint.sh \
    && chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
