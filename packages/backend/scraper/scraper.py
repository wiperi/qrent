import time
from bs4 import BeautifulSoup
import pandas as pd
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
def scrape_data(driver, url, postcode, university):
    # Lists to store data
    rental_prices = []
    address_line_1 = []
    address_line_2 = []
    num_beds = []
    num_baths = []
    num_parkings = []
    house_types = []
    house_ids = []

    # Open URL
    driver.get(url)
    time.sleep(5) 

    pages = 50 
    for i in range(pages):
        try:
            soup = BeautifulSoup(driver.page_source, "html.parser")
            listings = soup.find_all("li", {"data-testid": lambda value: value and value.startswith("listing-")})

            if not listings:
                print(f"No listings found on page {i+1} for postcode {postcode}. Ending pagination.")
                break

            # Extract data from each listing
            for listing in listings:
                # Price
                price = listing.find('p', {'data-testid': 'listing-card-price'})
                rental_prices.append(price.text.strip() if price else "N/A")

                # Address
                address1 = listing.find('span', {'data-testid': 'address-line1'})
                address_line_1.append(address1.text.strip() if address1 else "N/A")

                address2 = listing.find('span', {'data-testid': 'address-line2'})
                address_line_2.append(address2.text.strip() if address2 else "N/A")

                # Property features
                features = listing.find_all('span', {'data-testid': 'property-features-feature'})
                num_beds.append(features[0].text.strip() if len(features) > 0 else "N/A")
                num_baths.append(features[1].text.strip() if len(features) > 1 else "N/A")
                num_parkings.append(features[2].text.strip() if len(features) > 2 else "N/A")

                # House type
                house_type = listing.find('span', {'class': 'css-693528'})
                house_types.append(house_type.text.strip() if house_type else "N/A")

                # House ID
                house_id = listing.get('data-testid')
                if house_id and house_id.startswith('listing-'):
                    house_ids.append(house_id.split('-')[-1])
                else:
                    house_ids.append("N/A")

            print(f"Page {i+1} parsed successfully for postcode {postcode}.")

            # --- find next button ---
            next_buttons = WebDriverWait(driver, 5).until(
                EC.presence_of_all_elements_located((By.CSS_SELECTOR, 'a[data-testid="paginator-navigation-button"]'))
            )

            if len(next_buttons) == 0:
                # if no paginator button found, end pagination
                print(f"No paginator button found on page {i+1} for postcode {postcode}. Ending pagination.")
                break
            elif len(next_buttons) == 1:
                # if only one paginator button found, check if it's "Next page"
                single_text = next_buttons[0].text.strip().lower()
                if "next" in single_text:
                    next_button = next_buttons[0]
                    print("Found a single paginator button, recognized as Next page.")
                else:
                    print("Found only a single paginator button, which is Prev page (or disabled Next). Ending pagination.")
                    break
            else:
                # if two paginator buttons found, click the second one
                next_button = next_buttons[1]

            # click next button
            driver.execute_script("arguments[0].scrollIntoView();", next_button)
            time.sleep(1)
            driver.execute_script("arguments[0].click();", next_button)
            time.sleep(3)  # Allow page to load

        except Exception as e:
            print(f"Error on page {i+1} for postcode {postcode}: {e}. Ending pagination.")
            break

    # Save data to CSV
    df = pd.DataFrame({
        "pricePerWeek": rental_prices,
        "addressLine1": address_line_1,
        "addressLine2": address_line_2,
        "bedroomCount": num_beds,
        "bathroomCount": num_baths,
        "parkingCount": num_parkings,
        "propertyType": house_types,
        "houseId": house_ids,
    })
    if university == 'UNSW':
        filename = f"UNSW_rentaldata_suburb_{postcode}.csv"
    else:
        filename = f"USYD_rentaldata_suburb_{postcode}.csv"
    df.to_csv(filename, index=False, encoding='utf-8')
    print(f"Data for postcode {postcode} saved to {filename}.")