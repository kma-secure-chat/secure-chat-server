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

require('./src/listeners/chatListener')(io);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
