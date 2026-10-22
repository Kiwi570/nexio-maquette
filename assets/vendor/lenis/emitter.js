/**
 * Emitter class to handle events
 * @example
 * const emitter = new Emitter()
 * emitter.on('event', (data) => {
 *   console.log(data)
 * })
 * emitter.emit('event', 'data')
 */
export class Emitter {
    constructor() {
        this.events = {};
    }
    /**
     * Emit an event with the given data
     * @param event Event name
     * @param args Data to pass to the event handlers
     */
    emit(event, ...args) {
        var _a;
        const callbacks = this.events[event] || [];
        for (let i = 0, length = callbacks.length; i < length; i++) {
            (_a = callbacks[i]) === null || _a === void 0 ? void 0 : _a.call(callbacks, ...args);
        }
    }
    /**
     * Add a callback to the event
     * @param event Event name
     * @param cb Callback function
     * @returns Unsubscribe function
     */
    on(event, cb) {
        // Add the callback to the event's callback list, or create a new list with the callback
        if (this.events[event]) {
            this.events[event].push(cb);
        }
        else {
            this.events[event] = [cb];
        }
        // Return an unsubscribe function
        return () => {
            var _a;
            this.events[event] = (_a = this.events[event]) === null || _a === void 0 ? void 0 : _a.filter((i) => cb !== i);
        };
    }
    /**
     * Remove a callback from the event
     * @param event Event name
     * @param callback Callback function
     */
    off(event, callback) {
        var _a;
        this.events[event] = (_a = this.events[event]) === null || _a === void 0 ? void 0 : _a.filter((i) => callback !== i);
    }
    /**
     * Remove all event listeners and clean up
     */
    destroy() {
        this.events = {};
    }
}
