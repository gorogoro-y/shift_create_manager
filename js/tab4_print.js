// js/tab4_print.js
// タブ4: 帳票印刷（思考モード ＆ 印刷モード / 上旬・下旬切替 / B4縦対応）

function setPrintMode(mode) {
    state.printMode = mode;
    updatePrintToolbarUI();
    renderPrintTab();
}

function setPrintPeriod(period) {
    state.printPeriod = period;
    initCutoffSelectOptions();
    updatePrintToolbarUI();
    renderPrintTab();
}

function onPrintCutoffChange(val) {
    state.printCutoffDay = parseInt(val) || 15;
    renderPrintTab();
}

function updatePrintToolbarUI() {
    const btnThinking = document.getElementById('btn-mode-thinking');
    const btnPrint = document.getElementById('btn-mode-print');
    const btnFirst = document.getElementById('btn-period-first');
    const btnSecond = document.getElementById('btn-period-second');
    const cutoffContainer = document.getElementById('print-cutoff-container');

    if (btnThinking && btnPrint) {
        if (state.printMode === 'thinking') {
            btnThinking.className = "px-3 py-1.5 rounded-md text-xs font-bold transition bg-white text-indigo-700 shadow-xs";
            btnPrint.className = "px-3 py-1.5 rounded-md text-xs font-bold transition text-slate-600 hover:text-slate-900";
            if (cutoffContainer) cutoffContainer.classList.add('hidden');
        } else {
            btnThinking.className = "px-3 py-1.5 rounded-md text-xs font-bold transition text-slate-600 hover:text-slate-900";
            btnPrint.className = "px-3 py-1.5 rounded-md text-xs font-bold transition bg-white text-indigo-700 shadow-xs";
            if (cutoffContainer) cutoffContainer.classList.remove('hidden');
        }
    }

    if (btnFirst && btnSecond) {
        if (state.printPeriod === 'first') {
            btnFirst.className = "px-3 py-1.5 rounded-md text-xs font-bold transition bg-white text-indigo-700 shadow-xs";
            btnSecond.className = "px-3 py-1.5 rounded-md text-xs font-bold transition text-slate-600 hover:text-slate-900";
        } else {
            btnFirst.className = "px-3 py-1.5 rounded-md text-xs font-bold transition text-slate-600 hover:text-slate-900";
            btnSecond.className = "px-3 py-1.5 rounded-md text-xs font-bold transition bg-white text-indigo-700 shadow-xs";
        }
    }
}

function initCutoffSelectOptions() {
    const select = document.getElementById('print-cutoff-select');
    if (!select) return;

    const numDays = new Date(state.currentYear, state.currentMonth, 0).getDate();
    let startDay = 1, endDay = 15;
    if (state.printPeriod === 'second') {
        startDay = 16;
        endDay = numDays;
    }

    // デフォルトカットオフ日
    if (!state.printCutoffDay || state.printCutoffDay < startDay || state.printCutoffDay > endDay) {
        state.printCutoffDay = endDay;
    }

    let optionsHtml = '';
    for (let d = startDay; d <= endDay; d++) {
        const isSelected = d === state.printCutoffDay ? 'selected' : '';
        optionsHtml += `<option value="${d}" ${isSelected}>${d}日</option>`;
    }
    select.innerHTML = optionsHtml;
}

function executePrint() {
    window.print();
}

// コースの表示名フォーマット（分割時はスラッシュ区切り）
function getFormattedCourseName(ca) {
    if (!ca) return '';
    if (!ca.isSplit) {
        if (!ca.courseId) return '';
        const crs = state.courses.find(c => c.id === ca.courseId);
        return crs ? crs.name : ca.courseId;
    } else {
        const first = ca.firstHalf?.courseId ? (state.courses.find(c => c.id === ca.firstHalf.courseId)?.name || ca.firstHalf.courseId) : '';
        const second = ca.secondHalf?.courseId ? (state.courses.find(c => c.id === ca.secondHalf.courseId)?.name || ca.secondHalf.courseId) : '';
        // 略記（「01コース」などの場合は数字部分を優先、またはフル名）
        const formatC = (str) => str.replace(/コース$/, '');
        if (first && second) {
            return `${formatC(first)} / ${formatC(second)}`;
        } else if (first) {
            return `${formatC(first)} / ー`;
        } else if (second) {
            return `ー / ${formatC(second)}`;
        }
        return '';
    }
}

