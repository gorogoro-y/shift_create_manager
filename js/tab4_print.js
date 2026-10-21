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

function onPrintScaleChange(val) {
    state.printScale = parseInt(val) || 100;
    saveData();
    renderPrintTab();
}

function onPrintRowHeightChange(val) {
    let num = parseFloat(val);
    if (isNaN(num)) num = 5.5;
    num = Math.max(4.0, Math.min(10.0, num));
    num = Math.round(num * 10) / 10;
    state.printRowHeight = num;
    try {
        localStorage.setItem('shift_print_row_height', String(num));
    } catch (e) {}
    saveData();
    renderPrintTab();
}

function setPrintRowHeightPreset(val) {
    onPrintRowHeightChange(val);
}

function updatePrintToolbarUI() {
    const btnThinking = document.getElementById('btn-mode-thinking');
    const btnPrint = document.getElementById('btn-mode-print');
    const btnFirst = document.getElementById('btn-period-first');
    const btnSecond = document.getElementById('btn-period-second');
    const cutoffContainer = document.getElementById('print-cutoff-container');
    const scaleSelect = document.getElementById('print-scale-select');
    const rowHeightInput = document.getElementById('print-row-height-input');

    if (scaleSelect) {
        scaleSelect.value = String(state.printScale || 100);
    }

    if (rowHeightInput) {
        const h = (state.printRowHeight !== undefined && state.printRowHeight !== null) ? Number(state.printRowHeight) : 5.5;
        rowHeightInput.value = h.toFixed(1);
    }

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
        const formatC = (str) => str.replace(/コース$/, '').trim();
        if (first && second) {
            return `${formatC(first)}/${formatC(second)}`;
        } else if (first) {
            return `${formatC(first)}/ー`;
        } else if (second) {
            return `ー/${formatC(second)}`;
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

// 背景色の輝度（明るさ）から最適なテキスト文字色（黒 or 白）を判定する
function getContrastTextColor(hexColor) {
    if (!hexColor) return '#0f172a';
    let hex = hexColor.replace('#', '').trim();
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    // YIQ計算（人間の視覚における明度加重）
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 140) ? '#0f172a' : '#ffffff';
}

// コース表示名バッジ（文字長に応じた自動フォントサイズ調整で大きく読みやすく枠内に収める）
function renderCourseBadge(courseName, isCompact = false, customColor = null) {
    if (!courseName) return '';
    const len = courseName.length;
    let sizeClass = 'text-sm sm:text-base';
    const colorStyle = customColor ? `color: ${customColor} !important;` : '';
    const defaultColorClass = customColor ? '' : 'text-slate-950';
    const longClass = (len >= 5) ? 'print-course-long' : '';

    if (isCompact) {
        if (len >= 10) {
            sizeClass = 'text-[8px] sm:text-[9px] tracking-tighter leading-tight';
        } else if (len >= 7) {
            sizeClass = 'text-[9px] sm:text-[10px] tracking-tight leading-tight';
        } else if (len >= 5) {
            sizeClass = 'text-[10px] sm:text-[11px] tracking-tight leading-tight';
        } else {
            sizeClass = 'text-[11px] sm:text-xs leading-tight';
        }
        return `<span class="font-black ${sizeClass} ${defaultColorClass} ${longClass} inline-block w-full text-center overflow-hidden whitespace-nowrap select-none print-course-badge-compact" style="${colorStyle}" title="${courseName}">${courseName}</span>`;
    }
    if (len >= 10) {
        sizeClass = 'text-[9px] sm:text-[10px] tracking-tighter leading-tight';
    } else if (len >= 7) {
        sizeClass = 'text-[10px] sm:text-[11px] tracking-tight leading-tight';
    } else if (len >= 5) {
        sizeClass = 'text-xs sm:text-[13px] tracking-tight leading-tight';
    } else if (len >= 3) {
        sizeClass = 'text-[13px] sm:text-sm leading-tight';
    }
    return `<span class="font-black ${sizeClass} ${defaultColorClass} ${longClass} inline-block w-full text-center overflow-hidden whitespace-nowrap select-none print-course-badge" style="${colorStyle}" title="${courseName}">${courseName}</span>`;
}

// 日付・曜日ヘッダー行のHTML生成（上部および中間地点用）
function renderDateHeaderRowsHtml(days, isMiddle = false) {
    const topBorderClass = isMiddle ? 'border-thick-top' : '';
    let dayNumCells = `<th class="p-1 border border-slate-700 bg-sky-50 text-slate-800 text-center font-bold text-xs tracking-wider print-header-day-cell"></th>`;
    let dayOfWeekCells = `<th class="p-0.5 border border-slate-700 bg-sky-50 text-slate-800 text-center font-bold text-xs tracking-wider print-header-weekday-cell"></th>`;

    days.forEach((d, idx) => {
        let dayColor = "text-slate-900";
        if (d.isSunday) dayColor = "text-rose-600 font-black";
        else if (d.isSaturday) dayColor = "text-sky-600 font-black";

        const isLast = (idx === days.length - 1);
        const rightBorderCss = isLast ? 'border-right: 3px solid #0f172a !important;' : '';
        const lastClass = isLast ? 'print-col-last' : '';

        dayNumCells += `
            <th class="p-1 border border-slate-700 bg-sky-50 text-center font-black text-xs sm:text-sm text-slate-900 overflow-hidden print-header-day-cell ${lastClass}" style="${rightBorderCss}">
                ${d.day}
            </th>
        `;
        dayOfWeekCells += `
            <th class="p-0.5 border border-slate-700 bg-sky-50 text-center font-black text-xs ${dayColor} overflow-hidden print-header-weekday-cell ${lastClass}" style="${rightBorderCss}">
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

    // 帳票HTMLの構築（高さ・フォントサイズの事前定義）
    const rowHeightMm = (state.printRowHeight !== undefined && state.printRowHeight !== null) ? Number(state.printRowHeight) : 5.5;
    const memberFontSizePt = (Math.min(9, Math.max(7.2, 7.2 + (rowHeightMm - 4.8) * 0.35))).toFixed(1);

    // 単一スタッフ行の描画ヘルパー
    const renderMemberRow = (member, extraRowClass = '') => {
        let rowHtml = `
            <tr class="border-b border-slate-700 bg-white hover:bg-slate-50 print-member-row ${extraRowClass}">
                <td class="p-1 px-1.5 border border-slate-700 font-extrabold text-slate-900 text-left whitespace-nowrap overflow-hidden text-ellipsis text-xs sm:text-sm print-member-name">
                    ${member.name}
                </td>
        `;

        // コース名表示用（終日・分割および同乗マーカー対応）
        const formatCourseBadgeHtml = (ca, isThinking = false, customColor = null) => {
            if (!ca) return '';
            const colorStyle = customColor ? `color: ${customColor} !important;` : '';
            const defaultColorClass = customColor ? '' : 'text-slate-950';

            if (!ca.isSplit) {
                if (!ca.courseId) return '';
                const crs = state.courses.find(c => c.id === ca.courseId);
                const cName = crs ? crs.name : ca.courseId;
                const isTrainee = !!ca.isTrainee;

                if (isTrainee) {
                    const longClass = cName.length >= 5 ? 'print-course-long' : '';
                    return `<span class="font-black ${defaultColorClass} ${longClass} inline-block w-full text-center overflow-hidden whitespace-nowrap select-none print-course-badge" style="${colorStyle}"><span class="print-trainee-marker font-black">${cName}</span></span>`;
                }
                return renderCourseBadge(cName, false, customColor);
            } else {
                const firstCrs = ca.firstHalf?.courseId ? (state.courses.find(c => c.id === ca.firstHalf.courseId)?.name || ca.firstHalf.courseId) : '';
                const secondCrs = ca.secondHalf?.courseId ? (state.courses.find(c => c.id === ca.secondHalf.courseId)?.name || ca.secondHalf.courseId) : '';
                const formatC = (str) => str.replace(/コース$/, '').trim();
                const firstLabel = firstCrs ? formatC(firstCrs) : '';
                const secondLabel = secondCrs ? formatC(secondCrs) : '';

                if (!firstLabel && !secondLabel) return '';

                const isFirstTrainee = !!ca.firstHalf?.isTrainee;
                const isSecondTrainee = !!ca.secondHalf?.isTrainee;

                const firstDisplay = firstLabel || 'ー';
                const secondDisplay = secondLabel || 'ー';

                const firstHtml = isFirstTrainee ? `<span class="print-trainee-marker font-black">${firstDisplay}</span>` : `<span>${firstDisplay}</span>`;
                const secondHtml = isSecondTrainee ? `<span class="print-trainee-marker font-black">${secondDisplay}</span>` : `<span>${secondDisplay}</span>`;
                const slashColor = (customColor === '#ffffff') ? 'text-white/70' : 'text-slate-400';

                return `<span class="font-black ${defaultColorClass} print-course-long inline-block w-full text-center overflow-hidden whitespace-nowrap select-none print-course-badge" style="${colorStyle}">${firstHtml}<span class="${slashColor} font-bold px-0.5">/</span>${secondHtml}</span>`;
            }
        };

        days.forEach((d, idx) => {
            const cell = getCellData(`${member.id}_${d.dateStr}`);
            const isHoliday = isHolidayValue(cell.shiftId);
            const ca = getCourseAssignment(member.id, d.dateStr);
            const isBeyondCutoff = !isThinking && (d.day > cutoffDay);
            const isLast = (idx === days.length - 1);
            const rightBorderCss = isLast ? 'border-right: 3px solid #0f172a !important;' : '';
            const lastClass = isLast ? 'print-col-last' : '';

            let cellContent = '';
            let cellStyle = '';

            const isSplit = !!ca?.isSplit;
            const hasTrainee = !isSplit ? !!ca?.isTrainee : (!!ca?.firstHalf?.isTrainee || !!ca?.secondHalf?.isTrainee);

            if (isThinking) {
                // === 思考モード ===
                if (isHoliday) {
                    const hType = getHolidayType(cell.shiftId);
                    const shortName = hType ? hType.shortName : cell.shiftId;
                    cellContent = `<span class="font-black text-xs text-slate-800 print-holiday-text">${shortName}</span>`;
                    cellStyle = 'background-color: #cbd5e1;'; // slate-300
                } else {
                    const courseHtml = formatCourseBadgeHtml(ca, true, null);
                    if (courseHtml) {
                        cellContent = courseHtml;
                    } else if (hasTrainee) {
                        cellContent = `<span class="print-trainee-marker font-black">同乗</span>`;
                    } else {
                        // コース未割当: 左にシフトスタンプ [通/単]、右にカラーマーカー ■ を横並び（中央揃え・1行）で表示
                        const shiftObj = state.shiftTypes.find(s => s.id === cell.shiftId);
                        const colorObj = state.colorTypes.find(c => c.id === cell.colorId);

                        let badgesHtml = '';
                        if (shiftObj || colorObj) {
                            badgesHtml = `
                                <div class="flex items-center justify-center gap-1 leading-none select-none">
                                    ${shiftObj ? `<span class="print-shift-stamp" style="background-color: ${shiftObj.color}" title="${shiftObj.name}">${shiftObj.shortName}</span>` : ''}
                                    ${colorObj ? `<span class="print-color-marker" style="background-color: ${colorObj.color}" title="${colorObj.name}"></span>` : ''}
                                </div>
                            `;
                        }
                        cellContent = badgesHtml || `<span class="text-slate-300 text-xs">ー</span>`;
                    }
                }
            } else {
                // === 印刷モード ===
                if (isHoliday) {
                    // 休み（公休・有給・待機等）を最優先
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
                            cellContent = `<span class="font-black text-xs text-rose-600 print-holiday-text">${shortName}</span>`;
                        } else {
                            cellContent = `<span class="font-black text-xs text-slate-950 print-holiday-text">${shortName}</span>`;
                        }
                        cellStyle = 'background-color: #cbd5e1;'; // slate-300
                    }
                } else if (isBeyondCutoff) {
                    // カットオフ日以降: コースもカラー塗りつぶしも行わず空欄
                    cellContent = '';
                } else {
                    // 出勤枠（カットオフ日以内）
                    const colorObj = state.colorTypes.find(c => c.id === cell.colorId);
                    const isPrintFill = !!(colorObj && colorObj.printFill);

                    if (isPrintFill) {
                        // 🖨️ カラーマーカーの背景塗りつぶし属性がON
                        const textColor = getContrastTextColor(colorObj.color);
                        cellStyle = `background-color: ${colorObj.color} !important;`;

                        const courseHtml = formatCourseBadgeHtml(ca, false, textColor);
                        if (courseHtml) {
                            cellContent = courseHtml;
                        } else if (hasTrainee) {
                            cellContent = `<span class="print-trainee-marker font-black">同乗</span>`;
                        } else {
                            // コース未割当: カラーマーカーの略称文字（例：「点」「夜」など）を中央に表示
                            const label = colorObj.shortName || colorObj.name || '';
                            cellContent = `<span class="font-black text-xs sm:text-sm inline-block w-full text-center overflow-hidden text-ellipsis whitespace-nowrap select-none print-color-fill-text" style="color: ${textColor} !important;" title="${colorObj.name}">${label}</span>`;
                        }
                    } else {
                        const courseHtml = formatCourseBadgeHtml(ca, false, null);
                        if (courseHtml) {
                            cellContent = courseHtml;
                        } else if (hasTrainee) {
                            cellContent = `<span class="print-trainee-marker font-black">同乗</span>`;
                        } else {
                            cellContent = '';
                        }
                    }
                }
            }

            rowHtml += `
                <td class="p-0.5 border border-slate-700 text-center align-middle overflow-hidden print-cell ${lastClass}" style="${cellStyle} ${rightBorderCss}">
                    ${cellContent}
                </td>
            `;
        });

        rowHtml += `</tr>`;
        return rowHtml;
    };

    // 列幅の均等計算（氏名列 11%に狭め、残り 89% を日付数で均等分割して日付枠を拡大）
    const nameColWidthPercent = 11;
    const dayColWidthPercent = ((100 - nameColWidthPercent) / days.length).toFixed(4);

    // 帳票HTMLの構築
    const scaleFactor = ((state.printScale || 100) / 100).toFixed(2);

    // タイトル行のcolspan計算（合計が 1 + days.length になるよう厳密に配分）
    const titleCenterSpan = Math.ceil(days.length / 2);
    const titleBranchSpan = days.length - titleCenterSpan;

    let html = `
        <style>
            /* 画面表示 & 印刷共通のテーブル基本設定（太線・細線の2種類のみ） */
            .print-roster-table {
                table-layout: fixed !important;
                width: 100% !important;
                border-collapse: collapse !important;
                border: 3px solid #0f172a !important; /* 一番外の枠: 太線(3px) */
                font-family: 'BIZ UDPGothic', 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif !important;
            }
            .print-roster-table th,
            .print-roster-table td {
                border: 1px solid #334155 !important; /* 全内部セル基本罫線: 細線(1px) */
                overflow: hidden;
            }
            /* 一番右端・左端・上端・下端の罫線を確実に太線(3px)にする（collapseでの競合解決） */
            .print-roster-table th:last-child,
            .print-roster-table td:last-child,
            .print-roster-table .print-col-last {
                border-right: 3px solid #0f172a !important;
            }
            .print-roster-table th:first-child,
            .print-roster-table td:first-child {
                border-left: 3px solid #0f172a !important;
            }
            .print-roster-table thead tr:first-child > th {
                border-top: 3px solid #0f172a !important;
            }
            .print-roster-table tbody tr:last-child > td {
                border-bottom: 3px solid #0f172a !important;
            }
            /* 太線（強調境界線: 2.5px / 重複なし） */
            .print-roster-table tr.border-thick-top > th,
            .print-roster-table tr.border-thick-top > td {
                border-top: 2.5px solid #0f172a !important;
            }
            .print-roster-table tr.border-thick-bottom > th,
            .print-roster-table tr.border-thick-bottom > td {
                border-bottom: 2.5px solid #0f172a !important;
            }

            /* 画面プレビューでも行の高さを反映 */
            .print-roster-table tr.print-member-row {
                height: ${rowHeightMm}mm !important;
            }
            .print-roster-table tr.print-member-row td {
                padding: 0 1px !important;
                height: ${rowHeightMm}mm !important;
                line-height: 1 !important;
                vertical-align: middle !important;
            }
            .print-roster-table tr.print-member-row td.print-split-cell {
                padding: 0 !important;
            }
            .print-roster-table tr.print-member-row td.print-member-name {
                font-size: ${memberFontSizePt}pt !important;
                font-weight: 800 !important;
            }

            /* タイトル行（年月 / シフト表 / 拠点名）: 画面・印刷共通 */
            .print-title-row {
                height: 8.0mm !important;
            }
            .print-title-row th {
                padding: 0 2px !important;
                height: 8.0mm !important;
                line-height: 1 !important;
                vertical-align: middle !important;
            }
            .print-title-center {
                font-size: 13pt !important;
                letter-spacing: 0.15em !important;
            }
            .print-title-sub {
                font-size: 9pt !important;
            }

            /* 日付・曜日ヘッダー行: 画面・印刷共通 */
            .print-roster-table tr.header-days-row {
                height: 6.0mm !important;
            }
            .print-roster-table tr.header-days-row th,
            .print-header-day-cell {
                padding: 0 !important;
                height: 6.0mm !important;
                font-size: 8.5pt !important;
                line-height: 1 !important;
                vertical-align: middle !important;
            }
            .print-roster-table tr.header-weekdays-row {
                height: 5.2mm !important;
            }
            .print-roster-table tr.header-weekdays-row th,
            .print-header-weekday-cell {
                padding: 0 !important;
                height: 5.2mm !important;
                font-size: 8pt !important;
                line-height: 1 !important;
                vertical-align: middle !important;
            }

            /* コース名バッジ（画面プレビュー用） */
            .print-course-badge.print-course-long {
                font-size: 11px !important;
                letter-spacing: -0.03em !important;
            }
            /* 同乗マーカー（文字の上に敷く青帯マーカー・白文字） */
            .print-trainee-marker {
                background-color: #1e3a8a !important;
                color: #ffffff !important;
                padding: 0.5px 3px !important;
                border-radius: 2px !important;
                display: inline-block !important;
                line-height: 1.15 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }

            /* 思考モード: シフトスタンプ（白文字入り正方形） */
            .print-shift-stamp {
                width: 14px;
                height: 14px;
                font-size: 9.5px;
                font-weight: 900;
                line-height: 1;
                color: #ffffff;
                border-radius: 2px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            /* 思考モード: カラーマーカー（文字なし塗りつぶし正方形） */
            .print-color-marker {
                width: 14px;
                height: 14px;
                border-radius: 2px;
                display: inline-block;
                flex-shrink: 0;
            }

            @media print {
                @page {
                    size: B4 portrait;
                    margin: 4mm 4mm;
                }
                html, body {
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #ffffff !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    font-family: 'BIZ UDPGothic', 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif !important;
                }
                .no-print, header, nav, footer {
                    display: none !important;
                }
                #print-table-container {
                    padding: 0 1.5mm 0 0 !important;
                    margin: 0 !important;
                    overflow: visible !important;
                    page-break-after: avoid !important;
                    break-after: avoid !important;
                    zoom: var(--print-scale, ${scaleFactor}) !important;
                }
                .print-roster-table {
                    table-layout: fixed !important;
                    width: 100% !important;
                    border-collapse: collapse !important;
                    border: 3px solid #0f172a !important;
                    page-break-after: avoid !important;
                    break-after: avoid !important;
                    font-family: 'BIZ UDPGothic', 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif !important;
                }
                .print-roster-table th,
                .print-roster-table td {
                    border: 0.8px solid #0f172a !important;
                    box-sizing: border-box !important;
                }
                /* 印刷時も外周4辺（特に一番右端）を確実に太線(3px)にする */
                .print-roster-table th:last-child,
                .print-roster-table td:last-child,
                .print-roster-table .print-col-last {
                    border-right: 3px solid #0f172a !important;
                }
                .print-roster-table th:first-child,
                .print-roster-table td:first-child {
                    border-left: 3px solid #0f172a !important;
                }
                .print-roster-table thead tr:first-child > th {
                    border-top: 3px solid #0f172a !important;
                }
                .print-roster-table tbody tr:last-child > td {
                    border-bottom: 3px solid #0f172a !important;
                }
                .print-roster-table tr.border-thick-top > th,
                .print-roster-table tr.border-thick-top > td {
                    border-top: 2.2px solid #0f172a !important;
                }
                .print-roster-table tr.border-thick-bottom > th,
                .print-roster-table tr.border-thick-bottom > td {
                    border-bottom: 2.2px solid #0f172a !important;
                }

                /* スタッフ通常行（微調整値反映） */
                .print-roster-table tr.print-member-row {
                    height: ${rowHeightMm}mm !important;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                }
                .print-roster-table tr.print-member-row td {
                    padding: 0 1px !important;
                    height: ${rowHeightMm}mm !important;
                    line-height: 1 !important;
                    vertical-align: middle !important;
                }
                .print-roster-table tr.print-member-row td.print-member-name {
                    font-size: ${memberFontSizePt}pt !important;
                    font-weight: 800 !important;
                    line-height: 1 !important;
                    padding-left: 1.5px !important;
                    white-space: nowrap !important;
                }
                /* コース名バッジ（通常） */
                .print-course-badge {
                    font-size: ${memberFontSizePt}pt !important;
                    font-weight: 800 !important;
                    line-height: 1 !important;
                    display: block !important;
                    width: 100% !important;
                    text-align: center !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    white-space: nowrap !important;
                }
                /* 分割シフト等の長めコース名 */
                .print-course-badge.print-course-long {
                    font-size: ${(Number(memberFontSizePt) * 0.90).toFixed(1)}pt !important;
                    letter-spacing: -0.03em !important;
                }
                /* 同乗マーカー（文字の上に敷く青帯マーカー・白文字） */
                .print-trainee-marker {
                    background-color: #1e3a8a !important;
                    color: #ffffff !important;
                    padding: 0.5px 2.5px !important;
                    border-radius: 1.5px !important;
                    display: inline-block !important;
                    line-height: 1.15 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }

                /* 思考モード: シフトスタンプ（白文字入り正方形） */
                .print-shift-stamp {
                    width: ${(Math.min(3.6, Math.max(2.6, 2.6 + (rowHeightMm - 4.8) * 0.3))).toFixed(1)}mm !important;
                    height: ${(Math.min(3.6, Math.max(2.6, 2.6 + (rowHeightMm - 4.8) * 0.3))).toFixed(1)}mm !important;
                    font-size: ${(Math.min(6.5, Math.max(5.0, 5.0 + (rowHeightMm - 4.8) * 0.3))).toFixed(1)}pt !important;
                    font-weight: 900 !important;
                    line-height: 1 !important;
                    color: #ffffff !important;
                    border-radius: 0.3mm !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    flex-shrink: 0 !important;
                }
                /* 思考モード: カラーマーカー（文字なし塗りつぶし正方形） */
                .print-color-marker {
                    width: ${(Math.min(3.6, Math.max(2.6, 2.6 + (rowHeightMm - 4.8) * 0.3))).toFixed(1)}mm !important;
                    height: ${(Math.min(3.6, Math.max(2.6, 2.6 + (rowHeightMm - 4.8) * 0.3))).toFixed(1)}mm !important;
                    border-radius: 0.3mm !important;
                    display: inline-block !important;
                    flex-shrink: 0 !important;
                }
                /* 思考モード2段時コース名 */
                .print-course-badge-compact {
                    font-size: ${(Math.min(7.5, Math.max(6.2, 6.2 + (rowHeightMm - 4.8) * 0.3))).toFixed(1)}pt !important;
                    font-weight: 800 !important;
                    line-height: 1 !important;
                    display: block !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                /* 思考モードスタンプバッジ（レガシー互換） */
                .print-stamp-badge {
                    font-size: 7pt !important;
                    font-weight: 800 !important;
                    padding: 0 1px !important;
                    line-height: 1 !important;
                    display: inline-block !important;
                }
                /* 休み文字 */
                .print-holiday-text {
                    font-size: ${memberFontSizePt}pt !important;
                    font-weight: 800 !important;
                    line-height: 1 !important;
                    display: block !important;
                }
                /* タイトル行（年月 / シフト表 / 拠点名） */
                .print-title-row {
                    height: 8.0mm !important;
                }
                .print-title-row th {
                    padding: 0 2px !important;
                    height: 8.0mm !important;
                    line-height: 1 !important;
                    vertical-align: middle !important;
                }
                .print-title-center {
                    font-size: 13pt !important;
                    letter-spacing: 0.15em !important;
                }
                .print-title-sub {
                    font-size: 9pt !important;
                }
                /* 日付・曜日ヘッダー行 */
                .print-roster-table tr.header-days-row {
                    height: 6.0mm !important;
                }
                .print-roster-table tr.header-days-row th,
                .print-header-day-cell {
                    padding: 0 !important;
                    height: 6.0mm !important;
                    font-size: 8.5pt !important;
                    line-height: 1 !important;
                    vertical-align: middle !important;
                }
                .print-roster-table tr.header-weekdays-row {
                    height: 5.2mm !important;
                }
                .print-roster-table tr.header-weekdays-row th,
                .print-header-weekday-cell {
                    padding: 0 !important;
                    height: 5.2mm !important;
                    font-size: 8pt !important;
                    line-height: 1 !important;
                    vertical-align: middle !important;
                }
                /* 空行 */
                .print-empty-row {
                    height: 3.0mm !important;
                }
                .print-empty-row td {
                    height: 3.0mm !important;
                    padding: 0 !important;
                }
                /* イベント行 */
                .print-event-row {
                    height: 4.5mm !important;
                }
                .print-event-row td {
                    height: 4.5mm !important;
                    padding: 0 !important;
                    font-size: 6.8pt !important;
                    line-height: 1 !important;
                    vertical-align: middle !important;
                }
                .print-event-row div {
                    font-size: 6.8pt !important;
                    padding: 0 1px !important;
                    line-height: 1 !important;
                }
                /* 最下部タイムスタンプ */
                .print-timestamp-row {
                    margin-top: 0.4mm !important;
                    font-size: 6.5pt !important;
                    line-height: 1 !important;
                }
            }
        </style>

        <div class="w-full pr-1" style="--print-scale: ${scaleFactor};">
            <table class="w-full text-center border-collapse text-xs print-roster-table shadow-sm">
                <!-- 列幅の完全固定・均等化（氏名欄11% / 日付欄89%） -->
                <colgroup>
                    <col style="width: ${nameColWidthPercent}%;">
                    ${days.map((d, idx) => {
                        const isLast = (idx === days.length - 1);
                        const rBorder = isLast ? 'border-right: 3px solid #0f172a;' : '';
                        return `<col style="width: ${dayColWidthPercent}%; ${rBorder}">`;
                    }).join('')}
                </colgroup>
                <thead>
                    <!-- 最上段: 3分割タイトルヘッダー (年月 | シフト表 | 支店・便名) -->
                    <tr class="bg-white text-slate-900 border-thick-bottom print-title-row">
                        <th class="p-2 border-r-2 border-slate-900 text-center font-black text-sm tracking-wider overflow-hidden print-title-sub">
                            ${state.currentYear}年${state.currentMonth}月
                        </th>
                        <th colspan="${titleCenterSpan}" class="p-2 border-r-2 border-slate-900 text-center font-black text-lg sm:text-xl tracking-widest overflow-hidden print-title-center">
                            シフト表
                        </th>
                        <th colspan="${titleBranchSpan}" class="p-2 border-r-2 border-slate-900 text-center font-black text-xs sm:text-sm tracking-wide overflow-hidden print-title-sub print-col-last" style="border-right: 3px solid #0f172a !important;">
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
        <tr class="border-b border-slate-700 bg-white h-7 border-thick-top print-empty-row">
            <td class="p-1 border border-slate-700"></td>
            ${days.map((d, idx) => {
                const isLast = (idx === days.length - 1);
                const rStyle = isLast ? 'style="border-right: 3px solid #0f172a !important;"' : '';
                const lastCls = isLast ? 'print-col-last' : '';
                return `<td class="p-1 border border-slate-700 ${lastCls}" ${rStyle}></td>`;
            }).join('')}
        </tr>
    `;

    // 5. 行事・イベント名行（一番下に表示: 上部に太線）
    html += `
        <tr class="bg-amber-50/70 font-bold border-thick-top print-event-row">
            <td class="p-1.5 border border-slate-700 text-center font-black text-xs text-amber-950 bg-amber-100/90 whitespace-nowrap overflow-hidden">
                行事・イベント
            </td>
    `;

    days.forEach((d, idx) => {
        const isLast = (idx === days.length - 1);
        const rightBorderCss = isLast ? 'border-right: 3px solid #0f172a !important;' : '';
        const lastClass = isLast ? 'print-col-last' : '';
        const eventVal = state.dailyEvents?.[d.dateStr] || '';
        html += `
            <td class="p-0.5 border border-slate-700 text-center align-middle bg-amber-50/60 overflow-hidden ${lastClass}" style="${rightBorderCss}">
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
        <div class="flex justify-between items-center mt-1 text-[11px] font-mono text-slate-700 select-none px-1 print-timestamp-row">
            <span class="text-[10px] text-slate-400 no-print">※B4縦 / A4縦サイズでの印刷・PDF保存に最適化されています</span>
            <span class="ml-auto font-bold tracking-wider">${getFormattedPrintTimestamp()}</span>
        </div>
    </div>
    `;

    container.innerHTML = html;
}

// スプレッドシート形式エクスポート用データ生成
// 期間（上旬/下旬）およびカットオフ日を反映し、確定コース名と休み（すべて「休」）のみを抽出
function getSpreadsheetExportData() {
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

    // スタッフの分類と順序（帳票テーブルの表示順: 一般班、同乗専門、待機）
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

    const allMembersInOrder = [...regularMembers, ...trainingMembers, ...standbyMembers];

    // 1行目: 氏名, 1日(水), 2日(木), ...
    const headerRow = ['氏名', ...days.map(d => `${d.day}日(${d.dayOfWeek})`)];

    // 各スタッフの行データ
    const dataRows = allMembersInOrder.map(member => {
        const row = [member.name];
        days.forEach(d => {
            const cell = getCellData(`${member.id}_${d.dateStr}`);
            const isHoliday = isHolidayValue(cell.shiftId);

            if (isHoliday) {
                // 休みは公休・有休・待機などの区別関係なくすべて「休」
                row.push('休');
            } else if (d.day <= cutoffDay) {
                // コース印刷対象日以内で確定コース名があれば出力
                const ca = getCourseAssignment(member.id, d.dateStr);
                const courseName = getFormattedCourseName(ca) || '';
                row.push(courseName);
            } else {
                // カットオフ日以降またはコース未割当は空欄
                row.push('');
            }
        });
        return row;
    });

    return {
        headerRow,
        dataRows,
        periodLabel: state.printPeriod === 'first' ? '上旬' : '下旬'
    };
}

// クリップボードへコピー（スプレッドシートやExcelに直接Ctrl+Vで貼り付け可能）
function copySpreadsheetData() {
    const { headerRow, dataRows, periodLabel } = getSpreadsheetExportData();
    const tsvContent = [headerRow, ...dataRows]
        .map(row => row.join('\t'))
        .join('\n');

    const onSuccess = () => {
        if (typeof showMessageModal === 'function') {
            showMessageModal(`【${state.currentYear}年${state.currentMonth}月 ${periodLabel}】の確定シフト表をクリップボードにコピーしました！\n\nGoogleスプレッドシートやExcelのシートを開き、そのまま貼り付け（Ctrl+V / Cmd+V）してご利用ください。`);
        } else {
            alert('クリップボードにコピーしました！');
        }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(tsvContent)
            .then(onSuccess)
            .catch(() => fallbackCopy(tsvContent, onSuccess));
    } else {
        fallbackCopy(tsvContent, onSuccess);
    }
}

// クリップボードAPIが使えない場合のフォールバックコピー
function fallbackCopy(text, callback) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
        document.execCommand('copy');
        if (callback) callback();
    } catch (err) {
        alert('クリップボードへのコピーに失敗しました。お使いのブラウザ設定をご確認ください。');
    }
    document.body.removeChild(textarea);
}

// CSVファイルダウンロード（Excelで文字化けしないUTF-8 BOM付き）
function downloadSpreadsheetCsv() {
    const { headerRow, dataRows, periodLabel } = getSpreadsheetExportData();

    const escapeCsv = (val) => {
        const str = String(val || '');
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const csvContent = '\uFEFF' + [headerRow, ...dataRows]
        .map(row => row.map(escapeCsv).join(','))
        .join('\r\n');

    const fileName = `${state.currentYear}年${state.currentMonth}月_${periodLabel}_確定シフト表.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

window.setPrintMode = setPrintMode;
window.setPrintPeriod = setPrintPeriod;
window.onPrintCutoffChange = onPrintCutoffChange;
window.onPrintScaleChange = onPrintScaleChange;
window.onPrintRowHeightChange = onPrintRowHeightChange;
window.setPrintRowHeightPreset = setPrintRowHeightPreset;
window.executePrint = executePrint;
window.renderPrintTab = renderPrintTab;
window.getFormattedPrintTimestamp = getFormattedPrintTimestamp;
window.copySpreadsheetData = copySpreadsheetData;
window.downloadSpreadsheetCsv = downloadSpreadsheetCsv;
