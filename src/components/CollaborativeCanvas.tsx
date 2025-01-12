'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface CollaborativeCanvasProps {
  selectedTool: string;
  selectedColor: string;
  brushSize: number;
  roomId: string;
  roomCode: string;
  onHistoryUpdate: (history: ImageData[], index: number) => void;
}

interface DrawData {
  x: number;
  y: number;
  color: string;
  brushSize: number;
  tool: string;
  type: 'start' | 'draw' | 'end';
  points?: { x: number; y: number }[];
}

export default function CollaborativeCanvas({
  selectedTool,
  selectedColor,
  brushSize,
  roomId,
  roomCode,
  onHistoryUpdate
}: CollaborativeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);
  const canvasHistory = useRef<ImageData[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.scale(2, 2);
    context.lineCap = 'round';
    context.strokeStyle = selectedColor;
    context.lineWidth = brushSize;
    contextRef.current = context;

    // Connect to socket server
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      transports: ['websocket'],
      query: {
        roomCode,
        roomId
      }
    });

    // Join the room
    newSocket.emit('joinDrawRoom', { roomCode, roomId });

    newSocket.on('draw', handleDrawEvent);
    newSocket.on('clearCanvas', handleClearCanvas);
    setSocket(newSocket);

    return () => {
      newSocket.off('draw', handleDrawEvent);
      newSocket.off('clearCanvas', handleClearCanvas);
      newSocket.close();
    };
  }, [roomCode, roomId]);

  // Update drawing styles when they change
  useEffect(() => {
    if (!contextRef.current) return;
    contextRef.current.strokeStyle = selectedColor;
    contextRef.current.lineWidth = brushSize;
  }, [selectedColor, brushSize]);

  const handleClearCanvas = () => {
    if (!canvasRef.current || !contextRef.current) return;
    contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const handleDrawEvent = (data: DrawData) => {
    if (!contextRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const ctx = contextRef.current;
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.brushSize;

    switch (data.tool) {
      case 'brush':
        if (data.type === 'start') {
          ctx.beginPath();
          ctx.moveTo((data.x * scaleX) / 2, (data.y * scaleY) / 2);
        } else if (data.type === 'draw') {
          ctx.lineTo((data.x * scaleX) / 2, (data.y * scaleY) / 2);
          ctx.stroke();
        } else if (data.type === 'end') {
          ctx.closePath();
        }
        break;

      case 'rectangle':
        if (data.type === 'draw' && data.points) {
          const [start, end] = data.points;
          const width = ((end.x - start.x) * scaleX) / 2;
          const height = ((end.y - start.y) * scaleY) / 2;
          
          // Clear previous preview
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (canvasHistory.current.length > 0) {
            ctx.putImageData(canvasHistory.current[canvasHistory.current.length - 1], 0, 0);
          }
          
          ctx.beginPath();
          ctx.strokeRect(
            (start.x * scaleX) / 2,
            (start.y * scaleY) / 2,
            width,
            height
          );
        } else if (data.type === 'end' && data.points) {
          const [start, end] = data.points;
          const width = ((end.x - start.x) * scaleX) / 2;
          const height = ((end.y - start.y) * scaleY) / 2;
          
          // Save current state before drawing final shape
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          canvasHistory.current.push(imageData);
          onHistoryUpdate([...canvasHistory.current], canvasHistory.current.length - 1);
          
          ctx.beginPath();
          ctx.strokeRect(
            (start.x * scaleX) / 2,
            (start.y * scaleY) / 2,
            width,
            height
          );
        }
        break;

      case 'circle':
        if (data.type === 'draw' && data.points) {
          const [start, end] = data.points;
          const radius = Math.sqrt(
            Math.pow(((end.x - start.x) * scaleX) / 2, 2) +
            Math.pow(((end.y - start.y) * scaleY) / 2, 2)
          );
          
          // Clear previous preview
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (canvasHistory.current.length > 0) {
            ctx.putImageData(canvasHistory.current[canvasHistory.current.length - 1], 0, 0);
          }
          
          ctx.beginPath();
          ctx.arc(
            (start.x * scaleX) / 2,
            (start.y * scaleY) / 2,
            radius,
            0,
            2 * Math.PI
          );
          ctx.stroke();
        } else if (data.type === 'end' && data.points) {
          const [start, end] = data.points;
          const radius = Math.sqrt(
            Math.pow(((end.x - start.x) * scaleX) / 2, 2) +
            Math.pow(((end.y - start.y) * scaleY) / 2, 2)
          );
          
          // Save current state before drawing final shape
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          canvasHistory.current.push(imageData);
          onHistoryUpdate([...canvasHistory.current], canvasHistory.current.length - 1);
          
          ctx.beginPath();
          ctx.arc(
            (start.x * scaleX) / 2,
            (start.y * scaleY) / 2,
            radius,
            0,
            2 * Math.PI
          );
          ctx.stroke();
        }
        break;

      case 'line':
        if (data.type === 'draw' && data.points) {
          const [start, end] = data.points;
          
          // Clear previous preview
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (canvasHistory.current.length > 0) {
            ctx.putImageData(canvasHistory.current[canvasHistory.current.length - 1], 0, 0);
          }
          
          ctx.beginPath();
          ctx.moveTo((start.x * scaleX) / 2, (start.y * scaleY) / 2);
          ctx.lineTo((end.x * scaleX) / 2, (end.y * scaleY) / 2);
          ctx.stroke();
        } else if (data.type === 'end' && data.points) {
          const [start, end] = data.points;
          
          // Save current state before drawing final shape
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          canvasHistory.current.push(imageData);
          onHistoryUpdate([...canvasHistory.current], canvasHistory.current.length - 1);
          
          ctx.beginPath();
          ctx.moveTo((start.x * scaleX) / 2, (start.y * scaleY) / 2);
          ctx.lineTo((end.x * scaleX) / 2, (end.y * scaleY) / 2);
          ctx.stroke();
        }
        break;
    }
  };

  const startDrawing = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    if (!contextRef.current || !canvasRef.current || !socket) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = nativeEvent.offsetX;
    const y = nativeEvent.offsetY;

    setIsDrawing(true);
    setStartPos({ x, y });
    lastPositionRef.current = { x, y };

    socket.emit('draw', {
      x,
      y,
      color: selectedColor,
      brushSize,
      tool: selectedTool,
      type: 'start',
      roomId,
      roomCode
    });
  };

  const draw = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current || !canvasRef.current || !socket || !startPos) return;

    const x = nativeEvent.offsetX;
    const y = nativeEvent.offsetY;

    if (selectedTool === 'brush') {
      socket.emit('draw', {
        x,
        y,
        color: selectedColor,
        brushSize,
        tool: selectedTool,
        type: 'draw',
        roomId,
        roomCode
      });
    } else {
      // For shape tools, emit draw events for preview
      socket.emit('draw', {
        x,
        y,
        color: selectedColor,
        brushSize,
        tool: selectedTool,
        type: 'draw',
        points: [startPos, { x, y }],
        roomId,
        roomCode
      });
    }

    lastPositionRef.current = { x, y };
  };

  const finishDrawing = () => {
    if (!isDrawing || !socket || !startPos || !lastPositionRef.current) return;

    if (selectedTool !== 'brush') {
      socket.emit('draw', {
        x: 0,
        y: 0,
        color: selectedColor,
        brushSize,
        tool: selectedTool,
        type: 'end',
        points: [startPos, lastPositionRef.current],
        roomId,
        roomCode
      });
    }

    setIsDrawing(false);
    setStartPos(null);
    lastPositionRef.current = null;
  };

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-[600px] bg-white rounded-lg cursor-crosshair"
      onMouseDown={startDrawing}
      onMouseUp={finishDrawing}
      onMouseMove={draw}
      onMouseLeave={finishDrawing}
    />
  );
} 