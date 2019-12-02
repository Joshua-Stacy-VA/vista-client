'use strict';

const net = require('net');
const SocketMock = require('./socket-mock');
const { ClientSocket } = require('../src/client-socket');

jest.mock('net');

net.Socket = jest.fn().mockImplementation(() => new SocketMock());

describe('ClientSocket class', () => {
    test('Factory methods', () => {
        const created = ClientSocket.create('127.0.0.1', 10101);
        expect(created.socket).toBeDefined();
        expect(created.socket.eventNames()).toHaveLength(5);
        expect(created.isConnected).toBeFalsy();

        const attached = ClientSocket.attach(new net.Socket());
        expect(attached.socket).toBeDefined();
        expect(attached.socket.eventNames()).toHaveLength(5);
        expect(attached.isConnected).toBeTruthy();
    });

    test('connect', async () => {
        const created = ClientSocket.create('127.0.0.1', 10101);
        const { socket: socketMock } = created;

        await created.connect();
        expect(created.isConnected).toBeTruthy();
        expect(socketMock.mocks.connect).toHaveBeenCalledTimes(1);

        // Try connecting again to an already connected socket, this should return silently
        await created.connect();
        expect(created.isConnected).toBeTruthy();
        expect(socketMock.mocks.connect).toHaveBeenCalledTimes(1);
    });

    test('close', async () => {
        const created = ClientSocket.create('127.0.0.1', 10101);
        const { socket: socketMock } = created;

        await created.close();
        expect(created.isConnected).toBeFalsy();
        expect(socketMock.mocks.destroy).not.toHaveBeenCalled();

        // Try connecting again to an already connected socket, this should return silently
        await created.connect();
        await created.close();
        expect(created.isConnected).toBeFalsy();
        expect(socketMock.mocks.destroy).toHaveBeenCalledTimes(1);
        expect(created.socket.eventNames()).toHaveLength(0);
    });

    test('write', async () => {
        const created = ClientSocket.create('127.0.0.1', 10101);
        const { socket: socketMock } = created;

        await created.connect();
        await created.write('THIS IS A TEST');
        expect(socketMock.writtenData).toHaveLength(1);
        const [data] = socketMock.writtenData;
        expect(data.toString()).toBe('THIS IS A TEST');

        await created.close();
        expect(created.write('PROMISE SHOULD REJECT')).rejects.toBeDefined();
    });

    describe('Data read tests', () => {
        test('Default buffered reads with length', async () => {
            const socket = ClientSocket.create('127.0.0.1', 10101);
            const { socket: socketMock } = socket;

            await socket.connect();

            socketMock.mockSendData('THIS IS A TEST');
            const data = await socket.read();
            expect(data).toBe('THIS IS A TEST');

            socketMock.mockSendData('HELLO WORLD STOP');
            const limitData = await socket.read(11);
            expect(limitData).toBe('HELLO WORLD');

            // Test failure mode
            await socket.close();
            expect(socket.read()).rejects.toBeDefined();
        });
        test('Default buffered reads with delimiter', async () => {
            const socket = ClientSocket.create('127.0.0.1', 10101);
            const { socket: socketMock } = socket;

            await socket.connect();

            socketMock.mockSendData('THIS IS\0A TEST\u0004');
            const data = await socket.readUntil();
            expect(data).toBe('THIS IS\0');

            const limitData = await socket.readUntil('\u0004');
            expect(limitData).toBe('A TEST\u0004');

            // Test failure mode
            await socket.close();
            expect(socket.readUntil('FAIL')).rejects.toBeDefined();
        });
        test('Deferred reads with length', async () => {
            const socket = ClientSocket.create('127.0.0.1', 10101);
            const { socket: socketMock } = socket;

            await socket.connect();
            socketMock.mockSendDataWithDelay('THIS', 50);

            const data = await socket.read();
            expect(data).toBe('THIS');

            socketMock.mockSendDataWithDelay('THIS', 50);
            socketMock.mockSendDataWithDelay(' IS A TEST', 100);

            const waitData = await socket.read(14);
            expect(waitData).toBe('THIS IS A TEST');
        });
        test('Deferred reads with delimiter', async () => {
            const socket = ClientSocket.create('127.0.0.1', 10101);
            const { socket: socketMock } = socket;

            await socket.connect();

            socketMock.mockSendDataWithDelay('THIS', 50);
            socketMock.mockSendDataWithDelay(' IS A TEST\0', 100);

            const waitData = await socket.readUntil();
            expect(waitData).toBe('THIS IS A TEST\0');
        });
        test('Flush receive buffer', async () => {
            const socket = ClientSocket.create('127.0.0.1', 10101);
            const { socket: socketMock } = socket;

            await socket.connect();
            const empty = await socket.flush();

            expect(empty).toBe('');
            socketMock.mockSendData('HELLO TEST');

            const data = await socket.flush();
            expect(data).toBe('HELLO TEST');

            await socket.close();
            expect(socket.flush()).rejects.toBeDefined();
        });
    });
});
