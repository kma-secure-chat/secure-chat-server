const { createNewConversations, sendMessage, getConversations, getMessages } = require("../controllers/chatControllers");
const { verifyJwt } = require('../middleware/verifyJwt');

module.exports = (app) => {
    app.get('/api/conversations', verifyJwt, getConversations);
    app.post('/api/conversation/new', verifyJwt, createNewConversations);

    app.get('/api/messages/', verifyJwt, getMessages);
    app.post('/api/messages/send', verifyJwt, sendMessage);
}