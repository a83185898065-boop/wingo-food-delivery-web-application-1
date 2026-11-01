import {
    initializeApp,
    cert,
    getApps
} from "firebase-admin/app";

import serviceAccount from "./wingoo-8bf2e-firebase-adminsdk-fbsvc-8ac3b4dfb3.json"
    with { type: "json" };

const firebaseApp = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount)
    });

export default firebaseApp;