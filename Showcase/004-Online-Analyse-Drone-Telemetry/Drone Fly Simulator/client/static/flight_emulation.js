/*
 * Drone Fly_Simulator made within testing Industrial LLM-Engine
 * https://github.com/jazzonenl/Industrial_LLM_Engine
 *
 * This script emulates drone flight physics and control.
 * It simulates both horizontal and vertical dynamics including:
 *   - Route filtering to remove waypoints that are too close (less than 5 m apart)
 *   - PID control for vertical altitude management with wind disturbance effects
 *   - Adaptive braking and virtual target computation for smooth waypoint transitions
 *   - Horizontal motion control with acceleration limits, wind influence, and deceleration near waypoints
 *   - Simulation of flight modes such as takeoff, cruise, landing, and hover
 *   - Emulation of engine RPM, battery consumption, and battery temperature changes
 *   - Modeling of external interference via Jam Zone that affects GPS quality and flight stability
 *
 * The script continuously updates the drone's state and transmits flight data including
 * position, altitude, velocities, engine and battery metrics, and simulated sensor outputs.
 * It provides functions to start, stop, take off, land, set routes, adjust parameters,
 * and update environmental conditions (like wind and jam zones).
 */

(function(){
  // Filter the route by removing points that are less than 5 meters apart
  function filterRoute(route) {
    let filtered = [];
    for (let pt of route) {
      if (!filtered.length || computeDistance(pt, filtered[filtered.length - 1]) > 5) {
        filtered.push(pt);
      }
    }
    return filtered;
  }

  // Clamp function to limit values between min and max
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  let state = {
    position: { lat: 55.7522, lng: 37.6156 },
    altitude: 0,               // initially on the ground
    targetAltitude: 0,
    verticalSpeed: 0,
    homePosition: null,        // if not set, will be the first point in the route
    flightStarted: false,
    route: [],
    waypointIndex: 0,
    // Horizontal speeds (m/s)
    vx: 0,
    vy: 0,
    horizontalSpeed: 50 / 3.6, // 50 km/h converted to m/s
    timeMultiplier: 100,
    fullFlightTime: 30,
    altStability: 1,
    hoverMode: false,
    repeatMission: false,
    wind: { speed: 0, direction: 0 },
    // Additional parameters
    engineRPM: 2000,
    batteryLevel: 100,         // in percent
    batteryTemperature: 30,    // in °C
    flightTime: 0,             // in seconds
    totalDistance: 0,          // in meters
    // Modes: "onGround", "takeOff", "cruise", "landing"
    mode: "onGround",
    cruiseAltitude: 100,       // desired flight altitude (m)
    // Jam Zone: { center: {lat, lng}, radius: in meters }
    jamZone: null,
    // GPS quality: from 0 to 1 (1 is ideal)
    gpsQuality: 1,
    crashed: false           // indicates an emergency state
  };

  const maxAcceleration = 5; // m/s²
  const minSpeed = 0.5;      // m/s
  const maxIntegral = 10;    // limit for the integral error

  // PID parameters for vertical control
  const Kp_alt = 0.4, Ki_alt = 0.05, Kd_alt = 0.15;
  let altErrorIntegral = 0;
  let lastAltError = 0;

  // Compute a virtual target (adaptive braking) based on distance to waypoint
  function getVirtualTarget(currentPos, waypoint, brakingDistance, safetyMargin) {
    let d = computeDistance(currentPos, waypoint);
    if (d > brakingDistance + safetyMargin) {
      let ratio = (d - brakingDistance - safetyMargin) / d;
      return {
        lat: waypoint.lat + (currentPos.lat - waypoint.lat) * ratio,
        lng: waypoint.lng + (currentPos.lng - waypoint.lng) * ratio
      };
    } else {
      return waypoint;
    }
  }

  // Calculate the distance between two points (in meters)
  function computeDistance(a, b) {
    const R = 6371000;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLon = (b.lng - a.lng) * Math.PI / 180;
    const lat1 = a.lat * Math.PI / 180;
    const lat2 = b.lat * Math.PI / 180;
    const A = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(A), Math.sqrt(1-A));
  }

  // Main function to update flight physics
  function updateFlightPhysics(dt) {
    if (state.crashed) return;
    let prevPos = { ...state.position };

    // Horizontal movement
    if (!state.hoverMode && state.flightStarted && state.route.length > 0) {
      if (state.mode !== "landing") {
        let currentPos = state.position;
        let targetWaypoint = state.route[state.waypointIndex];
        let d = computeDistance(currentPos, targetWaypoint);
        if (d < 10) {  // waypoint reached if within 10 meters
          state.waypointIndex++;
          if (state.waypointIndex >= state.route.length) {
            if (state.repeatMission && state.route.length > 1) {
              state.route = state.homePosition ? [state.position, state.homePosition] : [state.position, state.route[0]];
              state.waypointIndex = 1;
              console.log("Repeating mission");
            } else {
              state.mode = "landing";
              state.targetAltitude = 0;
              console.log("Switching to landing mode");
              targetWaypoint = state.route[state.route.length - 1];
              d = computeDistance(currentPos, targetWaypoint);
            }
          } else {
            targetWaypoint = state.route[state.waypointIndex];
            d = computeDistance(currentPos, targetWaypoint);
          }
        }
        let baseSpeed = state.horizontalSpeed;
        let desiredSpeed = baseSpeed;
        if (d >= 10) {
          const maxDeceleration = 2;
          let brakingDistance = baseSpeed**2 / (2 * maxDeceleration);
          let safetyMargin = 10;
          let virtualTarget = getVirtualTarget(currentPos, targetWaypoint, brakingDistance, safetyMargin);
          let distanceToVirtual = computeDistance(currentPos, virtualTarget);
          if (distanceToVirtual < (brakingDistance + safetyMargin)) {
            desiredSpeed = baseSpeed * (distanceToVirtual / (brakingDistance + safetyMargin));
          } else {
            desiredSpeed = baseSpeed;
          }
          desiredSpeed = Math.max(minSpeed, desiredSpeed);
        } else {
          desiredSpeed = baseSpeed;
        }
        state.desiredSpeed = desiredSpeed;
        let desiredBearing = Math.atan2(targetWaypoint.lat - currentPos.lat, targetWaypoint.lng - currentPos.lng);
        let desiredVx = Math.cos(desiredBearing) * desiredSpeed;
        let desiredVy = Math.sin(desiredBearing) * desiredSpeed;
        let ax = desiredVx - state.vx;
        let ay = desiredVy - state.vy;
        let aMag = Math.sqrt(ax * ax + ay * ay);
        if (aMag > maxAcceleration) {
          ax *= (maxAcceleration / aMag);
          ay *= (maxAcceleration / aMag);
        }
        state.vx += ax * dt;
        state.vy += ay * dt;
        let windSpeedMs = state.wind.speed / 3.6;
        let windRad = state.wind.direction * Math.PI / 180;
        let windVx = Math.cos(windRad) * windSpeedMs;
        let windVy = Math.sin(windRad) * windSpeedMs;
        let totalVx = state.vx + windVx;
        let totalVy = state.vy + windVy;
        state.position.lat += (totalVy * dt) / 111320;
        state.position.lng += (totalVx * dt) / (111320 * Math.cos(state.position.lat * Math.PI/180));
      } else {
        // "Landing" mode
        let currentPos = state.position;
        let targetWaypoint = state.route[state.route.length - 1];
        let desiredBearing = Math.atan2(targetWaypoint.lat - currentPos.lat, targetWaypoint.lng - currentPos.lng);
        let desiredVx = Math.cos(desiredBearing) * state.horizontalSpeed;
        let desiredVy = Math.sin(desiredBearing) * state.horizontalSpeed;
        let ax = desiredVx - state.vx;
        let ay = desiredVy - state.vy;
        let aMag = Math.sqrt(ax * ax + ay * ay);
        if (aMag > maxAcceleration) {
          ax *= (maxAcceleration / aMag);
          ay *= (maxAcceleration / aMag);
        }
        state.vx += ax * dt;
        state.vy += ay * dt;
        let windSpeedMs = state.wind.speed / 3.6;
        let windRad = state.wind.direction * Math.PI / 180;
        let windVx = Math.cos(windRad) * windSpeedMs;
        let windVy = Math.sin(windRad) * windSpeedMs;
        let totalVx = state.vx + windVx;
        let totalVy = state.vy + windVy;
        state.position.lat += (totalVy * dt) / 111320;
        state.position.lng += (totalVx * dt) / (111320 * Math.cos(state.position.lat * Math.PI/180));
      }
    }

    // Vertical control
    if (state.mode === "takeOff") {
      if (state.altitude < 1) {
        state.targetAltitude = state.cruiseAltitude;
      }
      if (state.altitude >= state.cruiseAltitude * 0.95) {
        state.mode = "cruise";
        altErrorIntegral = 0;
        console.log("Switching to cruise mode");
      }
    } else if (state.mode === "landing") {
      state.targetAltitude = 0;
      if (state.altitude <= 1) {
        if (state.engineRPM > 8000) {
          state.crashed = true;
          console.log("Drone crashed due to high engine RPM during landing");
        } else {
          state.altitude = 0;
          state.verticalSpeed = 0;
          state.mode = "onGround";
          state.flightStarted = false;
          console.log("Drone landed, switching to onGround mode");
        }
      }
    }
    // In "cruise" mode the targetAltitude is not overwritten – it can be manually adjusted

    // Vertical control using PID and wind noise
    let altError = state.targetAltitude - state.altitude;
    altErrorIntegral += altError * dt;
    altErrorIntegral = clamp(altErrorIntegral, -maxIntegral, maxIntegral);
    let altErrorDerivative = (altError - lastAltError) / dt;
    lastAltError = altError;
    let verticalAccel = Kp_alt * altError + Ki_alt * altErrorIntegral + Kd_alt * altErrorDerivative;
    let verticalDisturbance = (Math.random() - 0.5) * 0.5 * (state.wind.speed / 10);
    verticalAccel += verticalDisturbance;
    verticalAccel = clamp(verticalAccel, -3, 3);
    state.verticalSpeed = 0.9 * state.verticalSpeed + verticalAccel * dt;
    state.altitude += state.verticalSpeed * dt;
    if (state.altitude < 0) {
      state.altitude = 0;
      state.verticalSpeed = 0;
    }

    // Emulate interference in Jam Zone with exponential amplification of disturbances
    if (state.jamZone) {
      let dJam = computeDistance(state.position, state.jamZone.center);
      if (dJam < state.jamZone.radius) {
        let expFactor = 1.5 * Math.exp((state.jamZone.radius - dJam) / state.jamZone.radius) - 1;
        if (dJam < 0.1 * state.jamZone.radius) {
          state.crashed = true;
          state.flightStarted = false;
          state.vx = 0;
          state.vy = 0;
          state.verticalSpeed = -5;
          console.log("Drone crashed in jam zone center!");
        }
        // Introduce errors in all parameters:
        state.vx += (Math.random() - 0.5) * 1.0 * expFactor;
        state.vy += (Math.random() - 0.5) * 1.0 * expFactor;
        state.verticalSpeed += (Math.random() - 0.5) * 1.0 * expFactor;
        state.altitude += (Math.random() - 0.5) * 2.0 * expFactor;
        state.position.lat += (Math.random() - 0.5) * 0.001 * expFactor;
        state.position.lng += (Math.random() - 0.5) * 0.001 * expFactor;
        state.engineRPM += (Math.random() - 0.5) * 100 * expFactor;
        // Reduce GPS quality
        state.gpsQuality = clamp(state.gpsQuality - 0.1 * expFactor, 0.1, 1);
      } else {
        state.gpsQuality = clamp(state.gpsQuality + 0.005, 0, 1);
      }
    } else {
      state.gpsQuality = clamp(state.gpsQuality + (Math.random() - 0.5) * 0.001, 0.8, 1);
    }

    // Update engine model and battery consumption
    let horizontalAccel = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
    let totalLoad = Math.abs(verticalAccel) + horizontalAccel;
    let desiredRPM = 2000 + 500 * totalLoad;
    state.engineRPM += (desiredRPM - state.engineRPM) * 0.05;
    let dischargeRate = 0.01 * totalLoad;
    state.batteryLevel -= dischargeRate * dt;
    if (state.batteryLevel < 0) state.batteryLevel = 0;
    if (state.engineRPM > 3000) {
      state.batteryTemperature += 0.01 * dt * totalLoad;
    } else {
      state.batteryTemperature -= 0.02 * dt;
    }
    state.batteryTemperature = clamp(state.batteryTemperature, 30, 60);

    let distIncrement = computeDistance(prevPos, state.position);
    state.totalDistance += distIncrement;
    if (state.flightStarted) { state.flightTime += dt; }
  }

  setInterval(() => {
    updateFlightPhysics(0.1);
    // Calculate stationSignal relative to Home (10 km = 10000 m)
    let stationSignal = 100;
    if (state.homePosition) {
      let distHome = computeDistance(state.position, state.homePosition);
      stationSignal = 100 * Math.exp(-distHome/5000);
    }

    // Formulate movement_text
    let speed = Math.sqrt(state.vx * state.vx + state.vy * state.vy + state.verticalSpeed * state.verticalSpeed);
    let course = ((Math.atan2(state.vx, state.vy) * 180/Math.PI) + 360) % 360;
    let gpsLevel = state.gpsQuality > 0.8 ? 3 : (state.gpsQuality > 0.5 ? 2 : 1);
    let satelliteCount = state.gpsQuality > 0.8 ? 10 : (state.gpsQuality > 0.5 ? 6 : 2);
    let isGPSBeingUsed = state.gpsQuality > 0.5 ? 1 : 0;
    let movement_text = "latitude=" + state.position.lat.toFixed(6) +
                        ", longitude=" + state.position.lng.toFixed(6) +
                        ", altitude_GPS=" + state.altitude.toFixed(1) +
                        ", altitude_Baro=" + (state.altitude - 3).toFixed(1) +
                        ", velocity_x=" + state.vx.toFixed(2) +
                        ", velocity_y=" + state.vy.toFixed(2) +
                        ", velocity_z=" + state.verticalSpeed.toFixed(2) +
                        ", speed=" + speed.toFixed(2) +
                        ", course=" + course.toFixed(2) +
                        ", GPSSignalLevel=" + gpsLevel +
                        ", satelliteCount=" + satelliteCount +
                        ", isGPSBeingUsed=" + isGPSBeingUsed;

    // Formulate internal_text
    let batteryVoltage = 12.6 - (100 - state.batteryLevel) * 0.015;
    function horizontalAccel() {
      return Math.sqrt(state.vx*state.vx + state.vy*state.vy);
    }
    let batteryCurrent = 5 + horizontalAccel();
    let internal_text = "battery_voltage=" + batteryVoltage.toFixed(2) +
                        ", battery_current=" + batteryCurrent.toFixed(2) +
                        ", battery_temperature=" + state.batteryTemperature.toFixed(1) +
                        ", chargeRemainingInPercent=" + state.batteryLevel.toFixed(1) +
                        ", uplinkSignalQuality=" + (100 * Math.exp(-computeDistance(state.position, state.homePosition || state.position)/5000)).toFixed(0) +
                        ", isFailsafeEnabled=0";

    // Formulate dynamics_text
    let yaw = course;
    let pitch = 0;
    let roll = 0;
    let gyro_x = (pitch + (Math.random()*0.1 - 0.05)).toFixed(2);
    let gyro_y = (roll + (Math.random()*0.1 - 0.05)).toFixed(2);
    let gyro_z = (yaw + (Math.random()*0.1 - 0.05)).toFixed(2);
    let accel_x = (state.vx * 0.5).toFixed(2);
    let accel_y = (state.vy * 0.5).toFixed(2);
    let accel_z = (state.verticalSpeed * 0.1).toFixed(2);
    let dynamics_text = "gyro_x=" + gyro_x +
                        ", gyro_y=" + gyro_y +
                        ", gyro_z=" + gyro_z +
                        ", accel_x=" + accel_x +
                        ", accel_y=" + accel_y +
                        ", accel_z=" + accel_z +
                        ", pitch=" + pitch.toFixed(2) +
                        ", roll=" + roll.toFixed(2) +
                        ", yaw=" + yaw.toFixed(2) +
                        ", windWarning=" + (state.wind.speed > 20 ? "STRONG" : "OK");

    window.DroneSender.sendFlightData({
      position: state.position,
      altitude: state.altitude,
      verticalSpeed: state.verticalSpeed,
      engineRPM: state.engineRPM,
      batteryLevel: state.batteryLevel,
      batteryTemperature: state.batteryTemperature,
      flightTime: state.flightTime,
      totalDistance: state.totalDistance,
      stationSignal: stationSignal.toFixed(0) + "%",
      gpsSignal: state.gpsQuality > 0.8 ? "Good" : (state.gpsQuality > 0.5 ? "Fair" : "Poor"),
      satellites: satelliteCount,
      coordinates: `(${state.position.lat.toFixed(6)}, ${state.position.lng.toFixed(6)})`,
      movement_text: movement_text,
      internal_text: internal_text,
      dynamics_text: dynamics_text
    });
  }, 500);

  window.FlightEmulation = {
    state: state,
    startFlight: function(){
      if (state.route.length < 2) return;
      state.route = filterRoute(state.route);
      if (!state.flightStarted) {
        state.position = { ...state.route[0] };
        state.vx = 0;
        state.vy = 0;
        state.waypointIndex = 1;
        state.flightTime = 0;
        state.totalDistance = 0;
        if (!state.homePosition) { state.homePosition = { ...state.route[0] }; }
        state.mode = "takeOff";
        state.crashed = false;
      }
      altErrorIntegral = 0;
      lastAltError = state.targetAltitude - state.altitude;
      state.flightStarted = true;
      state.hoverMode = false;
      console.log("Flight started, mode:", state.mode);
    },
    stopFlight: function(){
      state.flightStarted = false;
      state.route = [];
      state.waypointIndex = 0;
      console.log("Flight stopped");
    },
    setRoute: function(route){
      state.route = filterRoute(route);
      state.waypointIndex = 0;
      console.log("Route set:", state.route);
    },
    setHome: function(){
      state.homePosition = { ...state.position };
      console.log("Home set:", state.homePosition);
    },
    takeOff: function(){
      if (state.flightStarted) {
         alert("Drone already in flight");
         return;
      }
      state.altitude = 0;
      state.targetAltitude = state.cruiseAltitude = 100;
      state.mode = "takeOff";
      state.flightStarted = true;
      state.hoverMode = false;
      altErrorIntegral = 0;
      lastAltError = state.targetAltitude - state.altitude;
      console.log("Take Off initiated, mode:", state.mode);
    },
    land: function(){
      if (!state.flightStarted) {
         alert("Drone is not in flight");
         return;
      }
      state.mode = "landing";
      state.targetAltitude = 0;
      state.hoverMode = false;
      console.log("Landing initiated, mode:", state.mode);
    },
    hover: function(){
      if (!state.flightStarted) return;
      state.hoverMode = true;
      console.log("Hover mode activated");
    },
    updateParameters: function(params){
      if (params.speed) { state.horizontalSpeed = parseFloat(params.speed) / 3.6; }
      if (params.time_multiplier) { state.timeMultiplier = parseFloat(params.time_multiplier); }
      if (params.fullFlightTime) { state.fullFlightTime = parseInt(params.fullFlightTime); }
      if (params.altStability) { state.altStability = parseFloat(params.altStability); }
      console.log("Updated parameters:", params);
    },
    updateWind: function(params) {
      state.wind.speed = parseFloat(params.windSpeed) || 0;
      state.wind.direction = parseFloat(params.windDirection) || 0;
      console.log("Updated wind:", state.wind);
    },
    setJamZone: function(jamZoneInfo) {
      state.jamZone = jamZoneInfo;
      console.log("Jam zone set:", state.jamZone);
    },
    clearJamZone: function() {
      state.jamZone = null;
      console.log("Jam zone cleared");
    },
    setRepeat: function(val){
      state.repeatMission = val;
      console.log("Repeat Mission set to:", val);
    }
  };
})();
