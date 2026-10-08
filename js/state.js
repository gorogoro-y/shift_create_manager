// js/state.js
// グローバルState管理、LocalStorage、ファイル保存・読込、共通ヘルパー

const now = new Date();
const initialDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

let state = {
    currentYear: now.getFullYear(),
    currentMonth: now.getMonth() + 1,
    selectedAssignmentDate: initialDateStr,
    members: [],
    schedule: {},
    courseAssignments: {},
    courses: [
        { id: 'c_01', order: 1, name: '01コース' },
        { id: 'c_02', order: 2, name: '02コース' },
        { id: 'c_03', order: 3, name: '03コース' },
        { id: 'c_04', order: 4, name: '04コース' },
        { id: 'c_05', order: 5, name: '05コース' },
        { id: 'c_06', order: 6, name: '06コース' },
        { id: 'c_07', order: 7, name: '07コース' },
        { id: 'c_08', order: 8, name: '08コース' },
        { id: 'c_09', order: 9, name: '09コース' },
        { id: 'c_10', order: 10, name: '10コース' },
        { id: 'c_11', order: 11, name: '11コース' },
        { id: 'c_12', order: 12, name: '12コース' },
        { id: 'c_13', order: 13, name: '13コース' },
        { id: 'c_14', order: 14, name: '14コース' },
        { id: 'c_15', order: 15, name: '15コース' },
        { id: 'c_16', order: 16, name: '16コース' },
        { id: 'c_17', order: 17, name: '17コース' },
        { id: 'c_18', order: 18, name: '18コース' },
        { id: 'c_19', order: 19, name: '19コース' },
        { id: 'c_20', order: 20, name: '20コース' },
        { id: 'c_21', order: 21, name: '21コース' },
        { id: 'c_22', order: 22, name: '22コース' },
        { id: 'c_23', order: 23, name: '23コース' },
        { id: 'c_24', order: 24, name: '24コース' },
        { id: 'c_25', order: 25, name: '25コース' },
        { id: 'c_26', order: 26, name: '26コース' },
        { id: 'c_27', order: 27, name: '27コース' },
        { id: 'c_28', order: 28, name: '28コース' },
        { id: 'c_29', order: 29, name: '29コース' },
        { id: 'c_30', order: 30, name: '30コース' },
        { id: 'c_31', order: 31, name: '31コース' }
    ],
    courseGroups: [],
    adjacentSchedules: {},
    adjacentCourseAssignments: {},
    shiftTypes: [
        { id: 't1', name: '通し', shortName: '通', count: 14, color: '#3b82f6' },
        { id: 't2', name: '単独', shortName: '単', count: 17, color: '#10b981' }
    ],
    colorTypes: [
        { id: 'c1', name: '点呼', shortName: '点', color: '#ef4444' },
        { id: 'c2', name: 'ナイト', shortName: '夜', color: '#8b5cf6' },
        { id: 'c3', name: '1t', shortName: '1t', color: '#06b6d4' },
        { id: 'c4', name: '教育', shortName: '教', color: '#10b981' },
        { id: 'c5', name: '臨時', shortName: '臨', color: '#f59e0b' }
    ],
    staffAttributes: [
        { id: 'attr_1t', name: '1t', shortName: '1t', color: '#0284c7' },
        { id: 'attr_tenko', name: '点呼', shortName: '点', color: '#dc2626' },
        { id: 'attr_night', name: 'ナイト', shortName: '夜', color: '#7c3aed' }
    ],
    holidayTypes: [
        { id: 'h_rest', name: '公休', shortName: '休', color: '#f43f5e' },
        { id: 'h_designated', name: '指定休', shortName: '指', color: '#f59e0b' },
        { id: 'h_paid', name: '有給', shortName: '有', color: '#10b981' },
        { id: 'h_standby', name: '待機', shortName: '待', color: '#8b5cf6' },
        { id: 'h_checkup', name: '健康診断', shortName: '健診', color: '#14b8a6' }
    ],
    generatorRules: {
        holidayNextSingle: true,
        maxConsecutiveThrough: 2,
        oddRemainderPriority: 'single'
    },
    dailyRequired: {},
    dailyEvents: {},
    selectedStamp: '休',
    selectedTool: { category: 'shift', id: 't1' },
    activeTab: 1,
    activeStaffFilter: null,
    activeAssignmentStaffFilter: null,
    printMode: 'thinking',
    printPeriod: 'first',
    printCutoffDay: 15
};


