import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
// For production, the key should be loaded from a secure environment variable
// or key management system, not hardcoded.
//const secretKey = crypto.randomBytes(32); 
const algorithm = 'aes-256-gcm';

function encrypt_obj(obj, secretKey) {
    for (const key in user) {
        if (obj.hasOwnProperty(key)) {
            user[key] = typeof value === 'object' ? 
            encrypt_obj(value, secretKey) : 
            encrypt(user[key], secretKey);
        }
    }
    return obj;
}

function encrypt(text, secretKey) {
    const iv = randomBytes(16);
    const cipher = createCipheriv(algorithm, Buffer.from(secretKey), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag(); // Authentication tag for GCM

    // Store IV and authTag with the encrypted data
    return {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
    };
}

function decrypt_obj(obj, secretKey) {
    for (const key in user) {
        if (obj.hasOwnProperty(key)) {
            user[key] = typeof value === 'object' ? 
            decrypt_obj(value, secretKey) : 
            decrypt(user[key], secretKey);
        }
    }
    return obj;
}

function decrypt(encryptedObject, secretKey) {
    const iv = Buffer.from(encryptedObject.iv, 'hex');
    const authTag = Buffer.from(encryptedObject.authTag, 'hex');
    
    const decipher = createDecipheriv(algorithm, Buffer.from(secretKey), iv);
    decipher.setAuthTag(authTag); // Set the auth tag before decryption

    let decrypted = decipher.update(encryptedObject.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}