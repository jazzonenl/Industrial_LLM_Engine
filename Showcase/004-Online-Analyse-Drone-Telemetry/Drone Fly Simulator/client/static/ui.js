/*
 * Drone Fly_Simulator made within testing Industrial LLM-Engine
 * https://github.com/jazzonenl/Industrial_LLM_Engine
 *
 * This script provides the user interface for the drone flight simulator.
 * It uses Leaflet to display a map, manage waypoints, show the drone's current
 * position, and visualize flight parameters. The UI allows the user to:
 *   - Set and modify the drone's flight route by clicking on the map.
 *   - Display and update system information (position, altitude, speed, battery, etc.).
 *   - Configure flight parameters such as speed, time multiplier, full flight time, and altitude stability.
 *   - Control wind settings and simulate interference using a Jam Zone.
 *   - Issue manual commands to adjust the drone's position and altitude.
 *   - Copy system information to the clipboard.
 *
 * The interface works in tandem with the flight emulation module to visualize the drone's behavior.
 * Initial map coordinates are set to a location in Asia (Tokyo, Japan).
 */

(function(){
  // Set initial map view to Tokyo, Japan (latitude: 35.6895, longitude: 139.6917)
  const map = L.map("map").setView([35.6895, 139.6917], 14);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

  let droneMarker = L.marker([35.6895,139.6917]).addTo(map);
  let homeMarker = null;
  let crashMarker = null; // Marker for crash (CRASH)
  let route = [];
  let markersRoute = [];  // Circles for route waypoints
  let plannedRoutePolyline = L.polyline([], { color:"gray", dashArray:"5,10" }).addTo(map);
  // Flight path polyline: by default blue, but if drone enters Jam Zone – it turns red
  let flightPathPolyline = L.polyline([], { color:"blue" }).addTo(map);
  let jamZone = null;
  let isDrawingJamZone = false;
  let jamZoneCenter = null;

  // Function to compute distance between two points (copy from flight_emulation.js)
  function computeDistance(a, b) {
    const R = 6371000;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLon = (b.lng - a.lng) * Math.PI / 180;
    const lat1 = a.lat * Math.PI / 180;
    const lat2 = b.lat * Math.PI / 180;
    const A = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(A), Math.sqrt(1-A));
  }

  // Logs commands and messages to the UI log element
  function logCommand(msg) {
    const logDiv = document.getElementById("commandLog");
    const timeStr = new Date().toLocaleTimeString();
    logDiv.innerText += `${timeStr}: ${msg}\n`;
    const lines = logDiv.innerText.split("\n");
    if (lines.length > 40) { logDiv.innerText = lines.slice(lines.length - 40).join("\n"); }
  }

  // Draw Home marker on the map when set
  function updateHomeMarker() {
    let s = window.FlightEmulation.state;
    if (s.homePosition && !homeMarker) {
      homeMarker = L.circleMarker(s.homePosition, {
        radius: 10,
        color: "#008000",
        fillColor: "#32CD32",
        fillOpacity: 0.8
      })
      .bindTooltip("HOME", { permanent: true, direction: "right" })
      .addTo(map);
    }
  }
  setInterval(updateHomeMarker, 100);

  // Draw crash marker (CRASH) when the drone is in an emergency state
  function updateCrashMarker() {
    let s = window.FlightEmulation.state;
    if (s.crashed) {
      if (!crashMarker) {
        crashMarker = L.circleMarker(s.position, {
          radius: 10,
          color: "red",
          fillColor: "red",
          fillOpacity: 1
        })
        .bindTooltip("CRASH", { permanent: true, direction: "right" })
        .addTo(map);
      } else {
        crashMarker.setLatLng(s.position);
      }
    } else {
      if (crashMarker) {
        map.removeLayer(crashMarker);
        crashMarker = null;
      }
    }
  }
  setInterval(updateCrashMarker, 100);

  // Update system info panel with current flight data
  function updateSystemInfo() {
    let s = window.FlightEmulation.state;
    let info = {
      flightStarted: s.flightStarted,
      mode: s.mode,
      crashed: s.crashed,
      waypointIndex: s.waypointIndex,
      routeLength: s.route.length,
      route: s.route,
      currentPosition: s.position,
      altitude: s.altitude.toFixed(4),
      targetAltitude: s.targetAltitude,
      verticalSpeed: s.verticalSpeed.toFixed(4),
      vx: s.vx.toFixed(4),
      vy: s.vy.toFixed(4),
      desiredSpeed: s.desiredSpeed ? s.desiredSpeed.toFixed(4) : "N/A",
      engineRPM: s.engineRPM ? s.engineRPM.toFixed(0) : "N/A",
      batteryLevel: s.batteryLevel ? s.batteryLevel.toFixed(1) : "N/A",
      batteryTemperature: s.batteryTemperature ? s.batteryTemperature.toFixed(1) : "N/A",
      flightTime: s.flightTime ? Math.floor(s.flightTime) + " sec" : "0 sec",
      totalDistance: s.totalDistance ? s.totalDistance.toFixed(1) + " m" : "0.0 m",
      stationSignal: 100,
      wind: s.wind
    };
    let infoText = "";
    for (let key in info) {
      infoText += `${key}: ${JSON.stringify(info[key])}\n`;
    }
    document.getElementById("systemInfo").innerText = infoText;
  }
  setInterval(updateSystemInfo, 100);

  // Copy system info to clipboard
  document.getElementById("copySystemInfo").addEventListener("click", function(){
    const sysInfo = document.getElementById("systemInfo").innerText;
    navigator.clipboard.writeText(sysInfo).then(() => { alert("System information copied to clipboard!"); },
      () => { alert("Failed to copy system information."); });
  });

  // --- Flight Parameters Panel ---
  const speedSlider = document.getElementById("speed");
  const speedValue = document.getElementById("speed_value");
  const multiplierSlider = document.getElementById("multiplier");
  const multiplierValue = document.getElementById("multiplier_value");
  const fullFlightTimeSlider = document.getElementById("fullFlightTime");
  const fullFlightTimeValue = document.getElementById("fullFlightTime_value");
  const altStabilitySlider = document.getElementById("altStability");
  const altStabilityValue = document.getElementById("altStability_value");

  speedSlider.addEventListener("input", function(){
    speedValue.innerText = this.value;
    window.FlightEmulation.updateParameters({ speed: this.value });
    logCommand(`Flight Parameters: Speed set to ${this.value} km/h`);
  });
  multiplierSlider.addEventListener("input", function(){
    multiplierValue.innerText = this.value;
    window.FlightEmulation.updateParameters({ time_multiplier: this.value });
    logCommand(`Flight Parameters: Time Multiplier set to ${this.value}`);
  });
  fullFlightTimeSlider.addEventListener("input", function(){
    fullFlightTimeValue.innerText = this.value;
    window.FlightEmulation.updateParameters({ fullFlightTime: this.value });
    logCommand(`Flight Parameters: Full Flight Time set to ${this.value} min`);
  });
  altStabilitySlider.addEventListener("input", function(){
    altStabilityValue.innerText = this.value;
    window.FlightEmulation.updateParameters({ altStability: this.value });
    logCommand(`Flight Parameters: Altitude Stability set to ${this.value}`);
  });

  // --- Wind & Jam Panel ---
  const windSpeedSlider = document.getElementById("windSpeed");
  const windSpeedValue = document.getElementById("windSpeed_value");
  windSpeedSlider.addEventListener("input", function(){
    windSpeedValue.innerText = this.value;
    window.FlightEmulation.updateWind({
       windSpeed: this.value,
       windDirection: document.querySelector('input[name="windDirection"]:checked').value
    });
    logCommand(`Wind: Speed set to ${this.value} km/h`);
  });
  document.querySelectorAll('input[name="windDirection"]').forEach(input => {
    input.addEventListener("change", function(){
      window.FlightEmulation.updateWind({
         windSpeed: windSpeedSlider.value,
         windDirection: this.value
      });
      logCommand(`Wind: Direction set to ${this.value}°`);
    });
  });
  const drawJamZoneBtn = document.getElementById("drawJamZone");
  drawJamZoneBtn.addEventListener("click", function(){
    isDrawingJamZone = !isDrawingJamZone;
    if (isDrawingJamZone) {
      drawJamZoneBtn.classList.add("active");
      logCommand("Jam Zone mode activated: click for center, then radius.");
    } else {
      drawJamZoneBtn.classList.remove("active");
      logCommand("Jam Zone mode deactivated.");
    }
  });

  // --- Map click handling ---
  map.on("click", function(e){
    if (isDrawingJamZone) {
      if (!jamZoneCenter) {
        jamZoneCenter = e.latlng;
        logCommand("Jam Zone center set. Click again to set radius.");
      } else {
        let radius = map.distance(jamZoneCenter, e.latlng);
        if (jamZone) map.removeLayer(jamZone);
        // Draw the Jam Zone circle in red
        jamZone = L.circle(jamZoneCenter, {
          radius: radius,
          color: "#FF0000",
          weight: 2,
          fillColor: "#FF0000",
          fillOpacity: 0.5
        }).addTo(map);
        logCommand(`Jam Zone created with radius ${radius.toFixed(1)} m`);
        window.FlightEmulation.setJamZone({ center: jamZoneCenter, radius: radius });
        jamZoneCenter = null;
        isDrawingJamZone = false;
        drawJamZoneBtn.classList.remove("active");
      }
      return;
    }
    if (window.FlightEmulation.state.flightStarted) return;
    let circle = L.circle(e.latlng, {
      radius: 10,
      color: "red",
      fillColor: "red",
      fillOpacity: 0.8
    }).addTo(map);
    markersRoute.push(circle);
    route.push(e.latlng);
    plannedRoutePolyline.setLatLngs(route);
    logCommand(`Route: Added waypoint at (${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)})`);
  });

  // --- Flight Control Panel ---
  document.getElementById("startFlight").onclick = function(){
    if (route.length < 2) {
      alert("Please set at least 2 waypoints for the route");
      return;
    }
    window.FlightEmulation.setRoute(route);
    window.FlightEmulation.startFlight();
    flightPathPolyline.setLatLngs([]);
    logCommand("Flight Control: Start Flight pressed");
  };

  document.getElementById("cancelFlight").onclick = function(){
    window.FlightEmulation.stopFlight();
    route = [];
    markersRoute.forEach(m => map.removeLayer(m));
    markersRoute = [];
    plannedRoutePolyline.setLatLngs([]);
    flightPathPolyline.setLatLngs([]);
    logCommand("Flight Control: Cancel Flight pressed");
  };

  document.getElementById("setHome").onclick = function(){
    let pos = window.FlightEmulation.state.position;
    window.FlightEmulation.setHome();
    if (homeMarker) map.removeLayer(homeMarker);
    homeMarker = L.circleMarker(pos, { radius: 10, color: "#008000", fillColor: "#32CD32", fillOpacity: 0.8 })
                 .bindTooltip("HOME", { permanent: true, direction: "right" })
                 .addTo(map);
    logCommand("Flight Control: Set Home pressed");
  };

  document.getElementById("returnHome").onclick = function(){
    if (!window.FlightEmulation.state.homePosition) {
      alert("Please set Home first");
      return;
    }
    let currentPos = { ...window.FlightEmulation.state.position };
    window.FlightEmulation.setRoute([currentPos, window.FlightEmulation.state.homePosition]);
    window.FlightEmulation.startFlight();
    flightPathPolyline.setLatLngs([]);
    logCommand("Flight Control: Return Home pressed");
  };

  document.getElementById("resetBtn").onclick = function(){
    window.FlightEmulation.stopFlight();
    route = [];
    markersRoute.forEach(m => map.removeLayer(m));
    markersRoute = [];
    plannedRoutePolyline.setLatLngs([]);
    flightPathPolyline.setLatLngs([]);
    if (homeMarker) { map.removeLayer(homeMarker); homeMarker = null; }
    if (jamZone) { map.removeLayer(jamZone); jamZone = null; }
    if (crashMarker) { map.removeLayer(crashMarker); crashMarker = null; }
    map.setView([35.6895,139.6917], 14);
    droneMarker.setLatLng([35.6895,139.6917]);
    let s = window.FlightEmulation.state;
    s.position = { lat: 35.6895, lng: 139.6917 };
    s.altitude = 0;
    s.targetAltitude = 0;
    s.verticalSpeed = 0;
    s.homePosition = null;
    s.flightStarted = false;
    s.route = [];
    s.waypointIndex = 0;
    s.horizontalSpeed = parseFloat(speedSlider.value) / 3.6;
    s.timeMultiplier = parseFloat(multiplierSlider.value);
    s.fullFlightTime = parseInt(fullFlightTimeSlider.value);
    s.altStability = parseFloat(altStabilitySlider.value);
    s.hoverMode = false;
    s.crashed = false;
    flightPathPolyline.setLatLngs([]);
    logCommand("Flight Control: Reset pressed");
  };

  // --- Manual Control Panel ---
  document.getElementById("north").onclick = function(){
    window.FlightEmulation.state.position.lat += 0.0001;
    logCommand("Manual Control: North pressed");
  };
  document.getElementById("south").onclick = function(){
    window.FlightEmulation.state.position.lat -= 0.0001;
    logCommand("Manual Control: South pressed");
  };
  document.getElementById("east").onclick = function(){
    window.FlightEmulation.state.position.lng += 0.0001;
    logCommand("Manual Control: East pressed");
  };
  document.getElementById("west").onclick = function(){
    window.FlightEmulation.state.position.lng -= 0.0001;
    logCommand("Manual Control: West pressed");
  };
  // Altitude adjustment buttons
  document.getElementById("altUp").onclick = function(){
    window.FlightEmulation.state.targetAltitude += 5;
    logCommand("Manual Control: Increase Altitude pressed (Target: " + window.FlightEmulation.state.targetAltitude + " m)");
  };
  document.getElementById("altDown").onclick = function(){
    window.FlightEmulation.state.targetAltitude = Math.max(0, window.FlightEmulation.state.targetAltitude - 5);
    logCommand("Manual Control: Decrease Altitude pressed (Target: " + window.FlightEmulation.state.targetAltitude + " m)");
  };

  setInterval(function(){
    let s = window.FlightEmulation.state;
    let pos = s.position;
    if (pos) {
      droneMarker.setLatLng(pos);
      // If the drone is inside the Jam Zone, the flight path is drawn red, otherwise blue
      if (s.jamZone && computeDistance(pos, s.jamZone.center) < s.jamZone.radius) {
        flightPathPolyline.setStyle({ color: "blue" });
      } else {
        flightPathPolyline.setStyle({ color: "blue" });
      }
      if (s.flightStarted) {
        flightPathPolyline.addLatLng(pos);
        // Bring the flight path to the front
        flightPathPolyline.bringToFront();
      }
    }
    // Update waypoint markers: completed ones turn green
    let currentIndex = s.waypointIndex;
    markersRoute.forEach((circle, idx) => {
      if (idx < currentIndex) {
        circle.setStyle({ color: "green", fillColor: "green" });
      } else {
        circle.setStyle({ color: "red", fillColor: "red" });
      }
    });
  }, 100);

  function updateDroneData(){
    let s = window.FlightEmulation.state;
    let dynamicSpeed = Math.sqrt(s.vx * s.vx + s.vy * s.vy) * 3.6;
    document.getElementById("dataSpeed").innerText = dynamicSpeed.toFixed(2) + " km/h";
    document.getElementById("dataAltitude").innerText = s.altitude.toFixed(1) + " m";
    document.getElementById("dataTargetAltitude").innerText = s.targetAltitude + " m";
    document.getElementById("dataBattery").innerText = `${s.batteryLevel.toFixed(1)}%, ${s.batteryTemperature.toFixed(1)}°C`;
    // Dynamically update stationSignal based on distance to Home (if set)
    let stationSignal = "100%";
    if (s.homePosition) {
      let distHome = computeDistance(s.position, s.homePosition);
      stationSignal = (100 * Math.exp(-distHome/5000)).toFixed(0) + "%";
    }
    document.getElementById("dataSignal").innerText = stationSignal;
    document.getElementById("dataGPSSignal").innerText = (s.gpsQuality > 0.8) ? "Good" : ((s.gpsQuality > 0.5) ? "Fair" : "Poor");
    document.getElementById("dataSatellites").innerText = (s.gpsQuality > 0.8) ? "10" : ((s.gpsQuality > 0.5) ? "6" : "2");
    document.getElementById("dataRPM").innerText = s.engineRPM ? s.engineRPM.toFixed(0) : "N/A";
    document.getElementById("dataTime").innerText = s.flightTime ? Math.floor(s.flightTime) + " sec" : "0 sec";
    document.getElementById("dataDistance").innerText = s.totalDistance ? s.totalDistance.toFixed(1) + " m" : "0.0 m";
    document.getElementById("dataCoords").innerText = `(${s.position.lat.toFixed(6)}, ${s.position.lng.toFixed(6)})`;
    if (s.altitude === 0 && !s.flightStarted) {
      document.getElementById("dataStatus").innerText = s.crashed ? "CRASHED" : "LANDED";
    } else {
      document.getElementById("dataStatus").innerText = "FLYING";
    }
  }
  setInterval(updateDroneData, 500);

  function updateParameters() {
    socket.emit("update_parameters", { speed: speedSlider.value, time_multiplier: multiplierSlider.value });
  }

  socket.on("connect", () => console.log("Connected to server"));
  socket.on("disconnect", () => console.log("Disconnected from server"));
})();
