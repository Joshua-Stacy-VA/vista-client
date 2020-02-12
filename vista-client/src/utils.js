'use strict';

const value = arg => arg.value;
const identity = arg => arg;
const copy = obj => Object.assign({}, obj);
const diff = hrtime => (hrtime[0] * 1000.0) + (hrtime[1] * 0.000001);
const isString = val => typeof val === 'string';
const isArray = val => Array.isArray(val);
const isFunction = val => typeof val === 'function';
const isPlainObject = val => (typeof val === 'object' && val.constructor === Object);
const isNil = val => (val === null || val === undefined);

module.exports = {
    value,
    identity,
    copy,
    diff,
    isString,
    isArray,
    isFunction,
    isPlainObject,
    isNil,
};
