FROM python:3.11-slim-bullseye

# Install system dependencies
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    unzip \
    cron \
    gosu \
    libglib2.0-0 \
    libnss3 \
    libgconf-2-4 \
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
    libcairo-gobject2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Install ChromeDriver - use a stable version that matches Chrome
RUN CHROME_VERSION=$(google-chrome --version | awk '{print $3}' | cut -d. -f1) \
    && echo "Chrome major version: $CHROME_VERSION" \
    && if [ "$CHROME_VERSION" = "140" ]; then \
         CHROMEDRIVER_VERSION="140.0.7339.82"; \
       elif [ "$CHROME_VERSION" = "139" ]; then \
         CHROMEDRIVER_VERSION="130.0.6723.116"; \
       else \
         CHROMEDRIVER_VERSION="130.0.6723.116"; \
       fi \
    && echo "Using ChromeDriver version: $CHROMEDRIVER_VERSION" \
    && CHROMEDRIVER_URL="https://storage.googleapis.com/chrome-for-testing-public/${CHROMEDRIVER_VERSION}/linux64/chromedriver-linux64.zip" \
    && echo "Downloading from: $CHROMEDRIVER_URL" \
    && (wget -q "$CHROMEDRIVER_URL" -O chromedriver-linux64.zip || \
        (echo "Download failed, trying backup version..." && \
         wget -q "https://storage.googleapis.com/chrome-for-testing-public/130.0.6723.116/linux64/chromedriver-linux64.zip" -O chromedriver-linux64.zip)) \
    && unzip chromedriver-linux64.zip \
    && mv chromedriver-linux64/chromedriver /usr/local/bin/chromedriver \
    && chmod +x /usr/local/bin/chromedriver \
    && rm -rf chromedriver-linux64.zip chromedriver-linux64 \
    && chromedriver --version

# Create non-root user
RUN useradd --create-home --shell /bin/bash app

# Set working directory
WORKDIR /app/scraper

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy Python scripts
COPY *.py ./

# Copy shell scripts
COPY *.sh ./

# Create logs and data directories
RUN mkdir -p /app/scraper/logs /app/scraper/data

# Fix ownership
RUN chown -R app:app /app

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Set up cron job for daily scraping
RUN echo "0 1 * * * app /usr/local/bin/docker-entrypoint.sh run >> /app/scraper/logs/cron.log 2>&1" > /etc/cron.d/scraper-cron \
    && chmod 0644 /etc/cron.d/scraper-cron \
    && crontab /etc/cron.d/scraper-cron

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD google-chrome --version && chromedriver --version || exit 1

# Set display for headless mode
ENV DISPLAY=:99

# Default command
CMD ["/usr/local/bin/docker-entrypoint.sh", "cron-only"]
