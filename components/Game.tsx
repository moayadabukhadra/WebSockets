'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { fabric } from 'fabric-pure-browser';
import Canvas from './Canvas';
import Toolbar from './Toolbar';
import UsersList from './UsersList';
import GameStatus from './GameStatus';

interface GameProps {
  username: string;
}

export default function Game({ username }: GameProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isDrawer, setIsDrawer] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [users, setUsers] = useState([]);
  const canvasRef = useRef<fabric.Canvas | null>(null);

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      // You might want to show an error message to the user
    });

    setSocket(newSocket);

    newSocket.emit('register', username);

    return () => {
      newSocket.close();
    };
  }, [username]);

  useEffect(() => {
    if (!socket) return;

    socket.on('youAreDrawing', (word: string) => {
      setIsDrawer(true);
      setCurrentWord(word);
      if (canvasRef.current) {
        canvasRef.current.isDrawingMode = true;
      }
    });

    socket.on('timerUpdate', (seconds: number) => {
      setTimeLeft(seconds);
    });

    socket.on('userList', (userList: any[]) => {
      setUsers(userList);
    });

    return () => {
      socket.off('youAreDrawing');
      socket.off('timerUpdate');
      socket.off('userList');
    };
  }, [socket]);

  return (
    <div className="flex min-h-screen gap-4 p-4">
      <div className="w-64 rounded-lg bg-white p-4 shadow-lg">
        <UsersList users={users} />
      </div>
      
      <div className="flex-1">
        <div className="mb-4 rounded-lg bg-white p-4 shadow-lg">
          <Toolbar isDrawer={isDrawer} socket={socket} canvasRef={canvasRef} />
        </div>
        
        <GameStatus
          isDrawer={isDrawer}
          currentWord={currentWord}
          timeLeft={timeLeft}
          socket={socket}
        />
        
        <div className="rounded-lg bg-white p-4 shadow-lg">
          <Canvas ref={canvasRef} socket={socket} isDrawer={isDrawer} />
        </div>
      </div>
    </div>
  );
} 