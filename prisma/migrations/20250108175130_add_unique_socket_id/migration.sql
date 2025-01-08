/*
  Warnings:

  - A unique constraint covering the columns `[socketId]` on the table `Player` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Player_socketId_key" ON "Player"("socketId");
