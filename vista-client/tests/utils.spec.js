'use strict';

const {
    value,
    identity,
    copy,
    isString,
    isArray,
    isFunction,
    isPlainObject,
} = require('../src/utils');

test('value', () => {
    const testData = {
        type: 'SOMETHING',
        value: 'THE VALUE',
    };
    const result = value(testData);
    expect(result).toBe('THE VALUE');
});

test('identity', () => {
    const testData = {
        type: 'SOMETHING',
        value: 'THE VALUE',
    };
    const result = identity(testData);
    expect(typeof result).toBe('object');
    expect(result.type).toBe('SOMETHING');
    expect(result.value).toBe('THE VALUE');
});

test('copy', () => {
    const testData = {
        type: 'SOMETHING',
        value: 'THE VALUE',
    };
    const result = copy(testData);
    expect(typeof result).toBe('object');
    expect(result.type).toBe('SOMETHING');
    expect(result.value).toBe('THE VALUE');
});

test('is-Something', () => {
    expect(isString('PASS')).toBeTruthy();
    expect(isString({ key: 'FAIL' })).toBeFalsy();
    expect(isFunction(() => { console.log('PASS'); })).toBeTruthy();
    expect(isFunction('FAIL')).toBeFalsy();
    expect(isPlainObject({ key: 'PASS' })).toBeTruthy();
    expect(isPlainObject('FAIL')).toBeFalsy();
    expect(isPlainObject(['F', 'A', 'I', 'L'])).toBeFalsy();
    expect(isArray(['PASS', 'PASS'])).toBeTruthy();
    expect(isArray('FAIL')).toBeFalsy();
});
