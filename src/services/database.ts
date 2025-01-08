import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Test the database connection
async function testConnection() {
  try {
    await prisma.$connect();
    console.log('Database connection successful');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

testConnection();

export const db = {
  // Room operations
  async createRoom(name: string, rounds: number) {
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      return await prisma.room.create({
        data: {
          name,
          code,
          rounds,
        },
      });
    } catch (error) {
      console.error('Error creating room:', error);
      throw new Error('Failed to create room');
    }
  },

  async getRoom(code: string) {
    try {
      return await prisma.room.findUnique({
        where: { code },
        include: {
          players: true,
          messages: {
            include: {
              player: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
            take: 50, // Limit to last 50 messages
          },
        },
      });
    } catch (error) {
      console.error('Error getting room:', error);
      throw new Error('Failed to get room');
    }
  },

  // Player operations
  async addPlayer(roomId: string, name: string, socketId: string | null = null, isHost: boolean = false) {
    try {
      // First, check if a player with this socketId already exists in the room
      if (socketId) {
        const existingPlayer = await prisma.player.findFirst({
          where: {
            AND: [
              { roomId: roomId },
              { socketId: socketId }
            ]
          },
        });

        if (existingPlayer) {
          // Update the existing player instead of creating a new one
          return await prisma.player.update({
            where: { id: existingPlayer.id },
            data: {
              name,
              isHost,
              updatedAt: new Date(),
            },
          });
        }
      }

      // Create a new player
      return await prisma.player.create({
        data: {
          name,
          socketId,
          isHost,
          room: {
            connect: { id: roomId },
          },
        },
      });
    } catch (error) {
      console.error('Error adding player:', error);
      throw new Error('Failed to add player');
    }
  },

  async updatePlayerSocket(playerId: string, socketId: string | null) {
    try {
      // If we're setting a socketId, make sure it's not already in use in the same room
      if (socketId) {
        const player = await prisma.player.findUnique({
          where: { id: playerId },
          include: { room: true },
        });

        if (player) {
          const existingPlayer = await prisma.player.findFirst({
            where: {
              AND: [
                { roomId: player.roomId },
                { socketId: socketId },
                { NOT: { id: playerId } }
              ]
            },
          });

          if (existingPlayer) {
            // Clear the socketId from the existing player
            await prisma.player.update({
              where: { id: existingPlayer.id },
              data: { socketId: null },
            });
          }
        }
      }

      return await prisma.player.update({
        where: { id: playerId },
        data: { 
          socketId,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error updating player socket:', error);
      throw new Error('Failed to update player socket');
    }
  },

  async updatePlayerScore(playerId: string, score: number) {
    try {
      return await prisma.player.update({
        where: { id: playerId },
        data: { score },
      });
    } catch (error) {
      console.error('Error updating player score:', error);
      throw new Error('Failed to update player score');
    }
  },

  async removePlayer(socketId: string) {
    try {
      // First find the player by socketId
      const player = await prisma.player.findFirst({
        where: {
          socketId: socketId,
        },
      });

      if (!player) {
        throw new Error('Player not found');
      }

      // Then delete using the player's id
      return await prisma.player.delete({
        where: { id: player.id },
      });
    } catch (error) {
      console.error('Error removing player:', error);
      throw new Error('Failed to remove player');
    }
  },

  // Message operations
  async addMessage(roomId: string, playerId: string, content: string, type: string = 'chat') {
    try {
      return await prisma.message.create({
        data: {
          content,
          type,
          room: {
            connect: { id: roomId },
          },
          player: {
            connect: { id: playerId },
          },
        },
        include: {
          player: true,
        },
      });
    } catch (error) {
      console.error('Error adding message:', error);
      throw new Error('Failed to add message');
    }
  },

  // Game operations
  async createGame(roomId: string, drawerId: string, word: string, round: number) {
    try {
      return await prisma.game.create({
        data: {
          word,
          round,
          room: {
            connect: { id: roomId },
          },
          drawer: {
            connect: { id: drawerId },
          },
        },
      });
    } catch (error) {
      console.error('Error creating game:', error);
      throw new Error('Failed to create game');
    }
  },

  async endGame(gameId: string) {
    try {
      return await prisma.game.update({
        where: { id: gameId },
        data: {
          endedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error ending game:', error);
      throw new Error('Failed to end game');
    }
  },

  // New helper functions
  async getRoomStats(roomId: string) {
    try {
      return await prisma.room.findUnique({
        where: { id: roomId },
        include: {
          players: {
            orderBy: {
              score: 'desc',
            },
          },
          games: {
            include: {
              drawer: true,
              players: true,
            },
          },
        },
      });
    } catch (error) {
      console.error('Error getting room stats:', error);
      throw new Error('Failed to get room stats');
    }
  },

  async cleanupInactiveRooms(hours: number = 24) {
    try {
      const date = new Date();
      date.setHours(date.getHours() - hours);

      return await prisma.room.updateMany({
        where: {
          updatedAt: {
            lt: date,
          },
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });
    } catch (error) {
      console.error('Error cleaning up inactive rooms:', error);
      throw new Error('Failed to cleanup inactive rooms');
    }
  },

  // Enhanced Room operations
  async getRoomByCode(code: string) {
    try {
      return await prisma.room.findUnique({
        where: { code },
        include: {
          players: {
            orderBy: {
              score: 'desc',
            },
          },
          messages: {
            include: {
              player: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 50,
          },
          games: {
            where: {
              endedAt: null,
            },
            include: {
              drawer: true,
              players: true,
            },
          },
        },
      });
    } catch (error) {
      console.error('Error getting room by code:', error);
      throw new Error('Failed to get room by code');
    }
  },

  async updateRoomState(roomId: string, data: any) {
    try {
      return await prisma.room.update({
        where: { id: roomId },
        data: {
          updatedAt: new Date(),
          ...data,
        },
      });
    } catch (error) {
      console.error('Error updating room state:', error);
      throw new Error('Failed to update room state');
    }
  },

  // Enhanced Player operations
  async getPlayerBySocketId(socketId: string) {
    try {
      return await prisma.player.findFirst({
        where: {
          socketId: socketId,
        },
        include: {
          room: true,
        },
      });
    } catch (error) {
      console.error('Error getting player by socket ID:', error);
      throw new Error('Failed to get player by socket ID');
    }
  },

  async updatePlayer(playerId: string, data: any) {
    try {
      return await prisma.player.update({
        where: { id: playerId },
        data: {
          updatedAt: new Date(),
          ...data,
        },
      });
    } catch (error) {
      console.error('Error updating player:', error);
      throw new Error('Failed to update player');
    }
  },

  // Enhanced Game operations
  async getCurrentGame(roomId: string) {
    try {
      return await prisma.game.findFirst({
        where: {
          roomId,
          endedAt: null,
        },
        include: {
          drawer: true,
          players: true,
        },
        orderBy: {
          startedAt: 'desc',
        },
      });
    } catch (error) {
      console.error('Error getting current game:', error);
      throw new Error('Failed to get current game');
    }
  },

  async updateGame(gameId: string, data: any) {
    try {
      return await prisma.game.update({
        where: { id: gameId },
        data: {
          ...data,
        },
      });
    } catch (error) {
      console.error('Error updating game:', error);
      throw new Error('Failed to update game');
    }
  },

  async addPlayerToGame(gameId: string, playerId: string) {
    try {
      return await prisma.game.update({
        where: { id: gameId },
        data: {
          players: {
            connect: { id: playerId },
          },
        },
      });
    } catch (error) {
      console.error('Error adding player to game:', error);
      throw new Error('Failed to add player to game');
    }
  },

  // Game Statistics
  async getPlayerStats(playerId: string) {
    try {
      const stats = await prisma.player.findUnique({
        where: { id: playerId },
        include: {
          games: true,
          drawings: true,
          messages: {
            where: {
              type: 'correct_guess',
            },
          },
        },
      });

      return {
        totalGames: stats?.games.length || 0,
        gamesAsDrawer: stats?.drawings.length || 0,
        correctGuesses: stats?.messages.length || 0,
        totalScore: stats?.score || 0,
      };
    } catch (error) {
      console.error('Error getting player stats:', error);
      throw new Error('Failed to get player stats');
    }
  },

  async getRoomLeaderboard(roomId: string) {
    try {
      return await prisma.player.findMany({
        where: { roomId },
        orderBy: {
          score: 'desc',
        },
        take: 10,
        include: {
          messages: {
            where: {
              type: 'correct_guess',
            },
          },
        },
      });
    } catch (error) {
      console.error('Error getting room leaderboard:', error);
      throw new Error('Failed to get room leaderboard');
    }
  },

  async getPlayerById(playerId: string) {
    try {
      return await prisma.player.findUnique({
        where: { id: playerId },
        include: {
          room: true,
        },
      });
    } catch (error) {
      console.error('Error getting player by ID:', error);
      throw new Error('Failed to get player by ID');
    }
  },
}; 