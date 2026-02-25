# 🚨 QUICK FIX REFERENCE CARD
## P1 Critical Security Fixes - At a Glance

**Status:** 3/5 Complete | **Priority:** CRITICAL | **ETA:** 6-9 hours remaining

---

## ✅ FIXED ISSUES

### 1. Demo Token Auth Bypass ✅
```diff
- if (t === 'demo-token') return true;
+ if (process.env.NODE_ENV !== 'production' && t === 'demo-token') return true;
```
**Files:** `js/auth-ui.js:82`, `js/subscription-system.js:9`, `server.js:229`

---

### 2. eval/Function Code Injection ✅
```diff
+ if (process.env.NODE_ENV === 'production') {
+   throw new Error('Dynamic script execution disabled in production');
+ }
  const fn = new Function('context', script);
  return fn(context);
```
**Files:** `games/backrooms-pacman/mod-loader.js:449`, `phase5-infinite-content.js:694`

---

### 3. XSS Protection Framework ✅
```javascript
// NEW FILE: js/security-utils.js
SecurityUtils.setInnerHTML(element, userInput, { sanitize: true });
SecurityUtils.setInnerHTML(element, userInput, { escape: true });
SecurityUtils.createElement('span', userInput);
```
**Usage:** Replace all `element.innerHTML = userInput` patterns

---

## ⚠️ PENDING FIXES

### 4. Payment Error Handling ⚠️
**Files:** `api/subscriptions.js`, `services/paymentService.js`

**Pattern:**
```javascript
async function processPayment(data) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		// ... payment logic ...
		await client.query('COMMIT');
		return { success: true };
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}
```

**Time:** 4-6 hours | **Risk:** HIGH

---

### 5. SQL Injection Prevention ⚠️
**File:** `api/marketplace.js`

**Pattern:**
```javascript
const ALLOWED_SORT = new Set(['created_at', 'price', 'rarity']);
const ALLOWED_ORDER = new Set(['ASC', 'DESC']);

function validateSort(sort, order) {
	return {
		sort: ALLOWED_SORT.has(sort) ? sort : 'created_at',
		order: ALLOWED_ORDER.has(order) ? order : 'DESC'
	};
}

// Use validated params in query
const { sort, order } = validateSort(req.query.sort, req.query.order);
const query = `SELECT * FROM listings ORDER BY ${sort} ${order} LIMIT $1`;
```

**Time:** 2-3 hours | **Risk:** CRITICAL

---

## 🔥 ONE-LINER FIXES

### Add to all HTML files (after security-utils.js):
```html
<script src="/js/security-utils.js"></script>
```

### Add to server.js (CSP headers):
```javascript
app.use(helmet.contentSecurityPolicy({
	directives: {
		defaultSrc: ["'self'"],
		scriptSrc: ["'self'"],
		styleSrc: ["'self'", "'unsafe-inline'"]
	}
}));
```

### Add to server.js (rate limiting):
```javascript
const rateLimit = require('express-rate-limit');
app.use('/api/', rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 100
}));
```

---

## 🧪 TESTING COMMANDS

### Test Demo Token Fix
```bash
# Should work in dev
NODE_ENV=development npm start
# Try login with demo-token → SUCCESS

# Should fail in production
NODE_ENV=production npm start  
# Try login with demo-token → REJECTED
```

### Test XSS Protection
```javascript
// In browser console
const malicious = '<script>alert("XSS")</script>';
SecurityUtils.setInnerHTML(div, malicious, { sanitize: true });
// Should escape script tags
```

### Test SQL Injection
```bash
curl "http://localhost:9999/api/v1/marketplace?sort=price;DROP TABLE users--"
# Should use sanitized 'price' parameter, not execute DROP TABLE
```

---

## 📋 CHECKLIST

### Before Deploying to Production
- [ ] ✅ Demo token fix deployed
- [ ] ✅ eval/Function blocked
- [ ] ⚠️ SQL injection fixed
- [ ] ⚠️ Payment error handling added
- [ ] ⚠️ XSS instances manually reviewed
- [ ] ⚠️ HTTPS enabled
- [ ] ⚠️ CSP headers configured
- [ ] ⚠️ Rate limiting active
- [ ] ⚠️ Monitoring setup

### Code Review Must-Haves
- [ ] No eval() or Function() usage
- [ ] All user input sanitized
- [ ] SQL queries parameterized
- [ ] Error handling in all async functions
- [ ] No console.log in production code

---

## 🆘 EMERGENCY CONTACTS

**Security Issues:** Create GitHub issue with "SECURITY" label  
**Production Incidents:** Rollback immediately, then debug  
**Questions:** See `P1-P4_IMPLEMENTATION_GUIDE.md`

---

## 📊 PRIORITY MATRIX

| Issue | Impact | Effort | Do First? |
|-------|--------|--------|-----------|
| SQL Injection | 🔴 Critical | 2-3h | ✅ YES |
| Payment Errors | 🔴 Critical | 4-6h | ✅ YES |
| XSS Manual Fix | 🟠 High | 8-10h | ⚠️ Soon |
| Race Conditions | 🟠 High | 3-4h | ⚠️ Soon |
| Memory Leaks | 🟡 Medium | 4-5h | ⏳ Later |

---

## 💡 PRO TIPS

1. **Use the security-utils library everywhere**
   ```javascript
   // Instead of element.innerHTML = x
   SecurityUtils.setInnerHTML(element, x, { sanitize: true });
   ```

2. **Always validate sort/order parameters**
   ```javascript
   const allowed = new Set(['col1', 'col2']);
   const sort = allowed.has(req.query.sort) ? req.query.sort : 'default';
   ```

3. **Wrap all DB transactions properly**
   ```javascript
   try { await query('BEGIN'); ... await query('COMMIT'); }
   catch { await query('ROLLBACK'); throw; }
   finally { client.release(); }
   ```

4. **Block dangerous features in production**
   ```javascript
   if (process.env.NODE_ENV === 'production') {
   	throw new Error('Feature disabled for security');
   }
   ```

---

## 🎯 NEXT 3 ACTIONS

1. **RIGHT NOW:** Fix SQL injection in marketplace.js (2-3h)
2. **TODAY:** Add payment error handling (4-6h)
3. **THIS WEEK:** Manually fix top 20 XSS instances (4-5h)

---

**Remember:** Security is job #1. Don't deploy until P1 is 100% complete! 🔒

**Last Updated:** February 18, 2026  
**Next Review:** After SQL injection fix
