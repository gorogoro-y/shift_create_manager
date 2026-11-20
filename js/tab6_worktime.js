// js/tab6_worktime.js
// 【タブ6】月間労働時間・拘束時間の予測・実績集計マトリクス（hh:mm:ss対応）

function parseTimeToSeconds(raw) {
    if (raw === null || raw === undefined) return null;
    const str = String(raw).trim();
    if (!str || str === '-' || str === 'ー' || str === '―') return null;

    // HH:MM:SS 形式 (例: 8:30:15, 176:15:30)
    const hmsMatch = str.match(/^(\d{1,4}):([0-5]?\d):([0-5]?\d)$/);
    if (hmsMatch) {
        const h = parseInt(hmsMatch[1], 10);
        const m = parseInt(hmsMatch[2], 10);
        const s = parseInt(hmsMatch[3], 10);
        return h * 3600 + m * 60 + s;
    }

    // HH:MM 形式 (例: 8:30, 08:30)
    const hmMatch = str.match(/^(\d{1,4}):([0-5]?\d)$/);
    if (hmMatch) {
        const h = parseInt(hmMatch[1], 10);
        const m = parseInt(hmMatch[2], 10);
        return h * 3600 + m * 60;
    }

    // 小数・整数時間形式 (例: 8.5 -> 8:30:00, 8 -> 8:00:00)
    const normalized = str.replace(/[ｈＨh時間]/g, '').trim();
    const num = Number(normalized);
    if (!Number.isNaN(num) && num >= 0 && num <= 999) {
        return Math.round(num * 3600);
    }

    return undefined; // 解析不可
}

