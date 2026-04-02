import cryptDriveConfig from "../config/cryptDriveConfig.json" with { type: "json" };
import crypto from 'crypto';
import argon2 from 'argon2';

const algorithm = 'aes-256-gcm';
const KEY_SIZE = cryptDriveConfig.aesKeySize; // Consistent reference

// Helper to ensure key is a 32-byte Buffer
const getRawKey = (secretKey) => {
    const key = Buffer.from(secretKey, 'base64');
    if (key.length !== KEY_SIZE) throw new Error(`AES key must be ${KEY_SIZE} bytes`);
    return key;
};

export async function derivekek(password, salt) {
    const hash = await argon2.hash(password, {
        type: argon2.argon2id,
        salt: Buffer.from(salt, 'base64'),
        memoryCost: 19456,
        timeCost: 5,
        parallelism: 2,
        hashLength: 32,
        raw: true
    });
    return hash.toString('base64'); 
}

export function saltShaker() {
    return crypto.randomBytes(cryptDriveConfig.passwordSaltRounds).toString('base64');
}

export function generateAESKey() {
    return crypto.randomBytes(KEY_SIZE).toString('base64');
}

/**
 * BUFFER METHODS (For File I/O)
 */
export function encryptBuffer(buffer, secretKey) {
    const key = getRawKey(secretKey);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    const encryptedData = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
        encryptedData, 
        meta: {
            iv: iv.toString('base64'),
            authTag: authTag.toString('base64')
        }
    };
}

export function decryptBuffer(encryptedData, metadata, secretKey) {
    const key = getRawKey(secretKey);
    const iv = Buffer.from(metadata.iv, 'base64');
    const authTag = Buffer.from(metadata.authTag, 'base64');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
}

/**
 * STRING METHODS (For Mongoose/Fields)
 * Format: iv:authTag:encryptedData
 */
export function encrypt(text = "", secretKey) {
    const key = getRawKey(secretKey);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    return `${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${encrypted}`;
}

export function decrypt(encryptedString, secretKey) {
    const key = getRawKey(secretKey);
    const [iv, authTag, data] = encryptedString.split(':');
    
    const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));

    try {
        let decrypted = decipher.update(data, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        throw new Error('Decryption failed: Data tampered or wrong key');
    }
}

/**
 * JSON METHODS
 */
export function encryptJSON(json = {}, secretKey) {
    const encryptedJson = {};
    Object.entries(json).forEach(([prop, text]) => {
        encryptedJson[prop] = encrypt(text, secretKey);
    });
    return encryptedJson;
}

export function decryptJSON(encryptedJSON = {}, secretKey) {
    const decryptedJson = {};
    Object.entries(encryptedJSON).forEach(([prop, val]) => {
        decryptedJson[prop] = decrypt(val, secretKey);
    });
    return decryptedJson;
}