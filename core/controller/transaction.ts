import { ON } from 'core/util/decorator';
import { BaseController } from 'core/controller/baseController';
import { logger } from 'shared/util/logger';
import { IAsset, Transaction, TransactionModel } from 'shared/model/transaction';
import TransactionQueue from 'core/service/transactionQueue';
import TransactionService from 'core/service/transaction';
import TransactionPool from 'core/service/transactionPool';
import { Account } from 'shared/model/account';
import AccountRepo from 'core/repository/account';
import { ed } from 'shared/util/ed';

class TransactionController extends BaseController {
    @ON('TRANSACTION_RECEIVE')
    public async onReceiveTransaction(action: { data: { trs: TransactionModel<IAsset> } }): Promise<void> {
        const { data } = action;
        logger.debug(`[Controller][Transaction][onReceiveTransaction] ${JSON.stringify(data.trs)}`);

        if (!TransactionService.validate(data.trs)) {
            return;
        }

        if (TransactionPool.has(data.trs)) {
            return;
        }

        const trs = new Transaction(data.trs);
        
        const sender: Account = AccountRepo.getByAddress(trs.senderAddress);
        if (!sender) {
            AccountRepo.add({
                publicKey: trs.senderPublicKey,
                address: trs.senderAddress
            });
        } else {
            sender.secondPublicKey = trs.senderPublicKey;
        }
        
        TransactionQueue.push(trs);
    }
    
    @ON('TRANSACTION_CREATE')
    public async transactionCreate(action: { data: { trs: TransactionModel<IAsset>, secret: string } }): Promise<void> {
        const keyPair = ed.makeKeyPair(Buffer.from(action.data.secret));
        const responseTrs = TransactionService.create(action.data.trs, keyPair);
        if (responseTrs.success) {
            TransactionQueue.push(responseTrs.data);
        }
    }

}

export default new TransactionController();
