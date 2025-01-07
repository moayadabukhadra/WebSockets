'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Canvas from './Canvas';
import Chat from './Chat';
import PlayerList from './PlayerList';
import ToolBar from './ToolBar';

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

export default function GameRoom() {
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
  const [playerName, setPlayerName] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);

  useEffect(() => {
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    newSocket.on('players', (updatedPlayers: Player[]) => {
      setPlayers(updatedPlayers);
    });

    newSocket.on('gameState', (state: GameState) => {
      setGameState(state);
    });

    newSocket.on('roundChange', ({ roundNumber, totalRounds }) => {
      // You could add a round change animation here
      console.log(`Round ${roundNumber} of ${totalRounds}`);
    });

    newSocket.on('gameOver', ({ winner }) => {
      // Handle game over state
      console.log(`Game Over! Winner: ${winner.name}`);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const joinGame = () => {
    if (!playerName || !socket) return;
    socket.emit('joinGame', { name: playerName });
    setGameStarted(true);
  };

  if (!gameStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold mb-6 text-center text-purple-400">
            Join the Game
          </h2>
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-purple-500 focus:outline-none mb-4"
          />
          <button
            onClick={joinGame}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded font-semibold hover:opacity-90 transition-opacity"
          >
            Join Game
          </button>
        </div>
      </div>
    );
  }

  const isCurrentDrawer = socket?.id === gameState.drawer;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3 space-y-4">
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
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
            />
          )}
        </div>
        {socket && <Chat socket={socket} isDrawing={isCurrentDrawer} />}
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