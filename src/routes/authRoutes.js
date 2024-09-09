const { loginController, registerController, meController } = require('../controllers/authControllers');
const { verifyJwt } = require('../middleware/verifyJwt');

module.exports = (app) => {
    app.post('/api/auth/login', loginController);
    app.post('/api/auth/register', registerController);
    app.get('/api/auth/me', verifyJwt, meController);
} 