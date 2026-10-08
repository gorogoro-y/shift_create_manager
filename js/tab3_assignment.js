// js/tab3_assignment.js
// 【タブ3】日別コース配車（7日間連動タイムライン・コース選択グループ判定）

let courseFilterMode = 'all'; // 'all' or 'unassigned'

function updateCourseFilterButtons() {
    const unassignedBtn = document.getElementById('course-filter-unassigned-btn');
    const allBtn = document.getElementById('course-filter-all-btn');
    if (unassignedBtn && allBtn) {
        if (courseFilterMode === 'unassigned') {
            unassignedBtn.className = "flex-1 py-1 rounded-md transition text-center font-bold text-xs bg-white text-indigo-700 shadow-2xs cursor-pointer";
            allBtn.className = "flex-1 py-1 rounded-md transition text-center font-bold text-xs text-slate-600 hover:text-slate-900 cursor-pointer";
        } else {
            allBtn.className = "flex-1 py-1 rounded-md transition text-center font-bold text-xs bg-white text-indigo-700 shadow-2xs cursor-pointer";
            unassignedBtn.className = "flex-1 py-1 rounded-md transition text-center font-bold text-xs text-slate-600 hover:text-slate-900 cursor-pointer";
        }
    }
}

function setCourseFilterMode(mode) {
    courseFilterMode = mode;
    updateCourseFilterButtons();
    if (typeof renderCoursePalette === 'function') {
        renderCoursePalette();
    }
}

function toggleCoursePalette() {
    // 互換性維持のためのダミー関数
}

function renderAssignmentFilterToolbar() {
    const container = document.getElementById('assignment-attribute-filter-container');
    const statusInfo = document.getElementById('assignment-filter-status-info');
    if (!container) return;

    const isAllSelected = state.activeAssignmentStaffFilter === null;

    let html = `
        <span class="text-xs font-bold text-slate-600 flex items-center gap-1 mr-1">
            <span>🔍</span>
            <span>スタッフ絞込:</span>
        </span>
        <button onclick="setAssignmentStaffFilter(null)" class="px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
            isAllSelected 
                ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-500 ring-offset-1' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
        }">
            <span>全員</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] ${isAllSelected ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-600'}">${state.members.length}</span>
        </button>
    `;

    state.staffAttributes.forEach(attr => {
        const isSelected = state.activeAssignmentStaffFilter === attr.id;
        const count = state.members.filter(m => m.attributes && m.attributes.includes(attr.id)).length;
        
        const activeClasses = isSelected
            ? 'ring-2 ring-offset-1 ring-slate-800 text-white font-extrabold shadow-xs scale-105'
            : 'opacity-85 hover:opacity-100 text-white font-bold';

        html += `
            <button onclick="setAssignmentStaffFilter('${attr.id}')" class="px-2.5 py-1 rounded-lg text-xs transition transform flex items-center gap-1.5 shadow-2xs ${activeClasses}" style="background-color: ${attr.color}">
                <span class="w-1.5 h-1.5 rounded-full bg-white/70"></span>
                <span>${attr.name}</span>
                <span class="px-1 py-0.2 rounded text-[10px] bg-black/20 text-white">${count}</span>
            </button>
        `;
    });

    container.innerHTML = html;

    if (statusInfo) {
        if (state.activeAssignmentStaffFilter) {
            const matchedAttr = state.staffAttributes.find(a => a.id === state.activeAssignmentStaffFilter);
            statusInfo.innerHTML = `
                <span class="text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-md flex items-center gap-1">
                    <span>「${matchedAttr?.name || ''}」で絞り込み中</span>
                    <button onclick="setAssignmentStaffFilter(null)" class="text-slate-400 hover:text-slate-600 font-bold ml-1">✕ 解除</button>
                </span>
            `;
        } else {
            statusInfo.innerText = `全 ${state.members.length} 名を表示中`;
        }
    }
}

function setAssignmentStaffFilter(attrId) {
    state.activeAssignmentStaffFilter = attrId;
    renderCourseAssignmentTab();
    renderAssignmentFilterToolbar();
}


function parseAssignmentDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return new Date();
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
        return new Date();
    }
    return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatAssignmentDate(dt) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function onAssignmentDateChange(newDateStr) {
    if (!newDateStr) return;
    const parts = newDateStr.split('-').map(Number);
    if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return;

    const newY = parts[0];
    const newM = parts[1];
    const oldMonthDocId = `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}`;
    const newMonthDocId = `${newY}-${String(newM).padStart(2, '0')}`;

    state.selectedAssignmentDate = newDateStr;

    if (oldMonthDocId !== newMonthDocId) {
        // 月をまたぐ場合：まず現在月（旧月）のメモリ内データをローカルストレージに確実に保存
        saveData();

        // 年月を更新
        state.currentYear = newY;
        state.currentMonth = newM;

        const monthDisplay = document.getElementById('current-month-display');
        if (monthDisplay) {
            monthDisplay.innerText = `${state.currentYear}年 ${state.currentMonth}月`;
        }

        // 移動先月のデータをlocalStorageからロード
        const cachedMonth = localStorage.getItem(`shift_app_month_${newMonthDocId}`);
        state.schedule = cachedMonth ? JSON.parse(cachedMonth) : {};
        const cachedCourses = localStorage.getItem(`shift_app_courses_${newMonthDocId}`);
        state.courseAssignments = cachedCourses ? JSON.parse(cachedCourses) : {};

        // 隣接月キャッシュをクリアして再取得
        if (state.adjacentSchedules) state.adjacentSchedules = {};
        if (state.adjacentCourseAssignments) state.adjacentCourseAssignments = {};
        fetchAdjacentMonthSchedules();

        if (typeof isCloudConnected !== 'undefined' && isCloudConnected && typeof listenToCurrentMonthShift === 'function') {
            listenToCurrentMonthShift();
        } else {
            renderAll();
        }
    } else {
        renderAll();
    }
}

function changeAssignmentDay(delta) {
    if (!state.selectedAssignmentDate) return;
    const dt = parseAssignmentDate(state.selectedAssignmentDate);
    dt.setDate(dt.getDate() + delta);
    const newDateStr = formatAssignmentDate(dt);
    onAssignmentDateChange(newDateStr);
}

function getAssignedCoursesMapForDate(dateStr) {
    const map = {};
    state.courses.forEach(c => {
        map[c.id] = { full: [], first: [], second: [] };
    });

    state.members.forEach(m => {
        const ca = getCourseAssignment(m.id, dateStr);
        if (!ca) return;
        if (!ca.isSplit) {
            if (ca.courseId && map[ca.courseId]) {
                map[ca.courseId].full.push({ memberId: m.id, memberName: m.name, isTrainee: ca.isTrainee });
            }
        } else {
            if (ca.firstHalf?.courseId && map[ca.firstHalf.courseId]) {
                map[ca.firstHalf.courseId].first.push({ memberId: m.id, memberName: m.name, isTrainee: ca.firstHalf.isTrainee });
            }
            if (ca.secondHalf?.courseId && map[ca.secondHalf.courseId]) {
                map[ca.secondHalf.courseId].second.push({ memberId: m.id, memberName: m.name, isTrainee: ca.secondHalf.isTrainee });
            }
        }
    });

    return map;
}

