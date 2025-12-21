from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import pandas as pd
from scraper import scrape_data
# Postcodes for target areas
from target_areas import postcodes_unsw, postcodes_usyd
from datetime import datetime
from scraper_detailed import scrape_property_data
from data_cleaner import clean_rental_data
from commute_time import update_commute_time
from point import main as process_missing_fields
import subprocess
import tempfile
import shutil
# Base URL template for rental listings
base_url = "https://www.domain.com.au/rent/{}/?excludedeposittaken=1"

# Initialize Selenium WebDriver
options = webdriver.ChromeOptions()
options.add_argument("--headless")  
options.add_argument("--disable-gpu")
options.add_argument("--window-size=1920x1080")
options.add_argument("--log-level=3")
options.add_argument("--disable-blink-features=AutomationControlled")
options.add_argument(
    "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
)
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')

#Add a unique temporary user data directory
options.add_argument(f'--user-data-dir={tempfile.mkdtemp()}')

# Initialize driver
driver = webdriver.Chrome(options=options)


# ------------ main fuction ------------
# Scrape data for UNSW postcodes
postcodes = postcodes_unsw
for postcode in postcodes:
    url = base_url.format(postcode)
    scrape_data(driver, url, postcode, 'UNSW')
postcodes = postcodes_usyd
for postcode in postcodes:
    url = base_url.format(postcode)
    scrape_data(driver, url, postcode, 'USYD')
# Close the browser
driver.quit()

import os
# Merge all the data files
# Directory where the CSV files are stored
csv_directory = '.'

# List to hold DataFrames
dfs = []

# Loop through the files in the directory for UNSW
for filename in os.listdir(csv_directory):
    if filename.endswith('.csv') and filename.startswith('UNSW_rentaldata_suburb_'):
        # Read each CSV file
        file_path = os.path.join(csv_directory, filename)
        df = pd.read_csv(file_path)
        dfs.append(df)

# Concatenate all DataFrames
merged_df = pd.concat(dfs, ignore_index=True)

# Save the merged DataFrame to a new CSV file
merged_df.to_csv('UNSW_full_rentaldata_uncleaned.csv', index=False, encoding='utf-8')

print("All CSV files have been merged into 'UNSW_full_rentaldata_uncleaned.csv'")

# Remove the individual CSV files
for filename in os.listdir(csv_directory):
    if filename.endswith('.csv') and filename.startswith('UNSW_rentaldata_suburb_'):
        file_path = os.path.join(csv_directory, filename)
        os.remove(file_path)
        print(f"{file_path} has been removed.")

# Loop through the files in the directory for USYD

# List to hold DataFrames
dfs = []
for filename in os.listdir(csv_directory):
    if filename.endswith('.csv') and filename.startswith('USYD_rentaldata_suburb_'):
        # Read each CSV file
        file_path = os.path.join(csv_directory, filename)
        df = pd.read_csv(file_path)
        dfs.append(df)

# Concatenate all DataFrames
merged_df = pd.concat(dfs, ignore_index=True)

# Save the merged DataFrame to a new CSV file
merged_df.to_csv('USYD_full_rentaldata_uncleaned.csv', index=False, encoding='utf-8')

print("All CSV files have been merged into 'USYD_full_rentaldata_uncleaned.csv'")

# Remove the individual CSV files
for filename in os.listdir(csv_directory):
    if filename.endswith('.csv') and filename.startswith('USYD_rentaldata_suburb_'):
        file_path = os.path.join(csv_directory, filename)
        os.remove(file_path)
        print(f"{file_path} has been removed.")

# Clean the merged data and add descriptions and available dates to the data
current_date = datetime.now().strftime("%y%m%d")
output_file1 = f"UNSW_rentdata_{current_date}.csv"
output_file2 = f"USYD_rentdata_{current_date}.csv"
output_file3 = f"UTS_rentdata_{current_date}.csv"

if __name__ == "__main__":
    clean_rental_data('UNSW')
    clean_rental_data('USYD')
    scrape_property_data('UNSW')
    scrape_property_data('USYD')
    today_str = datetime.now().strftime('%y%m%d')
    update_commute_time('UNSW')
    update_commute_time('USYD')
    process_missing_fields()

    if os.path.exists(output_file2):
        shutil.copyfile(output_file2, output_file3)
        print(f"Copied {output_file2} to {output_file3} for UTS.")
        update_commute_time('UTS')
    else:
        print(f"[ERROR] '{output_file2}' does not exist. Cannot create UTS data.")

    csv_file_1 = output_file1
    csv_file_2 = output_file2
    csv_file_3 = output_file3

    # Use csv_cleaner_and_importer.py to process and import the CSV files
    for csv_file in [csv_file_1, csv_file_2, csv_file_3]:
        if os.path.exists(csv_file):
            print(f"Processing {csv_file} with csv_cleaner_and_importer.py...")
            try:
                result = subprocess.run([
                    'python', 'csv_cleaner_and_importer.py', 'process', csv_file
                ], capture_output=True, text=True, check=True)
                print(f"✅ Successfully processed {csv_file}")
                print(result.stdout)
            except subprocess.CalledProcessError as e:
                print(f"❌ Error processing {csv_file}: {e}")
                print(f"Error output: {e.stderr}")
        else:
            print(f"[ERROR] '{csv_file}' does not exist. Please check the file path.")

    # Remove the temporary files
    current_date = datetime.now().strftime("%y%m%d")
    files_to_remove = [
        f'USYD_rentdata_cleaned_{current_date}.csv', 
        'USYD_full_rentaldata_uncleaned.csv', 
        f'UNSW_rentdata_cleaned_{current_date}.csv', 
        'UNSW_full_rentaldata_uncleaned.csv',
        f'UTS_rentdata_cleaned_{current_date}.csv',
        'UTS_full_rentaldata_uncleaned.csv'
    ]

    for file in files_to_remove:
        if os.path.exists(file):
            os.remove(file)
            print(f"{file} has been removed.")
    # Remove merged CSV files generated by csv_cleaner_and_importer.py
    csv_directory = '.'
    for filename in os.listdir(csv_directory):
        if filename.endswith("_cleaned.csv"):
            os.remove(os.path.join(csv_directory, filename))
            print(f"{filename} has been removed.")
    
    prev_date = datetime.fromtimestamp(datetime.now().timestamp() - 86400).strftime("%y%m%d")
    files_to_remove_prev = [f'USYD_rentdata_{prev_date}.csv', f'UNSW_rentdata_{prev_date}.csv', f'UTS_rentdata_{prev_date}.csv']

    for file in files_to_remove_prev:
        if os.path.exists(file):
            os.remove(file)
            print(f"{file} has been removed (previous day's file).")
        else:
            print(f"{file} does not exist.")