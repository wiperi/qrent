import pandas as pd
import googlemaps
import time
import os
from tqdm import tqdm
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv('../../.env')

GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY')

SCHOOL_COORDINATES = {
    'UNSW': "University of New South Wales, Kensington NSW 2052, Australia",
    'USYD': "University of Sydney, Camperdown NSW 2006, Australia",
    'UTS': "University of Technology Sydney, Ultimo NSW 2007, Australia"
}

class CommuteCalculator:
    def __init__(self, api_key: str):
        if not api_key:
            raise ValueError("Google Maps API Key is required")
        
        self.gmaps = googlemaps.Client(key=api_key)
        
    def get_property_address(self, row: pd.Series) -> str:
        address_line1 = ""
        address_line2 = ""
        
        if 'addressLine1' in row.index and pd.notna(row['addressLine1']):
            address_line1 = str(row['addressLine1']).strip()
            
        if 'addressLine2' in row.index and pd.notna(row['addressLine2']):
            address_line2 = str(row['addressLine2']).strip()
        
        if address_line1 and address_line2:
            full_address = f"{address_line1}, {address_line2}, Australia"
            return full_address
        elif address_line2:
            return f"{address_line2}, Australia"
        elif address_line1:
            return f"{address_line1}, NSW, Australia"
        
        return ""
    
    def calculate_transit_time(self, origin: str, destination: str) -> int:
        try:
            tomorrow_morning = datetime.now().replace(hour=8, minute=30, second=0, microsecond=0) + timedelta(days=1)
            
            result = self.gmaps.directions(
                origin=origin,
                destination=destination,
                mode="transit",
                departure_time=tomorrow_morning,
                alternatives=False
            )
            
            if result and len(result) > 0:
                route = result[0]
                leg = route['legs'][0]
                
                duration_minutes = leg['duration']['value'] / 60
                
                print(f"from {origin[:30]}... to {destination[:20]}... bus time: {duration_minutes:.1f} min")
                return int(round(duration_minutes))
            else:
                print(f"cannot find  {origin[:30]}... to {destination[:20]}... route")
                return 0
                
        except googlemaps.exceptions.ApiError as e:
            print(f" Google Maps API: {e}")
            return 0
        except Exception as e:
            print(f"error in : {e}")
            return 0
    
    def calculate_driving_time_as_backup(self, origin: str, destination: str) -> int:
        try:
            tomorrow_morning = datetime.now().replace(hour=8, minute=30, second=0, microsecond=0) + timedelta(days=1)
            
            result = self.gmaps.distance_matrix(
                origins=[origin],
                destinations=[destination],
                mode="driving",
                departure_time=tomorrow_morning,
                traffic_model="best_guess"
            )
            
            if (result['status'] == 'OK' and 
                result['rows'][0]['elements'][0]['status'] == 'OK'):
                element = result['rows'][0]['elements'][0]
                duration_minutes = element['duration']['value'] / 60
                
                print(f"car time: {duration_minutes:.1f} min")
                return int(round(duration_minutes))
            else:
                return 0
                
        except Exception as e:
            print(f"error in car: {e}")
            return 0

def get_university_from_filename(filename: str) -> str:
    filename_upper = filename.upper()
    if 'UNSW' in filename_upper:
        return 'UNSW'
    elif 'USYD' in filename_upper:
        return 'USYD'
    return None

