import { CONNECT_CHANNEL } from 'shared/driver/socket/channels';
import SocketMiddleware from 'core/api/middleware/socket';
import {ISocketServer, SocketServer} from 'shared/driver/socket/server';

const io = require('socket.io');

export class CoreRPCSocketServer extends SocketServer implements ISocketServer {

    run() {
        this.socket = io(this.port, this.config);
        this.socket.on(CONNECT_CHANNEL, (socket: any) => {
            console.log('Socket API Server %s connected', JSON.stringify(socket.handshake));
            SocketMiddleware.onConnect(socket);
            SocketMiddleware.registerAPI(socket);
        });
    }
}