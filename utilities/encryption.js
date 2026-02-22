import cryptDriveConfig from "../config/cryptDriveConfig.json" with { type: "json" };

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
    return crypto.randomBytes(cryptDriveConfig.passwordSaltRounds).toString('base64');
}

export function generateAESKey() {
    return crypto.randomBytes(cryptDriveConfig.aesKeySize).toString('base64'); // 256-bit AES
}

export function encryptBuffer(buffer, secretKeyBase64) {
    // decode base64 key
    const key = Buffer.from(secretKeyBase64, 'base64');
    if (key.length !== cryptDriveConfig.aesKeySize) throw new Error('AES key must be 32 bytes');

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    const encryptedData = Buffer.concat([
        cipher.update(buffer),
        cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    return {
        encryptedData,                  // raw Buffer to write to disk
        iv: iv.toString('base64'),      // store in JSON metadata
        authTag: authTag.toString('base64')
    };
}

export function encrypt(text="", secretKey) {
    const key = Buffer.from(secretKey, 'base64');
    if (key.length !== cryptDriveConfig.aesKeySize) throw new Error('AES key must be 32 bytes');

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    const encryptedData = cipher.update(text, 'utf8', 'base64') + cipher.final('base64');
    const authTag = cipher.getAuthTag();

    return {
        encryptedData,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64')
    };
}

export function decryptBuffer(encryptedData, ivBase64, authTagBase64, secretKeyBase64) {
    const key = Buffer.from(secretKeyBase64, 'base64');
    if (key.length !== cryptDriveConfig.aesKeySize) throw new Error('AES key must be 32 bytes');

    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final()
    ]);

    return decrypted;
}

export function decrypt(encryptedObject, secretKey) {
    const key = Buffer.from(secretKey, 'base64');
    if (key.length !== cryptDriveConfig.aesKeySize) throw new Error('AES key must be 32 bytes');

    const iv = Buffer.from(encryptedObject.iv, 'base64');
    const authTag = Buffer.from(encryptedObject.authTag, 'base64');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedObject.encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}