import {
    IAssetStake,
    IAssetTransfer,
    IAssetVote,
    Transaction,
    TransactionLifecycle,
    TransactionModel,
    TransactionStatus,
    TransactionType
} from 'shared/model/transaction';
import { transactionSortFunc } from 'core/util/transaction';
import TransactionDispatcher from 'core/service/transaction';
import { logger } from 'shared/util/logger';
import SyncService from 'core/service/sync';
import { Account } from 'shared/model/account';
import AccountRepository from 'core/repository/account';
import { Address, TransactionId } from 'shared/model/types';
import TransactionHistoryRepository from 'core/repository/history/transaction';

export interface ITransactionPoolService<T extends Object> {

    batchRemove(transactions: Array<Transaction<T>>): Array<Transaction<T>>;

    getBySenderAddress(senderAddress: Address): Array<Transaction<T>>;

    getByRecipientAddress(recipientAddress: Address): Array<Transaction<T>>;

    removeBySenderAddress(senderAddress: Address): Array<Transaction<T>>;

    removeByRecipientAddress(address: Address): Array<Transaction<T>>;

    push(trs: Transaction<T>, sender?: Account, broadcast?: boolean): void;

    remove(trs: Transaction<T>);

    get(id: TransactionId): Transaction<T>;

    has(trs: Transaction<T>);

    popSortedUnconfirmedTransactions(limit: number): Array<Transaction<T>>;

    isPotentialConflict(trs: Transaction<T>);

    getSize(): number;

    getTransactions(): Array<Transaction<T>>;
}

class TransactionPoolService<T extends object> implements ITransactionPoolService<T> {
    private readonly pool: Map<TransactionId, Transaction<T>> = new Map();

    private readonly poolByRecipient: Map<Address, Array<Transaction<T>>> = new Map<Address, Array<Transaction<T>>>();
    private readonly poolBySender: Map<Address, Array<Transaction<T>>> = new Map<Address, Array<Transaction<T>>>();

    batchRemove(transactions: Array<Transaction<T>>): Array<Transaction<T>> {
        const removedTransactions = [];
        for (const trs of [...transactions].reverse()) {
            removedTransactions.push(...this.removeBySenderAddress(trs.senderAddress));
            removedTransactions.push(...this.removeByRecipientAddress(trs.senderAddress));
        }

        return removedTransactions;
    }

    getByRecipientAddress(recipientAddress: Address): Array<Transaction<T>> {
        return this.poolByRecipient.get(recipientAddress) || [];
    }

    getBySenderAddress(senderAddress: Address): Array<Transaction<T>> {
        return this.poolBySender.get(senderAddress) || [];
    }

    removeBySenderAddress(senderAddress: Address): Array<Transaction<T>> {
        const removedTransactions = [];
        const transactions = this.getBySenderAddress(senderAddress);
        for (const trs of [...transactions].reverse()) {
            this.remove(trs);
            removedTransactions.push(trs);
            TransactionHistoryRepository.addEvent(
                trs,
                { action: TransactionLifecycle.REMOVED_BY_SENDER_ADDRESS }
            );
        }
        return removedTransactions;
    }

    push(trs: Transaction<T>, sender: Account, broadcast: boolean = false): void {
        if (this.has(trs)) {
            logger.error(`[Service][TransactionPool][push] Transaction is already applied`);
            return;
        }

        this.pool.set(trs.id, trs);
        trs.status = TransactionStatus.PUT_IN_POOL;

        if (!this.poolBySender.has(trs.senderAddress)) {
            this.poolBySender.set(trs.senderAddress, []);
        }
        this.poolBySender.get(trs.senderAddress).push(trs);

        if (trs.type === TransactionType.SEND) {
            const asset: IAssetTransfer = <IAssetTransfer>trs.asset;
            this.addOneToPoolByRecipient(asset.recipientAddress, trs);
        }

        if (trs.type === TransactionType.VOTE) {
            const asset: IAssetVote = <IAssetVote>trs.asset;
            if (asset.reward || asset.unstake) {
                [...asset.airdropReward.sponsors.keys()].forEach((address: Address) => {
                    this.addOneToPoolByRecipient(address, trs);
                });
            }
        }

        if (trs.type === TransactionType.STAKE) {
            const asset: IAssetStake = <IAssetStake>trs.asset;
            [...asset.airdropReward.sponsors.keys()].forEach((address: Address) => {
                this.addOneToPoolByRecipient(address, trs);
            });
        }

        if (!sender) {
            sender = AccountRepository.getByAddress(trs.senderAddress);
        }

        TransactionDispatcher.applyUnconfirmed(trs, sender);
        TransactionHistoryRepository.addEvent(trs, { action: TransactionLifecycle.PUSH_IN_POOL });
        trs.status = TransactionStatus.UNCONFIRM_APPLIED;

        if (broadcast) {
            // TODO: check broadcast storm
            SyncService.sendUnconfirmedTransaction(trs);
        }
    }

