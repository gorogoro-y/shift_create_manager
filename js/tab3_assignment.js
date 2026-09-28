// js/tab3_assignment.js
// 【タブ3】日別コース配車（7日間連動タイムライン・コース選択グループ判定）

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
                 class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-500 border border-slate-300 shadow-2xs cursor-grab active:cursor-grabbing hover:bg-slate-200 hover:border-slate-400 transition select-none"
                 title="${crs.order}. ${crs.name} (担当: ${staffText}) - ドラッグして他スタッフへ移動・交代可能">
                <span class="text-[10px] text-slate-400 font-black">${crs.order}.</span>
                <span class="line-through decoration-slate-400">${crs.name}</span>
                <span class="text-[10px] font-black text-indigo-700 bg-white px-1.5 py-0.2 rounded border border-indigo-200 shadow-2xs">${staffText}</span>
            </div>
        `;
    } else {
        let badgeColorClass = "bg-white text-slate-800 border-amber-300 hover:border-amber-500 hover:bg-amber-50/50";
        let orderColorClass = "text-amber-600";
        if (isGroup) {
            badgeColorClass = "bg-white text-violet-800 border-violet-300 hover:border-violet-500 hover:bg-violet-50";
            orderColorClass = "text-violet-600";
        } else if (crs.isRequired === false) {
            badgeColorClass = "bg-white text-slate-700 border-slate-300 hover:border-slate-500 hover:bg-slate-50";
            orderColorClass = "text-slate-400";
        }
        return `
            <div draggable="true"
                 ondragstart="handleCourseDragStart(event, '${crs.id}')"
                 class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border shadow-2xs cursor-grab active:cursor-grabbing hover:shadow-xs transition select-none ${badgeColorClass}"
                 title="${crs.order}. ${crs.name} - ドラッグしてスタッフ枠へドロップ">
                <span class="text-[10px] font-black ${orderColorClass}">${crs.order}.</span>
                <span>${crs.name}</span>
                ${crs.isRequired === false ? '<span class="text-[9px] px-1 bg-slate-100 text-slate-500 rounded font-normal">任意</span>' : ''}
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
        
        el.innerHTML = `
            <div class="flex flex-col items-center cursor-pointer hover:bg-slate-100 py-0.5 rounded transition" onclick="onAssignmentDateChange('${dayInfo.dateStr}')" title="${dayInfo.dateStr} へ移動">
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

    const assignedMap = getAssignedCoursesMapForDate(state.selectedAssignmentDate);

    // 未割り当てコースの正確な洗い出し
    let activeUsedCourses = new Set();
    state.members.forEach(m => {
        const ca = getCourseAssignment(m.id, state.selectedAssignmentDate);
        if (!ca.isSplit && ca.courseId) activeUsedCourses.add(ca.courseId);
        if (ca.isSplit) {
            if (ca.firstHalf?.courseId) activeUsedCourses.add(ca.firstHalf.courseId);
            if (ca.secondHalf?.courseId) activeUsedCourses.add(ca.secondHalf.courseId);
        }
    });

    // コース選択グループの集計判定
    const groups = state.courseGroups || [];
    const allGroupCourseIds = new Set();
    groups.forEach(g => {
        (g.courseIds || []).forEach(cid => allGroupCourseIds.add(cid));
    });

    const groupStatusList = groups.map(g => {
        const totalInGroup = (g.courseIds || []).length;
        const assignedInGroup = (g.courseIds || []).filter(cid => activeUsedCourses.has(cid));
        const unassignedInGroup = (g.courseIds || []).filter(cid => !activeUsedCourses.has(cid));
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
        !activeUsedCourses.has(c.id)
    );

    // 任意コース（グループに属さない任意コース）
    const unassignedOptionalList = state.courses.filter(c => 
        c.isRequired === false && 
        !allGroupCourseIds.has(c.id) && 
        !activeUsedCourses.has(c.id)
    );

    // 不足枠数の合算（単独必須コースの未割当数 + 各グループの不足枠数）
    const groupShortageTotal = groupStatusList.reduce((sum, g) => sum + g.shortage, 0);
    const unassignedReqCount = unassignedSingleRequiredList.length + groupShortageTotal;

    let workingMembersCount = 0;
    state.members.forEach(m => {
        const cell = getCellData(`${m.id}_${state.selectedAssignmentDate}`);
        if (!isHolidayValue(cell.shiftId)) workingMembersCount++;
    });

    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                <span class="text-slate-500">出勤予定:</span>
                <span class="text-indigo-700 font-black">${workingMembersCount}名</span>
            </div>
            <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                <span class="text-slate-500">必須未割当:</span>
                <span class="${unassignedReqCount > 0 ? 'text-amber-600 font-black' : 'text-emerald-600 font-black'}">${unassignedReqCount}枠</span>
            </div>
            ${groupStatusList.length > 0 ? `
                <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-violet-700">
                    <span class="text-slate-500">選択枠:</span>
                    <span class="font-bold">${groupStatusList.filter(g => g.isSatisfied).length}/${groupStatusList.length}組充足</span>
                </div>
            ` : ''}
            ${unassignedOptionalList.length > 0 ? `
                <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-slate-500">
                    <span>任意空き:</span>
                    <span class="text-slate-700 font-bold">${unassignedOptionalList.length}</span>
                </div>
            ` : ''}
        `;
    }

    if (unassignedContainer) {
        let htmlList = `<div class="space-y-2.5">`;

        // 全充足時の完了バナー（上部に表示）
        if (unassignedReqCount === 0) {
            htmlList += `
                <div class="flex items-center justify-between text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-2 rounded-xl shadow-2xs">
                    <div class="flex items-center gap-2">
                        <span class="text-base">✅</span>
                        <span>すべての必須運行コースおよびグループ選択枠が割り当て済みです！</span>
                    </div>
                    <span class="text-[11px] text-emerald-600 font-normal hidden sm:inline">※グレーのバッジを掴んで別のスタッフ枠へドロップすると、いつでも担当者を移動・交代できます</span>
                </div>
            `;
        }

        // 1. コース選択グループ枠の表示
        if (groupStatusList.length > 0) {
            htmlList += `
                <div class="space-y-1.5">
                    <div class="flex items-center justify-between text-xs font-bold text-violet-900">
                        <span class="flex items-center gap-1.5">
                            <span>🔀</span>
                            <span>コース選択グループ枠 (${groupStatusList.length}グループ):</span>
                        </span>
                        <div class="flex items-center gap-2">
                            <span class="text-[11px] text-slate-400 font-normal hidden sm:inline">※バッジをスタッフ枠へドラッグ＆ドロップして配車できます</span>
                            <button type="button" onclick="openCourseGroupModal()" class="px-2 py-0.5 bg-violet-100 hover:bg-violet-200 text-violet-800 rounded font-bold transition flex items-center gap-1 text-[11px]">
                                <span>＋ グループ追加</span>
                            </button>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        ${groupStatusList.map(g => {
                            const groupCourses = g.allCourses;
                            const isSat = g.isSatisfied;
                            return `
                                <div class="p-2.5 rounded-xl border text-xs space-y-1.5 ${isSat ? 'bg-emerald-50/50 border-emerald-200' : 'bg-violet-50/50 border-violet-200'}">
                                    <div class="flex items-center justify-between font-bold">
                                        <span class="flex items-center gap-1 ${isSat ? 'text-emerald-800' : 'text-violet-900'}">
                                            <span>${isSat ? '✅' : '⚠️'}</span>
                                            <span>${g.name}</span>
                                        </span>
                                        <div class="flex items-center gap-1.5">
                                            <span class="text-[10px] px-1.5 py-0.5 rounded font-black ${isSat ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-100 text-rose-700 border border-rose-300'}">
                                                ${isSat ? `充足済 (${g.assignedCourses.length}/${g.requiredCount}枠)` : `あと ${g.shortage}枠 不足 (${g.assignedCourses.length}/${g.requiredCount})`}
                                            </span>
                                            <button type="button" onclick="openCourseGroupModal('${g.id}')" class="text-slate-400 hover:text-violet-700 text-xs font-bold px-1 py-0.5 rounded hover:bg-black/5" title="グループ設定を編集">✏️</button>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-1.5 flex-wrap pt-0.5">
                                        <span class="text-[10px] ${isSat ? 'text-emerald-700' : 'text-violet-700'} font-bold">候補:</span>
                                        ${groupCourses.map(crs => renderDraggableCourseChip(crs, assignedMap, true)).join('')}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        } else {
            htmlList += `
                <div class="space-y-1.5">
                    <div class="flex items-center justify-between text-xs font-bold text-violet-900">
                        <span class="flex items-center gap-1.5">
                            <span>🔀</span>
                            <span>コース選択グループ枠:</span>
                        </span>
                        <button type="button" onclick="openCourseGroupModal()" class="px-2 py-0.5 bg-violet-100 hover:bg-violet-200 text-violet-800 rounded font-bold transition flex items-center gap-1 text-[11px]">
                            <span>＋ グループを追加</span>
                        </button>
                    </div>
                    <div class="p-3 border-2 border-dashed border-violet-200 bg-violet-50/30 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-violet-700">
                        <span class="font-medium">「01便/02便のどちらか1便運行」など、複数コースからいずれかを選択運行するグループ枠が未登録です。</span>
                        <button type="button" onclick="openCourseGroupModal()" class="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-bold shadow-xs transition shrink-0">
                            ＋ コース選択グループを追加
                        </button>
                    </div>
                </div>
            `;
        }

        // 2. 単独必須コース一覧（全件表示：未割当は明るく、割当済はグレー＋担当者名）
        const allSingleRequiredList = state.courses.filter(c => c.isRequired !== false && !allGroupCourseIds.has(c.id));
        if (allSingleRequiredList.length > 0) {
            htmlList += `
                <div class="space-y-1">
                    <div class="flex items-center justify-between text-xs font-bold text-amber-900">
                        <span class="flex items-center gap-1.5">
                            <span>📋</span>
                            <span>必須・通常コース全件 (${allSingleRequiredList.length}コース / <span class="${unassignedSingleRequiredList.length > 0 ? 'text-rose-600 font-black' : 'text-emerald-600 font-black'}">未配車: ${unassignedSingleRequiredList.length}件</span>):</span>
                        </span>
                        <span class="text-[11px] text-slate-400 font-normal">※ドラッグしてスタッフ枠へドロップ / グレーは割当済</span>
                    </div>
                    <div class="flex flex-wrap gap-1.5 p-2 bg-slate-50/80 border border-slate-200 rounded-xl">
                        ${allSingleRequiredList.map(crs => renderDraggableCourseChip(crs, assignedMap, false)).join('')}
                    </div>
                </div>
            `;
        }

        // 3. 任意コース一覧（全件表示：未割当は明るく、割当済はグレー＋担当者名）
        const allOptionalList = state.courses.filter(c => c.isRequired === false && !allGroupCourseIds.has(c.id));
        if (allOptionalList.length > 0) {
            htmlList += `
                <div class="space-y-1 pt-0.5">
                    <div class="text-[11px] font-bold text-slate-500 flex items-center justify-between">
                        <span class="flex items-center gap-1.5">
                            <span>📦</span>
                            <span>任意・臨時便 (${allOptionalList.length}コース / 未配車: ${unassignedOptionalList.length}件):</span>
                        </span>
                    </div>
                    <div class="flex flex-wrap gap-1.5 p-2 bg-slate-50/50 border border-slate-200 rounded-xl">
                        ${allOptionalList.map(crs => renderDraggableCourseChip(crs, assignedMap, false)).join('')}
                    </div>
                </div>
            `;
        }

        htmlList += `</div>`;
        unassignedContainer.innerHTML = htmlList;
    }

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
                    <div class="flex items-center gap-2">
                        <div ondragover="handleCourseDragOver(event)"
                             ondragleave="handleCourseDragLeave(event)"
                             ondrop="handleCourseDrop(event, '${member.id}', 'full')"
                             class="w-64 min-h-[38px] p-0.5 rounded-xl transition flex items-center">
                            ${currentCrs ? `
                                <div draggable="true"
                                     ondragstart="handleCourseDragStart(event, '${currentCrs.id}', '${member.id}', 'full')"
                                     class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg ${isNG && !ca.isTrainee ? 'bg-rose-600' : 'bg-indigo-600'} text-white font-bold text-xs shadow-2xs cursor-grab active:cursor-grabbing hover:opacity-95 transition select-none"
                                     title="${currentCrs.order}. ${currentCrs.name} - ドラッグして他スタッフへ移動・交換可能">
                                    <span class="flex items-center gap-1.5 truncate">
                                        <span class="text-[10px] px-1.5 py-0.2 rounded bg-black/25 text-white font-black">${currentCrs.order}.</span>
                                        <span class="truncate">${currentCrs.name}</span>
                                        ${ca.isTrainee ? '<span class="text-[9px] px-1 bg-amber-400 text-slate-900 rounded font-black shrink-0">🎓同乗</span>' : ''}
                                        ${isNG ? '<span class="text-[9px] px-1 bg-rose-300 text-rose-950 rounded font-black shrink-0">⚠️NG</span>' : ''}
                                    </span>
                                    <button type="button" onclick="clearCourseSlot('${member.id}', 'full')" class="ml-1 text-white/80 hover:text-white hover:bg-black/20 rounded px-1 transition text-xs font-black" title="コース割当を解除">✕</button>
                                </div>
                            ` : `
                                <div class="w-full text-center text-xs font-bold text-slate-400 border-2 border-dashed border-slate-300 rounded-lg py-1.5 bg-slate-50/70 hover:bg-indigo-50/60 hover:border-indigo-400 transition cursor-pointer select-none">
                                    ＋ ここにコースをドロップ
                                </div>
                            `}
                        </div>
                        <label class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition select-none shrink-0 ${ca.isTrainee ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-2xs ring-1 ring-amber-400' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}">
                            <input type="checkbox" onchange="updateCourseAssignment('${member.id}', 'isTrainee', this.checked)" ${ca.isTrainee ? 'checked' : ''} class="w-3.5 h-3.5 text-amber-600 rounded">
                            <span>🎓 教育・同乗</span>
                        </label>
                    </div>
                `;
            } else {
                const firstCrs = ca.firstHalf?.courseId ? state.courses.find(c => c.id === ca.firstHalf.courseId) : null;
                const secondCrs = ca.secondHalf?.courseId ? state.courses.find(c => c.id === ca.secondHalf.courseId) : null;
                const isFirstNG = firstCrs && ngCourses.includes(firstCrs.id);
                const isSecondNG = secondCrs && ngCourses.includes(secondCrs.id);

                assignmentControls = `
                    <div class="space-y-1.5 py-0.5">
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-300 w-8 text-center shrink-0">前半</span>
                            <div ondragover="handleCourseDragOver(event)"
                                 ondragleave="handleCourseDragLeave(event)"
                                 ondrop="handleCourseDrop(event, '${member.id}', 'first')"
                                 class="w-56 min-h-[34px] p-0.5 rounded-xl transition flex items-center">
                                ${firstCrs ? `
                                    <div draggable="true"
                                         ondragstart="handleCourseDragStart(event, '${firstCrs.id}', '${member.id}', 'first')"
                                         class="w-full flex items-center justify-between px-2 py-1 rounded-lg ${isFirstNG && !ca.firstHalf?.isTrainee ? 'bg-rose-600' : 'bg-sky-700'} text-white font-bold text-xs shadow-2xs cursor-grab active:cursor-grabbing hover:opacity-95 transition select-none"
                                         title="${firstCrs.order}. ${firstCrs.name} - ドラッグして他スタッフへ移動・交換可能">
                                        <span class="flex items-center gap-1.5 truncate">
                                            <span class="text-[10px] px-1 py-0.2 rounded bg-black/25 text-white font-black">${firstCrs.order}.</span>
                                            <span class="truncate">${firstCrs.name}</span>
                                            ${ca.firstHalf?.isTrainee ? '<span class="text-[9px] px-1 bg-amber-400 text-slate-900 rounded font-black shrink-0">🎓同乗</span>' : ''}
                                            ${isFirstNG ? '<span class="text-[9px] px-1 bg-rose-300 text-rose-950 rounded font-black shrink-0">⚠️NG</span>' : ''}
                                        </span>
                                        <button type="button" onclick="clearCourseSlot('${member.id}', 'first')" class="ml-1 text-white/80 hover:text-white hover:bg-black/20 rounded px-1 transition text-xs font-black" title="前半の割当を解除">✕</button>
                                    </div>
                                ` : `
                                    <div class="w-full text-center text-[11px] font-bold text-slate-400 border-2 border-dashed border-sky-300 rounded-lg py-1 bg-sky-50/50 hover:bg-sky-100/60 hover:border-sky-400 transition cursor-pointer select-none">
                                        ＋ 前半へドロップ
                                    </div>
                                `}
                            </div>
                            <label class="flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-bold cursor-pointer select-none shrink-0 ${ca.firstHalf?.isTrainee ? 'bg-amber-100 border-amber-300 text-amber-900 ring-1 ring-amber-400' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}">
                                <input type="checkbox" onchange="updateCourseAssignment('${member.id}', 'firstHalf.isTrainee', this.checked)" ${ca.firstHalf?.isTrainee ? 'checked' : ''} class="w-3.5 h-3.5 text-amber-600 rounded">
                                <span>🎓教育</span>
                            </label>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-300 w-8 text-center shrink-0">後半</span>
                            <div ondragover="handleCourseDragOver(event)"
                                 ondragleave="handleCourseDragLeave(event)"
                                 ondrop="handleCourseDrop(event, '${member.id}', 'second')"
                                 class="w-56 min-h-[34px] p-0.5 rounded-xl transition flex items-center">
                                ${secondCrs ? `
                                    <div draggable="true"
                                         ondragstart="handleCourseDragStart(event, '${secondCrs.id}', '${member.id}', 'second')"
                                         class="w-full flex items-center justify-between px-2 py-1 rounded-lg ${isSecondNG && !ca.secondHalf?.isTrainee ? 'bg-rose-600' : 'bg-indigo-700'} text-white font-bold text-xs shadow-2xs cursor-grab active:cursor-grabbing hover:opacity-95 transition select-none"
                                         title="${secondCrs.order}. ${secondCrs.name} - ドラッグして他スタッフへ移動・交換可能">
                                        <span class="flex items-center gap-1.5 truncate">
                                            <span class="text-[10px] px-1 py-0.2 rounded bg-black/25 text-white font-black">${secondCrs.order}.</span>
                                            <span class="truncate">${secondCrs.name}</span>
                                            ${ca.secondHalf?.isTrainee ? '<span class="text-[9px] px-1 bg-amber-400 text-slate-900 rounded font-black shrink-0">🎓同乗</span>' : ''}
                                            ${isSecondNG ? '<span class="text-[9px] px-1 bg-rose-300 text-rose-950 rounded font-black shrink-0">⚠️NG</span>' : ''}
                                        </span>
                                        <button type="button" onclick="clearCourseSlot('${member.id}', 'second')" class="ml-1 text-white/80 hover:text-white hover:bg-black/20 rounded px-1 transition text-xs font-black" title="後半の割当を解除">✕</button>
                                    </div>
                                ` : `
                                    <div class="w-full text-center text-[11px] font-bold text-slate-400 border-2 border-dashed border-indigo-300 rounded-lg py-1 bg-indigo-50/50 hover:bg-indigo-100/60 hover:border-indigo-400 transition cursor-pointer select-none">
                                        ＋ 後半へドロップ
                                    </div>
                                `}
                            </div>
                            <label class="flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-bold cursor-pointer select-none shrink-0 ${ca.secondHalf?.isTrainee ? 'bg-amber-100 border-amber-300 text-amber-900 ring-1 ring-amber-400' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}">
                                <input type="checkbox" onchange="updateCourseAssignment('${member.id}', 'secondHalf.isTrainee', this.checked)" ${ca.secondHalf?.isTrainee ? 'checked' : ''} class="w-3.5 h-3.5 text-amber-600 rounded">
                                <span>🎓教育</span>
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
