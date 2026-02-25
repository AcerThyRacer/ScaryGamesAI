/**
 * Cross-Game Currency Conversion API - Phase 4
 * Souls ↔ Gems exchange, market events, arbitrage mini-game
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireMonetizationAuth } = require('../middleware/auth');
const postgres = require('../models/postgres');
const { executeIdempotentMutation } = require('../services/economyMutationService');

function generateId(prefix = 'ex') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

const EXCHANGE_FEE_RATE = 0.02; // 2% transaction fee

/**
 * @route GET /api/v1/currency/exchange-rates
 * @desc Get current exchange rates
 */
router.get('/exchange-rates', authMiddleware, async (req, res) => {
    try {
        const sql = `
            SELECT 
                from_currency,
                to_currency,
                exchange_rate,
                inverse_rate,
                is_active,
                effective_from,
                effective_until
            FROM currency_exchange_rates
            WHERE is_active = TRUE
            AND (effective_until IS NULL OR effective_until > NOW())
            ORDER BY from_currency, to_currency
        `;
        
        const result = await postgres.query(sql);
        
        // Get active market events
        const eventsSql = `
            SELECT 
                event_name,
                event_type,
                affected_pairs,
                bonus_percentage,
                starts_at,
                ends_at
            FROM currency_market_events
            WHERE is_active = TRUE
            AND NOW() BETWEEN starts_at AND ends_at
        `;
        
        const events = await postgres.query(eventsSql);
        
        res.json({
            success: true,
            rates: result.rows,
            activeEvents: events.rows
        });
    } catch (error) {
        console.error('Get exchange rates error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch exchange rates'
        });
    }
});

/**
 * @route POST /api/v1/currency/exchange
 * @desc Exchange currency
 */
