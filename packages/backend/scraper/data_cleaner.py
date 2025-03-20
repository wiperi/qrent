import pandas as pd
from datetime import datetime

def clean_rental_data(university):
    input_file = f"{university}_full_rentaldata_uncleaned.csv"
    data = pd.read_csv(input_file)
    data['Price'] = data['Price'].str.extract(r'(\d+(?:,\d{3})*(?:\.\d+)?)')[0]  
    data['Price'] = data['Price'].str.replace(',', '', regex=False).astype(float)  
    data['Address Line 1'] = (
        data['Address Line 1']
        .str.replace(',', '', regex=False) 
        .str.lower()                       
        .str.replace('/', '-', regex=False) 
        .str.replace(' ', '-')             
    )

    data['Address Line 2'] = data['Address Line 2'].str.lower().str.replace(' ', '-')
    data['Commute Time'] = pd.NA

    columns_to_clean = ['Number of Bedrooms', 'Number of Bathrooms', 'Number of Parkings']
    for col in columns_to_clean:
        data[col] = pd.to_numeric(data[col].str.extract(r'(\d+)')[0])

    data = data.drop_duplicates(subset=['Address Line 1'], keep='first')
    data['Combined Address'] = (
        data['Address Line 1']
        + '-' +
        data['Address Line 2']
        + '-' +
        data['House ID'].astype(str)    
    )

    current_date = datetime.now().strftime('%y%m%d')

    cleaned_file_path = f"{university}_rentdata_cleaned_{current_date}.csv"

    data.to_csv(cleaned_file_path, index=False)
    print("data cleaned and saved to", cleaned_file_path)
