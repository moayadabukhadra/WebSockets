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
let currentDrawer = null;
let currentWord = null;
let gameInProgress = false;
let roundTimer = null;
const ROUND_TIME = 60; // 60 seconds per round

// Add this near the top of server.js with other constants
const words = [
    'apple', 'banana', 'cat', 'dog', 'elephant',
    'house', 'tree', 'car', 'book', 'sun',
    'moon', 'star', 'fish', 'bird', 'flower',
    'computer', 'phone', 'chair', 'table', 'pizza'
];

// Add these variables at the top with other constants
let timerInterval = null;
let remainingTime = ROUND_TIME;

// Listen for client connections
io.on('connection', (socket) => {
    console.log('A user connected');
    
    // Handle user registration
    socket.on('register', (username) => {
        users.set(socket.id, {
            username,
            socketId: socket.id,
            color: '#000000',
            brushSize: 5,
            tool: 'brush',
            score: 0
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
            
            // If the drawer disconnects, start new round
            if (socket.id === currentDrawer) {
                setTimeout(startNewRound, 3000);
            }
            
            // If not enough players, end game
            if (users.size < 2) {
                gameInProgress = false;
                if (timerInterval) {
                    clearInterval(timerInterval);
                }
                if (roundTimer) {
                    clearTimeout(roundTimer);
                }
                io.emit('gameError', 'Not enough players to continue');
            }
            
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
    
    // Inside io.on('connection') add these new event handlers
    socket.on('startGame', () => {
        if (!gameInProgress) {
            gameInProgress = true;
            startNewRound();
        }
    });

    socket.on('submitGuess', (guess) => {
        if (gameInProgress && socket.id !== currentDrawer && currentWord) {
            if (guess.toLowerCase() === currentWord.toLowerCase()) {
                // Correct guess!
                const guesser = users.get(socket.id);
                const drawer = users.get(currentDrawer);
                
                if (guesser && drawer) {
                    // Update scores
                    guesser.score = (guesser.score || 0) + 100;
                    drawer.score = (drawer.score || 0) + 50;
                    
                    io.emit('correctGuess', {
                        guesser: guesser.username,
                        word: currentWord,
                        scores: Array.from(users.values())
                    });
                    
                    // Start new round after brief delay
                    setTimeout(startNewRound, 3000);
                }
            }
        }
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Add these helper functions at the bottom of the file
function startNewRound() {
    if (roundTimer) {
        clearTimeout(roundTimer);
    }
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    const userArray = Array.from(users.values());
    if (userArray.length < 2) {
        gameInProgress = false;
        io.emit('gameError', 'Need at least 2 players to start');
        return;
    }

    // Select new drawer
    let nextDrawerIndex = 0;
    if (currentDrawer) {
        const currentIndex = userArray.findIndex(u => u.socketId === currentDrawer);
        nextDrawerIndex = (currentIndex + 1) % userArray.length;
    }

    currentDrawer = userArray[nextDrawerIndex].socketId;
    currentWord = words[Math.floor(Math.random() * words.length)];
    remainingTime = ROUND_TIME;

    // Clear the canvas for everyone
    io.emit('canvas-data', { clear: true });

    // Send word to drawer
    io.to(currentDrawer).emit('youAreDrawing', currentWord);
    
    // Update user list to show who's drawing
    userArray[nextDrawerIndex].isDrawing = true;
    
    // Tell everyone else who's drawing
    io.emit('newRound', {
        drawer: userArray[nextDrawerIndex].username,
        scores: userArray
    });

    // Start timer updates
    timerInterval = setInterval(() => {
        remainingTime--;
        io.emit('timerUpdate', remainingTime);
        
        if (remainingTime <= 0) {
            clearInterval(timerInterval);
            io.emit('roundEnded', {
                word: currentWord,
                scores: Array.from(users.values())
            });
            setTimeout(startNewRound, 3000);
        }
    }, 1000);

    // Set round timer
    roundTimer = setTimeout(() => {
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        io.emit('roundEnded', {
            word: currentWord,
            scores: Array.from(users.values())
        });
        setTimeout(startNewRound, 3000);
    }, ROUND_TIME * 1000);
}
