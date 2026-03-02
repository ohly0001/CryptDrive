// sseClient.js
const EVENTS_URL = '/sse/subscribe';
const IDLE_THRESHOLD = 5 * 60 * 1000;   // 5 min of inactivity before ping
const PERIODIC_PING = 5 * 60 * 1000;    // ping even if never idle
const RETRY_INTERVAL = 3000;
const ACTIVITY_EVENTS = ['mousemove','mousedown','keydown','scroll','touchstart','visibilitychange'];

let lastActivityTime = Date.now();
let lastServerPing = 0;
let idleTimeout = null;
let periodicPingInterval = null;
let es = null;

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
    }
}

// ---------------------
// Notify server if idle threshold reached
// ---------------------
function notifyServer() {
    const now = Date.now();
    if (now - lastServerPing < 1000) return; // very small throttle to avoid double-ping

    fetch('/sse/stayin-alive', { method: 'POST', keepalive: true })
        .then(res => {
            lastServerPing = Date.now();

            if (res.ok) {
                lastActivityTime = Date.now(); // confirm activity on server
            }

            if (res.status === 401) {
                stopActivityPing();
                window.location.replace('/login.html');
            }
        })
        .catch(err => console.error('Activity ping failed', err));
}

// ---------------------
// Handle user activity
// ---------------------
function onActivity() {
    lastActivityTime = Date.now();

    if (idleTimeout) clearTimeout(idleTimeout);
    // Only notify server after IDLE_THRESHOLD ms of inactivity
    idleTimeout = setTimeout(notifyServer, IDLE_THRESHOLD);
}

// ---------------------
// Set up activity listeners
// ---------------------
ACTIVITY_EVENTS.forEach(event => document.addEventListener(event, onActivity, { passive: true }));

// Periodic ping for long-lived sessions (in case user never goes idle)
periodicPingInterval = setInterval(notifyServer, PERIODIC_PING);

// ---------------------
// SSE connection
// ---------------------
function connectSSE() {
    es = new EventSource(EVENTS_URL);

    es.onopen = () => console.log('[SSE] Connected');

    es.onmessage = (event) => {
        if (event.data.startsWith(':')) return; // ignore heartbeat

        let data;
        try { data = JSON.parse(event.data); } 
        catch (err) { console.warn('[SSE] Failed to parse message:', event.data); return; }

        if (data?.type === 'session_timeout' || data?.type === 'shutdown') {
            stopActivityPing();
            window.location.replace('/login.html');
        } else {
            document.dispatchEvent(new CustomEvent('sse-message', { detail: data }));
        }
    };

    es.onerror = () => {
        console.warn('[SSE] Connection lost, retrying...');
        es.close();
        setTimeout(connectSSE, RETRY_INTERVAL);
    };
}

// Start SSE connection
connectSSE();