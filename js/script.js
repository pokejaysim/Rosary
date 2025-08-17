// Import Firebase functions
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signInAnonymously,
    onAuthStateChanged,
    signOut as firebaseSignOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc,
    serverTimestamp,
    arrayUnion,
    increment,
    deleteField
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import config from './config.js';

// Firebase configuration from environment variables
const firebaseConfig = config.firebase;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Attach UI event handlers after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnGoogle').addEventListener('click', signInWithGoogle);
    document.getElementById('btnEmail').addEventListener('click', showEmailLogin);
    document.getElementById('btnAnonymous').addEventListener('click', continueAsGuest);
    document.getElementById('btnSignOut').addEventListener('click', signOut);
    document.querySelector('.btn-restore').addEventListener('click', continueSession);
    document.querySelector('.btn-fresh').addEventListener('click', startFresh);
    document.querySelectorAll('.mystery-btn').forEach(btn =>
        btn.addEventListener('click', () => selectMystery(btn.dataset.mystery))
    );
    document.getElementById('prevBtn').addEventListener('click', previousStep);
    document.getElementById('nextBtn').addEventListener('click', nextStep);
    document.getElementById('resetBtn').addEventListener('click', resetRosary);
    document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);
    document.getElementById('playAudioBtn').addEventListener('click', playPrayerAudio);
    document.getElementById('pauseAudioBtn').addEventListener('click', pausePrayerAudio);
    document.getElementById('advanceBeadBtn').addEventListener('click', advanceBead);
    document.getElementById('resetBeadBtn').addEventListener('click', resetBeadCounter);
});

// Current user
let currentUser = null;

// Rosary data
const mysteries = {
    joyful: [
        { name: "The Annunciation", virtue: "Humility", reference: "(Luke 1:26-38; John 1:14)" },
        { name: "The Visitation", virtue: "Charity", reference: "(Luke 1:39-56)" },
        { name: "The Nativity", virtue: "Poverty", reference: "(Luke 2:6-20; Matt 1:18-25)" },
        { name: "The Presentation", virtue: "Obedience", reference: "(Luke 2:22-39)" },
        { name: "Finding Jesus in the Temple", virtue: "Joy/Prudence", reference: "(Luke 2:41-51)" }
    ],
    sorrowful: [
        { name: "Agony in the Garden", virtue: "Repentance", reference: "(Matt 26:36-46; Luke 22:39-46)" },
        { name: "Scourging at the Pillar", virtue: "Purity", reference: "(Matt 27:26; John 19:1)" },
        { name: "Crowning with Thorns", virtue: "Courage", reference: "(Matt 27:29-30; John 19:2-3)" },
        { name: "Carrying of the Cross", virtue: "Patience", reference: "(Luke 23:26-32)" },
        { name: "Crucifixion", virtue: "Mercy", reference: "(Luke 23:33-46)" }
    ],
    glorious: [
        { name: "The Resurrection", virtue: "Faith", reference: "(Matt 28:1-10; John 20:1-29)" },
        { name: "The Ascension", virtue: "Hope", reference: "(Mark 16:19-20; Acts 1:6-11)" },
        { name: "Descent of the Holy Spirit", virtue: "Love", reference: "(Acts 2:1-41)" },
        { name: "The Assumption", virtue: "Grace of a happy death", reference: "(Rev 12:1)" },
        { name: "Coronation of Mary", virtue: "True devotion to Mary", reference: "(Rev 12:1)" }
    ],
    luminous: [
        { name: "Baptism of Jesus", virtue: "Fidelity", reference: "(Matt 3:11-17; Luke 3:15-22; John 1:22-34)" },
        { name: "Wedding at Cana", virtue: "Faith in Mary's Intercession", reference: "(John 2:1-12)" },
        { name: "Proclamation of the Kingdom", virtue: "Conversion", reference: "(Mark 1:14-15; Matt 5-7)" },
        { name: "Transfiguration", virtue: "Renewal in Christ", reference: "(Luke 9:28-36; Matt 17:1-8)" },
        { name: "Institution of the Eucharist", virtue: "Love of the Eucharist", reference: "(Matt 26:26-28; John 6:33-59)" }
    ]
};

let currentStep = 0;
let currentMystery = 'joyful';
let currentDecade = 0;
let completedRosaries = 0;
let currentStreak = 0;
let currentBeadPosition = 0; // 0 = Our Father, 1-10 = Hail Marys, 11 = Glory Be
let sessionData = {
    currentStep: 0,
    currentMystery: 'joyful',
    currentDecade: 0,
    completedRosaries: 0,
    currentStreak: 0,
    lastCompletedDate: null,
    timestamp: Date.now()
};

const steps = [
    "Opening Prayers",
    "First Decade", 
    "Second Decade", 
    "Third Decade", 
    "Fourth Decade", 
    "Fifth Decade",
    "Closing Prayers",
    "Complete"
];

