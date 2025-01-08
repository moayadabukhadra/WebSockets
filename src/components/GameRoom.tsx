'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Canvas from './Canvas';
import Chat from './Chat';
import PlayerList from './PlayerList';
import ToolBar from './ToolBar';

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
};

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
    isDrawing: false
  });
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    const playerName = sessionStorage.getItem('playerName');
    if (!playerName) {
      setError('Player session not found');
      return;
    }

    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    // Send initial connection data
    newSocket.emit('joinGame', {
      roomCode,
      playerId,
      playerName,
      isHost
    });

    // Add all event listeners
    newSocket.on('error', ({ message }) => {
      console.error('Socket error:', message);
      setError(message);
    });

    newSocket.on('players', (updatedPlayers: Player[]) => {
      console.log('Players updated:', updatedPlayers);
      setPlayers(updatedPlayers);
    });

    newSocket.on('gameState', (state: GameState) => {
      console.log('Game state updated:', state);
      setGameState(state);
    });

    newSocket.on('gameStarted', ({ roundNumber, totalRounds }) => {
      console.log(`Game started! Round ${roundNumber} of ${totalRounds}`);
      setIsStarting(false);
    });

    newSocket.on('roundChange', ({ roundNumber, totalRounds }) => {
      console.log(`Round ${roundNumber} of ${totalRounds}`);
    });

    newSocket.on('gameOver', ({ winner }) => {
      console.log(`Game Over! Winner: ${winner.name}`);
    });

    return () => {
      newSocket.close();
    };
  }, [roomCode, playerId, isHost]);

  const handleStartGame = async () => {
    if (!socket || isStarting || !roomCode) return;
    
    setIsStarting(true);
    socket.emit('startGame', { roomCode, playerId });
    
    // Reset starting state after a delay
    setTimeout(() => setIsStarting(false), 2000);
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

  return (
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
            />
          )}
        </div>
        {socket && <Chat socket={socket} isDrawing={isCurrentDrawer} roomId={roomId} />}
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
  );
} 