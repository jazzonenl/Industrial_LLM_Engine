# AI-Powered Bearing Diagnostics

This simulator demonstrates how artificial intelligence can revolutionize failure prediction in critical mechanical components such as industrial bearings. We explore a holistic, data-efficient approach to monitoring degradation using LLM-inspired models and real-world datasets.

## 🎯 Key Objectives

- Detect early signs of bearing degradation with minimal failure data.
- Analyze equipment as a system, not just as isolated signals.
- Replace threshold-based monitoring with adaptive, self-learning diagnostics.
- Provide interpretable anomaly and degradation detection for high-risk industries.

## 🧠 Diagnostic Approach

Traditional vibration-based diagnostics (FFT, RMS, envelope detection) are effective but reactive. Our AI-based approach takes diagnostics to the next level:

### Diagnostic Pipeline

- **Holistic System State Mapping**: Instead of analyzing sensors individually, we model the entire machine state as a dynamic matrix of interdependent signals.
- **LLM-Inspired Analysis Engine**: A purpose-built model inspired by NLP techniques interprets time-series as structured context, revealing subtle degradation patterns.
- **Adaptive Anomaly Detection**: The system captures both gradual wear and sudden failures, reducing noise sensitivity and false alarms.

## 🧪 Validation & Testing

To validate our method, we used the publicly available **NASA Bearing Dataset**:

- **Input**: Vibration time-series from four bearings and eight sensors.
- **Output**: Detected degradation trends, pinpointed the failing bearing and sensor, and isolated anomaly regions long before catastrophic failure.

### Results:

- Accurately identified bearing failure onset in Sensor #7.
- No need for prior fault examples — only normal operating data was used.
- Achieved early fault detection while minimizing false positives.

## ✅ Advantages Over Traditional Methods

| Traditional Methods         | AI-Based Approach                        |
|-----------------------------|------------------------------------------|
| Per-sensor focus            | System-wide diagnostics                  |
| Reactive fault detection    | Predictive and proactive analytics       |
| Manual threshold setting    | Self-adaptive signal interpretation      |
| Limited to known scenarios  | Learns from normal patterns only         |

## 🏭 Where It Works Best

- **Aviation & Aerospace**: Early fault detection enhances safety.
- **Heavy Industry**: Prevents unexpected shutdowns.
- **Energy Sector**: Detects wear in turbines, generators, and motors.
- **Transport & Railways**: Monitors high-load rotating systems in motion.

## 🔧 Tech Stack

- Python
- NumPy / Pandas
- SciKit-Learn
- Custom-built AI model for time-series interpretation

