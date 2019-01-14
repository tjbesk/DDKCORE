const { createServerRPCMethod } = require('../util');


module.exports = createServerRPCMethod(
    'GET_FEE',

    /**
     * @param {WebSocketServer} wss
     * @param {object} params
     * @param {object} scope - Application instance
     */
    (wss, params, scope) => new Promise((resolve) => {
        scope.modules.blocks.submodules.api.getFee({ body: params }, (error, result) => {
            resolve(error
                ? { error }
                : result);
        });
    }));
