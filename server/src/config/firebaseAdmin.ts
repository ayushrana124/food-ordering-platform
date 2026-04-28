import admin from 'firebase-admin';
import path from 'path';

// Initialize Firebase Admin SDK with service account key
const serviceAccountPath = path.resolve(__dirname, '../../', 'buntypizza-442b0-firebase-adminsdk-fbsvc-1bb32e1b69.json');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

export const firebaseAuth = admin.auth();
export default admin;
