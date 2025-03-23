#!/usr/bin/env python3
"""
EUV Machine Log Emulator
------------------------
This script emulates the generation of logs for an EUV (Extreme Ultraviolet) machine as part of the project:
https://github.com/jazzonenl/Industrial_LLM_Engine

It simulates the behavior of various subsystems of the machine, generates synthetic parameters and timestamps,
applies degradation events, and creates log entries accordingly. The script also supports parallel processing to
simulate data generation in chunks.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import random
import json
import os
import argparse
import time
import warnings
from typing import Dict, List, Any
from math import cos, pi, exp

# Using ProcessPoolExecutor for parallel processing
from concurrent.futures import ProcessPoolExecutor, as_completed

warnings.simplefilter(action='ignore', category=FutureWarning)

# =========================
#   Helper Functions
# =========================

# Logs the start time of a function call and prints its name and arguments.
def log_start(function_name, **kwargs):
    print(f"[{datetime.now()}] START: {function_name} with args: {kwargs}")
    return time.time()

# Logs the end of a function call, printing the duration.
def log_end(function_name, start_time):
    end_time = time.time()
    duration = end_time - start_time
    print(f"[{datetime.now()}] END: {function_name}, duration: {duration:.4f} s")
    return duration

# Appends a comment with a timestamp to a file.
def add_comment_to_file(comment, file_path="save.txt"):
    """
    Writes a comment (with timestamp) to a text file.
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    entry = f"[{timestamp}] {comment}\n"
    with open(file_path, "a", encoding="utf-8") as file:
        file.write(entry)
    print("Comment added to file.")

# =========================
#  Parameter Generation Functions
# =========================

