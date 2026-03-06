// scheduler.js
import { state, INTERVAL, STATUS, MAX_CLIENTS, MAX_SESSION_LENGTH } from './schedulerState.js';

// ---------------------
// Client Management
// ---------------------
function removeClient(clientId, notify = true) {
    const client = state.clients.get(clientId);
    if (!client) return;

    try {
        if (client.res && !client.res.writableEnded && notify) {
            client.res.write(`data: ${JSON.stringify({ type: 'client_disconnected' })}\n\n`);
            client.res.end();
        }
    } catch {}

    // Remove from clients map first
    state.clients.delete(clientId);

    // Remove from user mapping safely
    if (client.userId && state.users.has(client.userId)) {
        const userSet = state.users.get(client.userId);
        userSet.delete(clientId);
        if (userSet.size === 0) state.users.delete(client.userId);
    }
}

// ---------------------
// Enforce max clients
// ---------------------
function enforceCapacity() {
    if (state.clients.size <= MAX_CLIENTS) return;

    const overflow = state.clients.size - MAX_CLIENTS;
    let removed = 0;
    for (const clientId of state.clients.keys()) {
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
    const clientsSnapshot = Array.from(state.clients.entries()); // snapshot to avoid mutation during iteration

    for (const [clientId, client] of clientsSnapshot) {
        if (!client) continue;

        const inactiveTime = now - client.lastActivity;
        if (inactiveTime > MAX_SESSION_LENGTH) {
            try {
                if (client.res && !client.res.writableEnded) {
                    client.res.write(`data: ${JSON.stringify({ type: 'session_timeout', message: 'Session expired due to inactivity' })}\n\n`);
                    client.res.end();
                }
            } catch {}

            // Remove client safely; session left alive in Mongo
            removeClient(clientId, false);
        }
    }
}

// ---------------------
// Update last activity
// ---------------------
function updateTimeout(req, res) {
    const userId = req.user?._id ? String(req.user._id) : null;
    if (!userId) return res.sendStatus(401);

    const now = Date.now();
    const userSet = state.users.get(userId);
    if (userSet) {
        // update lastActivity for all tabs safely
        userSet.forEach(clientId => {
            const client = state.clients.get(clientId);
            if (client) client.lastActivity = now;
        });
    }

    if (req.session) {
        req.session.cookie.maxAge = MAX_SESSION_LENGTH;
        req.session.save(err => {
            if (err && !err.message.includes('Unable to find the session to touch')) {
                console.error('Session save error:', err);
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
        session: req.session,
        connectedAt: Date.now(),
        lastActivity: Date.now()
    };

    state.clients.set(clientId, client);

    if (userId) {
        if (!state.users.has(userId)) state.users.set(userId, new Set());
        state.users.get(userId).add(clientId);
    }

    enforceCapacity();

    // Heartbeat
    const heartbeat = setInterval(() => {
        if (!res.writableEnded) res.write(':\n\n');
    }, INTERVAL.HEARTBEAT);

    req.on('close', () => {
        clearInterval(heartbeat);
        removeClient(clientId);
    });
}

// ---------------------
// Scheduler control
// ---------------------
function startScheduler() {
    if (state.status !== STATUS.STOPPED) return;

    state.status = STATUS.STARTING_UP;
    state.accountTimeoutInterval = setInterval(accountTimeout, INTERVAL.ACCOUNT_TIMEOUT);
    state.status = STATUS.RUNNING;
}

function stopScheduler() {
    if (state.status !== STATUS.RUNNING) return;

    state.status = STATUS.SHUTTING_DOWN;
    if (state.accountTimeoutInterval) {
        clearInterval(state.accountTimeoutInterval);
        state.accountTimeoutInterval = null;
    }

    // Remove all clients safely
    Array.from(state.clients.keys()).forEach(clientId => removeClient(clientId));
    state.status = STATUS.STOPPED;
}

// ---------------------
// Exports
// ---------------------
export default {
    subscribe,
    updateTimeout,
    startScheduler,
    stopScheduler
};