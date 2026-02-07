import { pbkdf2 as pbkdf2Promise } from 'crypto/promises';
import { createDecipheriv, randomBytes } from 'crypto';

export async function deriveKEK(password) {
    const salt = 'cryptdrive-kek-salt';
    const derivedKey = await pbkdf2Promise(password, salt, 100_000, 32, 'sha256');
    return derivedKey; // Buffer
}

export function encrypt(text, secretKey) {
    const key = Buffer.from(secretKey, 'base64');
    if (key.length !== 32) throw new Error('AES key must be 32 bytes');

    const iv = randomBytes(16);
    const cipher = createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    return {
        encryptedData: encrypted,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64')
    };
}

export function decrypt(encryptedObject, secretKey) {
    const key = Buffer.from(secretKey, 'base64');
    if (key.length !== 32) throw new Error('AES key must be 32 bytes');

    const iv = Buffer.from(encryptedObject.iv, 'base64');
    const authTag = Buffer.from(encryptedObject.authTag, 'base64');

    const decipher = createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedObject.encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}