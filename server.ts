import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { SOCKET_SERVER_PORT, ROUND_TIME, WORDS } from './config';

const app = express();
app.use(cors());

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

// ... rest of your server code ...

httpServer.listen(SOCKET_SERVER_PORT, () => {
  console.log(`Socket server running on port ${SOCKET_SERVER_PORT}`);
}); 