# Generates a specified number of parameters, including desired ones, with random default values and variation percentages.
def generate_parameters(num_parameters=200,
                        desired_parameters=None,
                        variation_ranges=None,
                        decimal_places=4):
    """
    Generates a specified number of parameters (or more if needed),
    including the desired parameters (desired_parameters). Each parameter has:
      - default (base),
      - variation_prc (fraction of base used as std for noise),
      - unit (a simple string representing the unit of measurement).
    variation_ranges – list of possible (min, max) ranges for variation_prc.
    """
    start = log_start("generate_parameters",
                      num_parameters=num_parameters,
                      desired_parameters=desired_parameters,
                      variation_ranges=variation_ranges,
                      decimal_places=decimal_places)
    if desired_parameters is None:
        desired_parameters = []
    if variation_ranges is None or len(variation_ranges) == 0:
        variation_ranges = [(0.01, 0.10)]

    categories = [
            'Laser_Source',
            'Beam_Control',
            'Optics_Alignment',
            'Thermal_Management',
            'Feedback_Control',
            'Power_Supply',
            'Safety_Systems',
            'Environmental_Controls',
            'Diagnostics',
            'Pulse_Generation',
            'Wavelength_Control',
            'Beam_Quality',
            'Focus_Control',
            'Scanning_System',
            'Modulation_System',
            'Cooling_System',
            'Vibration_Isolation',
            'Optical_Path',
            'Data_Processing',
            'Maintenance_Systems',
            'Communication_Interface',
            'Spectroscopy',
            'Beam_Shaping',
            'Frequency_Doubling',
            'Acousto-Optic_Modulators',
            'Optical_Electronics',
            'Laser_Cavities',
            'Beam_Steering',
            'Polarization_Control',
            'Vacuum_System',
            'Motion_Stage_Control',
            'Illumination_System',
            'Reticle_Handling',
            'Wafer_Alignment',
            'Metrology',
            'Error_Correction',
            'Energy_Management',
            'Optical_Coatings',
            'Photonics_Integration',
            'Nonlinear_Optics',
            'Phase_Control',
            'Thermal_Expansion_Compensation',
            'Material_Analysis',
            'Alignment_Sensors',
            'High_Precision_Mechanics',
            'Dynamic_Balancing',
            'Laser_Amplification',
            'UV_Lithography',
            'X-Ray_Technology',
            'Adaptive_Optics',
            'Optical_Calibration',
            'Photomask_Handling',
            'Pattern_Recognition',
            'Power_Stabilization',
            'Surface_Inspection',
            'Electromagnetic_Shielding',
            'Cleanroom_Compatibility',
            'Process_Control_Systems',
            'Component_Monitoring',
            'Thermal_Insulation',
            'High_Voltage_Safety',
            'Data_Synchronization',
            'System_Backup',
            'Real_Time_Monitoring',
            'System_Diagnostics',
            'Light_Intensity_Control',
            'Vacuum_Pump_Monitoring',
            'Ion_Beam_Control',
            'Nanopositioning',
            'Lithographic_Resolution',
            'Wafer_Exposure',
            'Mask_Inspection',
            'Plasma_Control',
            'Gas_Flow_Regulation',
            'Pressure_Management',
            'Contamination_Control',
            'Alignment_Correction',
            'Optical_Intensity_Monitoring',
            'Reflectivity_Analysis',
            'Emission_Control',
            'Heat_Transfer_Analysis',
            'Dynamic_Response_Control',
            'Frequency_Stabilization',
            'Beam_Homing',
            'Machine_Condition_Monitoring',
            'Predictive_Maintenance',
            'Wafer_Clamping',
            'Substrate_Handling',
            'Coherence_Control',
            'Voltage_Regulation',
            'Software_Integration',
            'Load_Balancing',
            'Automation_Control',
            'Component_Lifetime_Tracking',
            'Field_Service_Interface',
            'Calibration_Tools',
            'Noise_Reduction',
            'Feedback_Loop_Optimization',
            'Interference_Cancellation',
            'Material_Compatibility',
            'Optical_Resolution_Control',
            'Event_Log_Analysis',
            'Temperature_Gradient_Control',
            'Mechanical_Alignment',
            'High_Frequency_Scanning',
            'Electrostatic_Discharge_Protection',
            'Radiation_Shielding',
            'User_Access_Control',
            'Remote_Operation_Support',
            'Laser_Intensity_Stabilization',
            'Data_Encryption',
            'Firmware_Management',
            'Fieldbus_Communication',
            'Vibration_Compensation',
            'Thermal_Expansion_Control',
            'Laser_Tuning',
            'System_Reliability_Monitoring',
            'Defect_Detection',
            'System_Load_Monitoring',
            'Machine_Learning_Optimization',
            'Temperature_Sensors',
            'Pressure_Sensors',
            'Humidity_Sensors',
            'Optical_Signal_Processing',
            'High_Precision_Actuators',
            'Wear_Level_Monitoring',
            'Mechanical_Stress_Analysis',
            'Fine_Tune_Adjustments',
            'Optical_Centering',
            'Wavefront_Correction',
            'Beam_Profile_Analysis',
            'Thermal_Distortion_Correction',
            'Error_Prediction',
            'High_Speed_Processing',
            'Control_Algorithms',
            'Optical_Field_Stabilization',
            'Wafer_Surface_Analysis',
            'Vacuum_Leak_Detection',
            'Material_Deformation_Tracking',
            'Thermoelectric_Cooling',
            'Energy_Harvesting',
            'Laser_Damage_Mitigation',
            'Beam_Overlapping',
            'Multi_Axis_Control',
            'Component_Alignment_Tools',
            'System_Performance_Analysis',
            'Software_Debugging_Tools',
            'Energy_Dissipation',
            'Plasma_Monitoring',
            'Magnetic_Field_Shielding',
            'High_Temperature_Stability',
            'Light_Scattering_Analysis',
            'Precision_Cutting',
            'Optical_Path_Cleaning',
            'System_Integration_Tests',
            'Control_Signal_Monitoring',
            'Network_Security',
            'High_Speed_Communication',
            'Component_Cooling',
            'Power_Optimization',
            'Safety_Protocols',
            'Operational_Logistics',
            'Supply_Chain_Integration',
            'Wafer_Processing',
            'High_Precision_Lithography',
            'Dynamic_Optics_Adjustment',
            'Operational_Flexibility',
            'Long_Term_Stability',
            'Modular_Design_Adaptation',
            'Cross_System_Compatibility',
            'Operational_Scaling',
            'Wafer_Flatness_Analysis',
            'Error_Code_Interpretation',
            'Light_Polarization',
            'Thermal_Coupling',
            'Emission_Spectra_Analysis',
            'Dynamic_Laser_Control'
        ]

    parameters = {}
    category_counter = {cat: 1 for cat in categories}

    # Add desired parameters first.
    for dp in desired_parameters:
        if dp not in parameters:
            c = random.choice(categories)
            base_val = round(random.uniform(10, 1000), decimal_places)
            chosen_range = random.choice(variation_ranges)
            var_prc = round(random.uniform(chosen_range[0], chosen_range[1]), decimal_places)
            parameters[dp] = {
                "default": base_val,
                "variation_prc": var_prc,
                "unit": "units"
            }

    # Fill in the remaining parameters until reaching the target count.
    while len(parameters) < num_parameters:
        c = random.choice(categories)
        param_name = f"{c}_param_{category_counter[c]}"
        category_counter[c] += 1

        if param_name in parameters:
            continue

        base_val = round(random.uniform(10, 1000), decimal_places)
        chosen_range = random.choice(variation_ranges)
        var_prc = round(random.uniform(chosen_range[0], chosen_range[1]), decimal_places)
        parameters[param_name] = {
            "default": base_val,
            "variation_prc": var_prc,
            "unit": "units"
        }

    log_end("generate_parameters", start)
    return parameters