// Auth state observer
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        // User is signed in - show main container first
        hideLoadingOverlay();
        
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('userInfo').style.display = 'flex';
        document.getElementById('userName').textContent = 
            user.displayName || user.email || 'Guest User';
        
        // Show loading state for user data
        showLoadingState(document.getElementById('statsDisplay'), 'Loading your statistics...');
        
        // Load user data from Firestore
        loadUserData().catch(() => {
            console.error('Failed to load user data, but continuing...');
        });
    } else {
        // User is signed out
        document.getElementById('authSection').style.display = 'block';
        document.getElementById('userInfo').style.display = 'none';
        // Hide loading overlay for non-authenticated users
        hideLoadingOverlay();
    }
});

// Sign in with Google
async function signInWithGoogle() {
    try {
        showLoadingState(document.getElementById('btnGoogle'), 'Signing in...');
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error('Error signing in with Google:', error);
        handleAuthError(error);
        // Reset button state
        document.getElementById('btnGoogle').innerHTML = `
            <img src="https://www.google.com/favicon.ico" alt="">
            Sign in with Google
        `;
    }
}

// Show email login (placeholder for now)
function showEmailLogin() {
    alert('Email login coming soon! Please use Google sign-in or continue as guest.');
}

// Continue as guest (anonymous auth)
async function continueAsGuest() {
    try {
        showLoadingState(document.getElementById('btnAnonymous'), 'Signing in...');
        await signInAnonymously(auth);
    } catch (error) {
        console.error('Error with anonymous auth:', error);
        handleAuthError(error);
        // Reset button state
        document.getElementById('btnAnonymous').innerHTML = `
            👤 Continue as Guest
        `;
    }
}

// Sign out
async function signOut() {
    try {
        await firebaseSignOut(auth);
        // Reset to default state
        completedRosaries = 0;
        currentStreak = 0;
        updateStats();
    } catch (error) {
        console.error('Error signing out:', error);
    }
}

// Load user data from Firestore
async function loadUserData() {
    if (!currentUser) return Promise.resolve();
    
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        
        if (userDoc.exists()) {
            const data = userDoc.data().rosaryData || {};
            completedRosaries = data.totalCompleted || 0;
            currentStreak = data.currentStreak || 0;
            sessionData.lastCompletedDate = data.lastCompletedDate;
            
            // Check for unfinished session
            if (data.currentSession && data.currentSession.step !== undefined) {
                const session = data.currentSession;
                // Check if session is less than 24 hours old (increased from 1 hour)
                if (Date.now() - session.startedAt < 86400000) { // Within 24 hours
                    sessionData = {
                        currentStep: session.step,
                        currentMystery: session.mystery,
                        currentDecade: session.decade || 0,
                        timestamp: session.startedAt,
                        lastCompletedDate: data.lastCompletedDate
                    };
                    // Only show restore if not on first step
                    if (session.step > 0 && session.step < 7) {
                        document.getElementById('sessionRestore').style.display = 'block';
                    }
                }
            }
            
            updateStats();
        } else {
            // Create new user document
            await setDoc(doc(db, 'users', currentUser.uid), {
                profile: {
                    email: currentUser.email,
                    displayName: currentUser.displayName,
                    createdAt: serverTimestamp()
                },
                rosaryData: {
                    totalCompleted: 0,
                    currentStreak: 0,
                    longestStreak: 0,
                    completionHistory: []
                }
            });
        }
        return Promise.resolve();
    } catch (error) {
        console.error('Error loading user data:', error);
        handleFirestoreError(error, 'load your data');
        return Promise.reject(error);
    }
}

// Save progress to Firestore
async function saveProgress() {
    if (!currentUser) {
        // Fall back to memory for non-authenticated users
        sessionData = {
            currentStep,
            currentMystery,
            currentDecade,
            timestamp: Date.now()
        };
        return;
    }
    
    try {
        const sessionUpdate = {
            step: currentStep,
            mystery: currentMystery,
            decade: currentDecade,
            startedAt: Date.now()
        };
        
        await updateDoc(doc(db, 'users', currentUser.uid), {
            'rosaryData.currentSession': sessionUpdate
        });
        
        console.log('Progress saved:', sessionUpdate);
    } catch (error) {
        console.error('Error saving progress:', error);
        handleFirestoreError(error, 'save your progress');
    }
}

