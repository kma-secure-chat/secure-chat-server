const { createNewConversations, sendMessage, getConversations, getMessages, findConversation, getConversation } = require("../controllers/chatControllers");
const { verifyJwt } = require('../middleware/verifyJwt');
const { setConversationMessageExpireMinutes } = require("../controllers/chatControllers");
const { deleteMessage } = require("../controllers/chatControllers");

module.exports = (app, upload) => {
    app.get('/api/conversations', verifyJwt, getConversations);
    app.get('/api/conversation/:conversation_id', verifyJwt, getConversation);
    app.post('/api/conversation/new', verifyJwt, createNewConversations);
    app.post('/api/conversations/:conversation_id/expire', verifyJwt, setConversationMessageExpireMinutes);
    app.get('/api/conversation/find/:receiver_id', verifyJwt, findConversation);

    app.get('/api/messages/', verifyJwt, getMessages);
    app.post('/api/messages/send', verifyJwt, sendMessage);
    app.delete('/api/messages/:message_id', verifyJwt, deleteMessage);

    app.post('/api/upload', upload.array('files'), (req, res) => {
        try {
            res.send({
                message: 'File uploaded successfully',
                data: {
                    files: req.files
                }
            });
        } catch (error) {
            res.status(400).send({ error: 'File upload failed' });
        }
    });
}