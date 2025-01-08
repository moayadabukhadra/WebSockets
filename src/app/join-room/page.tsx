'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function JoinRoom() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joinRoom = async () => {
    if (!roomCode || !playerName) {
      setError('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomCode,
          playerName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to join room');
      }

      const data = await response.json();
      
      // Store player data in session storage
      sessionStorage.setItem('playerId', data.playerId);
      sessionStorage.setItem('playerName', playerName);
      sessionStorage.setItem('roomCode', roomCode);
      
      router.push(`/game/${roomCode}`);
    } catch (err) {
      setError('Failed to join room. Please check the room code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Join Room
        </h1>
        <div className="bg-gray-800 p-8 rounded-xl shadow-lg">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Room Code
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-purple-500 focus:outline-none"
                placeholder="Enter room code"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-purple-500 focus:outline-none"
                placeholder="Enter your name"
              />
            </div>
            <div className="flex gap-4">
              <button
                onClick={joinRoom}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded font-semibold hover:opacity-90 transition-opacity"
              >
                Join Room
              </button>
              <Link
                href="/"
                className="px-6 py-3 rounded font-semibold border border-gray-600 hover:bg-gray-700 transition-colors"
              >
                Back
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 