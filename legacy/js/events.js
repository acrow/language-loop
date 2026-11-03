// Lightweight global event bus for decoupled cross-module communication.
// Usage:
//   events.on('cloud:auth', (user) => { ... });
//   events.emit('cloud:auth', user);
class EventBus {
    constructor() {
        this._listeners = new Map();
    }

    on(event, callback) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(callback);
        // Return an unsubscribe function for convenience
        return () => this.off(event, callback);
    }

    off(event, callback) {
        const set = this._listeners.get(event);
        if (set) set.delete(callback);
    }

    emit(event, data) {
        const set = this._listeners.get(event);
        if (!set) return;
        set.forEach((callback) => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Event handler error for "${event}":`, error);
            }
        });
    }
}

const events = new EventBus();
