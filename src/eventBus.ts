// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventCallback = (...args: any[]) => void;

// Rename to ListernType since there are a lot of "listener" keywords in the code
type ListenerType = {
    // eslint-disable-next-line
    callback: EventCallback;
    triggerCapacity?: number;
};

class EventBus {
    // Memory storage for all the events
    private listeners: { [key: string]: ListenerType[] } = {};

    // creates an event that can be triggered any number of times
    /**
     * creates an event that can be triggered any number of times
     * @method on
     * @param {string} eventName - The name of the event
     * @param {function} callback - The callback to execute
     * @return {void}
     * @example eventBus.on('event.name', function() { console.log('event.name was triggered') })
     */
    on(eventName: string, callback: EventCallback): void {
        this.registerListener(eventName, callback);
    }

    /**
     * creates an event that can be triggered only once. If it is emitted twice, the callback will only be executed once!
     * @method once
     * @param {string} eventName - The name of the event
     * @param {function} callback - The callback to execute
     * @return {void}
     * @example eventBus.once('event.name', function() { console.log('event.name was triggered only once') })
     */
    once(eventName: string, callback: EventCallback): void {
        this.registerListener(eventName, callback, 1);
    }

    /**
     * reates an event that can be triggered only a number of times. If it is emitted more than that, the callback will not be be executed anymore!
     * @method exactly
     * @param {string} eventName - The name of the event
     * @return {void}
     * @example eventBus.exactly('event.name', function() { console.log('event.name was triggered 3 times') }, 3)
     */
    exactly(eventName: string, callback: EventCallback, capacity: number): void {
        this.registerListener(eventName, callback, capacity);
    }

    /**
     * kill an event with all it's callbacks
     * @method off
     * @param {string} eventName - The name of the event
     * @return {void}
     * @example eventBus.off('event.name')
     */
    off(eventName: string): void {
        delete this.listeners[eventName];
    }

    /**
     * removes the given callback for the given event
     * @method detach
     * @param {string} eventName - The name of the event
     * @param {function} callback - The callback to remove
     * @return {void|boolean} - Returns true if the event was found and removed, void otherwise
     * @example eventBus.detach('event.name', callback)
     */
    detach(eventName: string, callback: EventCallback): void | boolean {
        const listeners = this.listeners[eventName] || [];

        const filteredListeners = listeners.filter(function (value) {
            return value.callback !== callback;
        });

        if (eventName in this.listeners) {
            this.listeners[eventName] = filteredListeners;
            return true; // Event was found and removed
        }

        return false; // Event was not found
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    /**
     * emits an event with the given name and arguments
     * @param {string} eventName - The name of the event
     * @param {any} args - The arguments to pass to the callback
     * @return {void}
     * @use {__context: this|Instance} to pass the context to the callback
     * @example eventBus.emit('event.name', arg1, arg2, arg3)
     * @example eventBus.emit('event.name', arg1, arg2, arg3, {__context: YourInstance})
     */
    emit(eventName: string, ...args: any): void {
        let queueListeners: ListenerType[] = [];
        let matches = null;
        const allArgs = this.extractContextFromArgs(args);
        const context = allArgs[0];
        args = allArgs[1];

        // name exact match
        if (this.hasListener(eventName)) {
            queueListeners = this.listeners[eventName];
        } else {
            // -----------------------------------------
            // Wildcard support

            if (eventName.includes('*')) {
                // case 1, if the incoming string has * or ** in it
                // which will suppport emit("name*") or emit("name**") or emit("name.*name**")
                matches = this.patternSearch(eventName, Object.keys(this.listeners));

                if (matches) {
                    matches.forEach((match) => {
                        queueListeners = queueListeners.concat(this.listeners[match]);
                    });
                }
            } else {
                // case 2, if the incoming string matches a registered pattern
                // which will support on("name*") | on("name**") | on("name.*name**")
                for (const key in this.listeners) {
                    matches = this.patternSearch(key, [eventName]);

                    if (matches) {
                        queueListeners = queueListeners.concat(this.listeners[key]);
                    }
                }
            }
        }

        queueListeners.forEach((listener, k) => {
            let callback = listener.callback;

            if (context) {
                callback = callback.bind(context);
            }

            callback(...args);

            if (listener.triggerCapacity !== undefined) {
                listener.triggerCapacity--;
                queueListeners[k].triggerCapacity = listener.triggerCapacity;
            }

            if (this.checkToRemoveListener(listener)) {
                this.listeners[eventName].splice(k, 1);
            }
        });
    }

    /**
     * Search for a pattern in a list of strings
     * @method patternSearch
     * @private
     * @param {string} pattern - The pattern to search for
     * @param {string[]} list - The list of strings to search in
     * @return {string[]|null} - Returns a list of strings that match the pattern, or null if no match is found
     * @example patternSearch('name.*', ['name.a', 'name.b', 'name.c']) // returns ['name.a', 'name.b', 'name.c']
     */
    private patternSearch(pattern: string, list: string[]): string[] | null {
        let filteredList: string[] = [];
        // console.log('__testLogHere__', pattern, this.setWildCardString(pattern));
        const regex: RegExp = new RegExp(this.setWildCardString(pattern));

        filteredList = list.filter((item) => regex.test(item));

        return filteredList.length === 0 ? null : filteredList;
    }

    private setWildCardString(string: string) {
        // eslint-disable-next-line
        let regexStr = string.replace(/([.+?^${}()|\[\]\/\\])/g, '\\$&'); // escape all regex special chars

        regexStr = regexStr
            // eslint-disable-next-line
            .replace(/\*\*/g, '[_g_]') // Replace wildcard patterns with temporary markers
            // eslint-disable-next-line
            .replace(/\*/g, '(.*?)')
            .replace(/\[_g_\]/g, '.*');

        return `^${regexStr}$`;
    }

    /**
     * Extract the context from the arguments
     * @method extractContextFromArgs
     * @private
     * @param {any[]} args - The arguments to extract the context from
     * @return {any[]} - Returns an array with the context as the first element and the arguments as the second element
     */
    private extractContextFromArgs(args: any[]): any {
        let context = null;
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            // eslint-disable-next-line
            if (arg && typeof arg === 'object' && arg.hasOwnProperty('__context')) {
                context = arg.__context;
                args.splice(i, 1);
                break;
            }
        }
        return [context, args];
    }

    private registerListener(eventName: string, callback: EventCallback, triggerCapacity?: number) {
        if (!this.hasListener(eventName)) {
            this.listeners[eventName] = [];
        }

        this.listeners[eventName].push({ callback, triggerCapacity });
    }

    private checkToRemoveListener(eventInformation: ListenerType): boolean {
        if (eventInformation.triggerCapacity !== undefined) {
            return eventInformation.triggerCapacity <= 0;
        }

        return false;
    }

    private hasListener(eventName: string): boolean {
        return eventName in this.listeners;
    }
}

// @ts-ignore
declare global {
    interface Window {
        eventBus: EventBus;
    }
}

function _eventBus(): EventBus {
    // support for browser
    if (typeof window !== 'undefined') {
        if (!window.eventBus) {
            window.eventBus = new EventBus();
        }

        return window.eventBus;
    }

    if (typeof global !== 'undefined') {
        if (!(global as any).eventBus) {
            (global as any).eventBus = new EventBus();
        }

        return (global as any).eventBus;
    }

    // if none of the above is available, return a new instance
    return new EventBus();
}

export { EventBus, EventCallback, ListenerType, EventBus as default, _eventBus };
