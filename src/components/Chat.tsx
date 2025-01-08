'use client';

import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

interface ChatProps {
  socket: Socket;
  isDrawing: boolean;
  roomId: string;
}

interface Message {
  type: 'system' | 'chat' | 'correct';
  player?: string;
  content: string;
  isDrawer?: boolean;
}

export default function Chat({ socket, isDrawing, roomId }: ChatProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socket.on('message', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('correctGuess', (data: { guesser: string; word: string; timeBonus: number }) => {
      setMessages(prev => [...prev, {
        type: 'correct',
        content: `🎉 ${data.guesser} correctly guessed the word "${data.word}"! (+${data.timeBonus} time bonus)`
      }]);
    });

    return () => {
      socket.off('message');
      socket.off('correctGuess');
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isDrawing) return;
    
    socket.emit('guess', message);
    setMessage('');
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
      <div className="h-48 overflow-y-auto mb-4 space-y-2">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`p-2 rounded ${
              msg.type === 'system' 
                ? 'bg-gray-700 text-gray-300' 
                : msg.type === 'correct'
                ? 'bg-green-800 text-white'
                : 'bg-gray-700'
            }`}
          >
            {msg.type === 'chat' && (
              <span className={`font-bold ${msg.isDrawer ? 'text-purple-400' : 'text-blue-400'}`}>
                {msg.player}:{' '}
              </span>
            )}
            {msg.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={isDrawing ? "You're drawing!" : "Type your guess..."}
          disabled={isDrawing}
          className="flex-1 px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-purple-500 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isDrawing}
          className="bg-purple-500 text-white px-4 py-2 rounded font-semibold hover:bg-purple-600 disabled:opacity-50 disabled:hover:bg-purple-500"
        >
          Guess
        </button>
      </form>
    </div>
  );
} 