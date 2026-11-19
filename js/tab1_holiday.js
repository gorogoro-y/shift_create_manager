// js/tab1_holiday.js
// 【タブ1】メンバー休み設定、連勤日数計算、必要人数管理、休み自動ジェネレート

let holidayGenerateUndoStack = [];
const WEEKDAY_LABELS_JA = ['日', '月', '火', '水', '木', '金', '土'];

function formatHolidayRuleBadge(rule) {
    if (!rule || !rule.type) return '';
    if (rule.type === 'interval' && rule.days) {
        return `${rule.days}日毎`;
    }
    if (rule.type === 'weekdays' && Array.isArray(rule.weekdays) && rule.weekdays.length > 0) {
        return rule.weekdays.slice().sort((a, b) => a - b).map(d => WEEKDAY_LABELS_JA[d]).join('・');
    }
    return '';
}

function parseHolidayRuleText(rawText) {
    const text = (rawText || '').trim();
    if (!text || text === 'なし' || text === '未設定' || text === 'クリア' || text === '-') {
        return null;
    }
    // 間隔指定（例: "4", "4日", "4日毎", "4日勤務"）
    const numMatch = text.match(/^(\d+)\s*(日|日毎|日ごと|日勤務)?$/);
    if (numMatch) {
        const days = parseInt(numMatch[1], 10);
        if (days >= 1 && days <= 30) {
            return { type: 'interval', days };
        }
    }
    // 曜日指定（例: "日", "水・日", "水,日", "毎週日曜"）
    const weekdays = [];
    WEEKDAY_LABELS_JA.forEach((label, idx) => {
        if (text.includes(label)) {
            weekdays.push(idx);
        }
    });
    if (weekdays.length > 0) {
        return { type: 'weekdays', weekdays };
    }
    return undefined; // パース不能
}

function getMemberWorkSpanDetails(memberId, currentDays) {
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
    timeline.forEach((item, idx) => {
        const cell = getCellDataForAnyDate(memberId, item.dateStr);
        if (isHolidayValue(cell.shiftId)) {
            holidayIndices.push(idx);
        }
    });

    const sortedHolidays = Array.from(new Set(holidayIndices)).sort((a, b) => a - b);

    const spanMap = {};
    const fullSpanMap = {};
    for (let i = 0; i < sortedHolidays.length - 1; i++) {
        const startIdx = sortedHolidays[i];
        const endIdx = sortedHolidays[i + 1];
        const spanLength = endIdx - startIdx - 1;

        if (spanLength > 0) {
            for (let k = startIdx + 1; k < endIdx; k++) {
                const target = timeline[k];
                if (target && target.isCurrentMonth) {
                    fullSpanMap[target.dateStr] = spanLength;
                    if (spanLength < 10) {
                        spanMap[target.dateStr] = spanLength;
                    }
                }
            }
        }
    }
    return { spanMap, fullSpanMap };
}

function getMemberWorkSpans(memberId, currentDays) {
    return getMemberWorkSpanDetails(memberId, currentDays).spanMap;
}

