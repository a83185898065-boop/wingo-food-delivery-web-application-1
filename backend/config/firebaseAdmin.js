
import {
    initializeApp,
    cert,
    getApps
} from "firebase-admin/app";

import fs from "node:fs";

const envServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

let serviceAccount;

if (envServiceAccount) {
    serviceAccount = JSON.parse(envServiceAccount);
} else {
    const localPath = new URL(
        "./wingoo-8bf2e-firebase-adminsdk-fbsvc-8ac3b4dfb3.json",
        import.meta.url
    );

    if (!fs.existsSync(localPath)) {
        throw new Error(
            "Firebase service account not found. Configure FIREBASE_SERVICE_ACCOUNT_JSON."
        );
    }

    serviceAccount = JSON.parse(
        fs.readFileSync(localPath, "utf8")
    );
}

const firebaseApp = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount)
    });

export default firebaseApp;
