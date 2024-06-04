import type { Request } from 'express';

export interface CustomRequest extends Request {
    orderId: string
    requesterIdentifier: string
}
