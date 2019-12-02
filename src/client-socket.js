'use strict';

// # ClientSocket
// A NodeJS Net.Socket client wrapper implementation with a Promise-based API
//
// There is a huge impedance mismatch between the event-based stream mechanisms used by the
// Net.Socket objects and any sort of Promise-based interfaces. This class is meant to bridge
// the gap between the two technologies using managed queueing techniques.

const net = require('net');
const util = require('util');
const debug = require('debug')('ClientSocket');

class ClientSocket {
    // ## API Methods
    //
    // ### ClientSocket.create
    // Static class factory method used to create an new instance of the `ClientSocket` class
    // ##### Parameters
    // - **host** [`String`]: Host name or IP address of the entity to connect to
    // - **port** [`String`|`Number`]: TCP port to connect to
    //
    // ##### Returns
    // `ClientSocket` instance
    static create(host, port) {
        debug('Creating new instance via "create"');
        return new ClientSocket(new net.Socket(), { host, port });
    }

    // ### ClientSocket.attach
    // Static class factory method used to attach and wrap a `Net.Socket` instance with a `ClientSocket` instance.
    // Use this if a `Net.Socket` is provided to you, like via a server socket `connect` event. Note that this
    // assumes that the socket instance is already connected. Otherwise, use the `ClientSocket.create` method.
    // ##### Parameters
    // - **socket** [`Net.Socket`]: Previously created `Net.Socket` instance
    //
    // ##### Returns
    // `ClientSocket` instance
    static attach(socket) {
        debug('Creating new instance via "attach"');
        return new ClientSocket(socket, {
            host: socket.remoteAddress,
            port: socket.remotePort,
            isConnected: true,
        });
    }

    // ### connect
    // Connect to the configured host and port.
    //
    // ##### Returns
    // `Promise` which is fulfilled when the socket connection is established.
    async connect() {
        if (this.isConnected) {
            return;
        }
        await this.connectAsync(this.port, this.host);
    }

