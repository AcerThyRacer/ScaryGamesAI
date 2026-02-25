# 🔧 P1-P4 CODE CHANGES IMPLEMENTATION GUIDE
## ScaryGamesAI Security & Quality Improvement Plan

**Created:** February 18, 2026  
**Status:** P1 Critical Fixes 60% Complete  
**Next Actions:** Complete remaining P1 fixes, then P2 functionality issues

---

## ✅ COMPLETED CHANGES

### P1.1 Demo Token Security Fix ✅

**Files Modified:**
- `js/auth-ui.js` - Line 82, 399-407
- `js/subscription-system.js` - Line 9, 838
- `server.js` - Line 229

**Changes Made:**
```javascript
// Wrapped demo-token checks with environment validation
if (process.env.NODE_ENV !== 'production' && t === 'demo-token') return true;
```

**Testing:**
```bash
# Test in development (should work)
NODE_ENV=development npm start
# Login with demo-token should succeed

# Test in production (should fail)
NODE_ENV=production npm start
# Login with demo-token should be rejected
```

---

### P1.2 eval/Function Code Injection Fix ✅

**Files Modified:**
- `games/backrooms-pacman/mod-loader.js` - Lines 445-459
- `games/backrooms-pacman/phase5-infinite-content.js` - Lines 686-703

**Changes Made:**
```javascript
// Added production block for dynamic code execution
if (process.env.NODE_ENV === 'production') {
	throw new Error('Dynamic script execution disabled in production for security');
}
```

**Testing:**
```javascript
// Try loading a mod in production mode
// Should throw: "Dynamic script execution disabled in production for security"
```

---

### P1.3 XSS Protection Framework ✅

**Files Created:**
- `js/security-utils.js` - Complete security utility library

**Files Modified:**
- `index.html` - Added security-utils.js script include

**Usage Pattern:**
```javascript
// Before (VULNERABLE):
element.innerHTML = userInput;

// After (SECURE):
SecurityUtils.setInnerHTML(element, userInput, { sanitize: true });

// Or for plain text:
SecurityUtils.setInnerHTML(element, userInput, { escape: true });

// Or use textContent for simple cases:
element.textContent = userInput;
```

**Remaining Work:**
- 100+ innerHTML instances need manual review
- Priority files: `js/personalized-storefront.js`, `js/marketplace.js`, `js/main.js`

---

## ⚠️ PENDING P1 FIXES (CRITICAL)

### P1.4 Payment Error Handling ⚠️

**Files to Fix:**
- `api/subscriptions.js` - Lines 295-448
- `services/paymentService.js` - Lines 572-742

**Required Changes:**

1. **Add comprehensive try-catch blocks:**
```javascript
// In api/subscriptions.js - gift subscription endpoint
async function giftSubscription(req, res) {
	const { recipientUserId, tier, billingCycle, message } = req.body;
	const userId = req.user.id;
	
	try {
		// Validate input
		if (!recipientUserId || !tier || !billingCycle) {
			return res.status(400).json({
				success: false,
				error: { code: 'INVALID_INPUT', message: 'Missing required fields' }
			});
		}
		
		// Start transaction
		const client = await pool.connect();
		try {
			await client.query('BEGIN');
			
			// Check balance
			const balanceResult = await client.query(
				'SELECT balance FROM user_accounts WHERE user_id = $1 FOR UPDATE',
				[userId]
			);
			
			// Process payment
			// ... payment logic ...
			
			await client.query('COMMIT');
			res.json({ success: true, transactionId });
		} catch (dbErr) {
			await client.query('ROLLBACK');
			console.error('[PaymentService] Transaction failed:', dbErr);
			res.status(500).json({
				success: false,
				error: { code: 'PAYMENT_FAILED', message: 'Transaction failed' }
			});
		} finally {
			client.release();
		}
	} catch (error) {
		console.error('[PaymentService] Critical error:', error);
		res.status(500).json({
			success: false,
			error: { code: 'INTERNAL_ERROR', message: 'Payment processing failed' }
		});
	}
}
```

