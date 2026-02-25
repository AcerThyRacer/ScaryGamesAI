/**
 * ScaryGamesAI Security Utilities
 * Provides XSS protection and input sanitization
 */

const SecurityUtils = (function() {
	'use strict';

	/**
	 * Escape HTML entities to prevent XSS attacks
	 * @param {string} str - String to escape
	 * @returns {string} - Escaped string safe for HTML context
	 */
	function escapeHtml(str) {
		if (str === null || str === undefined) return '';
		return String(str)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	/**
	 * Sanitize HTML string by removing dangerous tags and attributes
	 * Uses a whitelist approach for safety
	 * @param {string} html - HTML string to sanitize
	 * @returns {string} - Sanitized HTML
	 */
	function sanitizeHtml(html) {
		if (typeof html !== 'string') return '';
		
		// Create a temporary element to parse HTML
		const temp = document.createElement('div');
		temp.innerHTML = html;
		
		// Remove dangerous tags
		const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea'];
		dangerousTags.forEach(tag => {
			const elements = temp.getElementsByTagName(tag);
			while (elements.length > 0) {
				if (elements[0].parentNode) {
					elements[0].parentNode.removeChild(elements[0]);
				}
			}
		});
		
		// Remove dangerous attributes from all elements
		const allElements = temp.getElementsByTagName('*');
		const dangerousAttrs = ['onclick', 'onerror', 'onload', 'onmouseover', 'onfocus', 'onblur', 'style'];
		
		for (let i = 0; i < allElements.length; i++) {
			const el = allElements[i];
			dangerousAttrs.forEach(attr => {
				if (el.hasAttribute(attr)) {
					el.removeAttribute(attr);
				}
			});
			
			// Remove javascript: URLs
			if (el.hasAttribute('href')) {
				const href = el.getAttribute('href');
				if (href && href.toLowerCase().trim().startsWith('javascript:')) {
					el.removeAttribute('href');
				}
			}
		}
		
		return temp.innerHTML;
	}

	/**
	 * Safely set innerHTML with sanitization
	 * @param {HTMLElement} element - Target element
	 * @param {string} html - HTML content to insert
	 * @param {Object} options - Options (escape: true for full escaping, sanitize: true for HTML sanitization)
	 */
	function setInnerHTML(element, html, options = {}) {
		if (!element) return;
		
		const { escape = false, sanitize = true } = options;
		
		if (escape) {
			// Full escaping - treat as plain text
			element.textContent = html;
		} else if (sanitize) {
			// Sanitize HTML but keep safe tags
			element.innerHTML = sanitizeHtml(html);
		} else {
			// No protection - use with caution
			element.innerHTML = html;
		}
	}

	/**
	 * Create element with safe text content
	 * @param {string} tagName - HTML tag name
	 * @param {string} text - Text content (will be escaped)
	 * @param {Object} attributes - Optional attributes
	 * @returns {HTMLElement} - Created element
	 */
	function createElement(tagName, text = '', attributes = {}) {
		const el = document.createElement(tagName);
		el.textContent = text; // Automatically escapes
		
		// Safely set attributes
		Object.entries(attributes).forEach(([key, value]) => {
			// Block event handler attributes
			if (key.toLowerCase().startsWith('on')) {
				console.warn('SecurityUtils: Blocked event handler attribute:', key);
				return;
			}
			// Block javascript: URLs in href/src
			if ((key === 'href' || key === 'src') && 
				String(value).toLowerCase().trim().startsWith('javascript:')) {
				console.warn('SecurityUtils: Blocked javascript: URL in', key);
				return;
			}
			el.setAttribute(key, String(value));
		});
		
		return el;
	}

	/**
	 * Validate and sanitize user input
	 * @param {string} input - User input
	 * @param {Object} options - Validation options
	 * @returns {string} - Sanitized input
	 */
	function sanitizeInput(input, options = {}) {
		if (typeof input !== 'string') return '';
		
		const {
			maxLength = 1000,
			allowHtml = false,
			trim = true,
			pattern = null
		} = options;
		
		let result = input;
		
		if (trim) {
			result = result.trim();
		}
		
		if (maxLength && result.length > maxLength) {
			result = result.substring(0, maxLength);
		}
		
		if (pattern && !pattern.test(result)) {
			throw new Error('Input does not match required pattern');
		}
		
		if (!allowHtml) {
			result = escapeHtml(result);
		} else {
			result = sanitizeHtml(result);
		}
		
		return result;
	}

	/**
	 * Safely insert user data into DOM
	 * @param {HTMLElement} container - Container element
	 * @param {string} userContent - User-provided content
	 * @param {string} tagName - Tag to create (default: 'span')
	 * @returns {HTMLElement} - Created element
	 */
	function safeInsertUserContent(container, userContent, tagName = 'span') {
		if (!container) return null;
		
		const el = createElement(tagName, userContent);
		container.appendChild(el);
		return el;
	}

	return {
		escapeHtml,
		sanitizeHtml,
		setInnerHTML,
		createElement,
		sanitizeInput,
		safeInsertUserContent
	};
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
	module.exports = SecurityUtils;
}