// Complete rosary and save to Firestore
async function completeRosary() {
    completedRosaries++;
    
    // Update streak logic
    const today = new Date().toDateString();
    const lastCompleted = sessionData.lastCompletedDate;
    
    if (!lastCompleted || lastCompleted !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastCompleted === yesterday.toDateString()) {
            currentStreak++;
        } else {
            currentStreak = 1;
        }
    }
    
    updateStats();
    
    // Save to Firestore if user is authenticated
    if (currentUser) {
        try {
            const userRef = doc(db, 'users', currentUser.uid);
            const userDoc = await getDoc(userRef);
            const currentData = userDoc.data()?.rosaryData || {};
            const longestStreak = Math.max(currentStreak, currentData.longestStreak || 0);
            
            await updateDoc(userRef, {
                'rosaryData.totalCompleted': completedRosaries,
                'rosaryData.currentStreak': currentStreak,
                'rosaryData.longestStreak': longestStreak,
                'rosaryData.lastCompletedDate': today,
                'rosaryData.currentSession': deleteField(),
                'rosaryData.completionHistory': arrayUnion({
                    date: today,
                    mystery: currentMystery,
                    completedAt: serverTimestamp()
                })
            });
            
            // Update global statistics
            updateGlobalStats();
            showSuccessNotification('Rosary completed and saved! 🙏');
        } catch (error) {
            console.error('Error saving completion:', error);
            handleFirestoreError(error, 'save your completed rosary');
        }
    }
}

// Update global statistics
async function updateGlobalStats() {
    try {
        const globalRef = doc(db, 'global', 'stats');
        await updateDoc(globalRef, {
            totalRosariesPrayed: increment(1),
            lastUpdated: serverTimestamp()
        });
    } catch (error) {
        // Create the document if it doesn't exist
        await setDoc(doc(db, 'global', 'stats'), {
            totalRosariesPrayed: 1,
            lastUpdated: serverTimestamp()
        });
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    updateTodaysMystery();
    updateUI();
    
    // Initialize dark mode
    initializeDarkMode();
    
    // Initialize keyboard navigation
    initializeKeyboardNavigation();
    
    // Register service worker for PWA functionality
    registerServiceWorker();
    
    // Hide loading overlay after Firebase is initialized and DOM is ready
    setTimeout(() => {
        hideLoadingOverlay();
    }, 1500); // Minimum loading time for better UX
});

// Dark mode functionality
function initializeDarkMode() {
    const savedTheme = localStorage.getItem('theme') || 
                     (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateDarkModeIcon(savedTheme);
}

function toggleDarkMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateDarkModeIcon(newTheme);
}

function updateDarkModeIcon(theme) {
    const icon = document.querySelector('.dark-mode-icon');
    if (icon) {
        icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

// Text-to-Speech functionality
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;
let isPlaying = false;

function playPrayerAudio() {
    if (!speechSynthesis) {
        alert('Text-to-speech is not supported in your browser.');
        return;
    }

    const prayerContent = getCurrentPrayerText();
    if (!prayerContent) return;

    // Stop any current speech
    if (isPlaying) {
        speechSynthesis.cancel();
    }

    currentUtterance = new SpeechSynthesisUtterance(prayerContent);
    
    // Configure speech settings
    currentUtterance.rate = 0.8; // Slower, more reverent pace
    currentUtterance.pitch = 1;
    currentUtterance.volume = 0.9;
    
    // Try to use a more suitable voice
    const voices = speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
        voice.lang.includes('en') && 
        (voice.name.includes('Female') || voice.name.includes('natural'))
    ) || voices.find(voice => voice.lang.includes('en'));
    
    if (preferredVoice) {
        currentUtterance.voice = preferredVoice;
    }

    // Set up event listeners
    currentUtterance.onstart = () => {
        isPlaying = true;
        updateAudioButtons(true);
    };

    currentUtterance.onend = () => {
        isPlaying = false;
        updateAudioButtons(false);
    };

    currentUtterance.onerror = () => {
        isPlaying = false;
        updateAudioButtons(false);
        console.error('Speech synthesis error');
    };

    speechSynthesis.speak(currentUtterance);
}

function pausePrayerAudio() {
    if (speechSynthesis && isPlaying) {
        speechSynthesis.cancel();
        isPlaying = false;
        updateAudioButtons(false);
    }
}

function updateAudioButtons(playing) {
    const playBtn = document.getElementById('playAudioBtn');
    const pauseBtn = document.getElementById('pauseAudioBtn');
    
    if (playing) {
        playBtn.style.display = 'none';
        pauseBtn.style.display = 'flex';
        pauseBtn.classList.add('playing');
    } else {
        playBtn.style.display = 'flex';
        pauseBtn.style.display = 'none';
        pauseBtn.classList.remove('playing');
    }
}

function getCurrentPrayerText() {
    const stepTitle = document.getElementById('stepTitle').textContent;
    const stepSubtitle = document.getElementById('stepSubtitle').textContent;
    let text = `${stepTitle}. ${stepSubtitle}. `;

    // Add mystery information if visible
    const mysteryInfo = document.getElementById('mysteryInfo');
    if (mysteryInfo && mysteryInfo.style.display !== 'none') {
        const mysteryName = document.getElementById('currentMysteryName').textContent;
        const mysteryVirtue = document.getElementById('currentMysteryVirtue').textContent;
        text += `${mysteryName}. ${mysteryVirtue}. `;
    }

    // Get prayer content and extract text
    const prayerContent = document.getElementById('prayerContent');
    if (prayerContent) {
        // Get all prayer text elements
        const prayerTexts = prayerContent.querySelectorAll('.prayer-text');
        prayerTexts.forEach(prayerText => {
            // Clean up the text (remove HTML tags and normalize whitespace)
            let cleanText = prayerText.innerHTML
                .replace(/<br\s*\/?>/gi, '. ')
                .replace(/<[^>]*>/g, '')
                .replace(/\s+/g, ' ')
                .trim();
            
            if (cleanText) {
                text += cleanText + '. ';
            }
        });

        // Also check for regular prayer text paragraphs
        const regularPrayerTexts = prayerContent.querySelectorAll('p.prayer-text');
        regularPrayerTexts.forEach(p => {
            const cleanText = p.textContent.trim();
            if (cleanText) {
                text += cleanText + '. ';
            }
        });
    }

    return text.trim();
}

// Error handling functions
function handleAuthError(error) {
    let message = 'Authentication failed. Please try again.';
    
    switch (error.code) {
        case 'auth/popup-closed-by-user':
            message = 'Sign-in was cancelled. Please try again.';
            break;
        case 'auth/popup-blocked':
            message = 'Pop-up was blocked. Please allow pop-ups for this site.';
            break;
        case 'auth/network-request-failed':
            message = 'Network error. Please check your connection and try again.';
            break;
        case 'auth/too-many-requests':
            message = 'Too many sign-in attempts. Please wait a moment and try again.';
            break;
        case 'auth/quota-exceeded':
            message = 'Service temporarily unavailable. Please try again later.';
            break;
        default:
            console.error('Auth error details:', error);
    }
    
    showErrorNotification(message);
}

function handleFirestoreError(error, operation = 'operation') {
    let message = `Failed to ${operation}. Please try again.`;
    
    switch (error.code) {
        case 'permission-denied':
            message = 'Permission denied. Please sign in and try again.';
            break;
        case 'unavailable':
            message = 'Service temporarily unavailable. Your data will be saved when connection is restored.';
            break;
        case 'deadline-exceeded':
            message = 'Request timed out. Please check your connection.';
            break;
        case 'resource-exhausted':
            message = 'Service limits exceeded. Please try again later.';
            break;
        default:
            console.error(`Firestore error during ${operation}:`, error);
    }
    
    showErrorNotification(message);
}

function showErrorNotification(message) {
    // Create and show error notification
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.innerHTML = `
        <div class="error-content">
            <span class="error-icon">⚠️</span>
            <span class="error-message">${message}</span>
            <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function showSuccessNotification(message) {
    // Create and show success notification
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.innerHTML = `
        <div class="success-content">
            <span class="success-icon">✅</span>
            <span class="success-message">${message}</span>
            <button class="success-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 3000);
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showErrorNotification('An unexpected error occurred. Please refresh the page if problems persist.');
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showErrorNotification('A network error occurred. Please check your connection.');
    event.preventDefault();
});

