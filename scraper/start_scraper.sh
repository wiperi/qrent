#!/bin/sh
# This script sets up the environment and runs the property scraper.

set -e

echo "Starting setup and crawler..."

# check Google Chrome
if command -v google-chrome >/dev/null 2>&1; then
    echo "Google Chrome is already installed: $(google-chrome --version)"
else
    echo "Google Chrome is not installed. Installing now..."
    wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
    sudo apt install -y ./google-chrome-stable_current_amd64.deb
    rm google-chrome-stable_current_amd64.deb
    echo "Google Chrome installed: $(google-chrome --version)"
fi

# set Python rnvironment
echo "Setting up Python virtual environment..."
python3 -m venv venv
. venv/bin/activate

# set Python requirements
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install beautifulsoup4 pandas selenium mysql-connector-python tqdm requests python-dotenv dashscope
 
echo "Running scraper..."
python property.py

# exit
deactivate
echo "Python virtual environment deactivated."

echo "scraper exited."