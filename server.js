// server.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Listen for client connections
io.on('connection', (socket) => {
    console.log('A user connected');
  
    // Listen for drawing data from clients
    socket.on('drawing', (data) => {
      // Broadcast the drawing data to all other clients
      socket.broadcast.emit('drawing', data);
    });
  
    // Listen for clearCanvas event from a client
    socket.on('clearCanvas', () => {
      // Broadcast the clearCanvas event to all clients, including the sender
      io.emit('clearCanvas');
    });
  
    // Handle client disconnection
    socket.on('disconnect', () => {
      console.log('A user disconnected');
    });
  });
// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
