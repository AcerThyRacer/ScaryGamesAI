/**
 * Phase 1.1: Universal Player Profile API
 * Cross-game meta-progression system with unified XP, currency, and inventory
 */

const express = require('express');
const { query } = require('../db/postgres');
const { authenticateToken } = require('../middleware/auth');
const { generateFriendCode, calculateLevelXP } = require('../utils/helpers');

const router = express.Router();

// Middleware: Authenticate all routes
router.use(authenticateToken);

/**
 * GET /api/player/profile
 * Get or create universal player profile
 */
router.get('/profile', async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get or create profile
        let profileResult = await query(`
            SELECT * FROM player_profiles 
            WHERE user_id = $1
        `, [userId]);
        
        if (profileResult.rows.length === 0) {
            // Create new profile
            const friendCode = generateFriendCode();
            profileResult = await query(`
                INSERT INTO player_profiles (user_id, username, friend_code)
                VALUES ($1, $2, $3)
                RETURNING *
            `, [userId, req.user.username, friendCode]);
        }
        
        const profile = profileResult.rows[0];
        
        // Get game mastery for all games
        const masteryResult = await query(`
            SELECT * FROM game_mastery 
            WHERE player_profile_id = $1
            ORDER BY mastery_xp DESC
        `, [profile.id]);
        
        // Get equipped items
        const inventoryResult = await query(`
            SELECT * FROM shared_inventory 
            WHERE player_profile_id = $1 AND is_equipped = true
        `, [profile.id]);
        
        // Get friends count
        const friendsCountResult = await query(`
            SELECT COUNT(*) as friend_count 
            FROM player_friends 
            WHERE player_profile_id = $1 AND status = 'accepted'
        `, [profile.id]);
        
        res.json({
            success: true,
            data: {
                profile,
                gameMastery: masteryResult.rows,
                equippedItems: inventoryResult.rows,
                friendCount: parseInt(friendsCountResult.rows[0].friend_count)
            }
        });
    } catch (error) {
        console.error('Error getting player profile:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to load player profile' 
        });
    }
});

/**
 * POST /api/player/profile/xp
 * Add XP to master level and/or specific game
 */
router.post('/profile/xp', async (req, res) => {
    try {
        const userId = req.user.id;
        const { masterXp = 0, gameId, gameXp = 0, playtimeSeconds = 0 } = req.body;
        
        // Get profile
        const profileResult = await query(`
            SELECT * FROM player_profiles 
            WHERE user_id = $1
        `, [userId]);
        
        if (profileResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Profile not found' 
            });
        }
        
        const profile = profileResult.rows[0];
        let levelUps = [];
        
        // Update master level
        if (masterXp > 0) {
            const newMasterXP = profile.master_xp + masterXp;
            const newLevel = calculateLevelXP(newMasterXP);
            
            if (newLevel > profile.master_level) {
                levelUps.push({
                    type: 'master',
                    oldLevel: profile.master_level,
                    newLevel: newLevel
                });
            }
            
            await query(`
                UPDATE player_profiles 
                SET master_xp = $1, 
                    master_level = $2,
                    master_xp_to_next_level = $3,
                    total_playtime_seconds = total_playtime_seconds + $4,
                    last_active_at = NOW()
                WHERE id = $5
            `, [
                newMasterXP,
                newLevel,
                calculateLevelXP(newLevel + 1),
                playtimeSeconds,
                profile.id
            ]);
        }
        
        // Update game-specific mastery
        if (gameId && gameXp > 0) {
            let gameMasteryResult = await query(`
                SELECT * FROM game_mastery 
                WHERE player_profile_id = $1 AND game_id = $2
            `, [profile.id, gameId]);
            
            if (gameMasteryResult.rows.length === 0) {
                // Create new game mastery
                gameMasteryResult = await query(`
                    INSERT INTO game_mastery (player_profile_id, game_id, mastery_xp, mastery_level)
                    VALUES ($1, $2, $3, $4)
                    RETURNING *
                `, [profile.id, gameId, gameXp, 1]);
            } else {
                // Update existing game mastery
                const gameMastery = gameMasteryResult.rows[0];
                const newGameXP = gameMastery.mastery_xp + gameXp;
                const newGameLevel = calculateLevelXP(newGameXP, 500); // Game mastery uses different XP curve
                
                if (newGameLevel > gameMastery.mastery_level) {
                    levelUps.push({
                        type: 'game',
                        gameId: gameId,
                        oldLevel: gameMastery.mastery_level,
                        newLevel: newGameLevel
                    });
                }
                
                await query(`
                    UPDATE game_mastery 
                    SET mastery_xp = $1,
                        mastery_level = $2,
                        mastery_xp_to_next_level = $3,
                        playtime_seconds = playtime_seconds + $4,
                        sessions_count = sessions_count + 1,
                        last_played_at = NOW()
                    WHERE player_profile_id = $5 AND game_id = $6
                `, [
                    newGameXP,
                    newGameLevel,
                    calculateLevelXP(newGameLevel + 1, 500),
                    playtimeSeconds,
                    profile.id,
                    gameId
                ]);
            }
        }
        
        // Update total games played
        if (gameId) {
            await query(`
                UPDATE player_profiles 
                SET total_games_played = total_games_played + 1
                WHERE id = $1
            `, [profile.id]);
        }
        
        res.json({
            success: true,
            data: {
                masterXp: masterXp,
                gameXp: gameXp,
                levelUps: levelUps
            }
        });
    } catch (error) {
        console.error('Error adding XP:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to add XP' 
        });
    }
});

