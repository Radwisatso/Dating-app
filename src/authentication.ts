import { Context, Next } from "hono";
import jwt from 'jsonwebtoken'


export const authentication = async (c: Context, next: () => Promise<void>) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '')
    if (!token) {
        return c.json({ error: 'Authentication token is missing' }, 401);
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string)
        c.set('user', decoded)
        await next()
    } catch (error) {
        return c.json({ error: 'Invalid or expired token' }, 401);
    }
}