# Saves the configuration with parameters to a JSON file.
def save_parameters_to_json(parameters, config, filename='laser_parameters.json'):
    start = log_start("save_parameters_to_json", filename=filename)
    with open(filename, 'w') as f:
        json.dump(config, f, indent=4, default=str)
    print(f"[{datetime.now()}] Parameters saved to {filename}")
    log_end("save_parameters_to_json", start)

# Loads the configuration from a JSON file.
def load_parameters(config_file='laser_parameters.json'):
    start = log_start("load_parameters", config_file=config_file)
    with open(config_file, 'r', encoding='utf-8-sig') as f:
        config = json.load(f)
    log_end("load_parameters", start)
    return config

# =========================
#  Timestamp Generation Functions
# =========================

# Generates a list of timestamps given a start time, duration, and sampling rate.
def generate_timestamps(start_time_str, duration, sampling_rate):
    """
    Generates a list of timestamps with the specified sampling rate.
    """
    start = log_start("generate_timestamps",
                      start_time_str=start_time_str,
                      duration=duration,
                      sampling_rate=sampling_rate)
    start_time = datetime.strptime(start_time_str, "%Y-%m-%dT%H:%M:%SZ")
    total_samples = int(duration * sampling_rate)
    timestamps = [start_time + timedelta(seconds=i / sampling_rate) for i in range(total_samples)]
    log_end("generate_timestamps", start)
    return timestamps

# Creates a pandas DataFrame with random values for each parameter based on a given seed.
def create_dataframe_with_unique_seed(timestamps, parameters, seed, decimal_places=2):
    """
    Creates a DataFrame where for each timestamp random parameter values are generated
    (N(base, base*variation_prc)) using the specified seed.
    """
    start = log_start("create_dataframe_with_unique_seed", num_timestamps=len(timestamps))
    np.random.seed(seed)
    random.seed(seed)
    data_dict = {'Timestamp': timestamps}
    for param, det in parameters.items():
        base = det.get('default', 50)
        var_prc = det.get('variation_prc', 0.01)
        std = base * var_prc
        vals = base + np.random.normal(0, std, len(timestamps))
        vals = np.round(vals, decimals=decimal_places)
        data_dict[param] = vals
    df = pd.DataFrame(data_dict)
    log_end("create_dataframe_with_unique_seed", start)
    return df

