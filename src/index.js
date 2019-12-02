'use strict';

const { ClientSocket } = require('./client-socket');
const { RPC } = require('./rpc');
const {
    copy,
    isString,
    isArray,
    isFunction,
    isNil,
} = require('./utils');

const createRPC = (data, args, options) => {
    // Raw RPC string, with possible options object
    if (isString(data) && (!isArray(args))) {
        return RPC.createFromRaw(data, args);
    }

    // Simple RPC definition (name / args) with possible options object
    if (isString(data) && (isArray(args))) {
        return RPC.create(data, args, options);
    }

    // Data object, extract the data and use to create
    const { name, args: rpcArgs, ...rpcOptions } = data;
    return RPC.create(name, rpcArgs, rpcOptions);
};

class VISTAClient {
    constructor({ host, port, context = {} }) {
        Object.assign(this, {
            host,
            port,
            baseContext: copy(context),
            context: {},
            rpcList: [],
            responseHandlers: {},
            currentIndex: 0,
            isRunning: false,
            isStoringResults: true,
        });
    }

    load(data) {
        this.rpcList.push(...data.map(createRPC));
        return this;
    }

    add(data, args, options) {
        this.rpcList.push(createRPC(data, args, options));
        return this;
    }

    insertAt(index, data, args, options) {
        this.rpcList.splice(index, 0, createRPC(data, args, options));
        return this;
    }

    deleteAt(index) {
        this.rpcList.splice(index, 1);
        return this;
    }

    clear() {
        this.rpcList.splice(0, this.rpcList.length);
        return this;
    }

    storeResults(isStoring = true) {
        this.isStoringResults = isStoring;
    }

    addResponseHandler(name, handler) {
        this.responseHandlers[name] = handler;
    }

    async start() {
        this.reset();

        const { host, port } = this;
        Object.assign(this, {
            isRunning: true,
            context: Object.assign({}, this.baseContext),
            socket: ClientSocket.create(host, port),
        });

        await this.socket.connect();
    }

    async next() {
        if (this.currentIndex >= this.rpcList.length) {
            return null;
        }

        const rpc = this.rpcList[this.currentIndex];

        // If the conditions of this RPC says we shouldn't send it, we advance the pointer and move on
        if (!this._checkCondition(rpc)) {
            this.currentIndex += 1;

            const result = await this.next();
            return result;
        }

        // Write the request and wait for the response from the target VISTA
        const data = rpc.getRequest(this.context);
        await this.socket.write(data);

        const response = await this.socket.readUntil('\u0004');
        rpc.setRawResponse(response);

        await this.socket.flush();

        // Check the RPC to see if we're done with it. If so, we increment the current index
        if (rpc.isComplete()) {
            this.currentIndex += 1;
        }

        // If we're interested in preserving the result values, we do that here
        this._setContext(rpc);

        return this.isStoringResults ? rpc.lastResult() : rpc.popLastResult();
    }

    _checkCondition(rpc) {
        const { conditions = [] } = rpc.options;

        return conditions.every((condition) => {
            const { name, value } = condition;
            const contextVal = this.context[name];

            return (isNil(value) ? !isNil(contextVal) : contextVal === value);
        });
    }

    _setContext(rpc) {
        const { context = [] } = rpc.options;
        const result = rpc.lastResult();

        context.forEach((setter) => {
            const {
                name,
                handler,
                index = null,
                field = null,
            } = setter;

            const { value: val } = result.response;

            // If result array index and/or sub-field values have been specified, we handle that here
            const initialValue = (index === null ? val : val[index]);
            const fieldValue = (field === null ? initialValue : initialValue.split('^')[field] || '');

            // If we have a handler function defined for the named handler, we apply it to the output
            const responseHandler = this.responseHandlers[handler];
            this.context[name] = isFunction(responseHandler) ? responseHandler(fieldValue) : fieldValue;
        });
    }

    async end() {
        this.isRunning = false;

        await this.socket.close();
        delete this.socket;
    }

    async run(resultHandler) {
        await this.start();
        const isResultHandlerValid = isFunction(resultHandler);

        /* eslint-disable no-await-in-loop */
        while (this.isRunning) {
            const result = await this.next();
            if (result === null) {
                this.end();
            } else if (isResultHandlerValid) {
                await resultHandler(result);
            }
        }
        /* eslint-enable */
    }

    jumpTo(index = -1) {
        if (index >= 0) {
            this.currentIndex = Math.min(index, this.rpcList.length - 1);
            return {};
        }

        return {
            start: () => { this.currentIndex = 0; },
            end: () => { this.currentIndex = this.rpcList.length - 1; },
        };
    }

    reset() {
        Object.assign(this, {
            currentIndex: 0,
            isRunning: false,
            context: copy(this.baseContext),
        });
        this.rpcList.forEach(rpc => rpc.reset());
    }

    getResults() {
        return this.rpcList.reduce((results, rpc) => {
            results.push(...rpc.results);
            return results;
        }, []);
    }
}

module.exports = VISTAClient;
