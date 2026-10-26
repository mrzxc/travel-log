const {spawn}=require('node:child_process');
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5181'],{windowsHide:true,stdio:'pipe'});
server.stdout.on('data',d=>{if(String(d).includes('ready')){const test=spawn(process.execPath,['scripts/route-smoke.cjs'],{env:{...process.env,TRAVEL_TEST_URL:'http://127.0.0.1:5181'},windowsHide:true,stdio:'inherit'});test.on('exit',code=>{server.kill();process.exitCode=code;});}});
