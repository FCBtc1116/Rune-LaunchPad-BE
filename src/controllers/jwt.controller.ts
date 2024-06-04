import express, { type Request, type Response, } from "express";
import jwt, { type JwtPayload } from 'jsonwebtoken'
import { verifyMessage } from '@unisat/wallet-utils'
//import { adminConfigurationsContainer } from '../config/cosmosdb.adminConfigurations.config';

const SECRET = process.env.TOKEN_SECRET!;

interface JwtPayloadWithAdmin extends JwtPayload {
    admin?: boolean
}

interface ResponseData {
    verified: boolean
    token: string
    admin?: boolean
}

export const signJwt = async (req: Request, res: Response) => {
    const walletAddress: string = req.body.address
    const expirationTime = 20 // The expiration time in seconds

    const payload = {
        user_id: walletAddress,
        status: 'pending',
        exp: Math.floor(Date.now() / 1000) + expirationTime, // Expiration time in UNIX timestamp
    }

    const token = jwt.sign(payload, SECRET) // Signing the token with the secret
    res.status(200).json({ token }) // Sending the token back in the response
}

// const isAdminWallet = async (address: any) => {
//     // Example of fetching the AdminAccessControl document
//     const { resource: adminConfigDoc } = await adminConfigurationsContainer.item("AdminAccessControl", "AdminAccessControl").read();

//     // Check if the address is in the adminWallets list
//     return adminConfigDoc.adminWallets.includes(address);
// };

export const verifySignedJwt = async (req: Request, res: Response) => {
    const { pubkey, address, signedToken, token } = req.body

    let decoded: JwtPayload | string

    try {
        decoded = jwt.verify(token, SECRET)
    } catch (verifyError) {
        return res.status(401).send('Invalid JWT token')
    }

    if (typeof decoded === 'string') {
        return res.status(401).send('Invalid JWT token')
    }

    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        return res.status(401).send('JWT token expired')
    }

    const isSignatureValid = verifyMessage(pubkey, token, signedToken)
    if (!isSignatureValid) {
        return res.status(401).send('Invalid signature')
    }

    let newPayload: JwtPayloadWithAdmin = {
        user_id: address,
        status: 'verified',
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 2, // 2 hours
    }

    const newToken = jwt.sign(newPayload, SECRET)

    let response: ResponseData = {
        verified: true,
        token: newToken,
    }

    // if (await isAdminWallet(address)) {
    //     newPayload.admin = true;
    //     response.admin = true;
    // }

    if (!res.headersSent) {
        res.json(response)
    }
}