# =========================
#  Parameter Clipping Functions
# =========================

# Clips the parameter values to remain within realistic bounds.
def clip_parameters(data, config, max_degradation_per_param=None):
    """
    Clips the values within [base * (1 - max_degradation_percent - 3*variation_prc), base + 3*variation_prc],
    where:
      - max_degradation_percent is the maximum degradation percentage for the given parameter,
      - variation_prc is the fraction of base used as std for noise.
    """
    start = log_start("clip_parameters")
    parameters = config['parameters']
    decimal_places = config.get('decimal_places', 2)
    for p, det in parameters.items():
        prc = det.get('variation_prc', 0)
        if prc == 0.0:
            continue
        base = det.get('default', 50)
        std = base * prc
        if max_degradation_per_param and p in max_degradation_per_param:
            degradation_prc = max_degradation_per_param[p]
            low = base * (1 - degradation_prc) - 3 * std
        else:
            low = base - 3 * std
        high = base + 3 * std
        if p in data.columns:
            clipped = np.clip(data[p], low, high)
            data[p] = np.round(clipped, decimals=decimal_places)
    log_end("clip_parameters", start)

# =========================
#  Degradation Event Functions
# =========================

# Generates degradation events based on the configuration.
def generate_degradation_events(config_main):
    """
    Generates lists of degradation events (with random start_time) if specified.
    """
    start = log_start("generate_degradation_events")
    degr_params = config_main.get('degradation_parameters', [])
    all_events = []
    if not degr_params:
        print(f"[{datetime.now()}] No degradation parameters specified.")
        log_end("generate_degradation_events", start)
        return all_events

    total_dur = config_main['duration']

    for d in degr_params:
        param = d.get('parameter')
        dprc  = d.get('degradation_percent', 0)
        dsec  = d.get('duration_sec', 0)
        ndeg  = d.get('number_of_degradations', 0)
        dtype = d.get('degradation_type', 'gradual')
        if param and dsec > 0 and ndeg > 0:
            max_start = total_dur - dsec
            scheduled = []
            for _ in range(ndeg):
                if max_start <= 0:
                    break
                start_t = random.uniform(0, max_start)
                end_t   = start_t + dsec
                st_dt   = config_main['start_time_dt'] + timedelta(seconds=start_t)
                et_dt   = config_main['start_time_dt'] + timedelta(seconds=end_t)

                # Check overlaps (to avoid accidental stacking)
                overlap = False
                for s in scheduled:
                    if not (et_dt <= s['start_time'] or st_dt >= s['end_time']):
                        overlap = True
                        break
                if overlap:
                    continue

                ev = {
                    'parameter': param,
                    'start_time': st_dt,
                    'end_time': et_dt,
                    'degradation_percent': dprc,      # now using this value
                    'degradation_type': dtype
                }
                all_events.append(ev)
                scheduled.append(ev)

    print(f"[{datetime.now()}] Generated {len(all_events)} degradation events.")
    log_end("generate_degradation_events", start)
    return all_events

