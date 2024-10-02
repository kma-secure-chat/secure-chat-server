const { loginController, registerController, meController, verifyEmailController, resendVerificationCodeController } = require('../controllers/authControllers');
const { verifyJwt } = require('../middleware/verifyJwt');
const { updateAvatarController } = require('../controllers/authControllers');
const { updateFullnameController } = require('../controllers/authControllers');

module.exports = (app) => {
    app.post('/api/auth/login', loginController);
    app.post('/api/auth/register', registerController);
    app.get('/api/auth/me', verifyJwt, meController);
    app.post('/api/auth/verify', verifyEmailController);
    app.post('/api/auth/resend-verification', resendVerificationCodeController);
    app.put('/api/auth/update-avatar', verifyJwt, updateAvatarController);
    app.put('/api/auth/update-fullname', verifyJwt, updateFullnameController);
} 