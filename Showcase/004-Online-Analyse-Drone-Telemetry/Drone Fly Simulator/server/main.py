"""
Drone Fly Simulator made within testing Industrial LLM-Engine
https://github.com/jazzonenl/Industrial_LLM_Engine

This script is the main server application for the drone flight simulator.
It serves as the backend that:
  - Initializes a Flask web application with Flask-SocketIO for real-time communication.
  - Hosts a web interface to control and monitor the drone simulation.
  - Receives flight data and parameter updates from the client modules (e.g., UI and flight emulation).
  - Forwards the received flight data to an external server after processing and transformation.
  - Parses attribute strings (e.g., movement_text and dynamics_text) into structured JSON objects.
  - Generates unique request identifiers and adds additional metadata to the payload before forwarding.

The server uses eventlet for asynchronous networking and monkey patches the standard library
to support non-blocking IO. It is configured to allow cross-origin requests and handles both
HTTP requests for the main page and WebSocket events for updating flight parameters and flight data.
"""

import eventlet
eventlet.monkey_patch()

from flask import Flask, render_template
from flask_socketio import SocketIO
import requests
import time
from datetime import datetime
import json
import uuid

# URL of the external server to forward flight data (ensure it matches the new module)
TARGET_URL = "http://10.46.35.108:5000/post_handler/process_post"

app = Flask(__name__, template_folder="../client/templates", static_folder="../client/static")
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

@app.route("/")
def index():
    return render_template("index.html")

def parse_attributes(text):
    """
    Parses a string of attributes in the format 'key=value, key2=value2'
    and returns a dictionary of the parsed pairs.
    """
    result = {}
    for pair in text.split(','):
        pair = pair.strip()
        if not pair:
            continue
        if '=' in pair:
            key, value = pair.split('=', 1)
        elif ':' in pair:
            key, value = pair.split(':', 1)
        else:
            continue
        result[key.strip()] = value.strip()
    return result

def forward_flight_data(data):
    """
    Forms a payload with additional fields and sends the flight data to an external server.
    The new payload includes:
      - nickname: sender identifier,
      - req_id: unique request identifier,
      - is_relative: calculation flag,
      - cnt_calc_request: number of requests for calculation,
      - cnt_grafana_cache: number of lines for Grafana data caching,
      - transform_mode: processing mode for numerical transformation,
      - data: the flight data as a JSON object.

    Additionally, if 'movement_text' or 'dynamics_text' are provided as strings,
    they are parsed into dictionaries with key-value pairs.
    """
    # If data is a list with exactly one element that is a dictionary, use that element
    if isinstance(data, list):
        if len(data) == 1 and isinstance(data[0], dict):
            data_obj = data[0]
        else:
            if data and isinstance(data[0], dict):
                data_obj = data[0]
            else:
                print("❌ Error: Data must be a JSON object (dictionary)")
                return
    elif isinstance(data, dict):
        data_obj = data
    else:
        print("❌ Error: Data must be a JSON object (dictionary)")
        return

    # Convert movement_text and dynamics_text from strings to dictionaries if needed.
    for key in ['movement_text', 'dynamics_text']:
        if key in data_obj and isinstance(data_obj[key], str):
            parsed = parse_attributes(data_obj[key])
            # Remove the original field and merge parsed attributes into the object.
            del data_obj[key]
            data_obj.update(parsed)

    payload = {
        "nickname": "DJIFlightRecord",
        "req_id": f"req_{int(time.time())}_{uuid.uuid4()}",
        "is_relative": True,
        "cnt_calc_request": 500,      # e.g., consider the last 500 requests
        "cnt_grafana_cache": 5000,     # e.g., cache 5000 rows for Grafana
        "transform_mode": "default",   # Mode for number processing: 'default' or 'log_transform'
        "data": data_obj
    }
    headers = {"Content-Type": "application/json"}
    try:
        response = requests.post(TARGET_URL, json=payload, headers=headers, timeout=10)
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"\n🕒 {current_time} - Forwarded flight data:")
        print(f"🔹 nickname: {payload['nickname']}")
        print(f"🔹 Request ID: {payload['req_id']}")
        print(f"🔹 Data: {payload['data']}")
        if response.status_code == 200:
            print("✅ Response from target server: OK")
        else:
            print(f"❌ Error {response.status_code}: {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Request error: {e}")

@socketio.on("update_parameters")
def handle_update_params(data):
    print(f"Parameters updated: {data}")

@socketio.on("flight_data")
def handle_flight_data(data):
    print("Flight Data Received:", data)
    # Forward the received flight data to the external server
    forward_flight_data(data)

if __name__ == "__main__":
    socketio.run(app, debug=True)