// --- ドラッグ＆ドロップ（DnD）配車ハンドラー ---
function handleCourseDragStart(event, courseId, sourceMemberId = null, sourceSlot = null) {
    const payload = {
        courseId: courseId,
        sourceMemberId: sourceMemberId,
        sourceSlot: sourceSlot
    };
    event.dataTransfer.setData('text/plain', JSON.stringify(payload));
    event.dataTransfer.effectAllowed = 'move';
}

function handleCourseDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const target = event.currentTarget;
    if (target && !target.classList.contains('drag-over-active')) {
        target.classList.add('drag-over-active', 'ring-2', 'ring-indigo-500', 'bg-indigo-50/80');
    }
}

function handleCourseDragLeave(event) {
    const target = event.currentTarget;
    if (target) {
        target.classList.remove('drag-over-active', 'ring-2', 'ring-indigo-500', 'bg-indigo-50/80');
    }
}

function handleCourseDrop(event, targetMemberId, targetSlot) {
    event.preventDefault();
    const target = event.currentTarget;
    if (target) {
        target.classList.remove('drag-over-active', 'ring-2', 'ring-indigo-500', 'bg-indigo-50/80');
    }

    let payload;
    try {
        payload = JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch(e) {
        return;
    }

    const { courseId, sourceMemberId, sourceSlot } = payload;
    if (!courseId) return;

    // 同じスタッフの同じ枠へのドロップはスキップ
    if (sourceMemberId === targetMemberId && sourceSlot === targetSlot) return;

    const course = state.courses.find(c => c.id === courseId);
    if (!course) return;

    const targetMember = state.members.find(m => m.id === targetMemberId);
    if (!targetMember) return;

    const targetCa = getCourseAssignment(targetMemberId, state.selectedAssignmentDate);
    const targetKey = `${state.selectedAssignmentDate}_${targetMemberId}`;

    // NGコース判定（教育フラグがONなら許可）
    let isTargetTrainee = false;
    if (targetSlot === 'full') isTargetTrainee = !!targetCa.isTrainee;
    else if (targetSlot === 'first') isTargetTrainee = !!targetCa.firstHalf?.isTrainee;
    else if (targetSlot === 'second') isTargetTrainee = !!targetCa.secondHalf?.isTrainee;

    const isTargetNG = targetMember.ngCourses && targetMember.ngCourses.includes(courseId);
    if (isTargetNG && !isTargetTrainee) {
        if (typeof showMessageModal === 'function') {
            showMessageModal(`【担当不可（NGコース）】<br><strong>${targetMember.name}</strong> さんは「${course.name}」の担当不可に指定されています。<br><span class="text-xs text-slate-500 mt-1 block">※このコースを割り当てる場合は「🎓 教育・同乗」にチェックを入れてください。</span>`);
        } else {
            alert(`${targetMember.name} さんは「${course.name}」の担当不可に設定されています。`);
        }
        return;
    }

    // ターゲットスロットの現在のコース
    let targetCurrentCourseId = '';
    if (targetSlot === 'full') targetCurrentCourseId = targetCa.courseId || '';
    else if (targetSlot === 'first') targetCurrentCourseId = targetCa.firstHalf?.courseId || '';
    else if (targetSlot === 'second') targetCurrentCourseId = targetCa.secondHalf?.courseId || '';

    // パターン1: スタッフ間でのドラッグ＆ドロップ（交換または同乗追加）
    if (sourceMemberId) {
        const sourceCa = getCourseAssignment(sourceMemberId, state.selectedAssignmentDate);
        const sourceKey = `${state.selectedAssignmentDate}_${sourceMemberId}`;

        // ターゲットへ配置
        if (targetSlot === 'full') {
            targetCa.courseId = courseId;
        } else if (targetSlot === 'first') {
            if (!targetCa.firstHalf) targetCa.firstHalf = { courseId: '', isTrainee: false };
            targetCa.firstHalf.courseId = courseId;
        } else if (targetSlot === 'second') {
            if (!targetCa.secondHalf) targetCa.secondHalf = { courseId: '', isTrainee: false };
            targetCa.secondHalf.courseId = courseId;
        }

        // ターゲットが教育・同乗（isTargetTrainee）でない場合のみ、ソース側をスワップ・移動処理
        // （ターゲットが教育生の場合は元の本乗務スタッフからコースを奪わず同乗追加とする）
        if (!isTargetTrainee) {
            if (sourceSlot === 'full') {
                sourceCa.courseId = targetCurrentCourseId;
            } else if (sourceSlot === 'first') {
                if (!sourceCa.firstHalf) sourceCa.firstHalf = { courseId: '', isTrainee: false };
                sourceCa.firstHalf.courseId = targetCurrentCourseId;
            } else if (sourceSlot === 'second') {
                if (!sourceCa.secondHalf) sourceCa.secondHalf = { courseId: '', isTrainee: false };
                sourceCa.secondHalf.courseId = targetCurrentCourseId;
            }
            state.courseAssignments[sourceKey] = sourceCa;
            if (typeof syncSingleCourseAssignmentToCloud === 'function') {
                syncSingleCourseAssignmentToCloud(sourceKey, sourceCa);
            }
        }

        state.courseAssignments[targetKey] = targetCa;
        if (typeof syncSingleCourseAssignmentToCloud === 'function') {
            syncSingleCourseAssignmentToCloud(targetKey, targetCa);
        }
    } else {
        // パターン2: 上部コース一覧からのドラッグ＆ドロップ
        // ドロップ先が通常乗務（!isTargetTrainee）の場合のみ、既存の通常乗務スタッフを解除して移動
        // ドロップ先が教育・同乗（isTargetTrainee）の場合は、他スタッフを解除せずそのまま同乗として追加
        if (!isTargetTrainee) {
            state.members.forEach(m => {
                if (m.id === targetMemberId) return;
                const mCa = getCourseAssignment(m.id, state.selectedAssignmentDate);
                const mKey = `${state.selectedAssignmentDate}_${m.id}`;
                let changed = false;

                if (!mCa.isSplit) {
                    // 通常スタッフ（!mCa.isTrainee）の場合のみ解除（同乗教育生は解除しない）
                    if (mCa.courseId === courseId && !mCa.isTrainee) {
                        mCa.courseId = '';
                        changed = true;
                    }
                } else {
                    if (targetSlot === 'full' || targetSlot === 'first') {
                        if (mCa.firstHalf?.courseId === courseId && !mCa.firstHalf?.isTrainee) {
                            mCa.firstHalf.courseId = '';
                            changed = true;
                        }
                    }
                    if (targetSlot === 'full' || targetSlot === 'second') {
                        if (mCa.secondHalf?.courseId === courseId && !mCa.secondHalf?.isTrainee) {
                            mCa.secondHalf.courseId = '';
                            changed = true;
                        }
                    }
                }

                if (changed) {
                    state.courseAssignments[mKey] = mCa;
                    if (typeof syncSingleCourseAssignmentToCloud === 'function') {
                        syncSingleCourseAssignmentToCloud(mKey, mCa);
                    }
                }
            });
        }

        // ターゲットへ配置
        if (targetSlot === 'full') {
            targetCa.courseId = courseId;
        } else if (targetSlot === 'first') {
            if (!targetCa.firstHalf) targetCa.firstHalf = { courseId: '', isTrainee: false };
            targetCa.firstHalf.courseId = courseId;
        } else if (targetSlot === 'second') {
            if (!targetCa.secondHalf) targetCa.secondHalf = { courseId: '', isTrainee: false };
            targetCa.secondHalf.courseId = courseId;
        }

        state.courseAssignments[targetKey] = targetCa;
        if (typeof syncSingleCourseAssignmentToCloud === 'function') {
            syncSingleCourseAssignmentToCloud(targetKey, targetCa);
        }
    }

    saveData();
    renderAll();
}

function clearCourseSlot(memberId, slot) {
    const key = `${state.selectedAssignmentDate}_${memberId}`;
    const ca = getCourseAssignment(memberId, state.selectedAssignmentDate);
    if (!ca) return;

    if (slot === 'full') {
        ca.courseId = '';
    } else if (slot === 'first') {
        if (ca.firstHalf) ca.firstHalf.courseId = '';
    } else if (slot === 'second') {
        if (ca.secondHalf) ca.secondHalf.courseId = '';
    }

    state.courseAssignments[key] = ca;
    saveData();
    renderAll();
    if (typeof syncSingleCourseAssignmentToCloud === 'function') {
        syncSingleCourseAssignmentToCloud(key, ca);
    }
}

function renderDraggableCourseChip(crs, assignedMap, isGroup = false) {
    const assigned = assignedMap[crs.id] || { full: [], first: [], second: [] };
    const isFullAssigned = assigned.full.length > 0;
    const isFirstAssigned = assigned.first.length > 0;
    const isSecondAssigned = assigned.second.length > 0;
    const isAnyAssigned = isFullAssigned || isFirstAssigned || isSecondAssigned;

    let staffLabels = [];
    if (isFullAssigned) {
        staffLabels.push(assigned.full.map(a => `${a.memberName}${a.isTrainee ? '(🎓同乗)' : ''}`).join(', '));
    }
    if (isFirstAssigned) {
        staffLabels.push(assigned.first.map(a => `${a.memberName}[前]${a.isTrainee ? '(🎓同乗)' : ''}`).join(', '));
    }
    if (isSecondAssigned) {
        staffLabels.push(assigned.second.map(a => `${a.memberName}[後]${a.isTrainee ? '(🎓同乗)' : ''}`).join(', '));
    }
    const staffText = staffLabels.join(' / ');

    if (isAnyAssigned) {
        return `
            <div draggable="true"
                 ondragstart="handleCourseDragStart(event, '${crs.id}')"
                 class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100/90 text-slate-500 border border-slate-200 shadow-2xs cursor-grab active:cursor-grabbing hover:bg-slate-200/90 hover:border-slate-300 transition select-none"
                 title="${crs.order}. ${crs.name} (担当: ${staffText}) - ドラッグして他スタッフへ移動・交代可能">
                <div class="flex items-center gap-1.5 min-w-0">
                    <span class="text-[10px] text-slate-400 font-black shrink-0">${crs.order}.</span>
                    <span class="truncate line-through decoration-slate-400">${crs.name}</span>
                </div>
                <span class="text-[10px] font-black text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-indigo-200 shadow-2xs truncate max-w-[110px] text-right shrink-0" title="${staffText}">${staffText}</span>
            </div>
        `;
    } else {
        let badgeBorderClass = "bg-white text-slate-800 border-amber-300 hover:border-amber-500 hover:bg-amber-50/50";
        let orderColorClass = "text-amber-600";
        if (isGroup) {
            badgeBorderClass = "bg-white text-violet-800 border-violet-300 hover:border-violet-500 hover:bg-violet-50";
            orderColorClass = "text-violet-600";
        } else if (crs.isRequired === false) {
            badgeBorderClass = "bg-white text-slate-700 border-slate-300 hover:border-slate-400 hover:bg-slate-50";
            orderColorClass = "text-slate-400";
        }
        return `
            <div draggable="true"
                 ondragstart="handleCourseDragStart(event, '${crs.id}')"
                 class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold border shadow-2xs cursor-grab active:cursor-grabbing hover:shadow-xs transition select-none ${badgeBorderClass}"
                 title="${crs.order}. ${crs.name} - ドラッグしてスタッフ枠へドロップ">
                <div class="flex items-center gap-1.5 min-w-0">
                    <span class="text-[10px] font-black ${orderColorClass} shrink-0">${crs.order}.</span>
                    <span class="truncate">${crs.name}</span>
                    ${crs.isRequired === false ? '<span class="text-[9px] px-1 bg-slate-100 text-slate-500 rounded font-normal shrink-0">任意</span>' : ''}
                </div>
                <span class="text-[10px] px-1.5 py-0.5 rounded font-black bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">未割当</span>
            </div>
        `;
    }
}

function getTimelineDayInfo(baseDateStr, offset) {
    const dt = parseAssignmentDate(baseDateStr);
    dt.setDate(dt.getDate() + offset);
    const dayOfWeekNum = dt.getDay();
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    return {
        dateStr: formatAssignmentDate(dt),
        day: dt.getDate(),
        month: dt.getMonth() + 1,
        dayOfWeek: dayNames[dayOfWeekNum],
        isSunday: dayOfWeekNum === 0,
        isSaturday: dayOfWeekNum === 6
    };
}

function renderTimelineMiniCell(memberId, dateInfo) {
    const cell = getCellDataForAnyDate(memberId, dateInfo.dateStr);
    const shiftId = cell.shiftId;
    const ca = getCourseAssignment(memberId, dateInfo.dateStr);

    const findName = (cid) => {
        const c = state.courses.find(item => item.id === cid);
        return c ? c.name.replace('コース', '') : '';
    };

    let courseText = '';
    if (ca) {
        if (ca.isSplit) {
            const c1 = findName(ca.firstHalf?.courseId);
            const c2 = findName(ca.secondHalf?.courseId);
            if (c1 || c2) courseText = `${c1 || '-'}/${c2 || '-'}`;
        } else if (ca.courseId) {
            courseText = findName(ca.courseId);
        }
    }

    const hType = getHolidayType(shiftId);
    if (hType) {
        return `
            <div class="w-full text-center py-0.5">
                <span class="inline-block px-1.5 py-0.5 rounded text-xs font-black border leading-none shadow-2xs" style="background-color: ${hType.color}20; color: ${hType.color}; border-color: ${hType.color}50;" title="${hType.name}">
                    ${hType.shortName}
                </span>
            </div>
        `;
    }

    const shift = state.shiftTypes.find(s => s.id === shiftId);
    const color = state.colorTypes.find(c => c.id === cell.colorId);

    if (!shift && !color && !courseText) {
        return `<div class="text-center text-slate-300 text-xs py-1 font-bold">ー</div>`;
    }

    let bgStyle = '';
    let label = '';
    if (shift) {
        label = shift.shortName;
    } else if (color) {
        label = color.name;
    }

    if (color) {
        bgStyle = `background-color: ${color.color}`;
    } else if (shift) {
        bgStyle = `background-color: ${shift.color}`;
    }

    const badgeTitle = `${shift ? shift.name : ''}${shift && color ? ' [' + color.name + ']' : (!shift && color ? color.name : '')}`;

    return `
        <div class="flex flex-col items-center justify-center gap-0.5 py-0.5">
            ${label ? `
                <span class="inline-block px-1.5 py-0.5 rounded text-xs font-black text-white shadow-2xs leading-none" style="${bgStyle}" title="${badgeTitle}">
                    ${label}
                </span>
            ` : ''}
            ${courseText ? `
                <span class="text-[10px] font-bold bg-slate-800 text-white px-1 py-0.5 rounded leading-tight max-w-[50px] truncate shadow-2xs" title="割当コース: ${courseText}">
                    ${courseText}
                </span>
            ` : ''}
        </div>
    `;
}

function renderCoursePalette() {
    const statsContainer = document.getElementById('daily-course-stats');
    const unassignedContainer = document.getElementById('unassigned-courses-container');
    if (!unassignedContainer) return;

    updateCourseFilterButtons();

    const assignedMap = getAssignedCoursesMapForDate(state.selectedAssignmentDate);
    const isCourseAssigned = (cid) => {
        const assigned = assignedMap[cid];
        if (!assigned) return false;
        return (assigned.full && assigned.full.length > 0) || 
               (assigned.first && assigned.first.length > 0) || 
               (assigned.second && assigned.second.length > 0);
    };

    // コース選択グループの集計判定
    const groups = state.courseGroups || [];
    const allGroupCourseIds = new Set();
    groups.forEach(g => {
        (g.courseIds || []).forEach(cid => allGroupCourseIds.add(cid));
    });

    const groupStatusList = groups.map(g => {
        const totalInGroup = (g.courseIds || []).length;
        const assignedInGroup = (g.courseIds || []).filter(cid => isCourseAssigned(cid));
        const unassignedInGroup = (g.courseIds || []).filter(cid => !isCourseAssigned(cid));
        const reqCount = g.requiredCount || 1;
        const shortage = Math.max(0, reqCount - assignedInGroup.length);
        const isSatisfied = assignedInGroup.length >= reqCount;

        return {
            id: g.id,
            name: g.name,
            courseIds: g.courseIds || [],
            allCourses: (g.courseIds || []).map(cid => state.courses.find(c => c.id === cid)).filter(Boolean),
            requiredCount: reqCount,
            assignedCourses: assignedInGroup.map(cid => state.courses.find(c => c.id === cid)).filter(Boolean),
            unassignedCourses: unassignedInGroup.map(cid => state.courses.find(c => c.id === cid)).filter(Boolean),
            shortage: shortage,
            isSatisfied: isSatisfied
        };
    });

    // 単独の必須コース（どのグループにも属していない必須コース）
    const unassignedSingleRequiredList = state.courses.filter(c => 
        c.isRequired !== false && 
        !allGroupCourseIds.has(c.id) && 
        !isCourseAssigned(c.id)
    );

    // 任意コース（グループに属さない任意コース）
    const unassignedOptionalList = state.courses.filter(c => 
        c.isRequired === false && 
        !allGroupCourseIds.has(c.id) && 
        !isCourseAssigned(c.id)
    );

    // 不足枠数の合算（単独必須コースの未割当数 + 各グループの不足枠数）
    const groupShortageTotal = groupStatusList.reduce((sum, g) => sum + g.shortage, 0);
    const unassignedReqCount = unassignedSingleRequiredList.length + groupShortageTotal;

    if (statsContainer) {
        statsContainer.innerHTML = `
            <span class="${unassignedReqCount > 0 ? 'text-amber-700 bg-amber-50 border border-amber-200' : 'text-emerald-700 bg-emerald-50 border border-emerald-200'} px-2 py-0.5 rounded-md text-[11px] font-black">
                ${unassignedReqCount > 0 ? `未割当: ${unassignedReqCount}枠` : '全割当済 ✅'}
            </span>
        `;
    }

    let htmlList = `<div class="space-y-3">`;

    // 全充足時の完了バナー
    if (unassignedReqCount === 0) {
        htmlList += `
            <div class="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 p-2 rounded-xl shadow-2xs text-center space-y-0.5">
                <div class="flex items-center justify-center gap-1">
                    <span>✅</span>
                    <span>すべての必須枠が割当済です</span>
                </div>
                <div class="text-[10px] text-emerald-600 font-normal">※ドラッグして他スタッフへ移動・交代可能</div>
            </div>
        `;
    }

    // 1. コース選択グループ枠の表示
    if (groupStatusList.length > 0) {
        htmlList += `
            <div class="space-y-1.5">
                <div class="flex items-center justify-between text-xs font-bold text-violet-900">
                    <span class="flex items-center gap-1">
                        <span>🔀</span>
                        <span>選択グループ (${groupStatusList.length})</span>
                    </span>
                    <button type="button" onclick="openCourseGroupModal()" class="px-1.5 py-0.5 bg-violet-100 hover:bg-violet-200 text-violet-800 rounded font-bold transition flex items-center gap-0.5 text-[10px]">
                        <span>＋ 追加</span>
                    </button>
                </div>
                <div class="space-y-2">
                    ${groupStatusList.map(g => {
                        const groupCourses = courseFilterMode === 'unassigned' ? g.unassignedCourses : g.allCourses;
                        const isSat = g.isSatisfied;
                        return `
                            <div class="p-2 rounded-xl border text-xs space-y-1.5 ${isSat ? 'bg-emerald-50/50 border-emerald-200' : 'bg-violet-50/50 border-violet-200'}">
                                <div class="flex items-center justify-between font-bold">
                                    <span class="flex items-center gap-1 ${isSat ? 'text-emerald-800' : 'text-violet-900'} truncate">
                                        <span>${isSat ? '✅' : '⚠️'}</span>
                                        <span class="truncate">${g.name}</span>
                                    </span>
                                    <div class="flex items-center gap-1 shrink-0">
                                        <span class="text-[9px] px-1.5 py-0.2 rounded font-black ${isSat ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-100 text-rose-700 border border-rose-300'}">
                                            ${isSat ? `充足済 (${g.assignedCourses.length}/${g.requiredCount})` : `あと${g.shortage}枠 (${g.assignedCourses.length}/${g.requiredCount})`}
                                        </span>
                                        <button type="button" onclick="openCourseGroupModal('${g.id}')" class="text-slate-400 hover:text-violet-700 text-xs font-bold px-1 py-0.2 rounded hover:bg-black/5" title="グループ設定を編集">✏️</button>
                                    </div>
                                </div>
                                <div class="space-y-1 pt-0.5">
                                    ${groupCourses.length > 0 ? groupCourses.map(crs => renderDraggableCourseChip(crs, assignedMap, true)).join('') : `
                                        <div class="text-[11px] text-emerald-700 font-bold py-0.5 text-center">必要枠充足済み</div>
                                    `}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    } else {
        htmlList += `
            <div class="p-2 border border-dashed border-violet-200 bg-violet-50/30 rounded-xl flex items-center justify-between gap-1.5 text-xs text-violet-700">
                <span class="text-[11px] font-medium">コース選択グループ枠なし</span>
                <button type="button" onclick="openCourseGroupModal()" class="px-2 py-0.5 bg-violet-600 hover:bg-violet-700 text-white rounded font-bold text-[10px] transition shrink-0">
                    ＋ 追加
                </button>
            </div>
        `;
    }

    // 2. 単独必須コース一覧
    const allSingleRequiredList = state.courses.filter(c => c.isRequired !== false && !allGroupCourseIds.has(c.id));
    const displaySingleRequired = courseFilterMode === 'unassigned'
        ? unassignedSingleRequiredList
        : allSingleRequiredList;

    htmlList += `
        <div class="space-y-1 pt-1">
            <div class="flex items-center justify-between text-xs font-bold text-amber-900">
                <span class="flex items-center gap-1">
                    <span>📋</span>
                    <span>通常コース (${displaySingleRequired.length}件)</span>
                </span>
                <span class="text-[10px] font-bold ${unassignedSingleRequiredList.length > 0 ? 'text-rose-600' : 'text-emerald-600'}">
                    未配車: ${unassignedSingleRequiredList.length}
                </span>
            </div>
            ${displaySingleRequired.length > 0 ? `
                <div class="space-y-1">
                    ${displaySingleRequired.map(crs => renderDraggableCourseChip(crs, assignedMap, false)).join('')}
                </div>
            ` : `
                <div class="text-center text-xs text-slate-400 py-3 bg-slate-50 rounded-lg border border-slate-200 font-bold">
                    ${courseFilterMode === 'unassigned' ? '未配車の通常コースはありません' : '登録された通常コースはありません'}
                </div>
            `}
        </div>
    `;

    // 3. 任意コース一覧
    const allOptionalList = state.courses.filter(c => c.isRequired === false && !allGroupCourseIds.has(c.id));
    const displayOptional = courseFilterMode === 'unassigned'
        ? unassignedOptionalList
        : allOptionalList;

    if (allOptionalList.length > 0) {
        htmlList += `
            <div class="space-y-1 pt-1">
                <div class="text-xs font-bold text-slate-500 flex items-center justify-between">
                    <span class="flex items-center gap-1">
                        <span>📦</span>
                        <span>任意便 (${displayOptional.length}件)</span>
                    </span>
                    <span class="text-[10px] text-slate-500">未配車: ${unassignedOptionalList.length}</span>
                </div>
                ${displayOptional.length > 0 ? `
                    <div class="space-y-1">
                        ${displayOptional.map(crs => renderDraggableCourseChip(crs, assignedMap, false)).join('')}
                    </div>
                ` : `
                    <div class="text-center text-[11px] text-slate-400 py-2 bg-slate-50 rounded-lg border border-slate-200">
                        未配車の任意便はありません
                    </div>
                `}
            </div>
        `;
    }

    htmlList += `</div>`;
    unassignedContainer.innerHTML = htmlList;
}

window.renderUnassignedCoursesPalette = renderCoursePalette;

function renderCourseAssignmentTab() {
    const targetDateInput = document.getElementById('assignment-target-date');
    const dayBadge = document.getElementById('assignment-day-badge');
    const statsContainer = document.getElementById('daily-course-stats');
    const unassignedContainer = document.getElementById('unassigned-courses-container');
    const tableBody = document.getElementById('course-assignment-table-body');

    if (!targetDateInput || !tableBody) return;

    targetDateInput.value = state.selectedAssignmentDate;
    const dateObj = parseAssignmentDate(state.selectedAssignmentDate);
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const dayOfWeek = dayNames[dateObj.getDay()] || '';
    dayBadge.innerText = `${dayOfWeek}曜日`;

    if (dateObj.getDay() === 0) {
        dayBadge.className = "px-2.5 py-1 rounded-lg text-xs font-black bg-rose-50 text-rose-700 border border-rose-200";
    } else if (dateObj.getDay() === 6) {
        dayBadge.className = "px-2.5 py-1 rounded-lg text-xs font-black bg-sky-50 text-sky-700 border border-sky-200";
    } else {
        dayBadge.className = "px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200";
    }

    const todayEvent = state.dailyEvents?.[state.selectedAssignmentDate] || '';
    const dayEventBadge = document.getElementById('assignment-day-event-badge');
    if (dayEventBadge) {
        if (todayEvent) {
            dayEventBadge.innerHTML = `<span class="text-[10px]">📌</span><span>${todayEvent}</span>`;
            dayEventBadge.className = "px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs";
            dayEventBadge.title = `特別イベント: ${todayEvent}`;
        } else {
            dayEventBadge.className = "hidden";
        }
    }

    const offsets = [-3, -2, -1, 1, 2, 3];
    const timelineDays = {};
    offsets.forEach(off => {
        timelineDays[off] = getTimelineDayInfo(state.selectedAssignmentDate, off);
    });

    const updateHeaderCell = (elemId, dayInfo) => {
        const el = document.getElementById(elemId);
        if (!el) return;
        let colorClass = "text-slate-700";
        if (dayInfo.isSunday) colorClass = "text-rose-600 font-extrabold";
        else if (dayInfo.isSaturday) colorClass = "text-sky-600 font-extrabold";
        
        const eventVal = state.dailyEvents?.[dayInfo.dateStr] || '';
        const eventTag = eventVal
            ? `<span class="max-w-[48px] truncate px-1 py-0.2 rounded text-[8px] font-black bg-amber-100 text-amber-900 border border-amber-300 block text-center leading-tight mb-0.5 shadow-2xs" title="特別イベント: ${eventVal}">${eventVal}</span>`
            : '';

        el.innerHTML = `
            <div class="flex flex-col items-center cursor-pointer hover:bg-slate-100 py-0.5 rounded transition" onclick="onAssignmentDateChange('${dayInfo.dateStr}')" title="${dayInfo.dateStr} へ移動${eventVal ? ' (' + eventVal + ')' : ''}">
                ${eventTag}
                <span class="text-[10px] text-slate-400 font-medium">${dayInfo.month}/${dayInfo.day}</span>
                <span class="text-xs ${colorClass}">(${dayInfo.dayOfWeek})</span>
            </div>
        `;
    };

    updateHeaderCell('th-prev-3', timelineDays[-3]);
    updateHeaderCell('th-prev-2', timelineDays[-2]);
    updateHeaderCell('th-prev-1', timelineDays[-1]);
    updateHeaderCell('th-next-1', timelineDays[1]);
    updateHeaderCell('th-next-2', timelineDays[2]);
    updateHeaderCell('th-next-3', timelineDays[3]);

    // 本日（対象日）の担当コース列ヘッダーの描画（日付・曜日・残り割当必要人数）
    const thToday = document.getElementById('th-today-assignment');
    if (thToday) {
        const month = dateObj.getMonth() + 1;
        const day = dateObj.getDate();
        let todayColorClass = "text-indigo-900";
        if (dateObj.getDay() === 0) todayColorClass = "text-rose-600";
        else if (dateObj.getDay() === 6) todayColorClass = "text-sky-600";

        // 出勤スタッフ（休日・休暇等の人員を除く）
        const workingMembers = state.members.filter(m => {
            const cell = getCellData(`${m.id}_${state.selectedAssignmentDate}`);
            return !isHolidayValue(cell.shiftId);
        });

        // 割当完了人数の計算（分割シフトの場合は前後半両方の設定で完了）
        let fullyAssignedCount = 0;
        workingMembers.forEach(m => {
            const ca = getCourseAssignment(m.id, state.selectedAssignmentDate);
            if (!ca) return;
            if (!ca.isSplit) {
                if (ca.courseId) fullyAssignedCount++;
            } else {
                if (ca.firstHalf?.courseId && ca.secondHalf?.courseId) fullyAssignedCount++;
            }
        });

        const remainingCount = workingMembers.length - fullyAssignedCount;

        let badgeHtml = '';
        if (workingMembers.length === 0) {
            badgeHtml = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">出勤なし</span>`;
        } else if (remainingCount === 0) {
            badgeHtml = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                <span>✅ 全員割当済</span>
                <span class="text-[10px] text-emerald-600 font-bold">(${workingMembers.length}人)</span>
            </span>`;
        } else {
            badgeHtml = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs" title="出勤${workingMembers.length}人中、${fullyAssignedCount}人割当済">
                <span>あと</span>
                <span class="text-xs font-black text-rose-600">${remainingCount}人</span>
                <span>割当必要</span>
                <span class="text-[10px] text-amber-700 font-bold">(${fullyAssignedCount}/${workingMembers.length}人)</span>
            </span>`;
        }

        const todayEventTag = todayEvent
            ? `<span class="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs shrink-0 flex items-center gap-0.5" title="特別イベント: ${todayEvent}"><span>📌</span><span>${todayEvent}</span></span>`
            : '';

        thToday.innerHTML = `
            <div class="flex items-center justify-between gap-2 px-1">
                <div class="flex items-center gap-1.5 shrink-0 flex-wrap">
                    <span class="text-xs font-black text-indigo-950">担当コース</span>
                    <span class="text-xs font-bold text-slate-500">${month}/${day}</span>
                    <span class="text-xs font-black ${todayColorClass}">(${dayOfWeek})</span>
                    ${todayEventTag}
                </div>
                <div class="shrink-0">
                    ${badgeHtml}
                </div>
            </div>
        `;
    }

    // 右側コースパレットの描画
    renderCoursePalette();

    const displayMembers = state.activeAssignmentStaffFilter
        ? state.members.filter(m => m.attributes && m.attributes.includes(state.activeAssignmentStaffFilter))
        : state.members;

    if (displayMembers.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="11" class="p-8 text-center text-slate-400 font-bold bg-slate-50">
                    選択された属性に該当するスタッフがいません。<br>
                    <button onclick="setAssignmentStaffFilter(null)" class="mt-2 text-xs text-indigo-600 underline font-bold">全員表示に戻す</button>
                </td>
            </tr>
        `;
        return;
    }

    let tbodyHtml = '';
    displayMembers.forEach(member => {
        const cell = getCellData(`${member.id}_${state.selectedAssignmentDate}`);
        const isHoliday = isHolidayValue(cell.shiftId);
        const shiftObj = state.shiftTypes.find(s => s.id === cell.shiftId);
        const colorObj = state.colorTypes.find(c => c.id === cell.colorId);

        let shiftLabel = '未定';
        if (shiftObj) {
            shiftLabel = shiftObj.name;
        } else if (cell.shiftId) {
            shiftLabel = cell.shiftId;
        } else if (colorObj) {
            shiftLabel = colorObj.name;
        }

        let shiftBadgeBg = '#64748b';
        if (colorObj) {
            shiftBadgeBg = colorObj.color;
        } else if (shiftObj) {
            shiftBadgeBg = shiftObj.color;
        }

        const shiftBadgeTitle = `${shiftObj ? shiftObj.name : ''}${shiftObj && colorObj ? ' [' + colorObj.name + ']' : (!shiftObj && colorObj ? colorObj.name : '')}`;
        const memberBadges = getMemberBadgesHTML(member);
        const ca = getCourseAssignment(member.id, state.selectedAssignmentDate);

        const prevCell3 = renderTimelineMiniCell(member.id, timelineDays[-3]);
        const prevCell2 = renderTimelineMiniCell(member.id, timelineDays[-2]);
        const prevCell1 = renderTimelineMiniCell(member.id, timelineDays[-1]);
        const nextCell1 = renderTimelineMiniCell(member.id, timelineDays[1]);
        const nextCell2 = renderTimelineMiniCell(member.id, timelineDays[2]);
        const nextCell3 = renderTimelineMiniCell(member.id, timelineDays[3]);

        if (isHoliday) {
            const hType = getHolidayType(cell.shiftId);
            const holidayShort = hType ? hType.shortName : cell.shiftId;
            const holidayName = hType ? hType.name : cell.shiftId;
            const holidayColor = hType ? hType.color : '#f43f5e';
            tbodyHtml += `
                <tr class="border-b border-slate-200 bg-slate-50/60 text-slate-400 hover:bg-slate-100/50 transition">
                    <td class="p-3 font-bold sticky-col-left shadow-2xs border-r border-slate-200">
                        <div class="flex items-center gap-1.5">
                            <span class="line-through">${member.name}</span>
                            <div class="opacity-50">${memberBadges}</div>
                        </div>
                    </td>
                    <td class="p-1 border-r border-slate-200 align-middle bg-white/40">${prevCell3}</td>
                    <td class="p-1 border-r border-slate-200 align-middle bg-white/40">${prevCell2}</td>
                    <td class="p-1 border-r-2 border-indigo-300 align-middle bg-white/40">${prevCell1}</td>

                    <td class="p-2.5 text-center bg-rose-50/30 border-r border-indigo-200 align-middle">
                        <span class="px-2.5 py-1 rounded-md font-black text-xs border inline-block shadow-2xs" style="background-color: ${holidayColor}20; color: ${holidayColor}; border-color: ${holidayColor}50;" title="${holidayName}">
                            ${holidayShort}
                        </span>
                    </td>
                    <td class="p-2.5 text-center text-xs text-slate-400 bg-rose-50/20 border-r border-indigo-200 align-middle">ー</td>
                    <td class="p-2.5 text-center text-xs text-slate-400 bg-rose-50/20 border-r-2 border-indigo-300 align-middle">ー</td>

                    <td class="p-1 border-r border-slate-200 align-middle bg-white/40">${nextCell1}</td>
                    <td class="p-1 border-r border-slate-200 align-middle bg-white/40">${nextCell2}</td>
                    <td class="p-1 border-r border-slate-200 align-middle bg-white/40">${nextCell3}</td>

                    <td class="p-2 text-center text-xs text-slate-400 align-middle">ー</td>
                </tr>
            `;
        } else {
            const ngCourses = member.ngCourses || [];

            let assignmentControls = '';
            if (!ca.isSplit) {
                const currentCrs = ca.courseId ? state.courses.find(c => c.id === ca.courseId) : null;
                const isNG = currentCrs && ngCourses.includes(currentCrs.id);

                assignmentControls = `
                    <div class="flex items-center gap-1.5">
                        <div ondragover="handleCourseDragOver(event)"
                             ondragleave="handleCourseDragLeave(event)"
                             ondrop="handleCourseDrop(event, '${member.id}', 'full')"
                             class="w-44 min-h-[34px] p-0.5 rounded-lg transition flex items-center">
                            ${currentCrs ? `
                                <div draggable="true"
                                     ondragstart="handleCourseDragStart(event, '${currentCrs.id}', '${member.id}', 'full')"
                                     class="w-full flex items-center justify-between px-2 py-1 rounded-md ${isNG && !ca.isTrainee ? 'bg-rose-600' : 'bg-indigo-600'} text-white font-bold text-xs shadow-2xs cursor-grab active:cursor-grabbing hover:opacity-95 transition select-none"
                                     title="${currentCrs.order}. ${currentCrs.name} - ドラッグして他スタッフへ移動・交換可能">
                                    <span class="flex items-center gap-1 min-w-0 truncate">
                                        <span class="text-[9px] px-1 py-0.2 rounded bg-black/25 text-white font-black shrink-0">${currentCrs.order}.</span>
                                        <span class="truncate">${currentCrs.name}</span>
                                        ${ca.isTrainee ? '<span class="text-[8px] px-1 bg-amber-400 text-slate-900 rounded font-black shrink-0">🎓同乗</span>' : ''}
                                        ${isNG ? '<span class="text-[8px] px-1 bg-rose-300 text-rose-950 rounded font-black shrink-0">⚠️NG</span>' : ''}
                                    </span>
                                    <button type="button" onclick="clearCourseSlot('${member.id}', 'full')" class="ml-1 text-white/80 hover:text-white hover:bg-black/20 rounded px-1 transition text-xs font-black shrink-0" title="コース割当を解除">✕</button>
                                </div>
                            ` : `
                                <div class="w-full text-center text-[11px] font-bold text-slate-400 border-2 border-dashed border-slate-300 rounded-md py-1 bg-slate-50/70 hover:bg-indigo-50/60 hover:border-indigo-400 transition cursor-pointer select-none">
                                    ＋ コースドロップ
                                </div>
                            `}
                        </div>
                        <label class="flex items-center gap-1 px-1.5 py-1 rounded-md border text-[11px] font-bold cursor-pointer transition select-none shrink-0 ${ca.isTrainee ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-2xs ring-1 ring-amber-400' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}" title="教育・同乗設定（NGコース割当許可）">
                            <input type="checkbox" onchange="updateCourseAssignment('${member.id}', 'isTrainee', this.checked)" ${ca.isTrainee ? 'checked' : ''} class="w-3 h-3 text-amber-600 rounded">
                            <span>🎓同乗</span>
                        </label>
                    </div>
                `;
            } else {
                const firstCrs = ca.firstHalf?.courseId ? state.courses.find(c => c.id === ca.firstHalf.courseId) : null;
                const secondCrs = ca.secondHalf?.courseId ? state.courses.find(c => c.id === ca.secondHalf.courseId) : null;
                const isFirstNG = firstCrs && ngCourses.includes(firstCrs.id);
                const isSecondNG = secondCrs && ngCourses.includes(secondCrs.id);

                assignmentControls = `
                    <div class="space-y-1 py-0.5">
                        <div class="flex items-center gap-1.5">
                            <span class="text-[9px] font-extrabold px-1 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-300 w-7 text-center shrink-0">前</span>
                            <div ondragover="handleCourseDragOver(event)"
                                 ondragleave="handleCourseDragLeave(event)"
                                 ondrop="handleCourseDrop(event, '${member.id}', 'first')"
                                 class="w-36 min-h-[30px] p-0.5 rounded-md transition flex items-center">
                                ${firstCrs ? `
                                    <div draggable="true"
                                         ondragstart="handleCourseDragStart(event, '${firstCrs.id}', '${member.id}', 'first')"
                                         class="w-full flex items-center justify-between px-1.5 py-0.5 rounded-md ${isFirstNG && !ca.firstHalf?.isTrainee ? 'bg-rose-600' : 'bg-sky-700'} text-white font-bold text-xs shadow-2xs cursor-grab active:cursor-grabbing hover:opacity-95 transition select-none"
                                         title="${firstCrs.order}. ${firstCrs.name}">
                                        <span class="flex items-center gap-1 min-w-0 truncate">
                                            <span class="text-[9px] px-1 py-0.2 rounded bg-black/25 text-white font-black shrink-0">${firstCrs.order}.</span>
                                            <span class="truncate text-[11px]">${firstCrs.name}</span>
                                            ${ca.firstHalf?.isTrainee ? '<span class="text-[8px] px-0.5 bg-amber-400 text-slate-900 rounded font-black shrink-0">🎓</span>' : ''}
                                            ${isFirstNG ? '<span class="text-[8px] px-0.5 bg-rose-300 text-rose-950 rounded font-black shrink-0">NG</span>' : ''}
                                        </span>
                                        <button type="button" onclick="clearCourseSlot('${member.id}', 'first')" class="ml-0.5 text-white/80 hover:text-white rounded px-0.5 text-xs font-black shrink-0">✕</button>
                                    </div>
                                ` : `
                                    <div class="w-full text-center text-[10px] font-bold text-slate-400 border border-dashed border-sky-300 rounded-md py-0.5 bg-sky-50/50 hover:bg-sky-100/60 transition cursor-pointer select-none">
                                        ＋ 前半ドロップ
                                    </div>
                                `}
                            </div>
                            <label class="flex items-center gap-1 px-1 py-0.5 rounded border text-[10px] font-bold cursor-pointer select-none shrink-0 ${ca.firstHalf?.isTrainee ? 'bg-amber-100 border-amber-300 text-amber-900 ring-1 ring-amber-400' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}" title="前半の教育・同乗設定">
                                <input type="checkbox" onchange="updateCourseAssignment('${member.id}', 'firstHalf.isTrainee', this.checked)" ${ca.firstHalf?.isTrainee ? 'checked' : ''} class="w-3 h-3 text-amber-600 rounded">
                                <span>🎓</span>
                            </label>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <span class="text-[9px] font-extrabold px-1 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-300 w-7 text-center shrink-0">後</span>
                            <div ondragover="handleCourseDragOver(event)"
                                 ondragleave="handleCourseDragLeave(event)"
                                 ondrop="handleCourseDrop(event, '${member.id}', 'second')"
                                 class="w-36 min-h-[30px] p-0.5 rounded-md transition flex items-center">
                                ${secondCrs ? `
                                    <div draggable="true"
                                         ondragstart="handleCourseDragStart(event, '${secondCrs.id}', '${member.id}', 'second')"
                                         class="w-full flex items-center justify-between px-1.5 py-0.5 rounded-md ${isSecondNG && !ca.secondHalf?.isTrainee ? 'bg-rose-600' : 'bg-indigo-700'} text-white font-bold text-xs shadow-2xs cursor-grab active:cursor-grabbing hover:opacity-95 transition select-none"
                                         title="${secondCrs.order}. ${secondCrs.name}">
                                        <span class="flex items-center gap-1 min-w-0 truncate">
                                            <span class="text-[9px] px-1 py-0.2 rounded bg-black/25 text-white font-black shrink-0">${secondCrs.order}.</span>
                                            <span class="truncate text-[11px]">${secondCrs.name}</span>
                                            ${ca.secondHalf?.isTrainee ? '<span class="text-[8px] px-0.5 bg-amber-400 text-slate-900 rounded font-black shrink-0">🎓</span>' : ''}
                                            ${isSecondNG ? '<span class="text-[8px] px-0.5 bg-rose-300 text-rose-950 rounded font-black shrink-0">NG</span>' : ''}
                                        </span>
                                        <button type="button" onclick="clearCourseSlot('${member.id}', 'second')" class="ml-0.5 text-white/80 hover:text-white rounded px-0.5 text-xs font-black shrink-0">✕</button>
                                    </div>
                                ` : `
                                    <div class="w-full text-center text-[10px] font-bold text-slate-400 border border-dashed border-indigo-300 rounded-md py-0.5 bg-indigo-50/50 hover:bg-indigo-100/60 transition cursor-pointer select-none">
                                        ＋ 後半ドロップ
                                    </div>
                                `}
                            </div>
                            <label class="flex items-center gap-1 px-1 py-0.5 rounded border text-[10px] font-bold cursor-pointer select-none shrink-0 ${ca.secondHalf?.isTrainee ? 'bg-amber-100 border-amber-300 text-amber-900 ring-1 ring-amber-400' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}" title="後半の教育・同乗設定">
                                <input type="checkbox" onchange="updateCourseAssignment('${member.id}', 'secondHalf.isTrainee', this.checked)" ${ca.secondHalf?.isTrainee ? 'checked' : ''} class="w-3 h-3 text-amber-600 rounded">
                                <span>🎓</span>
                            </label>
                        </div>
                    </div>
                `;
            }

            tbodyHtml += `
                <tr class="border-b border-slate-200 hover:bg-slate-50 transition">
                    <td class="p-3 font-bold text-slate-800 sticky-col-left shadow-2xs border-r border-slate-200">
                        <div class="flex flex-col cursor-pointer" onclick="openMemberEditModal('${member.id}')" title="クリックして属性・NGコースを編集">
                            <span class="truncate text-xs sm:text-sm hover:text-indigo-600">${member.name}</span>
                            <div class="flex items-center gap-1 mt-0.5 overflow-hidden">
                                ${memberBadges || '<span class="text-[9px] text-slate-300 font-normal">属性なし</span>'}
                            </div>
                        </div>
                    </td>
                    <td class="p-1 border-r border-slate-200 align-middle bg-slate-50/30">${prevCell3}</td>
                    <td class="p-1 border-r border-slate-200 align-middle bg-slate-50/30">${prevCell2}</td>
                    <td class="p-1 border-r-2 border-indigo-300 align-middle bg-slate-50/30">${prevCell1}</td>

                    <td class="p-2.5 text-center bg-indigo-50/40 border-r border-indigo-200 align-middle">
                        <span class="px-2.5 py-1 rounded-md text-xs font-black text-white shadow-2xs inline-block" style="background-color: ${shiftBadgeBg}" title="${shiftBadgeTitle}">
                            ${shiftLabel}
                        </span>
                    </td>
                    <td class="p-2.5 text-center bg-indigo-50/40 border-r border-indigo-200 align-middle">
                        <div class="inline-flex rounded-lg border border-slate-300 p-0.5 bg-white text-[11px] font-bold shadow-2xs">
                            <button onclick="updateCourseAssignment('${member.id}', 'isSplit', false)" class="px-2 py-0.5 rounded-md transition ${!ca.isSplit ? 'bg-indigo-600 text-white shadow-2xs font-black' : 'text-slate-500 hover:text-slate-800'}">
                                終日
                            </button>
                            <button onclick="updateCourseAssignment('${member.id}', 'isSplit', true)" class="px-2 py-0.5 rounded-md transition ${ca.isSplit ? 'bg-indigo-600 text-white shadow-2xs font-black' : 'text-slate-500 hover:text-slate-800'}">
                                分割
                            </button>
                        </div>
                    </td>
                    <td class="p-2.5 bg-indigo-50/40 border-r-2 border-indigo-300 align-middle">
                        ${assignmentControls}
                    </td>

                    <td class="p-1 border-r border-slate-200 align-middle bg-slate-50/30">${nextCell1}</td>
                    <td class="p-1 border-r border-slate-200 align-middle bg-slate-50/30">${nextCell2}</td>
                    <td class="p-1 border-r border-slate-200 align-middle bg-slate-50/30">${nextCell3}</td>

                    <td class="p-2 text-center align-middle">
                        <button onclick="clearCourseAssignment('${member.id}')" class="px-2 py-1 bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 rounded text-xs font-bold transition" title="この日の割当をクリア">
                            クリア
                        </button>
                    </td>
                </tr>
            `;
        }
    });

    tableBody.innerHTML = tbodyHtml;
}

function updateCourseAssignment(memberId, fieldPath, value) {
    const key = `${state.selectedAssignmentDate}_${memberId}`;
    const current = getCourseAssignment(memberId, state.selectedAssignmentDate);

    if (fieldPath === 'isSplit') {
        current.isSplit = value;
    } else if (fieldPath === 'courseId') {
        current.courseId = value;
    } else if (fieldPath === 'isTrainee') {
        current.isTrainee = value;
    } else if (fieldPath === 'firstHalf.courseId') {
        current.firstHalf.courseId = value;
    } else if (fieldPath === 'firstHalf.isTrainee') {
        current.firstHalf.isTrainee = value;
    } else if (fieldPath === 'secondHalf.courseId') {
        current.secondHalf.courseId = value;
    } else if (fieldPath === 'secondHalf.isTrainee') {
        current.secondHalf.isTrainee = value;
    }

    state.courseAssignments[key] = current;
    saveData();
    renderAll();
    syncSingleCourseAssignmentToCloud(key, current);
}

function clearCourseAssignment(memberId) {
    const key = `${state.selectedAssignmentDate}_${memberId}`;
    delete state.courseAssignments[key];
    saveData();
    renderAll();
    syncSingleCourseAssignmentToCloud(key, null);
}