function saveData() {
    try {
        localStorage.setItem('shift_app_state', JSON.stringify(state));
        const monthDocId = `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}`;
        localStorage.setItem(`shift_app_month_${monthDocId}`, JSON.stringify(state.schedule));
        localStorage.setItem(`shift_app_courses_${monthDocId}`, JSON.stringify(state.courseAssignments));
        localStorage.setItem(`shift_app_events_${monthDocId}`, JSON.stringify(state.dailyEvents || {}));
        if (!state.adjacentSchedules) state.adjacentSchedules = {};
        state.adjacentSchedules[monthDocId] = JSON.parse(JSON.stringify(state.schedule));
    } catch (e) {
        console.error('Failed to save state', e);
    }
}

function loadData() {
    const saved = localStorage.getItem('shift_app_state');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state = { ...state, ...parsed };
            if (!state.dailyEvents) state.dailyEvents = {};
            if (!state.courses || state.courses.length === 0) {
                initDefaultCourses();
            }
            if (!state.courseGroups) {
                state.courseGroups = [];
            }
            if (!state.holidayTypes || state.holidayTypes.length === 0) {
                state.holidayTypes = [
                    { id: 'h_rest', name: '公休', shortName: '休', color: '#f43f5e' },
                    { id: 'h_designated', name: '指定休', shortName: '指', color: '#f59e0b' },
                    { id: 'h_paid', name: '有給', shortName: '有', color: '#10b981' },
                    { id: 'h_standby', name: '待機', shortName: '待', color: '#8b5cf6' },
                    { id: 'h_checkup', name: '健康診断', shortName: '健診', color: '#14b8a6' }
                ];
            }
        } catch (e) {
            console.error('Failed to load state', e);
        }
    }

    state.currentYear = now.getFullYear();
    state.currentMonth = now.getMonth() + 1;
    ensureSelectedDateInMonth();

    const currentDocId = `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}`;
    const cachedMonth = localStorage.getItem(`shift_app_month_${currentDocId}`);
    if (cachedMonth) {
        try { state.schedule = JSON.parse(cachedMonth); } catch (e) {}
    }
    const cachedCourses = localStorage.getItem(`shift_app_courses_${currentDocId}`);
    if (cachedCourses) {
        try { state.courseAssignments = JSON.parse(cachedCourses); } catch (e) {}
    }

    if (!state.members || state.members.length === 0) {
        initDefaultMembers();
    }

    const monthDisplay = document.getElementById('current-month-display');
    if (monthDisplay) {
        monthDisplay.innerText = `${state.currentYear}年 ${state.currentMonth}月`;
    }

    fetchAdjacentMonthSchedules();
}

function initDefaultCourses() {
    state.courses = [];
    for (let i = 1; i <= 31; i++) {
        const numStr = i < 10 ? '0' + i : String(i);
        state.courses.push({
            id: 'c_' + numStr,
            order: i,
            name: `${numStr}コース`,
            isRequired: true
        });
    }
}

function getAdjacentMonthKeys(year, month) {
    let prevY = year, prevM = month - 1;
    if (prevM < 1) { prevM = 12; prevY--; }
    const prevKey = `${prevY}-${String(prevM).padStart(2, '0')}`;

    let nextY = year, nextM = month + 1;
    if (nextM > 12) { nextM = 1; nextY++; }
    const nextKey = `${nextY}-${String(nextM).padStart(2, '0')}`;

    return { prevKey, nextKey };
}


function ensureSelectedDateInMonth() {
    const prefix = `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}`;
    if (!state.selectedAssignmentDate || !state.selectedAssignmentDate.startsWith(prefix)) {
        state.selectedAssignmentDate = `${prefix}-01`;
    }
}