function formatSecondsToHHMMSS(sec) {
    if (sec === null || sec === undefined || Number.isNaN(sec)) return 'ー';
    const rounded = Math.round(sec);
    const h = Math.floor(rounded / 3600);
    const m = Math.floor((rounded % 3600) / 60);
    const s = rounded % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getCourseAvgSeconds(courseId) {
    if (!courseId) return { workSec: null, restraintSec: null };
    const crs = state.courses.find(c => c.id === courseId);
    if (!crs) return { workSec: null, restraintSec: null };
    const workSec = (typeof crs.avgWorkSec === 'number' && !Number.isNaN(crs.avgWorkSec))
        ? crs.avgWorkSec
        : ((typeof crs.avgWorkMin === 'number' && !Number.isNaN(crs.avgWorkMin)) ? crs.avgWorkMin * 60 : null);
    const restraintSec = (typeof crs.avgRestraintSec === 'number' && !Number.isNaN(crs.avgRestraintSec))
        ? crs.avgRestraintSec
        : ((typeof crs.avgRestraintMin === 'number' && !Number.isNaN(crs.avgRestraintMin)) ? crs.avgRestraintMin * 60 : null);
    return { workSec, restraintSec };
}

function getPredictedSecondsForDay(memberId, dateStr, overrideSplitMode = null) {
    const ca = getCourseAssignment(memberId, dateStr);
    if (!ca) return { workSec: null, restraintSec: null, isSplit: false };

    if (!ca.isSplit) {
        const res = getCourseAvgSeconds(ca.courseId);
        return { ...res, isSplit: false };
    }

    const key = `${memberId}_${dateStr}`;
    const cellEntry = state.actualWorkTimes ? state.actualWorkTimes[key] : null;
    const splitMode = overrideSplitMode || (cellEntry && cellEntry.splitChoice) || state.workTimeSplitMode || 'sum';

    const firstId = ca.firstHalf ? ca.firstHalf.courseId : '';
    const secondId = ca.secondHalf ? ca.secondHalf.courseId : '';
    const first = getCourseAvgSeconds(firstId);
    const second = getCourseAvgSeconds(secondId);

    if (splitMode === 'first') return { ...first, isSplit: true, splitMode, firstId, secondId };
    if (splitMode === 'second') return { ...second, isSplit: true, splitMode, firstId, secondId };

    // sum: 前後半合計（どちらか片方のみ設定されている場合はその値を使用）
    const sumOpt = (a, b) => {
        if (a === null && b === null) return null;
        return (a || 0) + (b || 0);
    };
    return {
        workSec: sumOpt(first.workSec, second.workSec),
        restraintSec: sumOpt(first.restraintSec, second.restraintSec),
        isSplit: true,
        splitMode: 'sum',
        firstId,
        secondId
    };
}

const RESTRAINT_LIMIT_SECONDS = 284 * 3600; // 284:00:00

function getMemberMonthlyForecastSummary(memberId, days) {
    let totalHolidays = 0;
    let workSampleSum = 0;
    let workSampleCount = 0;
    let restraintSampleSum = 0;
    let restraintSampleCount = 0;
    let actualDayCount = 0;
    let predDayCount = 0;

    days.forEach(d => {
        const key = `${memberId}_${d.dateStr}`;
        const shiftCell = getCellData(key);
        const isHoliday = isHolidayValue(shiftCell.shiftId);
        if (isHoliday) totalHolidays++;

        const actual = state.actualWorkTimes ? state.actualWorkTimes[key] : null;
        const actualWorkSec = actual
            ? (typeof actual.workSec === 'number' ? actual.workSec : (typeof actual.workMin === 'number' ? actual.workMin * 60 : null))
            : null;
        const actualRestraintSec = actual
            ? (typeof actual.restraintSec === 'number' ? actual.restraintSec : (typeof actual.restraintMin === 'number' ? actual.restraintMin * 60 : null))
            : null;
        const hasActualWork = actualWorkSec !== null;
        const hasActualRestraint = actualRestraintSec !== null;

        const pred = getPredictedSecondsForDay(memberId, d.dateStr);
        const effWork = hasActualWork ? actualWorkSec : pred.workSec;
        const effRestraint = hasActualRestraint ? actualRestraintSec : pred.restraintSec;

        if (!isHoliday || hasActualWork || hasActualRestraint) {
            if (effWork !== null) {
                workSampleSum += effWork;
                workSampleCount++;
            }
            if (effRestraint !== null) {
                restraintSampleSum += effRestraint;
                restraintSampleCount++;
            }
            if (hasActualWork || hasActualRestraint) {
                actualDayCount++;
            } else if (pred.workSec !== null || pred.restraintSec !== null) {
                predDayCount++;
            }
        }
    });

    const workDays = days.length - totalHolidays;
    const avgWorkSec = workSampleCount > 0 ? Math.round(workSampleSum / workSampleCount) : null;
    const avgRestraintSec = restraintSampleCount > 0 ? Math.round(restraintSampleSum / restraintSampleCount) : null;
    const forecastWorkSec = avgWorkSec !== null ? avgWorkSec * workDays : null;
    const forecastRestraintSec = avgRestraintSec !== null ? avgRestraintSec * workDays : null;
    const isOverRestraint = forecastRestraintSec !== null && forecastRestraintSec > RESTRAINT_LIMIT_SECONDS;

    return {
        workDays,
        avgWorkSec,
        avgRestraintSec,
        forecastWorkSec,
        forecastRestraintSec,
        actualDayCount,
        predDayCount,
        isOverRestraint
    };
}

function isMemberOverRestraintLimit(memberId) {
    const days = getMonthDays();
    return getMemberMonthlyForecastSummary(memberId, days).isOverRestraint;
}

function setWorkTimeSplitMode(mode) {
    state.workTimeSplitMode = ['sum', 'first', 'second'].includes(mode) ? mode : 'sum';
    saveData();
    renderWorkTimeTab();
}

function renderWorkTimeTab() {
    const container = document.getElementById('worktime-table-container');
    if (!container) return;

    const splitSelect = document.getElementById('worktime-split-mode-select');
    if (splitSelect) {
        splitSelect.value = state.workTimeSplitMode || 'sum';
    }

    const prevScroll = container.querySelector('#worktime-scroll-wrapper');
    const prevScrollTop = prevScroll ? prevScroll.scrollTop : 0;
    const prevScrollLeft = prevScroll ? prevScroll.scrollLeft : 0;

    const days = getMonthDays();
    const searchInput = document.getElementById('worktime-search-input');
    const query = (searchInput ? searchInput.value : '').trim().toLowerCase();

    const displayMembers = state.members.filter(m => {
        if (!query) return true;
        return (m.name || '').toLowerCase().includes(query);
    });

    let html = `
        <div id="worktime-scroll-wrapper" class="force-horizontal-scroll w-full flex-1 min-h-0 overflow-auto rounded-lg border border-slate-200">
            <table class="min-w-[2100px] w-full text-center border-separate border-spacing-0 text-xs">
                <thead>
                    <tr class="bg-slate-100 text-slate-700 border-b border-slate-300">
                        <th class="p-2 border-r border-b border-slate-300 min-w-[155px] w-[155px] sticky-col-corner font-bold align-middle text-left">
                            <div>メンバー (${displayMembers.length}名)</div>
                            <div class="text-[9px] text-slate-500 font-normal mt-0.5">上段: 労働 / 下段: 拘束</div>
                        </th>
    `;

    days.forEach(d => {
        let headerBg = "bg-slate-100";
        let dayBadgeStyle = "bg-slate-200 text-slate-800";
        if (d.isSunday) {
            headerBg = "bg-rose-100";
            dayBadgeStyle = "bg-rose-200 text-rose-900 font-extrabold";
        } else if (d.isSaturday) {
            headerBg = "bg-sky-100";
            dayBadgeStyle = "bg-sky-200 text-sky-900 font-extrabold";
        }
        html += `
            <th class="p-1 border-r border-b border-slate-300 min-w-[74px] sticky-col-header font-bold align-middle ${headerBg}">
                <div class="font-black text-xs py-0.5 rounded-md ${dayBadgeStyle}">
                    ${d.day} <span class="text-[10px] font-bold">(${d.dayOfWeek})</span>
                </div>
            </th>
        `;
    });

    html += `
                        <th class="p-2 border-l border-b border-slate-300 min-w-[175px] w-[175px] text-center font-bold sticky-col-corner-right align-middle">
                            <div>月間予測集計</div>
                            <div class="text-[9px] text-slate-500 font-normal">(実績+予測)平均 × 勤務日数</div>
                        </th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (displayMembers.length === 0) {
        html += `
            <tr>
                <td colspan="${days.length + 2}" class="p-8 text-center text-slate-400 font-bold bg-slate-50">
                    該当するスタッフがいません。
                </td>
            </tr>
        `;
    } else {
        displayMembers.forEach(m => {
            let cellsHtml = '';

            days.forEach(d => {
                const key = `${m.id}_${d.dateStr}`;
                const shiftCell = getCellData(key);
                const isHoliday = isHolidayValue(shiftCell.shiftId);

                const actual = state.actualWorkTimes ? state.actualWorkTimes[key] : null;
                const actualWorkSec = actual
                    ? (typeof actual.workSec === 'number' ? actual.workSec : (typeof actual.workMin === 'number' ? actual.workMin * 60 : null))
                    : null;
                const actualRestraintSec = actual
                    ? (typeof actual.restraintSec === 'number' ? actual.restraintSec : (typeof actual.restraintMin === 'number' ? actual.restraintMin * 60 : null))
                    : null;
                const hasActualWork = actualWorkSec !== null;
                const hasActualRestraint = actualRestraintSec !== null;

                const pred = getPredictedSecondsForDay(m.id, d.dateStr);
                const effWork = hasActualWork ? actualWorkSec : pred.workSec;
                const effRestraint = hasActualRestraint ? actualRestraintSec : pred.restraintSec;

                if (isHoliday && !hasActualWork && !hasActualRestraint) {
                    const hType = getHolidayType(shiftCell.shiftId);
                    const shortName = hType ? hType.shortName : shiftCell.shiftId;
                    const color = hType ? hType.color : '#f43f5e';
                    cellsHtml += `
                        <td onclick="openWorkTimeCellModal('${m.id}', '${d.dateStr}')" class="p-1 border-r border-b border-slate-300 cursor-pointer hover:opacity-80 text-[11px] font-extrabold" style="background-color: ${color}15; color: ${color};" title="クリックして実績時間を入力">
                            ${shortName}
                        </td>
                    `;
                    return;
                }

                const isSplitHighlight = pred.isSplit && !hasActualWork && !hasActualRestraint;
                let bgClass = "bg-white hover:bg-slate-50";
                if (d.isSunday) bgClass = "bg-rose-50/30 hover:bg-rose-50/60";
                if (d.isSaturday) bgClass = "bg-sky-50/30 hover:bg-sky-50/60";
                if (hasActualWork || hasActualRestraint) {
                    bgClass = "bg-emerald-50/60 hover:bg-emerald-100/70";
                } else if (isSplitHighlight) {
                    bgClass = "bg-violet-50/90 hover:bg-violet-100/90 ring-1 ring-inset ring-violet-400";
                }

                const splitModeLabelMap = { sum: '合', first: '前', second: '後' };
                const splitBadge = isSplitHighlight
                    ? `<div class="flex justify-end leading-none mb-0.5"><span class="px-1 py-0 rounded bg-violet-200/90 text-violet-900 text-[8px] font-black">分割(${splitModeLabelMap[pred.splitMode] || '合'})</span></div>`
                    : '';

                const workRow = effWork !== null
                    ? (hasActualWork
                        ? `<div class="text-[10px] font-black text-emerald-800 leading-tight whitespace-nowrap"><span class="text-[8px] px-0.5 rounded bg-emerald-200/80 mr-0.5">実</span>${formatSecondsToHHMMSS(effWork)}</div>`
                        : `<div class="text-[10px] font-bold text-indigo-700 leading-tight whitespace-nowrap"><span class="text-[8px] px-0.5 rounded bg-indigo-100 mr-0.5">予</span>${formatSecondsToHHMMSS(effWork)}</div>`)
                    : `<div class="text-[10px] text-slate-300 leading-tight">ー</div>`;

                const restraintRow = effRestraint !== null
                    ? (hasActualRestraint
                        ? `<div class="text-[10px] font-black text-amber-900 leading-tight mt-0.5 whitespace-nowrap"><span class="text-[8px] px-0.5 rounded bg-amber-200/80 mr-0.5">実</span>${formatSecondsToHHMMSS(effRestraint)}</div>`
                        : `<div class="text-[10px] font-semibold text-slate-600 leading-tight mt-0.5 whitespace-nowrap"><span class="text-[8px] px-0.5 rounded bg-slate-200/80 mr-0.5">予</span>${formatSecondsToHHMMSS(effRestraint)}</div>`)
                    : `<div class="text-[10px] text-slate-300 leading-tight mt-0.5">ー</div>`;

                cellsHtml += `
                    <td onclick="openWorkTimeCellModal('${m.id}', '${d.dateStr}')" class="p-1 border-r border-b border-slate-300 cursor-pointer select-none ${bgClass}" title="${isSplitHighlight ? '分割シフト（クリックして使用コース選択・実績入力）' : 'クリックして実績時間を編集'}">
                        ${splitBadge}
                        ${workRow}
                        ${restraintRow}
                    </td>
                `;
            });

            const summary = getMemberMonthlyForecastSummary(m.id, days);
            const { workDays, avgWorkSec, avgRestraintSec, forecastWorkSec, forecastRestraintSec, actualDayCount, predDayCount, isOverRestraint } = summary;
            const overCellClass = isOverRestraint ? 'member-over-restraint-cell' : 'text-slate-800';
            const overNameClass = isOverRestraint ? 'text-rose-700' : '';
            const restraintDisplayClass = isOverRestraint
                ? 'font-black text-rose-600 bg-rose-100 px-1 rounded border border-rose-300'
                : 'font-black text-amber-950';

            html += `<tr class="border-b border-slate-300">`;
            html += `
                <td class="p-1.5 px-2 border-r border-b border-slate-300 font-bold sticky-col-left shadow-2xs text-left ${overCellClass}">
                    <div class="flex items-center gap-1 min-w-0">
                        <span class="truncate text-xs font-bold ${overNameClass}">${m.name}</span>
                    </div>
                    <div class="text-[10px] ${isOverRestraint ? 'text-rose-600' : 'text-slate-500'} font-semibold mt-0.5">勤務 ${workDays}日</div>
                </td>
            `;
            html += cellsHtml;
            html += `
                <td class="p-1.5 px-2 border-l border-b border-slate-300 bg-slate-50 sticky-col-right text-left">
                    <div class="space-y-0.5">
                        <div class="flex items-center justify-between gap-1 text-[11px]">
                            <span class="font-bold text-indigo-700">予測労働:</span>
                            <span class="font-black text-indigo-900">${formatSecondsToHHMMSS(forecastWorkSec)}</span>
                        </div>
                        <div class="flex items-center justify-between gap-1 text-[11px]">
                            <span class="font-bold ${isOverRestraint ? 'text-rose-600' : 'text-amber-800'}">予測拘束:</span>
                            <span class="${restraintDisplayClass}">${formatSecondsToHHMMSS(forecastRestraintSec)}</span>
                        </div>
                        <div class="text-[9px] text-slate-500 flex items-center justify-between gap-1 pt-0.5 border-t border-slate-200">
                            <span>平均 ${formatSecondsToHHMMSS(avgWorkSec)} / ${formatSecondsToHHMMSS(avgRestraintSec)}</span>
                            <span class="shrink-0">実${actualDayCount} 予${predDayCount}</span>
                        </div>
                    </div>
                </td>
            </tr>`;
        });
    }

    html += `</tbody></table></div>`;
    container.innerHTML = html;

    const newScroll = container.querySelector('#worktime-scroll-wrapper');
    if (newScroll) {
        newScroll.scrollTop = prevScrollTop;
        newScroll.scrollLeft = prevScrollLeft;
    }
}

// ==========================================
// セル個別編集モーダル（実績値入力）
// ==========================================

function openWorkTimeCellModal(memberId, dateStr) {
    const member = state.members.find(m => m.id === memberId);
    if (!member) return;

    const key = `${memberId}_${dateStr}`;
    const actual = (state.actualWorkTimes && state.actualWorkTimes[key]) ? state.actualWorkTimes[key] : {};
    const actualWorkSec = (typeof actual.workSec === 'number') ? actual.workSec : (typeof actual.workMin === 'number' ? actual.workMin * 60 : null);
    const actualRestraintSec = (typeof actual.restraintSec === 'number') ? actual.restraintSec : (typeof actual.restraintMin === 'number' ? actual.restraintMin * 60 : null);
    const pred = getPredictedSecondsForDay(memberId, dateStr);

    document.getElementById('wt-cell-member-id').value = memberId;
    document.getElementById('wt-cell-date-str').value = dateStr;
    document.getElementById('wt-cell-title').innerText = `${member.name} / ${dateStr}`;
    document.getElementById('wt-cell-pred-info').innerText =
        `コース予測値 → 労働: ${formatSecondsToHHMMSS(pred.workSec)} ／ 拘束: ${formatSecondsToHHMMSS(pred.restraintSec)}`;

    // 分割コースかつ実績未入力の場合のみ、使用する予測コース選択を表示
    const splitBox = document.getElementById('wt-cell-split-box');
    const splitOptionsEl = document.getElementById('wt-cell-split-options');
    if (splitBox && splitOptionsEl) {
        if (pred.isSplit && actualWorkSec === null && actualRestraintSec === null) {
            const getCrsName = (cid) => {
                const c = state.courses.find(item => item.id === cid);
                return c ? c.name : '未割当';
            };
            const firstName = getCrsName(pred.firstId);
            const secondName = getCrsName(pred.secondId);
            const sumPred = getPredictedSecondsForDay(memberId, dateStr, 'sum');
            const firstPred = getPredictedSecondsForDay(memberId, dateStr, 'first');
            const secondPred = getPredictedSecondsForDay(memberId, dateStr, 'second');
            const curChoice = actual.splitChoice || state.workTimeSplitMode || 'sum';

            const opts = [
                { val: 'sum', label: `前後半の合計 (${firstName} + ${secondName})`, p: sumPred },
                { val: 'first', label: `前半のみ (${firstName})`, p: firstPred },
                { val: 'second', label: `後半のみ (${secondName})`, p: secondPred }
            ];
            splitOptionsEl.innerHTML = opts.map(o => `
                <label class="flex items-center justify-between gap-2 p-1.5 rounded-lg border cursor-pointer text-xs ${curChoice === o.val ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-bold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}">
                    <span class="flex items-center gap-1.5">
                        <input type="radio" name="wt-cell-split-choice" value="${o.val}" ${curChoice === o.val ? 'checked' : ''} class="text-indigo-600">
                        <span>${o.label}</span>
                    </span>
                    <span class="text-[10px] font-mono text-slate-600">労 ${formatSecondsToHHMMSS(o.p.workSec)} / 拘 ${formatSecondsToHHMMSS(o.p.restraintSec)}</span>
                </label>
            `).join('');
            splitBox.classList.remove('hidden');
        } else {
            splitBox.classList.add('hidden');
        }
    }

    document.getElementById('wt-cell-work-input').value =
        actualWorkSec !== null ? formatSecondsToHHMMSS(actualWorkSec) : '';
    document.getElementById('wt-cell-restraint-input').value =
        actualRestraintSec !== null ? formatSecondsToHHMMSS(actualRestraintSec) : '';

    document.getElementById('worktime-cell-modal').classList.remove('hidden');
}

function closeWorkTimeCellModal() {
    document.getElementById('worktime-cell-modal').classList.add('hidden');
}

function saveWorkTimeCell() {
    const memberId = document.getElementById('wt-cell-member-id').value;
    const dateStr = document.getElementById('wt-cell-date-str').value;
    const rawWork = document.getElementById('wt-cell-work-input').value;
    const rawRestraint = document.getElementById('wt-cell-restraint-input').value;

    const workSec = parseTimeToSeconds(rawWork);
    const restraintSec = parseTimeToSeconds(rawRestraint);
    if (workSec === undefined || restraintSec === undefined) {
        showMessageModal("時間の形式が正しくありません。「8:30:00」「8:30」「8.5」のいずれかの形式で入力してください。");
        return;
    }

    const splitChoiceEl = document.querySelector('input[name="wt-cell-split-choice"]:checked');
    const splitBox = document.getElementById('wt-cell-split-box');
    const splitChoice = (splitBox && !splitBox.classList.contains('hidden') && splitChoiceEl)
        ? splitChoiceEl.value
        : null;

    if (!state.actualWorkTimes) state.actualWorkTimes = {};
    const key = `${memberId}_${dateStr}`;
    let syncVal = null;
    if (workSec === null && restraintSec === null && (!splitChoice || splitChoice === 'sum')) {
        delete state.actualWorkTimes[key];
    } else {
        const entry = { workSec, restraintSec };
        if (workSec === null && restraintSec === null && splitChoice) {
            entry.splitChoice = splitChoice;
        }
        state.actualWorkTimes[key] = entry;
        syncVal = entry;
    }

    closeWorkTimeCellModal();
    saveData();
    renderWorkTimeTab();
    if (typeof syncActualWorkTimesToCloud === 'function') {
        syncActualWorkTimesToCloud({ [key]: syncVal });
    } else if (typeof saveCurrentMonthShiftToCloud === 'function') {
        saveCurrentMonthShiftToCloud(true);
    }
}

function clearWorkTimeCell() {
    const memberId = document.getElementById('wt-cell-member-id').value;
    const dateStr = document.getElementById('wt-cell-date-str').value;
    const key = `${memberId}_${dateStr}`;
    if (state.actualWorkTimes) {
        delete state.actualWorkTimes[key];
    }
    closeWorkTimeCellModal();
    saveData();
    renderWorkTimeTab();
    if (typeof syncActualWorkTimesToCloud === 'function') {
        syncActualWorkTimesToCloud({ [key]: null });
    } else if (typeof saveCurrentMonthShiftToCloud === 'function') {
        saveCurrentMonthShiftToCloud(true);
    }
}

// ==========================================
// コース予測値（平均労働・平均拘束）設定＆Excel貼付
// ==========================================

function openCourseWorkTimeModal() {
    const ta = document.getElementById('course-worktime-import-textarea');
    if (ta) ta.value = '';
    renderCourseWorkTimeList();
    document.getElementById('course-worktime-modal').classList.remove('hidden');
}

function closeCourseWorkTimeModal() {
    document.getElementById('course-worktime-modal').classList.add('hidden');
}

function renderCourseWorkTimeList() {
    const tbody = document.getElementById('course-worktime-table-body');
    if (!tbody) return;
    tbody.innerHTML = state.courses.map(crs => {
        const { workSec, restraintSec } = getCourseAvgSeconds(crs.id);
        const w = workSec !== null ? formatSecondsToHHMMSS(workSec) : '';
        const r = restraintSec !== null ? formatSecondsToHHMMSS(restraintSec) : '';
        return `
            <tr class="border-b border-slate-200">
                <td class="p-1.5 font-bold text-slate-700 text-left">${crs.order}. ${crs.name}</td>
                <td class="p-1"><input type="text" data-course-id="${crs.id}" data-field="work" value="${w}" placeholder="8:30:00" class="w-24 p-1 border border-slate-300 rounded text-center text-xs font-bold"></td>
                <td class="p-1"><input type="text" data-course-id="${crs.id}" data-field="restraint" value="${r}" placeholder="10:00:00" class="w-24 p-1 border border-slate-300 rounded text-center text-xs font-bold"></td>
            </tr>
        `;
    }).join('');
}

function applyCourseWorkTimePaste() {
    const ta = document.getElementById('course-worktime-import-textarea');
    const text = ta ? ta.value : '';
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
        showMessageModal("貼り付けデータが空です。");
        return;
    }

    const normalize = (s) => (s || '').replace(/[\s\u3000]+/g, '').toLowerCase();
    let updated = 0;
    const unmatched = [];

    lines.forEach(line => {
        const cols = line.includes('\t') ? line.split('\t') : line.split(',');
        if (cols.length < 2) return;
        const rawCourse = (cols[0] || '').trim();
        if (!rawCourse || rawCourse.includes('コース')) {
            if (rawCourse === 'コース名' || rawCourse === 'コース') return;
        }
        const normName = normalize(rawCourse);
        const crs = state.courses.find(c => normalize(c.name) === normName || normalize(c.name.replace('コース', '')) === normName);
        if (!crs) {
            unmatched.push(rawCourse);
            return;
        }

        const workSec = parseTimeToSeconds(cols[1]);
        const restraintSec = cols.length >= 3 ? parseTimeToSeconds(cols[2]) : null;
        if (workSec !== undefined) crs.avgWorkSec = workSec;
        if (restraintSec !== undefined) crs.avgRestraintSec = restraintSec;
        updated++;
    });

    renderCourseWorkTimeList();
    saveData();
    renderWorkTimeTab();
    if (typeof saveMasterToCloud === 'function') saveMasterToCloud(true);

    let msg = `${updated}件のコース予測時間を取り込みました。`;
    if (unmatched.length > 0) msg += `\n[未一致コース]: ${unmatched.join(', ')}`;
    showMessageModal(msg);
}

function saveCourseWorkTimeInputs() {
    const inputs = document.querySelectorAll('#course-worktime-table-body input');
    for (const inp of inputs) {
        const val = parseTimeToSeconds(inp.value);
        if (val === undefined) {
            showMessageModal(`「${inp.value}」の形式が不正です。8:30:00、8:30、または 8.5 の形式で入力してください。`);
            return;
        }
        const crs = state.courses.find(c => c.id === inp.dataset.courseId);
        if (crs) {
            if (inp.dataset.field === 'work') crs.avgWorkSec = val;
            if (inp.dataset.field === 'restraint') crs.avgRestraintSec = val;
        }
    }
    closeCourseWorkTimeModal();
    saveData();
    renderWorkTimeTab();
    if (typeof saveMasterToCloud === 'function') saveMasterToCloud(true);
}

// ==========================================
// 実績値マトリクス Excel貼付モーダル
// ==========================================

function openActualWorkTimeImportModal() {
    const ta = document.getElementById('actual-worktime-import-textarea');
    if (ta) ta.value = '';
    document.getElementById('actual-worktime-import-modal').classList.remove('hidden');
}

function closeActualWorkTimeImportModal() {
    document.getElementById('actual-worktime-import-modal').classList.add('hidden');
}

function executeActualWorkTimeImport() {
    const targetType = document.querySelector('input[name="actual-import-type"]:checked')?.value || 'work';
    const ta = document.getElementById('actual-worktime-import-textarea');
    const text = ta ? ta.value : '';
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length === 0) {
        showMessageModal("貼り付けデータが空です。");
        return;
    }

    const days = getMonthDays();
    const normalizeName = (s) => (s || '').replace(/[\s\u3000]+/g, '');
    if (!state.actualWorkTimes) state.actualWorkTimes = {};

    // 1行目が日付ヘッダーか判定
    const firstCols = lines[0].split('\t');
    let dayColumnMap = null; // colIdx -> dayNum
    let startRow = 0;

    const parsedHeaderDays = firstCols.slice(1).map(c => {
        const m = String(c).trim().match(/^(\d{1,2})日?$/);
        return m ? parseInt(m[1], 10) : null;
    });
    if (parsedHeaderDays.some(d => d !== null && d >= 1 && d <= 31)) {
        dayColumnMap = {};
        parsedHeaderDays.forEach((dNum, idx) => {
            if (dNum !== null && dNum >= 1 && dNum <= days.length) {
                dayColumnMap[idx + 1] = dNum;
            }
        });
        startRow = 1;
    }

    let updatedCells = 0;
    const unmatched = [];
    const cloudUpdates = {};

    for (let r = startRow; r < lines.length; r++) {
        const cols = lines[r].split('\t');
        const rawName = (cols[0] || '').trim();
        if (!rawName) continue;

        const normTarget = normalizeName(rawName);
        const member = state.members.find(m => normalizeName(m.name) === normTarget);
        if (!member) {
            unmatched.push(rawName);
            continue;
        }

        for (let c = 1; c < cols.length; c++) {
            const dayNum = dayColumnMap ? dayColumnMap[c] : c;
            const dayObj = days[dayNum - 1];
            if (!dayObj) continue;

            const rawVal = (cols[c] || '').trim();
            if (rawVal === '') continue; // 空欄は既存維持

            const seconds = parseTimeToSeconds(rawVal);
            if (seconds === undefined) continue;

            const key = `${member.id}_${dayObj.dateStr}`;
            const existing = state.actualWorkTimes[key] || {};
            const prev = {
                workSec: typeof existing.workSec === 'number' ? existing.workSec : (typeof existing.workMin === 'number' ? existing.workMin * 60 : null),
                restraintSec: typeof existing.restraintSec === 'number' ? existing.restraintSec : (typeof existing.restraintMin === 'number' ? existing.restraintMin * 60 : null)
            };
            if (targetType === 'work') prev.workSec = seconds;
            else prev.restraintSec = seconds;

            if (prev.workSec === null && prev.restraintSec === null) {
                delete state.actualWorkTimes[key];
                cloudUpdates[key] = null;
            } else {
                state.actualWorkTimes[key] = prev;
                cloudUpdates[key] = prev;
            }
            updatedCells++;
        }
    }

    closeActualWorkTimeImportModal();
    saveData();
    renderWorkTimeTab();
    if (typeof syncActualWorkTimesToCloud === 'function') {
        syncActualWorkTimesToCloud(cloudUpdates);
    } else if (typeof saveCurrentMonthShiftToCloud === 'function') {
        saveCurrentMonthShiftToCloud(true);
    }

    const label = targetType === 'work' ? '労働時間' : '拘束時間';
    let msg = `${label}の実績データを ${updatedCells} マス取り込みました。`;
    if (unmatched.length > 0) msg += `\n[未一致スタッフ]: ${unmatched.join(', ')}`;
    showMessageModal(msg);
}