router.post('/exchange', requireMonetizationAuth, async (req, res) => {
    const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
    if (!idempotencyKey) {
        return res.status(400).json({ success: false, error: 'idempotency-key required' });
    }
    
    try {
        const userId = req.user.id;
        const { from_currency, to_currency, amount } = req.body;
        
        const mutation = await executeIdempotentMutation({
            scope: 'currency.exchange',
            idempotencyKey,
            requestPayload: { userId, from_currency, to_currency, amount },
            actorUserId: userId,
            entityType: 'currency_exchange',
            eventType: 'exchange',
            mutationFn: async () => {
                await postgres.query('BEGIN');
                
                try {
                    // Get exchange rate
                    const rate = await postgres.query(
                        'SELECT * FROM currency_exchange_rates WHERE from_currency = $1 AND to_currency = $2 AND is_active = TRUE',
                        [from_currency, to_currency]
                    );
                    
                    if (rate.rows.length === 0) {
                        const error = new Error('Exchange rate not found');
                        error.code = 'RATE_NOT_FOUND';
                        throw error;
                    }
                    
                    const exchangeRate = parseFloat(rate.rows[0].exchange_rate);
                    
                    // Check active market events for bonus
                    const eventsSql = `
                        SELECT bonus_percentage
                        FROM currency_market_events
                        WHERE is_active = TRUE
                        AND NOW() BETWEEN starts_at AND ends_at
                        AND affected_pairs @> $1::jsonb
                    `;
                    
                    const events = await postgres.query(eventsSql, [JSON.stringify([{ from: from_currency, to: to_currency }])]);
                    
                    let bonusMultiplier = 1;
                    if (events.rows.length > 0) {
                        bonusMultiplier = 1 + (events.rows[0].bonus_percentage / 100);
                    }
                    
                    // Calculate exchange
                    const baseAmount = parseFloat(amount);
                    const toAmount = baseAmount * exchangeRate * bonusMultiplier;
                    const feeAmount = baseAmount * EXCHANGE_FEE_RATE;
                    const finalAmount = toAmount - (feeAmount * exchangeRate);
                    
                    // Check user has enough currency
                    let userCurrency = 0;
                    if (from_currency === 'souls') {
                        // Souls might be in a separate table or user metadata
                        const user = await postgres.query('SELECT account_credit FROM users WHERE id = $1', [userId]);
                        userCurrency = parseFloat(user.rows[0]?.account_credit) || 0;
                    } else if (from_currency === 'coins') {
                        const user = await postgres.query('SELECT horror_coins FROM users WHERE id = $1', [userId]);
                        userCurrency = parseFloat(user.rows[0]?.horror_coins) || 0;
                    } else if (from_currency === 'gems') {
                        const user = await postgres.query('SELECT account_credit FROM users WHERE id = $1', [userId]);
                        userCurrency = parseFloat(user.rows[0]?.account_credit) || 0;
                    }
                    
                    if (userCurrency < baseAmount) {
                        const error = new Error('Insufficient currency');
                        error.code = 'INSUFFICIENT_CURRENCY';
                        throw error;
                    }
                    
                    // Deduct source currency
                    if (from_currency === 'coins') {
                        await postgres.query(
                            'UPDATE users SET horror_coins = horror_coins - $2 WHERE id = $1',
                            [userId, baseAmount]
                        );
                    } else {
                        await postgres.query(
                            'UPDATE users SET account_credit = account_credit - $2 WHERE id = $1',
                            [userId, baseAmount]
                        );
                    }
                    
                    // Add destination currency
                    if (to_currency === 'coins') {
                        await postgres.query(
                            'UPDATE users SET horror_coins = horror_coins + $2 WHERE id = $1',
                            [userId, finalAmount]
                        );
                    } else {
                        await postgres.query(
                            'UPDATE users SET account_credit = account_credit + $2 WHERE id = $1',
                            [userId, finalAmount]
                        );
                    }
                    
                    // Record transaction
                    const exchangeId = generateId();
                    await postgres.query(
                        `INSERT INTO currency_exchanges (
                            id, user_id, from_currency, to_currency,
                            from_amount, to_amount, exchange_rate, fee_amount, status
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed')`,
                        [exchangeId, userId, from_currency, to_currency, baseAmount, finalAmount, exchangeRate, feeAmount]
                    );
                    
                    await postgres.query('COMMIT');
                    
                    return {
                        success: true,
                        exchange: {
                            id: exchangeId,
                            from_currency,
                            to_currency,
                            from_amount: baseAmount,
                            to_amount: finalAmount,
                            exchange_rate: exchangeRate,
                            fee: feeAmount,
                            bonus_applied: bonusMultiplier > 1
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
        console.error('Currency exchange error:', error);
        res.status(500).json({
            success: false,
            error: error.code || 'EXCHANGE_FAILED',
            message: error.message || 'Failed to exchange currency'
        });
    }
});

/**
 * @route GET /api/v1/currency/arbitrage/market
 * @desc Get arbitrage market data
 */
router.get('/arbitrage/market', authMiddleware, async (req, res) => {
    try {
        const sql = `
            SELECT 
                market_key,
                currency_pair,
                current_rate,
                trend,
                volatility,
                last_updated,
                metadata
            FROM arbitrage_market_data
            ORDER BY currency_pair
        `;
        
        const result = await postgres.query(sql);
        
        res.json({
            success: true,
            market: result.rows
        });
    } catch (error) {
        console.error('Get arbitrage market error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch market data'
        });
    }
});

/**
 * @route GET /api/v1/currency/arbitrage/portfolio
 * @desc Get user's arbitrage portfolio
 */
router.get('/arbitrage/portfolio', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const sql = `
            SELECT 
                uap.*,
                amd.current_rate as market_rate
            FROM user_arbitrage_portfolio uap
            LEFT JOIN arbitrage_market_data amd ON uap.currency_type = amd.currency_pair
            WHERE uap.user_id = $1
        `;
        
        const result = await postgres.query(sql, [userId]);
        
        res.json({
            success: true,
            portfolio: result.rows
        });
    } catch (error) {
        console.error('Get arbitrage portfolio error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch portfolio'
        });
    }
});

module.exports = router;
