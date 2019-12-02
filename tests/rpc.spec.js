'use strict';

const { RPC } = require('../src/rpc');

describe('RPC Factory methods', () => {
    test('Standard creation', () => {
        const rpc = RPC.create('TEST');
        expect(rpc.name).toBe('TEST');
        expect(rpc.args).toHaveLength(0);
        expect(rpc.raw).toBe('[XWB]11302\u00051.108\u0004TEST54f\u0004');

        const raw = RPC.createFromRaw('[XWB]11302\u00051.108\rGET USER INFO50009100000101f0019SOME^MORESTUFF^heref\u0004');
        expect(raw.name).toBe('GET USER INFO');
        expect(raw.args).toHaveLength(2);
        expect(raw.args[0]).toBe('100000101');
        expect(raw.args[1]).toBe('SOME^MORESTUFF^here');
    });

    test('Invalid arg type', () => {
        const rpc = RPC.create('INVALID ARG TYPE', [{
            type: 'INVALID',
            value: 'DATA EXISTS',
        }]);
        const [arg] = rpc.args;
        expect(arg).toBe('DATA EXISTS');
    });

    test('Templated', () => {
        const rpc = RPC.create('TEST', ['{{variable}}']);
        expect(rpc.name).toBe('TEST');
        expect(rpc.args).toHaveLength(1);
        expect(rpc.raw).toBeNull();

        const refTypeRPC = RPC.create('ANOTHER', [{
            type: 'REFERENCE',
            value: '{{variable}}',
        }]);
        expect(refTypeRPC.name).toBe('ANOTHER');
        expect(refTypeRPC.args).toHaveLength(1);
        expect(refTypeRPC.raw).toBeNull();
    });
});

describe('Get Request', () => {
    test('Standard', () => {
        const rpc = RPC.create('TEST', ['HELLO WORLD', 2]);
        const request = rpc.getRequest();
        expect(request).toBe('[XWB]11302\u00051.108\u0004TEST50011HELLO WORLDf00012f\u0004');

        const {
            start,
            stop,
            iterations,
            data,
        } = rpc.state;

        expect(start).toBeDefined();
        expect(stop).toBeNull();
        expect(iterations).toBe(1);
        expect(data).toBe('[XWB]11302\u00051.108\u0004TEST50011HELLO WORLDf00012f\u0004');
    });
    test('Templated', () => {
        const rpc = RPC.create('TEST', ['{{variable}}', 2]);
        const request = rpc.getRequest({
            variable: 'HELLO WORLD',
        });
        expect(request).toBe('[XWB]11302\u00051.108\u0004TEST50011HELLO WORLDf00012f\u0004');
    });
    test('Templated reference object', () => {
        const refTypeRPC = RPC.create('TEST', [{
            type: 'REFERENCE',
            value: '{{variable}}',
        }]);
        const refRequest = refTypeRPC.getRequest({
            variable: 'HELLO WORLD',
        });
        expect(refRequest).toBe('[XWB]11302\u00051.108\u0004TEST51011HELLO WORLDf\u0004');
    });
});

describe('Set Response', () => {
    test('From raw response data', () => {
        const rpc = RPC.create('TEST', ['HELLO WORLD', 2]);
        rpc.getRequest();
        rpc.setRawResponse('\u0000\u00001\u0004');

        const { results } = rpc;
        expect(results).toHaveLength(1);

        const [{ response }] = results;
        expect(response.raw).toBe('\u0000\u00001\u0004');
        expect(response.value).toBe('1');
        expect(rpc.state.stop).toBeDefined();
    });
    test('From value response data', () => {
        const rpc = RPC.create('TEST', ['HELLO WORLD', 2]);
        rpc.getRequest();
        rpc.setResponse(12345);

        const { results } = rpc;
        expect(results).toHaveLength(1);

        const [{ response }] = results;
        expect(response.raw).toBe('\u0000\u000012345\u0004');
        expect(response.value).toBe(12345);
        expect(rpc.state.stop).toBeDefined();
    });
    test('Without request (start)', () => {
        const rpc = RPC.create('TEST', ['HELLO WORLD', 2]);
        rpc.setResponse(12345);

        const { results } = rpc;
        const [result] = results;

        expect(result.start).toBeUndefined();
        expect(result.duration).toBe(0.0);
    });
});

describe('Accessor convenience methods', () => {
    test('"isComplete"', () => {
        const rpc = RPC.create('TEST', ['HELLO WORLD', 2]);
        rpc.getRequest();
        rpc.setResponse(12345);

        expect(rpc.isComplete()).toBeTruthy();

        const repeater = RPC.create('TEST', [], { repeat: 5 });
        repeater.getRequest();
        repeater.setResponse(12345);

        expect(repeater.isComplete()).toBeFalsy();
    });
    test('"lastResult"', () => {
        const rpc = RPC.create('TEST', ['HELLO WORLD', 2]);
        rpc.getRequest();
        rpc.setResponse(12345);

        const result = rpc.lastResult();
        expect(typeof result).toBe('object');

        const noResults = RPC.create('TEST');
        expect(noResults.lastResult()).toBe(null);
    });
});
