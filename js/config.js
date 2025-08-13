// Configuration file for environment variables
// In production, these would be loaded from environment variables
// For security, never commit actual API keys to version control

const config = {
    firebase: {
        apiKey: process.env.FIREBASE_API_KEY || "AIzaSyDUpyuXLST_okNuDawiN3HTB2gvNmAa_u0",
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || "rosary-companion-5fbb7.firebaseapp.com",
        projectId: process.env.FIREBASE_PROJECT_ID || "rosary-companion-5fbb7",
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "rosary-companion-5fbb7.firebasestorage.app",
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "389748583800",
        appId: process.env.FIREBASE_APP_ID || "1:389748583800:web:2f7c2973adf0b30af92c8d"
    },
    app: {
        name: "Rosary Companion",
        version: "1.0.0",
        environment: process.env.NODE_ENV || "development"
    }
};

export default config;