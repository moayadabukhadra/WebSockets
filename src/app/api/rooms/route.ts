import { db } from '@/services/database';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { roomName, playerName, rounds } = await request.json();

    // Create room
    const room = await db.createRoom(roomName, rounds);

    // Create player without socket ID (will be set when connecting to WebSocket)
    const player = await db.addPlayer(
      room.id,
      playerName,
      null, // No socket ID yet
      true // First player is host
    );

    return NextResponse.json({
      roomCode: room.code,
      playerId: player.id
    });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500 }
    );
  }
} 