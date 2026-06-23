const http = require('node:http');
const path = require('path');
const express = require('express');
const cors = require('cors');

const { loadWithMocks } = require('./moduleHarness');

const backendRoot = path.join(__dirname, '../..');
const routesModulePath = path.join(__dirname, '../../routes/index.js');

const clearBackendModuleCache = () => {
    for (const cacheKey of Object.keys(require.cache)) {
        if (cacheKey.startsWith(backendRoot)) {
            delete require.cache[cacheKey];
        }
    }
};

const startIntegrationServer = async (mocks = {}) => {
    clearBackendModuleCache();
    const harness = loadWithMocks(routesModulePath, mocks);

    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use('/api', harness.module);
    app.get('/', (req, res) => {
        res.json({ message: 'Gym Diary API funcionando ' });
    });

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    return {
        baseUrl,
        async close() {
            await new Promise((resolve, reject) => {
                server.close((error) => {
                    if (error) reject(error);
                    else resolve();
                });
            });
            harness.restore();
            clearBackendModuleCache();
        }
    };
};

module.exports = {
    startIntegrationServer
};
