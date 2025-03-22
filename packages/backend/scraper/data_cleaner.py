import pandas as pd
from datetime import datetime

def clean_rental_data(university):
    input_file = f"{university}_full_rentaldata_uncleaned.csv"
    data = pd.read_csv(input_file)
    data['pricePerWeek'] = data['pricePerWeek'].str.extract(r'(\d+(?:,\d{3})*(?:\.\d+)?)')[0]  
    data['pricePerWeek'] = data['pricePerWeek'].str.replace(',', '', regex=False).astype(float)  
    data['addressLine1'] = (
        data['addressLine1']
        .str.replace(',', '', regex=False) 
        .str.lower()                       
        .str.replace('/', '-', regex=False) 
        .str.replace(' ', '-')             
    )

    data['addressLine2'] = data['addressLine2'].str.lower().str.replace(' ', '-')
    data['commuteTime'] = pd.NA
    data['availableDate'] = pd.NA
    data['keywords'] = pd.NA
    data['averageScore'] = pd.NA
    data['url'] = pd.NA

    columns_to_clean = ['bedroomCount', 'bathroomCount', 'parkingCount']
    for col in columns_to_clean:
        data[col] = pd.to_numeric(data[col].str.extract(r'(\d+)')[0]).astype(float)
    property_type_mapping = {
        'House': 1,
        'Apartment / Unit / Flat': 2,
        'Studio': 3,
        'Semi-detached': 4
    }
    data['propertyType'] = data['propertyType'].map(property_type_mapping).fillna(5).astype(int)
    data = data.drop_duplicates(subset=['addressLine1'], keep='first')
    data['Combined Address'] = (
        data['addressLine1']
        + '-' +
        data['addressLine2']
        + '-' +
        data['houseId'].astype(str)    
    )

    current_date = datetime.now().strftime('%y%m%d')

    cleaned_file_path = f"{university}_rentdata_cleaned_{current_date}.csv"

    data.to_csv(cleaned_file_path, index=False)
    print("data cleaned and saved to", cleaned_file_path)
