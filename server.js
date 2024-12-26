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

// Store connected users and their current settings
const users = new Map();

// Listen for client connections
io.on('connection', (socket) => {
    console.log('A user connected');
    
    // Handle user registration
    socket.on('register', (username) => {
        users.set(socket.id, {
            username,
            color: '#000000',
            brushSize: 5,
            tool: 'brush'
        });
        
        // Broadcast updated user list to all clients
        io.emit('userList', Array.from(users.values()));
        
        // Notify others about new user
        socket.broadcast.emit('userJoined', {
            username,
            userId: socket.id
        });
    });

    // Listen for drawing data from clients
    socket.on('canvas-data', (data) => {
        // Add a small delay before broadcasting
        setTimeout(() => {
            socket.broadcast.emit('canvas-data', {
                ...data,
                userId: socket.id
            });
        }, 10);
    });
    
    // Listen for user settings updates
    socket.on('updateSettings', (settings) => {
        const user = users.get(socket.id);
        if (user) {
            users.set(socket.id, {
                ...user,
                ...settings
            });
            // Broadcast the settings update to all clients
            socket.broadcast.emit('userSettingsUpdate', {
                userId: socket.id,
                settings
            });
        }
    });
    
    // Handle client disconnection
    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            io.emit('userLeft', {
                username: user.username,
                userId: socket.id
            });
            users.delete(socket.id);
            io.emit('userList', Array.from(users.values()));
        }
        console.log('A user disconnected');
    });

    // Add this event handler in the io.on('connection', ...) block
    socket.on('cursor-move', (data) => {
        socket.broadcast.emit('cursor-move', {
            x: data.x, 
            y: data.y,
            username: users.get(socket.id)?.username,
            userId: socket.id
        });
    });
    
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
