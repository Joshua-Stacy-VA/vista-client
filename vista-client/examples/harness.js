'use strict';

// This example shows how we might use the VISTA Client library as a test harness, using a definition file to run.

const fs = require('fs-extra');
const delay = require('delay');
const VISTAClient = require('../src/index');

const args = process.argv.slice(2);
const [configFile = 'config/simple.json', outputFile = 'results.json'] = args;

const { vista, context, rpcs } = fs.readJsonSync(configFile);

// To run this test locally, start a nodeVISTA docker instance via Docker:
// `docker run --rm -d -p 9430:9430 -p 9000:9000 --name nodevista vistadataproject/nodevista999:latest`
const client = new VISTAClient({ ...vista, context });
client.load(rpcs);

(async () => {
    const { host, port } = vista;
    console.log(`Connecting to VISTA ${host}:${port}`);

    await client.run(async (result) => {
        console.log(result.name);
        await delay(100);
    });

    const results = client.getResults();

    console.log(`Writing results to ${outputFile}`);
    fs.writeJsonSync(outputFile, results, { spaces: 4 });
})();