    remove(trs: Transaction<T>): boolean {
        if (!this.pool.has(trs.id)) {
            logger.error(`[Service][TransactionPool][remove] Transaction is not applied to the pool`);
            return false;
        }

        try {
            const sender: Account = AccountRepository.getByPublicKey(trs.senderPublicKey);
            TransactionDispatcher.undoUnconfirmed(trs, sender);
        } catch (e) {
            logger.error(`[TransactionPool][remove]: ${e}`);
            logger.debug(`[TransactionPool][remove][stack]: \n ${e.stack}`);
        }

        this.pool.delete(trs.id);

        if (this.poolBySender.has(trs.senderAddress) && this.poolBySender.get(trs.senderAddress).indexOf(trs) !== -1) {
            this.poolBySender.get(trs.senderAddress).splice(this.poolBySender.get(trs.senderAddress).indexOf(trs), 1);
        }

        if (trs.type === TransactionType.SEND) {
            const asset: IAssetTransfer = <IAssetTransfer>trs.asset;
            this.removeOneFromPoolByRecipient(asset.recipientAddress, trs);
        }

        if (trs.type === TransactionType.VOTE || trs.type === TransactionType.STAKE) {
            const asset: IAssetVote | IAssetStake = <IAssetVote | IAssetStake>trs.asset;
            [...asset.airdropReward.sponsors.keys()].forEach((address: Address) => {
                this.removeOneFromPoolByRecipient(address, trs);
            });
        }
        

        return true;
    }

    addOneToPoolByRecipient(address: Address, trs: Transaction<T>): void {
        if (!this.poolByRecipient.has(address)) {
            this.poolByRecipient.set(address, []);
        }
        this.poolByRecipient.get(address).push(trs);
    }

    removeOneFromPoolByRecipient(address: Address, trs: Transaction<T>): void {
        if (this.poolByRecipient.has(address) &&
            this.poolByRecipient.get(address).indexOf(trs) !== -1
        ) {
            this.poolByRecipient.get(address)
                .splice(this.poolByRecipient.get(address).indexOf(trs), 1);
        }
    }

    removeByRecipientAddress(address: Address): Array<Transaction<T>> {
        const removedTransactions = [];
        const transactions = this.getByRecipientAddress(address);
        for (const trs of [...transactions].reverse()) {
            this.remove(trs);
            removedTransactions.push(trs);
            TransactionHistoryRepository.addEvent(
                trs,
                { action: TransactionLifecycle.REMOVED_BY_RECIPIENT_ADDRESS }
            );
        }
        return removedTransactions;
    }

    get(id: TransactionId): Transaction<T> {
        return this.pool.get(id);
    }

    has(trs: Transaction<T> | TransactionModel<T>) {
        return this.pool.has(trs.id);
    }

    popSortedUnconfirmedTransactions(limit: number): Array<Transaction<T>> {
        const transactions = [...this.pool.values()].sort(transactionSortFunc).slice(0, limit);
        const reversedTransactions = [...transactions].reverse();
        for (const trs of reversedTransactions) {
            this.remove(trs);
            TransactionHistoryRepository.addEvent(
                trs,
                { action: TransactionLifecycle.POP_FOR_BLOCK }
            );
        }

        return transactions;
    }

    isPotentialConflict(trs: Transaction<T>): boolean {
        const { senderAddress } = trs;
        const recipientTrs = this.poolByRecipient.get(senderAddress) || [];
        const senderTrs = this.poolBySender.get(senderAddress) || [];
        const dependTransactions = [...recipientTrs, ...senderTrs];

        if (dependTransactions.length === 0) {
            return false;
        }

        if (trs.type === TransactionType.SIGNATURE) {
            return true;
        }

        // if (
        //     (
        //         trs.type === TransactionType.VOTE ||
        //         trs.type === TransactionType.SEND ||
        //         trs.type === TransactionType.STAKE
        //     ) && dependTransactions.find((t: Transaction<T>) => t.type === TransactionType.VOTE)
        // ) {
        //     return true;
        // }

        if (
            trs.type === TransactionType.REGISTER &&
            dependTransactions.find((t: Transaction<T>) => t.type === TransactionType.REGISTER)
        ) {
            return true;
        }

        dependTransactions.push(trs);
        dependTransactions.sort(transactionSortFunc);
        return dependTransactions.indexOf(trs) !== (dependTransactions.length - 1);
    }

    getSize(): number {
        return this.pool.size;
    }

    getTransactions(): Array<Transaction<T>> {
        return [...this.pool.values()];
    }
}

export default new TransactionPoolService();
