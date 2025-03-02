import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export function generateToken(userId: string): string {
    const secretKey = process.env.JWT_SECRET || 'your_secret_key';
    const expiresIn = '1h';
    return jwt.sign({ userId }, secretKey, { expiresIn });
}