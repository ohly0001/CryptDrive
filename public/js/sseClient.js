const LOGIN_URL = '/auth/login';
const EVENTS_URL = '/sse/subscribe';
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 min
const RETRY_INTERVAL = 3000;

let lastActivityTime = Date.now();
let isLeader = false; // Is this tab the one holding the SSE connection?

function becomeLeader() {
    isLeader = true;

    const connectSSE = () => {
        const es = new EventSource(EVENTS_URL);

        window.globalSSE = es;

        es.onopen = () => console.log('[SSE] Connected (leader tab)');
        es.onmessage = (event) => {
            const data = event.data.startsWith('{') ? JSON.parse(event.data) : event.data;

            // Broadcast to other tabs via localStorage
            localStorage.setItem('sse-event', JSON.stringify({ data, ts: Date.now() }));

            if (data?.type === 'session_timeout') {
                es.close();
                window.location.href = LOGIN_URL;
            } else {
                document.dispatchEvent(new CustomEvent('sse-message', { detail: data }));
            }
        };

        es.onerror = () => {
            console.warn('[SSE] Connection lost, retrying...');
            es.close();
            window.globalSSE = null;
            setTimeout(connectSSE, RETRY_INTERVAL);
        };
    };

    connectSSE();

    // Activity ping only from leader tab
    const notifyServer = () => {
        const now = Date.now();
        if (now - lastActivityTime > REFRESH_INTERVAL) {
            fetch('/sse/stayin-alive', {
                method: 'POST',
                keepalive: true
            })
            .then(res => {
                if (res.ok) lastActivityTime = now;
                if (res.status === 401) window.location.replace(LOGIN_URL); //prevents back navigation evasion
            })
            .catch(err => console.error('Refresh failed', err));
        }
    };

    ['mousemove','mousedown','keydown','scroll','touchstart','visibilitychange'].forEach(event => {
        document.addEventListener(event, notifyServer, { passive: true });
    });

    setInterval(notifyServer, REFRESH_INTERVAL);
}

// Handle multi-tab leadership
window.addEventListener('storage', (e) => {
    if (e.key === 'sse-leader' && e.newValue === null) {
        // Leader left, try to become leader
        tryBecomeLeader();
    }
    if (e.key === 'sse-event') {
        const obj = JSON.parse(e.newValue);
        if (!obj) return;
        const data = obj.data;

        if (data?.type === 'session_timeout') {
            window.location.href = LOGIN_URL;
        } else {
            document.dispatchEvent(new CustomEvent('sse-message', { detail: data }));
        }
    }
});

// Attempt to claim leadership
function tryBecomeLeader() {
    if (!localStorage.getItem('sse-leader')) {
        try {
            localStorage.setItem('sse-leader', Date.now().toString());
            becomeLeader();
        } catch (e) {
            console.warn('Failed to become leader tab', e);
        }
    }
}

// Release leadership on unload
window.addEventListener('beforeunload', () => {
    if (isLeader) {
        localStorage.removeItem('sse-leader');
    }
});

// Start on page load
tryBecomeLeader();