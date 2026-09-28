// js/firebase.js
// Firebase Authentication & Firestore 同期モジュール

// アクセスを許可するGoogleアカウントのホワイトリスト
const ALLOWED_EMAILS = [
    'y37y37@gmail.com',
    'taihironaoya0116708@gmail.com'
];

const firebaseConfig = {
    apiKey: "AIzaSyDmzrSdt07sgEcuxfzrmDz4FyDZ3QWUj7U",
    authDomain: "shift-manager-v2.firebaseapp.com",
    projectId: "shift-manager-v2",
    storageBucket: "shift-manager-v2.firebasestorage.app",
    messagingSenderId: "689828996829",
    appId: "1:689828996829:web:753d7307f158c5cdbe9d34"
};
const appId = typeof __app_id !== 'undefined' ? __app_id : firebaseConfig.projectId;

let app = null;
let auth = null;
let db = null;
let currentUser = null;
let shiftDocUnsubscribe = null;
let masterDocUnsubscribe = null;
let isCloudConnected = false;
let isSyncingFromCloud = false;


let doc, getDoc, setDoc, updateDoc, deleteField, onSnapshot;
let signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider;

function updateCloudStatus(statusText, type = 'normal') {
    const badge = document.getElementById('cloud-status-badge');
    if (!badge) return;
    if (type === 'success') {
        badge.className = 'text-[11px] px-2 py-0.5 rounded font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 flex items-center gap-1 cursor-pointer';
        badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span><span>${statusText}</span>`;
    } else if (type === 'syncing') {
        badge.className = 'text-[11px] px-2 py-0.5 rounded font-bold bg-sky-950 text-sky-300 border border-sky-700/60 flex items-center gap-1';
        badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-sky-400 animate-spin"></span><span>${statusText}</span>`;
    } else if (type === 'error') {
        badge.className = 'text-[11px] px-2 py-0.5 rounded font-bold bg-rose-950 text-rose-300 border border-rose-700/60 flex items-center gap-1 cursor-pointer';
        badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-rose-400"></span><span>${statusText}</span>`;
    } else {
        badge.className = 'text-[11px] px-2 py-0.5 rounded font-bold bg-slate-700 text-slate-300 border border-slate-600 flex items-center gap-1 cursor-pointer';
        badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-slate-400"></span><span>${statusText}</span>`;
    }
}

async function initFirebase() {
    try {
        updateCloudStatus('ローカル運用中 (同期OFF)', 'normal');

        const [fbAppModule, fbAuthModule, fbFirestoreModule] = await Promise.all([
            import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js"),
            import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js"),
            import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js")
        ]);

        const { initializeApp } = fbAppModule;
        GoogleAuthProvider = fbAuthModule.GoogleAuthProvider;
        signInWithPopup = fbAuthModule.signInWithPopup;
        signOut = fbAuthModule.signOut;
        onAuthStateChanged = fbAuthModule.onAuthStateChanged;
        const { getAuth } = fbAuthModule;

        const { getFirestore } = fbFirestoreModule;
        doc = fbFirestoreModule.doc;
        getDoc = fbFirestoreModule.getDoc;
        setDoc = fbFirestoreModule.setDoc;
        updateDoc = fbFirestoreModule.updateDoc;
        deleteField = fbFirestoreModule.deleteField;
        onSnapshot = fbFirestoreModule.onSnapshot;

        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const email = (user.email || '').toLowerCase().trim();
                if (ALLOWED_EMAILS.includes(email)) {
                    currentUser = user;
                    isCloudConnected = true;
                    hideAuthLockOverlay();
                    showAuthUserBar(user);
                    updateCloudStatus('Google同期中', 'success');

                    listenToMasterConfig();
                    listenToCurrentMonthShift();
                } else {
                    currentUser = null;
                    isCloudConnected = false;
                    updateCloudStatus('アクセス拒否', 'error');
                    showMessageModal(`ログインされたアカウント「${email}」は同期権限がありません。同期はOFFのままローカル保存で動作します。`);
                    await signOut(auth);
                }
            } else {
                currentUser = null;
                isCloudConnected = false;
                if (masterDocUnsubscribe) { masterDocUnsubscribe(); masterDocUnsubscribe = null; }
                if (shiftDocUnsubscribe) { shiftDocUnsubscribe(); shiftDocUnsubscribe = null; }
                hideAuthUserBar();
                updateCloudStatus('同期OFF (ローカル運用)', 'normal');
            }
        });
    } catch (err) {
        console.warn('Firebase initialization skipped or failed:', err);
        isCloudConnected = false;
        updateCloudStatus('同期OFF (ローカル運用)', 'normal');
    }
}

