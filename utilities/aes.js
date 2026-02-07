import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
const algorithm = 'aes-256-gcm';

export function find_kek(password) {
    return createHash('sha256').update(password).digest('base64'); // 32 bytes base64
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

export function encrypt_obj(obj, secretKey) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            obj[key] = (typeof value === 'object' && value !== null)
                ? encrypt_obj(value, secretKey)
                : encrypt(value, secretKey);
        }
    }
    return obj;
}

export function decrypt_obj(obj, secretKey) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            obj[key] = (typeof value === 'object' && value !== null)
                ? decrypt_obj(value, secretKey)
                : decrypt(value, secretKey);
        }
    }
    return obj;
}