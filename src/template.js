'use strict';

const { render } = require('mustache');
const { isString, isPlainObject, isFunction } = require('./utils');

const checkForTemplates = (arg) => {
    if (isString(arg)) {
        return /{{.+}}/g.test(arg);
    }
    if (isPlainObject(arg)) {
        const { value: argValue } = arg;
        return /{{.+}}/g.test(argValue);
    }
    return false;
};

const renderTemplate = (arg, context) => {
    if (isString(arg)) {
        return render(arg, context);
    }
    if (isPlainObject(arg)) {
        const { value: argValue } = arg;
        if (isString(argValue)) {
            arg.value = render(argValue, context);
        }
    }
    if (isFunction(arg)) {
        return arg(context);
    }
    return arg;
};

module.exports = {
    checkForTemplates,
    renderTemplate,
};
