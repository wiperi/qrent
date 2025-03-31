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
        yesterday_data = yesterday_data.drop_duplicates(subset=['addressLine1'], keep='first')
        if 'description' not in today_data.columns:
            today_data['description'] = None 
        if 'description' not in yesterday_data.columns:
            yesterday_data['description'] = None 
        if 'availableDate' not in today_data.columns:
            today_data['availableDate'] = None 
        if 'availableDate' not in yesterday_data.columns:
            yesterday_data['availableDate'] = None 
        # merge the data
        today_data['description'] = today_data['addressLine1'].map(
            yesterday_data.set_index('addressLine1')['description']
        )
        today_data['availableDate'] = today_data['addressLine1'].map(
            yesterday_data.set_index('addressLine1')['availableDate']
        )
    else:
        print("do not have yesterday data")
    #find the missing data
    if 'description' not in today_data.columns:
        today_data['description'] = None
    if 'availableDate' not in today_data.columns:
        today_data['availableDate'] = None
    missing_property_desc = today_data[today_data['description'].isna()]
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

            published_at = datetime.now().strftime('%Y-%m-%d')
            return description, available_date, published_at

        except Exception as e:
            print(f"Error scraping URL {url}: {e}")
            return "N/A", "N/A"

    for index, row in tqdm(missing_property_desc.iterrows(), total=num_missing, desc=" Property Description & Available Time"):
        address = row['Combined Address'] 
        url = base_url.format(address)     
        description, avail_date = scrape_data(url)  
        print(f": index={index}, URL={url}, description={description[:100]}, available_date={avail_date}")

        today_data.at[index, 'description'] = description
        today_data.at[index, 'availableDate'] = avail_date
        today_data.at[index, 'publishedAt'] = published_at
    driver.quit()

    today_data.to_csv(output_file, index=False, encoding='utf-8')
    print(f"merge data to:{output_file}")

    file_path = output_file
    df = pd.read_csv(file_path)
    df['url'] = df['Combined Address'].apply(lambda address: f"https://www.domain.com.au/{address}")
    df.drop(columns=['Combined Address'], inplace=True)
    output_file = f"{university}_rentdata_{current_date}.csv"
    df.to_csv(output_file, index=False)

    print(f"save to: {output_file}")