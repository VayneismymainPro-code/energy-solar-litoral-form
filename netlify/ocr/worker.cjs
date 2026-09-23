const path = require('node:path');
const { parentPort } = require('node:worker_threads');
const worker = require('tesseract.js/src/worker-script');
const getCore = require('tesseract.js/src/worker-script/node/getCore');
const gunzip = require('tesseract.js/src/worker-script/node/gunzip');
const cache = require('tesseract.js/src/worker-script/node/cache');

parentPort.on('message', packet => {
  worker.dispatchHandlers(packet, message => parentPort.postMessage(message));
});

worker.setAdapter({
  getCore: async (...args) => {
    const core = await getCore(...args);
    return options => core({
      ...options,
      locateFile: filename => path.join(__dirname, filename)
    });
  },
  gunzip,
  fetch: global.fetch || require('node-fetch'),
  ...cache
});
