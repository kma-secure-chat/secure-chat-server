const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Check if a unique folder is already set for this request
        if (!req.uniqueFolder) {
            // If not, create it once
            const UNIQUE_ID = new Date().toISOString();
            req.uniqueFolder = `./uploads/${UNIQUE_ID}`;
            fs.mkdirSync(req.uniqueFolder, { recursive: true });
        }
        cb(null, req.uniqueFolder); // Use the same folder for all files in this request
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use('/uploads', express.static('uploads'));

app.use(express.json({ limit: '5000mb' }));
app.use(express.urlencoded({ extended: false, limit: '5000mb' }));

require('./src/routes/authRoutes')(app);
require('./src/routes/chatRoutes')(app, upload);

require('./src/listeners/chatListener')(io);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
