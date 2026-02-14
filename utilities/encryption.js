import crypto from 'crypto';
import argon2 from 'argon2';

const algorithm = 'aes-256-gcm';

export async function derivekek(password, salt) {
    return await argon2.hash(password, {
        type: argon2.argon2id,
        salt: Buffer.from(salt, 'base64'),
        memoryCost: 19456,
        timeCost: 5,
        parallelism: 2,
        hashLength: 32,
        raw: true
    });
}

export function saltShaker() {
    return crypto.randomBytes(16).toString('base64');
}

export function generateAESKey() {
    return crypto.randomBytes(32).toString('base64'); // 256-bit AES
}

export function encrypt(text="", secretKey) {
    const key = Buffer.from(secretKey, 'base64');
    if (key.length !== 32) throw new Error('AES key must be 32 bytes');

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    const encryptedData = cipher.update(text, 'utf8', 'base64') + cipher.final('base64');
    const authTag = cipher.getAuthTag();

    return {
        encryptedData,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64')
    };
}

export function decrypt(encryptedObject, secretKey) {
    const key = Buffer.from(secretKey, 'base64');
    if (key.length !== 32) throw new Error('AES key must be 32 bytes');

    const iv = Buffer.from(encryptedObject.iv, 'base64');
    const authTag = Buffer.from(encryptedObject.authTag, 'base64');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedObject.encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}