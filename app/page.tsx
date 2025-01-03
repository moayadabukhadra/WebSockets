"use client";
import { socket } from './socket';
import Head from 'next/head';
import Whiteboard from './components/Whiteboard';


const Home: React.FC = () => {


  if (!socket) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>Enhanced Collaborative Whiteboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <Whiteboard />
    </>
  );
};

export default Home;