/**
 * GET /api/player/inventory
 * Get shared inventory
 */
router.get('/inventory', async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, equipped } = req.query;
        
        // Get profile
        const profileResult = await query(`
            SELECT id FROM player_profiles 
            WHERE user_id = $1
        `, [userId]);
        
        if (profileResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Profile not found' 
            });
        }
        
        const profileId = profileResult.rows[0].id;
        
        // Build query
        let inventoryQuery = `
            SELECT * FROM shared_inventory 
            WHERE player_profile_id = $1
        `;
        const params = [profileId];
        let paramCount = 1;
        
        if (type) {
            paramCount++;
            inventoryQuery += ` AND item_type = $${paramCount}`;
            params.push(type);
        }
        
        if (equipped !== undefined) {
            paramCount++;
            inventoryQuery += ` AND is_equipped = $${paramCount}`;
            params.push(equipped === 'true');
        }
        
        inventoryQuery += ' ORDER BY acquired_at DESC';
        
        const inventoryResult = await query(inventoryQuery, params);
        
        res.json({
            success: true,
            data: {
                items: inventoryResult.rows,
                total: inventoryResult.rows.length
            }
        });
    } catch (error) {
        console.error('Error getting inventory:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to load inventory' 
        });
    }
});

/**
 * POST /api/player/inventory/equip
 * Equip or unequip an item
 */
router.post('/inventory/equip', async (req, res) => {
    try {
        const userId = req.user.id;
        const { itemId, equip = true } = req.body;
        
        // Get profile
        const profileResult = await query(`
            SELECT id FROM player_profiles 
            WHERE user_id = $1
        `, [userId]);
        
        if (profileResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Profile not found' 
            });
        }
        
        const profileId = profileResult.rows[0].id;
        
        // Verify item ownership
        const itemResult = await query(`
            SELECT * FROM shared_inventory 
            WHERE id = $1 AND player_profile_id = $2
        `, [itemId, profileId]);
        
        if (itemResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Item not found' 
            });
        }
        
        const item = itemResult.rows[0];
        
        // Check expiration
        if (item.expires_at && new Date(item.expires_at) < new Date()) {
            return res.status(400).json({ 
                success: false, 
                error: 'Item has expired' 
            });
        }
        
        // If equipping, unequip other items in same slot
        if (equip && item.equip_slot) {
            await query(`
                UPDATE shared_inventory 
                SET is_equipped = FALSE 
                WHERE player_profile_id = $1 
                AND equip_slot = $2 
                AND id != $3
            `, [profileId, item.equip_slot, itemId]);
        }
        
        // Update item
        await query(`
            UPDATE shared_inventory 
            SET is_equipped = $1,
                times_used = times_used + $2
            WHERE id = $3
        `, [equip, equip ? 1 : 0, itemId]);
        
        res.json({
            success: true,
            message: `Item ${equip ? 'equipped' : 'unequipped'} successfully`
        });
    } catch (error) {
        console.error('Error equipping item:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to equip item' 
        });
    }
});