2. **Add idempotency checks:**
```javascript
// Check for duplicate transactions
const existingTransaction = await client.query(
	'SELECT id FROM transactions WHERE idempotency_key = $1',
	[idempotencyKey]
);

if (existingTransaction.rows.length > 0) {
	return res.status(409).json({
		success: false,
		error: { code: 'DUPLICATE_TRANSACTION', message: 'Transaction already processed' }
	});
}
```

3. **Add validation middleware:**
```javascript
// In api/subscriptions.js
const validatePaymentInput = (req, res, next) => {
	const { tier, billingCycle, amount } = req.body;
	
	const validTiers = ['hunter', 'survivor', 'elder'];
	const validCycles = ['monthly', 'annual'];
	
	if (!validTiers.includes(tier)) {
		return res.status(400).json({
			success: false,
			error: { code: 'INVALID_TIER', message: 'Invalid subscription tier' }
		});
	}
	
	if (!validCycles.includes(billingCycle)) {
		return res.status(400).json({
			success: false,
			error: { code: 'INVALID_BILLING_CYCLE', message: 'Invalid billing cycle' }
		});
	}
	
	if (amount && (typeof amount !== 'number' || amount <= 0)) {
		return res.status(400).json({
			success: false,
			error: { code: 'INVALID_AMOUNT', message: 'Invalid amount' }
		});
	}
	
	next();
};

app.post('/api/subscriptions/gift', validatePaymentInput, giftSubscription);
```

**Estimated Time:** 4-6 hours  
**Priority:** 🔴 CRITICAL

---

### P1.5 SQL Injection Prevention ⚠️

**Files to Fix:**
- `api/marketplace.js` - Lines 73-100, 462-470

**Vulnerable Code:**
```javascript
// VULNERABLE - DO NOT USE
const sort = req.query.sort || 'created_at';
const order = req.query.order || 'DESC';
const query = `
	SELECT * FROM marketplace_listings 
	ORDER BY ml.${sort} ${order} 
	LIMIT $1 OFFSET $2
`;
```

**Required Changes:**

1. **Whitelist validation for sort columns:**
```javascript
const ALLOWED_SORT_COLUMNS = new Set([
	'created_at',
	'updated_at',
	'price',
	'rarity',
	'sale_price',
	'views',
	'favorites'
]);

const ALLOWED_ORDER = new Set(['ASC', 'DESC']);

function validateSortParams(sort, order) {
	const safeSort = ALLOWED_SORT_COLUMNS.has(sort) ? sort : 'created_at';
	const safeOrder = ALLOWED_ORDER.has(order.toUpperCase()) ? order.toUpperCase() : 'DESC';
	return { safeSort, safeOrder };
}
```

2. **Use parameterized queries:**
```javascript
// SECURE - Use parameterized queries
const { safeSort, safeOrder } = validateSortParams(sort, order);

// Note: Column names cannot be parameterized, so we whitelist above
const query = `
	SELECT * FROM marketplace_listings 
	ORDER BY ml.${safeSort} ${safeOrder} 
	LIMIT $1 OFFSET $2
`;

const result = await pool.query(query, [limit, offset]);
```

3. **Add input sanitization middleware:**
```javascript
const sanitizeMarketplaceQuery = (req, res, next) => {
	const { sort, order, page, limit } = req.query;
	
	// Validate and sanitize
	const { safeSort, safeOrder } = validateSortParams(sort, order);
	const safePage = Math.max(1, parseInt(page) || 1);
	const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
	
	// Replace with sanitized values
	req.query.sort = safeSort;
	req.query.order = safeOrder;
	req.query.page = safePage;
	req.query.limit = safeLimit;
	
	next();
};

app.get('/api/v1/marketplace', sanitizeMarketplaceQuery, getMarketplaceListings);
```

**Estimated Time:** 2-3 hours  
**Priority:** 🔴 CRITICAL

---

## 🟠 PENDING P2 FIXES (HIGH PRIORITY)

### P2.1 Race Condition in Cross-Platform Save

