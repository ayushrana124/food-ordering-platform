import admin from 'firebase-admin';

if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT!;

    const serviceAccount = JSON.parse(raw);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

export const firebaseAuth = admin.auth();
export default admin;