const constants = require('../helpers/constants.js');
const sql = require('../sql/dapps.js');

// Private fields
let modules,
    library,
    __private = {},
    self;

__private.unconfirmedOutTansfers = {};

/**
 * Initializes library.
 * @memberof module:dapps
 * @class
 * @classdesc Main OutTransfer logic.
 * @param {Database} db
 * @param {ZSchema} schema
 * @param {Object} logger
 */
// Constructor
function OutTransfer(db, schema, logger) {
    library = {
        db,
        schema,
        logger,
    };
    self = this;
}

// Public methods
/**
 * Binds input modules to private variable module.
 * @param {Accounts} accounts
 * @param {Rounds} rounds
 * @param {Dapps} dapps
 */
OutTransfer.prototype.bind = function (accounts, rounds, dapps) {
    modules = {
        accounts,
        rounds,
        dapps,
    };
};

/**
 * Assigns data to transaction recipientId and amount.
 * Generates outTransfer data into transaction asset.
 * @param {Object} data
 * @param {transaction} trs
 * @return {transaction} trs with assigned data
 */
OutTransfer.prototype.create = function (data, trs) {
    trs.recipientId = data.recipientId;
    trs.amount = data.amount;

    trs.asset.outTransfer = {
        dappId: data.dappId,
        transactionId: data.transactionId
    };
    trs.trsName = 'OUT_TRANSFER';
    return trs;
};

/**
 * Returns send fee from constants.
 * @param {transaction} trs
 * @param {account} sender
 * @return {number} fee
 */
OutTransfer.prototype.calculateFee = function () {
    return constants.fees.send;
};

/**
 * Verifies recipientId, amount and outTransfer object content.
 * @param {transaction} trs
 * @param {account} sender
 * @param {function} cb
 * @return {setImmediateCallback} errors messages | trs
 */
OutTransfer.prototype.verify = function (trs, sender, cb) {
    if (!trs.recipientId) {
        return setImmediate(cb, 'Invalid recipient');
    }

    if (!trs.amount) {
        return setImmediate(cb, 'Invalid transaction amount');
    }

    if (!trs.asset || !trs.asset.outTransfer) {
        return setImmediate(cb, 'Invalid transaction asset');
    }

    if (!/^[0-9a-fA-F]+$/.test(trs.asset.outTransfer.dappId)) {
        return setImmediate(cb, 'Invalid outTransfer dappId');
    }

    if (!/^[0-9a-fA-F]+$/.test(trs.asset.outTransfer.transactionId)) {
        return setImmediate(cb, 'Invalid outTransfer transactionId');
    }

    return setImmediate(cb, null, trs);
};

OutTransfer.prototype.verifyUnconfirmed = function (trs, sender, cb) {
    return setImmediate(cb);
};

/**
 * Finds application into `dapps` table. Checks if transaction is already
 * processed. Checks if transaction is already confirmed.
 * @implements {library.db.one}
 * @param {transaction} trs
 * @param {account} sender
 * @param {function} cb
 * @return {setImmediateCallback} errors messages | trs
 */
OutTransfer.prototype.process = function (trs, sender, cb) {
    library.db.one(sql.countByTransactionId, {
        id: trs.asset.outTransfer.dappId
    }).then((row) => {
        if (row.count === 0) {
            return setImmediate(cb, `Application not found: ${trs.asset.outTransfer.dappId}`);
        }

        if (__private.unconfirmedOutTansfers[trs.asset.outTransfer.transactionId]) {
            return setImmediate(cb, `Transaction is already processed: ${trs.asset.outTransfer.transactionId}`);
        }

        library.db.one(sql.countByOutTransactionId, {
            transactionId: trs.asset.outTransfer.transactionId
        }).then((row) => {
            if (row.count > 0) {
                return setImmediate(cb, `Transaction is already confirmed: ${trs.asset.outTransfer.transactionId}`);
            }
            return setImmediate(cb, null, trs);
        }).catch(err => setImmediate(cb, err));
    }).catch(err => setImmediate(cb, err));
};

/**
 * Creates buffer with outTransfer content:
 * - dappId
 * - transactionId
 * @param {transaction} trs
 * @return {Array} Buffer
 * @throws {e} Error
 */
OutTransfer.prototype.getBytes = function (trs) {
    const dappIdBuf = Buffer.from(trs.asset.outTransfer.dappId, 'utf8');
    const transactionIdBuff = Buffer.from(trs.asset.outTransfer.transactionId, 'utf8');
    return Buffer.concat([dappIdBuf, transactionIdBuff]);
};

/**
 * Sets unconfirmed out transfers to false.
 * Calls setAccountAndGet based on transaction recipientId and
 * mergeAccountAndGet with unconfirmed trs amount.
 * @implements {modules.accounts.setAccountAndGet}
 * @implements {modules.accounts.mergeAccountAndGet}
 * @implements {modules.rounds.calc}
 * @param {transaction} trs
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function
 * @return {setImmediateCallback} error, cb
 */
