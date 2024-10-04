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
        socket.on('send_message', async ({ conversationId, senderId, receiverId, message, attachments }) => {
            const receiverSocketId = users[receiverId];
            const { rows } = await pool.query('SELECT message_expire_minutes FROM conversations WHERE id = $1', [conversationId]);
            if (rows.length === 0) {
                return res.status(404).send({ message: 'Conversation not found' });
            }
            const messageExpireMinutes = rows[0].message_expire_minutes;
            const expiredAt = messageExpireMinutes ? new Date(Date.now() + messageExpireMinutes * 60000) : null;

            const messageContent = await pool.query('INSERT INTO messages (conversation_id, sender_id, content, created_at, is_read, is_deleted, expired_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [conversationId, senderId, message, new Date(), false, false, expiredAt]);
            if (attachments) {
                for (let attachment of attachments) {
                    await pool.query('INSERT INTO attachments (message_id, file_path, file_type, created_at) VALUES ($1, $2, $3, $4)',
                        [messageContent.rows[0].id, attachment.path, attachment.mimetype, new Date()]);
                }
            }

            if (receiverSocketId) {
                // Gửi tin nhắn cho người nhận (receiver)
                io.to(receiverSocketId).emit('receive_message', {
                    senderId,
                    message: messageContent.rows[0],
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
