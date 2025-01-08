import { db } from '@/services/database';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    console.log('Fetching room with code:', params.code);
    const playerId = request.headers.get('X-Player-Id');
    
    if (!playerId) {
      console.log('No player ID provided');
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 401 }
      );
    }

    const room = await db.getRoomByCode(params.code);
    console.log('Room found:', room ? 'yes' : 'no');
    
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    // Find the current player in the room
    const currentPlayer = room.players.find((p: { id: string }) => p.id === playerId);
    console.log('Current player found:', currentPlayer ? 'yes' : 'no');
    const isHost = currentPlayer?.isHost || false;

    const response = {
      id: room.id,
      name: room.name,
      code: room.code,
      players: room.players,
      isHost,
      currentPlayer: currentPlayer ? {
        id: currentPlayer.id,
        name: currentPlayer.name
      } : null
    };
    console.log('Sending response:', response);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting room:', error);
    return NextResponse.json(
      { error: 'Failed to get room' },
      { status: 500 }
    );
  }
} 