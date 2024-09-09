const pool = require("../config/pool");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

exports.loginController = async (req, res) => {
    const { identifier, password } = req.body;
    pool.query('SELECT * FROM users WHERE email = $1 or username = $1', [identifier], async (error, results) => {
        if (error) {
            throw error;
        }
        if (results.rows.length === 0) {
            return res.status(401).send({
                message: 'Thông tin đăng nhập không chính xác!'
            });
        }
        const user = results.rows[0];
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (isPasswordMatch) {
            const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
            user.jwt = token;
            return res.status(200).send({
                data: user,
                message: 'Đăng nhập thành công!'
            });
        } else {
            return res.status(401).send({
                message: 'Thông tin đăng nhập không chính xác!'
            });
        }
    });
};

exports.registerController = async (req, res) => {
    const { email, fullname, username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    if (!email) {
        return res.status(400).send({
            message: 'Email không được để trống!'
        });
    } else if (!fullname) {
        return res.status(400).send({
            message: 'Họ tên không được để trống!'
        });
    } else if (!username) {
        return res.status(400).send({
            message: 'Tên đăng nhập không được để trống!'
        });
    } else if (!password) {
        return res.status(400).send({
            message: 'Mật khẩu không được để trống!'
        });
    }

    pool.query(`
            INSERT INTO users (email, fullname, username, password) 
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `,
        [email, fullname, username, hashedPassword], (error, results) => {
            if (error) {
                throw error;
            }

            res.status(201).send({
                message: 'Đăng ký thành công!',
                data: results.rows[0]
            });
        });
}

exports.meController = async (req, res) => {
    res.status(200).send(req.user);
}