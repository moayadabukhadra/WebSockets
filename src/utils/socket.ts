import { Server as SocketIOServer } from 'socket.io';
import { Server as NetServer } from 'http';

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

  let players: Player[] = [];
  let gameState: GameState = {
    currentWord: '',
    timeLeft: 60,
    roundNumber: 1,
    totalRounds: 3,
    drawer: null
  };

  let timer: NodeJS.Timeout | null = null;

  const selectNewWord = () => {
    return words[Math.floor(Math.random() * words.length)];
  };

  const updateTimer = () => {
    if (timer) clearInterval(timer);
    
    gameState.timeLeft = 60;
    timer = setInterval(() => {
      gameState.timeLeft--;
      io.emit('gameState', {
        ...gameState,
        isDrawing: false
      });

      if (gameState.timeLeft <= 0) {
        nextTurn();
      }
    }, 1000);
  };

  const nextTurn = () => {
    if (players.length === 0) return;
    
    const currentIndex = gameState.drawer 
      ? players.findIndex(p => p.id === gameState.drawer)
      : -1;
    const nextIndex = (currentIndex + 1) % players.length;
    
    if (nextIndex === 0) {
      gameState.roundNumber++;
      io.emit('roundChange', {
        roundNumber: gameState.roundNumber,
        totalRounds: gameState.totalRounds
      });
    }

    if (gameState.roundNumber > gameState.totalRounds) {
      // Game Over
      const winner = [...players].sort((a, b) => b.score - a.score)[0];
      io.emit('gameOver', { winner });
      return;
    }

    gameState.drawer = players[nextIndex].id;
    gameState.currentWord = selectNewWord();
    updateTimer();

    // Send different states to drawer and other players
    players.forEach(player => {
      const isDrawer = player.id === gameState.drawer;
      io.to(player.id).emit('gameState', {
        ...gameState,
        isDrawing: isDrawer
      });
    });
  };

  io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('joinGame', ({ name }) => {
      const player: Player = {
        id: socket.id,
        name,
        score: 0
      };
      players.push(player);
      io.emit('players', players);
      io.emit('message', {
        type: 'system',
        content: `${name} has joined the game!`
      });

      if (players.length === 1) {
        nextTurn();
      }
    });

    socket.on('draw', (data) => {
      if (socket.id === gameState.drawer) {
        socket.broadcast.emit('draw', data);
      }
    });

    socket.on('guess', (message) => {
      const player = players.find(p => p.id === socket.id);
      if (!player) return;

      if (socket.id !== gameState.drawer && 
          message.toLowerCase() === gameState.currentWord.toLowerCase()) {
        // Correct guess!
        const guesser = players.find(p => p.id === socket.id);
        const drawer = players.find(p => p.id === gameState.drawer);
        
        if (guesser && drawer) {
          const timeBonus = Math.floor(gameState.timeLeft / 10);
          guesser.score += 2 + timeBonus;
          drawer.score += 1;
          
          io.emit('players', players);
          io.emit('correctGuess', {
            guesser: guesser.name,
            word: gameState.currentWord,
            timeBonus
          });
          
          nextTurn();
        }
      } else {
        // Regular chat message
        io.emit('message', {
          type: 'chat',
          player: player.name,
          content: message,
          isDrawer: socket.id === gameState.drawer
        });
      }
    });

    socket.on('disconnect', () => {
      players = players.filter(p => p.id !== socket.id);
      io.emit('players', players);
      
      if (gameState.drawer === socket.id) {
        nextTurn();
      }
    });
  });

  return io;
} 