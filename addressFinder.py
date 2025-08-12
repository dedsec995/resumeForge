import requests
from bs4 import BeautifulSoup
import json
import re

states = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
    "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho",
    "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
    "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
    "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
    "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
    "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah",
    "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia",
    "WI": "Wisconsin", "WY": "Wyoming", "DC": "District of Columbia"
}

def getStateFromLocation(location):
    if not location:
        return None
    
    generic_locations = [
        "open to relocation", "remote", "none", "n/a", "not specified", 
        "flexible", "anywhere", "worldwide", "global"
    ]
    
    location_lower = location.lower().strip()
    if any(generic in location_lower for generic in generic_locations):
        return None
    
    location_upper = location.upper().strip()
    
    if ',' in location_upper:
        parts = location_upper.split(',')
        if len(parts) >= 2:
            last_part = parts[-1].strip()
            if last_part in states:
                return last_part
    
    words = location_upper.split()
    if len(words) >= 2:
        last_word = words[-1]
        if last_word in states:
            return last_word
    
    return None

def fetchStateAddresses(stateAbbr):
    if not stateAbbr:
        return None
    
    if stateAbbr not in states:
        return None
    
    stateName = states[stateAbbr]
    
    formattedState = stateName.lower().replace(' ', '%20')
    url = f"https://www.bestrandoms.com/random-{formattedState}-address"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            return response.text
        else:
            return None
            
    except Exception as e:
        print(f"Error fetching addresses: {e}")
        return None

def extractAddresses(htmlContent):
    try:
        soup = BeautifulSoup(htmlContent, 'html.parser')
        addressList = soup.find('ul', class_='list-unstyled height-90')
        
        if not addressList:
            return []
        
        addresses = []
        addressItems = addressList.find_all('li', class_=['col-sm-6', 'col-md-4'])
        
        for item in addressItems:
            spans = item.find_all('span')
            
            if len(spans) >= 4:
                addressData = {
                    'street': spans[1].get_text(strip=True),
                    'city': spans[2].get_text(strip=True),
                    'state': spans[3].get_text(strip=True),
                    'zipcode': spans[4].get_text(strip=True) if len(spans) > 4 else ""
                }
                addresses.append(addressData)
        
        return addresses
        
    except Exception as e:
        print(f"Error parsing HTML: {e}")
        return []

def findAddressesForLocation(location):
    try:
        location_upper = location.upper().strip()
        if location_upper in states:
            stateAbbr = location_upper
        else:
            stateAbbr = getStateFromLocation(location)
        
        if not stateAbbr:
            return {
                'success': False,
                'message': 'No valid US state found in location',
                'addresses': []
            }
        
        htmlContent = fetchStateAddresses(stateAbbr)
        if not htmlContent:
            return {
                'success': False,
                'message': f'Failed to fetch addresses for {stateAbbr}',
                'addresses': []
            }
        
        addresses = extractAddresses(htmlContent)
        
        if not addresses:
            return {
                'success': False,
                'message': f'No addresses found for {stateAbbr}',
                'addresses': []
            }
        
        return {
            'success': True,
            'message': f'Found {len(addresses)} addresses for {stateAbbr}',
            'state': stateAbbr,
            'addresses': addresses
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f'Error: {str(e)}',
            'addresses': []
        }

# Test function
if __name__ == "__main__":
    test_locations = [
        "Santa Clara, CA",
        "New York, NY", 
        "Austin, TX",
        "Chicago, IL",
        "Miami, FL",
        "Seattle, WA",
        "Open To Relocation",
        "Remote",
        "None",
        "San Francisco, CA",
        "Boston, MA",
        "Denver, CO"
    ]
    
    for location in test_locations:
        print(f"\nTesting location: {location}")
        result = findAddressesForLocation(location)
        print(f"Result: {result}")
