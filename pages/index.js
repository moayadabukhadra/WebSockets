import { useEffect, useState } from 'react';
import Head from 'next/head';
import io from 'socket.io-client';
import dynamic from 'next/dynamic';

// Dynamically import the Whiteboard component with no SSR
const Whiteboard = dynamic(() => import('../components/Whiteboard'), {
  ssr: false
});

export default function Home() {
  const [socket, setSocket] = useState(null);
  const [fabricLoaded, setFabricLoaded] = useState(false);

  useEffect(() => {
    const loadFabric = async () => {
      if (typeof window !== 'undefined' && !window.fabric) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js';
        script.onload = () => setFabricLoaded(true);
        document.head.appendChild(script);
      } else {
        setFabricLoaded(true);
      }
    };
    loadFabric();
  }, []);

  useEffect(() => {
    // Initialize socket connection
    const initSocket = async () => {
      await fetch('/api/socketio');
      const socket = io({
        path: '/socket.io',
        addTrailingSlash: false,
      });
      setSocket(socket);
    };

    initSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  if (!socket || !fabricLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>Enhanced Collaborative Whiteboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <Whiteboard socket={socket} />
    </>
  );
} 