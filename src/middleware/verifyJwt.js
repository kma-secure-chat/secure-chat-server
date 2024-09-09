const { getUserInfo } = require('../utils/authUtils');

exports.verifyJwt = (req, res, next) => {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET;
    const token = req.headers['authorization']?.split(' ')[1];
    console.log(token);

    if (!token) {
        return res.status(401).send({
            message: 'Unauthorized'
        });
    }
    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(401).send({
                message: 'Unauthorized'
            });
        }
        req.user = await getUserInfo(decoded.id);
        console.log(req.user);
        
        if (!req.user) {
            return res.status(401).send({
                message: 'Unauthorized'
            });
        }
        next();
    });
};