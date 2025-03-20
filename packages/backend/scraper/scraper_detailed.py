import os
import pandas as pd
from selenium import webdriver
from bs4 import BeautifulSoup
from tqdm import tqdm
import time
from datetime import datetime, timedelta

def scrape_property_data(university):
    current_date = datetime.now().strftime('%y%m%d')
    yesterday_date = (datetime.now() - timedelta(days=1)).strftime('%y%m%d')
    today_file = f"{university}_rentdata_cleaned_{current_date}.csv"
    yesterday_file = f"{university}_rentdata_{yesterday_date}.csv"
    output_file = f"{university}_rentdata_{current_date}.csv"

    if not os.path.exists(today_file):
        raise FileNotFoundError("data file not found")

    today_data = pd.read_csv(today_file)
    if os.path.exists(yesterday_file):
        yesterday_data = pd.read_csv(yesterday_file)
        yesterday_data = yesterday_data.drop_duplicates(subset=['Address Line 1'], keep='first')
        if 'Property Description' not in today_data.columns:
            today_data['Property Description'] = None 
        if 'Property Description' not in yesterday_data.columns:
            yesterday_data['Property Description'] = None 
        if 'Available Date' not in today_data.columns:
            today_data['Available Date'] = None 
        if 'Available Date' not in yesterday_data.columns:
            yesterday_data['Available Date'] = None 
        # merge the data
        today_data['Property Description'] = today_data['Address Line 1'].map(
            yesterday_data.set_index('Address Line 1')['Property Description']
        )
        today_data['Available Date'] = today_data['Address Line 1'].map(
            yesterday_data.set_index('Address Line 1')['Available Date']
        )
    else:
        print("do not have yesterday data")
    #find the missing data
    if 'Property Description' not in today_data.columns:
        today_data['Property Description'] = None
    if 'Available Date' not in today_data.columns:
        today_data['Available Date'] = None
    missing_property_desc = today_data[today_data['Property Description'].isna()]
    num_missing = len(missing_property_desc)
    print(f"datamissing:{num_missing}")
    
    driver = webdriver.Chrome()
    base_url = "https://www.domain.com.au/{}/"
    def scrape_data(url):
        try:
            driver.get(url)
            time.sleep(5) 
            soup = BeautifulSoup(driver.page_source, "html.parser")
            #description
            description_container = soup.find("div", {"data-testid": "listing-details__description"})
            if description_container:
                headline = description_container.find("h3", {"data-testid": "listing-details__description-headline"})
                paragraphs = description_container.find_all("p")
                description = (headline.text.strip() if headline else "") + " " + " ".join(p.text.strip() for p in paragraphs)
            else:
                description = "N/A"
            #available date
            available_date = "N/A"
            date_container = soup.find("ul", {"data-testid": "listing-summary-strip"})
            if date_container:
                li_item = date_container.find("li")
                if li_item:
                    date_text = li_item.get_text(strip=True)
                    if "Available Now" in date_text:
                        available_date = "Available Now"
                    elif "Available from" in date_text:
                        strong_tag = li_item.find("strong")
                        available_date = strong_tag.text.strip() if strong_tag else "N/A"
                    else:
                        available_date = "N/A"

            return description, available_date

        except Exception as e:
            print(f"Error scraping URL {url}: {e}")
            return "N/A", "N/A"

    for index, row in tqdm(missing_property_desc.iterrows(), total=num_missing, desc=" Property Description & Available Time"):
        address = row['Combined Address'] 
        url = base_url.format(address)     
        description, avail_date = scrape_data(url)  
        print(f": index={index}, URL={url}, description={description[:100]}, available_date={avail_date}")

        today_data.at[index, 'Property Description'] = description
        today_data.at[index, 'Available Date'] = avail_date
    driver.quit()

    today_data.to_csv(output_file, index=False, encoding='utf-8')
    print(f"merge data to:{output_file}")

    file_path = output_file
    df = pd.read_csv(file_path)
    df['website'] = df['Combined Address'].apply(lambda address: f"https://www.domain.com.au/{address}")

    output_file = f"{university}_rentdata_{current_date}.csv"
    df.to_csv(output_file, index=False)

    print(f"save to: {output_file}")