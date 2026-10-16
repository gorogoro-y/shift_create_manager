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

function getFormattedPrintTimestamp() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${y}/${m}/${day} ${h}:${min}:${s}`;
}

// コース表示名バッジ（文字長に応じた自動フォントサイズ調整で大きく読みやすく枠内に収める）
function renderCourseBadge(courseName) {
    if (!courseName) return '';
    const len = courseName.length;
    let sizeClass = 'text-sm sm:text-base';
    if (len >= 10) {
        sizeClass = 'text-[9px] sm:text-[10px] tracking-tighter leading-tight';
    } else if (len >= 7) {
        sizeClass = 'text-[10px] sm:text-[11px] tracking-tight leading-tight';
    } else if (len >= 5) {
        sizeClass = 'text-xs sm:text-[13px] tracking-tight leading-tight';
    } else if (len >= 3) {
        sizeClass = 'text-[13px] sm:text-sm leading-tight';
    }
    return `<span class="font-black ${sizeClass} text-slate-950 inline-block w-full text-center overflow-hidden text-ellipsis whitespace-nowrap select-none" title="${courseName}">${courseName}</span>`;
}

// 日付・曜日ヘッダー行のHTML生成（上部および中間地点用）
function renderDateHeaderRowsHtml(days, isMiddle = false) {
    const topBorderClass = isMiddle ? 'border-thick-top' : '';
    let dayNumCells = `<th class="p-1 border border-slate-700 bg-sky-50 text-slate-800 text-center font-bold text-xs tracking-wider"></th>`;
    let dayOfWeekCells = `<th class="p-0.5 border border-slate-700 bg-sky-50 text-slate-800 text-center font-bold text-xs tracking-wider"></th>`;

    days.forEach(d => {
        let dayColor = "text-slate-900";
        if (d.isSunday) dayColor = "text-rose-600 font-black";
        else if (d.isSaturday) dayColor = "text-sky-600 font-black";

        dayNumCells += `
            <th class="p-1 border border-slate-700 bg-sky-50 text-center font-black text-xs sm:text-sm text-slate-900 overflow-hidden">
                ${d.day}
            </th>
        `;
        dayOfWeekCells += `
            <th class="p-0.5 border border-slate-700 bg-sky-50 text-center font-black text-xs ${dayColor} overflow-hidden">
                ${d.dayOfWeek}
            </th>
        `;
    });

    return `
        <tr class="header-days-row ${topBorderClass}">${dayNumCells}</tr>
        <tr class="header-weekdays-row border-thick-bottom">${dayOfWeekCells}</tr>
    `;
}

function renderPrintTab() {
    const container = document.getElementById('print-table-container');
    if (!container) return;

    updatePrintToolbarUI();
    initCutoffSelectOptions();

    // 拠点名インプットの同期
    const printBranchInput = document.getElementById('print-branch-title-input');
    if (printBranchInput) printBranchInput.value = state.printBranchTitle || '福岡支店 (ローソンB/C便)';

    const allDays = getMonthDays();
    const numDays = allDays.length;

    // 期間（上旬 / 下旬）の抽出
    let days = [];
    if (state.printPeriod === 'first') {
        days = allDays.slice(0, 15);
    } else {
        days = allDays.slice(15);
    }

    const cutoffDay = state.printCutoffDay || (state.printPeriod === 'first' ? 15 : numDays);
    const isThinking = state.printMode === 'thinking';
    const branchTitle = state.printBranchTitle || '福岡支店 (ローソンB/C便)';

    // スタッフの分類（一般班、同乗専門、待機）
    const regularMembers = [];
    const trainingMembers = [];
    const standbyMembers = [];

    state.members.forEach(m => {
        const role = getMemberRole(m);
        if (role === 'training_only') {
            trainingMembers.push(m);
        } else if (role === 'standby') {
            standbyMembers.push(m);
        } else {
            regularMembers.push(m);
        }
    });

    // 一般班におけるリーダーインデックスの検出
    const leaderIndices = [];
    regularMembers.forEach((m, idx) => {
        if (getMemberRole(m) === 'leader') {
            leaderIndices.push(idx);
        }
    });

    // 中間地点の決定（リーダー班の中間、またはスタッフ数の中間）
    let midPointIndex = -1;
    if (leaderIndices.length >= 2) {
        const midLeaderNum = Math.ceil(leaderIndices.length / 2);
        midPointIndex = leaderIndices[midLeaderNum] !== undefined ? leaderIndices[midLeaderNum] : Math.floor(regularMembers.length / 2);
    } else if (regularMembers.length > 10) {
        midPointIndex = Math.floor(regularMembers.length / 2);
    }

    // 単一スタッフ行の描画ヘルパー
    const renderMemberRow = (member, extraRowClass = '') => {
        let rowHtml = `
            <tr class="border-b border-slate-700 bg-white hover:bg-slate-50 ${extraRowClass}">
                <td class="p-1 px-1.5 border border-slate-700 font-extrabold text-slate-900 text-left whitespace-nowrap overflow-hidden text-ellipsis text-xs sm:text-sm">
                    ${member.name}
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
                    cellContent = `<span class="font-black text-xs text-slate-800">${shortName}</span>`;
                    cellStyle = 'background-color: #cbd5e1;'; // slate-300
                } else if (courseName) {
                    // コース割当あり: 自動サイズ調整付きで大きく表示
                    cellContent = renderCourseBadge(courseName);
                } else {
                    // コース未割当: タブ2のシフト属性（通し・単独、点呼等）を大きく表示
                    const shiftObj = state.shiftTypes.find(s => s.id === cell.shiftId);
                    const colorObj = state.colorTypes.find(c => c.id === cell.colorId);

                    if (colorObj) {
                        cellContent = `<span class="px-1 py-0.5 rounded text-xs sm:text-sm font-black text-white inline-block leading-tight max-w-full overflow-hidden text-ellipsis whitespace-nowrap" style="background-color: ${colorObj.color}">${colorObj.shortName}</span>`;
                    } else if (shiftObj) {
                        cellContent = `<span class="px-1 py-0.5 rounded text-xs sm:text-sm font-black text-white inline-block leading-tight max-w-full overflow-hidden text-ellipsis whitespace-nowrap" style="background-color: ${shiftObj.color}">${shiftObj.shortName}</span>`;
                    } else {
                        cellContent = `<span class="text-slate-300 text-xs">ー</span>`;
                    }
                }
            } else {
                // === 印刷モード ===
                if (isHoliday) {
                    const hType = getHolidayType(cell.shiftId);
                    const shortName = hType ? hType.shortName : cell.shiftId;
                    const isPaidLeave = (shortName === '有' || cell.shiftId === '有' || cell.shiftId === 'h_paid');
                    const isStandby = (shortName === '待' || cell.shiftId === '待' || cell.shiftId === 'h_standby');

                    if (isStandby) {
                        // 待機(待)の枠は空白（色も文字も入れない）
                        cellContent = '';
                        cellStyle = '';
                    } else {
                        if (isPaidLeave) {
                            cellContent = `<span class="font-black text-xs text-rose-600">${shortName}</span>`;
                        } else {
                            cellContent = `<span class="font-black text-xs text-slate-950">${shortName}</span>`;
                        }
                        cellStyle = 'background-color: #cbd5e1;'; // slate-300
                    }
                } else if (isBeyondCutoff) {
                    // カットオフ日以降: コースは印刷せず空欄
                    cellContent = '';
                } else if (courseName) {
                    // タブ3で決まったコース名のみを自動サイズ調整付きで大きく表示
                    cellContent = renderCourseBadge(courseName);
                } else {
                    cellContent = '';
                }
            }

            rowHtml += `
                <td class="p-0.5 border border-slate-700 text-center align-middle overflow-hidden" style="${cellStyle}">
                    ${cellContent}
                </td>
            `;
        });

        rowHtml += `</tr>`;
        return rowHtml;
    };

    // 列幅の均等計算（氏名列 14%、残り 86% を日付数で完全均等分割）
    const dayColWidthPercent = (86 / days.length).toFixed(4);

    // 帳票HTMLの構築
    let html = `
        <style>
            /* 画面表示 & 印刷共通のテーブル基本設定（太線・細線の2種類のみ） */
            .print-roster-table {
                table-layout: fixed !important;
                width: 100% !important;
                border-collapse: collapse !important;
                border: 2px solid #0f172a !important; /* 一番外の枠: 太線(2px) */
            }
            .print-roster-table th,
            .print-roster-table td {
                border: 1px solid #334155 !important; /* 全内部セル基本罫線: 細線(1px) */
                overflow: hidden;
            }
            /* 太線（強調境界線: 2px / 重複なし） */
            .print-roster-table tr.border-thick-top > th,
            .print-roster-table tr.border-thick-top > td {
                border-top: 2px solid #0f172a !important;
            }
            .print-roster-table tr.border-thick-bottom > th,
            .print-roster-table tr.border-thick-bottom > td {
                border-bottom: 2px solid #0f172a !important;
            }

            @media print {
                @page {
                    size: B4 portrait;
                    margin: 6mm 5mm;
                }
                body {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                .no-print {
                    display: none !important;
                }
                .print-roster-table {
                    table-layout: fixed !important;
                    width: 100% !important;
                    border-collapse: collapse !important;
                    border: 2px solid #0f172a !important;
                }
                .print-roster-table th,
                .print-roster-table td {
                    border: 1px solid #0f172a !important;
                }
                .print-roster-table tr.border-thick-top > th,
                .print-roster-table tr.border-thick-top > td {
                    border-top: 2px solid #0f172a !important;
                }
                .print-roster-table tr.border-thick-bottom > th,
                .print-roster-table tr.border-thick-bottom > td {
                    border-bottom: 2px solid #0f172a !important;
                }
            }
        </style>

        <div class="w-full">
            <table class="w-full text-center border-collapse text-xs print-roster-table shadow-sm">
                <!-- 列幅の完全固定・均等化 -->
                <colgroup>
                    <col style="width: 14%;">
                    ${days.map(() => `<col style="width: ${dayColWidthPercent}%;">`).join('')}
                </colgroup>
                <thead>
                    <!-- 最上段: 3分割タイトルヘッダー (年月 | シフト表 | 支店・便名) -->
                    <tr class="bg-white text-slate-900 border-thick-bottom">
                        <th class="p-2 border-r-2 border-slate-900 text-center font-black text-sm tracking-wider overflow-hidden">
                            ${state.currentYear}年${state.currentMonth}月
                        </th>
                        <th colspan="${Math.floor(days.length / 2) + 1}" class="p-2 border-r-2 border-slate-900 text-center font-black text-lg sm:text-xl tracking-widest overflow-hidden">
                            シフト表
                        </th>
                        <th colspan="${days.length - Math.floor(days.length / 2)}" class="p-2 text-center font-black text-xs sm:text-sm tracking-wide overflow-hidden">
                            ${branchTitle}
                        </th>
                    </tr>

                    <!-- 上部 日付・曜日ヘッダー -->
                    ${renderDateHeaderRowsHtml(days, false)}
                </thead>
                <tbody>
    `;

    // 1. 一般乗務班（リーダー ＆ メンバー）
    regularMembers.forEach((member, idx) => {
        // 中間地点に到達した場合は、日付・曜日ヘッダーを再挿入
        if (idx === midPointIndex) {
            html += renderDateHeaderRowsHtml(days, true);
        }

        // 太線区切り判定（リーダーの括り: 先頭・中間直後以外のリーダー行に太線）
        // ※idx===0およびidx===midPointIndexの直前はヘッダー曜日行の下端太線があるため、重複防止で除外
        const isLeader = getMemberRole(member) === 'leader';
        let extraClass = '';
        if (isLeader && idx > 0 && idx !== midPointIndex) {
            extraClass = 'border-thick-top';
        }

        html += renderMemberRow(member, extraClass);
    });

    // 2. 同乗専門スタッフブロック（太線区切り: 先頭上部に太線）
    trainingMembers.forEach((member, idx) => {
        let extraClass = '';
        if (idx === 0) {
            extraClass = 'border-thick-top';
        }
        html += renderMemberRow(member, extraClass);
    });

    // 3. 待機スタッフブロック（太線区切り: 先頭上部に太線）
    standbyMembers.forEach((member, idx) => {
        let extraClass = '';
        if (idx === 0) {
            extraClass = 'border-thick-top';
        }
        html += renderMemberRow(member, extraClass);
    });

    // 4. 空行（PDF下部のレイアウト余白を再現: 上部に太線）
    html += `
        <tr class="border-b border-slate-700 bg-white h-7 border-thick-top">
            <td class="p-1 border border-slate-700"></td>
            ${days.map(() => `<td class="p-1 border border-slate-700"></td>`).join('')}
        </tr>
    `;

    // 5. 行事・イベント名行（一番下に表示: 上部に太線）
    html += `
        <tr class="bg-amber-50/70 font-bold border-thick-top">
            <td class="p-1.5 border border-slate-700 text-center font-black text-xs text-amber-950 bg-amber-100/90 whitespace-nowrap overflow-hidden">
                行事・イベント
            </td>
    `;

    days.forEach(d => {
        const eventVal = state.dailyEvents?.[d.dateStr] || '';
        html += `
            <td class="p-0.5 border border-slate-700 text-center align-middle bg-amber-50/60 overflow-hidden">
                ${eventVal ? `
                    <div class="px-0.5 py-0.5 rounded text-[8.5px] font-black text-amber-950 bg-amber-200/90 border border-amber-300 leading-tight w-full overflow-hidden text-ellipsis whitespace-nowrap" title="${eventVal}">
                        ${eventVal}
                    </div>
                ` : `<span class="text-slate-300 text-[10px]">ー</span>`}
            </td>
        `;
    });

    html += `
                </tr>
            </tbody>
        </table>

        <!-- 最下部 右下 印刷日時タイムスタンプ -->
        <div class="flex justify-between items-center mt-1 text-[11px] font-mono text-slate-700 select-none px-1">
            <span class="text-[10px] text-slate-400 no-print">※B4縦 / A4縦サイズでの印刷・PDF保存に最適化されています</span>
            <span class="ml-auto font-bold tracking-wider">${getFormattedPrintTimestamp()}</span>
        </div>
    </div>
    `;

    container.innerHTML = html;
}

window.setPrintMode = setPrintMode;
window.setPrintPeriod = setPrintPeriod;
window.onPrintCutoffChange = onPrintCutoffChange;
window.executePrint = executePrint;
window.renderPrintTab = renderPrintTab;
window.getFormattedPrintTimestamp = getFormattedPrintTimestamp;
