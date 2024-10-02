const pool = require("../config/pool");

exports.findConversation = async (req, res) => {
    const { receiver_id } = req.params;

    pool.query('SELECT * FROM conversations WHERE (user_one_id = $1 AND user_two_id = $2) OR (user_one_id = $2 AND user_two_id = $1)', [req.user.id, receiver_id], (error, results) => {
        if (error) {
            throw error;
        }

        if (results.rows.length > 0) {
            res.status(200).send(results.rows[0]);
        } else {
            res.status(200).send(null);
        }
    });
};

exports.getConversations = async (req, res) => {
    pool.query(`
            SELECT
                c.id,
                CASE WHEN c.user_one_id = $1 THEN u2.fullname ELSE u1.fullname
                END AS name,
                CASE WHEN c.user_one_id = $1 THEN u2.avatar_path ELSE u1.avatar_path END AS avatar,
                c.user_one_id,
                c.user_two_id,
                m.content AS last_message,
                m.created_at AS last_message_time
            FROM
                conversations c
            JOIN
                users u1 ON u1.id = c.user_one_id
            JOIN 
                users u2 ON u2.id = c.user_two_id
            LEFT JOIN
                (
                    SELECT 
                        DISTINCT ON (conversation_id) conversation_id, content, created_at
                    FROM 
                        messages
                    ORDER BY 
                        conversation_id, created_at DESC
                ) m ON m.conversation_id = c.id
            WHERE
                c.user_one_id = $1 OR c.user_two_id = $1;

        `, [req.user.id], (error, results) => {
        if (error) {
            throw error;
        }
        res.status(200).send(results.rows);
    });
}

exports.getConversation = async (req, res) => {
    const { conversation_id } = req.params;

    pool.query(`
        SELECT
            c.id,
                CASE WHEN c.user_one_id = $1 THEN u2.fullname ELSE u1.fullname
                END AS name,
                c.user_one_id,
                c.user_two_id,
                m.content as last_message,
                m.created_at as last_message_time
            FROM
                conversations c
            JOIN
                users u1 ON u1.id = c.user_one_id
            JOIN 
                users u2 ON u2.id = c.user_two_id
        LEFT JOIN
            (SELECT id, conversation_id, content, created_at
            FROM messages
            ORDER BY created_at DESC
            LIMIT 1) m ON m.conversation_id = c.id
        WHERE
            c.id = $1
    `, [conversation_id], (error, results) => {
        if (error) {
            throw error;
        }
        if (results.rows.length > 0) {
            res.status(200).send(results.rows[0]);
        } else {
            res.status(404).send({ message: 'Conversation not found' });
        }
    });
};

exports.createNewConversations = async (req, res) => {
    const { user_two_id } = req.body;

    pool.query('INSERT INTO conversations (user_one_id, user_two_id, created_at) VALUES ($1, $2, $3) RETURNING *', [req.user.id, user_two_id, new Date()], (error, results) => {
        if (error) {
            throw error;
        }
        res.status(201).send(results.rows[0]);
    });
};

exports.getMessages = async (req, res) => {
    const { conversation_id } = req.query;
    const { limit = 10 } = req.query;

    pool.query(`
        WITH last_messages AS (
            SELECT 
                m.*, 
                COALESCE(json_agg(a.*) FILTER (WHERE a.id IS NOT NULL), '[]') AS attachments 
            FROM 
                messages m 
            LEFT JOIN 
                attachments a 
            ON 
                m.id = a.message_id 
            WHERE 
                m.conversation_id = $1 
            GROUP BY 
                m.id
            ORDER BY 
                m.created_at DESC
            LIMIT $2
        )
        SELECT *
        FROM last_messages
        ORDER BY created_at ASC;

    `, [conversation_id, limit], (error, results) => {
        if (error) {
            throw error;
        }
        res.status(200).send(results.rows);
    });
}

exports.sendMessage = async (req, res) => {
    const { conversation_id, content } = req.body;

    pool.query('INSERT INTO messages (conversation_id, sender_id, content, created_at, is_read, is_deleted) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [conversation_id, req.user.id, content, new Date(), false, false], (error, results) => {
        if (error) {
            throw error;
        }
        res.status(201).send(results.rows[0]);
    });
}