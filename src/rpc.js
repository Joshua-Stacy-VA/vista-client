'use strict';

// # RPC
// A normalized representation of RPC request, response and ancillary data, as it relates to the VISTAClient.
//
// The **RPC** class takes care of the low-level RPC format functionality, as well as state and operational
// result storage, so that the VISTA Client doesn't have to.

const dateFormat = require('dateformat');
const { Encrypt, Format, Parse } = require('@vistadataproject/rpc-utilities');
const { checkForTemplates, renderTemplate } = require('./template');
const {
    value,
    identity,
    copy,
    diff,
} = require('./utils');

const encrypt = arg => Encrypt.encrypt(value(arg));

const NORMALIZER_MAP = {
    default: identity,
    unknownType: value,
    string: value,
    number: value,
    reference: identity,
    encrypt,
};

const DEFAULT_STATE = {
    iterations: 0,
    start: null,
    stop: null,
};

class RPC {
    static createFromRaw(raw, options = {}) {
        const { name, args } = Parse.parseRawRPC(raw);
        return new RPC({
            name,
            args,
            raw,
            options,
        });
    }

    static create(name, args = [], options = {}) {
        const normalizedArgs = args.map((arg) => {
            const { type = 'default' } = arg;
            const normalizer = NORMALIZER_MAP[type.toString().toLowerCase()] || NORMALIZER_MAP.unknownType;

            return normalizer(arg);
        });

        const isTemplated = normalizedArgs.some(checkForTemplates);
        const raw = !isTemplated ? Format.buildRpcString(name, normalizedArgs) : null;

        return new RPC({
            name,
            args: normalizedArgs,
            raw,
            options,
        });
    }

    reset() {
        Object.assign(this, {
            state: copy(DEFAULT_STATE),
            results: [],
        });
    }

    getRequest(context = {}) {
        const { state } = this;
        Object.assign(state, {
            timestamp: dateFormat(new Date(), 'isoUtcDateTime'),
            start: process.hrtime(),
            stop: null,
            iterations: state.iterations + 1,
            data: this.raw || this.generateRawData(context),
        });

        return state.data;
    }

    generateRawData(context) {
        const { state } = this;
        state.args = this.args.map(arg => renderTemplate(arg, context));

        return Format.buildRpcString(this.name, state.args);
    }

    setRawResponse(raw) {
        const val = Parse.parseRawResults(raw);
        this._response({ raw, val });
    }

    setResponse(val) {
        const raw = Format.buildResponseString(val);
        this._response({ raw, val });
    }

    isComplete() {
        const { repeat } = this.options;
        const { iterations } = this.state;

        return (!repeat || iterations >= repeat);
    }

    lastResult() {
        const { length } = this.results;
        return (length > 0 ? this.results[length - 1] : null);
    }

    popLastResult() {
        const { length } = this.results;
        return (length > 0 ? this.results.pop() : null);
    }

    constructor({
        name,
        args,
        raw,
        options,
    }) {
        Object.assign(this, {
            name,
            args,
            raw,
            options,
        });

        this.reset();
    }

    _response({ raw, val }) {
        const { state } = this;
        Object.assign(state, {
            stop: state.start ? process.hrtime(state.start) : null,
        });

        this.results.push(Object.assign({
            name: this.name,
            args: state.args || this.args,
            raw: state.data,
            response: {
                raw,
                value: val,
            },
            timestamp: state.timestamp,
            duration: state.start ? diff(state.stop) : 0.0,
            iteration: state.iterations,
        }));
    }
}

module.exports = { RPC };
