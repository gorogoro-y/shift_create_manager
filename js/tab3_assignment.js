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


function onAssignmentDateChange(newDateStr) {
    state.selectedAssignmentDate = newDateStr;
    const dt = new Date(newDateStr);
    if (!isNaN(dt.getTime())) {
        state.currentYear = dt.getFullYear();
        state.currentMonth = dt.getMonth() + 1;
        document.getElementById('current-month-display').innerText = `${state.currentYear}年 ${state.currentMonth}月`;
    }
    renderAll();
}

function changeAssignmentDay(delta) {
    const dt = new Date(state.selectedAssignmentDate);
    if (isNaN(dt.getTime())) return;
    dt.setDate(dt.getDate() + delta);

    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    const newDateStr = `${y}-${m}-${d}`;

    state.selectedAssignmentDate = newDateStr;
    state.currentYear = dt.getFullYear();
    state.currentMonth = dt.getMonth() + 1;
    document.getElementById('current-month-display').innerText = `${state.currentYear}年 ${state.currentMonth}月`;

    renderAll();
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

function getTimelineDayInfo(baseDateStr, offset) {
    const dt = new Date(baseDateStr);
    dt.setDate(dt.getDate() + offset);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    const dayOfWeekNum = dt.getDay();
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    return {
        dateStr: `${y}-${m}-${d}`,
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

    if (['休', '指', '有', '待', '健診', '健'].includes(shiftId)) {
        let badgeClass = "bg-rose-100 text-rose-800 border-rose-200";
        if (shiftId === '指') badgeClass = "bg-amber-100 text-amber-800 border-amber-200";
        if (shiftId === '有') badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-200";
        if (shiftId === '待') badgeClass = "bg-violet-100 text-violet-800 border-violet-200";
        if (shiftId === '健診' || shiftId === '健') badgeClass = "bg-teal-100 text-teal-800 border-teal-200";
        return `
            <div class="w-full py-1 text-center">
                <span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-black border ${badgeClass}">
                    ${shiftId}
                </span>
            </div>
        `;
    }

    const shift = state.shiftTypes.find(s => s.id === shiftId);
    const color = state.colorTypes.find(c => c.id === cell.colorId);

    if (!shift && !color && !courseText) {
        return `<div class="text-center text-slate-300 text-[11px] py-1">ー</div>`;
    }

    let bgStyle = '';
    let label = shift ? shift.shortName : '';
    if (color) {
        bgStyle = `background-color: ${color.color}`;
    } else if (shift) {
        bgStyle = `background-color: ${shift.color}`;
    }

    return `
        <div class="flex flex-col items-center justify-center gap-0.5 py-0.5">
            ${label ? `
                <span class="inline-block px-1 py-0.2 rounded text-[9px] font-black text-white shadow-2xs leading-tight" style="${bgStyle}">
                    ${label}
                </span>
            ` : ''}
            ${courseText ? `
                <span class="text-[8px] font-black bg-slate-800 text-white px-1 py-0.2 rounded leading-none" title="割当コース: ${courseText}">
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
    const dateObj = new Date(state.selectedAssignmentDate);
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
        if (!['休', '指', '有', '待', '健診', '健'].includes(cell.shiftId)) workingMembersCount++;
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
            ${unassignedOptionalList.length > 0 ? `
                <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-slate-500">
                    <span>任意空き:</span>
                    <span class="text-slate-700 font-bold">${unassignedOptionalList.length}</span>
                </div>
            ` : ''}
        `;
    }

    if (unassignedContainer) {
        if (unassignedReqCount === 0 && unassignedOptionalList.length === 0) {
            unassignedContainer.innerHTML = `
                <div class="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                    <span>✅</span>
                    <span>すべての運行コースおよび選択グループ枠が過不足なく割り当て済みです！</span>
                </div>
            `;
        } else {
            let htmlList = `<div class="space-y-2.5">`;

            // 1. コース選択グループ枠の表示
            if (groupStatusList.length > 0) {
                htmlList += `
                    <div class="space-y-1.5">
                        <div class="flex items-center justify-between text-xs font-bold text-violet-900">
                            <span class="flex items-center gap-1">
                                <span>🔀</span>
                                <span>コース選択グループ枠 (${groupStatusList.length}グループ):</span>
                            </span>
                            <span class="text-[11px] text-slate-400 font-normal">※指定された必要枠数が満たされると充足します</span>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            ${groupStatusList.map(g => {
                                if (g.isSatisfied) {
                                    return `
                                        <div class="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
                                            <div class="flex items-center justify-between font-bold text-emerald-800">
                                                <span class="flex items-center gap-1"><span>✅</span> <span>${g.name}</span></span>
                                                <span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900 font-black">充足済 (${g.assignedCourses.length}/${g.requiredCount}枠)</span>
                                            </div>
                                            <div class="mt-1 flex flex-wrap gap-1 text-[11px] text-emerald-700">
                                                <span>運行: ${g.assignedCourses.map(c => c.name).join(', ')}</span>
                                            </div>
                                        </div>
                                    `;
                                } else {
                                    return `
                                        <div class="p-2 rounded-lg bg-violet-50 border border-violet-200 text-xs space-y-1">
                                            <div class="flex items-center justify-between font-bold text-violet-900">
                                                <span class="flex items-center gap-1"><span>⚠️</span> <span>${g.name}</span></span>
                                                <span class="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 border border-rose-300 font-black">あと ${g.shortage}枠 不足 (${g.assignedCourses.length}/${g.requiredCount})</span>
                                            </div>
                                            <div class="flex items-center gap-1 flex-wrap pt-0.5">
                                                <span class="text-[10px] text-violet-600 font-bold">候補:</span>
                                                ${g.unassignedCourses.map(crs => `
                                                    <span class="px-1.5 py-0.2 rounded text-[11px] font-bold bg-white text-violet-800 border border-violet-300 shadow-2xs">
                                                        ${crs.order}. ${crs.name}
                                                    </span>
                                                `).join('')}
                                            </div>
                                        </div>
                                    `;
                                }
                            }).join('')}
                        </div>
                    </div>
                `;
            }

            // 2. 単独必須コースの未割当表示
            if (unassignedSingleRequiredList.length > 0) {
                htmlList += `
                    <div class="space-y-1">
                        <div class="flex items-center justify-between text-xs font-bold text-amber-800">
                            <span class="flex items-center gap-1">
                                <span>⚠️</span>
                                <span>必須・未割り当て通常コース (<span class="text-rose-600 font-black">${unassignedSingleRequiredList.length}件</span>):</span>
                            </span>
                            <span class="text-[11px] text-slate-400 font-normal">※運行が必要な通常便です</span>
                        </div>
                        <div class="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-amber-50/50 border border-amber-200 rounded-lg">
                            ${unassignedSingleRequiredList.map(crs => `
                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-white text-slate-700 border border-amber-300 shadow-2xs">
                                    <span class="text-[10px] text-amber-600 font-black">${crs.order}.</span>
                                    <span>${crs.name}</span>
                                </span>
                            `).join('')}
                        </div>
                    </div>
                `;
            } else if (unassignedReqCount === 0) {
                htmlList += `
                    <div class="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                        <span>✅</span>
                        <span>必須コースはすべて割り当て完了しています。</span>
                    </div>
                `;
            }

            // 3. 任意コースの空き表示
            if (unassignedOptionalList.length > 0) {
                htmlList += `
                    <div class="space-y-1 pt-1">
                        <div class="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                            <span>📦</span>
                            <span>任意・臨時便（未配車: ${unassignedOptionalList.length}件）:</span>
                        </div>
                        <div class="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                            ${unassignedOptionalList.map(crs => `
                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-white text-slate-600 border border-slate-300">
                                    <span class="text-[10px] text-slate-400">${crs.order}.</span>
                                    <span>${crs.name}</span>
                                    <span class="text-[9px] px-1 bg-slate-100 text-slate-500 rounded">任意</span>
                                </span>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
            htmlList += `</div>`;
            unassignedContainer.innerHTML = htmlList;
        }
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
        const isHoliday = ['休', '指', '有', '待', '健診', '健'].includes(cell.shiftId);
        const shiftObj = state.shiftTypes.find(s => s.id === cell.shiftId);
        const shiftLabel = shiftObj ? shiftObj.name : (cell.shiftId || '未定');
        const shiftColor = shiftObj ? shiftObj.color : '#64748b';
        const memberBadges = getMemberBadgesHTML(member);
        const ca = getCourseAssignment(member.id, state.selectedAssignmentDate);

        const prevCell3 = renderTimelineMiniCell(member.id, timelineDays[-3]);
        const prevCell2 = renderTimelineMiniCell(member.id, timelineDays[-2]);
        const prevCell1 = renderTimelineMiniCell(member.id, timelineDays[-1]);
        const nextCell1 = renderTimelineMiniCell(member.id, timelineDays[1]);
        const nextCell2 = renderTimelineMiniCell(member.id, timelineDays[2]);
        const nextCell3 = renderTimelineMiniCell(member.id, timelineDays[3]);

        if (isHoliday) {
            let holidayBadgeLabel = `🔒 休み (${cell.shiftId})`;
            let holidayBadgeClass = 'bg-rose-100 text-rose-800 border-rose-200';
            if (cell.shiftId === '待') {
                holidayBadgeLabel = '🔒 待機 (待)';
                holidayBadgeClass = 'bg-violet-100 text-violet-800 border-violet-200';
            } else if (cell.shiftId === '健診' || cell.shiftId === '健') {
                holidayBadgeLabel = '🔒 健診';
                holidayBadgeClass = 'bg-teal-100 text-teal-800 border-teal-200';
            }
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

                    <td class="p-2.5 text-center bg-rose-50/50 border-r border-indigo-200">
                        <span class="px-2 py-1 ${holidayBadgeClass} rounded font-black text-xs border">
                            ${holidayBadgeLabel}
                        </span>
                    </td>
                    <td class="p-2.5 text-center text-xs text-slate-400 bg-rose-50/30 border-r border-indigo-200">ー</td>
                    <td class="p-2.5 text-xs text-slate-400 italic bg-rose-50/30 border-r-2 border-indigo-300">公休・健診・待機設定のためコース割当対象外です</td>

                    <td class="p-1 border-r border-slate-200 align-middle bg-white/40">${nextCell1}</td>
                    <td class="p-1 border-r border-slate-200 align-middle bg-white/40">${nextCell2}</td>
                    <td class="p-1 border-r border-slate-200 align-middle bg-white/40">${nextCell3}</td>

                    <td class="p-2 text-center text-xs text-slate-400">ー</td>
                </tr>
            `;
        } else {
            const ngCourses = member.ngCourses || [];

            const renderCourseOptions = (selectedCourseId, slotType, isTrainee) => {
                let optHtml = `<option value="">-- コースを選択 --</option>`;
                state.courses.forEach(crs => {
                    const isSelected = crs.id === selectedCourseId;
                    const isNG = ngCourses.includes(crs.id);
                    const isOptional = crs.isRequired === false;

                    let conflictReason = '';
                    const assigned = assignedMap[crs.id] || { full: [], first: [], second: [] };

                    if (slotType === 'full') {
                        const conflictFull = assigned.full.find(a => a.memberId !== member.id && !a.isTrainee);
                        const conflictFirst = assigned.first.find(a => a.memberId !== member.id && !a.isTrainee);
                        const conflictSecond = assigned.second.find(a => a.memberId !== member.id && !a.isTrainee);
                        if (conflictFull) conflictReason = `${conflictFull.memberName}割当済`;
                        else if (conflictFirst) conflictReason = `${conflictFirst.memberName}(前)割当済`;
                        else if (conflictSecond) conflictReason = `${conflictSecond.memberName}(後)割当済`;
                    } else if (slotType === 'first') {
                        const conflictFull = assigned.full.find(a => a.memberId !== member.id && !a.isTrainee);
                        const conflictFirst = assigned.first.find(a => a.memberId !== member.id && !a.isTrainee);
                        if (conflictFull) conflictReason = `${conflictFull.memberName}(終)割当済`;
                        else if (conflictFirst) conflictReason = `${conflictFirst.memberName}割当済`;
                    } else if (slotType === 'second') {
                        const conflictFull = assigned.full.find(a => a.memberId !== member.id && !a.isTrainee);
                        const conflictSecond = assigned.second.find(a => a.memberId !== member.id && !a.isTrainee);
                        if (conflictFull) conflictReason = `${conflictFull.memberName}(終)割当済`;
                        else if (conflictSecond) conflictReason = `${conflictSecond.memberName}割当済`;
                    }

                    let disabledAttr = '';
                    let labelSuffix = '';

                    if (isOptional) {
                        labelSuffix += ' [任意]';
                    }

                    if (isNG) {
                        if (isTrainee) {
                            labelSuffix += ' ⚠️NG(教育許可)';
                        } else {
                            disabledAttr = 'disabled';
                            labelSuffix += ' ⚠️担当不可NG';
                        }
                    } else if (conflictReason) {
                        if (isTrainee) {
                            labelSuffix += ` 🎓(${conflictReason})`;
                        } else {
                            disabledAttr = 'disabled';
                            labelSuffix += ` 🔒(${conflictReason})`;
                        }
                    }

                    optHtml += `<option value="${crs.id}" ${isSelected ? 'selected' : ''} ${disabledAttr}>${crs.order}. ${crs.name}${labelSuffix}</option>`;
                });
                return optHtml;
            };

            let assignmentControls = '';
            if (!ca.isSplit) {
                assignmentControls = `
                    <div class="flex items-center gap-2">
                        <select onchange="updateCourseAssignment('${member.id}', 'courseId', this.value)" class="w-56 p-1.5 border border-slate-300 rounded-lg text-xs font-bold bg-white text-slate-800 outline-none focus:ring-2 focus:ring-sky-500 shrink-0">
                            ${renderCourseOptions(ca.courseId, 'full', ca.isTrainee)}
                        </select>
                        <label class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition select-none shrink-0 ${ca.isTrainee ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-2xs ring-1 ring-amber-400' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}">
                            <input type="checkbox" onchange="updateCourseAssignment('${member.id}', 'isTrainee', this.checked)" ${ca.isTrainee ? 'checked' : ''} class="w-3.5 h-3.5 text-amber-600 rounded">
                            <span>🎓 教育・同乗</span>
                        </label>
                    </div>
                `;
            } else {
                assignmentControls = `
                    <div class="space-y-1.5 py-0.5">
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-300 w-8 text-center shrink-0">前半</span>
                            <select onchange="updateCourseAssignment('${member.id}', 'firstHalf.courseId', this.value)" class="w-48 p-1 border border-slate-300 rounded-lg text-xs font-bold bg-white text-slate-800 outline-none focus:ring-2 focus:ring-sky-500 shrink-0">
                                ${renderCourseOptions(ca.firstHalf?.courseId, 'first', ca.firstHalf?.isTrainee)}
                            </select>
                            <label class="flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-bold cursor-pointer select-none shrink-0 ${ca.firstHalf?.isTrainee ? 'bg-amber-100 border-amber-300 text-amber-900 ring-1 ring-amber-400' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}">
                                <input type="checkbox" onchange="updateCourseAssignment('${member.id}', 'firstHalf.isTrainee', this.checked)" ${ca.firstHalf?.isTrainee ? 'checked' : ''} class="w-3.5 h-3.5 text-amber-600 rounded">
                                <span>🎓教育</span>
                            </label>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-300 w-8 text-center shrink-0">後半</span>
                            <select onchange="updateCourseAssignment('${member.id}', 'secondHalf.courseId', this.value)" class="w-48 p-1 border border-slate-300 rounded-lg text-xs font-bold bg-white text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 shrink-0">
                                ${renderCourseOptions(ca.secondHalf?.courseId, 'second', ca.secondHalf?.isTrainee)}
                            </select>
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
                        <span class="px-2.5 py-1 rounded-md text-xs font-black text-white shadow-2xs inline-block" style="background-color: ${shiftColor}">
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
    renderAll();
    syncSingleCourseAssignmentToCloud(key, current);
}

function clearCourseAssignment(memberId) {
    const key = `${state.selectedAssignmentDate}_${memberId}`;
    delete state.courseAssignments[key];
    renderAll();
    syncSingleCourseAssignmentToCloud(key, null);
}
