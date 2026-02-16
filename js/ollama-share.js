/* ============================================
   Sharing Module - Phase 4
   Share games via links, export, embed codes
   ============================================ */

const ShareModule = {
    // Generate unique share ID
    generateShareId() {
        return 'share_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    // Create shareable game data
    createShareData(game, options = {}) {
        const { includeHtml = true, compress = false } = options;
        
        const shareData = {
            id: this.generateShareId(),
            originalId: game.id,
            title: game.title,
            description: game.description,
            category: game.category,
            createdAt: new Date().toISOString(),
            author: localStorage.getItem('sgai-username') || 'Anonymous',
            validation: game.validation,
            thumbnail: game.thumbnail
        };
        
        // Include HTML only if requested (can be large)
        if (includeHtml) {
            shareData.html = compress ? this.compressHtml(game.html) : game.html;
            shareData.compressed = compress;
        }
        
        return shareData;
    },

    // Compress HTML to save space
    compressHtml(html) {
        return html
            .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
            .replace(/\s+/g, ' ') // Remove extra whitespace
            .replace(/>\s+</g, '><') // Remove space between tags
            .trim();
    },

    // Decompress HTML
    decompressHtml(html) {
        return html;
    },

    // Share via URL (base64 encoded)
    async shareViaUrl(game) {
        const shareData = this.createShareData(game, { compress: true });
        const encoded = this.base64Encode(JSON.stringify(shareData));
        
        // Create shareable URL
        const baseUrl = window.location.origin;
        const shareUrl = `${baseUrl}/play-shared.html?game=${encoded}`;
        
        // Copy to clipboard
        try {
            await navigator.clipboard.writeText(shareUrl);
            return { success: true, url: shareUrl, copied: true };
        } catch (e) {
            return { success: true, url: shareUrl, copied: false };
        }
    },

    // Share via Web Share API
    async shareViaWebShare(game) {
        if (!navigator.share) {
            return this.shareViaUrl(game);
        }
        
        const shareData = {
            title: game.title,
            text: `Check out this horror game I made: ${game.title}`,
            url: window.location.href
        };
        
        try {
            await navigator.share(shareData);
            return { success: true };
        } catch (e) {
            if (e.name === 'AbortError') {
                return { success: false, cancelled: true };
            }
            throw e;
        }
    },

    // Generate embed code
    getEmbedCode(game, options = {}) {
        const { 
            width = 800, 
            height = 600, 
            border = true,
            title = true 
        } = options;
        
        const embedId = 'embed_' + game.id;
        const borderStyle = border ? 'border: 2px solid #9b4dca;' : '';
        
        const embedCode = `<iframe 
    id="${embedId}"
    src="${window.location.origin}/embed-game.html?id=${game.id}"
    width="${width}"
    height="${height}"
    style="${borderStyle} border-radius: 8px;"
    frameborder="0"
    allowfullscreen
    title="${game.title}"
></iframe>`;
        
        return embedCode;
    },

    // Export game as downloadable HTML
    exportAsHtml(game) {
        const html = this.createStandaloneHtml(game);
        
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.sanitizeFilename(game.title)}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        return { success: true };
    },

    // Create standalone HTML file
    createStandaloneHtml(game) {
        const title = this.escapeHtml(game.title);
        const description = this.escapeHtml(game.description || '');
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${description}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <title>${title} - Play Now</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            background: #0a0a0f; 
            min-height: 100vh; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            font-family: system-ui, -apple-system, sans-serif;
        }
        #game-container { 
            width: 100%; 
            height: 100vh; 
            max-width: 1200px;
        }
        canvas { display: block; }
    </style>
</head>
<body>
    <div id="game-container"></div>
    <script>
        ${game.html}
    </script>
</body>
</html>`;
    },

    // Generate share image (OG image URL)
    async generateShareImage(game) {
        // In a real implementation, this would generate an image
        // For now, return placeholder
        return `${window.location.origin}/og-image-generate.html?title=${encodeURIComponent(game.title)}`;
    },

    // Create Twitter share URL
    getTwitterShareUrl(game) {
        const text = `I made "${game.title}" with AI! Check it out:`;
        const url = window.location.href;
        return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    },

    // Create Facebook share URL
    getFacebookShareUrl() {
        return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
    },

    // Create Reddit share URL
    getRedditShareUrl(game) {
        const title = game.title;
        const url = window.location.href;
        return `https://reddit.com/submit?title=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
    },

    // Base64 encode (URL-safe)
    base64Encode(str) {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
            function toSolidBytes(match, p1) {
                return String.fromCharCode('0x' + p1);
        }));
    },

    // Base64 decode
    base64Decode(str) {
        return decodeURIComponent(atob(str).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    },

    // Sanitize filename
    sanitizeFilename(name) {
        return name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    },

    // Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Copy to clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    // Load shared game from URL
    loadFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const gameData = params.get('game');
        
        if (!gameData) return null;
        
        try {
            const decoded = this.base64Decode(gameData);
            return JSON.parse(decoded);
        } catch (e) {
            console.error('Failed to load shared game:', e);
            return null;
        }
    }
};

// Export
window.ShareModule = ShareModule;
