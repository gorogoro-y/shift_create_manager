// js/tab1_holiday.js
// 【タブ1】メンバー休み設定、連勤日数計算、必要人数管理

function getMemberWorkSpans(memberId, currentDays) {
    const timeline = [];
    const formatDate = (dt) => {
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const firstDateOfMonth = new Date(state.currentYear, state.currentMonth - 1, 1);
    for (let i = 15; i >= 1; i--) {
        const dt = new Date(firstDateOfMonth);
        dt.setDate(dt.getDate() - i);
        timeline.push({ dateStr: formatDate(dt), isCurrentMonth: false });
    }

    currentDays.forEach(d => {
        timeline.push({ dateStr: d.dateStr, isCurrentMonth: true });
    });

    const lastDateOfMonth = new Date(state.currentYear, state.currentMonth, 0);
    for (let i = 1; i <= 15; i++) {
        const dt = new Date(lastDateOfMonth);
        dt.setDate(dt.getDate() + i);
        timeline.push({ dateStr: formatDate(dt), isCurrentMonth: false });
    }

    const holidayIndices = [];

    // 実在する休みスタンプの位置のみを収集
    timeline.forEach((item, idx) => {
        const cell = getCellDataForAnyDate(memberId, item.dateStr);
        if (isHolidayValue(cell.shiftId)) {
            holidayIndices.push(idx);
        }
    });

    const sortedHolidays = Array.from(new Set(holidayIndices)).sort((a, b) => a - b);

    const spanMap = {};
    // 前後両方に実在する本物の休みが存在する区間のみを計算（月の境界で勝手に区切らない）
    for (let i = 0; i < sortedHolidays.length - 1; i++) {
        const startIdx = sortedHolidays[i];
        const endIdx = sortedHolidays[i + 1];
        const spanLength = endIdx - startIdx - 1;

        if (spanLength > 0 && spanLength < 10) {
            for (let k = startIdx + 1; k < endIdx; k++) {
                const target = timeline[k];
                if (target && target.isCurrentMonth) {
                    spanMap[target.dateStr] = spanLength;
                }
            }
        }
    }
    return spanMap;
}

function getPreviousMonthConsecutiveWorkdays(memberId) {
    const { prevKey } = getAdjacentMonthKeys(state.currentYear, state.currentMonth);
    let prevSchedule = state.adjacentSchedules ? state.adjacentSchedules[prevKey] : null;

    if (!prevSchedule) {
        const cached = localStorage.getItem(`shift_app_month_${prevKey}`);
        if (cached) {
            try {
                prevSchedule = JSON.parse(cached);
                if (!state.adjacentSchedules) state.adjacentSchedules = {};
                state.adjacentSchedules[prevKey] = prevSchedule;
            } catch (e) {}
        }
    }

    if (!prevSchedule || typeof prevSchedule !== 'object' || Object.keys(prevSchedule).length === 0) {
        return '-';
    }

    const prevLastDate = new Date(state.currentYear, state.currentMonth - 1, 0);
    const prevYear = prevLastDate.getFullYear();
    const prevMonth = prevLastDate.getMonth() + 1;
    const lastDayNum = prevLastDate.getDate();

    let count = 0;
    for (let day = lastDayNum; day >= 1; day--) {
        const dStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const cell = getCellDataForAnyDate(memberId, dStr);

        if (isHolidayValue(cell.shiftId)) {
            break;
        } else {
            count++;
        }
    }

    return count;
}

function renderMatrixMode1() {
    renderHolidayStampsBar();
    const container = document.getElementById('matrix-container-1');
    if (!container) return;
    const days = getMonthDays();
    
    let html = `<table class="min-w-[1550px] w-full text-center border-separate border-spacing-0 text-xs"><thead><tr class="bg-slate-100 text-slate-700 border-b border-slate-300">`;
    html += `<th class="p-2 border-r border-b border-slate-300 min-w-[170px] w-[170px] sticky-col-corner font-bold">メンバー (${state.members.length}名)</th>`;
    html += `
        <th class="p-1 border-r border-b border-slate-300 min-w-[48px] w-[48px] sticky-col-header bg-slate-200 text-slate-700 font-bold text-center" title="先月末日からの継続勤務日数">
            <div class="flex flex-col items-center justify-center gap-0.5">
                <span class="text-[9px] text-slate-500 font-bold leading-tight">前月末</span>
                <span class="text-xs font-black text-slate-700">連勤</span>
            </div>
        </th>
    `;

    days.forEach(d => {
        const required = state.dailyRequired[d.dateStr] ?? 31;
        let holidayCount = 0;
        state.members.forEach(m => {
            const cell = getCellData(`${m.id}_${d.dateStr}`);
            if (isHolidayValue(cell.shiftId)) holidayCount++;
        });

        const availableCount = state.members.length - holidayCount;
        const diff = availableCount - required;
        
        let badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300";
        let badgeText = "±0";
        if (diff < 0) {
            badgeClass = "bg-rose-100 text-rose-800 border-rose-300";
            badgeText = `${Math.abs(diff)}不足`;
        } else if (diff > 0) {
            badgeClass = "bg-sky-100 text-sky-800 border-sky-300";
            badgeText = `+${diff}余り`;
        }

        let headerBg = "bg-slate-100";
        let dayTextClass = "text-slate-800";
        if (d.isSunday) {
            headerBg = "bg-rose-100";
            dayTextClass = "text-rose-700 font-extrabold";
        } else if (d.isSaturday) {
            headerBg = "bg-sky-100";
            dayTextClass = "text-sky-700 font-extrabold";
        }

        const eventVal = state.dailyEvents?.[d.dateStr] || '';

        html += `
            <th class="p-1 border-r border-b border-slate-300 min-w-[46px] sticky-col-header font-bold ${headerBg}">
                <div class="flex flex-col items-center gap-1">
                    <span class="px-1 py-0.5 border rounded text-[9px] font-black ${badgeClass}">${badgeText}</span>
                    <div class="flex items-center gap-0.5 text-[10px] text-slate-500">
                        <span>必要:</span>
                        <input type="number" min="0" value="${required}" onchange="updateDailyRequired('${d.dateStr}', this.value)" class="w-8 px-0.5 py-0.5 border border-slate-300 rounded text-center font-bold bg-white text-slate-800">
                    </div>
                    <input type="text"
                           value="${eventVal}"
                           placeholder="行事"
                           title="特別イベント: ${eventVal || '未設定（クリックして入力）'}"
                           onchange="updateDailyEvent('${d.dateStr}', this.value)"
                           onkeydown="if(event.key==='Enter') this.blur()"
                           class="w-full max-w-[46px] px-0.5 py-0.5 text-[9px] border rounded text-center font-bold outline-none transition select-text ${eventVal ? 'bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-300 shadow-2xs' : 'bg-white/90 text-slate-600 border-slate-300 placeholder:text-slate-300 hover:border-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-300'}">
                    <div class="font-extrabold text-sm ${dayTextClass}">
                        ${d.day} <span class="text-[10px] font-bold">(${d.dayOfWeek})</span>
                    </div>
                </div>
            </th>
        `;
    });
    html += `<th class="p-2 border-l border-b border-slate-300 min-w-[70px] text-center font-bold sticky-col-corner-right">稼働日数</th></tr></thead><tbody>`;

    state.members.forEach(m => {
        let totalHolidays = 0;
        const allDays = getMonthDays();
        allDays.forEach(ad => {
            const cell = getCellData(`${m.id}_${ad.dateStr}`);
            if (isHolidayValue(cell.shiftId)) totalHolidays++;
        });

        const isAllHoliday = allDays.every(ad => getCellData(`${m.id}_${ad.dateStr}`).shiftId === '休');
        const btnStyle = isAllHoliday 
            ? "bg-rose-600 text-white border-rose-600 shadow-xs" 
            : "bg-slate-100 hover:bg-rose-500 hover:text-white text-slate-600 border-slate-300";

        const isAllWait = allDays.every(ad => getCellData(`${m.id}_${ad.dateStr}`).shiftId === '待');
        const waitBtnStyle = isAllWait
            ? "bg-violet-600 text-white border-violet-600 shadow-xs"
            : "bg-slate-100 hover:bg-violet-500 hover:text-white text-slate-600 border-slate-300";

        const badgesHTML = getMemberBadgesHTML(m);
        const workSpans = getMemberWorkSpans(m.id, days);

        html += `<tr class="border-b border-slate-300 hover:bg-slate-50 transition">`;
        html += `
            <td class="p-1.5 border-r border-b border-slate-300 font-bold text-slate-800 sticky-col-left shadow-2xs text-left">
                <div class="flex items-center gap-1 justify-start">
                    <button onclick="setMemberAllHoliday('${m.id}')" title="${isAllHoliday ? '全休を解除' : '全日を休みに設定'}" class="px-1.5 py-0.5 border rounded text-[10px] font-bold transition shrink-0 ${btnStyle}">
                        ${isAllHoliday ? '済' : '全休'}
                    </button>
                    <button onclick="setMemberAllWait('${m.id}')" title="${isAllWait ? '全待を解除' : '全日を待機に設定'}" class="px-1.5 py-0.5 border rounded text-[10px] font-bold transition shrink-0 ${waitBtnStyle}">
                        ${isAllWait ? '済' : '全待'}
                    </button>
                    <div class="flex flex-col min-w-0 flex-1 cursor-pointer" onclick="openMemberEditModal('${m.id}')" title="クリックして属性や担当不可コースを編集">
                        <span class="truncate text-xs font-bold hover:text-indigo-600">${m.name}</span>
                        <div class="flex items-center gap-1 mt-0.5 overflow-hidden">
                            ${badgesHTML || '<span class="text-[9px] text-slate-300 font-normal">属性なし</span>'}
                        </div>
                    </div>
                </div>
            </td>
        `;

        const prevWorkdays = getPreviousMonthConsecutiveWorkdays(m.id);
        html += `
            <td class="p-1 border-r border-b border-slate-300 font-black text-slate-700 bg-slate-50 text-center text-xs">
                ${prevWorkdays}
            </td>
        `;

        days.forEach(d => {
            const key = `${m.id}_${d.dateStr}`;
            const cell = getCellData(key);
            const val = cell.shiftId;
            
            let cellStyle = "bg-white hover:bg-slate-100 text-slate-300";
            if (d.isSunday) cellStyle = "bg-rose-50/40 hover:bg-rose-100/60 text-rose-300/60";
            if (d.isSaturday) cellStyle = "bg-sky-50/40 hover:bg-sky-100/60 text-sky-300/60";

            let displayContent = 'ー';
            let inlineStyle = '';

            const hType = getHolidayType(val);
            if (hType) {
                cellStyle = "font-extrabold shadow-2xs border-slate-300";
                inlineStyle = `style="background-color: ${hType.color}25; color: ${hType.color}; border: 1.5px solid ${hType.color}70;"`;
                displayContent = hType.shortName;
            } else if (workSpans[d.dateStr]) {
                const span = workSpans[d.dateStr];
                let badgeColor = "text-slate-600 bg-slate-100/90 border-slate-300/80";
                if (span >= 7) {
                    badgeColor = "text-rose-700 bg-rose-50/90 border-rose-300 font-extrabold";
                } else if (span >= 5) {
                    badgeColor = "text-amber-700 bg-amber-50/90 border-amber-300 font-bold";
                }
                displayContent = `
                    <span class="inline-block px-1 py-0.5 rounded text-[9px] border shadow-2xs leading-none ${badgeColor}" title="連続${span}日勤務">
                        ${span}日勤務
                    </span>
                `;
            }

            html += `
                <td onclick="toggleStamp('${m.id}', '${d.dateStr}')" class="p-1 border-r border-b border-slate-300 cursor-pointer select-none text-xs ${cellStyle}" ${inlineStyle}>
                    ${displayContent}
                </td>
            `;
        });

        const workDays = allDays.length - totalHolidays;
        html += `<td class="p-2 border-l border-b border-slate-300 font-extrabold text-indigo-700 bg-indigo-50/50 sticky-col-right text-center">${workDays}日</td></tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

function renderFilterToolbar() {
    const container = document.getElementById('attribute-filter-container');
    if (!container) return;

    const isAllSelected = state.activeStaffFilter === null;

    let html = `
        <span class="text-xs font-bold text-slate-600 flex items-center gap-1 mr-1">
            <span>🔍</span>
            <span>絞込:</span>
        </span>
        <button onclick="setStaffFilter(null)" class="px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
            isAllSelected 
                ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-500 ring-offset-1' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
        }">
            <span>全員</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] ${isAllSelected ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-600'}">${state.members.length}</span>
        </button>
    `;

    state.staffAttributes.forEach(attr => {
        const isSelected = state.activeStaffFilter === attr.id;
        const count = state.members.filter(m => m.attributes && m.attributes.includes(attr.id)).length;
        
        const activeClasses = isSelected
            ? 'ring-2 ring-offset-1 ring-slate-800 text-white font-extrabold shadow-xs scale-105'
            : 'opacity-85 hover:opacity-100 text-white font-bold';

        html += `
            <button onclick="setStaffFilter('${attr.id}')" class="px-2.5 py-1 rounded-lg text-xs transition transform flex items-center gap-1.5 shadow-2xs ${activeClasses}" style="background-color: ${attr.color}">
                <span class="w-1.5 h-1.5 rounded-full bg-white/70"></span>
                <span>${attr.name}</span>
                <span class="px-1 py-0.2 rounded text-[10px] bg-black/20 text-white">${count}</span>
            </button>
        `;
    });

    container.innerHTML = html;
}

function setStaffFilter(attrId) {
    state.activeStaffFilter = attrId;
    renderAll(false);
}


function renderHolidayStampsBar() {
    const container = document.getElementById('holiday-stamps-bar');
    if (!container) return;

    let html = `<span class="text-xs font-bold text-slate-500">休みスタンプ:</span>`;

    (state.holidayTypes || []).forEach(ht => {
        const isSelected = state.selectedStamp === ht.shortName || state.selectedStamp === ht.id;
        const ringClass = isSelected ? 'shadow-xs ring-2 ring-indigo-500 font-black' : '';
        html += `
            <button onclick="selectStamp('${ht.shortName}')" id="stamp-btn-${ht.shortName}" 
                class="stamp-btn px-3 py-1 rounded-lg border font-bold text-xs transition ${ringClass}"
                style="background-color: ${ht.color}18; border-color: ${ht.color}50; color: ${ht.color};">
                ${ht.shortName} (${ht.name})
            </button>
        `;
    });

    const isClearSelected = !state.selectedStamp;
    const clearRing = isClearSelected ? 'shadow-xs ring-2 ring-indigo-500 font-black' : '';
    html += `
        <button onclick="selectStamp('')" id="stamp-btn-clear" 
            class="stamp-btn px-3 py-1 rounded-lg border font-bold text-xs bg-slate-50 border-slate-200 text-slate-600 transition ${clearRing}">
            解除
        </button>
    `;

    container.innerHTML = html;
}

function selectStamp(stamp) {
    state.selectedStamp = stamp;
    renderHolidayStampsBar();
}

function toggleStamp(memberId, dateStr) {
    const key = `${memberId}_${dateStr}`;
    let cellData = null;
    if (state.schedule[key] === state.selectedStamp) {
        delete state.schedule[key];
    } else {
        state.schedule[key] = state.selectedStamp;
        cellData = state.selectedStamp;
    }
    renderAll();
    syncSingleCellToCloud(key, cellData);
}

function setMemberAllHoliday(memberId) {
    const days = getMonthDays();
    const isAllHoliday = days.every(d => state.schedule[`${memberId}_${d.dateStr}`] === '休');
    const batchUpdates = {};

    days.forEach(d => {
        const key = `${memberId}_${d.dateStr}`;
        if (isAllHoliday) {
            delete state.schedule[key];
            batchUpdates[key] = null;
        } else {
            state.schedule[key] = '休';
            batchUpdates[key] = '休';
        }
    });
    renderAll();

    if (isAllHoliday) {
        days.forEach(d => syncSingleCellToCloud(`${memberId}_${d.dateStr}`, null));
    } else {
        syncBatchCellsToCloud(batchUpdates);
    }
}

function setMemberAllWait(memberId) {
    const days = getMonthDays();
    const isAllWait = days.every(d => state.schedule[`${memberId}_${d.dateStr}`] === '待');
    const batchUpdates = {};

    days.forEach(d => {
        const key = `${memberId}_${d.dateStr}`;
        if (isAllWait) {
            delete state.schedule[key];
            batchUpdates[key] = null;
        } else {
            state.schedule[key] = '待';
            batchUpdates[key] = '待';
        }
    });
    renderAll();

    if (isAllWait) {
        days.forEach(d => syncSingleCellToCloud(`${memberId}_${d.dateStr}`, null));
    } else {
        syncBatchCellsToCloud(batchUpdates);
    }
}

function updateDailyRequired(dateStr, val) {
    const num = parseInt(val) || 0;
    state.dailyRequired[dateStr] = num;
    renderAll();
    syncDailyRequiredToCloud(dateStr, num);
}

function updateDailyEvent(dateStr, val) {
    if (!state.dailyEvents) state.dailyEvents = {};
    const text = (val || '').trim();
    if (text) {
        state.dailyEvents[dateStr] = text;
    } else {
        delete state.dailyEvents[dateStr];
    }
    saveData();
    if (typeof syncDailyEventToCloud === 'function') {
        syncDailyEventToCloud(dateStr, text);
    }
    renderAll();
}

function applyDefaultRequired() {
    const val = parseInt(document.getElementById('default-required-input').value) || 0;
    const days = getMonthDays();
    days.forEach(d => {
        state.dailyRequired[d.dateStr] = val;
        syncDailyRequiredToCloud(d.dateStr, val);
    });
    renderAll();
}
