/* ============================================================
   HELLAPHOBIA - PHASE 7: ANTI-CHEAT & SECURITY
   Behavioral Analysis | Server Validation | Tamper Detection
   ============================================================ */

(function() {
    'use strict';

    // ===== PHASE 7: ANTI-CHEAT CONFIGURATION =====
    const ANTI_CHEAT_CONFIG = {
        // Detection thresholds
        IMPOSSIBLE_MOVEMENT_SPEED: 500, // pixels per second
        IMPOSSIBLE_DAMAGE_MULTIPLIER: 2.0,
        IMPOSSIBLE_HEALTH_REGEN: 10, // HP per second
        IMPOSSIBLE_SANITY_REGEN: 15, // Sanity per second
        IMPOSSIBLE_JUMP_HEIGHT: 400, // pixels
        IMPOSSIBLE_DASH_COOLDOWN: 0.1, // seconds
        SUSPICIOUS_ACTION_WINDOW: 100, // ms between actions
        MAX_ACTIONS_PER_SECOND: 20,
        
        // Server validation
        SERVER_AUTHORITATIVE: true,
        VALIDATION_INTERVAL: 0.1, // seconds
        POSITION_TOLERANCE: 50, // pixels
        TIME_TOLERANCE: 0.5, // seconds
        
        // Tamper detection
        INTEGRITY_CHECK_INTERVAL: 5000, // ms
        CONSOLE_DETECTION: true,
        DEVTOOLS_DETECTION: true,
        SPEED HACK_DETECTION: true,
        
        // Response actions
        WARNING_THRESHOLD: 3,
        KICK_THRESHOLD: 10,
        BAN_THRESHOLD: 20,
        AUTO_PAUSE_ON_CHEAT: true
    };

    // ===== PHASE 7: BEHAVIORAL ANALYZER =====
    const BehavioralAnalyzer = {
        playerHistory: [],
        actionTimestamps: [],
        suspiciousActions: [],
        trustScore: 100,
        riskLevel: 'low', // low, medium, high, critical
        
        // Player state tracking
        lastPosition: { x: 0, y: 0 },
        lastHealth: 100,
        lastSanity: 100,
        lastActionTime: 0,
        
        init() {
            this.playerHistory = [];
            this.actionTimestamps = [];
            this.suspiciousActions = [];
            this.trustScore = 100;
            this.riskLevel = 'low';
            console.log('Phase 7: Behavioral Analyzer initialized');
        },
        
        // Record player action for analysis
        recordAction(actionType, data) {
            const timestamp = Date.now();
            const record = {
                type: actionType,
                data: data,
                timestamp: timestamp,
                frame: window.gameFrame || 0
            };
            
            this.playerHistory.push(record);
            this.actionTimestamps.push(timestamp);
            
            // Keep only last 1000 actions
            if (this.playerHistory.length > 1000) {
                this.playerHistory.shift();
            }
            if (this.actionTimestamps.length > 100) {
                this.actionTimestamps.shift();
            }
            
            // Analyze for suspicious behavior
            this.analyzeAction(record);
        },
        
        // Analyze individual action
        analyzeAction(record) {
            const now = Date.now();
            
            // Check action frequency
            const actionsInLastSecond = this.actionTimestamps.filter(
                t => now - t < 1000
            ).length;
            
            if (actionsInLastSecond > ANTI_CHEAT_CONFIG.MAX_ACTIONS_PER_SECOND) {
                this.flagSuspicious('rapid_actions', {
                    count: actionsInLastSecond,
                    max: ANTI_CHEAT_CONFIG.MAX_ACTIONS_PER_SECOND
                });
            }
            
            // Check for impossible movements
            if (record.type === 'movement') {
                this.analyzeMovement(record.data);
            }
            
            // Check for impossible combat
            if (record.type === 'combat') {
                this.analyzeCombat(record.data);
            }
            
            // Check for impossible resource changes
            if (record.type === 'resource_change') {
                this.analyzeResourceChange(record.data);
            }
        },
        
        // Analyze movement for speed hacks
        analyzeMovement(data) {
            const dx = data.x - this.lastPosition.x;
            const dy = data.y - this.lastPosition.y;
            const dt = (Date.now() - this.lastActionTime) / 1000;
            
            if (dt > 0) {
                const speed = Math.sqrt(dx * dx + dy * dy) / dt;
                
                if (speed > ANTI_CHEAT_CONFIG.IMPOSSIBLE_MOVEMENT_SPEED) {
                    this.flagSuspicious('impossible_speed', {
                        speed: speed,
                        max: ANTI_CHEAT_CONFIG.IMPOSSIBLE_MOVEMENT_SPEED,
                        distance: Math.sqrt(dx * dx + dy * dy)
                    });
                }
                
                // Check for impossible jumps
                if (dy < 0 && Math.abs(dy) > ANTI_CHEAT_CONFIG.IMPOSSIBLE_JUMP_HEIGHT) {
                    this.flagSuspicious('impossible_jump', {
                        height: Math.abs(dy),
                        max: ANTI_CHEAT_CONFIG.IMPOSSIBLE_JUMP_HEIGHT
                    });
                }
            }
            
            this.lastPosition = { x: data.x, y: data.y };
        },
        
        // Analyze combat for damage hacks
        analyzeCombat(data) {
            // Check damage multiplier
            if (data.damageDealt) {
                const expectedMaxDamage = data.baseDamage * ANTI_CHEAT_CONFIG.IMPOSSIBLE_DAMAGE_MULTIPLIER;
                if (data.damageDealt > expectedMaxDamage) {
                    this.flagSuspicious('impossible_damage', {
                        dealt: data.damageDealt,
                        expected: expectedMaxDamage,
                        base: data.baseDamage
                    });
                }
            }
            
            // Check attack speed
            const timeSinceLastAction = Date.now() - this.lastActionTime;
            if (timeSinceLastAction < ANTI_CHEAT_CONFIG.SUSPICIOUS_ACTION_WINDOW) {
                this.flagSuspicious('rapid_attacks', {
                    interval: timeSinceLastAction,
                    min: ANTI_CHEAT_CONFIG.SUSPICIOUS_ACTION_WINDOW
                });
            }
        },
        
        // Analyze resource changes for god mode
        analyzeResourceChange(data) {
            const now = Date.now();
            const dt = (now - this.lastActionTime) / 1000;
            
            if (dt > 0) {
                // Check health regeneration
                if (data.resource === 'health' && data.change > 0) {
                    const regenPerSecond = data.change / dt;
                    if (regenPerSecond > ANTI_CHEAT_CONFIG.IMPOSSIBLE_HEALTH_REGEN) {
                        this.flagSuspicious('impossible_health_regen', {
                            regen: regenPerSecond,
                            max: ANTI_CHEAT_CONFIG.IMPOSSIBLE_HEALTH_REGEN
                        });
                    }
                }
                
                // Check sanity regeneration
                if (data.resource === 'sanity' && data.change > 0) {
                    const regenPerSecond = data.change / dt;
                    if (regenPerSecond > ANTI_CHEAT_CONFIG.IMPOSSIBLE_SANITY_REGEN) {
                        this.flagSuspicious('impossible_sanity_regen', {
                            regen: regenPerSecond,
                            max: ANTI_CHEAT_CONFIG.IMPOSSIBLE_SANITY_REGEN
                        });
                    }
                }
            }
            
            this.lastHealth = data.resource === 'health' ? data.newValue : this.lastHealth;
            this.lastSanity = data.resource === 'sanity' ? data.newValue : this.lastSanity;
        },
        
        // Flag suspicious activity
        flagSuspicious(type, details) {
            const flag = {
                type: type,
                details: details,
                timestamp: Date.now(),
                frame: window.gameFrame || 0
            };
            
            this.suspiciousActions.push(flag);
            this.trustScore -= this.getTrustPenalty(type);
            this.trustScore = Math.max(0, this.trustScore);
            
            // Update risk level
            this.updateRiskLevel();
            
            // Log for debugging
            console.warn(`[Anti-Cheat] Suspicious activity detected: ${type}`, details);
            
            // Trigger response if threshold exceeded
            if (this.suspiciousActions.length >= ANTI_CHEAT_CONFIG.WARNING_THRESHOLD) {
                this.triggerResponse();
            }
        },
        
        // Get trust penalty for action type
        getTrustPenalty(type) {
            const penalties = {
                'impossible_speed': 5,
                'impossible_jump': 4,
                'impossible_damage': 5,
                'rapid_attacks': 3,
                'impossible_health_regen': 6,
                'impossible_sanity_regen': 6,
                'rapid_actions': 2,
                'position_mismatch': 4,
                'tamper_detected': 10,
                'console_abuse': 3
            };
            return penalties[type] || 1;
        },
        
        // Update risk level based on trust score
        updateRiskLevel() {
            if (this.trustScore >= 80) {
                this.riskLevel = 'low';
            } else if (this.trustScore >= 60) {
                this.riskLevel = 'medium';
            } else if (this.trustScore >= 40) {
                this.riskLevel = 'high';
            } else {
                this.riskLevel = 'critical';
            }
        },
        
        // Trigger anti-cheat response
        triggerResponse() {
            const flags = this.suspiciousActions.length;
            
            if (flags >= ANTI_CHEAT_CONFIG.BAN_THRESHOLD) {
                this.banPlayer('Multiple cheat detections');
            } else if (flags >= ANTI_CHEAT_CONFIG.KICK_THRESHOLD) {
                this.kickPlayer('Excessive suspicious activity');
            } else if (flags >= ANTI_CHEAT_CONFIG.WARNING_THRESHOLD) {
                this.warnPlayer('Suspicious activity detected');
            }
            
            if (ANTI_CHEAT_CONFIG.AUTO_PAUSE_ON_CHEAT && flags >= 5) {
                this.autoPauseGame();
            }
        },
        
        // Warning system
        warnPlayer(reason) {
            console.warn(`[Anti-Cheat] WARNING: ${reason}`);
            // Could show in-game warning
            if (typeof window.showAntiCheatWarning === 'function') {
                window.showAntiCheatWarning(reason);
            }
        },
        
        // Kick player
        kickPlayer(reason) {
            console.error(`[Anti-Cheat] KICK: ${reason}`);
            // Return to menu
            if (typeof window.returnToMenu === 'function') {
                window.returnToMenu(reason);
            }
        },
        
        // Ban player (local storage flag)
        banPlayer(reason) {
            console.error(`[Anti-Cheat] BAN: ${reason}`);
            localStorage.setItem('hellaphobia_banned', 'true');
            localStorage.setItem('hellaphobia_ban_reason', reason);
            localStorage.setItem('hellaphobia_ban_date', new Date().toISOString());
            
            // Show ban screen
            if (typeof window.showBanScreen === 'function') {
                window.showBanScreen(reason);
            }
        },
        
        // Auto-pause game
        autoPauseGame() {
            if (typeof window.togglePause === 'function') {
                window.togglePause();
            }
            console.warn('[Anti-Cheat] Game auto-paused due to suspicious activity');
        },
        
        // Get trust score
        getTrustScore() {
            return this.trustScore;
        },
        
        // Get risk level
        getRiskLevel() {
            return this.riskLevel;
        },
        
        // Export report
        exportReport() {
            return {
                trustScore: this.trustScore,
                riskLevel: this.riskLevel,
                totalActions: this.playerHistory.length,
                suspiciousActions: this.suspiciousActions.length,
                flags: this.suspiciousActions,
                timestamp: Date.now()
            };
        }
    };

    // ===== PHASE 7: SERVER VALIDATOR =====
    const ServerValidator = {
        serverState: null,
        lastValidation: 0,
        validationErrors: 0,
        
        init() {
            this.serverState = null;
            this.lastValidation = 0;
            this.validationErrors = 0;
            console.log('Phase 7: Server Validator initialized');
        },
        
        // Validate player position with server
        validatePosition(clientX, clientY, serverX, serverY) {
            const dx = clientX - serverX;
            const dy = clientY - serverY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > ANTI_CHEAT_CONFIG.POSITION_TOLERANCE) {
                this.validationErrors++;
                BehavioralAnalyzer.flagSuspicious('position_mismatch', {
                    client: { x: clientX, y: clientY },
                    server: { x: serverX, y: serverY },
                    distance: distance,
                    tolerance: ANTI_CHEAT_CONFIG.POSITION_TOLERANCE
                });
                return false;
            }
            
            return true;
        },
        
        // Validate game state
        validateState(clientState, serverState) {
            const errors = [];
            
            // Validate health
            if (Math.abs(clientState.health - serverState.health) > 10) {
                errors.push('health_mismatch');
            }
            
            // Validate sanity
            if (Math.abs(clientState.sanity - serverState.sanity) > 15) {
                errors.push('sanity_mismatch');
            }
            
            // Validate position
            if (!this.validatePosition(
                clientState.x, clientState.y,
                serverState.x, serverState.y
            )) {
                errors.push('position_mismatch');
            }
            
            // Validate time
            const timeDiff = Math.abs(clientState.time - serverState.time);
            if (timeDiff > ANTI_CHEAT_CONFIG.TIME_TOLERANCE) {
                errors.push('time_mismatch');
            }
            
            if (errors.length > 0) {
                this.validationErrors += errors.length;
                console.warn('[Anti-Cheat] Validation errors:', errors);
            }
            
            return errors.length === 0;
        },
        
        // Sync with server (simulated for single-player)
        syncWithServer(playerState) {
            const now = Date.now();
            
            if (now - this.lastValidation > ANTI_CHEAT_CONFIG.VALIDATION_INTERVAL * 1000) {
                // In a real multiplayer game, this would send to server
                // For single-player, we simulate server state
                this.serverState = this.simulateServerState(playerState);
                this.lastValidation = now;
                
                return this.validateState(playerState, this.serverState);
            }
            
            return true;
        },
        
        // Simulate server state (for single-player)
        simulateServerState(playerState) {
            // Add small random variation to simulate network latency
            return {
                x: playerState.x + (Math.random() - 0.5) * 10,
                y: playerState.y + (Math.random() - 0.5) * 10,
                health: playerState.health,
                sanity: playerState.sanity,
                time: Date.now() / 1000
            };
        },
        
        // Get validation stats
        getStats() {
            return {
                validationErrors: this.validationErrors,
                lastValidation: this.lastValidation,
                hasServerState: this.serverState !== null
            };
        }
    };

    // ===== PHASE 7: TAMPER DETECTOR =====
    const TamperDetector = {
        integrityChecks: [],
        tamperDetected: false,
        consoleOpen: false,
        devtoolsOpen: false,
        
        init() {
            this.integrityChecks = [];
            this.tamperDetected = false;
            this.setupConsoleDetection();
            this.setupDevToolsDetection();
            this.setupSpeedHackDetection();
            console.log('Phase 7: Tamper Detector initialized');
        },
        
        // Console detection
        setupConsoleDetection() {
            if (!ANTI_CHEAT_CONFIG.CONSOLE_DETECTION) return;
            
            // Detect console.log calls
            const originalLog = console.log;
            console.log = (...args) => {
                // Log console usage for analysis
                BehavioralAnalyzer.flagSuspicious('console_abuse', {
                    args: args.length,
                    timestamp: Date.now()
                });
                originalLog.apply(console, args);
            };
            
            // Detect console opening
            setInterval(() => {
                const start = performance.now();
                console.profile('');
                console.profileEnd('');
                const end = performance.now();
                
                if (end - start > 100) {
                    this.consoleOpen = true;
                }
            }, 1000);
        },
        
        // DevTools detection
        setupDevToolsDetection() {
            if (!ANTI_CHEAT_CONFIG.DEVTOOLS_DETECTION) return;
            
            const detectDevTools = () => {
                // Check window dimensions
                const widthThreshold = window.outerWidth - window.innerWidth > 100;
                const heightThreshold = window.outerHeight - window.innerHeight > 100;
                
                // Check for debugger
                const start = performance.now();
                debugger; // eslint-disable-line no-debugger
                const end = performance.now();
                
                if (end - start > 100 || widthThreshold || heightThreshold) {
                    this.devtoolsOpen = true;
                    BehavioralAnalyzer.flagSuspicious('tamper_detected', {
                        type: 'devtools',
                        widthThreshold,
                        heightThreshold
                    });
                }
                
                if (this.devtoolsOpen && !this.tamperDetected) {
                    this.tamperDetected = true;
                    console.warn('[Anti-Cheat] DevTools detected!');
                }
            };
            
            setInterval(detectDevTools, 2000);
        },
        
        // Speed hack detection
        setupSpeedHackDetection() {
            if (!ANTI_CHEAT_CONFIG.SPEED_HACK_DETECTION) return;
            
            const expectedFrameTime = 1000 / 60; // 60 FPS
            let lastTime = performance.now();
            
            const checkFrameTime = () => {
                const now = performance.now();
                const frameTime = now - lastTime;
                lastTime = now;
                
                // Detect unusually fast frame times (speed hack)
                if (frameTime < expectedFrameTime * 0.5) {
                    BehavioralAnalyzer.flagSuspicious('tamper_detected', {
                        type: 'speed_hack',
                        frameTime: frameTime,
                        expected: expectedFrameTime
                    });
                }
                
                requestAnimationFrame(checkFrameTime);
            };
            
            requestAnimationFrame(checkFrameTime);
        },
        
        // Integrity check
        addIntegrityCheck(name, value, hash) {
            this.integrityChecks.push({
                name: name,
                value: value,
                hash: hash,
                timestamp: Date.now()
            });
        },
        
        // Verify integrity
        verifyIntegrity() {
            const failures = [];
            
            this.integrityChecks.forEach(check => {
                const currentHash = this.simpleHash(JSON.stringify(check.value));
                if (currentHash !== check.hash) {
                    failures.push(check.name);
                }
            });
            
            if (failures.length > 0) {
                this.tamperDetected = true;
                BehavioralAnalyzer.flagSuspicious('tamper_detected', {
                    type: 'integrity_failure',
                    failed: failures
                });
            }
            
            return failures.length === 0;
        },
        
        // Simple hash function
        simpleHash(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return hash.toString();
        },
        
        // Get tamper status
        getStatus() {
            return {
                tamperDetected: this.tamperDetected,
                consoleOpen: this.consoleOpen,
                devtoolsOpen: this.devtoolsOpen,
                integrityChecks: this.integrityChecks.length
            };
        }
    };

    // ===== PHASE 7: ENCRYPTION UTILITIES =====
    const EncryptionUtils = {
        // Simple XOR encryption for save data
        encrypt(data, key) {
            const str = JSON.stringify(data);
            let result = '';
            for (let i = 0; i < str.length; i++) {
                const charCode = str.charCodeAt(i) ^ key.charCodeAt(i % key.length);
                result += String.fromCharCode(charCode);
            }
            return btoa(result); // Base64 encode
        },
        
        // Decrypt save data
        decrypt(encrypted, key) {
            try {
                const str = atob(encrypted); // Base64 decode
                let result = '';
                for (let i = 0; i < str.length; i++) {
                    const charCode = str.charCodeAt(i) ^ key.charCodeAt(i % key.length);
                    result += String.fromCharCode(charCode);
                }
                return JSON.parse(result);
            } catch (e) {
                console.error('[Anti-Cheat] Decryption failed:', e);
                return null;
            }
        },
        
        // Generate secure random key
        generateKey(length = 16) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        },
        
        // Create checksum for data integrity
        createChecksum(data) {
            return this.simpleHash(JSON.stringify(data));
        },
        
        // Verify checksum
        verifyChecksum(data, checksum) {
            return this.createChecksum(data) === checksum;
        },
        
        simpleHash(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return hash.toString(36);
        }
    };

    // ===== PHASE 7: SAVE SECURITY =====
    const SaveSecurity = {
        encryptionKey: null,
        
        init() {
            // Load or generate encryption key
            const storedKey = localStorage.getItem('hellaphobia_encryption_key');
            if (storedKey) {
                this.encryptionKey = storedKey;
            } else {
                this.encryptionKey = EncryptionUtils.generateKey();
                localStorage.setItem('hellaphobia_encryption_key', this.encryptionKey);
            }
            console.log('Phase 7: Save Security initialized');
        },
        
        // Secure save
        secureSave(slot, data) {
            // Add timestamp and checksum
            data._timestamp = Date.now();
            data._checksum = EncryptionUtils.createChecksum(data);
            
            // Encrypt and save
            const encrypted = EncryptionUtils.encrypt(data, this.encryptionKey);
            localStorage.setItem(`hellaphobia_save_${slot}`, encrypted);
            
            console.log('[Save Security] Data saved securely');
        },
        
        // Secure load
        secureLoad(slot) {
            const encrypted = localStorage.getItem(`hellaphobia_save_${slot}`);
            if (!encrypted) return null;
            
            const decrypted = EncryptionUtils.decrypt(encrypted, this.encryptionKey);
            if (!decrypted) {
                console.warn('[Save Security] Failed to decrypt save data');
                return null;
            }
            
            // Verify checksum
            const checksum = decrypted._checksum;
            delete decrypted._checksum;
            
            if (!EncryptionUtils.verifyChecksum(decrypted, checksum)) {
                console.warn('[Save Security] Save data tampered! Checksum mismatch');
                return null;
            }
            
            // Check for time manipulation
            const age = Date.now() - decrypted._timestamp;
            if (age < 0) {
                console.warn('[Save Security] Time manipulation detected!');
                BehavioralAnalyzer.flagSuspicious('tamper_detected', {
                    type: 'time_manipulation',
                    timestamp: decrypted._timestamp
                });
            }
            
            delete decrypted._timestamp;
            return decrypted;
        },
        
        // Delete save
        deleteSave(slot) {
            localStorage.removeItem(`hellaphobia_save_${slot}`);
        },
        
        // Check for save tampering
        checkSaveIntegrity(slot) {
            const encrypted = localStorage.getItem(`hellaphobia_save_${slot}`);
            if (!encrypted) return 'missing';
            
            const decrypted = EncryptionUtils.decrypt(encrypted, this.encryptionKey);
            if (!decrypted) return 'corrupted';
            
            const checksum = decrypted._checksum;
            const data = { ...decrypted };
            delete data._checksum;
            
            if (!EncryptionUtils.verifyChecksum(data, checksum)) {
                return 'tampered';
            }
            
            return 'valid';
        }
    };

    // ===== PHASE 7: MAIN ANTI-CHEAT MANAGER =====
    const Phase7AntiCheat = {
        initialized: false,
        active: true,
        
        init() {
            if (this.initialized) return;
            
            BehavioralAnalyzer.init();
            ServerValidator.init();
            TamperDetector.init();
            SaveSecurity.init();
            
            this.initialized = true;
            this.active = true;
            
            // Start integrity check loop
            this.startIntegrityLoop();
            
            console.log('Phase 7: Anti-Cheat System initialized');
        },
        
        // Record player action
        recordAction(type, data) {
            if (!this.active) return;
            BehavioralAnalyzer.recordAction(type, data);
        },
        
        // Validate game state
        validateState(state) {
            if (!this.active) return true;
            return ServerValidator.syncWithServer(state);
        },
        
        // Verify integrity
        verifyIntegrity() {
            if (!this.active) return true;
            return TamperDetector.verifyIntegrity();
        },
        
        // Get security status
        getStatus() {
            return {
                active: this.active,
                trustScore: BehavioralAnalyzer.getTrustScore(),
                riskLevel: BehavioralAnalyzer.getRiskLevel(),
                tamperDetected: TamperDetector.getStatus().tamperDetected,
                validationErrors: ServerValidator.getStats().validationErrors,
                report: BehavioralAnalyzer.exportReport()
            };
        },
        
        // Secure save
        saveGame(slot, data) {
            SaveSecurity.secureSave(slot, data);
        },
        
        // Secure load
        loadGame(slot) {
            return SaveSecurity.secureLoad(slot);
        },
        
        // Start integrity check loop
        startIntegrityLoop() {
            setInterval(() => {
                if (!this.active) return;
                
                // Verify integrity periodically
                this.verifyIntegrity();
                
                // Log status for debugging
                const status = this.getStatus();
                if (status.riskLevel !== 'low') {
                    console.warn('[Anti-Cheat] Risk level:', status.riskLevel);
                }
            }, ANTI_CHEAT_CONFIG.INTEGRITY_CHECK_INTERVAL);
        },
        
        // Enable/disable anti-cheat
        setActive(active) {
            this.active = active;
            console.log(`[Anti-Cheat] System ${active ? 'enabled' : 'disabled'}`);
        },
        
        // Export full report
        exportReport() {
            return {
                behavioral: BehavioralAnalyzer.exportReport(),
                server: ServerValidator.getStats(),
                tamper: TamperDetector.getStatus(),
                timestamp: Date.now()
            };
        }
    };

    // ===== GLOBAL HELPER FUNCTIONS =====
    window.showAntiCheatWarning = function(reason) {
        console.warn(`[Anti-Cheat Warning] ${reason}`);
        // Could show UI warning here
    };

    window.returnToMenu = function(reason) {
        console.error(`[Anti-Cheat] Returning to menu: ${reason}`);
        // Return to main menu
        if (typeof window.gameState !== 'undefined') {
            window.gameState = 'menu';
        }
    };

    window.showBanScreen = function(reason) {
        console.error(`[Anti-Cheat] Banned: ${reason}`);
        // Show ban screen
        alert(`BANNED\n\nReason: ${reason}\n\nYour game session has been terminated.`);
    };

    // Export for use in other phases
    window.Phase7AntiCheat = Phase7AntiCheat;
    window.BehavioralAnalyzer = BehavioralAnalyzer;
    window.ServerValidator = ServerValidator;
    window.TamperDetector = TamperDetector;
    window.SaveSecurity = SaveSecurity;
    window.EncryptionUtils = EncryptionUtils;

})();