// Keyboard navigation functionality
function initializeKeyboardNavigation() {
    document.addEventListener('keydown', handleKeyboardNavigation);
}

function handleKeyboardNavigation(event) {
    // Don't interfere with typing in inputs
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }

    switch (event.key) {
        case 'ArrowRight':
        case ' ': // Spacebar
            event.preventDefault();
            if (currentStep < 6 && document.getElementById('prayerSection').style.display !== 'none') {
                nextStep();
            }
            break;
            
        case 'ArrowLeft':
            event.preventDefault();
            if (currentStep > 0 && document.getElementById('prayerSection').style.display !== 'none') {
                previousStep();
            }
            break;
            
        case 'r':
        case 'R':
            if (event.ctrlKey || event.metaKey) {
                break; // Allow page refresh
            }
            event.preventDefault();
            if (document.getElementById('completionMessage').style.display !== 'none') {
                resetRosary();
            }
            break;
            
        case 'p':
        case 'P':
            event.preventDefault();
            if (document.getElementById('playAudioBtn').style.display !== 'none') {
                playPrayerAudio();
            } else if (document.getElementById('pauseAudioBtn').style.display !== 'none') {
                pausePrayerAudio();
            }
            break;
            
        case 'd':
        case 'D':
            event.preventDefault();
            toggleDarkMode();
            break;
            
        case '1':
        case '2':
        case '3':
        case '4':
            event.preventDefault();
            const mysteryIndex = parseInt(event.key) - 1;
            const mysteries = ['joyful', 'sorrowful', 'glorious', 'luminous'];
            if (mysteries[mysteryIndex]) {
                selectMystery(mysteries[mysteryIndex]);
            }
            break;
            
        case 'Escape':
            event.preventDefault();
            // Close any open notifications
            const notifications = document.querySelectorAll('.error-notification, .success-notification');
            notifications.forEach(notification => notification.remove());
            break;
            
        case '?':
        case '/':
            event.preventDefault();
            showKeyboardShortcuts();
            break;
    }
}

