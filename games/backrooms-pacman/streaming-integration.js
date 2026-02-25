/**
 * PHASE 10.5: Streaming & Content Creation Features
 * OBS overlay support, viewer interaction, replay system
 */

const StreamingIntegration = (function() {
    'use strict';

    // Configuration
    const config = {
        obsEnabled: true,
        viewerInteractionEnabled: true,
        replayEnabled: true,
        apiBase: '/api/stream',
        overlayPort: 8080,
        chatProvider: 'twitch',
        replayQuality: 'high'
    };

    // State
    let isStreaming = false;
    let overlayData = {};
    let chatMessages = [];
    let viewerVotes = {};
    let replayBuffer = [];
    let directorCamera = null;

    /**
     * Initialize streaming features
     */
    function init() {
        console.log('[Streaming] Initializing...');

        // Setup OBS WebSocket connection
        if (config.obsEnabled) {
            setupOBSConnection();
        }

        // Setup chat integration
        if (config.viewerInteractionEnabled) {
            setupChatIntegration();
        }

        // Start replay buffer
        if (config.replayEnabled) {
            startReplayBuffer();
        }

        console.log('[Streaming] Initialized');
    }

    /**
     * Setup OBS WebSocket connection
     */
    function setupOBSConnection() {
        // OBS WebSocket would connect here
        console.log('[Streaming] OBS integration ready');

        // Create overlay server (mock)
        createOverlayServer();
    }

    /**
     * Create overlay server for OBS browser source
     */
    function createOverlayServer() {
        // In production, this would be a real WebSocket server
        // For now, we'll use localStorage for communication

        const overlayUrl = `http://localhost:${config.overlayPort}/overlay`;
        console.log('[Streaming] OBS Overlay URL:', overlayUrl);

        // Store overlay URL for streamers
        localStorage.setItem('obs-overlay-url', overlayUrl);
    }

    /**
     * Setup chat integration
     */
    function setupChatIntegration() {
        // Connect to chat provider (Twitch, YouTube, etc.)
        console.log('[Streaming] Chat integration ready for:', config.chatProvider);

        // Listen for chat commands
        window.addEventListener('message', handleChatMessage);
    }

    /**
     * Handle chat messages
     */
    function handleChatMessage(event) {
        if (event.data.type === 'chat-message') {
            processChatMessage(event.data);
        } else if (event.data.type === 'vote') {
            processViewerVote(event.data);
        }
    }

    /**
     * Process chat message
     */
    function processChatMessage(message) {
        chatMessages.push({
            user: message.user,
            text: message.text,
            timestamp: Date.now(),
            type: message.type
        });

        // Keep only last 100 messages
        if (chatMessages.length > 100) {
            chatMessages.shift();
        }

        // Handle chat commands
        if (message.text.startsWith('!')) {
            handleChatCommand(message);
        }

        updateOverlay();
    }

    /**
     * Handle chat commands
     */
    function handleChatCommand(message) {
        const [command, ...args] = message.text.slice(1).split(' ');

        switch (command.toLowerCase()) {
            case 'vote':
                initiateVote(args.join(' '));
                break;
            case 'highlight':
                createHighlight();
                break;
            case 'replay':
                requestReplay();
                break;
            case 'cam':
                switchCamera(args[0]);
                break;
        }
    }

    /**
     * Initiate viewer vote
     */
    function initiateVote(options) {
        const voteId = 'vote-' + Date.now();
        viewerVotes[voteId] = {
            options: options.split('|'),
            votes: {},
            total: 0,
            active: true
        };

        console.log('[Streaming] Vote started:', options);
        updateOverlay();

        // Auto-close vote after 60 seconds
        setTimeout(() => {
            closeVote(voteId);
        }, 60000);
    }

    /**
     * Process viewer vote
     */
    function processViewerVote(vote) {
        const { voteId, option, user } = vote;

        if (!viewerVotes[voteId] || !viewerVotes[voteId].active) {
            return;
        }

        // Record vote
        if (!viewerVotes[voteId].votes[option]) {
            viewerVotes[voteId].votes[option] = [];
        }

        viewerVotes[voteId].votes[option].push(user);
        viewerVotes[voteId].total++;

        updateOverlay();
    }

    /**
     * Close vote
     */
    function closeVote(voteId) {
        const vote = viewerVotes[voteId];
        if (!vote) return;

        vote.active = false;

        // Find winner
        let winner = null;
        let maxVotes = 0;

        for (const [option, voters] of Object.entries(vote.votes)) {
            if (voters.length > maxVotes) {
                maxVotes = voters.length;
                winner = option;
            }
        }

        console.log('[Streaming] Vote result:', winner, 'with', maxVotes, 'votes');

        // Execute vote result
        if (winner) {
            executeVoteResult(winner);
        }
    }

    /**
     * Execute vote result
     */
    function executeVoteResult(result) {
        // Apply game effect based on vote
        switch (result.toLowerCase()) {
            case 'spawn enemy':
                // Spawn additional enemy
                break;
            case 'powerup':
                // Give player powerup
                break;
            case 'darkness':
                // Increase fog
                break;
        }
    }

    /**
     * Start replay buffer
     */
    function startReplayBuffer() {
        // Record last 30 seconds of gameplay
        setInterval(() => {
            if (isStreaming) {
                recordFrame();
            }
        }, 1000 / 30); // 30 FPS

        console.log('[Streaming] Replay buffer started');
    }

    /**
     * Record frame
     */
    function recordFrame() {
        const gameState = {
            timestamp: Date.now(),
            player: {
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 }
            },
            camera: {
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 }
            },
            enemies: [],
            pellets: 0
        };

        replayBuffer.push(gameState);

        // Keep only last 30 seconds
        const maxFrames = 30 * 30; // 30 seconds at 30 FPS
        if (replayBuffer.length > maxFrames) {
            replayBuffer.shift();
        }
    }

    /**
     * Create highlight
     */
    function createHighlight() {
        console.log('[Streaming] Highlight created!');

        // Save last 15 seconds
        const highlightStart = Math.max(0, replayBuffer.length - (30 * 15));
        const highlight = replayBuffer.slice(highlightStart);

        // Save highlight
        saveHighlight(highlight);
    }

    /**
     * Save highlight
     */
    function saveHighlight(highlight) {
        const highlightId = 'highlight-' + Date.now();
        localStorage.setItem(highlightId, JSON.stringify(highlight));

        console.log('[Streaming] Highlight saved:', highlightId);
    }

    /**
     * Request replay
     */
    function requestReplay() {
        if (replayBuffer.length === 0) {
            console.log('[Streaming] No replay available');
            return;
        }

        console.log('[Streaming] Playing replay of last', replayBuffer.length / 30, 'seconds');
        playReplay(replayBuffer);
    }

    /**
     * Play replay
     */
    function playReplay(replay) {
        // Switch to replay camera
        const replayCamera = createDirectorCamera();

        // Play back frames
        let frameIndex = 0;

        function playFrame() {
            if (frameIndex >= replay.length) {
                endReplay();
                return;
            }

            const frame = replay[frameIndex];
            applyReplayFrame(frame);

            frameIndex++;
            setTimeout(playFrame, 1000 / 30);
        }

        playFrame();
    }

    /**
     * Create director camera
     */
    function createDirectorCamera() {
        directorCamera = {
            position: { x: 0, y: 10, z: 10 },
            target: { x: 0, y: 0, z: 0 },
            mode: 'cinematic'
        };

        return directorCamera;
    }

    /**
     * Apply replay frame
     */
    function applyReplayFrame(frame) {
        // Update camera and entities based on frame data
        // This would integrate with the rendering system
    }

    /**
     * End replay
     */
    function endReplay() {
        console.log('[Streaming] Replay ended');
        directorCamera = null;
    }

    /**
     * Switch camera
     */
    function switchCamera(view) {
        console.log('[Streaming] Switching to camera:', view);

        const views = {
            'first': 'First Person',
            'third': 'Third Person',
            'top': 'Top Down',
            'cinematic': 'Cinematic',
            'player': 'Player Focus',
            'enemy': 'Enemy Focus'
        };

        // Apply camera view
        // This would integrate with the camera system
    }

    /**
     * Update overlay
     */
    function updateOverlay() {
        // Update overlay data for OBS
        overlayData = {
            chat: chatMessages.slice(-10),
            votes: Object.entries(viewerVotes)
                .filter(([_, vote]) => vote.active)
                .map(([id, vote]) => ({
                    id,
                    options: vote.options,
                    votes: vote.votes,
                    total: vote.total
                })),
            stats: {
                viewers: 0,
                followers: 0,
                subscribers: 0
            }
        };

        // Broadcast to overlay
        broadcastOverlayUpdate();
    }

    /**
     * Broadcast overlay update
     */
    function broadcastOverlayUpdate() {
        // Send overlay data to OBS browser source
        // In production, this would use WebSocket
        localStorage.setItem('obs-overlay-data', JSON.stringify(overlayData));

        // Dispatch event for overlay listener
        window.dispatchEvent(new Event('obs-overlay-update'));
    }

    /**
     * Start streaming
     */
    function startStreaming() {
        isStreaming = true;
        console.log('[Streaming] Started');
    }

    /**
     * Stop streaming
     */
    function stopStreaming() {
        isStreaming = false;
        console.log('[Streaming] Stopped');
    }

    /**
     * Get overlay data
     */
    function getOverlayData() {
        return overlayData;
    }

    /**
     * Get stream stats
     */
    function getStreamStats() {
        return {
            isStreaming,
            chatMessages: chatMessages.length,
            activeVotes: Object.keys(viewerVotes).filter(id => viewerVotes[id].active).length,
            replayBufferSeconds: replayBuffer.length / 30
        };
    }

    // Public API
    return {
        init,
        startStreaming,
        stopStreaming,
        initiateVote,
        createHighlight,
        requestReplay,
        switchCamera,
        getOverlayData,
        getStreamStats,
        config,
        setConfig: (newConfig) => Object.assign(config, newConfig)
    };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StreamingIntegration;
}
