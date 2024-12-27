import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { SOCKET_SERVER_PORT, ROUND_TIME, WORDS } from './config';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Game state
const users = new Map();
let currentDrawer: string | null = null;
let currentWord: string | null = null;
let gameInProgress = false;
let roundTimer: NodeJS.Timeout | null = null;
let timerInterval: NodeJS.Timeout | null = null;
let remainingTime = ROUND_TIME;

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

  // Reset previous drawer's status
  if (currentDrawer) {
    const prevDrawer = users.get(currentDrawer);
    if (prevDrawer) {
      prevDrawer.isDrawing = false;
    }
  }

  // Select new drawer
  let nextDrawerIndex = 0;
  if (currentDrawer) {
    const currentIndex = userArray.findIndex(u => u.socketId === currentDrawer);
    nextDrawerIndex = (currentIndex + 1) % userArray.length;
  }

  currentDrawer = userArray[nextDrawerIndex].socketId;
  currentWord = WORDS[Math.floor(Math.random() * WORDS.length)];
  remainingTime = ROUND_TIME;

  // Clear the canvas for everyone
  io.emit('canvas-data', { clear: true });

  // Update drawer status
  const drawer = users.get(currentDrawer);
  if (drawer) {
    drawer.isDrawing = true;
  }

  // Send word to drawer
  io.to(currentDrawer).emit('youAreDrawing', currentWord);
  
  // Tell everyone else who's drawing
  io.emit('newRound', {
    drawer: userArray[nextDrawerIndex].username,
    scores: Array.from(users.values())
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

io.on('connection', (socket) => {
  console.log('A user connected');
  
  socket.on('register', (username: string) => {
    users.set(socket.id, {
      username,
      socketId: socket.id,
      score: 0,
      isDrawing: false
    });
    
    io.emit('userList', Array.from(users.values()));
  });

  socket.on('startGame', () => {
    if (!gameInProgress) {
      gameInProgress = true;
      startNewRound();
    }
  });

  socket.on('submitGuess', (guess: string) => {
    if (gameInProgress && socket.id !== currentDrawer && currentWord) {
      if (guess.toLowerCase() === currentWord.toLowerCase()) {
        const guesser = users.get(socket.id);
        const drawer = users.get(currentDrawer);
        
        if (guesser && drawer) {
          guesser.score += 100;
          drawer.score += 50;
          
          io.emit('correctGuess', {
            guesser: guesser.username,
            word: currentWord,
            scores: Array.from(users.values())
          });
          
          setTimeout(startNewRound, 3000);
        }
      }
    }
  });

  socket.on('canvas-data', (data) => {
    socket.broadcast.emit('canvas-data', data);
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      users.delete(socket.id);
      
      if (socket.id === currentDrawer) {
        setTimeout(startNewRound, 3000);
      }
      
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
  });
});

httpServer.listen(SOCKET_SERVER_PORT, () => {
  console.log(`Socket server running on port ${SOCKET_SERVER_PORT}`);
}); 