function getMonthDays() {
    const days = [];
    const numDays = new Date(state.currentYear, state.currentMonth, 0).getDate();
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    for (let d = 1; d <= numDays; d++) {
        const date = new Date(state.currentYear, state.currentMonth - 1, d);
        const dayOfWeekNum = date.getDay();
        const dateStr = `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        days.push({
            day: d,
            dayOfWeek: dayNames[dayOfWeekNum],
            dateStr: dateStr,
            isSunday: dayOfWeekNum === 0,
            isSaturday: dayOfWeekNum === 6
        });
    }
    return days;
}

function changeMonth(delta) {
    saveData();
    state.currentMonth += delta;
    if (state.currentMonth > 12) {
        state.currentMonth = 1;
        state.currentYear++;
    } else if (state.currentMonth < 1) {
        state.currentMonth = 12;
        state.currentYear--;
    }
    const monthDisplay = document.getElementById('current-month-display');
    if (monthDisplay) {
        monthDisplay.innerText = `${state.currentYear}年 ${state.currentMonth}月`;
    }
    ensureSelectedDateInMonth();

    const newMonthDocId = `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}`;
    const cachedMonth = localStorage.getItem(`shift_app_month_${newMonthDocId}`);
    state.schedule = cachedMonth ? JSON.parse(cachedMonth) : {};
    const cachedCourses = localStorage.getItem(`shift_app_courses_${newMonthDocId}`);
    state.courseAssignments = cachedCourses ? JSON.parse(cachedCourses) : {};
    const cachedEvents = localStorage.getItem(`shift_app_events_${newMonthDocId}`);
    if (cachedEvents) {
        state.dailyEvents = { ...(state.dailyEvents || {}), ...JSON.parse(cachedEvents) };
    }

    fetchAdjacentMonthSchedules();
    if (isCloudConnected) {
        listenToCurrentMonthShift();
    } else {
        renderAll();
    }
}

function switchTab(tabNum) {
    state.activeTab = tabNum;
    const tabKeys = [1, 2, 3, 4, 'settings'];
    tabKeys.forEach(key => {
        const view = document.getElementById(`view-mode-${key}`);
        const btn = document.getElementById(`tab-btn-${key}`);
        if (view && btn) {
            if (key === tabNum) {
                view.classList.remove('hidden');
                if (key === 'settings') {
                    btn.className = "ml-auto px-3 sm:px-4 py-2 rounded-lg bg-slate-800 text-white shadow-sm transition font-bold flex items-center gap-1.5";
                } else {
                    btn.className = "px-3 sm:px-4 py-2 rounded-lg bg-white text-indigo-600 shadow-sm transition font-bold";
                }
            } else {
                view.classList.add('hidden');
                if (key === 'settings') {
                    btn.className = "ml-auto px-3 sm:px-4 py-2 rounded-lg text-slate-600 hover:text-slate-900 transition font-bold flex items-center gap-1.5 border border-slate-200 bg-white/70 hover:bg-white shadow-2xs";
                } else {
                    btn.className = "px-3 sm:px-4 py-2 rounded-lg text-slate-600 hover:text-slate-900 transition font-bold";
                }
            }
        }
    });
    renderAll();
}

function getRandomColor() {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#6366f1', '#d97706'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function getHolidayType(val) {
    if (!val || !state.holidayTypes) return null;
    return state.holidayTypes.find(h => h.shortName === val || h.id === val || h.name === val) || null;
}

function isHolidayValue(val) {
    if (!val) return false;
    if (['休', '指', '有', '待', '健診', '健'].includes(val)) return true;
    return !!getHolidayType(val);
}

function getCellData(key) {
    const raw = state.schedule[key];
    if (!raw) return { shiftId: '', colorId: '', isPinned: false };
    if (typeof raw === 'object' && raw !== null) {
        return { shiftId: raw.shiftId || '', colorId: raw.colorId || '', isPinned: !!raw.isPinned };
    }
    if (isHolidayValue(raw)) {
        return { shiftId: raw, colorId: '', isPinned: false };
    }
    const isShift = state.shiftTypes.some(s => s.id === raw);
    if (isShift) return { shiftId: raw, colorId: '', isPinned: false };
    const isColor = state.colorTypes.some(c => c.id === raw);
    if (isColor) return { shiftId: '', colorId: raw, isPinned: false };
    return { shiftId: raw, colorId: '', isPinned: false };
}

function getCellDataForAnyDate(memberId, dateStr) {
    const key = `${memberId}_${dateStr}`;
    const monthKey = dateStr.substring(0, 7);
    const currentMonthKey = `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}`;

    if (monthKey === currentMonthKey) {
        return getCellData(key);
    }

    if (!state.adjacentSchedules) state.adjacentSchedules = {};
    if (!state.adjacentSchedules[monthKey]) {
        const cached = localStorage.getItem(`shift_app_month_${monthKey}`);
        if (cached) {
            try { state.adjacentSchedules[monthKey] = JSON.parse(cached); } catch(e){}
        }
    }

    if (state.adjacentSchedules[monthKey] && state.adjacentSchedules[monthKey][key]) {
        const raw = state.adjacentSchedules[monthKey][key];
        if (typeof raw === 'object' && raw !== null) {
            return { shiftId: raw.shiftId || '', colorId: raw.colorId || '', isPinned: !!raw.isPinned };
        }
        return { shiftId: raw, colorId: '', isPinned: false };
    }
    return { shiftId: '', colorId: '', isPinned: false };
}

function getCourseAssignment(memberId, dateStr) {
    const key = `${dateStr}_${memberId}`;
    const monthKey = dateStr.substring(0, 7);
    const currentMonthKey = `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}`;

    let raw = null;
    if (monthKey === currentMonthKey) {
        raw = state.courseAssignments[key];
    } else {
        if (!state.adjacentCourseAssignments) state.adjacentCourseAssignments = {};
        if (!state.adjacentCourseAssignments[monthKey]) {
            const cachedCourses = localStorage.getItem(`shift_app_courses_${monthKey}`);
            if (cachedCourses) {
                try { state.adjacentCourseAssignments[monthKey] = JSON.parse(cachedCourses); } catch(e){}
            }
        }
        if (state.adjacentCourseAssignments[monthKey]) {
            raw = state.adjacentCourseAssignments[monthKey][key];
        }
    }

    if (!raw) {
        return {
            isSplit: false,
            courseId: '',
            isTrainee: false,
            firstHalf: { courseId: '', isTrainee: false },
            secondHalf: { courseId: '', isTrainee: false }
        };
    }
    return {
        isSplit: !!raw.isSplit,
        courseId: raw.courseId || '',
        isTrainee: !!raw.isTrainee,
        firstHalf: raw.firstHalf || { courseId: '', isTrainee: false },
        secondHalf: raw.secondHalf || { courseId: '', isTrainee: false }
    };
}

function getMemberBadgesHTML(member) {
    if (!member.attributes || !Array.isArray(member.attributes) || member.attributes.length === 0) {
        return '';
    }
    return member.attributes.map(attrId => {
        const attr = state.staffAttributes.find(a => a.id === attrId);
        if (!attr) return '';
        return `
            <span class="text-[9px] px-1 py-0.2 rounded font-black text-white shrink-0 shadow-2xs" style="background-color: ${attr.color}" title="${attr.name}">
                ${attr.shortName || attr.name}
            </span>
        `;
    }).join('');
}

function updatePinnedStats() {
    const info = document.getElementById('pinned-stats-info');
    if (!info) return;
    let count = 0;
    Object.values(state.schedule).forEach(v => {
        if (typeof v === 'object' && v !== null && v.isPinned) count++;
    });
    info.innerHTML = `<span>現在保護中のピン留め: <strong>${count}</strong> 箇所</span>`;
}


let currentFileHandle = null;

function updateFileStatusUI() {
    const badge = document.getElementById('linked-file-badge');
    const saveBtnText = document.getElementById('save-btn-text');
    if (!badge || !saveBtnText) return;

    if (currentFileHandle && currentFileHandle.name) {
        badge.innerText = `📄 ${currentFileHandle.name}`;
        badge.classList.remove('hidden');
        badge.classList.add('text-emerald-400', 'font-bold');
        saveBtnText.innerText = '上書き保存';
    } else {
        badge.classList.add('hidden');
        saveBtnText.innerText = '保存';
    }
}

async function saveDirectToFile() {
    const jsonStr = JSON.stringify(state, null, 2);

    if ('showSaveFilePicker' in window) {
        try {
            if (!currentFileHandle) {
                const options = {
                    suggestedName: `shift_data_${state.currentYear}_${state.currentMonth}.json`,
                    types: [{
                        description: 'JSONファイル',
                        accept: { 'application/json': ['.json'] }
                    }]
                };
                currentFileHandle = await window.showSaveFilePicker(options);
            }

            const writable = await currentFileHandle.createWritable();
            await writable.write(jsonStr);
            await writable.close();

            updateFileStatusUI();
            showMessageModal(`ファイル「${currentFileHandle.name}」に保存しました！`);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('File save error:', err);
                fallbackDownloadSave(jsonStr);
            }
        }
    } else {
        fallbackDownloadSave(jsonStr);
    }
}

async function setSaveFileAs() {
    const jsonStr = JSON.stringify(state, null, 2);
    if ('showSaveFilePicker' in window) {
        try {
            const options = {
                suggestedName: `shift_data_${state.currentYear}_${state.currentMonth}.json`,
                types: [{
                    description: 'JSONファイル',
                    accept: { 'application/json': ['.json'] }
                }]
            };
            const handle = await window.showSaveFilePicker(options);
            currentFileHandle = handle;
            const writable = await currentFileHandle.createWritable();
            await writable.write(jsonStr);
            await writable.close();

            updateFileStatusUI();
            showMessageModal(`「${currentFileHandle.name}」として新しく保存しました！`);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Save As error:', err);
                fallbackDownloadSave(jsonStr);
            }
        }
    } else {
        fallbackDownloadSave(jsonStr);
    }
}

async function openDirectFile() {
    if ('showOpenFilePicker' in window) {
        try {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{
                    description: 'JSONファイル',
                    accept: { 'application/json': ['.json'] }
                }],
                multiple: false
            });

            const file = await fileHandle.getFile();
            const contents = await file.text();
            state = JSON.parse(contents);
            currentFileHandle = fileHandle;
            updateFileStatusUI();
            renderAll();
            showMessageModal(`「${fileHandle.name}」を開いて復元しました。`);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('File open error:', err);
                document.getElementById('legacy-file-input').click();
            }
        }
    } else {
        document.getElementById('legacy-file-input').click();
    }
}

function fallbackDownloadSave(jsonStr) {
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shift_data_${state.currentYear}_${state.currentMonth}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showMessageModal("ダウンロードフォルダに保存しました。");
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            state = JSON.parse(e.target.result);
            if (!state.dailyEvents) state.dailyEvents = {};
            currentFileHandle = null;
            updateFileStatusUI();
            renderAll();
            showMessageModal("データを復元しました。");
        } catch (err) {
            showMessageModal("ファイルの読み込みに失敗しました。");
        }
    };
    reader.readAsText(file);
}


function showMessageModal(msg) {
    document.getElementById('message-modal-text').innerText = msg;
    document.getElementById('message-modal').classList.remove('hidden');
}

function closeMessageModal() {
    document.getElementById('message-modal').classList.add('hidden');
}

function scrollToPosition(containerId, pos) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (pos === 'start') {
        container.scrollTo({ left: 0, behavior: 'smooth' });
    } else if (pos === 'mid') {
        container.scrollTo({ left: (container.scrollWidth - container.clientWidth) * 0.48, behavior: 'smooth' });
    } else if (pos === 'end') {
        container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
    }
}

function getDailyEvent(dateStr) {
    if (!state.dailyEvents || !dateStr) return '';
    return state.dailyEvents[dateStr] || '';
}
window.getDailyEvent = getDailyEvent;