async function loginWithGoogle() {
    if (!auth) return;
    hideAuthError();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
        updateCloudStatus('Googleログイン中...', 'syncing');
        await signInWithPopup(auth, provider);
    } catch (err) {
        console.warn('Google Sign-in error:', err);
        showAuthError(`ログインがキャンセルされたか、ドメイン制限等により失敗しました。ローカル保存のままご利用いただけます。`);
        updateCloudStatus('同期OFF (ローカル運用)', 'normal');
    }
}

async function logoutGoogle() {
    if (!auth) return;
    try {
        await signOut(auth);
        currentUser = null;
        isCloudConnected = false;
        hideAuthUserBar();
        updateCloudStatus('同期OFF (ローカル運用)', 'normal');
        showMessageModal("ログアウトしました。以後はローカル保存（端末内）で動作します。");
    } catch (err) {
        console.error('Logout error:', err);
    }
}

function showAuthLockOverlay() {
    const overlay = document.getElementById('auth-lock-overlay');
    if (overlay) overlay.classList.remove('hidden');
}

function hideAuthLockOverlay() {
    const overlay = document.getElementById('auth-lock-overlay');
    if (overlay) overlay.classList.add('hidden');
}

function showAuthError(msg) {
    const alertBox = document.getElementById('auth-error-alert');
    const msgEl = document.getElementById('auth-error-message');
    if (alertBox && msgEl) {
        msgEl.innerText = msg;
        alertBox.classList.remove('hidden');
    }
}

function hideAuthError() {
    const alertBox = document.getElementById('auth-error-alert');
    if (alertBox) alertBox.classList.add('hidden');
}

function showAuthUserBar(user) {
    const bar = document.getElementById('auth-user-bar');
    const emailEl = document.getElementById('user-email-display');
    const avatar = document.getElementById('user-avatar');
    if (!bar || !emailEl) return;

    emailEl.innerText = user.email || '管理者';
    if (user.photoURL && avatar) {
        avatar.src = user.photoURL;
        avatar.classList.remove('hidden');
    }
    bar.classList.remove('hidden');
    bar.classList.add('flex');
}

function hideAuthUserBar() {
    const bar = document.getElementById('auth-user-bar');
    if (bar) {
        bar.classList.add('hidden');
        bar.classList.remove('flex');
    }
}

function listenToMasterConfig() {
    if (!isCloudConnected || !currentUser || !db) return;

    const masterRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'master_config');
    if (masterDocUnsubscribe) masterDocUnsubscribe();

    masterDocUnsubscribe = onSnapshot(masterRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            isSyncingFromCloud = true;
            if (data.members && Array.isArray(data.members)) state.members = data.members;
            if (data.shiftTypes && Array.isArray(data.shiftTypes)) state.shiftTypes = data.shiftTypes;
            if (data.colorTypes && Array.isArray(data.colorTypes)) state.colorTypes = data.colorTypes;
            if (data.staffAttributes && Array.isArray(data.staffAttributes)) state.staffAttributes = data.staffAttributes;
            if (data.courses && Array.isArray(data.courses)) state.courses = data.courses;
            if (data.courseGroups && Array.isArray(data.courseGroups)) state.courseGroups = data.courseGroups;
            if (data.generatorRules) state.generatorRules = { ...state.generatorRules, ...data.generatorRules };
            renderAll(false);
            isSyncingFromCloud = false;
        } else {
            saveMasterToCloud(true);
        }
    }, (error) => {
        console.error('Master doc listener error:', error);
        updateCloudStatus('同期エラー', 'error');
    });
}

