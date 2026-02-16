(function () {
    'use strict';

    // Cross-tab state sync for ScaryGamesAI.
    // BroadcastChannel -> storage-event fallback -> in-tab CustomEvent dispatch.

    if (window.SGAIStateBus) return;

    var CHANNEL_NAME = 'sgai_state_bus_v1';
    var STORAGE_PING_KEY = 'sgai_state_bus_ping';
    var listeners = [];
    var bc = null;
    var hasBroadcastChannel = typeof BroadcastChannel !== 'undefined';

    function safeJsonParse(raw) {
        try { return JSON.parse(raw); } catch (e) { return null; }
    }

    function emit(msg, isRemote) {
        // Dispatch a global event so games/pages can react without directly depending on this file.
        try {
            window.dispatchEvent(new CustomEvent('sgai:state-updated', { detail: { message: msg, remote: !!isRemote } }));
        } catch (e) { }

        for (var i = 0; i < listeners.length; i++) {
            try { listeners[i](msg, !!isRemote); } catch (e) { }
        }
    }

    function post(msg) {
        if (!msg || typeof msg !== 'object') return;

        // Always emit locally first (same tab updates should be instant).
        emit(msg, false);

        // Cross-tab broadcast.
        if (bc) {
            try { bc.postMessage(msg); } catch (e) { }
            return;
        }

        // Fallback: storage event ping.
        try {
            localStorage.setItem(STORAGE_PING_KEY, JSON.stringify({ t: Date.now(), msg: msg, rand: Math.random() }));
        } catch (e) { }
    }

    function initChannel() {
        if (!hasBroadcastChannel) return;
        try {
            bc = new BroadcastChannel(CHANNEL_NAME);
            bc.onmessage = function (ev) {
                if (!ev || !ev.data) return;
                emit(ev.data, true);
            };
        } catch (e) {
            bc = null;
        }
    }

    function initStorageFallback() {
        window.addEventListener('storage', function (ev) {
            if (!ev) return;
            if (ev.key !== STORAGE_PING_KEY) return;
            var parsed = safeJsonParse(ev.newValue);
            if (!parsed || !parsed.msg) return;
            emit(parsed.msg, true);
        });
    }

    initChannel();
    initStorageFallback();

    window.SGAIStateBus = {
        on: function (handler) {
            if (typeof handler !== 'function') return function () { };
            listeners.push(handler);
            return function () {
                var idx = listeners.indexOf(handler);
                if (idx !== -1) listeners.splice(idx, 1);
            };
        },
        broadcast: post,
        broadcastStateUpdated: function (payload) {
            post(Object.assign({ type: 'STATE_UPDATED', ts: Date.now() }, payload || {}));
        }
    };
})();

