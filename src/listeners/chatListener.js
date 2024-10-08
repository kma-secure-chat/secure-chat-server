const pool = require('../config/pool');

// Danh sách lưu trữ người dùng và socket ID
const users = {};

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        // Xử lý khi người dùng đăng nhập, lưu thông tin userID và socketID
        socket.on('user_connected', (userId) => {
            users[userId] = socket.id;
            console.log(`User ${userId} connected with socket ID ${socket.id}`);
        });

        // Nhận tin nhắn từ một người dùng
        socket.on('send_message', async ({ senderId, receiverId, message, attachments }) => {
            const receiverSocketId = users[receiverId];

            if (receiverSocketId) {
                // Gửi tin nhắn cho người nhận (receiver)
                io.to(receiverSocketId).emit('receive_message', {
                    senderId,
                    message: message,
                    attachments: attachments
                });
            } else {
                console.log('Receiver is not online');
            }
        });

        // Xử lý khi người dùng ngắt kết nối
        socket.on('disconnect', () => {
            // Tìm và xóa người dùng ra khỏi danh sách users
            for (let userId in users) {
                if (users[userId] === socket.id) {
                    delete users[userId];
                    console.log(`User ${userId} disconnected`);
                    break;
                }
            }
        });
    });
};
