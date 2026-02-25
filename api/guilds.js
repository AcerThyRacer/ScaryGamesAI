/**
 * Guild/Clan System API - Phase 2
 * Guild creation, membership, treasury, and management
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireMonetizationAuth } = require('../middleware/auth');
const postgres = require('../models/postgres');
const { executeIdempotentMutation } = require('../services/economyMutationService');

/**
 * Helper: Generate unique ID
 */
function generateId(prefix = 'guild') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * @route POST /api/v1/guilds
 * @desc Create a new guild
 */
router.post('/', requireMonetizationAuth, async (req, res) => {
    const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
    if (!idempotencyKey) {
        return res.status(400).json({
            success: false,
            error: 'idempotency-key header required'
        });
    }
    
    try {
        const userId = req.user.id;
        const { name, tag, description, motto, region } = req.body;
        
        if (!name || !tag) {
            return res.status(400).json({
                success: false,
                error: 'name and tag are required'
            });
        }
        
        // Check if guild key already exists
        const guildKey = tag.toUpperCase().replace(/[^A-Z0-9]/g, '') + '_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        
        const existingGuild = await postgres.query(
            'SELECT id FROM guilds WHERE guild_key = $1',
            [guildKey]
        );
        
        if (existingGuild.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'A guild with this name/tag combination already exists'
            });
        }
        
        // Check if user is already in a guild
        const userMembership = await postgres.query(
            'SELECT guild_id FROM guild_members WHERE user_id = $1 LIMIT 1',
            [userId]
        );
        
        if (userMembership.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'You are already a member of a guild'
            });
        }
        
        const mutation = await executeIdempotentMutation({
            scope: 'guilds.create',
            idempotencyKey,
            requestPayload: { userId, name, tag, description, motto, region },
            actorUserId: userId,
            entityType: 'guild',
            eventType: 'create',
            mutationFn: async () => {
                await postgres.query('BEGIN');
                
                try {
                    const guildId = generateId();
                    
                    // Create guild
                    await postgres.query(
                        `INSERT INTO guilds (
                            id, guild_key, name, tag, description, motto, region,
                            creator_id, leader_id
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                        [
                            guildId,
                            guildKey,
                            name,
                            tag.toUpperCase(),
                            description || '',
                            motto || '',
                            region || 'global',
                            userId,
                            userId
                        ]
                    );
                    
                    // Add creator as leader
                    await postgres.query(
                        `INSERT INTO guild_members (
                            id, guild_id, user_id, role, permissions
                        ) VALUES ($1, $2, $3, $4, $5)`,
                        [
                            generateId('member'),
                            guildId,
                            userId,
                            'leader',
                            JSON.stringify(['all'])
                        ]
                    );
                    
                    await postgres.query('COMMIT');
                    
                    return {
                        success: true,
                        guild: {
                            id: guildId,
                            name,
                            tag: tag.toUpperCase(),
                            leader: userId
                        }
                    };
                } catch (error) {
                    await postgres.query('ROLLBACK');
                    throw error;
                }
            }
        });
        
        res.status(201).json(mutation);
    } catch (error) {
        console.error('Create guild error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create guild'
        });
    }
});

// Whitelist for sort columns to prevent SQL injection
const ALLOWED_GUILD_SORT_COLUMNS = new Set([
    'level',
    'experience',
    'created_at',
    'member_count',
    'treasury_coins',
    'treasury_gems',
    'name'
]);

// Whitelist for order direction
const ALLOWED_GUILD_ORDER = new Set(['ASC', 'DESC', 'asc', 'desc']);

/**
 * Validate and sanitize sort/order parameters for guilds to prevent SQL injection
 * @param {string} sort - Sort column name
 * @param {string} order - Order direction (ASC/DESC)
 * @returns {{safeSort: string, safeOrder: string}} Sanitized parameters
 */
function validateGuildSortParams(sort, order) {
    const safeSort = ALLOWED_GUILD_SORT_COLUMNS.has(sort) ? sort : 'level';
    const safeOrder = ALLOWED_GUILD_ORDER.has(order) ? order.toUpperCase() : 'DESC';
    return { safeSort, safeOrder };
}

/**
 * @route GET /api/v1/guilds
 * @desc List guilds with filters
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { page = 1, limit = 20, region, search, sort = 'level', order = 'DESC' } = req.query;
        const offset = (page - 1) * limit;

        // SECURITY FIX: Validate sort and order parameters to prevent SQL injection
        const { safeSort, safeOrder } = validateGuildSortParams(sort, order);

        let whereConditions = ['is_recruiting = TRUE'];
        let params = [];
        let paramIndex = 1;

        if (region && region !== 'global') {
            whereConditions.push(`region = $${paramIndex}`);
            params.push(region);
            paramIndex++;
        }

        if (search) {
            whereConditions.push(`(name ILIKE $${paramIndex} OR tag ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = whereConditions.join(' AND ');

        const sql = `
            SELECT
                g.id,
                g.guild_key,
                g.name,
                g.tag,
                g.description,
                g.motto,
                g.level,
                g.experience,
                g.max_members,
                g.region,
                g.treasury_coins,
                g.treasury_gems,
                g.is_recruiting,
                g.created_at,
                COUNT(gm.id) as member_count,
                u.username as leader_username
            FROM guilds g
            LEFT JOIN guild_members gm ON g.id = gm.guild_id
            LEFT JOIN users u ON g.leader_id = u.id
            WHERE ${whereClause}
            GROUP BY g.id, u.username
            ORDER BY g.${safeSort} ${safeOrder}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        params.push(parseInt(limit));
        params.push(offset);
        
        const result = await postgres.query(sql, params);
        
        const countSql = `
            SELECT COUNT(DISTINCT g.id) as total
            FROM guilds g
            WHERE ${whereClause}
        `;
        
        const countResult = await postgres.query(countSql, params.slice(0, params.length - 2));
        
        res.json({
            success: true,
            guilds: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countResult.rows[0].total),
                totalPages: Math.ceil(countResult.rows[0].total / limit)
            }
        });
    } catch (error) {
        console.error('List guilds error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch guilds'
        });
    }
});

/**
 * @route GET /api/v1/guilds/:id
 * @desc Get guild details
 */
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const guildSql = `
            SELECT 
                g.*,
                u.username as leader_username,
                u.avatar as leader_avatar,
                COUNT(gm.id) as member_count
            FROM guilds g
            LEFT JOIN users u ON g.leader_id = u.id
            LEFT JOIN guild_members gm ON g.id = gm.guild_id
            WHERE g.id = $1
            GROUP BY g.id, u.username, u.avatar
        `;
        
        const guildResult = await postgres.query(guildSql, [id]);
        
        if (guildResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Guild not found'
            });
        }
        
        const membersSql = `
            SELECT 
                gm.id,
                gm.user_id,
                gm.role,
                gm.joined_at,
                gm.contribution_score,
                gm.weekly_contribution,
                u.username,
                u.avatar,
                u.title
            FROM guild_members gm
            JOIN users u ON gm.user_id = u.id
            WHERE gm.guild_id = $1
            ORDER BY 
                CASE gm.role
                    WHEN 'leader' THEN 1
                    WHEN 'officer' THEN 2
                    WHEN 'member' THEN 3
                    WHEN 'recruit' THEN 4
                END,
                gm.contribution_score DESC
        `;
        
        const membersResult = await postgres.query(membersSql, [id]);
        
        const challengesSql = `
            SELECT *
            FROM guild_challenges
            WHERE guild_id = $1
            AND status = 'active'
            ORDER BY expires_at ASC
        `;
        
        const challengesResult = await postgres.query(challengesSql, [id]);
        
        res.json({
            success: true,
            guild: {
                ...guildResult.rows[0],
                members: membersResult.rows,
                activeChallenges: challengesResult.rows
            }
        });
    } catch (error) {
        console.error('Get guild details error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch guild details'
        });
    }
});

/**
 * @route POST /api/v1/guilds/:id/invite
 * @desc Invite a user to join the guild
 */
router.post('/:id/invite', requireMonetizationAuth, async (req, res) => {
    const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
    if (!idempotencyKey) {
        return res.status(400).json({
            success: false,
            error: 'idempotency-key header required'
        });
    }
    
    try {
        const senderId = req.user.id;
        const { id } = req.params;
        const { recipient_id, message } = req.body;
        
        if (!recipient_id) {
            return res.status(400).json({
                success: false,
                error: 'recipient_id required'
            });
        }
        
        // Verify sender is in the guild and has permission
        const membershipCheck = await postgres.query(
            'SELECT role FROM guild_members WHERE guild_id = $1 AND user_id = $2',
            [id, senderId]
        );
        
        if (membershipCheck.rows.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'You are not a member of this guild'
            });
        }
        
        const role = membershipCheck.rows[0].role;
        if (!['leader', 'officer'].includes(role)) {
            return res.status(403).json({
                success: false,
                error: 'You do not have permission to invite members'
            });
        }
        
        // Check if recipient is already in a guild
        const existingMembership = await postgres.query(
            'SELECT guild_id FROM guild_members WHERE user_id = $1',
            [recipient_id]
        );
        
        if (existingMembership.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'This user is already in a guild'
            });
        }
        
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        
        const mutation = await executeIdempotentMutation({
            scope: 'guilds.invite',
            idempotencyKey,
            requestPayload: { senderId, guildId: id, recipientId: recipient_id },
            actorUserId: senderId,
            entityType: 'guild_invitation',
            eventType: 'create',
            mutationFn: async () => {
                const invitationId = generateId('invite');
                
                await postgres.query(
                    `INSERT INTO guild_invitations (
                        id, guild_id, sender_id, recipient_id, message, expires_at
                    ) VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING *`,
                    [invitationId, id, senderId, recipient_id, message || '', expiresAt]
                );
                
                return {
                    success: true,
                    invitation: {
                        id: invitationId,
                        guild_id: id,
                        sender_id: senderId,
                        recipient_id,
                        expires_at: expiresAt
                    }
                };
            }
        });
        
        res.status(201).json(mutation);
    } catch (error) {
        console.error('Invite to guild error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send invitation'
        });
    }
});

/**
 * @route POST /api/v1/guilds/:id/join
 * @desc Join a guild (or apply if required)
 */
router.post('/:id/join', requireMonetizationAuth, async (req, res) => {
    const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
    if (!idempotencyKey) {
        return res.status(400).json({
            success: false,
            error: 'idempotency-key header required'
        });
    }
    
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { message } = req.body;
        
        // Check guild exists and is recruiting
        const guild = await postgres.query(
            'SELECT * FROM guilds WHERE id = $1',
            [id]
        );
        
        if (guild.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Guild not found'
            });
        }
        
        if (!guild.rows[0].is_recruiting) {
            return res.status(409).json({
                success: false,
                error: 'This guild is not accepting new members'
            });
        }
        
        // Check if already a member
        const existingMembership = await postgres.query(
            'SELECT guild_id FROM guild_members WHERE user_id = $1',
            [userId]
        );
        
        if (existingMembership.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'You are already in a guild'
            });
        }
        
        const mutation = await executeIdempotentMutation({
            scope: 'guilds.join',
            idempotencyKey,
            requestPayload: { userId, guildId: id, message },
            actorUserId: userId,
            entityType: 'guild_membership',
            eventType: 'join',
            mutationFn: async () => {
                // Check if member count is under limit
                const memberCount = await postgres.query(
                    'SELECT COUNT(*) as count FROM guild_members WHERE guild_id = $1',
                    [id]
                );
                
                if (parseInt(memberCount.rows[0].count) >= guild.rows[0].max_members) {
                    const error = new Error('Guild is full');
                    error.code = 'GUILD_FULL';
                    throw error;
                }
                
                // Add member as recruit
                const memberId = generateId('member');
                await postgres.query(
                    `INSERT INTO guild_members (
                        id, guild_id, user_id, role
                    ) VALUES ($1, $2, $3, $4)`,
                    [memberId, id, userId, 'recruit']
                );
                
                return {
                    success: true,
                    membership: {
                        id: memberId,
                        guild_id: id,
                        user_id: userId,
                        role: 'recruit'
                    }
                };
            }
        });
        
        res.status(201).json(mutation);
    } catch (error) {
        console.error('Join guild error:', error);
        const statusMap = {
            'GUILD_FULL': 409
        };
        res.status(statusMap[error.code] || 500).json({
            success: false,
            error: error.code || 'JOIN_FAILED',
            message: error.message || 'Failed to join guild'
        });
    }
});

/**
 * @route GET /api/v1/guilds/my-guild
 * @desc Get the current user's guild
 */
router.get('/my-guild', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const sql = `
            SELECT 
                g.*,
                gm.role as my_role,
                gm.contribution_score as my_contribution,
                gm.joined_at as my_joined_at,
                COUNT(gm2.id) as member_count,
                u.username as leader_username
            FROM guilds g
            JOIN guild_members gm ON g.id = gm.guild_id AND gm.user_id = $1
            JOIN guild_members gm2 ON g.id = gm2.guild_id
            LEFT JOIN users u ON g.leader_id = u.id
            GROUP BY g.id, gm.role, gm.contribution_score, gm.joined_at, u.username
        `;
        
        const result = await postgres.query(sql, [userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'You are not a member of any guild'
            });
        }
        
        res.json({
            success: true,
            guild: result.rows[0]
        });
    } catch (error) {
        console.error('Get my guild error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch your guild'
        });
    }
});

/**
 * @route POST /api/v1/guilds/:id/treasury/deposit
 * @desc Deposit coins/gems into guild treasury
 */
router.post('/:id/treasury/deposit', requireMonetizationAuth, async (req, res) => {
    const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
    if (!idempotencyKey) {
        return res.status(400).json({
            success: false,
            error: 'idempotency-key header required'
        });
    }
    
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { coins = 0, gems = 0 } = req.body;
        
        if (coins <= 0 && gems <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Must deposit at least some coins or gems'
            });
        }
        
        const mutation = await executeIdempotentMutation({
            scope: 'guilds.deposit',
            idempotencyKey,
            requestPayload: { userId, guildId: id, coins, gems },
            actorUserId: userId,
            entityType: 'guild_treasury',
            eventType: 'deposit',
            mutationFn: async () => {
                await postgres.query('BEGIN');
                
                try {
                    // Check user has enough coins
                    const user = await postgres.query(
                        'SELECT horror_coins FROM users WHERE id = $1 FOR UPDATE',
                        [userId]
                    );
                    
                    if (user.rows[0].horror_coins < coins) {
                        const error = new Error('Insufficient coins');
                        error.code = 'INSUFFICIENT_COINS';
                        throw error;
                    }
                    
                    // Deduct from user
                    if (coins > 0) {
                        await postgres.query(
                            'UPDATE users SET horror_coins = horror_coins - $2 WHERE id = $1',
                            [userId, coins]
                        );
                    }
                    
                    // Add to guild treasury
                    await postgres.query(
                        `UPDATE guilds SET
                            treasury_coins = treasury_coins + $2,
                            treasury_gems = treasury_gems + $3,
                            updated_at = NOW()
                        WHERE id = $1`,
                        [id, coins, gems]
                    );
                    
                    // Update member contribution
                    await postgres.query(
                        `UPDATE guild_members SET
                            contribution_score = contribution_score + $2,
                            total_cp_contributed = total_cp_contributed + $2
                        WHERE guild_id = $1 AND user_id = $2`,
                        [id, userId, coins + (gems * 10)]
                    );
                    
                    await postgres.query('COMMIT');
                    
                    return {
                        success: true,
                        deposit: {
                            coins,
                            gems,
                            totalValue: coins + (gems * 10)
                        }
                    };
                } catch (error) {
                    await postgres.query('ROLLBACK');
                    throw error;
                }
            }
        });
        
        res.status(200).json(mutation);
    } catch (error) {
        console.error('Treasury deposit error:', error);
        const statusMap = {
            'INSUFFICIENT_COINS': 409
        };
        res.status(statusMap[error.code] || 500).json({
            success: false,
            error: error.code || 'DEPOSIT_FAILED',
            message: error.message || 'Failed to deposit to treasury'
        });
    }
});

/**
 * @route GET /api/v1/guilds/leaderboards
 * @desc Get guild leaderboards
 */
router.get('/leaderboards', authMiddleware, async (req, res) => {
    try {
        const { type = 'weekly_cp', limit = 50 } = req.query;
        
        const sql = `
            SELECT 
                g.id,
                g.name,
                g.tag,
                g.level,
                g.experience,
                g.treasury_coins,
                g.treasury_gems,
                g.total_cp_contributed,
                COUNT(gm.id) as member_count,
                u.username as leader_username
            FROM guilds g
            LEFT JOIN guild_members gm ON g.id = gm.guild_id
            LEFT JOIN users u ON g.leader_id = u.id
            GROUP BY g.id, u.username
            ORDER BY 
                CASE 
                    WHEN $1 = 'weekly_cp' THEN g.total_cp_contributed
                    WHEN $1 = 'level' THEN g.level
                    WHEN $1 = 'experience' THEN g.experience
                    WHEN $1 = 'treasury' THEN g.treasury_coins + (g.treasury_gems * 10)
                    ELSE g.total_cp_contributed
                END DESC
            LIMIT $2
        `;
        
        const result = await postgres.query(sql, [type, parseInt(limit)]);
        
        res.json({
            success: true,
            leaderboards: result.rows.map((guild, index) => ({
                rank: index + 1,
                ...guild
            })),
            type
        });
    } catch (error) {
        console.error('Get guild leaderboards error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch leaderboards'
        });
    }
});

module.exports = router;
