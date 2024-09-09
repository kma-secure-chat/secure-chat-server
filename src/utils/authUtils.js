const pool = require("../config/pool");

exports.getUserInfo = async (id) => {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id])
    if (result.rows.length === 0) {
        return null;
    }
    return result.rows[0];
}

exports.generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000);
}