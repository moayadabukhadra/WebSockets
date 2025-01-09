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

      const currentGame = await db.getCurrentGame(dbRoom.id);

      const room: Room = {
        id: dbRoom.id,
        name: dbRoom.name,
        players: dbRoom.players.map((p: { id: string; name: string; score: number; isHost: boolean }) => ({
          id: p.id,
          name: p.name,
          score: p.score
        })),
        gameState: {
          currentWord: currentGame?.word || '',
          timeLeft: 60,
          roundNumber: currentGame?.round || 1,
          totalRounds: dbRoom.rounds,
          drawer: currentGame?.drawerId || null,
          isDrawing: false
        },
        host: dbRoom.players.find((p: { id: string; isHost: boolean }) => p.isHost)?.id || '',
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

      // Join socket room
      socket.join(roomCode);
      
      // Update socket ID in database
      await db.updatePlayer(playerId, { socketId: socket.id });
      
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

      // Broadcast updated time to all players
      room.players.forEach(player => {
        const playerState = getPlayerGameState(room.gameState, player.id);
        io.to(player.id).emit('gameState', playerState);
      });

      // Check if time's up
      if (room.gameState.timeLeft <= 0) {
        clearInterval(room.timer!);
        room.timer = null;
        
        // Move to next turn
        nextTurn(room);
      }
    }, 1000);
  };

  const nextTurn = async (room: Room) => {
    if (room.players.length === 0) return;

    const currentIndex = room.gameState.drawer
      ? room.players.findIndex(p => p.id === room.gameState.drawer)
      : -1;
    const nextIndex = (currentIndex + 1) % room.players.length;

    if (nextIndex === 0) {
      room.gameState.roundNumber++;
      io.to(room.id).emit('roundChange', {
        roundNumber: room.gameState.roundNumber,
        totalRounds: room.settings.totalRounds
      });
    }

    if (room.gameState.roundNumber > room.settings.totalRounds) {
      // End current game
      const currentGame = await db.getCurrentGame(room.id);
      if (currentGame) {
        await db.endGame(currentGame.id);
      }

      // Get winner and update stats
      const winner = [...room.players].sort((a, b) => b.score - a.score)[0];
      io.to(room.id).emit('gameOver', { winner });

      // Get and emit leaderboard
      const leaderboard = await db.getRoomLeaderboard(room.id);
      io.to(room.id).emit('leaderboard', { leaderboard });
      return;
    }

    room.gameState.drawer = room.players[nextIndex].id;
    room.gameState.currentWord = selectNewWord();

    // Create new game round in database
    const game = await db.createGame(
      room.id,
      room.gameState.drawer,
      room.gameState.currentWord,
      room.gameState.roundNumber
    );

    // Add all players to the game
    await Promise.all(
      room.players.map(player => db.addPlayerToGame(game.id, player.id))
    );

    updateTimer(room);

    // Send different states to drawer and other players
    room.players.forEach(player => {
      const isDrawer = player.id === room.gameState.drawer;
      io.to(player.id).emit('gameState', {
        ...room.gameState,
        isDrawing: isDrawer
      });
    });
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

        // Emit current players
        io.to(roomCode).emit('players', room.players);
        
        console.log(`Player ${playerName} joined room ${roomCode}`);
      } catch (error) {
        console.error('Error in joinGame:', error);
        socket.emit('error', { message: 'Failed to join game' });
      }
    });

    socket.on('guess', async ({ roomId, message }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      try {
        const player = await db.getPlayerBySocketId(socket.id);
        if (!player) return;

        if (player.id !== room.gameState.drawer &&
          message.toLowerCase() === room.gameState.currentWord.toLowerCase()) {
          const guesser = room.players.find(p => p.id === player.id);
          const drawer = room.players.find(p => p.id === room.gameState.drawer);

          if (guesser && drawer) {
            const timeBonus = Math.floor(room.gameState.timeLeft / 10);
            guesser.score += 2 + timeBonus;
            drawer.score += 1;

            await Promise.all([
              db.updatePlayerScore(guesser.id, guesser.score),
              db.updatePlayerScore(drawer.id, drawer.score),
              db.addMessage(room.id, guesser.id, `correctly guessed the word!`, 'correct_guess')
            ]);

            io.to(roomId).emit('players', room.players);
            io.to(roomId).emit('correctGuess', {
              guesser: guesser.name,
              word: room.gameState.currentWord,
              timeBonus
            });

            nextTurn(room);
          }
        } else {
          await db.addMessage(room.id, player.id, message);
          io.to(roomId).emit('message', {
            type: 'chat',
            player: player.name,
            content: message,
            isDrawer: player.id === room.gameState.drawer
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

        // Rest of the disconnect logic
        rooms.forEach((room, roomId) => {
          const playerIndex = room.players.findIndex(p => p.id === (player?.id || socket.id));
          if (playerIndex !== -1) {
            room.players.splice(playerIndex, 1);
            io.to(roomId).emit('players', room.players);

            if (room.gameState.drawer === player?.id) {
              nextTurn(room);
            }

            if (room.players.length === 0) {
              if (room.timer) clearInterval(room.timer);
              rooms.delete(roomId);
            } else if (room.host === player?.id) {
              room.host = room.players[0].id;
              io.to(roomId).emit('newHost', { hostId: room.host });
            }
          }
        });
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

    socket.on('startGame', async ({ roomCode, playerId }) => {
      try {
        console.log('Start game request received:', { roomCode, playerId });
        const room = rooms.get(roomCode);
        
        if (!room) {
          console.error('Room not found:', roomCode);
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Validate host status
        if (room.host !== playerId) {
          console.error('Unauthorized start game attempt:', playerId);
          socket.emit('error', { message: 'Only the host can start the game' });
          return;
        }

        // Validate player count
        if (room.players.length < 2) {
          socket.emit('error', { message: 'Need at least 2 players to start' });
          return;
        }

        console.log('Starting game for room:', roomCode);

        // Select first drawer and word
        const firstDrawer = room.players[0].id;
        const firstWord = selectNewWord();

        console.log('First drawer and word:', { firstDrawer, firstWord });

        // Create initial game state
        const initialGameState = createGameState(
          firstDrawer,
          firstWord,
          1,
          room.settings.totalRounds
        );

        // Update room's game state
        room.gameState = initialGameState;

        try {
          // Create game in database
          const game = await db.createGame(
            room.id,
            firstDrawer,
            firstWord,
            1
          );

          // Add all players to the game
          await Promise.all(
            room.players.map(player => db.addPlayerToGame(game.id, player.id))
          );
        } catch (dbError) {
          console.error('Database error:', dbError);
          // Continue even if database operations fail
        }

        // Notify room that game has started
        io.to(roomCode).emit('gameStarted', {
          roundNumber: 1,
          totalRounds: room.settings.totalRounds
        });

        // Send individual game states to each player
        room.players.forEach(player => {
          const playerState = getPlayerGameState(initialGameState, player.id);
          console.log('Sending game state to player:', { playerId: player.id, state: playerState });
          io.to(player.id).emit('gameState', playerState);
        });

        // Start the timer
        updateTimer(room);

        // Add system message
        try {
          await db.addMessage(room.id, firstDrawer, 'Game has started!', 'system');
        } catch (msgError) {
          console.error('Error adding system message:', msgError);
        }

        console.log('Game successfully started for room:', roomCode);
      } catch (error) {
        console.error('Error starting game:', error);
        socket.emit('error', { message: 'Failed to start game' });
      }
    });

    // Add draw event handler
    socket.on('draw', async ({ x, y, color, brushSize, type, roomId }) => {
      try {
        const room = Array.from(rooms.values()).find(r => r.id === roomId);
        if (!room) return;

        // Broadcast draw event to all players in the room except the sender
        socket.to(room.id).emit('draw', { x, y, color, brushSize, type });
      } catch (error) {
        console.error('Error handling draw event:', error);
      }
    });
  });

  return io;
} 