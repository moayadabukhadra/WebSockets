import { db } from '@/services/database';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { roomCode, playerName } = await request.json();

    const room = await db.getRoomByCode(roomCode);
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    const player = await db.addPlayer(
      room.id,
      playerName,
      null, // No socket ID yet
      false // Not host
    );

    return NextResponse.json({
      playerId: player.id
    });
  } catch (error) {
    console.error('Error joining room:', error);
    return NextResponse.json(
      { error: 'Failed to join room' },
      { status: 500 }
    );
  }
} 