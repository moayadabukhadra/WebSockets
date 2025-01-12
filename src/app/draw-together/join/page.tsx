'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function JoinDrawingRoom() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  const handleJoin = () => {
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }
    router.push(`/draw-together?room=${roomCode.toUpperCase()}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-600">
          Join Drawing Room
        </h1>
        <div className="bg-gray-800 p-8 rounded-xl shadow-lg">
          <div className="mb-8">
            <label htmlFor="roomCode" className="block text-lg font-semibold mb-2">
              Enter Room Code
            </label>
            <input
              type="text"
              id="roomCode"
              value={roomCode}
              onChange={(e) => {
                setError('');
                setRoomCode(e.target.value.toUpperCase());
              }}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
            {error && (
              <p className="mt-2 text-red-400 text-sm">{error}</p>
            )}
          </div>
          <div className="flex justify-center gap-4">
            <button
              onClick={handleJoin}
              className="px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors"
            >
              Join Room
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </main>
  );
} 