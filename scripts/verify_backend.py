import requests
import time

URL = "http://localhost:5000/ingest"

try:
    response = requests.get(URL)
    if response.status_code == 200:
        print("Backend is reachable and /ingest is working.")
        print("Response:", response.json())
    else:
        print(f"Backend returned status code {response.status_code}")
except Exception as e:
    print(f"Failed to connect to backend: {e}")
