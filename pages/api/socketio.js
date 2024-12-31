import { Server } from 'socket.io';

const ioHandler = (req, res) => {
    if (!res.socket.server.io) {
        console.log('*First use, starting socket.io');

        const io = new Server(res.socket.server, {
            path: '/socket.io',
            addTrailingSlash: false,
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            },
            transports: ['websocket', 'polling'],
        });

        const users = new Map();

        io.on('connection', (socket) => {
            console.log('A user connected');
            
            socket.on('register', (username) => {
                users.set(socket.id, {
                    username,
                    color: '#000000',
                    brushSize: 5,
                    tool: 'brush'
                });
                
                io.emit('userList', Array.from(users.values()));
                socket.broadcast.emit('userJoined', {
                    username,
                    userId: socket.id
                });
            });

            socket.on('canvas-data', (data) => {
                socket.broadcast.emit('canvas-data', data);
            });
            
            socket.on('cursor-move', (data) => {
                socket.broadcast.emit('cursor-move', {
                    x: data.x, 
                    y: data.y,
                    username: users.get(socket.id)?.username,
                    userId: socket.id
                });
            });
            
            socket.on('disconnect', () => {
                const user = users.get(socket.id);
                if (user) {
                    io.emit('userLeft', {
                        username: user.username,
                        userId: socket.id
                    });
                    users.delete(socket.id);
                    io.emit('userList', Array.from(users.values()));
                }
                console.log('A user disconnected');
            });
        });

        res.socket.server.io = io;
    }
    res.end();
};

export const config = {
    api: {
        bodyParser: false
    }
};

export default ioHandler; 