'use strict';

const EventEmitter = require('events');

/* eslint-disable */
class SocketMock extends EventEmitter {
    constructor() {
        super();
        this.writtenData = [];
        this.mocks = {
            connect: jest.fn(),
            write: jest.fn(),
            destroy: jest.fn(),
        };
    }

    reset() {
        this.writtenData.splice(0);
        Object.values(this.mocks).forEach(mock => mock.mockReset());
    }

    connect(port, host, callback) {
        Object.assign(this, {
            host,
            port,
        });
        this.mocks.connect(host, port);
        this.emit('connect');
        callback();
    }

    write(data, callback) {
        this.writtenData.push(Buffer.from(data));
        callback();
    }

    destroy() {
        this.mocks.destroy();
        setTimeout(() => {
            this.emit('close');
        }, 0);
    }

    mockEnd() {
        this.emit('end');
    }

    mockClose() {
        this.emit('close');
    }

    forceDisconnect(delay) {
        setTimeout(() => {
            this.isConnected = false;
        }, delay);
    }

    mockSendData(data) {
        this.emit('data', Buffer.from(data));
    }

    mockSendDataWithDelay(data, delay) {
        setTimeout(() => {
            this.mockSendData(data);
        }, delay);
    }

    mockError(errorMsg) {
        this.emit('error', new Error(errorMsg));
    }
}
/* eslint-enable */

module.exports = SocketMock;
