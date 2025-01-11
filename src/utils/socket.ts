import { Server as SocketIOServer } from 'socket.io';
import { Server as NetServer } from 'http';
import { db } from '../services/database';

interface Player {
  id: string;
  name: string;
  score: number;
}

interface GameState {
  currentWord: string;
  timeLeft: number;
  roundNumber: number;
  totalRounds: number;
  drawer: string | null;
  isDrawing: boolean;
}

interface Room {
  id: string;
  code: string;
  name: string;
  players: Player[];
  gameState: GameState;
  host: string;
  settings: {
    totalRounds: number;
  };
  timer: NodeJS.Timeout | null;
}

const DEBUG = true;

const log = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args);
  }
};

const words = [
  'apple', 'banana', 'cat', 'dog', 'elephant',
  'fish', 'giraffe', 'house', 'ice cream', 'jungle',
  // Add more words here
];

const createGameState = (drawer: string, word: string, roundNumber: number, totalRounds: number): GameState => ({
  currentWord: word,
  timeLeft: 60,
  roundNumber,
  totalRounds,
  drawer,
  isDrawing: false
});

const getPlayerGameState = (gameState: GameState, playerId: string): GameState => ({
  ...gameState,
  isDrawing: gameState.drawer === playerId,
  currentWord: gameState.drawer === playerId ? gameState.currentWord : '_ '.repeat(gameState.currentWord.length)
});