function listenToCurrentMonthShift() {
    if (!isCloudConnected || !currentUser || !db) return;

    const monthDocId = `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}`;
    const shiftRef = doc(db, 'artifacts', appId, 'public', 'data', 'shifts', monthDocId);

    if (shiftDocUnsubscribe) shiftDocUnsubscribe();

    updateCloudStatus('シフト同期中...', 'syncing');

    shiftDocUnsubscribe = onSnapshot(shiftRef, (docSnap) => {
        isSyncingFromCloud = true;
        if (docSnap.exists()) {
            const data = docSnap.data();
            const cloudSchedule = data.schedule ? (typeof data.schedule === 'string' ? JSON.parse(data.schedule) : data.schedule) : {};
            const cloudDailyRequired = data.dailyRequired ? (typeof data.dailyRequired === 'string' ? JSON.parse(data.dailyRequired) : data.dailyRequired) : {};
            const cloudCourseAssignments = data.courseAssignments ? (typeof data.courseAssignments === 'string' ? JSON.parse(data.courseAssignments) : data.courseAssignments) : {};

            state.schedule = { ...cloudSchedule };
            state.dailyRequired = { ...cloudDailyRequired };
            state.courseAssignments = { ...cloudCourseAssignments };

            updateCloudStatus('同期完了', 'success');
        } else {
            state.schedule = {};
            state.dailyRequired = {};
            state.courseAssignments = {};
            updateCloudStatus('新規月 (未保存)', 'normal');
        }
        
        localStorage.setItem(`shift_app_month_${monthDocId}`, JSON.stringify(state.schedule));
        localStorage.setItem(`shift_app_courses_${monthDocId}`, JSON.stringify(state.courseAssignments));
        renderAll(false);
        isSyncingFromCloud = false;

        fetchAdjacentMonthSchedules();
    }, (error) => {
        console.error('Shift doc listener error:', error);
        updateCloudStatus('シフト取得エラー', 'error');
    });
}

async function saveMasterToCloud(isSilent = false) {
    if (!isCloudConnected || !currentUser || !db) return;

    try {
        const masterRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'master_config');
        await setDoc(masterRef, {
            members: state.members,
            shiftTypes: state.shiftTypes,
            colorTypes: state.colorTypes,
            staffAttributes: state.staffAttributes,
            courses: state.courses,
            courseGroups: state.courseGroups || [],
            generatorRules: state.generatorRules,
            updatedAt: new Date().toISOString()
        }, { merge: true });
        
        if (!isSilent) updateCloudStatus('マスター保存済', 'success');
    } catch (err) {
        console.error('Save master error:', err);
        updateCloudStatus('マスター保存失敗', 'error');
    }
}

// マス単位・セル単位のピンポイント送信
async function syncSingleCellToCloud(key, cellData) {
    if (!isCloudConnected || !currentUser || !db || isSyncingFromCloud) return;

    try {
        updateCloudStatus('同期中...', 'syncing');
        const monthDocId = `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}`;
        const shiftRef = doc(db, 'artifacts', appId, 'public', 'data', 'shifts', monthDocId);

        if (cellData === undefined || cellData === null) {
            await updateDoc(shiftRef, {
                [`schedule.${key}`]: deleteField(),
                updatedAt: new Date().toISOString()
            });
        } else {
            await setDoc(shiftRef, {
                schedule: {
                    [key]: cellData
                },
                updatedAt: new Date().toISOString()
            }, { merge: true });
        }

        updateCloudStatus('同期完了', 'success');
    } catch (err) {
        console.error('Cell sync error:', err);
        updateCloudStatus('同期エラー', 'error');
    }
}

// コース割当のピンポイント送信
async function syncSingleCourseAssignmentToCloud(key, assignmentData) {
    if (!isCloudConnected || !currentUser || !db || isSyncingFromCloud) return;

    try {
        updateCloudStatus('同期中...', 'syncing');
        const monthDocId = `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}`;
        const shiftRef = doc(db, 'artifacts', appId, 'public', 'data', 'shifts', monthDocId);

        if (assignmentData === undefined || assignmentData === null) {
            await updateDoc(shiftRef, {
                [`courseAssignments.${key}`]: deleteField(),
                updatedAt: new Date().toISOString()
            });
        } else {
            await setDoc(shiftRef, {
                courseAssignments: {
                    [key]: assignmentData
                },
                updatedAt: new Date().toISOString()
            }, { merge: true });
        }

        updateCloudStatus('同期完了', 'success');
    } catch (err) {
        console.error('Course assignment sync error:', err);
        updateCloudStatus('同期エラー', 'error');
    }
}

// 日別必要人数のピンポイント送信
async function syncDailyRequiredToCloud(dateStr, val) {
    if (!isCloudConnected || !currentUser || !db || isSyncingFromCloud) return;

    try {
        updateCloudStatus('同期中...', 'syncing');
        const monthDocId = `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}`;
        const shiftRef = doc(db, 'artifacts', appId, 'public', 'data', 'shifts', monthDocId);

        await setDoc(shiftRef, {
            dailyRequired: {
                [dateStr]: val
            },
            updatedAt: new Date().toISOString()
        }, { merge: true });

        updateCloudStatus('同期完了', 'success');
    } catch (err) {
        console.error('Daily required sync error:', err);
        updateCloudStatus('同期エラー', 'error');
    }
}

