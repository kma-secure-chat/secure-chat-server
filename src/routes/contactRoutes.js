const { getPendingRequests } = require('../controllers/contactControllers');
const { verifyJwt } = require('../middleware/verifyJwt');
const { updateFriendRequest } = require('../controllers/contactControllers');
const { getFriends } = require('../controllers/contactControllers');
const { searchUsers: searchFriends } = require('../controllers/contactControllers');
const { sendFriendRequest } = require('../controllers/contactControllers');

module.exports = (app) => {
    app.get('/api/friend-requests', verifyJwt, getPendingRequests);
    app.put('/api/friend-requests/:request_id', verifyJwt, updateFriendRequest);
    app.get('/api/friends', verifyJwt, getFriends);
    app.get('/api/contact/search', verifyJwt, searchFriends);
    app.post('/api/friend-requests', verifyJwt, sendFriendRequest);
}