    // ### read
    // Read a specified number of bytes from the socket.
    // ##### Parameters
    // - **readLength** [`Number`] (default: 0): The number of bytes to read from the socket. If the specified
    // value is equal to or less than zero, the `Promise` returned by the `read` call will be resolved with
    // either whatever data is stored in the interal buffer, at least 1 byte in length.
    //
    // ##### Returns
    // `Promise` which will be resolved with the read data, or rejected on read error.
    read(readLength = 0) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                reject(new Error('read attempted on disconnected socket'));
                return;
            }
            this.requests.push({
                process: () => {
                    const bufferLength = this.buffer.length;
                    debug('Read length = %d, buffer length = %d', readLength, bufferLength);
                    if (readLength <= 0 && bufferLength === 0) {
                        return false;
                    }
                    if (readLength > bufferLength) {
                        return false;
                    }

                    const sliceLength = (readLength > 0) ? readLength : bufferLength;
                    const results = this.buffer.slice(0, sliceLength);
                    this.buffer = this.buffer.slice(sliceLength);

                    debug('Results: %s, Buffer: %s', results.toString(), this.buffer.toString());
                    resolve(results.toString());
                    return true;
                },
                fail: reject,
            });

            this.processRequestQueue();
        });
    }

    // ### readUntil
    // Read data from the socket until a specified pattern has been found.
    // ##### Parameters
    // - **pattern** [`String`] (default: "\0"): The byte stream delimiter pattern to look for in the
    // data stream. The resolved `Promise` will include the pattern delimiter as well.
    //
    // ##### Returns
    // `Promise` which will be resolved with the read data, or rejected on read error.
    readUntil(pattern = '\0') {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                reject(new Error('readUntil attempted on disconnected socket'));
                return;
            }
            this.requests.push({
                process: () => {
                    const index = this.buffer.indexOf(pattern);
                    if (index < 0) {
                        return false;
                    }

                    debug('Read until "%s" pattern index %d', pattern, index);
                    const sliceLength = index + pattern.length;
                    const results = this.buffer.slice(0, sliceLength);
                    this.buffer = this.buffer.slice(sliceLength);

                    debug('Results: %s, Buffer: %s', results.toString(), this.buffer.toString());
                    resolve(results.toString());
                    return true;
                },
                fail: reject,
            });

            this.processRequestQueue();
        });
    }

    // ### flush
    // Flush out the receive buffer. This method is similar to the `read()` method. The difference here is that
    // if  the receive buffer is empty, the method will resolve immediately and not wait for data.
    // ##### Returns
    // `Promise` which will be resolved with the read data, or an empty string if there is no data in the receive
    // queye, or rejected on read error.
    flush() {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                reject(new Error('read attempted on disconnected socket'));
                return;
            }
            this.requests.push({
                process: () => {
                    const bufferLength = this.buffer.length;
                    if (bufferLength === 0) {
                        resolve('');
                        return true;
                    }
                    const results = this.buffer.slice(0, bufferLength);
                    this.buffer = this.buffer.slice(bufferLength);

                    debug('Results: %s, Buffer: %s', results.toString(), this.buffer.toString());
                    resolve(results.toString());
                    return true;
                },
                fail: reject,
            });

            this.processRequestQueue();
        });
    }

    // ### write
    // Write the specified data to the socket.
    // ##### Parameters
    // - **data** [`String`|`Buffer`]: The data to write to the socket
    //
    // ##### Returns
    // `Promise` which will be resolved when the data has been written, or rejected on write error.
    async write(data) {
        if (!this.isConnected) {
            throw new Error('write attempted on disconnected socket');
        }
        await this.writeAsync(data);
    }

    // ### close
    // Close the socket implementation. After this is called, the `ClientSocket` can no longer be used.
    //
    // ##### Returns
    // `Promise` which will be resolved when the socket has been closed.
    async close() {
        if (!this.isConnected) {
            return;
        }
        this.onClose();
    }

    // ## Internal Methods
    // These are not meant to be called by the user

    // #### Constructor
    // You can technically use the `ClientSocket` constructor, but the preferred way to instantiate the
    // class instances is via the factory methods: [ClientSocket.create](#section-3) and [ClientSocket.attach](#section-4)
    constructor(netSocket, {
        host,
        port,
        isConnected = false,
    }) {
        Object.assign(this, {
            isConnected,
            host,
            port,
            socket: netSocket,
            buffer: Buffer.from(''),
            requests: [],
        });

        Object.assign(this, {
            onClose: this.onClose.bind(this),
            onData: this.onData.bind(this),
            connectAsync: util.promisify(this.socket.connect).bind(this.socket),
            writeAsync: util.promisify(this.socket.write).bind(this.socket),
        });

        this.socket
            .on('data', this.onData)
            .on('error', this.onClose)
            .on('close', this.onClose)
            .on('end', this.onClose)
            .once('connect', () => {
                debug(`Connected (${this.host}:${this.port})`);
                this.isConnected = true;
            });
    }

    // #### onClose
    // This is the `close` event handler, which performs housekeeping on the wrapped `Net.Socket` object.
    onClose(err) {
        this.socket.destroy();
        this.isConnected = false;
        this.socket.removeAllListeners();

        this.drainRequests('Socket has been disconnected');
    }

    // #### onData
    // This is the `data` event handler, which queues the received data then performs read request resolution.
    onData(data) {
        this.buffer = Buffer.concat([this.buffer, data]);
        this.processRequestQueue();
    }

    // #### processRequestQueue
    // This method is called whenever a `read` request is made or data has been received via a `data` event.
    // It attempts to match the queued `read` requests with the data contained within the managed data buffer.
    processRequestQueue() {
        let isStillProcessing = this.isConnected;
        let [currentRequest] = this.requests;

        if (!isStillProcessing) {
            this.drainRequests('Socket has been disconnected');
        }

        while (isStillProcessing && currentRequest) {
            isStillProcessing = currentRequest.process();
            debug('Pending requests: %d, isStillProcessing: %s', this.requests.length, isStillProcessing);
            if (isStillProcessing) {
                this.requests.shift();
                [currentRequest] = this.requests;
            }
        }
    }

    // #### drainRequests
    // Clear out the request queue by sequentially failing (rejecting) each one. This will typically be
    // called via `processRequestQueue` if the socket has been disconnected and there are requests still
    // lingering in the requests queue.
    drainRequests(message) {
        this.requests.forEach(request => request.fail(new Error(message)));
        this.requests.splice(0);
    }
}

module.exports = {
    ClientSocket,
};