// 複数マスの一括更新
async function syncBatchCellsToCloud(cellUpdates) {
    if (!isCloudConnected || !currentUser || !db || isSyncingFromCloud) return;

    try {
        updateCloudStatus('一括同期中...', 'syncing');
        const monthDocId = `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}`;
        const shiftRef = doc(db, 'artifacts', appId, 'public', 'data', 'shifts', monthDocId);

        const payload = {};
        for (const [k, v] of Object.entries(cellUpdates)) {
            if (v === null || v === undefined) {
                payload[`schedule.${k}`] = deleteField();
            } else {
                payload[`schedule.${k}`] = v;
            }
        }
        payload.updatedAt = new Date().toISOString();

        await updateDoc(shiftRef, payload);
        updateCloudStatus('同期完了', 'success');
    } catch (err) {
        try {
            const monthDocId = `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}`;
            const shiftRef = doc(db, 'artifacts', appId, 'public', 'data', 'shifts', monthDocId);
            await setDoc(shiftRef, {
                schedule: cellUpdates,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            updateCloudStatus('同期完了', 'success');
        } catch (e2) {
            console.error('Batch sync error:', e2);
            updateCloudStatus('同期エラー', 'error');
        }
    }
}

async function saveCurrentMonthShiftToCloud(isSilent = false) {
    if (!isCloudConnected || !currentUser || !db) return;

    try {
        if (!isSilent) updateCloudStatus('クラウド保存中...', 'syncing');
        const monthDocId = `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}`;
        const shiftRef = doc(db, 'artifacts', appId, 'public', 'data', 'shifts', monthDocId);

        await setDoc(shiftRef, {
            year: state.currentYear,
            month: state.currentMonth,
            schedule: state.schedule,
            dailyRequired: state.dailyRequired,
            courseAssignments: state.courseAssignments,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        updateCloudStatus('クラウド同期完了', 'success');
    } catch (err) {
        console.error('Save shift error:', err);
        updateCloudStatus('保存エラー', 'error');
    }
}

async function saveAllToCloud() {
    if (!isCloudConnected) {
        saveData();
        showAuthLockOverlay();
        return;
    }
    updateCloudStatus('クラウド保存中...', 'syncing');
    await saveMasterToCloud(true);
    await saveCurrentMonthShiftToCloud(false);
    showMessageModal(`【${state.currentYear}年${state.currentMonth}月】のシフトおよびマスター設定をクラウドへ保存しました！`);
}


async function fetchAdjacentMonthSchedules() {
    const { prevKey, nextKey } = getAdjacentMonthKeys(state.currentYear, state.currentMonth);

    [prevKey, nextKey].forEach(k => {
        if (!state.adjacentSchedules[k]) {
            const cached = localStorage.getItem(`shift_app_month_${k}`);
            if (cached) {
                try { state.adjacentSchedules[k] = JSON.parse(cached); } catch(e){}
            }
        }
        if (!state.adjacentCourseAssignments[k]) {
            const cachedCourses = localStorage.getItem(`shift_app_courses_${k}`);
            if (cachedCourses) {
                try { state.adjacentCourseAssignments[k] = JSON.parse(cachedCourses); } catch(e){}
            }
        }
    });

    if (isCloudConnected && currentUser && db) {
        try {
            const prevRef = doc(db, 'artifacts', appId, 'public', 'data', 'shifts', prevKey);
            const nextRef = doc(db, 'artifacts', appId, 'public', 'data', 'shifts', nextKey);
            const [prevSnap, nextSnap] = await Promise.all([getDoc(prevRef), getDoc(nextRef)]);

            if (prevSnap.exists()) {
                const data = prevSnap.data();
                state.adjacentSchedules[prevKey] = data.schedule ? (typeof data.schedule === 'string' ? JSON.parse(data.schedule) : data.schedule) : {};
                state.adjacentCourseAssignments[prevKey] = data.courseAssignments ? (typeof data.courseAssignments === 'string' ? JSON.parse(data.courseAssignments) : data.courseAssignments) : {};
            }
            if (nextSnap.exists()) {
                const data = nextSnap.data();
                state.adjacentSchedules[nextKey] = data.schedule ? (typeof data.schedule === 'string' ? JSON.parse(data.schedule) : data.schedule) : {};
                state.adjacentCourseAssignments[nextKey] = data.courseAssignments ? (typeof data.courseAssignments === 'string' ? JSON.parse(data.courseAssignments) : data.courseAssignments) : {};
            }
            renderMatrixMode1();
            renderCourseAssignmentTab();
        } catch(e) {
            console.warn('Adjacent months fetch failed:', e);
        }
    }
}
