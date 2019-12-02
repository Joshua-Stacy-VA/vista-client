'use strict';

const delay = require('delay');
const VISTAClient = require('../src/index');
const { diff } = require('../src/utils');

// In this example, we show that we can manipulate the execution flow of a given sequence of RPCs
// setup in a VISTA Client instance. We do this by injecting control code in the 'result handler' function.
// The client can be manipulated based on results or external factors (such as elapsed time)

const client = new VISTAClient({
    host: 'localhost',
    port: 9430,
});

client.add('TCPConnect', ['localhost', 0, 'localhost']);
client.add('XUS SIGNON SETUP', ['"!|X|v|ZX|[ZvXivXv&E|[i\'E\'\'[[E|ZEJ[v&iZ&&|XJJX*']);
client.add('XUS INTRO MSG', []);
client.add('XUS AV CODE', [{ type: 'ENCRYPT', value: 'FAKEDOC1;!@#$1DOC' }]);
client.add('XWB IM HERE', [], { repeat: 1000000 });
client.add('#BYE#', []);

// Here, we initialize the communication session, then setup to repeat 'XWB IM HERE' for a long time. We also
// run an external timer that will shift the 'Current RPC' pointer to the end when the set duration has elapsed.
(async () => {
    const start = process.hrtime();

    await client.run(async (result) => {
        if (result.name !== 'XWB IM HERE') {
            console.log(result.name);
            return;
        }
        const elapsed = diff(process.hrtime(start));
        console.log(`XWB IM HERE: ${elapsed.toFixed(3)} msecs elapsed`);

        // If we're done, we jump to the last RPC in the sequence
        if (elapsed > 5000) {
            console.log('COMPLETE!');
            client.jumpTo().end();
        }
        await delay(500);
    });
})();