function analyzeMemberHolidayDeviations(member, currentDays, fullSpanMap) {
    const deviatedDates = new Set();
    const rule = member ? member.holidayRule : null;
    if (!rule || !rule.type) {
        return { hasDeviation: false, deviatedDates, summaryText: '' };
    }

    if (rule.type === 'interval' && rule.days) {
        const targetDays = rule.days;
        const badSpans = new Set();
        currentDays.forEach(d => {
            const span = fullSpanMap[d.dateStr];
            if (span && span !== targetDays) {
                deviatedDates.add(d.dateStr);
                badSpans.add(`${span}日`);
            }
        });
        const summaryText = badSpans.size > 0
            ? `設定(${targetDays}日勤務)とズレあり: ${Array.from(badSpans).join('・')}勤務区間`
            : '';
        return { hasDeviation: deviatedDates.size > 0, deviatedDates, summaryText };
    }

    if (rule.type === 'weekdays' && Array.isArray(rule.weekdays) && rule.weekdays.length > 0) {
        // 週1回の曜日指定は必ず6日勤務区間になるため、6日以外の勤務区間をズレとして判定
        if (rule.weekdays.length === 1) {
            const targetDays = 6;
            const badSpans = new Set();
            currentDays.forEach(d => {
                const span = fullSpanMap[d.dateStr];
                if (span && span !== targetDays) {
                    deviatedDates.add(d.dateStr);
                    badSpans.add(`${span}日`);
                }
            });
            const summaryText = badSpans.size > 0
                ? `曜日指定(${WEEKDAY_LABELS_JA[rule.weekdays[0]]}・6日勤務)とズレあり: ${Array.from(badSpans).join('・')}勤務区間`
                : '';
            return { hasDeviation: deviatedDates.size > 0, deviatedDates, summaryText };
        }

        // 複数曜日指定の場合のフォールバック
        const holidayDays = currentDays.filter(d => isHolidayValue(getCellData(`${member.id}_${d.dateStr}`).shiftId));
        if (holidayDays.length === 0) {
            return { hasDeviation: false, deviatedDates, summaryText: '' };
        }
        const firstHolidayDay = holidayDays[0].day;
        const lastHolidayDay = holidayDays[holidayDays.length - 1].day;
        const missingDays = [];
        currentDays.forEach(d => {
            if (d.day < firstHolidayDay || d.day > lastHolidayDay) return;
            const dow = new Date(state.currentYear, state.currentMonth - 1, d.day).getDay();
            const cell = getCellData(`${member.id}_${d.dateStr}`);
            const isHol = isHolidayValue(cell.shiftId);
            const isDesignated = rule.weekdays.includes(dow);
            if (isDesignated && !isHol) {
                deviatedDates.add(d.dateStr);
                missingDays.push(`${d.day}日(${WEEKDAY_LABELS_JA[dow]})`);
            }
        });
        const summaryText = missingDays.length > 0
            ? `指定曜日に未休: ${missingDays.slice(0, 4).join(', ')}`
            : '';
        return { hasDeviation: deviatedDates.size > 0, deviatedDates, summaryText };
    }

    return { hasDeviation: false, deviatedDates, summaryText: '' };
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
    renderTab1ModeControls();
    renderHolidayStampsBar();
    const container = document.getElementById('matrix-container-1');
    if (!container) return;
    const prevScrollTop = container.scrollTop;
    const prevScrollLeft = container.scrollLeft;
    const days = getMonthDays();
    const isGenerateMode = state.tab1Mode === 'generate';
    
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
        const { spanMap: workSpans, fullSpanMap } = getMemberWorkSpanDetails(m.id, days);
        const ruleBadgeText = formatHolidayRuleBadge(m.holidayRule);
        const deviation = analyzeMemberHolidayDeviations(m, days, fullSpanMap);
        const isOverRestraint = typeof isMemberOverRestraintLimit === 'function' && isMemberOverRestraintLimit(m.id);

        html += `<tr class="border-b border-slate-300 hover:bg-slate-50 transition">`;
        html += `
            <td class="p-1.5 border-r border-b border-slate-300 font-bold sticky-col-left shadow-2xs text-left ${isOverRestraint ? 'member-over-restraint-cell' : 'text-slate-800'}">
                <div class="flex items-center gap-1 justify-start">
                    <button onclick="setMemberAllHoliday('${m.id}')" title="${isAllHoliday ? '全休を解除' : '全日を休みに設定'}" class="px-1.5 py-0.5 border rounded text-[10px] font-bold transition shrink-0 ${btnStyle}">
                        ${isAllHoliday ? '済' : '全休'}
                    </button>
                    <button onclick="setMemberAllWait('${m.id}')" title="${isAllWait ? '全待を解除' : '全日を待機に設定'}" class="px-1.5 py-0.5 border rounded text-[10px] font-bold transition shrink-0 ${waitBtnStyle}">
                        ${isAllWait ? '済' : '全待'}
                    </button>
                    <div class="flex flex-col min-w-0 flex-1 cursor-pointer" onclick="openMemberEditModal('${m.id}')" title="クリックして属性・休みルール・担当不可コースを編集">
                        <div class="flex items-center gap-1 min-w-0">
                            <span class="truncate text-xs font-bold hover:text-indigo-600 ${isOverRestraint ? 'text-rose-700' : ''}">${m.name}</span>
                        </div>
                        <div class="flex items-center gap-1 mt-0.5 overflow-hidden">
                            ${ruleBadgeText ? `<span class="px-1 py-0 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[9px] font-black shrink-0" title="休みルール">${ruleBadgeText}</span>` : (isGenerateMode ? '<span class="px-1 py-0 rounded bg-slate-100 text-slate-400 border border-slate-200 text-[9px] shrink-0">未設定</span>' : '')}
                            ${badgesHTML || (!ruleBadgeText ? '<span class="text-[9px] text-slate-300 font-normal">属性なし</span>' : '')}
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
            const isDeviatedCell = deviation.deviatedDates.has(d.dateStr);
            
            let cellStyle = "bg-white hover:bg-slate-100 text-slate-300";
            if (d.isSunday) cellStyle = "bg-rose-50/40 hover:bg-rose-100/60 text-rose-300/60";
            if (d.isSaturday) cellStyle = "bg-sky-50/40 hover:bg-sky-100/60 text-sky-300/60";

            let displayContent = 'ー';
            let inlineStyle = '';
            let cellTitle = '';

            const hType = getHolidayType(val);
            if (hType) {
                cellStyle = "font-extrabold shadow-2xs border-slate-300";
                if (isDeviatedCell) {
                    cellStyle += " ring-2 ring-inset ring-rose-500";
                    cellTitle = `title="${deviation.summaryText}"`;
                }
                if (isGenerateMode) {
                    if (cell.isGeneratedHoliday) {
                        inlineStyle = `style="background-color: ${hType.color}18; color: ${hType.color}; border: 1.5px dashed ${hType.color}90;"`;
                        displayContent = `<span class="text-[9px] mr-0.5 opacity-80">⚡</span>${hType.shortName}`;
                        if (!cellTitle) cellTitle = 'title="自動ジェネレートで設定された休み"';
                    } else {
                        inlineStyle = `style="background-color: ${hType.color}28; color: ${hType.color}; border: 1.5px solid ${hType.color}80;"`;
                        displayContent = `<span class="text-[9px] mr-0.5 opacity-80">🔒</span>${hType.shortName}`;
                        if (!cellTitle) cellTitle = 'title="通常モードで設定された休み（ロック中）"';
                    }
                } else {
                    inlineStyle = `style="background-color: ${hType.color}25; color: ${hType.color}; border: 1.5px solid ${hType.color}70;"`;
                    displayContent = hType.shortName;
                }
            } else if (workSpans[d.dateStr] || (isDeviatedCell && fullSpanMap[d.dateStr])) {
                const span = workSpans[d.dateStr] || fullSpanMap[d.dateStr];
                let badgeColor = "text-slate-600 bg-slate-100/90 border-slate-300/80";
                if (isDeviatedCell) {
                    cellStyle += " bg-rose-50/80 ring-1 ring-inset ring-rose-400";
                    badgeColor = "text-rose-700 bg-rose-100 border-rose-400 font-extrabold";
                    cellTitle = `title="${deviation.summaryText}"`;
                } else if (span >= 7) {
                    badgeColor = "text-rose-700 bg-rose-50/90 border-rose-300 font-extrabold";
                } else if (span >= 5) {
                    badgeColor = "text-amber-700 bg-amber-50/90 border-amber-300 font-bold";
                }
                const labelText = isDeviatedCell ? `⚠${span}日` : `${span}日勤務`;
                displayContent = `
                    <span class="inline-block px-1 py-0.5 rounded text-[9px] border shadow-2xs leading-none ${badgeColor}" title="${isDeviatedCell ? deviation.summaryText : `連続${span}日勤務`}">
                        ${labelText}
                    </span>
                `;
            } else if (isDeviatedCell) {
                cellStyle += " bg-rose-50/80 ring-1 ring-inset ring-rose-400 text-rose-600 font-bold";
                displayContent = `<span class="text-[10px]" title="${deviation.summaryText}">⚠</span>`;
                cellTitle = `title="${deviation.summaryText}"`;
            }

            html += `
                <td onclick="toggleStamp('${m.id}', '${d.dateStr}')" ${cellTitle} class="p-1 border-r border-b border-slate-300 cursor-pointer select-none text-xs ${cellStyle}" ${inlineStyle}>
                    ${displayContent}
                </td>
            `;
        });

        const workDays = allDays.length - totalHolidays;
        html += `<td class="p-2 border-l border-b border-slate-300 font-extrabold text-indigo-700 bg-indigo-50/50 sticky-col-right text-center">${workDays}日</td></tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
    container.scrollTop = prevScrollTop;
    container.scrollLeft = prevScrollLeft;
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
    const existing = getCellData(key);
    if (state.tab1Mode === 'generate') {
        if (isHolidayValue(existing.shiftId) && !existing.isGeneratedHoliday) {
            showMessageModal("通常モードで設定された休みはロックされています。変更する場合は「通常モード」に切り替えてください。");
            return;
        }
        if (existing.isGeneratedHoliday) {
            delete state.schedule[key];
            renderAll();
            syncSingleCellToCloud(key, null);
            return;
        }
        showMessageModal("ジェネレートモードでは「⚡ 自動ジェネレート」から休みを生成できます。手動入力は「通常モード」で行ってください。");
        return;
    }

    let cellData = null;
    if (existing.shiftId === state.selectedStamp) {
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
    const isAllHoliday = days.every(d => getCellData(`${memberId}_${d.dateStr}`).shiftId === '休');
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
    const isAllWait = days.every(d => getCellData(`${memberId}_${d.dateStr}`).shiftId === '待');
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

// ==========================================
// タブ1 ジェネレートモード制御・実行・元に戻す・Excel取込
// ==========================================

function setTab1Mode(mode) {
    state.tab1Mode = (mode === 'generate') ? 'generate' : 'normal';
    renderMatrixMode1();
}

function renderTab1ModeControls() {
    const mode = state.tab1Mode || 'normal';
    const btnNormal = document.getElementById('tab1-mode-btn-normal');
    const btnGen = document.getElementById('tab1-mode-btn-generate');
    const normalBar = document.getElementById('tab1-normal-bar');
    const genBar = document.getElementById('tab1-generate-bar');
    const reqBar = document.getElementById('tab1-required-bar');

    if (btnNormal && btnGen) {
        if (mode === 'generate') {
            btnNormal.className = "px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition";
            btnGen.className = "px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white shadow-xs transition flex items-center gap-1";
        } else {
            btnNormal.className = "px-2.5 py-1.5 rounded-lg bg-white text-indigo-600 shadow-xs transition";
            btnGen.className = "px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center gap-1";
        }
    }
    if (normalBar) normalBar.classList.toggle('hidden', mode === 'generate');
    if (genBar) genBar.classList.toggle('hidden', mode !== 'generate');
    if (reqBar) reqBar.classList.toggle('hidden', mode === 'generate');

    const days = getMonthDays();
    const startInput = document.getElementById('tab1-gen-start-day');
    const endInput = document.getElementById('tab1-gen-end-day');
    if (startInput && endInput && days.length > 0) {
        startInput.max = days.length;
        endInput.max = days.length;
        if (parseInt(endInput.value, 10) > days.length || !endInput.dataset.initialized) {
            endInput.value = days.length;
            endInput.dataset.initialized = '1';
        }
    }

    const undoBtn = document.getElementById('tab1-gen-undo-btn');
    if (undoBtn) {
        const currentMonthPrefix = `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}`;
        const hasUndoForMonth = holidayGenerateUndoStack.some(item => item.monthKey === currentMonthPrefix);
        undoBtn.disabled = !hasUndoForMonth;
    }
}

function setTab1GenRange(rangeType) {
    const days = getMonthDays();
    const lastDay = days.length || 31;
    const startInput = document.getElementById('tab1-gen-start-day');
    const endInput = document.getElementById('tab1-gen-end-day');
    if (!startInput || !endInput) return;

    if (rangeType === 'full') {
        startInput.value = 1;
        endInput.value = lastDay;
    } else if (rangeType === 'first') {
        startInput.value = 1;
        endInput.value = Math.min(15, lastDay);
    } else if (rangeType === 'second') {
        startInput.value = Math.min(16, lastDay);
        endInput.value = lastDay;
    }
}

function getTab1GenRangeDays() {
    const days = getMonthDays();
    const lastDay = days.length;
    const startInput = document.getElementById('tab1-gen-start-day');
    const endInput = document.getElementById('tab1-gen-end-day');
    let startDay = parseInt(startInput ? startInput.value : '1', 10) || 1;
    let endDay = parseInt(endInput ? endInput.value : String(lastDay), 10) || lastDay;
    startDay = Math.max(1, Math.min(lastDay, startDay));
    endDay = Math.max(startDay, Math.min(lastDay, endDay));
    if (startInput) startInput.value = startDay;
    if (endInput) endInput.value = endDay;
    return { startDay, endDay, days };
}

function pushHolidayGenerateUndoSnapshot() {
    const monthKey = `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}`;
    const snapshot = {};
    Object.keys(state.schedule).forEach(k => {
        if (k.includes(`_${monthKey}-`)) {
            snapshot[k] = JSON.parse(JSON.stringify(state.schedule[k]));
        }
    });
    holidayGenerateUndoStack.push({ monthKey, snapshot });
    if (holidayGenerateUndoStack.length > 20) {
        holidayGenerateUndoStack.shift();
    }
}

function getInitialWorkCountBeforeDay(memberId, startDay) {
    let workCount = 0;
    const firstDate = new Date(state.currentYear, state.currentMonth - 1, startDay);
    for (let i = 1; i <= 31; i++) {
        const dt = new Date(firstDate);
        dt.setDate(dt.getDate() - i);
        const dStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        const cell = getCellDataForAnyDate(memberId, dStr);
        if (isHolidayValue(cell.shiftId)) {
            return workCount;
        }
        workCount++;
    }
    return 0;
}

function executeTab1HolidayGenerate() {
    const { startDay, endDay, days } = getTab1GenRangeDays();
    const configuredMembers = state.members.filter(m => m.holidayRule && m.holidayRule.type);
    if (configuredMembers.length === 0) {
        showMessageModal("休みルール（間隔または曜日指定）が設定されているメンバーがいません。\n「📋 間隔Excel取込」またはメンバー名をクリックして設定してください。");
        return;
    }

    pushHolidayGenerateUndoSnapshot();
    const batchUpdates = {};
    let generatedCount = 0;

    configuredMembers.forEach(m => {
        const rule = m.holidayRule;

        if (rule.type === 'weekdays' && Array.isArray(rule.weekdays) && rule.weekdays.length > 0) {
            for (let day = startDay; day <= endDay; day++) {
                const d = days[day - 1];
                if (!d) continue;
                const key = `${m.id}_${d.dateStr}`;
                const cell = getCellData(key);
                // 通常モードで設定済みの休みは絶対保護
                if (isHolidayValue(cell.shiftId) && !cell.isGeneratedHoliday) {
                    continue;
                }
                const dow = new Date(state.currentYear, state.currentMonth - 1, day).getDay();
                if (rule.weekdays.includes(dow)) {
                    const val = { shiftId: '休', isGeneratedHoliday: true };
                    state.schedule[key] = val;
                    batchUpdates[key] = val;
                    generatedCount++;
                } else if (cell.isGeneratedHoliday) {
                    delete state.schedule[key];
                    batchUpdates[key] = null;
                }
            }
        } else if (rule.type === 'interval' && rule.days >= 1) {
            const interval = rule.days;
            // 対象期間内の既存の自動生成休みを先にクリアしてから再計算
            for (let day = startDay; day <= endDay; day++) {
                const d = days[day - 1];
                if (!d) continue;
                const key = `${m.id}_${d.dateStr}`;
                const cell = getCellData(key);
                if (cell.isGeneratedHoliday) {
                    delete state.schedule[key];
                    batchUpdates[key] = null;
                }
            }

            let workCount = getInitialWorkCountBeforeDay(m.id, startDay);
            for (let day = startDay; day <= endDay; day++) {
                const d = days[day - 1];
                if (!d) continue;
                const key = `${m.id}_${d.dateStr}`;
                const cell = getCellData(key);
                // ロック済み（通常モード設定）の休みがあればそこを最後の休みとしてカウントをリセット
                if (isHolidayValue(cell.shiftId)) {
                    workCount = 0;
                    continue;
                }
                if (workCount >= interval) {
                    const val = { shiftId: '休', isGeneratedHoliday: true };
                    state.schedule[key] = val;
                    batchUpdates[key] = val;
                    workCount = 0;
                    generatedCount++;
                } else {
                    workCount++;
                }
            }
        }
    });

    renderAll();
    if (Object.keys(batchUpdates).length > 0) {
        syncBatchCellsToCloud(batchUpdates);
    }
    showMessageModal(`${startDay}日〜${endDay}日の休みを自動ジェネレートしました（生成数: ${generatedCount}件）。\n※通常モードで入力済みの休みは保護されています。`);
}

function clearTab1GeneratedHolidays() {
    const { startDay, endDay, days } = getTab1GenRangeDays();
    pushHolidayGenerateUndoSnapshot();

    const batchUpdates = {};
    let clearedCount = 0;
    state.members.forEach(m => {
        for (let day = startDay; day <= endDay; day++) {
            const d = days[day - 1];
            if (!d) continue;
            const key = `${m.id}_${d.dateStr}`;
            const cell = getCellData(key);
            if (cell.isGeneratedHoliday) {
                delete state.schedule[key];
                batchUpdates[key] = null;
                clearedCount++;
            }
        }
    });

    renderAll();
    if (Object.keys(batchUpdates).length > 0) {
        syncBatchCellsToCloud(batchUpdates);
    }
    showMessageModal(`${startDay}日〜${endDay}日の自動生成「休」をクリアしました（${clearedCount}件）。`);
}

function undoTab1HolidayGenerate() {
    const monthKey = `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}`;
    let idx = -1;
    for (let i = holidayGenerateUndoStack.length - 1; i >= 0; i--) {
        if (holidayGenerateUndoStack[i].monthKey === monthKey) {
            idx = i;
            break;
        }
    }
    if (idx === -1) return;

    const entry = holidayGenerateUndoStack.splice(idx, 1)[0];
    const batchUpdates = {};

    // 当月の現在キーのうちスナップショットにないものを削除
    Object.keys(state.schedule).forEach(k => {
        if (k.includes(`_${monthKey}-`) && !(k in entry.snapshot)) {
            delete state.schedule[k];
            batchUpdates[k] = null;
        }
    });
    // スナップショットの値を復元
    Object.keys(entry.snapshot).forEach(k => {
        state.schedule[k] = JSON.parse(JSON.stringify(entry.snapshot[k]));
        batchUpdates[k] = state.schedule[k];
    });

    renderAll();
    if (Object.keys(batchUpdates).length > 0) {
        syncBatchCellsToCloud(batchUpdates);
    }
}

function openHolidayRuleImportModal() {
    const modal = document.getElementById('holiday-rule-import-modal');
    const ta = document.getElementById('holiday-rule-import-textarea');
    if (ta) ta.value = '';
    if (modal) modal.classList.remove('hidden');
}

function closeHolidayRuleImportModal() {
    const modal = document.getElementById('holiday-rule-import-modal');
    if (modal) modal.classList.add('hidden');
}

function executeHolidayRuleImport() {
    const ta = document.getElementById('holiday-rule-import-textarea');
    const text = ta ? ta.value : '';
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
        showMessageModal("貼り付けデータが空です。");
        return;
    }

    const normalizeName = (s) => (s || '').replace(/[\s\u3000]+/g, '');
    let updatedCount = 0;
    const unmatched = [];
    const invalidRules = [];

    lines.forEach(line => {
        const cols = line.includes('\t') ? line.split('\t') : line.split(',');
        if (cols.length < 1) return;
        const rawName = (cols[0] || '').trim();
        const rawRule = (cols[1] || '').trim();
        if (!rawName || rawName === 'スタッフ名' || rawName === '名前' || rawName === '氏名') return;

        const normTarget = normalizeName(rawName);
        const member = state.members.find(m => normalizeName(m.name) === normTarget);
        if (!member) {
            unmatched.push(rawName);
            return;
        }

        const parsed = parseHolidayRuleText(rawRule);
        if (parsed === undefined) {
            invalidRules.push(`${rawName}(${rawRule})`);
            return;
        }
        member.holidayRule = parsed;
        updatedCount++;
    });

    closeHolidayRuleImportModal();
    renderAll();
    saveMasterToCloud(true);

    let msg = `${updatedCount}名の休みルールを取り込みました。`;
    if (unmatched.length > 0) msg += `\n\n[未一致スタッフ]: ${unmatched.join(', ')}`;
    if (invalidRules.length > 0) msg += `\n[形式不明]: ${invalidRules.join(', ')}`;
    showMessageModal(msg);
}