**File:** `games/backrooms-pacman/cross-platform-save.js` - Lines 234-283

**Issue:** Multiple save operations can overwrite each other

**Solution:** Implement optimistic locking
```javascript
async function saveGame(saveData) {
	// Get current version
	const currentSave = await loadSave(saveData.userId);
	const currentVersion = currentSave?.version || 0;
	
	// Increment version
	saveData.version = currentVersion + 1;
	saveData.previousVersionHash = currentSave?.hash || null;
	
	// Calculate hash of new data
	saveData.hash = calculateHash(saveData);
	
	// Optimistic lock update
	const result = await db.query(`
		UPDATE cross_platform_saves 
		SET save_data = $1, version = $2, hash = $3, updated_at = NOW()
		WHERE user_id = $4 AND version = $5
	`, [
		JSON.stringify(saveData),
		saveData.version,
		saveData.hash,
		saveData.userId,
		currentVersion
	]);
	
	if (result.rowCount === 0) {
		// Conflict detected - another save occurred
		throw new SaveConflictError('Save conflict - please retry');
	}
	
	return saveData;
}
```

**Estimated Time:** 3-4 hours

---

### P2.2 Database Transaction Rollback

**Files:** `services/paymentService.js`, `api/marketplace.js`

**Pattern to Implement:**
```javascript
async function processTransaction(transactionData) {
	const client = await pool.connect();
	
	try {
		await client.query('BEGIN');
		
		// Step 1: Deduct balance
		await client.query(`
			UPDATE user_accounts 
			SET balance = balance - $1 
			WHERE user_id = $2
		`, [transactionData.amount, transactionData.userId]);
		
		// Step 2: Create transaction record
		await client.query(`
			INSERT INTO transactions (...)
			VALUES (...)
		`);
		
		// Step 3: Update inventory
		await client.query(`
			INSERT INTO user_inventory (...)
			VALUES (...)
		`);
		
		await client.query('COMMIT');
		return { success: true };
		
	} catch (error) {
		await client.query('ROLLBACK');
		console.error('[Transaction] Failed:', error);
		throw error;
	} finally {
		client.release();
	}
}
```

**Estimated Time:** 4-5 hours

---

### P2.3 Authentication State Synchronization

**Files:** `js/auth-ui.js`, `js/page-shell.js`

**Solution:** Single source of truth with event bus
```javascript
// Create auth state manager
const AuthStateManager = (function() {
	let state = {
		isLoggedIn: false,
		user: null,
		token: null,
		sessionId: null
	};
	
	const listeners = new Set();
	
	function setState(newState) {
		state = { ...state, ...newState };
		listeners.forEach(listener => listener(state));
		window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: state }));
	}
	
	function subscribe(listener) {
		listeners.add(listener);
		return () => listeners.delete(listener);
	}
	
	function getState() {
		return { ...state };
	}
	
	return { setState, getState, subscribe };
})();

// Use consistently across all files
// In js/auth-ui.js:
AuthStateManager.setState({ isLoggedIn: true, user: payload.user });

// In js/page-shell.js:
AuthStateManager.subscribe((state) => {
	// React to auth changes
});
```

**Estimated Time:** 3-4 hours

---

### P2.4 Promise Rejection Handling

**Files:** `sw.js`, `services/authService.js`

**Pattern:**
```javascript
// Before (DANGEROUS):
event.waitUntil(networkPromise);

// After (SAFE):
event.waitUntil(
	networkPromise.catch((error) => {
		console.error('[ServiceWorker] Request failed:', error);
		// Handle error appropriately
		return caches.match('/offline.html');
	})
);

// In services/authService.js:
// Before:
.refreshToken().catch(() => {});

// After:
.refreshToken().catch((error) => {
	console.error('[AuthService] Token refresh failed:', error);
	// Log to analytics
	// Clear invalid tokens
	AuthStateManager.setState({ isLoggedIn: false });
});
```

**Estimated Time:** 2-3 hours

---

### P2.5 Memory Leak Prevention

