'use strict';

const delay = require('delay');
const VISTAClient = require('../src/index');

const client = new VISTAClient({
    host: 'localhost',
    port: 9430,
    context: {
        PATIENT_IEN: '25',
        HWND: '001E0468',
    },
});

client.add('TCPConnect', ['localhost', 0, 'localhost']);
client.add('XUS SIGNON SETUP', ['"!|X|v|ZX|[ZvXivXv&E|[i\'E\'\'[[E|ZEJ[v&iZ&&|XJJX*']);
client.add('XUS INTRO MSG', []);
client.add('XUS AV CODE', [{ type: 'ENCRYPT', value: 'FAKEDOC1;!@#$1DOC' }], { context: [{ name: 'USER_IEN', index: 0 }] });
client.add('XUS GET USER INFO', []);
client.add('XWB GET BROKER INFO', []);
client.add('XUS DIVISION GET', []);
client.add('XWB CREATE CONTEXT', ['$!']);
client.add('XWB CREATE CONTEXT', ['28!* f!=*Bku* <\\!~-']);
client.add('XWB CREATE CONTEXT', ['+RD{=Py{Dxq~R&~(']);
client.add('XWB CREATE CONTEXT', [' Xw+(]wB+qF{+(?sw=#']);
client.add('ORWU USERINFO', []);

// SELECT and time - note that only EXTRACT REC catches its absence in B2
client.add('ORWPT SELECT', ['{{PATIENT_IEN}}']);
client.add('ORWU DT', ['NOW']);

client.add('ORWCV START', ['{{PATIENT_IEN}}', '10.211.55.21', '{{HWND}}', '0', '', '1']);
client.add('ORWCV1 COVERSHEET LIST', []);

client.add('ORQQPL LIST', ['{{PATIENT_IEN}}', 'A']);
client.add('ORQQAL LIST', ['{{PATIENT_IEN}}']);
client.add('ORWU PATCH', ['GMRA*4.0*21']);
client.add('ORQQPP LIST', ['{{PATIENT_IEN}}']);
client.add('ORWPS COVER', ['{{PATIENT_IEN}}', '1']);

// Not in COVERSHEET response
client.add('ORQQPXRM REMINDERS UNEVALUATED', ['{{PATIENT_IEN}}', '0']);
client.add('ORQQPXRM REMINDER CATEGORIES', ['{{PATIENT_IEN}}', '0']);

client.add('ORQQVI VITALS', ['{{PATIENT_IEN}}']);
client.add('ORWCV VST', ['{{PATIENT_IEN}}']);

client.add('ORWCV POLL', ['{{PATIENT_IEN}}', '10.211.55.21', '{{HWND}}']);

client.add('ORWOR UNSIGN', ['{{PATIENT_IEN}}', '']);
client.add('ORPRF CLEAR', []);

// Not including ORWCH SAVFONT, ORWCH SAVEALL, TIU TEMPLATE SET DEFAULTS

// STOP ONLY called if POLL says nothing
client.add('ORWCV STOP', ['{{PATIENT_IEN}}', '10.211.55.21', '{{HWND}}']);

client.add('XWB DEFERRED CLEARALL', []);
client.add('XWB DEFERRED CLEARALL', []);
client.add('#BYE#', []);


(async () => {
    await client.run(async (result) => {
        console.dir(result, { depth: null, colors: true });
        await delay(500);
    });
    console.dir(client.context, { depth: null, colors: true });
})();