OutTransfer.prototype.apply = function (trs, block, sender, cb) {
    __private.unconfirmedOutTansfers[trs.asset.outTransfer.transactionId] = false;

    modules.accounts.setAccountAndGet({ address: trs.recipientId }, (err) => {
        if (err) {
            return setImmediate(cb, err);
        }

        modules.accounts.mergeAccountAndGet({
            address: trs.recipientId,
            balance: trs.amount,
            u_balance: trs.amount,
            blockId: block.id,
            round: modules.rounds.calc(block.height)
        }, err => setImmediate(cb, err));
    });
};

/**
 * Sets unconfirmed out transfers to true.
 * Calls setAccountAndGet based on transaction recipientId and
 * mergeAccountAndGet with unconfirmed trs amount and balance both negatives.
 * @implements {modules.accounts.setAccountAndGet}
 * @implements {modules.accounts.mergeAccountAndGet}
 * @implements {modules.rounds.calc}
 * @param {transaction} trs
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function
 * @return {setImmediateCallback} error, cb
 */
OutTransfer.prototype.undo = function (trs, block, sender, cb) {
    __private.unconfirmedOutTansfers[trs.asset.outTransfer.transactionId] = true;

    modules.accounts.setAccountAndGet({ address: trs.recipientId }, (err) => {
        if (err) {
            return setImmediate(cb, err);
        }
        modules.accounts.mergeAccountAndGet({
            address: trs.recipientId,
            balance: -trs.amount,
            u_balance: -trs.amount,
            blockId: block.id,
            round: modules.rounds.calc(block.height)
        }, err => setImmediate(cb, err));
    });
};

/**
 * Sets unconfirmed OutTansfers to true.
 * @param {transaction} trs
 * @param {account} sender
 * @param {function} cb
 * @return {setImmediateCallback} cb
 */
OutTransfer.prototype.applyUnconfirmed = function (trs, sender, cb) {
    __private.unconfirmedOutTansfers[trs.asset.outTransfer.transactionId] = true;
    return setImmediate(cb);
};

/**
 * Sets unconfirmed OutTansfers to false.
 * @param {transaction} trs
 * @param {account} sender
 * @param {function} cb
 * @return {setImmediateCallback} cb
 */
OutTransfer.prototype.undoUnconfirmed = function (trs, sender, cb) {
    __private.unconfirmedOutTansfers[trs.asset.outTransfer.transactionId] = false;
    return setImmediate(cb);
};

OutTransfer.prototype.schema = {
    id: 'OutTransfer',
    object: true,
    properties: {
        dappId: {
            type: 'string',
            format: 'id',
            minLength: 1,
            maxLength: 20
        },
        transactionId: {
            type: 'string',
            format: 'id',
            minLength: 1,
            maxLength: 20
        }
    },
    required: ['dappId', 'transactionId']
};

/**
 * Calls `objectNormalize` with asset outTransfer.
 * @implements {library.schema.validate}
 * @param {transaction} trs
 * @return {error|transaction} error string | trs normalized
 * @throws {string} error message
 */
OutTransfer.prototype.objectNormalize = function (trs) {
    const report = library.schema.validate(trs.asset.outTransfer, OutTransfer.prototype.schema);

    if (!report) {
        throw `Failed to validate outTransfer schema: ${this.scope.schema.getLastErrors().map(err => err.message).join(', ')}`;
    }

    return trs;
};

/**
 * Creates outTransfer object based on raw data.
 * @param {Object} raw
 * @return {Object} outTransfer with dappId and transactionId
 */
OutTransfer.prototype.dbRead = function (raw) {
    if (!raw.ot_dappId) {
        return null;
    }
    const outTransfer = {
        dappId: raw.ot_dappId,
        transactionId: raw.ot_outTransactionId
    };

    return { outTransfer };
};

OutTransfer.prototype.dbTable = 'outtransfer';

OutTransfer.prototype.dbFields = [
    'dappId',
    'outTransactionId',
    'transactionId'
];

/**
 * Creates db operation object to 'outtransfer' table based on
 * outTransfer data.
 * @param {transaction} trs
 * @return {Object[]} table, fields, values.
 */
OutTransfer.prototype.dbSave = function (trs) {
    return {
        table: this.dbTable,
        fields: this.dbFields,
        values: {
            dappId: trs.asset.outTransfer.dappId,
            outTransactionId: trs.asset.outTransfer.transactionId,
            transactionId: trs.id
        }
    };
};

/**
 * Sends a 'withdrawal' message with dapp id and transaction id.
 * @implements {modules.dapps.message}
 * @param {transaction} trs
 * @param {function} cb
 * @return {setImmediateCallback} cb
 */
OutTransfer.prototype.afterSave = async (trs) => {
    modules.dapps.message(trs.asset.outTransfer.dappId, {
        topic: 'withdrawal',
        message: {
            transactionId: trs.id
        }
    }, null);
};

/**
 * Checks sender multisignatures and transaction signatures.
 * @param {transaction} trs
 * @param {account} sender
 * @return {boolean} True if transaction signatures greather than
 * sender multimin or there are not sender multisignatures.
 */
OutTransfer.prototype.ready = function (trs, sender) {
    if (Array.isArray(sender.multisignatures) && sender.multisignatures.length) {
        if (!Array.isArray(trs.signatures)) {
            return false;
        }
        return trs.signatures.length >= sender.multimin;
    }
    return true;
};

// Export
module.exports = OutTransfer;

/** ************************************* END OF FILE ************************************ */