/**
 * GET /api/player/friends
 * Get friends list
 */
router.get('/friends', async (req, res) => {
    try {
        const userId = req.user.id;
        const { status = 'accepted' } = req.query;
        
        // Get profile
        const profileResult = await query(`
            SELECT id FROM player_profiles 
            WHERE user_id = $1
        `, [userId]);
        
        if (profileResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Profile not found' 
            });
        }
        
        const profileId = profileResult.rows[0].id;
        
        const friendsResult = await query(`
            SELECT pf.*, pp.username, pp.avatar_url, pp.master_level, pp.prestige_rank
            FROM player_friends pf
            JOIN player_profiles pp ON pf.friend_profile_id = pp.id
            WHERE pf.player_profile_id = $1 AND pf.status = $2
            ORDER BY pf.is_favorite DESC, pf.last_played_together DESC NULLS LAST
        `, [profileId, status]);
        
        res.json({
            success: true,
            data: {
                friends: friendsResult.rows,
                total: friendsResult.rows.length
            }
        });
    } catch (error) {
        console.error('Error getting friends:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to load friends' 
        });
    }
});

/**
 * POST /api/player/friends/request
 * Send friend request
 */
router.post('/friends/request', async (req, res) => {
    try {
        const userId = req.user.id;
        const { friendCode, message } = req.body;
        
        if (!friendCode) {
            return res.status(400).json({ 
                success: false, 
                error: 'Friend code required' 
            });
        }
        
        // Get sender profile
        const senderProfileResult = await query(`
            SELECT id FROM player_profiles 
            WHERE user_id = $1
        `, [userId]);
        
        if (senderProfileResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Profile not found' 
            });
        }
        
        const senderProfileId = senderProfileResult.rows[0].id;
        
        // Get recipient profile by friend code
        const recipientProfileResult = await query(`
            SELECT id FROM player_profiles 
            WHERE friend_code = $1
        `, [friendCode.toUpperCase()]);
        
        if (recipientProfileResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Player not found with that friend code' 
            });
        }
        
        const recipientProfileId = recipientProfileResult.rows[0].id;
        
        // Check if already friends
        const existingFriendResult = await query(`
            SELECT * FROM player_friends 
            WHERE player_profile_id = $1 AND friend_profile_id = $2
        `, [senderProfileId, recipientProfileId]);
        
        if (existingFriendResult.rows.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Already friends with this player' 
            });
        }
        
        // Check if request already exists
        const existingRequestResult = await query(`
            SELECT * FROM friend_requests 
            WHERE sender_profile_id = $1 AND recipient_profile_id = $2 AND status = 'pending'
        `, [senderProfileId, recipientProfileId]);
        
        if (existingRequestResult.rows.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Friend request already sent' 
            });
        }
        
        // Create friend request
        await query(`
            INSERT INTO friend_requests (sender_profile_id, recipient_profile_id, message)
            VALUES ($1, $2, $3)
        `, [senderProfileId, recipientProfileId, message || null]);
        
        res.json({
            success: true,
            message: 'Friend request sent successfully'
        });
    } catch (error) {
        console.error('Error sending friend request:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to send friend request' 
        });
    }
});

/**
 * POST /api/player/friends/respond
 * Accept or decline friend request
 */
