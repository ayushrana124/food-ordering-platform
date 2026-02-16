import { Request } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { IUser } from '../models/User';
import { IAdmin } from '../models/Admin';

declare global {
    namespace Express {
        interface Request {
            io: SocketIOServer;
            user?: IUser;
            admin?: IAdmin;
        }
    }
}

export { };
