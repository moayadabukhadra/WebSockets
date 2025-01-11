'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Canvas from './Canvas';
import Chat from './Chat';
import PlayerList from './PlayerList';
import ToolBar from './ToolBar';
import Toast from './Toast';

interface GameRoomProps {
  roomId: string;
  roomCode: string;
  playerId: string;
  isHost: boolean;
}

type Player = {
  id: string;
  name: string;
  score: number;
};

type GameState = {
  currentWord: string;
  timeLeft: number;
  roundNumber: number;
  totalRounds: number;
  drawer: string | null;
  isDrawing: boolean;
  isGameOver: boolean;
  finalScores: { name: string; score: number }[];
};

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'info' | 'warning';
}

export default function GameRoom({ 
  roomId, 
  roomCode, 
  playerId, 
  isHost 
}: GameRoomProps) {
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
    finalScores: []
  });
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'success' | 'info' | 'warning') => {
    const newToast = {
      id: Date.now(),
      message,
      type
    };
    setToasts(prev => [...prev.filter(t => t.type !== type), newToast]);
  };

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
    newSocket.on('gameStarted', (data) => {
      console.log('Game started event received:', data);
      setIsStarting(false);
      setGameState(prevState => ({
        ...prevState,
        currentWord: data.word || '',
        timeLeft: data.timeLeft || 60,
        roundNumber: data.roundNumber || 1,
        totalRounds: data.totalRounds || 3,
        drawer: data.drawer || null,
        isDrawing: data.drawer === playerId
      }));

      if (data.drawer === playerId) {
        addToast("It's your turn to draw!", 'success');
      } else {
        addToast(`${data.drawerName} is drawing now!`, 'info');
      }

      if (data.roundNumber > 1) {
        addToast(`Round ${data.roundNumber} started!`, 'warning');
      }
    });

    newSocket.on('gameState', (state) => {
      console.log('Game state received:', state);
      setGameState(prevState => ({
        ...prevState,
        ...state,
        isDrawing: state.drawer === playerId
      }));
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
    newSocket.on('roundChange', (data) => {
      addToast(`Round ${data.roundNumber} of ${data.totalRounds}!`, 'warning');
    });

    // Handle game over
    newSocket.on('gameOver', (data) => {
      addToast(`Game Over! ${data.winner.name} wins with ${data.winner.score} points!`, 'success');
      // Show final scores modal
      setGameState(prev => ({
        ...prev,
        isGameOver: true,
        finalScores: data.finalScores
      }));
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
                className={`flex justify-between items-center p-2 rounded ${
                  index === 0 ? 'bg-yellow-500/20' : 'bg-gray-700'
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
    <>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
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
                {isCurrentDrawer ? gameState.currentWord : '_ '.repeat(gameState.currentWord.length)}
              </p>
            </div>
          </div>
          <PlayerList players={players} currentDrawer={gameState.drawer} />
        </div>
      </div>
      
      {/* Toasts - with vertical stacking */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 space-y-2">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
          />
        ))}
      </div>

      {/* Game Over Modal with restart options */}
      <GameOverModal />
    </>
  );
} 