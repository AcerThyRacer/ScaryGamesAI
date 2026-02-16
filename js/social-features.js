/* ============================================
   ScaryGamesAI — Social Features System
   Friends, Chat, Clans, Spectator Mode
   ============================================ */

(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════

    const CONFIG = {
        storageKeys: {
            friends: 'sgai_friends',
            clans: 'sgai_clans',
            chat: 'sgai_chat_history',
            blocked: 'sgai_blocked_users',
            settings: 'sgai_social_settings',
        },
        maxFriends: 100,
        maxClanMembers: 50,
        chatHistoryLimit: 100,
        apiBase: '/api/social',
    };

    // ═══════════════════════════════════════════════════════════════
    // FRIENDS MANAGER
    // ═══════════════════════════════════════════════════════════════

    const FriendsManager = {
        friends: [],
        pendingRequests: [],
        sentRequests: [],
        blockedUsers: [],

        init() {
            this.load();
        },

        load() {
            try {
                const friendsRaw = localStorage.getItem(CONFIG.storageKeys.friends);
                const data = friendsRaw ? JSON.parse(friendsRaw) : {};
                this.friends = data.friends || [];
                this.pendingRequests = data.pendingRequests || [];
                this.sentRequests = data.sentRequests || [];

                const blockedRaw = localStorage.getItem(CONFIG.storageKeys.blocked);
                this.blockedUsers = blockedRaw ? JSON.parse(blockedRaw) : [];
            } catch (e) {
                this.friends = [];
                this.pendingRequests = [];
                this.sentRequests = [];
                this.blockedUsers = [];
            }
        },

        save() {
            try {
                localStorage.setItem(CONFIG.storageKeys.friends, JSON.stringify({
                    friends: this.friends,
                    pendingRequests: this.pendingRequests,
                    sentRequests: this.sentRequests,
                }));
                localStorage.setItem(CONFIG.storageKeys.blocked, JSON.stringify(this.blockedUsers));
            } catch (e) {}
        },

        // Add friend by username/ID
        async addFriend(userId) {
            if (this.friends.length >= CONFIG.maxFriends) {
                return { success: false, error: 'Friends list is full' };
            }

            if (this.isFriend(userId)) {
                return { success: false, error: 'Already friends' };
            }

            if (this.isBlocked(userId)) {
                return { success: false, error: 'User is blocked' };
            }

            // Simulate API call - in production, this would be a real API
            const friendData = {
                id: userId,
                username: `Player_${userId.slice(0, 6)}`,
                avatar: this._getRandomAvatar(),
                status: 'offline',
                lastSeen: Date.now(),
                addedAt: Date.now(),
            };

            // Add to sent requests
            this.sentRequests.push({
                ...friendData,
                sentAt: Date.now(),
            });

            this.save();
            this._notifyChange('friend_request_sent', friendData);

            return { success: true, data: friendData };
        },

        acceptFriend(requestId) {
            const request = this.pendingRequests.find(r => r.id === requestId);
            if (!request) {
                return { success: false, error: 'Request not found' };
            }

            // Move from pending to friends
            this.pendingRequests = this.pendingRequests.filter(r => r.id !== requestId);
            this.friends.push({
                ...request,
                addedAt: Date.now(),
            });

            this.save();
            this._notifyChange('friend_accepted', request);

            return { success: true };
        },

        declineFriend(requestId) {
            this.pendingRequests = this.pendingRequests.filter(r => r.id !== requestId);
            this.save();
            this._notifyChange('friend_declined', { id: requestId });
            return { success: true };
        },

        removeFriend(friendId) {
            const friend = this.friends.find(f => f.id === friendId);
            this.friends = this.friends.filter(f => f.id !== friendId);
            this.save();
            this._notifyChange('friend_removed', friend);
            return { success: true };
        },

        blockUser(userId) {
            if (!this.isBlocked(userId)) {
                this.blockedUsers.push({
                    id: userId,
                    blockedAt: Date.now(),
                });
                // Also remove from friends
                this.friends = this.friends.filter(f => f.id !== userId);
                this.save();
                this._notifyChange('user_blocked', { id: userId });
            }
            return { success: true };
        },

        unblockUser(userId) {
            this.blockedUsers = this.blockedUsers.filter(u => u.id !== userId);
            this.save();
            this._notifyChange('user_unblocked', { id: userId });
            return { success: true };
        },

        isFriend(userId) {
            return this.friends.some(f => f.id === userId);
        },

        isBlocked(userId) {
            return this.blockedUsers.some(u => u.id === userId);
        },

        getFriends() {
            return [...this.friends];
        },

        getOnlineFriends() {
            return this.friends.filter(f => f.status === 'online' || f.status === 'playing');
        },

        getPendingRequests() {
            return [...this.pendingRequests];
        },

        updateFriendStatus(friendId, status, currentGame = null) {
            const friend = this.friends.find(f => f.id === friendId);
            if (friend) {
                friend.status = status;
                friend.currentGame = currentGame;
                friend.lastSeen = Date.now();
                this.save();
                this._notifyChange('friend_status_changed', friend);
            }
        },

        _getRandomAvatar() {
            const avatars = ['💀', '👻', '🧟', '🎃', '🦇', '🕷️', '🧛', '☠️', '👹', '🤡'];
            return avatars[Math.floor(Math.random() * avatars.length)];
        },

        _notifyChange(event, data) {
            window.dispatchEvent(new CustomEvent('sgai-social-change', {
                detail: { type: event, data }
            }));
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // CHAT MANAGER
    // ═══════════════════════════════════════════════════════════════

    const ChatManager = {
        conversations: {},
        globalChat: [],
        isPanelOpen: false,
        activeConversation: null,
        socket: null,

        init() {
            this.load();
            this._setupGlobalChat();
        },

        load() {
            try {
                const raw = localStorage.getItem(CONFIG.storageKeys.chat);
                const data = raw ? JSON.parse(raw) : {};
                this.conversations = data.conversations || {};
                this.globalChat = data.globalChat || [];
            } catch (e) {
                this.conversations = {};
                this.globalChat = [];
            }
        },

        save() {
            try {
                // Trim history before saving
                const trimmedConversations = {};
                for (const [id, messages] of Object.entries(this.conversations)) {
                    trimmedConversations[id] = messages.slice(-CONFIG.chatHistoryLimit);
                }

                localStorage.setItem(CONFIG.storageKeys.chat, JSON.stringify({
                    conversations: trimmedConversations,
                    globalChat: this.globalChat.slice(-CONFIG.chatHistoryLimit),
                }));
            } catch (e) {}
        },

        // Send message to a friend
        sendMessage(friendId, message) {
            if (!this.conversations[friendId]) {
                this.conversations[friendId] = [];
            }

            const msg = {
                id: `msg_${Date.now()}`,
                from: 'me',
                to: friendId,
                text: message,
                timestamp: Date.now(),
                read: true,
            };

            this.conversations[friendId].push(msg);
            this.save();

            // Simulate receiving a response (for demo)
            setTimeout(() => {
                this._simulateResponse(friendId, message);
            }, 1000 + Math.random() * 2000);

            this._notifyChange('message_sent', msg);
            return msg;
        },

        // Receive message
        receiveMessage(fromId, message, fromUsername = 'Unknown') {
            if (!this.conversations[fromId]) {
                this.conversations[fromId] = [];
            }

            const msg = {
                id: `msg_${Date.now()}`,
                from: fromId,
                fromUsername,
                to: 'me',
                text: message,
                timestamp: Date.now(),
                read: false,
            };

            this.conversations[fromId].push(msg);
            this.save();
            this._notifyChange('message_received', msg);
            return msg;
        },

        getConversation(friendId) {
            return this.conversations[friendId] || [];
        },

        getAllConversations() {
            return { ...this.conversations };
        },

        markAsRead(friendId) {
            const messages = this.conversations[friendId] || [];
            messages.forEach(m => m.read = true);
            this.save();
        },

        getUnreadCount(friendId = null) {
            if (friendId) {
                return (this.conversations[friendId] || []).filter(m => !m.read).length;
            }

            let total = 0;
            for (const messages of Object.values(this.conversations)) {
                total += messages.filter(m => !m.read).length;
            }
            return total;
        },

        // Global chat
        sendGlobalMessage(message) {
            const msg = {
                id: `global_${Date.now()}`,
                from: PlayerProfile?.getUsername?.() || 'Anonymous',
                avatar: PlayerProfile?.getAvatar?.() || '💀',
                text: message,
                timestamp: Date.now(),
            };

            this.globalChat.push(msg);
            this.save();
            this._notifyChange('global_message', msg);
            return msg;
        },

        getGlobalChat() {
            return [...this.globalChat];
        },

        _setupGlobalChat() {
            // Add some initial messages for demo
            if (this.globalChat.length === 0) {
                const demoMessages = [
                    { from: 'ShadowHunter', avatar: '👻', text: 'Anyone want to play The Abyss?' },
                    { from: 'NightmareKing', avatar: '💀', text: 'Just beat my high score in Backrooms!' },
                    { from: 'GhostWhisperer', avatar: '🧛', text: 'The new Winter Pass is amazing!' },
                ];

                demoMessages.forEach((m, i) => {
                    this.globalChat.push({
                        id: `demo_${i}`,
                        ...m,
                        timestamp: Date.now() - (i + 1) * 60000,
                    });
                });
                this.save();
            }
        },

        _simulateResponse(friendId, originalMessage) {
            const responses = [
                "Nice! 👍",
                "That's awesome!",
                "Want to play together?",
                "I'm in game right now",
                "Sure thing!",
                "Let me check...",
                "Haha yeah",
                "Good luck!",
            ];

            const response = responses[Math.floor(Math.random() * responses.length)];
            this.receiveMessage(friendId, response, 'Friend');
        },

        _notifyChange(event, data) {
            window.dispatchEvent(new CustomEvent('sgai-chat-change', {
                detail: { type: event, data }
            }));
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // CLAN MANAGER
    // ═══════════════════════════════════════════════════════════════

    const ClanManager = {
        clans: [],
        myClan: null,

        init() {
            this.load();
        },

        load() {
            try {
                const raw = localStorage.getItem(CONFIG.storageKeys.clans);
                const data = raw ? JSON.parse(raw) : {};
                this.clans = data.clans || this._getDefaultClans();
                this.myClan = data.myClan || null;
            } catch (e) {
                this.clans = this._getDefaultClans();
                this.myClan = null;
            }
        },

        save() {
            try {
                localStorage.setItem(CONFIG.storageKeys.clans, JSON.stringify({
                    clans: this.clans,
                    myClan: this.myClan,
                }));
            } catch (e) {}
        },

        _getDefaultClans() {
            return [
                {
                    id: 'clan_shadow_hunters',
                    name: 'Shadow Hunters',
                    tag: '[SH]',
                    description: 'We hunt in the shadows',
                    icon: '🌑',
                    leader: 'ShadowMaster',
                    members: 24,
                    maxMembers: 50,
                    level: 15,
                    xp: 45000,
                    createdAt: Date.now() - 86400000 * 30,
                    isPublic: true,
                    totalScore: 1250000,
                },
                {
                    id: 'clan_nightmare_legion',
                    name: 'Nightmare Legion',
                    tag: '[NL]',
                    description: 'Fear is our weapon',
                    icon: '💀',
                    leader: 'NightmareKing',
                    members: 42,
                    maxMembers: 50,
                    level: 23,
                    xp: 89000,
                    createdAt: Date.now() - 86400000 * 60,
                    isPublic: true,
                    totalScore: 2500000,
                },
                {
                    id: 'clan_ghost_squad',
                    name: 'Ghost Squad',
                    tag: '[GS]',
                    description: 'We never sleep',
                    icon: '👻',
                    leader: 'GhostLeader',
                    members: 18,
                    maxMembers: 50,
                    level: 10,
                    xp: 25000,
                    createdAt: Date.now() - 86400000 * 14,
                    isPublic: true,
                    totalScore: 750000,
                },
            ];
        },

        createClan(name, tag, description, icon = '💀') {
            if (this.myClan) {
                return { success: false, error: 'Already in a clan' };
            }

            const clan = {
                id: `clan_${Date.now()}`,
                name,
                tag,
                description,
                icon,
                leader: PlayerProfile?.getUsername?.() || 'Player',
                members: 1,
                maxMembers: CONFIG.maxClanMembers,
                level: 1,
                xp: 0,
                createdAt: Date.now(),
                isPublic: true,
                totalScore: 0,
            };

            this.myClan = clan;
            this.clans.push(clan);
            this.save();
            this._notifyChange('clan_created', clan);

            return { success: true, data: clan };
        },

        joinClan(clanId) {
            if (this.myClan) {
                return { success: false, error: 'Already in a clan' };
            }

            const clan = this.clans.find(c => c.id === clanId);
            if (!clan) {
                return { success: false, error: 'Clan not found' };
            }

            if (clan.members >= clan.maxMembers) {
                return { success: false, error: 'Clan is full' };
            }

            clan.members++;
            this.myClan = clan;
            this.save();
            this._notifyChange('clan_joined', clan);

            return { success: true, data: clan };
        },

        leaveClan() {
            if (!this.myClan) {
                return { success: false, error: 'Not in a clan' };
            }

            const clan = this.clans.find(c => c.id === this.myClan.id);
            if (clan) {
                clan.members = Math.max(1, clan.members - 1);
            }

            this.myClan = null;
            this.save();
            this._notifyChange('clan_left', clan);

            return { success: true };
        },

        getClans() {
            return [...this.clans].sort((a, b) => b.totalScore - a.totalScore);
        },

        getMyClan() {
            return this.myClan;
        },

        getClanLeaderboard() {
            return this.getClans().slice(0, 10);
        },

        addClanXp(amount) {
            if (!this.myClan) return;

            this.myClan.xp += amount;
            const newLevel = Math.floor(this.myClan.xp / 5000) + 1;
            
            if (newLevel > this.myClan.level) {
                this.myClan.level = newLevel;
                this._notifyChange('clan_level_up', this.myClan);
            }

            // Update in clans list too
            const clan = this.clans.find(c => c.id === this.myClan.id);
            if (clan) {
                clan.xp = this.myClan.xp;
                clan.level = this.myClan.level;
            }

            this.save();
        },

        _notifyChange(event, data) {
            window.dispatchEvent(new CustomEvent('sgai-clan-change', {
                detail: { type: event, data }
            }));
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // SPECTATOR MODE
    // ═══════════════════════════════════════════════════════════════

    const SpectatorManager = {
        isSpectating: false,
        spectatingPlayer: null,
        spectators: [],

        startSpectating(playerId, playerData) {
            this.isSpectating = true;
            this.spectatingPlayer = {
                id: playerId,
                ...playerData,
                startedAt: Date.now(),
            };

            this._notifyChange('spectate_start', this.spectatingPlayer);
            return { success: true };
        },

        stopSpectating() {
            const prev = this.spectatingPlayer;
            this.isSpectating = false;
            this.spectatingPlayer = null;

            this._notifyChange('spectate_stop', prev);
            return { success: true };
        },

        updateSpectatorView(data) {
            if (!this.isSpectating) return;
            
            // This would update the spectator's view of the game
            window.dispatchEvent(new CustomEvent('sgai-spectator-update', {
                detail: data
            }));
        },

        getLiveGames() {
            // Return list of games being played by friends
            const liveGames = [];
            const friends = FriendsManager.getOnlineFriends();

            friends.forEach(friend => {
                if (friend.status === 'playing' && friend.currentGame) {
                    liveGames.push({
                        playerId: friend.id,
                        playerName: friend.username,
                        game: friend.currentGame,
                        spectators: Math.floor(Math.random() * 5),
                    });
                }
            });

            return liveGames;
        },

        _notifyChange(event, data) {
            window.dispatchEvent(new CustomEvent('sgai-spectator-change', {
                detail: { type: event, data }
            }));
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // SOCIAL PANEL UI
    // ═══════════════════════════════════════════════════════════════

    let socialPanel = null;

    function createSocialPanel() {
        if (socialPanel) return socialPanel;

        socialPanel = document.createElement('div');
        socialPanel.className = 'social-panel';
        socialPanel.innerHTML = `
            <div class="social-panel-backdrop"></div>
            <div class="social-panel-container">
                <div class="social-panel-header">
                    <h3>👥 Social</h3>
                    <button class="social-panel-close" aria-label="Close">✕</button>
                </div>
                <div class="social-tabs">
                    <button class="social-tab active" data-tab="friends">
                        Friends <span class="badge" id="friends-badge"></span>
                    </button>
                    <button class="social-tab" data-tab="chat">
                        Chat <span class="badge" id="chat-badge"></span>
                    </button>
                    <button class="social-tab" data-tab="clans">Clans</button>
                    <button class="social-tab" data-tab="spectate">Spectate</button>
                </div>
                <div class="social-content">
                    <div class="social-tab-content active" data-tab="friends"></div>
                    <div class="social-tab-content" data-tab="chat"></div>
                    <div class="social-tab-content" data-tab="clans"></div>
                    <div class="social-tab-content" data-tab="spectate"></div>
                </div>
            </div>
        `;

        // Bind events
        socialPanel.querySelector('.social-panel-backdrop').addEventListener('click', hideSocialPanel);
        socialPanel.querySelector('.social-panel-close').addEventListener('click', hideSocialPanel);

        socialPanel.querySelectorAll('.social-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                socialPanel.querySelectorAll('.social-tab').forEach(t => t.classList.remove('active'));
                socialPanel.querySelectorAll('.social-tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                socialPanel.querySelector(`.social-tab-content[data-tab="${tab.dataset.tab}"]`).classList.add('active');
                renderTabContent(tab.dataset.tab);
            });
        });

        return socialPanel;
    }

    function renderTabContent(tab) {
        const content = socialPanel.querySelector(`.social-tab-content[data-tab="${tab}"]`);
        if (!content) return;

        switch (tab) {
            case 'friends':
                renderFriendsTab(content);
                break;
            case 'chat':
                renderChatTab(content);
                break;
            case 'clans':
                renderClansTab(content);
                break;
            case 'spectate':
                renderSpectateTab(content);
                break;
        }
    }

    function renderFriendsTab(container) {
        const friends = FriendsManager.getFriends();
        const pending = FriendsManager.getPendingRequests();

        container.innerHTML = `
            <div class="social-section">
                <div class="social-section-header">
                    <span>Friends (${friends.length})</span>
                    <button class="btn-add-friend">+ Add Friend</button>
                </div>
                <div class="friends-list">
                    ${friends.length === 0 ? '<p class="empty-state">No friends yet. Add some!</p>' : 
                        friends.map(f => `
                            <div class="friend-item ${f.status}" data-id="${f.id}">
                                <div class="friend-avatar">${f.avatar || '👤'}</div>
                                <div class="friend-info">
                                    <div class="friend-name">${f.username}</div>
                                    <div class="friend-status">${f.status === 'online' ? '🟢 Online' : f.status === 'playing' ? `🎮 Playing ${f.currentGame || ''}` : '⚫ Offline'}</div>
                                </div>
                                <div class="friend-actions">
                                    <button class="btn-icon" data-action="chat" title="Chat">💬</button>
                                    <button class="btn-icon" data-action="spectate" title="Spectate">👁️</button>
                                    <button class="btn-icon danger" data-action="remove" title="Remove">✕</button>
                                </div>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
            ${pending.length > 0 ? `
                <div class="social-section">
                    <div class="social-section-header">
                        <span>Pending Requests (${pending.length})</span>
                    </div>
                    <div class="requests-list">
                        ${pending.map(r => `
                            <div class="request-item" data-id="${r.id}">
                                <div class="friend-avatar">${r.avatar || '👤'}</div>
                                <div class="friend-info">
                                    <div class="friend-name">${r.username}</div>
                                </div>
                                <div class="request-actions">
                                    <button class="btn-accept" data-action="accept">✓</button>
                                    <button class="btn-decline" data-action="decline">✕</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;

        // Bind friend actions
        container.querySelectorAll('.friend-item').forEach(item => {
            item.querySelectorAll('.btn-icon').forEach(btn => {
                btn.addEventListener('click', () => {
                    const action = btn.dataset.action;
                    const id = item.dataset.id;
                    if (action === 'remove') {
                        FriendsManager.removeFriend(id);
                        renderFriendsTab(container);
                    } else if (action === 'chat') {
                        // Switch to chat tab
                        socialPanel.querySelector('.social-tab[data-tab="chat"]').click();
                    }
                });
            });
        });

        // Bind request actions
        container.querySelectorAll('.request-item').forEach(item => {
            item.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', () => {
                    const action = btn.dataset.action;
                    const id = item.dataset.id;
                    if (action === 'accept') {
                        FriendsManager.acceptFriend(id);
                    } else {
                        FriendsManager.declineFriend(id);
                    }
                    renderFriendsTab(container);
                });
            });
        });
    }

    function renderChatTab(container) {
        const conversations = ChatManager.getAllConversations();
        const unread = ChatManager.getUnreadCount();

        container.innerHTML = `
            <div class="chat-container">
                <div class="chat-sidebar">
                    <div class="chat-section-title">Direct Messages</div>
                    <div class="chat-list">
                        ${Object.keys(conversations).length === 0 ? 
                            '<p class="empty-state">No conversations yet</p>' :
                            Object.entries(conversations).map(([id, msgs]) => {
                                const lastMsg = msgs[msgs.length - 1];
                                const unreadCount = msgs.filter(m => !m.read).length;
                                return `
                                    <div class="chat-item" data-id="${id}">
                                        <div class="chat-avatar">👤</div>
                                        <div class="chat-preview">
                                            <div class="chat-name">Friend</div>
                                            <div class="chat-last">${lastMsg?.text?.slice(0, 30) || ''}...</div>
                                        </div>
                                        ${unreadCount > 0 ? `<span class="chat-badge">${unreadCount}</span>` : ''}
                                    </div>
                                `;
                            }).join('')
                        }
                    </div>
                    <div class="chat-section-title">Global Chat</div>
                    <div class="chat-item global-chat active">
                        <div class="chat-avatar">🌐</div>
                        <div class="chat-preview">
                            <div class="chat-name">Global Chat</div>
                            <div class="chat-last">Everyone</div>
                        </div>
                    </div>
                </div>
                <div class="chat-main">
                    <div class="chat-messages" id="chat-messages">
                        ${renderGlobalChat()}
                    </div>
                    <div class="chat-input-area">
                        <input type="text" class="chat-input" placeholder="Type a message...">
                        <button class="chat-send">Send</button>
                    </div>
                </div>
            </div>
        `;

        // Bind send
        const input = container.querySelector('.chat-input');
        const sendBtn = container.querySelector('.chat-send');

        sendBtn.addEventListener('click', () => {
            const text = input.value.trim();
            if (text) {
                ChatManager.sendGlobalMessage(text);
                input.value = '';
                container.querySelector('#chat-messages').innerHTML = renderGlobalChat();
            }
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendBtn.click();
            }
        });
    }

    function renderGlobalChat() {
        const messages = ChatManager.getGlobalChat();
        return messages.map(m => `
            <div class="chat-message">
                <span class="chat-msg-avatar">${m.avatar}</span>
                <span class="chat-msg-author">${m.from}</span>
                <span class="chat-msg-text">${m.text}</span>
            </div>
        `).join('');
    }

    function renderClansTab(container) {
        const myClan = ClanManager.getMyClan();
        const clans = ClanManager.getClanLeaderboard();

        container.innerHTML = `
            ${myClan ? `
                <div class="social-section">
                    <div class="social-section-header">
                        <span>My Clan</span>
                    </div>
                    <div class="my-clan-card">
                        <div class="clan-icon">${myClan.icon}</div>
                        <div class="clan-info">
                            <div class="clan-name">${myClan.tag} ${myClan.name}</div>
                            <div class="clan-stats">
                                <span>Level ${myClan.level}</span>
                                <span>${myClan.members}/${myClan.maxMembers} members</span>
                            </div>
                        </div>
                        <button class="btn-leave-clan">Leave Clan</button>
                    </div>
                </div>
            ` : `
                <div class="social-section">
                    <div class="social-section-header">
                        <span>Clans</span>
                        <button class="btn-create-clan">+ Create Clan</button>
                    </div>
                    <p class="clan-hint">Join a clan to unlock shared progress and clan rewards!</p>
                </div>
            `}
            <div class="social-section">
                <div class="social-section-header">
                    <span>🏆 Top Clans</span>
                </div>
                <div class="clans-list">
                    ${clans.map((c, i) => `
                        <div class="clan-item" data-id="${c.id}">
                            <div class="clan-rank">#${i + 1}</div>
                            <div class="clan-icon">${c.icon}</div>
                            <div class="clan-info">
                                <div class="clan-name">${c.tag} ${c.name}</div>
                                <div class="clan-members">${c.members} members • Level ${c.level}</div>
                            </div>
                            ${!myClan && c.members < c.maxMembers ? `<button class="btn-join-clan" data-id="${c.id}">Join</button>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // Bind join buttons
        container.querySelectorAll('.btn-join-clan').forEach(btn => {
            btn.addEventListener('click', () => {
                ClanManager.joinClan(btn.dataset.id);
                renderClansTab(container);
            });
        });

        // Bind leave button
        const leaveBtn = container.querySelector('.btn-leave-clan');
        if (leaveBtn) {
            leaveBtn.addEventListener('click', () => {
                ClanManager.leaveClan();
                renderClansTab(container);
            });
        }
    }

    function renderSpectateTab(container) {
        const liveGames = SpectatorManager.getLiveGames();

        container.innerHTML = `
            <div class="social-section">
                <div class="social-section-header">
                    <span>Live Games</span>
                </div>
                <p class="spectate-hint">Watch your friends play in real-time!</p>
                <div class="live-games-list">
                    ${liveGames.length === 0 ? 
                        '<p class="empty-state">No friends are playing right now</p>' :
                        liveGames.map(g => `
                            <div class="live-game-item">
                                <div class="live-game-player">
                                    <span class="player-avatar">👤</span>
                                    <span class="player-name">${g.playerName}</span>
                                </div>
                                <div class="live-game-info">
                                    <span class="game-name">${g.game}</span>
                                    <span class="spectator-count">👁️ ${g.spectators} watching</span>
                                </div>
                                <button class="btn-spectate" data-player="${g.playerId}">Watch</button>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        `;
    }

    function showSocialPanel() {
        if (!socialPanel) {
            createSocialPanel();
        }
        document.body.appendChild(socialPanel);
        socialPanel.classList.add('visible');
        renderTabContent('friends');
        updateBadges();
    }

    function hideSocialPanel() {
        if (socialPanel) {
            socialPanel.classList.remove('visible');
        }
    }

    function toggleSocialPanel() {
        if (socialPanel && socialPanel.classList.contains('visible')) {
            hideSocialPanel();
        } else {
            showSocialPanel();
        }
    }

    function updateBadges() {
        const unreadChat = ChatManager.getUnreadCount();
        const pendingFriends = FriendsManager.getPendingRequests().length;

        const chatBadge = document.getElementById('chat-badge');
        const friendsBadge = document.getElementById('friends-badge');

        if (chatBadge) {
            chatBadge.textContent = unreadChat > 0 ? unreadChat : '';
            chatBadge.style.display = unreadChat > 0 ? 'inline' : 'none';
        }

        if (friendsBadge) {
            friendsBadge.textContent = pendingFriends > 0 ? pendingFriends : '';
            friendsBadge.style.display = pendingFriends > 0 ? 'inline' : 'none';
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // STYLES
    // ═══════════════════════════════════════════════════════════════

    function injectStyles() {
        if (document.getElementById('social-system-styles')) return;

        const style = document.createElement('style');
        style.id = 'social-system-styles';
        style.textContent = `
            /* Social Toggle Button */
            .social-toggle-btn {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 56px;
                height: 56px;
                border-radius: 50%;
                background: var(--accent-red, #cc1122);
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                box-shadow: 0 4px 15px rgba(204, 17, 34, 0.4);
                z-index: 1000;
                transition: transform 0.2s;
            }

            .social-toggle-btn:hover {
                transform: scale(1.1);
            }

            .social-toggle-btn .badge {
                position: absolute;
                top: -2px;
                right: -2px;
                background: var(--accent-green, #00ff88);
                color: #000;
                font-size: 11px;
                font-weight: bold;
                padding: 2px 6px;
                border-radius: 10px;
            }

            /* Social Panel */
            .social-panel {
                position: fixed;
                inset: 0;
                z-index: 10000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }

            .social-panel.visible {
                opacity: 1;
                visibility: visible;
            }

            .social-panel-backdrop {
                position: absolute;
                inset: 0;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(4px);
            }

            .social-panel-container {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.9);
                width: 90%;
                max-width: 700px;
                max-height: 85vh;
                background: var(--bg-secondary, #12121a);
                border-radius: 16px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
            }

            .social-panel.visible .social-panel-container {
                transform: translate(-50%, -50%) scale(1);
            }

            .social-panel-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 20px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .social-panel-header h3 {
                margin: 0;
                font-size: 20px;
            }

            .social-panel-close {
                width: 32px;
                height: 32px;
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                border-radius: 6px;
            }

            .social-panel-close:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .social-tabs {
                display: flex;
                background: rgba(0, 0, 0, 0.2);
                padding: 0 12px;
            }

            .social-tab {
                padding: 12px 20px;
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.5);
                font-size: 14px;
                cursor: pointer;
                border-bottom: 2px solid transparent;
                transition: all 0.2s;
            }

            .social-tab:hover {
                color: white;
            }

            .social-tab.active {
                color: white;
                border-bottom-color: var(--accent-red, #cc1122);
            }

            .social-tab .badge {
                background: var(--accent-green, #00ff88);
                color: #000;
                font-size: 10px;
                padding: 2px 5px;
                border-radius: 8px;
                margin-left: 6px;
            }

            .social-content {
                flex: 1;
                overflow-y: auto;
            }

            .social-tab-content {
                display: none;
                padding: 16px;
            }

            .social-tab-content.active {
                display: block;
            }

            .social-section {
                margin-bottom: 24px;
            }

            .social-section-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
                font-size: 14px;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.7);
            }

            /* Friends List */
            .friends-list, .requests-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .friend-item, .request-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                background: rgba(255, 255, 255, 0.03);
                border-radius: 8px;
            }

            .friend-item.online { border-left: 3px solid var(--accent-green, #00ff88); }
            .friend-item.playing { border-left: 3px solid var(--accent-orange, #ff6b35); }

            .friend-avatar {
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 50%;
                font-size: 20px;
            }

            .friend-info {
                flex: 1;
            }

            .friend-name {
                font-weight: 500;
            }

            .friend-status {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.5);
            }

            .friend-actions {
                display: flex;
                gap: 8px;
            }

            .btn-icon {
                width: 32px;
                height: 32px;
                background: rgba(255, 255, 255, 0.05);
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
            }

            .btn-icon:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .btn-icon.danger:hover {
                background: rgba(255, 77, 90, 0.2);
            }

            .btn-accept, .btn-decline {
                width: 32px;
                height: 32px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
            }

            .btn-accept {
                background: var(--accent-green, #00ff88);
                color: #000;
            }

            .btn-decline {
                background: rgba(255, 77, 90, 0.2);
                color: #ff4d5a;
            }

            /* Chat */
            .chat-container {
                display: flex;
                height: 400px;
            }

            .chat-sidebar {
                width: 200px;
                border-right: 1px solid rgba(255, 255, 255, 0.1);
                overflow-y: auto;
            }

            .chat-section-title {
                padding: 12px;
                font-size: 11px;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.4);
                text-transform: uppercase;
            }

            .chat-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 12px;
                cursor: pointer;
                transition: background 0.2s;
            }

            .chat-item:hover, .chat-item.active {
                background: rgba(255, 255, 255, 0.05);
            }

            .chat-avatar {
                font-size: 18px;
            }

            .chat-preview {
                flex: 1;
                min-width: 0;
            }

            .chat-name {
                font-size: 13px;
                font-weight: 500;
            }

            .chat-last {
                font-size: 11px;
                color: rgba(255, 255, 255, 0.4);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .chat-badge {
                background: var(--accent-red, #cc1122);
                color: white;
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 8px;
            }

            .chat-main {
                flex: 1;
                display: flex;
                flex-direction: column;
            }

            .chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: 12px;
            }

            .chat-message {
                margin-bottom: 8px;
                font-size: 13px;
            }

            .chat-msg-avatar {
                margin-right: 6px;
            }

            .chat-msg-author {
                font-weight: 600;
                color: var(--accent-cyan, #06b6d4);
            }

            .chat-msg-text {
                color: rgba(255, 255, 255, 0.8);
            }

            .chat-input-area {
                display: flex;
                gap: 8px;
                padding: 12px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }

            .chat-input {
                flex: 1;
                padding: 10px 14px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: white;
                font-size: 14px;
            }

            .chat-send {
                padding: 10px 20px;
                background: var(--accent-red, #cc1122);
                border: none;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                cursor: pointer;
            }

            /* Clans */
            .my-clan-card {
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 16px;
                background: linear-gradient(135deg, rgba(204, 17, 34, 0.2), rgba(139, 92, 246, 0.2));
                border-radius: 12px;
                margin-bottom: 16px;
            }

            .my-clan-card .clan-icon {
                font-size: 40px;
            }

            .clan-info {
                flex: 1;
            }

            .clan-name {
                font-size: 16px;
                font-weight: 600;
            }

            .clan-stats, .clan-members {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.5);
            }

            .clans-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .clan-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                background: rgba(255, 255, 255, 0.03);
                border-radius: 8px;
            }

            .clan-rank {
                width: 30px;
                font-weight: bold;
                color: var(--accent-orange, #ff6b35);
            }

            .clan-hint {
                font-size: 13px;
                color: rgba(255, 255, 255, 0.5);
                margin-bottom: 16px;
            }

            .btn-join-clan, .btn-create-clan, .btn-add-friend, .btn-leave-clan {
                padding: 6px 14px;
                background: var(--accent-red, #cc1122);
                border: none;
                border-radius: 6px;
                color: white;
                font-size: 12px;
                cursor: pointer;
            }

            .btn-leave-clan {
                background: transparent;
                border: 1px solid rgba(255, 77, 90, 0.5);
                color: #ff4d5a;
            }

            /* Live Games */
            .live-games-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .live-game-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                background: rgba(255, 255, 255, 0.03);
                border-radius: 8px;
            }

            .live-game-player {
                display: flex;
                align-items: center;
                gap: 8px;
                min-width: 120px;
            }

            .live-game-info {
                flex: 1;
            }

            .game-name {
                font-weight: 500;
            }

            .spectator-count {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.5);
            }

            .btn-spectate {
                padding: 8px 16px;
                background: var(--accent-purple, #8b5cf6);
                border: none;
                border-radius: 6px;
                color: white;
                font-size: 12px;
                cursor: pointer;
            }

            .empty-state {
                text-align: center;
                color: rgba(255, 255, 255, 0.4);
                padding: 24px;
            }

            /* Mobile */
            @media (max-width: 768px) {
                .social-panel-container {
                    width: 100%;
                    max-width: 100%;
                    height: 100%;
                    max-height: 100%;
                    border-radius: 0;
                }

                .social-panel.visible .social-panel-container {
                    transform: none;
                }

                .chat-sidebar {
                    display: none;
                }

                .social-toggle-btn {
                    bottom: 80px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // ═══════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════

    function init() {
        injectStyles();
        FriendsManager.init();
        ChatManager.init();
        ClanManager.init();

        // Create floating button
        const btn = document.createElement('button');
        btn.className = 'social-toggle-btn';
        btn.innerHTML = '👥';
        btn.title = 'Open Social Panel';
        btn.addEventListener('click', toggleSocialPanel);
        document.body.appendChild(btn);

        // Update badges periodically
        setInterval(updateBadges, 30000);
    }

    // ═══════════════════════════════════════════════════════════════
    // EXPORTS
    // ═══════════════════════════════════════════════════════════════

    window.SocialSystem = {
        init,
        showPanel: showSocialPanel,
        hidePanel: hideSocialPanel,
        togglePanel: toggleSocialPanel,
        updateBadges,
        Friends: FriendsManager,
        Chat: ChatManager,
        Clan: ClanManager,
        Spectator: SpectatorManager,
    };

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
