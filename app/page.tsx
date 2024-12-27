'use client';

import { useEffect, useState } from 'react';
import Game from '../components/Game';
import Login from '../components/Login';

export default function Home() {
  const [username, setUsername] = useState<string>('');

  return (
    <main className="min-h-screen bg-gray-100">
      {!username ? (
        <Login onLogin={setUsername} />
      ) : (
        <Game username={username} />
      )}
    </main>
  );
} 