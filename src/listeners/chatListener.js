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
        socket.on('send_message', async ({ conversationId, senderId, receiverId, message }) => {
            const receiverSocketId = users[receiverId];
            const messageContent = await pool.query('INSERT INTO messages (conversation_id, sender_id, content, created_at, is_read, is_deleted) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [conversationId, senderId, message, new Date(), false, false]);
            
            if (receiverSocketId) {
                // Gửi tin nhắn cho người nhận (receiver)
                io.to(receiverSocketId).emit('receive_message', {
                    senderId,
                    message: messageContent.rows[0]
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
