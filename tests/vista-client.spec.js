'use strict';

const net = require('net');
const SocketMock = require('./socket-mock');

jest.mock('net');

const socketMock = new SocketMock();
net.Socket = jest.fn().mockImplementation(() => socketMock);

const VISTAClient = require('../src/index');

describe('Static tests', () => {
    test('Constructor', () => {
        const client = new VISTAClient({ host: 'localhost', port: 9999 });
        expect(client).toBeDefined();
        expect(client.rpcList).toHaveLength(0);
    });
    test('RPC Setup', () => {
        const client = new VISTAClient({ host: 'localhost', port: 9999 });
        client.add({ name: 'FIRST', args: [] });
        client.add('[XWB]11302\u00051.108\u0010XUS SIGNON SETUP50058-31^DVBA_^123456789^MAN,MILLION^VAM^200^123456789^No phonef\u0004');

        expect(client.rpcList).toHaveLength(2);
        const [first, second] = client.rpcList;
        expect(first.name).toBe('FIRST');
        expect(second.name).toBe('XUS SIGNON SETUP');

        client.insertAt(1, { name: 'INSERTED' });
        expect(client.rpcList).toHaveLength(3);
        expect(client.rpcList[1].name).toBe('INSERTED');

        client.deleteAt(2);
        expect(client.rpcList).toHaveLength(2);
        expect(client.rpcList[1].name).toBe('INSERTED');

        client.clear();
        expect(client.rpcList).toHaveLength(0);
    });
    test('RPC Setup via "load"', () => {
        const data = [
            { name: 'FIRST', args: [] },
            '[XWB]11302\u00051.108\u0010XUS SIGNON SETUP50058-31^DVBA_^123456789^MAN,MILLION^VAM^200^123456789^No phonef\u0004',
        ];
        const client = new VISTAClient({ host: 'localhost', port: 9999 });
        client.load(data);

        expect(client.rpcList).toHaveLength(2);
        const [first, second] = client.rpcList;
        expect(first.name).toBe('FIRST');
        expect(second.name).toBe('XUS SIGNON SETUP');
    });
    test('"jumpTo"', () => {
        const client = new VISTAClient({ host: 'localhost', port: 9999 });
        client.add({ name: 'FIRST', args: [] });
        client.add({ name: 'SECOND', args: [] });
        client.add('THIRD', ['SOME ARGS']);

        client.jumpTo(1);
        expect(client.currentIndex).toBe(1);

        client.jumpTo().start();
        expect(client.currentIndex).toBe(0);

        client.jumpTo().end();
        expect(client.currentIndex).toBe(2);
    });
});

describe('Dynamic tests', () => {
    test('"run"', async () => {
        const client = new VISTAClient({ host: 'localhost', port: 9999 });
        client.addResponseHandler('split', value => value.split('^')[2]);

        client.add({ name: 'FIRST', args: [], context: [{ name: 'RESPONSE' }] });
        client.add({ name: 'SECOND', repeat: 2, context: [{ name: 'SECOND', index: 0 }] });
        client.add({ name: 'THIRD', context: [{ name: 'THIRD', handler: 'split' }] });
        client.add({ name: 'FOURTH', conditions: [{ name: 'NOPE', value: 100 }] });
        client.add({ name: 'FIFTH', conditions: [{ name: 'NOPE' }] });
        client.add({ name: 'SIXTH', context: [{ name: 'SIXTH', index: 1, field: 2 }] });
        client.add({ name: 'LAST', args: [] });

        socketMock.mockSendDataWithDelay('\u0000\u00001\u0004', 10);
        socketMock.mockSendDataWithDelay('\u0000\u00002\r\n3\r\n\u0004', 20);
        socketMock.mockSendDataWithDelay('\u0000\u00002\r\n3\r\n\u0004', 30);
        socketMock.mockSendDataWithDelay('\u0000\u00001^2^345^456\u0004', 40);
        socketMock.mockSendDataWithDelay('\u0000\u0000SOME DATA\r\nNOTTHIS^NOTTHIS^THISONE^NOTTHIS\r\n\u0004', 50);
        socketMock.mockSendDataWithDelay('\u0000\u00001\u0004', 60);

        let wasCalled = false;
        await client.run(async () => {
            wasCalled = true;
        });

        expect(wasCalled).toBeTruthy();

        const results = client.getResults();
        expect(results).toHaveLength(6);
        expect(client.context.RESPONSE).toBe('1');
        expect(client.context.SECOND).toBe('2');
        expect(client.context.THIRD).toBe('345');
        expect(client.context.SIXTH).toBe('THISONE');
    });
});
