/**
 * Global Error Handlers - Prevent Unhandled Promise Rejections
 * Catches and logs all unhandled errors and promise rejections
 */

(function() {
	'use strict';

	/**
	 * Handle unhandled promise rejections
	 */
	window.addEventListener('unhandledrejection', function(event) {
		// Prevent default browser handling
		event.preventDefault();

		// Log the error
		console.error('[GlobalErrorHandler] Unhandled promise rejection:', event.reason);

		// Log additional details
		if (event.reason instanceof Error) {
			console.error('[GlobalErrorHandler] Error details:', {
				name: event.reason.name,
				message: event.reason.message,
				stack: event.reason.stack
			});
		}

		// Send to error tracking service (if configured)
		if (window.Sentry && Sentry.captureException) {
			Sentry.captureException(event.reason, {
				tags: {
					type: 'unhandledrejection'
				}
			});
		}

		// Log to server (if configured)
		if (window.ErrorTrackingService) {
			window.ErrorTrackingService.log({
				type: 'unhandledrejection',
				reason: event.reason,
				timestamp: Date.now()
			});
		}
	});

	/**
	 * Handle global JavaScript errors
	 */
	window.addEventListener('error', function(event) {
		// Log the error
		console.error('[GlobalErrorHandler] Global error:', {
			message: event.message,
			filename: event.filename,
			lineno: event.lineno,
			colno: event.colno,
			error: event.error
		});

		// Send to error tracking service
		if (window.Sentry && Sentry.captureException) {
			Sentry.captureException(event.error, {
				tags: {
					type: 'global-error'
				},
				extra: {
					filename: event.filename,
					lineno: event.lineno,
					colno: event.colno
				}
			});
		}

		// Log to server
		if (window.ErrorTrackingService) {
			window.ErrorTrackingService.log({
				type: 'global-error',
				message: event.message,
				filename: event.filename,
				lineno: event.lineno,
				timestamp: Date.now()
			});
		}
	});

	/**
	 * Handle errors in async functions
	 * Wrap async operations to prevent unhandled rejections
	 */
	window.safeAsync = async function(asyncFn, errorHandler) {
		try {
			return await asyncFn();
		} catch (error) {
			console.error('[GlobalErrorHandler] Async operation failed:', error);
			if (typeof errorHandler === 'function') {
				errorHandler(error);
			}
			throw error;
		}
	};

	/**
	 * Wrap Promise to ensure errors are always handled
	 */
	window.safePromise = {
		all: function(promises) {
			return Promise.all(promises.map(p => p.catch(err => {
				console.error('[GlobalErrorHandler] Promise.all error:', err);
				throw err;
			})));
		},

		race: function(promises) {
			return Promise.race(promises.map(p => p.catch(err => {
				console.error('[GlobalErrorHandler] Promise.race error:', err);
				throw err;
			})));
		},

		allSettled: function(promises) {
			return Promise.allSettled(promises);
		}
	};

	console.log('[GlobalErrorHandler] Initialized');
})();
