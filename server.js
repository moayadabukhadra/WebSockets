const { createServer } = require('http');
const next = require('next');
const { Server } = require('socket.io');


const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer, {
    path: '/socket.io',
    addTrailingSlash: false,
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  const users = new Map();

  io.on('connection', (socket) => {
    console.log('A user connected');

    // Send the existing users list to the new user
    socket.emit('userList', Array.from(users.values()));

    socket.on('register', (username) => {
      console.log("🚀 ~ socket.on ~ username:", username);
      users.set(socket.id, {
        username,
        color: '#000000',
        brushSize: 5,
        tool: 'brush',
      });

      // Emit the updated user list to all clients
      io.emit('userList', Array.from(users.values()));
    });

    socket.on('canvas-data', (data) => {
      socket.broadcast.emit('canvas-data', data);
    });

    socket.on('cursor-move', (data) => {
      socket.broadcast.emit('cursor-move', {
        ...data,
        userId: socket.id,
        username: users.get(socket.id)?.username
      });
    });

    socket.on('disconnect', () => {
      const user = users.get(socket.id);
      if (user) {
        io.emit('userLeft', {
          username: user.username,
          userId: socket.id,
        });
        users.delete(socket.id);
        io.emit('userList', Array.from(users.values()));
      }
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
