// Configuration file for environment variables
// In production, these would be loaded from environment variables
// For security, never commit actual API keys to version control

const config = {
    firebase: {
        apiKey: "AIzaSyDUpyuXLST_okNuDawiN3HTB2gvNmAa_u0",
        authDomain: "rosary-companion-5fbb7.firebaseapp.com",
        projectId: "rosary-companion-5fbb7",
        storageBucket: "rosary-companion-5fbb7.firebasestorage.app",
        messagingSenderId: "389748583800",
        appId: "1:389748583800:web:2f7c2973adf0b30af92c8d"
    },
    app: {
        name: "Rosary Companion",
        version: "1.0.0",
        environment: "development"
    }
};

export default config;