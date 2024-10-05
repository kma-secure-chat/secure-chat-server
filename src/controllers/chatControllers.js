const pool = require("../config/pool");

exports.findConversation = async (req, res) => {
    const { receiver_id } = req.params;

    pool.query(`SELECT * FROM conversations 
        WHERE (user_one_id = $1 AND user_two_id = $2) 
        OR (user_one_id = $2 AND user_two_id = $1)`,
        [req.user.id, receiver_id], (error, results) => {
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
            CASE WHEN c.user_one_id = $1 THEN u2.fullname ELSE u1.fullname END AS name,
            CASE WHEN c.user_one_id = $1 THEN u2.avatar_path ELSE u1.avatar_path END AS avatar,
            CASE WHEN c.user_one_id = $1 THEN u2.public_key ELSE u1.public_key END AS public_key,
            c.user_one_id,
            c.user_two_id,
            c.message_expire_minutes,
            m.content AS last_message,
            m.created_at AS last_message_time,
            COALESCE(unseen.unseen_count, 0) AS unseen_count
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
        LEFT JOIN
            (
                SELECT 
                    conversation_id, COUNT(*) AS unseen_count
                FROM 
                    messages
                WHERE 
                    is_read = false AND sender_id != $1
                GROUP BY 
                    conversation_id
            ) unseen ON unseen.conversation_id = c.id
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
                CASE WHEN c.user_one_id = $2 THEN u2.fullname ELSE u1.fullname END AS name,
                CASE WHEN c.user_one_id = $1 THEN u2.avatar_path ELSE u1.avatar_path END AS avatar,
                CASE WHEN c.user_one_id = $1 THEN u2.public_key ELSE u1.public_key END AS public_key,
                c.user_one_id,
                c.user_two_id,
                c.message_expire_minutes,
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
    `, [conversation_id, req.user.id], (error, results) => {
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

exports.setConversationMessageExpireMinutes = async (req, res) => {
    const { message_expire_minutes } = req.body;
    const { conversation_id } = req.params;

    pool.query('UPDATE conversations SET message_expire_minutes = $1 WHERE id = $2 RETURNING *', [message_expire_minutes, conversation_id], (error, results) => {
        if (error) {
            throw error;
        }
        if (results.rows.length > 0) {
            res.status(200).send({
                message: `Đã cập nhật thời gian hết hạn tin nhắn của cuộc trò chuyện thành ${message_expire_minutes} phút`,
                data: results.rows[0]
            });
        } else {
            res.status(404).send({ message: 'Không tìm thấy cuộc trò chuyện !' });
        }
    });
};

exports.getMessages = async (req, res) => {
    const { conversation_id } = req.query;
    const { limit = 10 } = req.query;

    await pool.query(`
        UPDATE messages
        SET is_read = true
        WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false
    `, [conversation_id, req.user.id]);

    pool.query(`
        WITH last_messages AS (
            SELECT 
                m.id,
                m.conversation_id,
                m.sender_id,
                CASE 
                    WHEN (m.expired_at IS NOT NULL AND m.expired_at < NOW()) or is_deleted THEN NULL
                    ELSE m.content
                END AS content,
                m.created_at,
                m.is_read,
                m.is_deleted,
                m.expired_at,
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
    const { conversation_id, content, attachments } = req.body;

    try {
        // Get the message expiration time for the conversation
        const { rows } = await pool.query('SELECT message_expire_minutes FROM conversations WHERE id = $1', [conversation_id]);
        console.log('rows', rows);

        if (rows.length === 0) {
            return res.status(404).send({ message: 'Conversation not found' });
        }

        const messageExpireMinutes = rows[0].message_expire_minutes;
        const expiredAt = messageExpireMinutes ? new Date(Date.now() + messageExpireMinutes * 60000) : null;

        // Insert the message with the expiration time
        const messageResult = await pool.query(
            'INSERT INTO messages (conversation_id, sender_id, content, created_at, is_read, is_deleted, expired_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [conversation_id, req.user.id, content, new Date(), false, false, expiredAt]
        );

        console.log('messageResult', messageResult.rows[0].id);


        const messageId = messageResult.rows[0].id;

        // Insert attachments if any
        if (attachments) {
            for (let attachment of attachments) {
                await pool.query(
                    'INSERT INTO attachments (message_id, file_path, file_type, created_at) VALUES ($1, $2, $3, $4)',
                    [messageId, attachment.path, attachment.mimetype, new Date()]
                );
            }
        }

        res.status(201).send(messageResult.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'An error occurred while sending the message' });
    }
}

exports.deleteMessage = async (req, res) => {
    const { message_id } = req.params;

    pool.query('UPDATE messages SET is_deleted = true WHERE id = $1 RETURNING *', [message_id], (error, results) => {
        if (error) {
            throw error;
        }
        if (results.rows.length > 0) {
            res.status(200).send(results.rows[0]);
        } else {
            res.status(404).send({ message: 'Message not found' });
        }
    });
};