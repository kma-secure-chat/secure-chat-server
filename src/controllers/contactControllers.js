const pool = require("../config/pool");

exports.getPendingRequests = async (req, res) => {
    pool.query(`
        SELECT
            fr.id,
            u.id as sender_id,
            u.username as sender_username,
            u.fullname as sender_name
        FROM
            friend_requests fr
        JOIN
            users u ON u.id = fr.sender_id
        WHERE
            fr.receiver_id = $1
        AND fr.status = 1
    `, [req.user.id], (error, results) => {
        if (error) {
            throw error;
        }
        res.status(200).send(results.rows);
    });
}

exports.sendFriendRequest = async (req, res) => {
    const { receiver_id } = req.body;

    pool.query('INSERT INTO friend_requests (sender_id, receiver_id, status, created_at) VALUES ($1, $2, $3, $4) RETURNING *', [req.user.id, receiver_id, 1, new Date()], (error, results) => {
        if (error) {
            throw error;
        }
        res.status(201).send(results.rows[0]);
    });
}

exports.updateFriendRequest = async (req, res) => {
    const { request_id } = req.params;
    const { status } = req.body;
    const result = await pool.query('UPDATE friend_requests SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *',
        [status, new Date(), request_id]);
    const friendRequest = result.rows[0];

    if (status == 3) {
        await pool.query(
            'INSERT INTO friends (user_id, friend_id, created_at) VALUES ($1, $2, $3), ($4, $5, $6)',
            [friendRequest.sender_id, friendRequest.receiver_id, new Date(), friendRequest.receiver_id, friendRequest.sender_id, new Date()],
            (error, results) => {
                if (error) {
                    throw error;
                }
                res.status(201).send(results.rows);
            }
        );
    } else {
        res.status(200).send(friendRequest);
    }
}

exports.getFriends = async (req, res) => {
    pool.query(`
        SELECT
            u.*
        FROM
            users u
        JOIN
            friends f ON u.id = f.friend_id
        WHERE
            f.user_id = $1
    `, [req.user.id], (error, results) => {
        if (error) {
            throw error;
        }
        res.status(200).send(results.rows);
    });
}

exports.searchUsers = async (req, res) => {
    const { search } = req.query;

    pool.query(`
        SELECT DISTINCT
            u.*,
            CASE
                WHEN fr.id IS NOT NULL AND fr.status != 2 THEN 'request_sent'
                WHEN f.id IS NOT NULL THEN 'friends'
                ELSE 'none'
            END as relationship_status
        FROM
            users u
        LEFT JOIN
            friend_requests fr ON u.id = fr.receiver_id AND fr.sender_id = $2
        LEFT JOIN
            friends f ON (u.id = f.friend_id AND f.user_id = $2) OR (u.id = f.user_id AND f.friend_id = $2)
        WHERE
            (u.username ILIKE $1 OR u.email ILIKE $1)
        AND u.id != $2
    `, [`%${search}%`, req.user.id], (error, results) => {
        if (error) {
            throw error;
        }
        res.status(200).send(results.rows);
    });
}