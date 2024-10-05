const pool = require("../config/pool");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { generateVerificationCode, getUserInfo } = require("../utils/authUtils");

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

exports.loginController = async (req, res) => {
    const { identifier, password } = req.body;
    pool.query('SELECT * FROM users WHERE email = $1 or username = $1', [identifier], async (error, results) => {
        if (error) {
            throw error;
        }
        if (results.rows.length === 0) {
            return res.status(400).send({
                message: 'Thông tin đăng nhập không chính xác!'
            });
        }
        const user = results.rows[0];
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (isPasswordMatch) {
            const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
            user.jwt = token;
            return res.status(200).send({
                data: user,
                message: 'Đăng nhập thành công!'
            });
        } else {
            return res.status(400).send({
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

    try {
        const data = await pool.query(`
            INSERT INTO users (email, fullname, username, password) 
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `,
            [email, fullname, username, hashedPassword])
        const user = data.rows[0];

        const VERIFICATION_CODE = generateVerificationCode();
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        await pool.query(`
            INSERT INTO email_verifications (user_id, verification_code, expires_at, created_at)
            VALUES ($1, $2, NOW() + INTERVAL '5 minutes', NOW())
        `, [user.id, VERIFICATION_CODE]);

        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: 'Xác thực tài khoản từ ứng dụng SecureChat',
            text: `Mã xác thực của bạn là: ${VERIFICATION_CODE}, mã này sẽ hết hạn sau 5 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.`
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });


        res.status(201).send({
            message: 'Đăng ký thành công, vui lòng kiểm tra hòm thư của bạn!',
            data: user
        });
    } catch (error) {
        console.log(error);
        res.status(400).send({
            message: 'Có lỗi xảy ra, vui lòng thử lại sau!'
        });
    }
};

exports.changePasswordController = async (req, res) => {
    const { old_password, new_password } = req.body;
    const user_id = req.user.id;

    if (!old_password || !new_password) {
        return res.status(400).send({
            message: 'Mật khẩu cũ và mật khẩu mới không được để trống!'
        });
    }

    try {
        const result = await pool.query('SELECT password FROM users WHERE id = $1', [user_id]);
        const user = result.rows[0];

        const isPasswordMatch = await bcrypt.compare(old_password, user.password);
        if (!isPasswordMatch) {
            return res.status(400).send({
                message: 'Mật khẩu cũ không chính xác!'
            });
        }

        const hashedNewPassword = await bcrypt.hash(new_password, 10);
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedNewPassword, user_id]);

        res.status(200).send({
            message: 'Đổi mật khẩu thành công!'
        });
    } catch (error) {
        console.log(error);
        res.status(400).send({
            message: 'Có lỗi xảy ra, vui lòng thử lại sau!'
        });
    }
};

exports.meController = async (req, res) => {
    res.status(200).send(req.user);
};

exports.verifyEmailController = async (req, res) => {
    const { user_id, code } = req.body;
    console.log(user_id, code);

    const result = await pool.query(`
        SELECT * FROM email_verifications 
        WHERE user_id = $1 AND verification_code = $2 AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1
    `, [user_id, code]);

    if (result.rows.length === 0) {
        return res.status(400).send({
            message: 'Mã xác thực không hợp lệ hoặc đã hết hạn!'
        });
    }

    await pool.query(`
        UPDATE users
        SET is_verified = true
        WHERE id = $1
    `, [user_id]);

    res.status(200).send({
        message: 'Xác thực email thành công!'
    });
};

exports.resendVerificationCodeController = async (req, res) => {
    const { user_id } = req.body;
    const VERIFICATION_CODE = generateVerificationCode();
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    const user = await getUserInfo(user_id);

    await pool.query(`
        INSERT INTO email_verifications (user_id, verification_code, expires_at, created_at)
        VALUES ($1, $2, NOW() + INTERVAL '5 minutes', NOW())
    `, [user_id, VERIFICATION_CODE]);

    const mailOptions = {
        from: process.env.EMAIL,
        to: user.email,
        subject: 'Xác thực tài khoản từ ứng dụng SecureChat',
        text: `Mã xác thực của bạn là: ${VERIFICATION_CODE}, mã này sẽ hết hạn sau 5 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.`
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });

    res.status(200).send({
        message: 'Gửi lại mã xác thực thành công!'
    });
}

exports.updateAvatarController = async (req, res) => {
    const { avatar_path } = req.body;
    const user_id = req.user.id;

    if (!avatar_path) {
        return res.status(400).send({
            message: 'URL ảnh đại diện không được để trống!'
        });
    }

    try {
        await pool.query(`
            UPDATE users
            SET avatar_path = $1
            WHERE id = $2
        `, [avatar_path, user_id]);

        res.status(200).send({
            message: 'Cập nhật ảnh đại diện thành công!'
        });
    } catch (error) {
        console.log(error);
        res.status(400).send({
            message: 'Có lỗi xảy ra, vui lòng thử lại sau!'
        });
    }
};

exports.updateFullnameController = async (req, res) => {
    const { fullname } = req.body;
    const user_id = req.user.id;
    console.log('usae id', user_id);
    

    if (!fullname) {
        return res.status(400).send({
            message: 'Họ tên không được để trống!'
        });
    }

    try {
        await pool.query(`
            UPDATE users
            SET fullname = $1
            WHERE id = $2
        `, [fullname, user_id]);

        res.status(200).send({
            message: 'Cập nhật họ tên thành công!'
        });
    } catch (error) {
        console.log(error);
        res.status(400).send({
            message: 'Có lỗi xảy ra, vui lòng thử lại sau!'
        });
    }
};

exports.setPublicKeyController = async (req, res) => {
    const { public_key } = req.body;
    const user_id = req.user.id;

    if (!public_key) {
        return res.status(400).send({
            message: 'Khóa công khai không được để trống!'
        });
    }

    try {
        await pool.query(`
            UPDATE users
            SET public_key = $1
            WHERE id = $2
        `, [public_key, user_id]);

        res.status(200).send({
            message: 'Cập nhật khóa công khai thành công!'
        });
    } catch (error) {
        console.log(error);
        res.status(400).send({
            message: 'Có lỗi xảy ra, vui lòng thử lại sau!'
        });
    }
};