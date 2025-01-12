'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import Canvas from './Canvas';
import Chat from './Chat';
import PlayerList from './PlayerList';
import ToolBar from './ToolBar';
import { useAlert } from '@/contexts/AlertContext';
import {
  Player,
  GameState,
  PlayerPowerUps,
  GameStartData,
  RoundChangeData,
  GameOverData,
  PowerUpUsedData
} from '@/types/game';

interface GameRoomProps {
  roomId: string;
  roomCode: string;
  playerId: string;
  isHost: boolean;
}

export default function GameRoom({
  roomId,
  roomCode,
  playerId,
  isHost
}: GameRoomProps) {
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    currentWord: '',
    timeLeft: 60,
    roundNumber: 1,
    totalRounds: 3,
    drawer: null,
    isDrawing: false,
    isGameOver: false,
    finalScores: [],
    wordHints: [],
    powerUps: {
      timeBonus: 2,
      revealLetter: 2,
      clearCanvas: 1
    },
    revealedLetters: new Set()
  });
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const { showAlert } = useAlert();

  useEffect(() => {
    const playerName = sessionStorage.getItem('playerName');
    if (!playerName) {
      setError('Player session not found');
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';
    console.log('Connecting to socket server:', socketUrl);

    const newSocket = io(socketUrl, {
      transports: ['websocket'],
      query: {
        roomCode,
        playerId,
        playerName,
        isHost
      }
    });

    // Add connection event handlers
    newSocket.on('connect', () => {
      console.log('Socket connected with ID:', newSocket.id);

      // Join game room after connection
      newSocket.emit('joinGame', {
        roomCode,
        playerId,
        playerName,
        isHost
      });
    });

    // Game event handlers with improved logging
    newSocket.on('gameStarted', (data: {
      word?: string;
      timeLeft?: number;
      roundNumber?: number;
      totalRounds?: number;
      drawer?: string;
      drawerName: string;
      players?: PlayerPowerUps[];
    }) => {
      console.log('Game started event received:', data);
      setIsStarting(false);
      
      const roundNumber = data.roundNumber ?? 1; // Use nullish coalescing for proper type handling
      
      setGameState(prevState => ({
        ...prevState,
        currentWord: data.word || '',
        timeLeft: data.timeLeft || 60,
        roundNumber,
        totalRounds: data.totalRounds || 3,
        drawer: data.drawer || null,
        isDrawing: data.drawer === playerId,
        isGameOver: false,
        finalScores: [],
        wordHints: [],
        powerUps: data.players?.find(p => p.id === playerId)?.powerUps || prevState.powerUps,
        revealedLetters: new Set()
      }));

      if (data.drawer === playerId) {
        showAlert("It's your turn to draw!", 'success');
      } else {
        showAlert(`${data.drawerName} is drawing now!`, 'info');
      }

      if (data.roundNumber && data.roundNumber > 1) {
        showAlert(`Round ${data.roundNumber} started!`, 'info');
      }
    });

    newSocket.on('gameState', (state) => {
      setGameState(prevState => {
        // Ensure revealedLetters is properly converted to a Set
        let newRevealedLetters;
        if (state.revealedLetters) {
          try {
            // Handle both array and object cases
            const letters = Array.isArray(state.revealedLetters) 
              ? state.revealedLetters 
              : Object.values(state.revealedLetters);
            newRevealedLetters = new Set(letters);
          } catch (error) {
            console.error('Error converting revealedLetters to Set:', error);
            newRevealedLetters = prevState.revealedLetters;
          }
        } else {
          newRevealedLetters = prevState.revealedLetters;
        }

        return {
          ...state,
          isDrawing: state.drawer === playerId,
          // Keep the user's own power-ups
          powerUps: prevState.powerUps,
          wordHints: state.wordHints || prevState.wordHints,
          revealedLetters: newRevealedLetters,
          isGameOver: prevState.isGameOver,
          finalScores: prevState.finalScores
        };
      });
    });

    // Listen for 'playerList' updates from the server
    newSocket.on('playerList', (playerList: Player[]) => {
      console.log('Player list received:', playerList);
      setPlayers(playerList);
    });

    // Add error handling
    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setError('Failed to connect to game server');
    });

    newSocket.on('error', ({ message }) => {
      console.error('Socket error:', message);
      setError(message);
      setIsStarting(false);
    });

    // Handle round changes
    newSocket.on('roundChange', (data: { 
      roundNumber: number; 
      totalRounds: number;
      players?: PlayerPowerUps[];
    }) => {
      showAlert(`Round ${data.roundNumber} of ${data.totalRounds}!`, 'info');
      // Update power-ups if they were reset
      if (data.players) {
        const playerPowerUps = data.players.find(p => p.id === playerId)?.powerUps;
        if (playerPowerUps) {
          setGameState(prev => ({
            ...prev,
            powerUps: playerPowerUps
          }));
        }
      }
    });

    // Handle game over
    newSocket.on('gameOver', (data: {
      winner: { name: string; score: number };
      finalScores: { name: string; score: number }[];
      players?: PlayerPowerUps[];
    }) => {
      showAlert(`Game Over! ${data.winner.name} wins with ${data.winner.score} points!`, 'success');
      // Update power-ups and game state
      const playerPowerUps = data.players?.find(p => p.id === playerId)?.powerUps;
      setGameState(prev => ({
        ...prev,
        isGameOver: true,
        finalScores: data.finalScores,
        powerUps: playerPowerUps || prev.powerUps
      }));
    });

    // Handle power-up effects
    newSocket.on('powerUpUsed', (data) => {
      const messages = {
        timeBonus: '⏰ +15 seconds added to the timer!',
        revealLetter: '📝 A letter has been revealed!',
        clearCanvas: '🗑️ Canvas has been cleared!'
      };

      showAlert(messages[data.type as keyof typeof messages], 'info');

      // Update game state based on power-up type
      setGameState(prev => ({
        ...prev,
        timeLeft: data.type === 'timeBonus' ? prev.timeLeft + 15 : prev.timeLeft,
        // Only update powerUps if they belong to this user
        powerUps: data.playerId === playerId ? data.powerUps : prev.powerUps
      }));
    });

    // Add error handling for power-ups
    newSocket.on('powerUpError', (error) => {
      showAlert(error.message, 'error');
    });

    // Handle word hints
    newSocket.on('wordHint', (hint) => {
      setGameState(prev => ({
        ...prev,
        wordHints: [...prev.wordHints, hint]
      }));
      showAlert('New hint available! 💡', 'info');
    });

    setSocket(newSocket);

    return () => {
      console.log('Cleaning up socket connection');
      newSocket.close();
    };
  }, [roomCode, playerId, isHost]);

  const handleStartGame = async () => {
    if (!socket || isStarting || !roomCode) {
      console.log('Cannot start game:', {
        socketExists: !!socket,
        isStarting,
        roomCode
      });
      return;
    }

    console.log('Emitting startGame event:', { roomCode, playerId });
    setIsStarting(true);

    socket.emit('startGame', { roomCode, playerId }, (response: { status: string; message?: string }) => {
      if (response.status === 'error') {
        console.error('startGame failed:', response.message);
        setError(response.message || 'Failed to start game');
        setIsStarting(false);
      }
    });
  };

  const handleExit = () => {
    if (socket) {
      socket.disconnect();
    }
    router.push('/');
  };

  const GameOverModal = () => {
    if (!gameState.isGameOver) return null;

    const handleRestart = () => {
      if (!socket) return;
      socket.emit('restartGame', { roomCode, playerId }, (response: { status: string; message?: string }) => {
        if (response.status === 'error') {
          setError(response.message || 'Failed to restart game');
        }
      });
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
          <h2 className="text-2xl font-bold text-center mb-4">Game Over!</h2>
          <div className="space-y-2 mb-6">
            {gameState.finalScores?.map((score, index) => (
              <div
                key={index}
                className={`flex justify-between items-center p-2 rounded ${index === 0 ? 'bg-yellow-500/20' : 'bg-gray-700'
                  }`}
              >
                <span>{score.name}</span>
                <span className="font-bold">{score.score} points</span>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {isHost && (
              <button
                onClick={handleRestart}
                className="w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition-colors"
              >
                Restart Game
              </button>
            )}
            <button
              onClick={() => window.location.href = '/create-room'}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              Create New Game
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  };

  const PowerUps = () => {
    if (gameState.isGameOver) return null;

    const handleTimeBonus = () => {
      if (!socket || gameState.powerUps.timeBonus <= 0) return;
      socket.emit('usePowerUp', { 
        type: 'timeBonus', 
        roomCode,
        playerId 
      });
    };

    const handleRevealLetter = () => {
      if (!socket || gameState.powerUps.revealLetter <= 0 || isCurrentDrawer) return;
      socket.emit('usePowerUp', { 
        type: 'revealLetter', 
        roomCode,
        playerId 
      });
    };

    const handleClearCanvas = () => {
      if (!socket || gameState.powerUps.clearCanvas <= 0 || !isCurrentDrawer) return;
      socket.emit('usePowerUp', { 
        type: 'clearCanvas', 
        roomCode,
        playerId 
      });
    };

    return (
      <div className="bg-gray-800 p-4 rounded-lg shadow-lg mb-4">
        <h2 className="text-xl font-bold mb-3">Power-ups</h2>
        <div className="flex gap-2">
          <button
            onClick={handleTimeBonus}
            disabled={gameState.powerUps.timeBonus <= 0}
            className={`flex-1 p-2 rounded-lg transition-colors ${
              gameState.powerUps.timeBonus > 0 
                ? 'bg-blue-500 hover:bg-blue-600' 
                : 'bg-gray-600 cursor-not-allowed'
            }`}
            title="Add 15 seconds to the timer"
          >
            ⏰ Time Bonus ({gameState.powerUps.timeBonus})
          </button>
          {!isCurrentDrawer && (
            <button
              onClick={handleRevealLetter}
              disabled={gameState.powerUps.revealLetter <= 0}
              className={`flex-1 p-2 rounded-lg transition-colors ${
                gameState.powerUps.revealLetter > 0 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-gray-600 cursor-not-allowed'
              }`}
              title="Reveal a random letter"
            >
              📝 Reveal Letter ({gameState.powerUps.revealLetter})
            </button>
          )}
          {isCurrentDrawer && (
            <button
              onClick={handleClearCanvas}
              disabled={gameState.powerUps.clearCanvas <= 0}
              className={`flex-1 p-2 rounded-lg transition-colors ${
                gameState.powerUps.clearCanvas > 0 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-gray-600 cursor-not-allowed'
              }`}
              title="Clear the canvas"
            >
              🗑️ Clear Canvas ({gameState.powerUps.clearCanvas})
            </button>
          )}
        </div>
      </div>
    );
  };

  const WordHints = () => {
    if (isCurrentDrawer || gameState.isGameOver) return null;

    return (
      <div className="mb-4">
        <h3 className="text-lg font-bold mb-2">Hints:</h3>
        <div className="flex flex-wrap gap-2">
          {gameState.wordHints.map((hint, index) => (
            <span key={index} className="bg-gray-700 px-2 py-1 rounded text-sm">
              {hint}
            </span>
          ))}
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-500 text-white p-4 rounded-lg">
          Error: {error}
        </div>
      </div>
    );
  }

  const isCurrentDrawer = gameState.drawer === playerId;

  console.log('Current game state:', {
    gameState,
    players,
    isHost,
    playerId,
    isCurrentDrawer: gameState.drawer === playerId
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Room Code: {roomCode}</h1>
            {isHost && !gameState.isGameOver && !gameState.drawer && (
              <button
                onClick={handleStartGame}
                disabled={isStarting || players.length < 2}
                className={`px-4 py-2 rounded-lg font-semibold ${
                  isStarting || players.length < 2
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {isStarting ? 'Starting...' : 'Start Game'}
              </button>
            )}
          </div>
          <button
            onClick={handleExit}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-semibold transition-colors"
          >
            Exit Game
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <PowerUps />
            {isHost && !gameState.drawer && (
              <button
                onClick={handleStartGame}
                disabled={isStarting}
                className="w-full mb-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isStarting ? 'Starting Game...' : 'Start Game'}
              </button>
            )}
            {isCurrentDrawer && (
              <div className="mb-4">
                <ToolBar
                  selectedColor={selectedColor}
                  setSelectedColor={setSelectedColor}
                  brushSize={brushSize}
                  setBrushSize={setBrushSize}
                />
              </div>
            )}
            <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
              {socket && (
                <Canvas
                  socket={socket}
                  isDrawing={isCurrentDrawer}
                  selectedColor={selectedColor}
                  brushSize={brushSize}
                  roomId={roomId}
                  roomCode={roomCode}
                />
              )}
            </div>
            {socket && (
              <Chat
                socket={socket}
                isDrawing={isCurrentDrawer}
                roomId={roomId}
                roomCode={roomCode}
                playerId={playerId}
              />
            )}
          </div>
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
              <div className="mb-4">
                <h2 className="text-xl font-bold mb-2">Round {gameState.roundNumber}/{gameState.totalRounds}</h2>
                <div className="text-2xl font-bold text-purple-400">
                  {gameState.timeLeft}s
                </div>
              </div>
              <div className="mb-4">
                <h2 className="text-xl font-bold mb-2">Current Word</h2>
                <p className="text-2xl font-mono">
                  {isCurrentDrawer 
                    ? gameState.currentWord 
                    : [...gameState.currentWord].map((letter, index) => 
                        gameState.revealedLetters?.has(index) 
                          ? letter 
                          : '_'
                      ).join(' ')
                  }
                </p>
              </div>
            </div>
            <WordHints />
            <PlayerList players={players} currentDrawer={gameState.drawer} />
          </div>
        </div>

        <GameOverModal />
      </div>
    </div>
  );
} 