router.post('/friends/respond', async (req, res) => {
    try {
        const userId = req.user.id;
        const { requestId, accept } = req.body;
        
        // Get profile
        const profileResult = await query(`
            SELECT id FROM player_profiles 
            WHERE user_id = $1
        `, [userId]);
        
        if (profileResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Profile not found' 
            });
        }
        
        const profileId = profileResult.rows[0].id;
        
        // Get request
        const requestResult = await query(`
            SELECT * FROM friend_requests 
            WHERE id = $1 AND recipient_profile_id = $2 AND status = 'pending'
        `, [requestId, profileId]);
        
        if (requestResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Friend request not found' 
            });
        }
        
        const request = requestResult.rows[0];
        
        if (accept) {
            // Add friend
            await query(`
                INSERT INTO player_friends (player_profile_id, friend_profile_id, status)
                VALUES ($1, $2, 'accepted'), ($2, $1, 'accepted')
            `, [profileId, request.sender_profile_id]);
        }
        
        // Update request status
        await query(`
            UPDATE friend_requests 
            SET status = $1, responded_at = NOW()
            WHERE id = $2
        `, [accept ? 'accepted' : 'declined', requestId]);
        
        res.json({
            success: true,
            message: `Friend request ${accept ? 'accepted' : 'declined'} successfully`
        });
    } catch (error) {
        console.error('Error responding to friend request:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to respond to friend request' 
        });
    }
});

/**
 * GET /api/player/activity
 * Get activity feed
 */
router.get('/activity', async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 20, offset = 0 } = req.query;
        
        // Get profile
        const profileResult = await query(`
            SELECT id FROM player_profiles 
            WHERE user_id = $1
        `, [userId]);
        
        if (profileResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Profile not found' 
            });
        }
        
        const profileId = profileResult.rows[0].id;
        
        const activityResult = await query(`
            SELECT * FROM player_activity_feed 
            WHERE player_profile_id = $1 AND is_public = true
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `, [profileId, parseInt(limit), parseInt(offset)]);
        
        res.json({
            success: true,
            data: {
                activities: activityResult.rows,
                total: activityResult.rows.length
            }
        });
    } catch (error) {
        console.error('Error getting activity:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to load activity feed' 
        });
    }
});

/**
 * POST /api/player/activity
 * Add activity to feed
 */
router.post('/activity', async (req, res) => {
    try {
        const userId = req.user.id;
        const { activityType, gameId, title, description, metadata = {}, isPublic = true } = req.body;
        
        // Get profile
        const profileResult = await query(`
            SELECT id FROM player_profiles 
            WHERE user_id = $1
        `, [userId]);
        
        if (profileResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Profile not found' 
            });
        }
        
        const profileId = profileResult.rows[0].id;
        
        await query(`
            INSERT INTO player_activity_feed 
            (player_profile_id, activity_type, game_id, title, description, metadata, is_public)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [profileId, activityType, gameId, title, description, JSON.stringify(metadata), isPublic]);
        
        res.json({
            success: true,
            message: 'Activity added successfully'
        });
    } catch (error) {
        console.error('Error adding activity:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to add activity' 
        });
    }
});

/**
 * POST /api/player/soul-fragments
 * Add or spend soul fragments
 */
router.post('/soul-fragments', async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, source, description } = req.body;
        
        if (!amount || Math.abs(amount) < 1) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid amount' 
            });
        }
        
        // Get profile
        const profileResult = await query(`
            SELECT * FROM player_profiles 
            WHERE user_id = $1
        `, [userId]);
        
        if (profileResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Profile not found' 
            });
        }
        
        const profile = profileResult.rows[0];
        
        // Check if enough fragments for spending
        if (amount < 0 && profile.soul_fragments + amount < 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Insufficient soul fragments' 
            });
        }
        
        // Update soul fragments
        const newAmount = profile.soul_fragments + amount;
        await query(`
            UPDATE player_profiles 
            SET soul_fragments = $1,
                earned_soul_fragments = earned_soul_fragments + $2,
                spent_soul_fragments = spent_soul_fragments + $3
            WHERE id = $4
        `, [
            newAmount,
            amount > 0 ? amount : 0,
            amount < 0 ? Math.abs(amount) : 0,
            profile.id
        ]);
        
        res.json({
            success: true,
            data: {
                previousBalance: profile.soul_fragments,
                amountChanged: amount,
                newBalance: newAmount,
                source: source,
                description: description
            }
        });
    } catch (error) {
        console.error('Error updating soul fragments:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update soul fragments' 
        });
    }
});

module.exports = router;
