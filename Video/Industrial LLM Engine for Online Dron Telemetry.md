# AI-Enhanced Drone Anti-Jamming System

This simulator showcases an AI-powered solution designed to protect drones from jamming attacks. Using a custom flight emulator driven by real-world telemetry, our system continuously monitors flight data to detect early signs of signal disruption and alert the operator with actionable insights.

## 🎯 Key Objectives

- **Prevent Flight Disruptions:** Detect early jamming events to avoid loss of control.
- **Real-Time Monitoring:** Continuously analyze drone telemetry data to identify abnormal trends.
- **Clear Communication:** Deliver intuitive, plain-language alerts to guide operator actions.
- **Robust Testing:** Validate the system using a simplified flight emulator built from real DJI Air 2S flight logs.

## 🛠️ Approach

Our AI module is integrated within a drone flight emulator that replicates essential flight dynamics using actual flight log data. Key aspects include:

- **Drone Emulator with Basic Physics:** Simulates virtual flight using parameters such as altitude, vertical speed, engine RPM, battery status, flight time, and total distance.
- **Telemetry Integration:** Incorporates real-world metrics like GPS signal quality, gyroscope, and accelerometer readings to mimic actual drone performance.
- **Continuous Data Analysis:** The AI module monitors the drone’s “pulse” — detecting erratic changes in critical parameters (e.g., fluctuating GPS signals or sudden vertical speed spikes) that may indicate jamming.
- **Operator Alerts:** Instead of cryptic error codes, the system issues clear messages (e.g., “Strong radio interference detected. Recommend returning to base or altering the route.”).

## ✅ Key Results

- **Early Jamming Detection:** The system identifies potential jamming conditions before complete signal loss, enabling timely corrective actions.
- **Intuitive Dashboard:** An interactive control panel displays real-time graphs and key metrics, offering a cockpit-like view of the drone’s status.
- **Enhanced Safety:** By providing early warnings and clear directives, the solution significantly improves operational safety in challenging environments.

## 🔧 Technology Stack

- Python
- Custom Flight Simulation Engine
- Machine Learning Models for Anomaly Detection
- Data Visualization Tools

## 🎮 Drone Flight Simulation Demo

- [Industrial LLM Engine for Online Dron Telemetry](https://www.youtube.com/watch?v=1JFipqtTktU)

Watch a drone follow a custom route with realistic flight physics, altitude control, and wind interference.
Set waypoints, take off, and monitor every move — including potential crashes in jamming zones.

- All telemetry — from GPS and altitude to battery and RPM — is streamed in real time.
- Using Industrial LLM Engine, we analyze sensor data on the fly and generate text-based insights and warnings for the drone operator.
- Smart simulation meets AI-powered decision support.

