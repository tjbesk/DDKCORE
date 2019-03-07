import { RPC_METHODS } from 'api/middleware/rpcHolder';
import RewardControllerInstance, { RewardController } from 'api/controller/reward';
import ReferredUsersControllerInstance, { ReferredUsersController } from 'api/controller/referredUsers';
import AccountControllerInstance, { AccountController } from 'api/controller/account';

export class Middleware {

    private rewardController: RewardController;
    private referredUsersController: ReferredUsersController;
    private accountController: AccountController;

    constructor() {
        this.rewardController = RewardControllerInstance;
        this.referredUsersController = ReferredUsersControllerInstance;
        this.accountController = AccountControllerInstance;
    }

    processRequest(code: string, data: any, token?: string, socket?: any) {
        const method = RPC_METHODS[code];
        if (typeof method === 'function') {
            return method(data, token, socket);
        }
    }
}

export default new Middleware();