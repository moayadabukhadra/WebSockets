'use client';

import { Socket } from 'socket.io-client';
import { useState } from 'react';

interface GameStatusProps {
  isDrawer: boolean;
  currentWord: string;
  timeLeft: number;
  socket: Socket | null;
}

export default function GameStatus({ isDrawer, currentWord, timeLeft, socket }: GameStatusProps) {
  const [guess, setGuess] = useState('');

  const handleSubmitGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (socket && guess.trim()) {
      socket.emit('submitGuess', guess.trim());
      setGuess('');
    }
  };

  return (
    <div className="mb-4 rounded-lg bg-white p-4 shadow-lg">
      <div className="mb-2 text-center text-xl font-bold">
        {isDrawer ? `Your word is: ${currentWord}` : 'Try to guess the word!'}
      </div>
      <div className="mb-4 text-center text-lg">Time left: {timeLeft}s</div>
      {!isDrawer && (
        <form onSubmit={handleSubmitGuess} className="flex gap-2">
          <input
            type="text"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 p-2"
            placeholder="Type your guess here..."
          />
          <button
            type="submit"
            className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Guess
          </button>
        </form>
      )}
    </div>
  );
} 