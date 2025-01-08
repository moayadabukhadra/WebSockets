/*
  Warnings:

  - A unique constraint covering the columns `[socketId,roomId]` on the table `Player` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Player_socketId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Player_socketId_roomId_key" ON "Player"("socketId", "roomId");
