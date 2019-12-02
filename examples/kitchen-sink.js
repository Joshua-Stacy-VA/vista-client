'use strict';

const delay = require('delay');
const VISTAClient = require('../src/index');

// To run this test locally, start a nodeVISTA docker instance via Docker:
// `docker run --rm -d -p 9430:9430 -p 9000:9000 --name nodevista vistadataproject/nodevista999:latest`
const client = new VISTAClient({
    host: 'localhost',
    port: 9430,
    context: {
        SSN: '123456789',
    },
});

// With the VISTA Client library, RPCs are added to an internally managed list. The client uses this list as
// a playbook to interact with the configured VISTA system.
client.add({ name: 'TCPConnect', args: ['localhost', 0, 'localhost'] });

// The VISTA Client library has the ability to add templates to the argument strings. The 'context' object will be
// applied to each template definition. Note that adding templates to the RPC arguments will degrade performance,
// since the VISTA Client will have to generate a new raw RPC string each time.
client.add({
    name: 'XUS SIGNON SETUP',
    args: ['-31^DVBA_^{{SSN}}^MAN,MILLION^VAM^200^123456789^No phone'],
});

// Responses can be dynamically added to the runtime context. Specify the context key name (and optional array
// index) via the 'context' RPC definition property.  We can also define our own custom result parsers if we need
// to deal with data in different formats.
// Here, the first value of the response list will be stored as 'INFO_IEN' in the runtime context. Then, a custom
// response handler function will take the 4th element of the response list, split the value by '^' then grab the
// second value, which happens to correspond to the target VISTA name.
client.add({
    name: 'XUS GET USER INFO',
    args: [],
    context: [
        { name: 'INFO_IEN', index: 0 },
        { name: 'VISTA_NAME', handler: 'splitter' },
    ],
});
client.addResponseHandler('splitter', val => val[3].split('^')[1]);

// The VISTA Client can also encrypt arguments using the standard VISTA cipher. Just specify the argument type
// as 'ENCRYPT'.
client.add({
    name: 'XWB CREATE CONTEXT',
    args: [{ type: 'ENCRYPT', value: 'DVBA CAPRI GUI' }],
});

// You can still pass REFERENCE arguments to RPC calls. just specify the argument type as 'REFERENCE'
client.add({
    name: 'XWB GET VARIABLE VALUE',
    args: [{ type: 'REFERENCE', value: '$O(^VA(200,"SSN","{{SSN}}",0))' }],
    context: [{ name: 'IEN' }],
});

// You can also CONDITIONALLY send an RPC, depending on the context values, if the conditional check fails,
// the RPC won't be sent...
client.add({
    name: 'SOMETHING THAT WOULD FAIL',
    args: ['NOW'],
    conditions: [{
        name: 'IEN',
        value: 10000,
    }],
});

// If it succeeds, the RPC should be sent
client.add({
    name: 'ORWU DT',
    args: ['NOW'],
    conditions: [{
        name: 'IEN',
    }],
});

// You can have RPCs repeated, with the same values, multiple times. Just specify the 'repeat' field in the RPC
// definition object or options.
client.add({
    name: 'XWB IM HERE',
    args: [],
    repeat: 2,
});

// Note that there are several ways to add RPCs to the VISTA Client instance. You can use RPC definition JS objects
// as we have above. You can also add RPCs using simple name/arg format:
client.add('XWB IM HERE', [], { repeat: 2 });

// Finally, you can also specify the raw RPC data to send. All of these methods also accept definition options as well.
client.add('[XWB]11302\u00051.108\u000bXWB IM HERE54f\u0004', { repeat: 2 });

client.add('#BYE#', []);

(async () => {
    // Run the client. This includes:
    //    * Opening the socket based on the host/port variables
    //    * Sending the RPCs as defined above
    //    * Collecting run time results
    //    * Closing the socket at the end of the RPC list
    //
    // Note that after every response, the VISTAClient will call the async function passed to the
    // `run` method. The `result` object contains the collected results for the individual RPC.
    await client.run(async (result) => {
        console.dir(result, { depth: null, colors: true });
        await delay(500);
    });

    // Here, we should have 4 values:
    //   * SSN: from the original context
    //   * INFO_IEN: 68, set from the 'XUS GET USER INFO' call
    //   * VISTA_NAME: VISTA HEALTH CARE, set from the custom result handler in the 'XUS GET USER INFO' call
    //   * IEN: From the 'XWB GET VARIABLE VALUE' call
    console.dir(client.context, { depth: null, colors: true });
})();
