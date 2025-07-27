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

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDUpyuXLST_okNuDawiN3HTB2gvNmAa_u0",
    authDomain: "rosary-companion-5fbb7.firebaseapp.com",
    projectId: "rosary-companion-5fbb7",
    storageBucket: "rosary-companion-5fbb7.firebasestorage.app",
    messagingSenderId: "389748583800",
    appId: "1:389748583800:web:2f7c2973adf0b30af92c8d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Make functions global for onclick handlers
window.signInWithGoogle = signInWithGoogle;
window.showEmailLogin = showEmailLogin;
window.continueAsGuest = continueAsGuest;
window.signOut = signOut;
window.continueSession = continueSession;
window.startFresh = startFresh;
window.selectMystery = selectMystery;
window.togglePrayer = togglePrayer;
window.nextStep = nextStep;
window.previousStep = previousStep;
window.resetRosary = resetRosary;

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
        // User is signed in
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('userInfo').style.display = 'flex';
        document.getElementById('userName').textContent = 
            user.displayName || user.email || 'Guest User';
        
        // Load user data from Firestore
        loadUserData();
    } else {
        // User is signed out
        document.getElementById('authSection').style.display = 'block';
        document.getElementById('userInfo').style.display = 'none';
    }
});

// Sign in with Google
async function signInWithGoogle() {
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error('Error signing in with Google:', error);
        alert('Failed to sign in. Please try again.');
    }
}

// Show email login (placeholder for now)
function showEmailLogin() {
    alert('Email login coming soon! Please use Google sign-in or continue as guest.');
}

// Continue as guest (anonymous auth)
async function continueAsGuest() {
    try {
        await signInAnonymously(auth);
    } catch (error) {
        console.error('Error with anonymous auth:', error);
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
    if (!currentUser) return;
    
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
    } catch (error) {
        console.error('Error loading user data:', error);
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
        } catch (error) {
            console.error('Error saving completion:', error);
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
});

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
    document.getElementById('totalRosaries').textContent = completedRosaries;
    document.getElementById('dayStreak').textContent = currentStreak;
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
    });
    document.querySelector(`[data-mystery="${mystery}"]`).classList.add('active');
    saveProgress();
}

// Toggle prayer visibility
function togglePrayer(prayerId) {
    const prayerText = document.getElementById(prayerId);
    const icon = document.getElementById(prayerId + 'Icon');
    
    prayerText.classList.toggle('expanded');
    icon.classList.toggle('expanded');
}

// Update UI
function updateUI() {
    // Update progress dots
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
    
    saveProgress();
}

// Next step
function nextStep() {
    if (currentStep < 7) {
        currentStep++;
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
        updateUI();
    }
}

// Reset rosary
function resetRosary() {
    currentStep = 0;
    currentDecade = 0;
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