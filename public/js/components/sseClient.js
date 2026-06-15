// sseClientSafe.js
const EVENTS_URL = '/sse/subscribe';
const IDLE_THRESHOLD = 5 * 60 * 1000;
const PERIODIC_PING = 5 * 60 * 1000;
const RETRY_INTERVAL = 3000;
const ACTIVITY_EVENTS = ['mousemove','mousedown','keydown','scroll','touchstart','visibilitychange'];

let lastActivityTime = Date.now();
let lastServerPing = 0;
let idleTimeout = null;
let periodicPingInterval = null;
let es = null;
let sseConnected = false;
let reconnectTimeout = null;

// ---------------------
// Stop activity tracking and SSE
// ---------------------
function stopActivityPing() {
    if (idleTimeout) clearTimeout(idleTimeout);
    idleTimeout = null;

    if (periodicPingInterval) clearInterval(periodicPingInterval);
    periodicPingInterval = null;

    ACTIVITY_EVENTS.forEach(event => document.removeEventListener(event, onActivity, { passive: true }));

    if (es) {
        es.close();
        es = null;
        sseConnected = false;
    }
}

// ---------------------
// Notify server if idle threshold reached
// ---------------------
function notifyServer() {
    const now = Date.now();
    if (now - lastServerPing < 1000) return;

    fetch('/sse/stayin-alive', { method: 'POST', keepalive: true })
        .then(res => {
            lastServerPing = Date.now();
            if (res.ok) lastActivityTime = Date.now();
            if (res.status === 401) {
                stopActivityPing();
                window.location.replace('/auth/login');
            }
        })
        .catch(err => console.warn('[ActivityPing] Failed', err));
}

// ---------------------
// Handle user activity
// ---------------------
function onActivity() {
    lastActivityTime = Date.now();
    if (idleTimeout) clearTimeout(idleTimeout);
    idleTimeout = setTimeout(notifyServer, IDLE_THRESHOLD);
}

// ---------------------
// Set up activity listeners
// ---------------------
ACTIVITY_EVENTS.forEach(event => document.addEventListener(event, onActivity, { passive: true }));
periodicPingInterval = setInterval(notifyServer, PERIODIC_PING);

// ---------------------
// SSE connection
// ---------------------
function connectSSE() {
    if (sseConnected) return; // prevent multiple connections
    sseConnected = true;

    es = new EventSource(EVENTS_URL);

    es.onopen = () => console.log('[SSE] Connected');

    es.onmessage = (event) => {
        if (event.data.startsWith(':')) return; // ignore heartbeat

        let data;
        try { data = JSON.parse(event.data); } 
        catch (err) { console.warn('[SSE] Failed to parse message:', event.data); return; }

        if (data?.type === 'session_timeout' || data?.type === 'shutdown') {
            stopActivityPing();
            window.location.replace('/auth/login');
        } else {
            document.dispatchEvent(new CustomEvent('sse-message', { detail: data }));
        }
    };

    es.onerror = () => {
        console.warn('[SSE] Connection lost, retrying...');
        es.close();
        sseConnected = false;
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(connectSSE, RETRY_INTERVAL);
    };
}

// ---------------------
// Close SSE gracefully on page unload
// ---------------------
window.addEventListener('beforeunload', stopActivityPing);

// ---------------------
// Start SSE connection
// ---------------------
connectSSE();