# Applies degradation events to the generated data.
def apply_degradation(data: pd.DataFrame,
                      degradation_events: List[Dict[str,Any]],
                      config_main: dict) -> (List[Dict[str,Any]], Dict[str, np.ndarray]):
    """
    Applies degradation events to the data:
    - Takes the original (already noised) parameter value.
    - For the interval [start_time, end_time) computes t_frac = (t - start_time)/(end_time - start_time).
    - Depending on the degradation type, gradually decreases (or uses "step"/"cosine", etc.) the value by dprc*factor(t_frac).
    Returns a list of applied events and degradation flags for logging.
    """
    start = log_start("apply_degradation")
    if data.empty:
        log_end("apply_degradation", start)
        return [], {}

    applied = []
    chunk_start = data['Timestamp'].iloc[0]
    chunk_end   = data['Timestamp'].iloc[-1]

    # Initialize degradation flags for each parameter.
    degradation_flags = {param: np.zeros(len(data), dtype=bool) for param in config_main['parameters']}

    for evt in degradation_events:
        param = evt['parameter']
        if param not in data.columns:
            continue
        st = max(evt['start_time'], chunk_start)
        et = min(evt['end_time'],   chunk_end)
        if st >= et:
            continue

        idxs = data.index[(data['Timestamp'] >= st) & (data['Timestamp'] < et)]
        if len(idxs) == 0:
            continue

        deg_type = evt['degradation_type']
        dprc     = evt['degradation_percent']
        base     = config_main['parameters'][param]['default']
        var_prc  = config_main['parameters'][param]['variation_prc']

        if var_prc == 0:
            # no degradation if variation is zero
            continue

        dur_sec   = (et - st).total_seconds()
        times     = data.loc[idxs, 'Timestamp']

        # Define degradation factor function (from 0 to 1) based on type.
        def degradation_factor(t_frac: float) -> float or None:
            # t_frac from 0 to 1
            if deg_type in ['gradual', 'linear']:
                # Linear from 0 to 1
                return t_frac

            elif deg_type == 'step':
                # Factor is 0 until half the interval, then suddenly 1
                return 1.0 if t_frac >= 0.5 else 0.0

            elif deg_type == 'cosine':
                # Smooth degradation using cosine: factor(t) = (1 - cos(pi*t_frac)) / 2
                return (1 - cos(pi * t_frac)) / 2

            elif deg_type == 'exponential':
                # Example: 1 - e^{-3*t_frac}, at t_frac=1 => ~0.95
                k = 3
                return 1 - exp(-k * t_frac)

            elif deg_type == 'instantaneous':
                # Instant degradation at the beginning
                return 1.0

            elif deg_type == 'missing':
                # Turn data into NaN
                return None

            else:
                # Unknown type — fallback to linear
                return t_frac

        # Apply degradation to each value in the interval.
        for i in idxs:
            t_current = times.loc[i]
            t_frac = 0
            if dur_sec > 0:
                t_frac = (t_current - st).total_seconds() / dur_sec
                t_frac = max(0, min(1, t_frac))

            current_val = data.at[i, param]
            f = degradation_factor(t_frac)
            if f is None:
                # missing => set NaN
                data.at[i, param] = np.nan
                degradation_flags[param][i] = False  # NaN is not counted as degraded
            else:
                # Decrease value by degradation percentage scaled by factor.
                new_val = current_val * (1.0 - dprc * f)
                data.at[i, param] = new_val
                degradation_flags[param][i] = True if f > 0 else False

        applied.append({
            'parameter': param,
            'start_time': st,
            'end_time': et,
            'degradation_percent': dprc,
            'degradation_type': deg_type
        })

    log_end("apply_degradation", start)
    return applied, degradation_flags

# =========================
#  Log Generation Functions
# =========================

# Generates log entries based on data and degradation flags.
def generate_logs(data_chunk: pd.DataFrame,
                  parameters: dict,
                  degradation_flags: Dict[str, np.ndarray],
                  phrases_part1: List[str],
                  phrases_part2: List[str]) -> List[str]:
    """
    Generates logs based on degradation flags.
    """
    logs = []
    for idx, row in data_chunk.iterrows():
        tts = row['Timestamp']
        for p, det in parameters.items():
            if p not in data_chunk.columns:
                continue
            val = row[p]
            if pd.isna(val):
                continue
            degraded = degradation_flags[p][idx]

            # Pick random phrases for the log entry.
            ph1 = random.choice(phrases_part1)
            ph2 = random.choice(phrases_part2)

            if degraded:
                log_line = (f"[{tts.strftime('%Y-%m-%d %H:%M:%S')}] WARNING: "
                            f"{ph1} {p} {ph2} Current value: {val} {det.get('unit','units')}")
            else:
                log_line = (f"[{tts.strftime('%Y-%m-%d %H:%M:%S')}] INFO: "
                            f"{ph1} {p} {ph2} Current value: {val} {det.get('unit','units')}")
            logs.append(log_line)
    return logs