export function initSocket(server: NetServer) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const rooms = new Map<string, Room>();

  const loadRoomState = async (roomCode: string): Promise<Room | undefined> => {
    try {
      const dbRoom = await db.getRoomByCode(roomCode);
      if (!dbRoom) return undefined;

      const room: Room = {
        id: dbRoom.id,
        code: roomCode,
        name: dbRoom.name,
        players: dbRoom.players.map((p: { id: string; name: string; score: number; isHost: boolean }) => ({
          id: p.id,
          name: p.name,
          score: p.score
        })),
        gameState: {
          currentWord: '',
          timeLeft: 60,
          roundNumber: 1,
          totalRounds: dbRoom.rounds,
          drawer: null,
          isDrawing: false
        },
        host: dbRoom.players.find((p: { isHost: boolean }) => p.isHost)?.id || '',
        settings: {
          totalRounds: dbRoom.rounds
        },
        timer: null
      };

      return room;
    } catch (error) {
      console.error('Error loading room state:', error);
      return undefined;
    }
  };

  const joinRoom = async (socket: any, roomCode: string, playerId: string, playerName: string): Promise<Room | undefined> => {
    try {
      let room = rooms.get(roomCode);
      
      if (!room) {
        room = await loadRoomState(roomCode);
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return undefined;
        }
        rooms.set(roomCode, room);
      }

      // Check if player already exists in room
      const existingPlayerIndex = room.players.findIndex(p => p.id === playerId);
      if (existingPlayerIndex === -1) {
        // Add new player if they don't exist
        room.players.push({
          id: playerId,
          name: playerName,
          score: 0
        });
      } else {
        // Update existing player's socket
        room.players[existingPlayerIndex].name = playerName;
      }

      // Join socket room
      socket.join(roomCode);
      
      // Update socket ID in database
      await db.updatePlayer(playerId, { socketId: socket.id });

      // Emit updated players list to all clients in the room
      io.to(roomCode).emit('players', room.players);
      
      return room;
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
      return undefined;
    }
  };

  const selectNewWord = () => {
    return words[Math.floor(Math.random() * words.length)];
  };

  const updateTimer = (room: Room) => {
    // Clear existing timer if any
    if (room.timer) {
      clearInterval(room.timer);
    }

    // Reset time
    room.gameState.timeLeft = 60;

    // Create new timer
    room.timer = setInterval(() => {
      // Decrement time
      room.gameState.timeLeft--;

      // Broadcast time update to all players in the room using roomCode
      io.to(room.code).emit('gameState', {
        ...room.gameState,
        timeLeft: room.gameState.timeLeft
      });

      console.log('Timer update:', { 
        roomCode: room.code, 
        timeLeft: room.gameState.timeLeft 
      });

      // Check if time's up
      if (room.gameState.timeLeft <= 0) {
        clearInterval(room.timer!);
        room.timer = null;
        nextTurn(room);
      }
    }, 1000);
  };

  const nextTurn = async (room: Room) => {
    if (room.players.length === 0) return;

    // Clear any existing timer
    if (room.timer) {
      clearInterval(room.timer);
      room.timer = null;
    }

    const currentIndex = room.gameState.drawer
      ? room.players.findIndex(p => p.id === room.gameState.drawer)
      : -1;
    const nextIndex = (currentIndex + 1) % room.players.length;

    // Check if we're starting a new round
    if (nextIndex === 0) {
      room.gameState.roundNumber++;
      // Notify about new round
      io.to(room.code).emit('roundChange', {
        roundNumber: room.gameState.roundNumber,
        totalRounds: room.settings.totalRounds
      });
    }

    // Check if game is over
    if (room.gameState.roundNumber > room.settings.totalRounds) {
      // Sort players by score
      const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
      const winner = sortedPlayers[0];
      
      // Emit game over event with final scores
      io.to(room.code).emit('gameOver', {
        winner,
        finalScores: sortedPlayers.map(p => ({
          name: p.name,
          score: p.score
        }))
      });

      // Reset room state but keep players
      room.gameState = {
        currentWord: '',
        timeLeft: 60,
        roundNumber: 1,
        totalRounds: room.settings.totalRounds,
        drawer: null,
        isDrawing: false
      };
      return;
    }

    // Set up next turn
    const nextDrawer = room.players[nextIndex];
    const nextWord = selectNewWord();

    // Update game state
    room.gameState = {
      ...room.gameState,
      drawer: nextDrawer.id,
      currentWord: nextWord,
      timeLeft: 60
    };

    // Notify all players
    io.to(room.code).emit('gameStarted', {
      drawer: nextDrawer.id,
      drawerName: nextDrawer.name,
      word: nextWord,
      roundNumber: room.gameState.roundNumber,
      totalRounds: room.settings.totalRounds,
      timeLeft: 60
    });

    // Start the timer for the new turn
    updateTimer(room);
  };

  io.on('connection', (socket) => {
    console.log('New socket connection:', socket.id);

    socket.on('joinGame', async ({ roomCode, playerId, playerName, isHost }) => {
      try {
        const room = await joinRoom(socket, roomCode, playerId, playerName);
        if (!room) return;

        // Emit current game state if game is in progress
        if (room.gameState.drawer) {
          const playerState = getPlayerGameState(room.gameState, playerId);
          socket.emit('gameState', playerState);
        }

        // Emit current players to all clients in the room
        io.to(roomCode).emit('playerList', room.players);
        
        console.log(`Player ${playerName} joined room ${roomCode}`);
      } catch (error) {
        console.error('Error in joinGame:', error);
        socket.emit('error', { message: 'Failed to join game' });
      }
    });

    socket.on('guess', async ({ roomCode, message, playerId }) => {
      try {
        const room = rooms.get(roomCode);
        if (!room) {
          console.error('Room not found for guess:', roomCode);
          return;
        }

        // Get the player who made the guess
        const guesser = room.players.find(p => p.id === playerId);
        if (!guesser) {
          console.error('Player not found:', playerId);
          return;
        }

        // Don't process guesses from the drawer
        if (playerId === room.gameState.drawer) {
          // Broadcast message as normal chat
          io.to(roomCode).emit('message', {
            type: 'chat',
            player: guesser.name,
            content: message,
            isDrawer: true
          });
          return;
        }

        console.log('Processing guess:', {
          roomCode,
          guesser: guesser.name,
          word: room.gameState.currentWord,
          guess: message
        });

        // Check if the guess is correct
        if (message.toLowerCase().trim() === room.gameState.currentWord.toLowerCase().trim()) {
          console.log('Correct guess by:', guesser.name);
          
          // Find the drawer
          const drawer = room.players.find(p => p.id === room.gameState.drawer);
          if (!drawer) return;

          // Calculate points
          const timeBonus = Math.floor(room.gameState.timeLeft / 10);
          guesser.score += 2 + timeBonus; // Base points + time bonus
          drawer.score += 1; // Points for the drawer

          // Broadcast correct guess event
          io.to(roomCode).emit('correctGuess', {
            guesser: guesser.name,
            word: room.gameState.currentWord,
            timeBonus
          });

          // Update player scores
          io.to(roomCode).emit('playerList', room.players);

          // Move to next turn
          nextTurn(room);
        } else {
          // Broadcast as normal chat message
          io.to(roomCode).emit('message', {
            type: 'chat',
            player: guesser.name,
            content: message,
            isDrawer: false
          });
        }
      } catch (error) {
        console.error('Error handling guess:', error);
      }
    });

    socket.on('disconnect', async () => {
      try {
        // Update the player's socket ID to null in the database
        const player = await db.getPlayerBySocketId(socket.id);
        if (player) {
          await db.updatePlayerSocket(player.id, null);
        }

        // Handle room cleanup
        for (const [roomCode, room] of rooms.entries()) {
          const playerIndex = room.players.findIndex(p => p.id === (player?.id || socket.id));
          if (playerIndex !== -1) {
            // Remove player from room
            room.players.splice(playerIndex, 1);
            
            // Emit updated players list
            io.to(roomCode).emit('players', room.players);

            // Handle drawer disconnection
            if (room.gameState.drawer === player?.id) {
              nextTurn(room);
            }

            // Handle empty room or host disconnection
            if (room.players.length === 0) {
              if (room.timer) clearInterval(room.timer);
              rooms.delete(roomCode);
            } else if (room.host === player?.id) {
              room.host = room.players[0].id;
              io.to(roomCode).emit('newHost', { hostId: room.host });
            }
            }
          }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });

    socket.on('getPlayerStats', async ({ playerId }) => {
      try {
        const stats = await db.getPlayerStats(playerId);
        socket.emit('playerStats', stats);
      } catch (error) {
        socket.emit('error', { message: 'Failed to get player stats' });
      }
    });

    socket.on('getRoomLeaderboard', async ({ roomId }) => {
      try {
        const leaderboard = await db.getRoomLeaderboard(roomId);
        socket.emit('leaderboard', { leaderboard });
      } catch (error) {
        socket.emit('error', { message: 'Failed to get leaderboard' });
      }
    });

    socket.on('reconnect', async ({ roomCode, playerId }) => {
      try {
        const room = rooms.get(roomCode) || await loadRoomState(roomCode);
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Update player's socket ID
        await db.updatePlayer(playerId, { socketId: socket.id });

        socket.join(roomCode);
        socket.emit('gameState', room.gameState);
        io.to(roomCode).emit('players', room.players);
      } catch (error) {
        socket.emit('error', { message: 'Failed to reconnect' });
      }
    });

    socket.on('startGame', async ({ roomCode, playerId }, callback) => {
      try {
        console.log('Start game request received:', { roomCode, playerId });
        const room = rooms.get(roomCode);
        
        if (!room) {
          callback({ status: 'error', message: 'Room not found' });
          return;
        }

        // Validate host status
        if (room.host !== playerId) {
          callback({ status: 'error', message: 'Only the host can start the game' });
          return;
        }

        // Validate player count
        if (room.players.length < 2) {
          callback({ status: 'error', message: 'Need at least 2 players to start' });
          return;
        }

        // Select first drawer and word
        const firstDrawer = room.players[0].id;
        const firstWord = selectNewWord();

        // Update room's game state
        room.gameState = createGameState(firstDrawer, firstWord, 1, room.settings.totalRounds);

        // Notify all players that game has started
        io.to(roomCode).emit('gameStarted', {
          drawer: firstDrawer,
          word: firstWord,
          roundNumber: 1,
          totalRounds: room.settings.totalRounds,
          timeLeft: 60
        });

        callback({ status: 'ok' });

        // Start the timer
        updateTimer(room);
      } catch (error) {
        console.error('Error starting game:', error);
        callback({ status: 'error', message: 'Failed to start game' });
      }
    });

    // Update the draw event handler
    socket.on('draw', async ({ x, y, color, brushSize, type, roomId, roomCode }) => {
      try {
        // Try to find room by both roomId and roomCode
        const room = rooms.get(roomCode) || Array.from(rooms.values()).find(r => r.id === roomId);
        if (!room) {
          console.error('Room not found for drawing:', { roomId, roomCode });
          return;
        }

        console.log('Broadcasting draw event to room:', { roomCode, type, color });
        
        // Broadcast to the room using roomCode
        socket.to(roomCode).emit('draw', { 
          x,
          y, 
          color, 
          brushSize, 
          type 
        });
      } catch (error) {
        console.error('Error handling draw event:', error);
      }
    });

    // Add restart game handler
    socket.on('restartGame', async ({ roomCode, playerId }, callback) => {
      try {
        const room = rooms.get(roomCode);
        if (!room) {
          callback({ status: 'error', message: 'Room not found' });
          return;
        }

        if (room.host !== playerId) {
          callback({ status: 'error', message: 'Only the host can restart the game' });
          return;
        }

        // Reset scores
        room.players.forEach(player => {
          player.score = 0;
        });

        // Select first drawer and word
        const firstDrawer = room.players[0];
        const firstWord = selectNewWord();

        // Reset game state
        room.gameState = createGameState(firstDrawer.id, firstWord, 1, room.settings.totalRounds);

        // Notify all players
        io.to(roomCode).emit('gameStarted', {
          drawer: firstDrawer.id,
          drawerName: firstDrawer.name,
          word: firstWord,
          roundNumber: 1,
          totalRounds: room.settings.totalRounds,
          timeLeft: 60
        });

        // Update player list with reset scores
        io.to(roomCode).emit('playerList', room.players);

        callback({ status: 'ok' });

        // Start the timer
        updateTimer(room);
      } catch (error) {
        console.error('Error restarting game:', error);
        callback({ status: 'error', message: 'Failed to restart game' });
      }
    });
  });

  return io;
} 