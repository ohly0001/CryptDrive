import { state, INTERVAL, STATUS, MAX_CLIENTS, MAX_SESSION_LENGTH } from './schedulerState.js';

let accountTimeoutInterval = null;

// ---------------------
// Client Management
// ---------------------
function removeClient(clientId) {
    const client = state.clients.get(clientId);
    if (!client) return;

    if (client.userId && state.users.has(client.userId)) {
        const userSet = state.users.get(client.userId);
        userSet.delete(clientId);
        if (userSet.size === 0) state.users.delete(client.userId);
    }

    try {
        if (client.res && !client.res.writableEnded) client.res.end();
    } catch {}

    state.clients.delete(clientId);
}

function enforceCapacity() {
    if (state.clients.size <= MAX_CLIENTS) return;

    const overflow = state.clients.size - MAX_CLIENTS;
    let removed = 0;
    for (const [clientId] of state.clients) {
        removeClient(clientId);
        removed++;
        if (removed >= overflow) break;
    }
}

// ---------------------
// Account Timeout
// ---------------------
function accountTimeout() {
    if (state.status !== STATUS.RUNNING) return;

    const now = Date.now();
    for (const [clientId, client] of state.clients) {
        if (now - client.lastActivity > MAX_SESSION_LENGTH) {
            try {
                if (client.res && !client.res.writableEnded) {
                    // Send a session_timeout event
                    client.res.write(`data: ${JSON.stringify({ type: 'session_timeout', message: 'Session expired' })}\n\n`);
                }
            } catch {}
            removeClient(clientId);
        }
    }
}

// ---------------------
// User Activity Update
// ---------------------
function updateTimeout(req, res) {
    const userId = req.user?._id ? String(req.user._id) : null;
    
    if (!userId) return res.sendStatus(401); 

    const userSet = state.users.get(userId);
    if (userSet) {
        const now = Date.now();
        for (const clientId of userSet) {
            const client = state.clients.get(clientId);
            if (client) client.lastActivity = now;
        }
    }

    if (req.session) {
        req.session.cookie.maxAge = MAX_SESSION_LENGTH;
        req.session.save((err) => {
            if (err) {
                console.error("Session save error:", err);
                return res.sendStatus(500);
            }
            res.sendStatus(200);
        });
    } else {
        res.sendStatus(200);
    }
}

// ---------------------
// SSE Subscription
// ---------------------
function subscribe(req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const clientId = state.nextClientId++;
    const userId = req.user?._id ? String(req.user._id) : null;

    const client = {
        id: clientId,
        res,
        userId,
        connectedAt: Date.now(),
        lastActivity: Date.now()
    };

    state.clients.set(clientId, client);

    if (userId) {
        if (!state.users.has(userId)) state.users.set(userId, new Set());
        state.users.get(userId).add(clientId);
    }

    enforceCapacity();

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
        if (!res.writableEnded) res.write(':\n\n'); // SSE comment heartbeat
    }, INTERVAL.HEARTBEAT);

    req.on('close', () => {
        clearInterval(heartbeat);
        removeClient(clientId);
    });
}

// ---------------------
// Scheduler Control
// ---------------------
function startScheduler() {
    if (state.status !== STATUS.STOPPED) return;

    state.status = STATUS.STARTING_UP;

    accountTimeoutInterval = setInterval(accountTimeout, INTERVAL.ACCOUNT_TIMEOUT);
    
    state.status = STATUS.RUNNING;
}

function stopScheduler() {
    if (state.status !== STATUS.RUNNING) return;

    state.status = STATUS.SHUTTING_DOWN;

    if (accountTimeoutInterval !== null) {
        clearInterval(accountTimeoutInterval);
        accountTimeoutInterval = null;
    }

    // Close all remaining SSE state.clients
    for (const clientId of state.clients.keys()) {
        removeClient(clientId);
    }

    state.status = STATUS.STOPPED;
}

// ---------------------
// Exports
// ---------------------
export default {
    unsubscribe,
    subscribe,
    updateTimeout,
    startScheduler,
    stopScheduler
};