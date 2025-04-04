import requests
import pandas as pd
from tqdm import tqdm
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
load_dotenv('.env')

API_BASE_URL = 'https://api.transport.nsw.gov.au/v1/tp/'
API_KEY =  os.getenv('API_KEY')

HEADERS = {
    'Authorization': f'apikey {API_KEY}'
}

def address_to_coord(address):
    try:
        params = {
            'outputFormat': 'rapidJSON',
            'type_sf': 'any',
            'name_sf': address,
            'coordOutputFormat': 'EPSG:4326',
            'anyMaxSizeHitList': 1, 
        }
        response = requests.get(API_BASE_URL + 'stop_finder', headers=HEADERS, params=params)
        response.raise_for_status()
        data = response.json()
        locations = data.get('locations', [])

        if locations:
            best_match = locations[0]
            coord = f"{best_match['coord'][1]}:{best_match['coord'][0]}:EPSG:4326"
            print(f"find address: {address} | address: {coord}")
            return coord
        else:
            print(f"can not find address: {address}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"error : {e}")
        return None

def find_shortest_travel_time(origin, destination, date=None, time_='0900'):
    try:
        if not date:
            date = (datetime.now() + timedelta(days=1)).strftime('%y%m%d')

        params = {
            'outputFormat': 'rapidJSON',
            'coordOutputFormat': 'EPSG:4326',
            'depArrMacro': 'dep',
            'itdDate': date,
            'itdTime': time_,
            'type_origin': 'coord',
            'name_origin': origin,
            'type_destination': 'coord',
            'name_destination': destination,
            'inclMOT': '1,2,3,4,5,6,7,8,9,10',
            'TfNSWTR': 'true',
        }
        response = requests.get(API_BASE_URL + 'trip', headers=HEADERS, params=params)
        response.raise_for_status()
        data = response.json()
        journeys = data.get('journeys', [])

        if not journeys:
            print("do not find commute time。")
            return None
        all_durations = [
            sum(leg.get('duration', 0) for leg in journey.get('legs', [])) // 60
            for journey in journeys
        ]
        shortest_duration = min(all_durations)
        print(f"the commute time: {shortest_duration} min")
        return shortest_duration
    except requests.exceptions.RequestException as e:
        print(f"Trip Planner API error: {e}")
        return None


def update_commute_time(university):
    today = datetime.now().strftime('%y%m%d')
    input_file = f"{university}_rentdata_{today}.csv"
    output_file = f"{university}_rentdata_{today}.csv"

    data = pd.read_csv(input_file)

    missing_commute = data[data['commuteTime'].isna()]

    if university.lower() == 'unsw':
        destination_coord = "151.23143:-33.917129:EPSG:4326"  # UNSW Kensington
    elif university.lower() == 'usyd':
        destination_coord = "151.18672:-33.888333:EPSG:4326"  # USYD
    else:
        raise ValueError("Unsupported university. Please use 'unsw' or 'usyd'.")


    for index, row in tqdm(missing_commute.iterrows(), total=len(missing_commute), desc="Updating commute time"):
        origin_address = row['addressLine1']
        origin_coord = address_to_coord(origin_address)

        if origin_coord:

            travel_time = find_shortest_travel_time(origin_coord, destination_coord, time_="0900")
            data.loc[index, 'commuteTime'] = travel_time if travel_time is not None else "N/A"
        else:
            data.loc[index, 'commuteTime'] = 0

    data.to_csv(output_file, index=False)
    print(f"save data to:{output_file}")