# =========================
#  Final Report Functions
# =========================

# Generates a final simulation report with generated parameters, degradation events, and summary statistics.
def generate_result_report(config_main,
                           total_rows_generated,
                           total_logs_generated,
                           all_degradation_events,
                           result_filename="result.txt"):
    """
    Generates the final report (list of generated parameters, degradation events,
    total number of data points, etc.).
    """
    stt = log_start("generate_result_report")
    with open(result_filename, 'w', encoding='utf-8') as f:
        f.write("===== Simulation Report =====\n\n")
        f.write("List of Generated Parameters:\n")
        for p in config_main['parameters']:
            f.write(f"- {p}\n")
        f.write("\n")

        if all_degradation_events:
            f.write("All Degradation Events:\n")
            for e in all_degradation_events:
                f.write(f"Parameter: {e['parameter']}, Type: {e['degradation_type']}, "
                        f"Start: {e['start_time']}, End: {e['end_time']}, "
                        f"dprc: {e['degradation_percent']}\n")
        else:
            f.write("No degradation events.\n\n")

        f.write(f"\nTotal Number of Data Points: {total_rows_generated}\n")
        f.write(f"Total Number of Log Entries: {total_logs_generated}\n")

    print(f"[{datetime.now()}] Result report saved to {result_filename}")
    log_end("generate_result_report", stt)

# =========================
#  Chunk Processing Functions
# =========================

# Divides degradation events among chunks for parallel processing.
def assign_degradations_to_chunks(degr_events: List[Dict[str,Any]],
                                  chunk_starts: List[datetime],
                                  interval_duration: float) -> List[List[Dict[str,Any]]]:
    """
    Divides the list of degradations into chunks for parallel processing.
    If a degradation overlaps a chunk boundary, it is split.
    """
    chunked = [[] for _ in range(len(chunk_starts))]
    for e in degr_events:
        for i, st in enumerate(chunk_starts):
            chunk_end = st + timedelta(seconds=interval_duration)
            # Check for overlap between the event and the chunk.
            if e['start_time'] < chunk_end and e['end_time'] > st:
                new_e = e.copy()
                # Limit the event to the chunk boundaries.
                new_e['start_time'] = max(e['start_time'], st)
                new_e['end_time']   = min(e['end_time'],   chunk_end)
                chunked[i].append(new_e)
    return chunked

# Generates data and logs for a specific time interval (chunk).
def generate_data_for_interval(start_time: datetime,
                               duration: float,
                               config_main: dict,
                               chunk_events: List[Dict[str,Any]],
                               seed: int,
                               chunk_index: int,
                               phrases_part1: List[str],
                               phrases_part2: List[str]) -> Dict[str,Any]:
    """
    Function that generates data and logs for one chunk.
    """
    try:
        dec_places = config_main.get('decimal_places', 2)
        timestamps = generate_timestamps(
            start_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            duration,
            config_main['sampling_rate']
        )
        df = create_dataframe_with_unique_seed(timestamps,
                                               config_main['parameters'],
                                               seed,
                                               decimal_places=dec_places)

        # Apply degradation events.
        applied, degradation_flags = apply_degradation(df, chunk_events, config_main)

        # Clipping: Adjust values based on the maximum degradation percentage for each parameter.
        max_degradation_per_param = {}
        for e in chunk_events:
            p = e['parameter']
            frac = e['degradation_percent']
            if p not in max_degradation_per_param or frac > max_degradation_per_param[p]:
                max_degradation_per_param[p] = frac

        clip_parameters(df, config_main, max_degradation_per_param)

        # Generate logs based on the degradation flags.
        logs = generate_logs(df, config_main['parameters'], degradation_flags,
                             phrases_part1, phrases_part2)

        # Save the generated data and logs to CSV and log files.
        fdata = f"data_chunk_{chunk_index}.csv"
        flogs = f"logs_chunk_{chunk_index}.log"
        df.to_csv(fdata, index=False)
        with open(flogs, 'w', encoding='utf-8') as f:
            for line in logs:
                f.write(line + "\n")

        return {
            'rows_count': len(df),
            'logs_count': len(logs),
            'applied_events': applied,
            'data_file': fdata,
            'logs_file': flogs,
            'error': None
        }

    except Exception as e:
        return {
            'rows_count': 0,
            'logs_count': 0,
            'applied_events': [],
            'data_file': None,
            'logs_file': None,
            'error': str(e)
        }