function renderPrintTab() {
    const container = document.getElementById('print-table-container');
    if (!container) return;

    updatePrintToolbarUI();
    initCutoffSelectOptions();

    const allDays = getMonthDays();
    const numDays = allDays.length;

    // 期間（上旬 / 下旬）の抽出
    let days = [];
    let periodTitle = '';
    if (state.printPeriod === 'first') {
        days = allDays.slice(0, 15);
        periodTitle = '上旬（1日 〜 15日）';
    } else {
        days = allDays.slice(15);
        periodTitle = `下旬（16日 〜 ${numDays}日）`;
    }

    const cutoffDay = state.printCutoffDay || (state.printPeriod === 'first' ? 15 : numDays);
    const isThinking = state.printMode === 'thinking';

    // 帳票タイトルヘッダー
    let html = `
        <div class="print-header mb-3 flex justify-between items-end border-b-2 border-slate-800 pb-2">
            <div>
                <span class="text-xs font-bold text-slate-500 tracking-wider">SHIFT ROSTER MANAGEMENT</span>
                <h2 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none mt-0.5">
                    ${state.currentYear}年 ${state.currentMonth}月 運行シフト表
                    <span class="text-sm sm:text-base font-bold text-indigo-700 ml-2">【${periodTitle}】</span>
                </h2>
            </div>
            <div class="text-right">
                <span class="inline-block px-2.5 py-0.5 rounded text-xs font-black ${isThinking ? 'bg-indigo-100 text-indigo-900 border border-indigo-300' : 'bg-slate-800 text-white'}">
                    ${isThinking ? '🧠 思考確認モード' : '🖨️ 運行配車表（印刷）'}
                </span>
                <div class="text-[10px] text-slate-400 mt-1">作成日: ${new Date().toLocaleDateString('ja-JP')}</div>
            </div>
        </div>
    `;

    // 帳票テーブル
    html += `
        <table class="w-full text-center border-collapse text-xs print-table border border-slate-700">
            <thead>
                <tr class="bg-slate-100 text-slate-800 font-extrabold border-b border-slate-700">
                    <th class="p-1.5 border border-slate-700 w-28 sm:w-36 text-center text-xs tracking-wider">
                        担当スタッフ
                    </th>
    `;

    // 日付ヘッダー
    days.forEach(d => {
        let colBg = "bg-slate-100";
        let dayColor = "text-slate-900";
        if (d.isSunday) {
            colBg = "bg-rose-50";
            dayColor = "text-rose-600 font-black";
        } else if (d.isSaturday) {
            colBg = "bg-sky-50";
            dayColor = "text-sky-600 font-black";
        }

        html += `
            <th class="p-1 border border-slate-700 text-center ${colBg}">
                <div class="flex flex-col items-center justify-center leading-tight">
                    <span class="text-sm font-black text-slate-800">${d.day}</span>
                    <span class="text-[10px] ${dayColor}">(${d.dayOfWeek})</span>
                </div>
            </th>
        `;
    });

    html += `</tr></thead><tbody>`;

    // スタッフ行
    state.members.forEach((member, idx) => {
        const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50';
        html += `
            <tr class="${rowBg} border-b border-slate-600">
                <td class="p-1.5 border border-slate-700 font-bold text-slate-900 text-left pl-2 whitespace-nowrap">
                    <div class="flex items-center justify-between gap-1">
                        <span class="font-extrabold text-xs">${member.name}</span>
                        ${member.attributes && member.attributes.length > 0 && isThinking ? `
                            <span class="text-[9px] px-1 py-0.2 rounded bg-slate-200 text-slate-700 font-bold">
                                ${state.staffAttributes.find(a => a.id === member.attributes[0])?.shortName || ''}
                            </span>
                        ` : ''}
                    </div>
                </td>
        `;

        days.forEach(d => {
            const cell = getCellData(`${member.id}_${d.dateStr}`);
            const isHoliday = isHolidayValue(cell.shiftId);
            const ca = getCourseAssignment(member.id, d.dateStr);
            const courseName = getFormattedCourseName(ca);
            const isBeyondCutoff = !isThinking && (d.day > cutoffDay);

            let cellContent = '';
            let cellStyle = '';

            if (isThinking) {
                // === 思考モード ===
                if (isHoliday) {
                    const hType = getHolidayType(cell.shiftId);
                    const shortName = hType ? hType.shortName : cell.shiftId;
                    // 休みは一律グレー塗りつぶし＋文字表示
                    cellContent = `<span class="font-extrabold text-xs text-slate-700">${shortName}</span>`;
                    cellStyle = 'background-color: #cbd5e1;'; // slate-300
                } else if (courseName) {
                    // タブ3にてコース割当あり: 黒文字でコース名を表示、背景/属性バッジ併記
                    const shiftObj = state.shiftTypes.find(s => s.id === cell.shiftId);
                    const colorObj = state.colorTypes.find(c => c.id === cell.colorId);

                    let attrDot = '';
                    if (colorObj) {
                        attrDot = `<span class="inline-block w-1.5 h-1.5 rounded-full mr-0.5" style="background-color: ${colorObj.color}" title="${colorObj.name}"></span>`;
                    } else if (shiftObj) {
                        attrDot = `<span class="inline-block w-1.5 h-1.5 rounded-full mr-0.5" style="background-color: ${shiftObj.color}" title="${shiftObj.name}"></span>`;
                    }

                    cellContent = `
                        <div class="flex items-center justify-center font-black text-xs text-slate-900 leading-tight">
                            ${attrDot}<span>${courseName}</span>
                        </div>
                    `;
                    // 通し/単独等の背景色を極薄く適用
                    if (shiftObj) {
                        cellStyle = `background-color: ${shiftObj.color}15;`;
                    }
                } else {
                    // コース未割当: タブ2と同じ属性（通し・単独、点呼等）を表示
                    const shiftObj = state.shiftTypes.find(s => s.id === cell.shiftId);
                    const colorObj = state.colorTypes.find(c => c.id === cell.colorId);

                    if (colorObj) {
                        cellContent = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-2xs inline-block" style="background-color: ${colorObj.color}">${colorObj.shortName}</span>`;
                    } else if (shiftObj) {
                        cellContent = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-2xs inline-block" style="background-color: ${shiftObj.color}">${shiftObj.shortName}</span>`;
                    } else {
                        cellContent = `<span class="text-slate-300 text-[10px]">ー</span>`;
                    }
                }
            } else {
                // === 印刷モード ===
                if (isHoliday) {
                    const hType = getHolidayType(cell.shiftId);
                    const shortName = hType ? hType.shortName : cell.shiftId;
                    const isPaidLeave = (shortName === '有' || cell.shiftId === '有' || cell.shiftId === 'h_paid');

                    // 休みはグレー塗りつぶし。有給のみ赤文字、他は黒文字
                    if (isPaidLeave) {
                        cellContent = `<span class="font-black text-xs text-rose-600">${shortName}</span>`;
                    } else {
                        cellContent = `<span class="font-black text-xs text-slate-900">${shortName}</span>`;
                    }
                    cellStyle = 'background-color: #cbd5e1;'; // slate-300
                } else if (isBeyondCutoff) {
                    // カットオフ日以降: コースは印刷せず、出勤枠は空欄
                    cellContent = `<span class="text-slate-300 text-[10px]">ー</span>`;
                } else if (courseName) {
                    // タブ3で決まったコースのみ黒文字で表示（タブ2の内容は非表示）
                    cellContent = `<span class="font-black text-xs text-slate-900">${courseName}</span>`;
                } else {
                    cellContent = `<span class="text-slate-300 text-[10px]">ー</span>`;
                }
            }

            html += `
                <td class="p-1 border border-slate-700 text-center align-middle" style="${cellStyle}">
                    ${cellContent}
                </td>
            `;
        });

        html += `</tr>`;
    });

    html += `</tbody>`;

    // 最下部フッター行: 行事・イベント名
    html += `
        <tfoot>
            <tr class="bg-amber-50/70 border-t-2 border-slate-800 font-bold">
                <td class="p-1.5 border border-slate-700 text-center font-black text-xs text-amber-950 bg-amber-100/90 whitespace-nowrap">
                    行事・イベント
                </td>
    `;

    days.forEach(d => {
        const eventVal = state.dailyEvents?.[d.dateStr] || '';
        html += `
            <td class="p-1 border border-slate-700 text-center align-middle bg-amber-50/60">
                ${eventVal ? `
                    <div class="px-1 py-0.5 rounded text-[9px] font-black text-amber-950 bg-amber-200/80 border border-amber-300/80 leading-tight truncate shadow-2xs" title="${eventVal}">
                        ${eventVal}
                    </div>
                ` : `<span class="text-slate-300 text-[10px]">ー</span>`}
            </td>
        `;
    });

    html += `
            </tr>
        </tfoot>
    </table>
    `;

    container.innerHTML = html;
}

window.setPrintMode = setPrintMode;
window.setPrintPeriod = setPrintPeriod;
window.onPrintCutoffChange = onPrintCutoffChange;
window.executePrint = executePrint;
window.renderPrintTab = renderPrintTab;
