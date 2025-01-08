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

const words = [
  'apple', 'banana', 'cat', 'dog', 'elephant',
  'fish', 'giraffe', 'house', 'ice cream', 'jungle',
  // Add more words here
];

export function initSocket(server: NetServer) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const rooms = new Map<string, Room>();

  const loadRoomState = async (roomCode: string) => {
    const dbRoom = await db.getRoomByCode(roomCode);
    if (!dbRoom) return null;

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
        drawer: currentGame?.drawerId || null
      },
      host: dbRoom.players.find((p: { id: string; isHost: boolean }) => p.isHost)?.id || '',
      settings: {
        totalRounds: dbRoom.rounds
      },
      timer: null
    };

    rooms.set(roomCode, room);
    return room;
  };

  const selectNewWord = () => {
    return words[Math.floor(Math.random() * words.length)];
  };

  const updateTimer = (room: Room) => {
    if (room.timer) clearInterval(room.timer);

    room.gameState.timeLeft = 60;
    room.timer = setInterval(() => {
      room.gameState.timeLeft--;

      // Send different states to drawer and other players
      room.players.forEach(player => {
        const isDrawer = player.id === room.gameState.drawer;
        io.to(player.id).emit('gameState', {
          ...room.gameState,
          isDrawing: isDrawer,
          currentWord: isDrawer ? room.gameState.currentWord : '_ '.repeat(room.gameState.currentWord.length)
        });
      });

      if (room.gameState.timeLeft <= 0) {
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
    console.log('Client connected');

    socket.on('joinGame', async ({ roomCode, playerId, playerName, isHost }) => {
      try {
        const room = rooms.get(roomCode) || await loadRoomState(roomCode);
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Update the socket ID for the player
        await db.updatePlayerSocket(playerId, socket.id);

        // Update room state
        const existingPlayer = room.players.find(p => p.id === playerId);
        if (!existingPlayer) {
          room.players.push({
            id: playerId, // Use playerId instead of socket.id
            name: playerName,
            score: 0
          });

          if (isHost) {
            room.host = playerId;
          }
        }

        socket.join(roomCode);
        socket.emit('gameState', room.gameState);
        io.to(roomCode).emit('players', room.players);
        await db.addMessage(room.id, playerId, `${playerName} has joined the game!`, 'system');
      } catch (error) {
        console.error('Error joining game:', error);
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
        console.log('Starting game for room:', roomCode, 'Player:', playerId);
        const room = rooms.get(roomCode);
        if (!room) {
          console.error('Room not found:', roomCode);
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Get the player from the players array using the provided playerId
        const player = room.players.find(p => p.id === playerId);
        console.log('Player found:', player, 'Host:', room.host);
        if (!player || room.host !== playerId) {
          socket.emit('error', { message: 'Only the host can start the game' });
          return;
        }

        // Make sure we have players
        if (room.players.length < 1) {
          socket.emit('error', { message: 'Not enough players to start the game' });
          return;
        }

        // Initialize game state with first player as drawer
        const firstDrawer = room.players[0].id;
        const firstWord = selectNewWord();
        console.log('First drawer:', firstDrawer, 'Word:', firstWord);

        room.gameState = {
          currentWord: firstWord,
          timeLeft: 60,
          roundNumber: 1,
          totalRounds: room.settings.totalRounds,
          drawer: firstDrawer
        };

        // Create first game round in database
        const game = await db.createGame(
          room.id,
          firstDrawer,
          firstWord,
          room.gameState.roundNumber
        );

        // Add all players to the game
        await Promise.all(
          room.players.map(player => db.addPlayerToGame(game.id, player.id))
        );

        // Start the timer
        updateTimer(room);

        // Notify all players that the game has started
        io.to(roomCode).emit('gameStarted', {
          roundNumber: room.gameState.roundNumber,
          totalRounds: room.settings.totalRounds
        });

        // Send different states to drawer and other players
        room.players.forEach(player => {
          const isDrawer = player.id === firstDrawer;
          const gameState = {
            ...room.gameState,
            isDrawing: isDrawer,
            currentWord: isDrawer ? firstWord : '_ '.repeat(firstWord.length)
          };
          console.log('Sending game state to player:', player.id, gameState);
          io.to(player.id).emit('gameState', gameState);
        });

        // Add system message using the first drawer's ID
        await db.addMessage(room.id, firstDrawer, 'Game has started!', 'system');
      } catch (error) {
        console.error('Error starting game:', error);
        socket.emit('error', { message: 'Failed to start game' });
      }
    });
  });

  return io;
} 