# =========================
#  File Combination Functions
# =========================

# Combines all data chunks and log files into final output files.
def combine_files(num_threads: int, module_name_safe: str):
    """
    Combines all CSV and LOG files into single files and removes temporary ones.
    """
    final_data_filename = f"{module_name_safe}_logs.csv"
    final_logs_filename = f"{module_name_safe}_events.log"

    combined_data = []
    for i in range(num_threads):
        fdata = f"data_chunk_{i}.csv"
        if os.path.exists(fdata):
            df_chunk = pd.read_csv(fdata, parse_dates=['Timestamp'])
            combined_data.append(df_chunk)
            os.remove(fdata)

    if combined_data:
        combined_data = pd.concat(combined_data, ignore_index=True)
        combined_data.sort_values(by='Timestamp', inplace=True)
        combined_data.to_csv(final_data_filename, index=False,
                             date_format='%Y-%m-%dT%H:%M:%SZ')
        print(f"[{datetime.now()}] Final data saved to {final_data_filename}")
    else:
        print(f"[{datetime.now()}] No data chunks found to combine.")

    with open(final_logs_filename, 'w', encoding='utf-8') as fout:
        for i in range(num_threads):
            flog = f"logs_chunk_{i}.log"
            if os.path.exists(flog):
                with open(flog, 'r', encoding='utf-8') as fin:
                    for line in fin:
                        fout.write(line)
                os.remove(flog)

    print(f"[{datetime.now()}] Final logs saved to {final_logs_filename}")
    return final_data_filename, final_logs_filename

# =========================
#  Main Function
# =========================

