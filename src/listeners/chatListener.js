// Danh sách lưu trữ người dùng và socket ID
const users = {};

module.exports = (io) => {
    io.on('connection', (socket) => {
        // Khi người dùng kết nối, lưu thông tin username và socket ID
        const username = socket.user.username;
        users[username] = socket.id;  // Lưu socket ID theo username

        console.log(`${username} đã kết nối với socket ID: ${socket.id}`);

        // Xử lý khi nhận tin nhắn
        socket.on('private_message', (data) => {
            const { recipient, message } = data;

            // Tìm socket ID của người nhận
            const recipientSocketId = users[recipient];
            if (recipientSocketId) {
                // Gửi tin nhắn tới đúng người
                io.to(recipientSocketId).emit('private_message', {
                    sender: username,
                    message: message
                });
            } else {
                console.log(`Người dùng ${recipient} không kết nối`);
            }
        });

        // Xử lý khi người dùng ngắt kết nối
        socket.on('disconnect', () => {
            console.log(`${username} đã ngắt kết nối`);
            delete users[username];  // Xóa người dùng khi ngắt kết nối
        });
    });
};