**Files:** `games/backrooms-pacman/backrooms-pacman.js`

**Pattern:**
```javascript
// Add cleanup on game state change
function cleanupGameListeners() {
	// Remove event listeners
	document.removeEventListener('keydown', handleKeyDown);
	document.removeEventListener('keyup', handleKeyUp);
	window.removeEventListener('resize', handleResize);
	
	// Cancel animation frames
	if (animationFrameId) {
		cancelAnimationFrame(animationFrameId);
		animationFrameId = null;
	}
	
	// Clear intervals
	if (gameInterval) {
		clearInterval(gameInterval);
		gameInterval = null;
	}
	
	// Remove audio listeners
	if (backgroundMusic) {
		backgroundMusic.pause();
		backgroundMusic.src = '';
	}
}

// Call cleanup before state transitions
function changeGameState(newState) {
	cleanupGameListeners();
	currentState = newState;
	initializeNewState();
}
```

**Estimated Time:** 4-5 hours

---

## 📊 IMPLEMENTATION PRIORITY MATRIX

| Priority | Task | Impact | Effort | Risk |
|----------|------|--------|--------|------|
| 🔴 P1.4 | Payment Error Handling | Critical | Medium | High |
| 🔴 P1.5 | SQL Injection Fix | Critical | Low | High |
| 🟠 P2.1 | Save Race Condition | High | Medium | Medium |
| 🟠 P2.2 | DB Transaction Rollback | High | Medium | Medium |
| 🟠 P2.3 | Auth State Sync | Medium | Medium | Low |
| 🟠 P2.4 | Promise Handling | Medium | Low | Medium |
| 🟠 P2.5 | Memory Leaks | Medium | Medium | Low |

---

## 🎯 TESTING CHECKLIST

### Security Testing
- [ ] Penetration testing on auth endpoints
- [ ] XSS vulnerability scanning
- [ ] SQL injection testing
- [ ] CSRF protection verification
- [ ] Rate limiting effectiveness

### Functional Testing
- [ ] Payment flow end-to-end
- [ ] Cross-platform save/load
- [ ] Authentication state sync
- [ ] Transaction rollback scenarios
- [ ] Error handling paths

### Performance Testing
- [ ] Memory leak detection (Chrome DevTools)
- [ ] Load testing (1000 concurrent users)
- [ ] Database query optimization
- [ ] Asset loading performance
- [ ] Animation frame rate monitoring

---

## 📝 CODE REVIEW CHECKLIST

### Security
- [ ] No eval() or Function() usage
- [ ] All user input sanitized
- [ ] SQL queries parameterized
- [ ] Auth tokens properly validated
- [ ] CSRF tokens implemented

### Code Quality
- [ ] Error handling consistent
- [ ] No magic numbers
- [ ] Functions < 50 lines
- [ ] Classes have single responsibility
- [ ] Proper logging implemented

### Testing
- [ ] Unit tests for critical paths
- [ ] Integration tests for APIs
- [ ] E2E tests for user flows
- [ ] Performance benchmarks
- [ ] Security test suite

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] All P1 fixes completed
- [ ] Security audit passed
- [ ] Performance tests passed
- [ ] Backup strategy in place
- [ ] Rollback plan documented

### Production
- [ ] Environment variables set
- [ ] HTTPS enabled
- [ ] CSP headers configured
- [ ] Rate limiting enabled
- [ ] Monitoring active

### Post-Deployment
- [ ] Error monitoring (Sentry)
- [ ] Performance monitoring
- [ ] User feedback collection
- [ ] Security scanning
- [ ] Log analysis

---

## 📞 SUPPORT RESOURCES

### Documentation
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Guidelines](https://nodejs.org/en/docs/guides/security/)

### Tools
- **Security Scanning:** npm audit, Snyk, Dependabot
- **Testing:** Jest, Playwright, OWASP ZAP
- **Monitoring:** Sentry, New Relic, Prometheus

---

**Last Updated:** February 18, 2026  
**Next Review:** After P1 fixes completion  
**Owner:** Development Team
