import { Context } from "hono";
import jwt, { JwtPayload } from 'jsonwebtoken'
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface JwtPayloadResult {
    userId: string;
    email: string;
    is_premium: boolean;
    iat: number;
}


export const authentication = async (c: Context, next: () => Promise<void>) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '')
    if (!token) {
        return c.json({ error: 'Authentication token is missing' }, 401);
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayloadResult
        const foundUser = await prisma.user.findUnique({
            where: {
                id: decoded.userId
            }
        })
        if (!foundUser) {
            return c.json({ error: 'User not found' }, 404)
        }
        decoded.is_premium = foundUser.is_premium
        c.set('user', decoded)
        await next()
    } catch (error) {
        return c.json({ error: 'Invalid or expired token' }, 401);
    }
}