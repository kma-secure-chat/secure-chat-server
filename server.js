const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json({ limit: '5000mb' }));
app.use(express.urlencoded({ extended: false, limit: '5000mb' }));

require('./src/routes/authRoutes')(app);
require('./src/routes/chatRoutes')(app);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('an user connected');

    // Handle a user sending a message
    socket.on('chat message', (msg) => {
        let formattedMsg = {
            id: 10,
            text: msg,
            sent_at: "2024-08-23T09:19:01.333Z",
            user: {
                id: 4,
                status: 'away',
                name: "Jane Smith",
                avatar: "https://randomuser.me/api/portraits"
            }
        }

        io.emit('chat message', formattedMsg);
    });

    // Handle a user disconnecting
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
