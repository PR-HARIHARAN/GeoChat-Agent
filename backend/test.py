from geopy.geocoders import Nominatim

def test_geocoding(location_name):
    try:
        # Initialize Nominatim API
        geolocator = Nominatim(user_agent="disaster_eye_test")
        
        print(f"Attempting to geocode: {location_name}")
        
        # Get location
        location = geolocator.geocode(location_name)
        
        if location:
            print(f"Location found: {location.address}")
            print(f"Latitude: {location.latitude}, Longitude: {location.longitude}")
            return location.latitude, location.longitude
        else:
            print("Location not found")
            return None
            
    except Exception as e:
        print(f"Error during geocoding: {str(e)}")
        return None

# Test with "Chennai"
test_geocoding("Chennai")