/**
 * ScaryGamesAI Error Handling Utilities
 * Standardized error classes and handling patterns
 * Replaces ad-hoc error handling throughout codebase
 */

const SGAIError = (function() {
	'use strict';

	/**
	 * Base error class with error codes and metadata
	 */
	class BaseError extends Error {
		constructor(message, code = 'UNKNOWN_ERROR', metadata = {}) {
			super(message);
			this.name = this.constructor.name;
			this.code = code;
			this.metadata = metadata;
			this.timestamp = new Date().toISOString();
			
			// Capture stack trace
			if (Error.captureStackTrace) {
				Error.captureStackTrace(this, this.constructor);
			}
		}

		toJSON() {
			return {
				name: this.name,
				message: this.message,
				code: this.code,
				metadata: this.metadata,
				timestamp: this.timestamp,
				stack: this.stack
			};
		}
	}

	/**
	 * Authentication errors
	 */
	class AuthenticationError extends BaseError {
		constructor(message, code = 'AUTH_ERROR', metadata = {}) {
			super(message, code, metadata);
			this.name = 'AuthenticationError';
		}
	}

	/**
	 * Authorization errors (permission denied)
	 */
	class AuthorizationError extends BaseError {
		constructor(message, code = 'FORBIDDEN', metadata = {}) {
			super(message, code, metadata);
			this.name = 'AuthorizationError';
		}
	}

	/**
	 * Validation errors (invalid input)
	 */
	class ValidationError extends BaseError {
		constructor(message, code = 'VALIDATION_ERROR', field = null, metadata = {}) {
			super(message, code, { ...metadata, field });
			this.name = 'ValidationError';
			this.field = field;
		}
	}

	/**
	 * Database errors
	 */
	class DatabaseError extends BaseError {
		constructor(message, code = 'DB_ERROR', query = null, metadata = {}) {
			super(message, code, { ...metadata, query });
			this.name = 'DatabaseError';
			this.query = query;
		}
	}

	/**
	 * Network errors
	 */
	class NetworkError extends BaseError {
		constructor(message, code = 'NETWORK_ERROR', statusCode = null, metadata = {}) {
			super(message, code, { ...metadata, statusCode });
			this.name = 'NetworkError';
			this.statusCode = statusCode;
		}
	}

	/**
	 * Payment/transaction errors
	 */
	class PaymentError extends BaseError {
		constructor(message, code = 'PAYMENT_ERROR', transactionId = null, metadata = {}) {
			super(message, code, { ...metadata, transactionId });
			this.name = 'PaymentError';
			this.transactionId = transactionId;
		}
	}

	/**
	 * Game state errors
	 */
	class GameStateError extends BaseError {
		constructor(message, code = 'GAME_STATE_ERROR', state = null, metadata = {}) {
			super(message, code, { ...metadata, state });
			this.name = 'GameStateError';
			this.state = state;
		}
	}

	/**
	 * Configuration errors
	 */
	class ConfigurationError extends BaseError {
		constructor(message, code = 'CONFIG_ERROR', key = null, metadata = {}) {
			super(message, code, { ...metadata, key });
			this.name = 'ConfigurationError';
			this.key = key;
		}
	}

	/**
	 * Rate limit errors
	 */
	class RateLimitError extends BaseError {
		constructor(message, code = 'RATE_LIMIT_EXCEEDED', retryAfter = null, metadata = {}) {
			super(message, code, { ...metadata, retryAfter });
			this.name = 'RateLimitError';
			this.retryAfter = retryAfter;
		}
	}

	/**
	 * Not found errors
	 */
	class NotFoundError extends BaseError {
		constructor(message, code = 'NOT_FOUND', resourceId = null, metadata = {}) {
			super(message, code, { ...metadata, resourceId });
			this.name = 'NotFoundError';
			this.resourceId = resourceId;
		}
	}

	/**
	 * Conflict errors (e.g., duplicate entries)
	 */
	class ConflictError extends BaseError {
		constructor(message, code = 'CONFLICT', resourceId = null, metadata = {}) {
			super(message, code, { ...metadata, resourceId });
			this.name = 'ConflictError';
			this.resourceId = resourceId;
		}
	}

	/**
	 * Service unavailable errors
	 */
	class ServiceUnavailableError extends BaseError {
		constructor(message, code = 'SERVICE_UNAVAILABLE', serviceName = null, metadata = {}) {
			super(message, code, { ...metadata, serviceName });
			this.name = 'ServiceUnavailableError';
			this.serviceName = serviceName;
		}
	}

	/**
	 * Wrap async function with standardized error handling
	 * @param {Function} fn - Async function to wrap
	 * @param {string} context - Context/description for logging
	 * @param {Object} options - Options (logError, rethrow, defaultValue)
	 * @returns {Promise<any>} - Result or default value
	 */
	async function wrapAsync(fn, context = 'async operation', options = {}) {
		const {
			logError = true,
			rethrow = true,
			defaultValue = null,
			errorMap = {}
		} = options;

		try {
			return await fn();
		} catch (error) {
			if (logError) {
				if (typeof Logger !== 'undefined') {
					Logger.errorWithContext('ErrorUtils', `${context} failed`, error, {
						context,
						errorCode: error.code
					});
				} else {
					console.error(`[${context}]`, error);
				}
			}

			// Map to specific error type if provided
			if (errorMap[error.code] || errorMap[error.message]) {
				const ErrorClass = errorMap[error.code] || errorMap[error.message];
				const mappedError = new ErrorClass(
					error.message,
					error.code,
					error.metadata || {}
				);
				
				if (rethrow) throw mappedError;
				return defaultValue;
			}

			if (rethrow) throw error;
			return defaultValue;
		}
	}

	/**
	 * Handle promise with error callback
	 * @param {Promise} promise - Promise to handle
	 * @param {Function} onError - Error callback
	 * @returns {Promise<any>}
	 */
	function handlePromise(promise, onError) {
		return promise.catch(error => {
			if (typeof onError === 'function') {
				onError(error);
			}
			throw error;
		});
	}

	/**
	 * Retry function with exponential backoff
	 * @param {Function} fn - Async function to retry
	 * @param {Object} options - Retry options
	 * @returns {Promise<any>}
	 */
	async function retry(fn, options = {}) {
		const {
			maxRetries = 3,
			baseDelay = 1000,
			maxDelay = 10000,
			backoff = 2,
			retryableErrors = []
		} = options;

		let lastError;
		let delay = baseDelay;

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				return await fn();
			} catch (error) {
				lastError = error;

				// Don't retry if error is not retryable
				if (retryableErrors.length > 0 && !retryableErrors.includes(error.code)) {
					throw error;
				}

				// Don't delay on last attempt
				if (attempt < maxRetries) {
					if (typeof Logger !== 'undefined') {
						Logger.warn('ErrorUtils', `Retry attempt ${attempt + 1}/${maxRetries}`, {
							error: error.message,
							delay
						});
					}
					
					await new Promise(resolve => setTimeout(resolve, delay));
					delay = Math.min(delay * backoff, maxDelay);
				}
			}
		}

		throw lastError;
	}

	/**
	 * Validate input with standardized errors
	 * @param {*} value - Value to validate
	 * @param {Function} validator - Validation function
	 * @param {string} errorMessage - Error message if invalid
	 * @param {string} fieldName - Field name for error
	 * @throws {ValidationError}
	 */
	function validate(value, validator, errorMessage, fieldName = 'input') {
		if (!validator(value)) {
			throw new ValidationError(errorMessage, 'INVALID_INPUT', fieldName, {
				value,
				fieldName
			});
		}
		return value;
	}

	/**
	 * Validate required field
	 * @param {*} value - Value to check
	 * @param {string} fieldName - Field name
	 * @returns {*} - Value if valid
	 * @throws {ValidationError}
	 */
	function required(value, fieldName = 'field') {
		if (value === null || value === undefined || value === '') {
			throw new ValidationError(`${fieldName} is required`, 'REQUIRED_FIELD', fieldName);
		}
		return value;
	}

	/**
	 * Validate string length
	 * @param {string} str - String to validate
	 * @param {number} min - Minimum length
	 * @param {number} max - Maximum length
	 * @param {string} fieldName - Field name
	 * @returns {string} - String if valid
	 * @throws {ValidationError}
	 */
	function stringLength(str, min, max, fieldName = 'string') {
		if (typeof str !== 'string') {
			throw new ValidationError(`${fieldName} must be a string`, 'TYPE_ERROR', fieldName);
		}
		if (str.length < min || str.length > max) {
			throw new ValidationError(
				`${fieldName} must be between ${min} and ${max} characters`,
				'LENGTH_ERROR',
				fieldName,
				{ length: str.length, min, max }
			);
		}
		return str;
	}

	/**
	 * Validate number range
	 * @param {number} num - Number to validate
	 * @param {number} min - Minimum value
	 * @param {number} max - Maximum value
	 * @param {string} fieldName - Field name
	 * @returns {number} - Number if valid
	 * @throws {ValidationError}
	 */
	function numberRange(num, min, max, fieldName = 'number') {
		if (typeof num !== 'number' || isNaN(num)) {
			throw new ValidationError(`${fieldName} must be a number`, 'TYPE_ERROR', fieldName);
		}
		if (num < min || num > max) {
			throw new ValidationError(
				`${fieldName} must be between ${min} and ${max}`,
				'RANGE_ERROR',
				fieldName,
				{ value: num, min, max }
			);
		}
		return num;
	}

	return {
		// Error classes
		BaseError,
		AuthenticationError,
		AuthorizationError,
		ValidationError,
		DatabaseError,
		NetworkError,
		PaymentError,
		GameStateError,
		ConfigurationError,
		RateLimitError,
		NotFoundError,
		ConflictError,
		ServiceUnavailableError,

		// Utility functions
		wrapAsync,
		handlePromise,
		retry,
		validate,
		required,
		stringLength,
		numberRange
	};
})();

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
	module.exports = SGAIError;
}

// Make globally available in browser
if (typeof window !== 'undefined') {
	window.SGAIError = SGAIError;
}