function showKeyboardShortcuts() {
    const shortcuts = `
        <div class="keyboard-shortcuts">
            <h3>Keyboard Shortcuts</h3>
            <div class="shortcut-list">
                <div class="shortcut-item">
                    <span class="shortcut-key">→ / Space</span>
                    <span class="shortcut-desc">Next step</span>
                </div>
                <div class="shortcut-item">
                    <span class="shortcut-key">←</span>
                    <span class="shortcut-desc">Previous step</span>
                </div>
                <div class="shortcut-item">
                    <span class="shortcut-key">P</span>
                    <span class="shortcut-desc">Play/Pause audio</span>
                </div>
                <div class="shortcut-item">
                    <span class="shortcut-key">D</span>
                    <span class="shortcut-desc">Toggle dark mode</span>
                </div>
                <div class="shortcut-item">
                    <span class="shortcut-key">1-4</span>
                    <span class="shortcut-desc">Select mystery (Joyful, Sorrowful, Glorious, Luminous)</span>
                </div>
                <div class="shortcut-item">
                    <span class="shortcut-key">R</span>
                    <span class="shortcut-desc">Reset/Start new rosary</span>
                </div>
                <div class="shortcut-item">
                    <span class="shortcut-key">Esc</span>
                    <span class="shortcut-desc">Close notifications</span>
                </div>
                <div class="shortcut-item">
                    <span class="shortcut-key">?</span>
                    <span class="shortcut-desc">Show this help</span>
                </div>
            </div>
        </div>
    `;
    
    const notification = document.createElement('div');
    notification.className = 'shortcuts-notification';
    notification.innerHTML = `
        <div class="shortcuts-content">
            ${shortcuts}
            <button class="shortcuts-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 10000);
}

// Bead Counter functionality
function updateBeadCounter() {
    const beadCounter = document.getElementById('beadCounter');
    
    // Show bead counter only during decades
    if (currentStep >= 1 && currentStep <= 5) {
        beadCounter.style.display = 'block';
        updateBeadVisualization();
    } else {
        beadCounter.style.display = 'none';
        currentBeadPosition = 0;
    }
}

function updateBeadVisualization() {
    // Reset all beads
    document.querySelectorAll('.large-bead, .small-bead').forEach(bead => {
        bead.classList.remove('active', 'completed');
    });
    
    // Mark completed beads
    if (currentBeadPosition > 0) {
        document.querySelector('.our-father-bead').classList.add('completed');
    }
    
    for (let i = 1; i <= Math.min(currentBeadPosition - 1, 10); i++) {
        const bead = document.querySelector(`[data-bead="${i}"]`);
        if (bead) bead.classList.add('completed');
    }
    
    if (currentBeadPosition > 10) {
        document.querySelector('.glory-be-bead').classList.add('completed');
    }
    
    // Mark current active bead
    if (currentBeadPosition === 0) {
        document.querySelector('.our-father-bead').classList.add('active');
    } else if (currentBeadPosition >= 1 && currentBeadPosition <= 10) {
        const currentBead = document.querySelector(`[data-bead="${currentBeadPosition}"]`);
        if (currentBead) currentBead.classList.add('active');
    } else if (currentBeadPosition === 11) {
        document.querySelector('.glory-be-bead').classList.add('active');
    }
}

function advanceBead() {
    if (currentStep >= 1 && currentStep <= 5) {
        currentBeadPosition++;
        
        if (currentBeadPosition > 11) {
            // Completed the decade, advance to next step
            currentBeadPosition = 0;
            nextStep();
        } else {
            updateBeadVisualization();
            updateBeadCounterStatus();
        }
    }
}

function resetBeadCounter() {
    currentBeadPosition = 0;
    updateBeadVisualization();
    updateBeadCounterStatus();
}

function updateBeadCounterStatus() {
    const advanceBtn = document.getElementById('advanceBeadBtn');
    const resetBtn = document.getElementById('resetBeadBtn');
    
    if (currentBeadPosition === 0) {
        advanceBtn.innerHTML = '<span class="bead-btn-icon">→</span><span class="bead-btn-text">Our Father</span>';
    } else if (currentBeadPosition >= 1 && currentBeadPosition <= 10) {
        advanceBtn.innerHTML = `<span class="bead-btn-icon">→</span><span class="bead-btn-text">Hail Mary ${currentBeadPosition + 1}</span>`;
    } else if (currentBeadPosition === 11) {
        advanceBtn.innerHTML = '<span class="bead-btn-icon">→</span><span class="bead-btn-text">Glory Be</span>';
    }
    
    resetBtn.style.display = currentBeadPosition > 0 ? 'flex' : 'none';
}

// Add click handlers for individual beads
document.addEventListener('DOMContentLoaded', () => {
    // Add click handlers for Hail Mary beads
    document.querySelectorAll('.hail-mary-bead').forEach((bead, index) => {
        bead.addEventListener('click', () => {
            if (currentStep >= 1 && currentStep <= 5) {
                currentBeadPosition = index + 1;
                updateBeadVisualization();
                updateBeadCounterStatus();
            }
        });
    });
    
    // Add click handler for Our Father bead
    document.querySelector('.our-father-bead')?.addEventListener('click', () => {
        if (currentStep >= 1 && currentStep <= 5) {
            currentBeadPosition = 0;
            updateBeadVisualization();
            updateBeadCounterStatus();
        }
    });
    
    // Add click handler for Glory Be bead
    document.querySelector('.glory-be-bead')?.addEventListener('click', () => {
        if (currentStep >= 1 && currentStep <= 5) {
            currentBeadPosition = 11;
            updateBeadVisualization();
            updateBeadCounterStatus();
        }
    });
});

// Register service worker
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js');
            console.log('ServiceWorker registered successfully');
            
            // Check for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New version available, show update notification
                        showUpdateNotification();
                    }
                });
            });
        } catch (error) {
            console.log('ServiceWorker registration failed:', error);
        }
    }
}

// Show update notification
function showUpdateNotification() {
    // You could show a toast notification here
    console.log('New version available! Refresh to update.');
}

// Loading state management
function hideLoadingOverlay() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const mainContainer = document.getElementById('mainContainer');
    
    loadingOverlay.classList.add('fade-out');
    mainContainer.style.display = 'block';
    
    // Remove overlay from DOM after transition
    setTimeout(() => {
        loadingOverlay.style.display = 'none';
    }, 500);
}

function showLoadingState(element, text = 'Loading...') {
    if (element && element.innerHTML !== undefined) {
        element.innerHTML = `<div class="loading-spinner"></div><p>${text}</p>`;
    }
}

// Continue session
function continueSession() {
    if (sessionData.currentStep !== undefined) {
        currentStep = sessionData.currentStep;
        currentMystery = sessionData.currentMystery || 'joyful';
        currentDecade = sessionData.currentDecade || 0;
        
        // Update the mystery selector to match
        selectMystery(currentMystery);
        
        document.getElementById('sessionRestore').style.display = 'none';
        updateUI();
    }
}

// Start fresh
function startFresh() {
    currentStep = 0;
    currentDecade = 0;
    document.getElementById('sessionRestore').style.display = 'none';
    saveProgress();
    updateUI();
}

// Update stats display
function updateStats() {
    const totalRosariesEl = document.getElementById('totalRosaries');
    const dayStreakEl = document.getElementById('dayStreak');
    
    if (totalRosariesEl) {
        totalRosariesEl.textContent = completedRosaries;
    }
    if (dayStreakEl) {
        dayStreakEl.textContent = currentStreak;
    }
}

// Update today's mystery
function updateTodaysMystery() {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayMysteries = {
        'Sunday': { name: 'Glorious', type: 'glorious' },
        'Monday': { name: 'Joyful', type: 'joyful' },
        'Tuesday': { name: 'Sorrowful', type: 'sorrowful' },
        'Wednesday': { name: 'Glorious', type: 'glorious' },
        'Thursday': { name: 'Luminous', type: 'luminous' },
        'Friday': { name: 'Sorrowful', type: 'sorrowful' },
        'Saturday': { name: 'Joyful', type: 'joyful' }
    };
    
    const today = new Date().getDay();
    const todayName = days[today];
    const todayMystery = dayMysteries[todayName];
    
    document.getElementById('todayMystery').textContent = 
        `Today's Mystery: ${todayMystery.name} Mysteries (${todayName})`;
}

