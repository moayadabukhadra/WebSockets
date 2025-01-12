'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateDrawingRoom() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    // Generate a random room code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(code);
    setIsGenerating(false);
  }, []);

  const handleCreate = () => {
    router.push(`/draw-together?room=${roomCode}`);
  };

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4 flex items-center justify-center">
        <div className="text-xl">Generating room code...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
          Create Drawing Room
        </h1>
        <div className="bg-gray-800 p-8 rounded-xl shadow-lg">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Your Room Code</h2>
            <div className="bg-gray-700 p-4 rounded-lg">
              <span className="font-mono text-3xl font-bold">{roomCode}</span>
            </div>
            <p className="mt-4 text-gray-400">
              Share this code with others to let them join your drawing room.
            </p>
          </div>
          <div className="flex justify-center gap-4">
            <button
              onClick={handleCreate}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
            >
              Create Room
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