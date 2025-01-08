'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import GameRoom from '@/components/GameRoom';

interface RoomData {
  id: string;
  name: string;
  code: string;
  players: any[];
  isHost: boolean;
  currentPlayer: {
    id: string;
    name: string;
  } | null;
}

export default function Game() {
  const params = useParams();
  const router = useRouter();
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const playerId = sessionStorage.getItem('playerId');
    if (!playerId) {
      setError('No player session found');
      setTimeout(() => router.push('/'), 3000);
      return;
    }

    const fetchRoomData = async () => {
      try {
        console.log('Fetching room data for code:', params.code);
        const response = await fetch(`/api/rooms/${params.code}`, {
          headers: {
            'X-Player-Id': playerId
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch room data');
        }

        const data = await response.json();
        console.log('Room data received:', data);
        setRoomData(data);
      } catch (err: any) {
        console.error('Error fetching room data:', err);
        setError(err.message);
        if (err.message === 'Unauthorized access') {
          setTimeout(() => router.push('/'), 3000);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRoomData();
  }, [params.code, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading game room...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="bg-red-500 text-white p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!roomData || !roomData.currentPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="bg-red-500 text-white p-4 rounded-lg">
          Room data not found
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">
            Room: {roomData.name}
          </h1>
          <div className="bg-gray-800 px-4 py-2 rounded-lg">
            Room Code: <span className="font-mono font-bold">{roomData.code}</span>
          </div>
        </div>
        <GameRoom
          roomId={roomData.id}
          roomCode={roomData.code}
          playerId={roomData.currentPlayer.id}
          isHost={roomData.isHost}
        />
      </div>
    </div>
  );
} 