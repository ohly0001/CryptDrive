export const MAX_CLIENTS = 500;
export const MAX_SESSION_LENGTH = 1 * 60 * 60 * 1000;

export const STATUS = Object.freeze({
    COLD: "Cold", //starting from nothing, can be used to differentiate cold start from warm start
    STARTING_UP: "Starting Up",
    SHUTTING_DOWN: "Shutting Down",
    RUNNING: "Running",
    STOPPED: "Stopped",
    ERROR: "Error"
});

export const INTERVAL = {
    HEARTBEAT: 30 * 1000,
    ACCOUNT_TIMEOUT: 1 * 60 * 60 * 1000
}

export var state = {
    status: STATUS.STOPPED,
    nextClientId: 0,
    clients: new Map(),   // clientId -> client object
    users: new Map()     // userId -> Set of clientIds
}