const { loginController, registerController, meController, verifyEmailController, resendVerificationCodeController } = require('../controllers/authControllers');
const { verifyJwt } = require('../middleware/verifyJwt');

module.exports = (app) => {
    app.post('/api/auth/login', loginController);
    app.post('/api/auth/register', registerController);
    app.get('/api/auth/me', verifyJwt, meController);
    app.post('/api/auth/verify', verifyEmailController);
    app.post('/api/auth/resend-verification', resendVerificationCodeController);
} 