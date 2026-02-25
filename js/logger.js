/**
 * ScaryGamesAI Logging Framework
 * Centralized logging with levels, filtering, and production safety
 * Replaces all console.log/warn/error calls throughout the codebase
 */

const Logger = (function() {
	'use strict';

	// Log levels
	const LEVELS = {
		TRACE: 0,
		DEBUG: 1,
		INFO: 2,
		WARN: 3,
		ERROR: 4,
		FATAL: 5
	};

	// Current log level (configurable)
	let currentLevel = LEVELS.INFO; // Default to INFO in production
	let enableConsoleOutput = true;
	let enableRemoteLogging = false;
	let remoteLoggingEndpoint = null;
	let logBuffer = [];
	const MAX_BUFFER_SIZE = 100;

	/**
	 * Determine if we're in production
	 */
	function isProduction() {
		return process.env.NODE_ENV === 'production' ||
			window?.location?.hostname === 'scarygames.ai';
	}

	/**
	 * Format log message with timestamp and level
	 */
	function formatMessage(level, namespace, message, data) {
		const timestamp = new Date().toISOString();
		const levelName = Object.keys(LEVELS).find(key => LEVELS[key] === level);
		
		return {
			timestamp,
			level: levelName,
			levelValue: level,
			namespace: namespace || 'app',
			message: String(message),
			data: data || null,
			url: typeof window !== 'undefined' ? window.location.href : null,
			userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null
		};
	}

	/**
	 * Output log to console (if enabled)
	 */
	function outputToConsole(logEntry) {
		if (!enableConsoleOutput) return;

		const { level, namespace, message, data } = logEntry;
		const prefix = `[${logEntry.timestamp}] [${level}] [${namespace}]`;
		
		// Use appropriate console method based on level
		const consoleMethod = level === 'ERROR' || level === 'FATAL' ? 'error' :
			level === 'WARN' ? 'warn' :
			level === 'DEBUG' ? 'debug' :
			level === 'TRACE' ? 'trace' : 'log';

		if (data !== null) {
			console[consoleMethod](`${prefix} ${message}`, data);
		} else {
			console[consoleMethod](`${prefix} ${message}`);
		}
	}

	/**
	 * Send log to remote server (if configured)
	 */
	async function sendToRemote(logEntry) {
		if (!enableRemoteLogging || !remoteLoggingEndpoint) return;

		// Only send WARN and above in production
		if (isProduction() && logEntry.levelValue < LEVELS.WARN) return;

		try {
			// Fire and forget - don't await
			fetch(remoteLoggingEndpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(logEntry),
				keepalive: true
			}).catch(() => {
				// Silently fail - logging shouldn't break app
			});
		} catch (error) {
			// Silently fail
		}
	}

	/**
	 * Buffer log entries for debugging
	 */
	function bufferLog(logEntry) {
		logBuffer.push(logEntry);
		if (logBuffer.length > MAX_BUFFER_SIZE) {
			logBuffer.shift(); // Remove oldest
		}
	}

	/**
	 * Core logging function
	 */
	function log(level, namespace, message, data) {
		// Skip if below current level
		if (level < currentLevel) return;

		const logEntry = formatMessage(level, namespace, message, data);

		// Always buffer
		bufferLog(logEntry);

		// Output to console if enabled
		outputToConsole(logEntry);

		// Send to remote if configured
		sendToRemote(logEntry);

		// Dispatch event for listeners
		if (typeof window !== 'undefined') {
			window.dispatchEvent(new CustomEvent('sgai:log', {
				detail: logEntry,
				bubbles: true
			}));
		}
	}

	/**
	 * Set minimum log level
	 */
	function setLevel(level) {
		if (typeof level === 'string') {
			currentLevel = LEVELS[level.toUpperCase()] || LEVELS.INFO;
		} else if (typeof level === 'number') {
			currentLevel = level;
		}
		
		// Auto-detect production
		if (isProduction()) {
			currentLevel = Math.max(currentLevel, LEVELS.WARN); // Never below WARN in production
		}
	}

	/**
	 * Get current log level
	 */
	function getLevel() {
		return currentLevel;
	}

	/**
	 * Enable/disable console output
	 */
	function enableConsole(enabled) {
		enableConsoleOutput = enabled;
	}

	/**
	 * Configure remote logging
	 */
	function configureRemoteLogging(endpoint, enabled = true) {
		remoteLoggingEndpoint = endpoint;
		enableRemoteLogging = enabled;
	}

	/**
	 * Get buffered logs
	 */
	function getBufferedLogs(limit = MAX_BUFFER_SIZE) {
		return logBuffer.slice(-limit);
	}

	/**
	 * Clear buffered logs
	 */
	function clearBuffer() {
		logBuffer = [];
	}

	/**
	 * Export logs to file
	 */
	function exportLogs() {
		const blob = new Blob([JSON.stringify(logBuffer, null, 2)], {
			type: 'application/json'
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `scarygames-logs-${Date.now()}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	/**
	 * Log with context (for errors)
	 */
	function logWithContext(level, namespace, message, error, context = {}) {
		const logEntry = formatMessage(level, namespace, message, {
			error: {
				name: error?.name,
				message: error?.message,
				stack: error?.stack
			},
			context
		});

		bufferLog(logEntry);
		outputToConsole(logEntry);
		sendToRemote(logEntry);

		if (typeof window !== 'undefined') {
			window.dispatchEvent(new CustomEvent('sgai:log', {
				detail: logEntry,
				bubbles: true
			}));
		}
	}

	// Public API
	return {
		// Log level constants
		LEVELS,

		// Logging methods
		trace: (namespace, message, data) => log(LEVELS.TRACE, namespace, message, data),
		debug: (namespace, message, data) => log(LEVELS.DEBUG, namespace, message, data),
		info: (namespace, message, data) => log(LEVELS.INFO, namespace, message, data),
		warn: (namespace, message, data) => log(LEVELS.WARN, namespace, message, data),
		error: (namespace, message, data) => log(LEVELS.ERROR, namespace, message, data),
		fatal: (namespace, message, data) => log(LEVELS.FATAL, namespace, message, data),

		// Error with context
		errorWithContext: (namespace, message, error, context) => 
			logWithContext(LEVELS.ERROR, namespace, message, error, context),

		// Configuration
		setLevel,
		getLevel,
		enableConsole,
		configureRemoteLogging,

		// Log management
		getBufferedLogs,
		clearBuffer,
		exportLogs,

		// Initialize with sensible defaults
		init: function() {
			// Auto-detect environment
			if (isProduction()) {
				setLevel(LEVELS.WARN);
				enableConsole(false); // Disable console in production
			} else {
				setLevel(LEVELS.DEBUG);
				enableConsole(true);
			}

			console.log('[Logger] Initialized with level:', 
				Object.keys(LEVELS).find(key => LEVELS[key] === currentLevel));
		}
	};
})();

// Auto-initialize in browser
if (typeof window !== 'undefined') {
	window.Logger = Logger;
	Logger.init();
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
	module.exports = Logger;
}
