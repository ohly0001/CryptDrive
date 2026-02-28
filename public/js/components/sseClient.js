// sseClient.js
const EVENTS_URL = '/sse/subscribe';
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 min
const RETRY_INTERVAL = 3000;
const ACTIVITY_EVENTS = ['mousemove','mousedown','keydown','scroll','touchstart','visibilitychange'];

let lastActivityTime = Date.now();
let activityTimeout = null;
let activityInterval = null;
let es = null; // SSE connection reference

// ---------------------
// Cleanup on shutdown
// ---------------------
function stopActivityPing() {
    // Stop throttled timeout
    if (activityTimeout) clearTimeout(activityTimeout);
    activityTimeout = null;

    // Stop interval ping
    if (activityInterval) clearInterval(activityInterval);
    activityInterval = null;

    // Remove activity listeners
    ACTIVITY_EVENTS.forEach(event => document.removeEventListener(event, onActivity, { passive: true }));

    // Close SSE
    if (es) {
        es.close();
        es = null;
    }
}

// ---------------------
// Activity tracking
// ---------------------
function notifyServer() {
    const now = Date.now();
    if (now - lastActivityTime < REFRESH_INTERVAL) return; // Throttle

    fetch('/sse/stayin-alive', { method: 'POST', keepalive: true })
        .then(res => {
            if (res.ok) lastActivityTime = Date.now();
            if (res.status === 401) window.location.replace('/');
        })
        .catch(err => console.error('Refresh failed', err));
}

function onActivity() {
    if (activityTimeout) clearTimeout(activityTimeout);
    activityTimeout = setTimeout(notifyServer, REFRESH_INTERVAL);
}

// Add activity listeners
ACTIVITY_EVENTS.forEach(event => document.addEventListener(event, onActivity, { passive: true }));

// Periodic ping even if no activity
activityInterval = setInterval(notifyServer, REFRESH_INTERVAL);

// ---------------------
// SSE connection
// ---------------------
function connectSSE() {
    es = new EventSource(EVENTS_URL);

    es.onopen = () => console.log('[SSE] Connected');

    es.onmessage = (event) => {
        let data;
        try {
            if (event.data.startsWith(':')) return; // Ignore heartbeat
            data = JSON.parse(event.data);
        } catch (err) {
            console.warn('[SSE] Failed to parse message:', event.data);
            return;
        }

        if (data?.type === 'session_timeout' || data?.type === 'shutdown') {
            stopActivityPing();
            window.location.replace('/');
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