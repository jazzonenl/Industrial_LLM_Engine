/*
 * Drone Fly_Simulator made within testing Industrial LLM-Engine
 * https://github.com/jazzonenl/Industrial_LLM_Engine
 *
 * This file is part of the Drone Sender module.
 * It establishes a socket connection and defines methods
 * to update flight parameters and send flight data.
 */

(function() {
  // Initialize the socket connection
  const socket = io();

  // Expose DroneSender object to the global window scope
  window.DroneSender = {
    // Function to update drone parameters
    updateParameters: function(params) {
      // Emit the "update_parameters" event with the provided parameters
      socket.emit("update_parameters", params);
    },
    // Function to send flight data
    sendFlightData: function(data) {
      // Emit the "flight_data" event with the provided flight data
      socket.emit("flight_data", data);
    }
  };

  // Log when the socket connection is successfully established
  socket.on("connect", () => console.log("[DroneSender] Connected to server"));

  // Log when the socket connection is disconnected
  socket.on("disconnect", () => console.log("[DroneSender] Disconnected from server"));
})();
