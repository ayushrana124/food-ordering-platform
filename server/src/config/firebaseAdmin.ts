import admin from 'firebase-admin';

if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;

    // Without a clear message here, a missing or malformed value surfaces as an
    // opaque JSON.parse or DER-parsing crash at startup.
    if (!raw) {
        throw new Error(
            'FIREBASE_SERVICE_ACCOUNT is not set. Provide the Firebase service account JSON as a single-line string — customer phone login cannot work without it.'
        );
    }

    let serviceAccount: admin.ServiceAccount;
    try {
        serviceAccount = JSON.parse(raw);
    } catch {
        throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON. It must be the service account key file contents on one line.');
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

export const firebaseAuth = admin.auth();
export default admin;
