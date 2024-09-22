const { createNewConversations, sendMessage, getConversations, getMessages } = require("../controllers/chatControllers");
const { verifyJwt } = require('../middleware/verifyJwt');

module.exports = (app, upload) => {
    app.get('/api/conversations', verifyJwt, getConversations);
    app.post('/api/conversation/new', verifyJwt, createNewConversations);

    app.get('/api/messages/', verifyJwt, getMessages);
    app.post('/api/messages/send', verifyJwt, sendMessage);

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