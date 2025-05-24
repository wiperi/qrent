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
from change_to_sql import push_delta_to_remote_db
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
if __name__ == "__main__":
    clean_rental_data('UNSW')
    clean_rental_data('USYD')
    scrape_property_data('UNSW')
    scrape_property_data('USYD')
    today_str = datetime.now().strftime('%y%m%d')
    update_commute_time('UNSW')
    update_commute_time('USYD')
    process_missing_fields()

    csv_file_1 = output_file1
    csv_file_2 = output_file2

    sql_file = f"data_property_{today_str}.sql"
    merged_output_file = f"merged_rentdata_{current_date}.csv"
    table_name = "property"
    #database connection details
    HOST = os.getenv("DB_HOST")
    USER = os.getenv("DB_USER")
    PASSWORD = os.getenv("DB_PASSWORD")
    DATABASE = os.getenv("DB_DATABASE")
    PORT = int(os.getenv("DB_PORT"))

    # Convert the cleaned CSV files to SQL files
    if os.path.exists(csv_file_1):
        df1 = pd.read_csv(csv_file_1)
        df2 = pd.read_csv(csv_file_2)
        merged_df = pd.concat([df1, df2])
        merged_df = merged_df.drop_duplicates(subset="houseId", keep="first")
        merged_df.to_csv(merged_output_file, index=False)
        key_column = "houseId"
        push_delta_to_remote_db(merged_output_file, table_name, key_column, HOST, USER, PASSWORD, DATABASE, PORT) 
    else:
        print(f"[ERROR]  '{csv_file_1}' does not exist. Please check the file path.")
    # Remove the temporary files
    current_date = datetime.now().strftime("%y%m%d")
    files_to_remove = [f'USYD_rentdata_cleaned_{current_date}.csv', 'USYD_full_rentaldata_uncleaned.csv', f'UNSW_rentdata_cleaned_{current_date}.csv', 'UNSW_full_rentaldata_uncleaned.csv']

    for file in files_to_remove:
        if os.path.exists(file):
            os.remove(file)
            print(f"{file} has been removed.")    