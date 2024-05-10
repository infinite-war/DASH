import requests
import json

# Replace with your IP address and port used by NetLimiter API
api_url = 'http://127.0.0.1:8282/nlapi/v1/'
api_password = 'your_api_password'

# Set up authentication
headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Basic {api_password}'
}

def send_request(method, endpoint, data=None):
    url = api_url + endpoint
    response = requests.request(method, url, headers=headers, json=data)
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(response.text)

# Example rule data
rule_data = {
    'name': 'Python Rule',
    'direction': 'In',  # or 'Out' for outgoing traffic
    'protocol': 'TCP',
    'remoteAddress': '192.168.1.1',
    'remotePort': '80',
    'limit': 1024  # Speed in KB/s
}

# Create a new rule
response = send_request('POST', 'rules', rule_data)
print(response)