def update_commute_time(university):
    if university not in SCHOOL_COORDINATES:
        print(f"cannot use: {university}")
        return
    
    if not GOOGLE_MAPS_API_KEY:
        print("set .env GOOGLE_MAPS_API_KEY")
        return
    
    calculator = CommuteCalculator(GOOGLE_MAPS_API_KEY)
    
    today = datetime.now().strftime('%y%m%d')
    input_file = f"{university}_rentdata_{today}.csv"
    output_file = f"{university}_rentdata_{today}.csv"
    
    if not os.path.exists(input_file):
        print(f"erroe: {input_file}")
        return
    
    print(f"get: {input_file}")
    data = pd.read_csv(input_file)
    
    print(f"set{university}file，{university}time")
    
    current_commute_col = f'commuteTime_{university}'
    
    if current_commute_col not in data.columns:
        data[current_commute_col] = None
    
    yesterday = (datetime.now() - timedelta(days=1)).strftime('%y%m%d')
    yesterday_file = f"{university}_rentdata_{yesterday}.csv"
    
    if os.path.exists(yesterday_file):
        print(f"find yesterday: {yesterday_file}")
        try:
            yesterday_data = pd.read_csv(yesterday_file)
            
            if current_commute_col in yesterday_data.columns:
                if 'houseId' in data.columns and 'houseId' in yesterday_data.columns:
                    yesterday_data_unique = yesterday_data.drop_duplicates(subset=['houseId'], keep='first')
                    print(f"use houseId{current_commute_col}")
                    data[current_commute_col] = data['houseId'].map(
                        yesterday_data_unique.set_index('houseId')[current_commute_col]
                    )
                elif 'addressLine1' in data.columns and 'addressLine1' in yesterday_data.columns:
                    yesterday_data_unique = yesterday_data.drop_duplicates(subset=['addressLine1'], keep='first')
                    print(f"use addressLine1{current_commute_col}")
                    data[current_commute_col] = data['addressLine1'].map(
                        yesterday_data_unique.set_index('addressLine1')[current_commute_col]
                    )
                else:
                    print("error cannot find yesterday")
            else:
                print(f"cannot find{current_commute_col}lines")
        except Exception as e:
            print(f"error: {e}")
    else:
        print(f"cannot find: {yesterday_file}")
    
    missing_commute = data[data[current_commute_col].isna()]
    
    if len(missing_commute) == 0:
        print(f"all property have commute time{current_commute_col}")
        data.to_csv(output_file, index=False)
        print(f"save to: {output_file}")
        return
    
    print(f"need to get commute time: {len(missing_commute)}")
    
    destination = SCHOOL_COORDINATES[university]
    print(f"destination: {destination}")
    
    successful_calculations = 0
    failed_calculations = 0
    
    for index, row in tqdm(missing_commute.iterrows(), total=len(missing_commute), desc=f"get{university}commute time"):
        origin_address = calculator.get_property_address(row)
        
        if not origin_address:
            print(f"index {index}: cannot find adress")
            data.loc[index, current_commute_col] = 0
            failed_calculations += 1
            continue
        
        print(f"\n index {index}: {origin_address[:50]}...")
        
        transit_time = calculator.calculate_transit_time(origin_address, destination)
        
        if transit_time > 0:
            data.loc[index, current_commute_col] = transit_time
            successful_calculations += 1
        else:
            print("if bus cannot get use car...")
            driving_time = calculator.calculate_driving_time_as_backup(origin_address, destination)
            
            if driving_time > 0:
                estimated_transit_time = int(driving_time * 1.5)
                data.loc[index, current_commute_col] = estimated_transit_time
                print(f"get final: {estimated_transit_time} min")
                successful_calculations += 1
            else:
                data.loc[index, current_commute_col] = 0
                failed_calculations += 1
        
        time.sleep(1.1)
    
    data.to_csv(output_file, index=False)
    
    print(f"\nfinish!")
    print(f"success: {successful_calculations} 个")
    print(f"fail: {failed_calculations} 个")
    print(f"save to {output_file}")

def main():
    csv_files = [f for f in os.listdir('.') if f.endswith('.csv')]
    if csv_files:
        print(f"\nfind:")
        for i, file in enumerate(csv_files, 1):
            university = get_university_from_filename(file)
            uni_info = f" ({university})" if university else " (error)"
            print(f"   {i}. {file}{uni_info}")
    
    print("\n" + "=" * 50)
    print("UNSW...")
    update_commute_time('UNSW')
    
    print("\n" + "=" * 50)
    print("USYD...")
    update_commute_time('USYD')

if __name__ == "__main__":
    main()