// Select mystery
function selectMystery(mystery) {
    currentMystery = mystery;
    document.querySelectorAll('.mystery-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
    });
    const selectedBtn = document.querySelector(`[data-mystery="${mystery}"]`);
    selectedBtn.classList.add('active');
    selectedBtn.setAttribute('aria-selected', 'true');
    saveProgress();
}

// Toggle prayer visibility
function togglePrayer(prayerId) {
    const prayerText = document.getElementById(prayerId);
    const icon = document.getElementById(prayerId + 'Icon');
    
    prayerText.classList.toggle('expanded');
    icon.classList.toggle('expanded');
}

// Make togglePrayer available globally for onclick handlers
window.togglePrayer = togglePrayer;

// Update UI
function updateUI() {
    // Update progress dots and progress bar
    const progressBar = document.querySelector('.progress-indicator');
    if (progressBar) {
        progressBar.setAttribute('aria-valuenow', currentStep.toString());
    }
    
    document.querySelectorAll('.progress-dot').forEach((dot, index) => {
        dot.classList.remove('current', 'completed');
        if (index < currentStep) {
            dot.classList.add('completed');
        } else if (index === currentStep) {
            dot.classList.add('current');
        }
    });

    // Update progress label
    document.getElementById('progressLabel').textContent = steps[currentStep];

    // Update step title and subtitle
    const stepTitle = document.getElementById('stepTitle');
    const stepSubtitle = document.getElementById('stepSubtitle');
    const mysteryInfo = document.getElementById('mysteryInfo');
    const prayerContent = document.getElementById('prayerContent');

    // Hide/show sections based on step
    if (currentStep === 7) {
        document.getElementById('prayerSection').style.display = 'none';
        document.getElementById('completionMessage').style.display = 'block';
        document.getElementById('mysterySelector').style.display = 'none';
        return;
    } else {
        document.getElementById('prayerSection').style.display = 'block';
        document.getElementById('completionMessage').style.display = 'none';
    }

    // Update content based on current step
    switch(currentStep) {
        case 0: // Opening Prayers
            stepTitle.textContent = "Opening Prayers";
            stepSubtitle.textContent = "Begin with the Sign of the Cross";
            mysteryInfo.style.display = 'none';
            prayerContent.innerHTML = `
                <div class="expandable-prayer">
                    <div class="prayer-header" onclick="togglePrayer('apostlesCreed')">
                        <span class="prayer-title">The Apostles' Creed</span>
                        <span class="expand-icon" id="apostlesCreedIcon">▼</span>
                    </div>
                    <div class="prayer-full-text" id="apostlesCreed">
                        <div class="prayer-text">
                            I believe in God, the Father Almighty,<br>
                            Creator of heaven and earth;<br>
                            and in Jesus Christ, His only Son, our Lord,<br>
                            who was conceived by the Holy Spirit,<br>
                            born of the Virgin Mary,<br>
                            suffered under Pontius Pilate,<br>
                            was crucified, died and was buried.<br>
                            He descended into hell;<br>
                            on the third day He rose again from the dead;<br>
                            He ascended into heaven,<br>
                            and is seated at the right hand of God the Father Almighty;<br>
                            from there He will come to judge the living and the dead.<br>
                            I believe in the Holy Spirit,<br>
                            the holy Catholic Church,<br>
                            the communion of saints,<br>
                            the forgiveness of sins,<br>
                            the resurrection of the body,<br>
                            and life everlasting. Amen.
                        </div>
                    </div>
                </div>

                <div class="expandable-prayer">
                    <div class="prayer-header" onclick="togglePrayer('ourFather')">
                        <span class="prayer-title">Our Father</span>
                        <span class="expand-icon" id="ourFatherIcon">▼</span>
                    </div>
                    <div class="prayer-full-text" id="ourFather">
                        <div class="prayer-text">
                            Our Father, who art in heaven,<br>
                            hallowed be thy name;<br>
                            thy kingdom come,<br>
                            thy will be done<br>
                            on earth as it is in heaven.<br>
                            Give us this day our daily bread,<br>
                            and forgive us our trespasses,<br>
                            as we forgive those who trespass against us;<br>
                            and lead us not into temptation,<br>
                            but deliver us from evil. Amen.
                        </div>
                    </div>
                </div>

                <p class="prayer-text">Then pray 3 Hail Marys and 1 Glory Be</p>
            `;
            break;
        
        case 1: case 2: case 3: case 4: case 5: // Decades
            const decadeNum = currentStep - 1;
            const mystery = mysteries[currentMystery][decadeNum];
            currentDecade = decadeNum;
            
            stepTitle.textContent = `${ordinal(decadeNum + 1)} Mystery`;
            stepSubtitle.textContent = mystery.name;
            
            mysteryInfo.style.display = 'block';
            document.getElementById('currentMysteryName').textContent = 
                `${mystery.name} ${mystery.reference}`;
            document.getElementById('currentMysteryVirtue').textContent = 
                `Virtue: ${mystery.virtue}`;
            
            prayerContent.innerHTML = `
                <div class="expandable-prayer">
                    <div class="prayer-header" onclick="togglePrayer('ourFatherDecade')">
                        <span class="prayer-title">Our Father</span>
                        <span class="expand-icon" id="ourFatherDecadeIcon">▼</span>
                    </div>
                    <div class="prayer-full-text" id="ourFatherDecade">
                        <div class="prayer-text">
                            Our Father, who art in heaven,<br>
                            hallowed be thy name;<br>
                            thy kingdom come,<br>
                            thy will be done<br>
                            on earth as it is in heaven.<br>
                            Give us this day our daily bread,<br>
                            and forgive us our trespasses,<br>
                            as we forgive those who trespass against us;<br>
                            and lead us not into temptation,<br>
                            but deliver us from evil. Amen.
                        </div>
                    </div>
                </div>

                <div class="expandable-prayer">
                    <div class="prayer-header" onclick="togglePrayer('hailMary')">
                        <span class="prayer-title">Hail Mary (10 times)</span>
                        <span class="expand-icon" id="hailMaryIcon">▼</span>
                    </div>
                    <div class="prayer-full-text" id="hailMary">
                        <div class="prayer-text">
                            Hail Mary, full of grace,<br>
                            the Lord is with thee;<br>
                            blessed art thou among women,<br>
                            and blessed is the fruit of thy womb, Jesus.<br>
                            Holy Mary, Mother of God,<br>
                            pray for us sinners,<br>
                            now and at the hour of our death. Amen.
                        </div>
                    </div>
                </div>

                <div class="expandable-prayer">
                    <div class="prayer-header" onclick="togglePrayer('gloryBe')">
                        <span class="prayer-title">Glory Be</span>
                        <span class="expand-icon" id="gloryBeIcon">▼</span>
                    </div>
                    <div class="prayer-full-text" id="gloryBe">
                        <div class="prayer-text">
                            Glory be to the Father,<br>
                            and to the Son,<br>
                            and to the Holy Spirit,<br>
                            as it was in the beginning,<br>
                            is now, and ever shall be,<br>
                            world without end. Amen.
                        </div>
                    </div>
                </div>

                <div class="expandable-prayer">
                    <div class="prayer-header" onclick="togglePrayer('fatimaPrayer')">
                        <span class="prayer-title">Fatima Prayer</span>
                        <span class="expand-icon" id="fatimaPrayerIcon">▼</span>
                    </div>
                    <div class="prayer-full-text" id="fatimaPrayer">
                        <div class="prayer-text">
                            O my Jesus, forgive us our sins,<br>
                            save us from the fires of hell,<br>
                            lead all souls to Heaven,<br>
                            especially those in most need of Thy mercy. Amen.
                        </div>
                    </div>
                </div>
            `;
            break;
        
        case 6: // Closing Prayers
            stepTitle.textContent = "Closing Prayers";
            stepSubtitle.textContent = "Conclude the Rosary";
            mysteryInfo.style.display = 'none';
            prayerContent.innerHTML = `
                <div class="expandable-prayer">
                    <div class="prayer-header" onclick="togglePrayer('hailHolyQueen')">
                        <span class="prayer-title">Hail Holy Queen</span>
                        <span class="expand-icon" id="hailHolyQueenIcon">▼</span>
                    </div>
                    <div class="prayer-full-text" id="hailHolyQueen">
                        <div class="prayer-text">
                            Hail, holy Queen, Mother of mercy,<br>
                            our life, our sweetness and our hope.<br>
                            To thee do we cry, poor banished children of Eve:<br>
                            to thee do we send up our sighs,<br>
                            mourning and weeping in this valley of tears.<br>
                            Turn then, most gracious Advocate,<br>
                            thine eyes of mercy toward us,<br>
                            and after this our exile,<br>
                            show unto us the blessed fruit of thy womb, Jesus,<br>
                            O merciful, O loving, O sweet Virgin Mary!<br><br>
                            Pray for us, O Holy Mother of God,<br>
                            that we may be made worthy of the promises of Christ. Amen.
                        </div>
                    </div>
                </div>

                <div class="expandable-prayer">
                    <div class="prayer-header" onclick="togglePrayer('finalPrayer')">
                        <span class="prayer-title">Final Prayer</span>
                        <span class="expand-icon" id="finalPrayerIcon">▼</span>
                    </div>
                    <div class="prayer-full-text" id="finalPrayer">
                        <div class="prayer-text">
                            Let us pray.<br>
                            O God, whose only begotten Son,<br>
                            by His life, death, and resurrection,<br>
                            has purchased for us the rewards of eternal life,<br>
                            grant, we beseech Thee,<br>
                            that meditating upon these mysteries<br>
                            of the Most Holy Rosary of the Blessed Virgin Mary,<br>
                            we may imitate what they contain<br>
                            and obtain what they promise,<br>
                            through the same Christ Our Lord. Amen.
                        </div>
                    </div>
                </div>

                <p class="prayer-text">End with the Sign of the Cross</p>
            `;
            break;
    }

    // Update button states
    document.getElementById('prevBtn').style.display = currentStep === 0 ? 'none' : 'block';
    document.getElementById('nextBtn').textContent = currentStep === 6 ? 'Complete' : 'Continue';
    
    // Update bead counter
    updateBeadCounter();
    if (currentStep >= 1 && currentStep <= 5) {
        updateBeadCounterStatus();
    }
    
    saveProgress();
}

// Next step
function nextStep() {
    if (currentStep < 7) {
        currentStep++;
        
        // Reset bead position when entering a new decade
        if (currentStep >= 1 && currentStep <= 5) {
            currentBeadPosition = 0;
        }
        
        updateUI();
        
        if (currentStep === 7) {
            completeRosary();
        }
    }
}

// Previous step
function previousStep() {
    if (currentStep > 0) {
        currentStep--;
        
        // Reset bead position when entering a decade
        if (currentStep >= 1 && currentStep <= 5) {
            currentBeadPosition = 0;
        }
        
        updateUI();
    }
}

// Reset rosary
function resetRosary() {
    currentStep = 0;
    currentDecade = 0;
    currentBeadPosition = 0;
    document.getElementById('prayerSection').style.display = 'block';
    document.getElementById('completionMessage').style.display = 'none';
    document.getElementById('mysterySelector').style.display = 'block';
    updateUI();
}

// Ordinal helper
function ordinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