# Main function orchestrating the simulation.
def main():
    start_main = log_start("main")
    parser = argparse.ArgumentParser(description="Laser System Simulation")
    parser.add_argument('--config', type=str, default=None, help='Path to config JSON')
    args = parser.parse_args()

    main_start = time.time()

    if args.config:
        # Load real configuration.
        if os.path.exists(args.config):
            print(f"[{datetime.now()}] Loading configuration from {args.config}...")
            cf_loaded = load_parameters(args.config)
            config_main = cf_loaded['Laser_Subsystem']
            config_main['start_time_dt'] = datetime.strptime(
                config_main['start_time'], "%Y-%m-%dT%H:%M:%SZ")
        else:
            print(f"[{datetime.now()}] No config file found: {args.config}")
            log_end("main", start_main)
            return
    else:
        # Generate default parameters if no config file is provided.
        error_params = [
            "Main_Laser_Power",
            "Laser_Wavelength",
            "Beam_Quality_M2",
            "Pulse_Frequency"
        ]
        variation_ranges = [(0.0, 0.005)]  # vary up to 2%
        dec_places = 10

        print(f"[{datetime.now()}] Generating laser system parameters...")
        params = generate_parameters(
            num_parameters = 1000,
            desired_parameters = error_params,
            variation_ranges   = variation_ranges,
            decimal_places = dec_places
        )

        # Example degradation parameters (not used in final configuration below).
        degrade_params_1 = [
            {
                'parameter': 'Main_Laser_Power',
                'degradation_percent': 0.15,  # Increased to 15%
                'duration_sec': 1000,
                'number_of_degradations': 1,
                'degradation_type': 'gradual'
            },
            {
                'parameter': 'Beam_Quality_M2',
                'degradation_percent': 0.02,
                'duration_sec': 1000,
                'number_of_degradations': 1,
                'degradation_type': 'cosine'
            },
            {
                'parameter': 'Pulse_Frequency',
                'degradation_percent': 0.02,
                'duration_sec': 1000,
                'number_of_degradations': 1,
                'degradation_type': 'step'
            },
            {
                'parameter': 'Laser_Wavelength',
                'degradation_percent': 0.03,
                'duration_sec': 1000,
                'number_of_degradations': 1,
                'degradation_type': 'exponential'
            }
        ]

        degrade_params = [
            {
                'parameter': 'Main_Laser_Power',
                'degradation_percent': 0.1,  # Increased to 15%
                'duration_sec': 1000,
                'number_of_degradations': 1,
                'degradation_type': 'cosine'
            }
        ]

        config = {
            "Laser_Subsystem": {
                "module_name": "Laser_Subsystem.simple.5",
                "sampling_rate": 20,
                "duration": 20000,  # seconds
                "start_time": "2025-01-21T00:00:00Z",
                "degradation_parameters": degrade_params,
                "parameters": params,
                "num_threads": 10,  # increased for performance
                "decimal_places": dec_places
            }
        }

        config['Laser_Subsystem']['start_time_dt'] = datetime.strptime(config['Laser_Subsystem']['start_time'], "%Y-%m-%dT%H:%M:%SZ")

        save_parameters_to_json(params, config, filename='myconfig.json')
        config_main = config['Laser_Subsystem']

    # Parallel processing parameters.
    n_threads = config_main['num_threads']
    dur       = config_main['duration']
    inter     = dur / n_threads
    st_dt     = config_main['start_time_dt']

    # Create a list of start times for each chunk.
    chunk_starts = [st_dt + timedelta(seconds=i * inter) for i in range(n_threads)]

    # Generate degradation events.
    all_degr = generate_degradation_events(config_main)

    # Distribute degradation events among chunks.
    chunked = assign_degradations_to_chunks(all_degr, chunk_starts, inter)

    module_name = config_main['module_name'].replace(' ', '_')

    total_rows  = 0
    total_logs  = 0
    applied_all = []

    phrases1 = ['']
    phrases2 = ['']

    par_start = log_start("parallel_generation")
    with ProcessPoolExecutor(max_workers=n_threads) as execs:
        futures = []
        for i in range(n_threads):
            fut = execs.submit(
                generate_data_for_interval,
                chunk_starts[i],
                inter,
                config_main,
                chunked[i],
                i,  # seed
                i,  # chunk_index
                phrases1,
                phrases2
            )
            futures.append(fut)

        for f in as_completed(futures):
            res = f.result()
            if res['error']:
                print(f"Error: {res['error']}")
                continue
            total_rows += res['rows_count']
            total_logs += res['logs_count']
            applied_all.extend(res['applied_events'])
            print(f"[{datetime.now()}] chunk => Rows {res['rows_count']}  "
                  f"Logs {res['logs_count']}  Applied {len(res['applied_events'])}")

    log_end("parallel_generation", par_start)

    # Remove duplicate degradation events.
    unique_evs = []
    seen = set()
    for e in applied_all:
        e_id = (e['parameter'], e['start_time'], e['end_time'],
                e['degradation_percent'], e['degradation_type'])
        if e_id not in seen:
            seen.add(e_id)
            unique_evs.append(e)

    # Combine all generated files.
    fdata, flogs = combine_files(n_threads, module_name)

    # Generate the final simulation report.
    generate_result_report(
        config_main,
        total_rows,
        total_logs,
        unique_evs,
        result_filename=f"{module_name}_result.txt"
    )

    main_end = time.time()
    dur_main = main_end - main_start
    print(f"[{datetime.now()}] Simulation done. Elapsed: {dur_main:.2f}s")
    log_end("main", start_main)

# =========================
#   Entry Point
# =========================

if __name__ == "__main__":
    # Uncomment to add comments to a log file.
    # add_comment_to_file("Start: main")
    main()
    # add_comment_to_file("End: main")
