'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreateRoom() {
  const router = useRouter();
  const [roomName, setRoomName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [rounds, setRounds] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRoom = async () => {
    if (!roomName || !playerName) {
      setError('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName,
          playerName,
          rounds
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create room');
      }

      const data = await response.json();
      
      // Store all necessary data in session storage
      sessionStorage.setItem('playerId', data.playerId);
      sessionStorage.setItem('playerName', playerName);
      sessionStorage.setItem('roomCode', data.roomCode);
      sessionStorage.setItem('isHost', 'true');
      
      // Navigate to the game page using the room code
      router.push(`/game/${data.roomCode}`);
    } catch (err) {
      console.error('Error creating room:', err);
      setError('Failed to create room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Create Room
        </h1>
        <div className="bg-gray-800 p-8 rounded-xl shadow-lg">
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-200">
              {error}
            </div>
          )}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Room Name
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-purple-500 focus:outline-none"
                placeholder="Enter room name"
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
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Number of Rounds
              </label>
              <select
                value={rounds}
                onChange={(e) => setRounds(Number(e.target.value))}
                className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-purple-500 focus:outline-none"
              >
                {[3, 5, 7, 10].map((num) => (
                  <option key={num} value={num}>
                    {num} rounds
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-4">
              <button
                onClick={createRoom}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Room'}
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