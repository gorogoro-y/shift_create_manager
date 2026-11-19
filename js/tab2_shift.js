// js/tab2_shift.js
// 【タブ2】属性設定（シフト作成・自動生成・ピン留め保護）

let shiftGenerateUndoStack = [];

function renderShiftStamps() {
    const shiftContainer = document.getElementById('shift-stamp-container');
    const colorContainer = document.getElementById('color-stamp-container');
    if (!shiftContainer || !colorContainer) return;

    const isPinningSelected = state.selectedTool?.category === 'pin';

    let shiftHtml = `
        <div class="w-full text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
            <span class="flex items-center gap-1">📌 シフトスタンプ & 保護ツール</span>
            ${isPinningSelected ? '<span class="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-black flex items-center gap-1 animate-pulse"><span>📌</span> ピン留めモード稼働中</span>' : ''}
        </div>
        <div class="flex items-center gap-2 flex-wrap">`;

    state.shiftTypes.forEach(st => {
        const isSelected = state.selectedTool?.category === 'shift' && state.selectedTool?.id === st.id;
        const activeStyle = isSelected ? 'ring-2 ring-indigo-600 ring-offset-1 scale-105 shadow-sm font-black' : 'opacity-85 hover:opacity-100';
        shiftHtml += `
            <button onclick="selectTool('shift', '${st.id}')" class="px-3 py-1.5 rounded-lg font-bold text-xs text-white shadow-2xs transition transform flex items-center gap-1 ${activeStyle}" style="background-color:${st.color}">
                <span>${st.shortName}</span>
                <span class="text-[10px] opacity-90 font-normal">(${st.name})</span>
            </button>
        `;
    });

    const isShiftClear = state.selectedTool?.category === 'shift' && state.selectedTool?.id === '';
    const shiftClearStyle = isShiftClear ? 'ring-2 ring-slate-600 ring-offset-1 scale-105 bg-slate-300 font-bold' : 'bg-slate-100 hover:bg-slate-200 text-slate-600';
    shiftHtml += `
        <button onclick="selectTool('shift', '')" class="px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-xs transition transform ${shiftClearStyle}">
            シフト解除
        </button>
    `;

    const pinBtnStyle = isPinningSelected 
        ? 'bg-amber-500 text-white ring-2 ring-amber-600 ring-offset-1 font-black shadow-sm' 
        : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold';
    shiftHtml += `
        <button onclick="selectTool('pin', 'toggle')" class="w-full justify-center px-3 py-1.5 rounded-lg transition transform flex items-center gap-1 text-xs shadow-2xs mt-1 ${pinBtnStyle}" title="セルをクリックしてピン留め（上書き保護）を設定・解除">
            <span>📌</span>
            <span>ピン留めモード</span>
        </button>
    </div>`;
    shiftContainer.innerHTML = shiftHtml;

    let colorHtml = `
        <div class="w-full text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
            <span class="flex items-center gap-1">🎨 カラーマーカー <span class="text-[10px] text-amber-700 font-normal">(背景色のみ変更)</span></span>
            ${state.selectedTool?.category === 'color' ? '<span class="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">選択中: カラー塗り</span>' : ''}
        </div>
        <div class="flex items-center gap-2 flex-wrap">`;

    state.colorTypes.forEach(ct => {
        const isSelected = state.selectedTool?.category === 'color' && state.selectedTool?.id === ct.id;
        const activeStyle = isSelected ? 'ring-2 ring-amber-600 ring-offset-1 scale-105 shadow-sm font-black' : 'opacity-85 hover:opacity-100';
        colorHtml += `
            <button onclick="selectTool('color', '${ct.id}')" class="px-3 py-1.5 rounded-lg font-bold text-xs text-white shadow-2xs transition transform flex items-center gap-1.5 ${activeStyle}" style="background-color:${ct.color}">
                <span class="w-2.5 h-2.5 rounded-full bg-white/40"></span>
                <span>${ct.name}</span>
            </button>
        `;
    });

    const isColorClear = state.selectedTool?.category === 'color' && state.selectedTool?.id === '';
    const colorClearStyle = isColorClear ? 'ring-2 ring-slate-600 ring-offset-1 scale-105 bg-slate-300 font-bold' : 'bg-slate-100 hover:bg-slate-200 text-slate-600';
    colorHtml += `
        <button onclick="selectTool('color', '')" class="px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-xs transition transform ${colorClearStyle}">
            カラー解除
        </button>
    </div>`;
    colorContainer.innerHTML = colorHtml;
}

function selectTool(category, id) {
    state.selectedTool = { category, id };
    renderShiftStamps();
}

function clearMemberShifts(memberId) {
    const days = getMonthDays();
    const batchUpdates = {};
    let clearedCount = 0;

    days.forEach(d => {
        const key = `${memberId}_${d.dateStr}`;
        const cell = getCellData(key);

        if (isHolidayValue(cell.shiftId)) return;
        if (cell.isPinned) return;

        if (cell.shiftId || cell.colorId) {
            delete state.schedule[key];
            batchUpdates[key] = null;
            clearedCount++;
        }
    });

    if (clearedCount > 0) {
        renderAll();
        syncBatchCellsToCloud(batchUpdates);
    }
}

function toggleShiftStamp(memberId, dateStr) {
    const key = `${memberId}_${dateStr}`;
    const cell = getCellData(key);
    
    if (isHolidayValue(cell.shiftId)) {
        return;
    }

    if (state.tab2Mode === 'generate') {
        if (cell.shiftId && !cell.isGeneratedShift) {
            showMessageModal("通常モードで設定されたシフトはロックされています。変更する場合は「通常モード」に切り替えてください。");
            return;
        }
        if (cell.isPinned) {
            showMessageModal("ピン留め保護中のセルはロックされています。変更する場合は「通常モード」に切り替えてください。");
            return;
        }
        if (cell.isGeneratedShift) {
            cell.shiftId = '';
            cell.isGeneratedShift = false;
            if (!cell.shiftId && !cell.colorId && !cell.isPinned) {
                delete state.schedule[key];
                renderAll();
                syncSingleCellToCloud(key, null);
            } else {
                state.schedule[key] = cell;
                renderAll();
                syncSingleCellToCloud(key, cell);
            }
            return;
        }
        showMessageModal("ジェネレートモードでは「⚡ 自動ジェネレート」からシフトを生成できます。手動入力は「通常モード」で行ってください。");
        return;
    }

    const tool = state.selectedTool || { category: 'shift', id: 't1' };

    if (tool.category === 'pin') {
        cell.isPinned = !cell.isPinned;
        state.schedule[key] = cell;
        renderAll();
        syncSingleCellToCloud(key, cell);
        return;
    }

    if (tool.category === 'shift') {
        if (tool.id === '' || cell.shiftId === tool.id) {
            cell.shiftId = '';
        } else {
            cell.shiftId = tool.id;
        }
        cell.isGeneratedShift = false;
    } else if (tool.category === 'color') {
        if (tool.id === '' || cell.colorId === tool.id) {
            cell.colorId = '';
        } else {
            cell.colorId = tool.id;
        }
    }

    if (!cell.shiftId && !cell.colorId && !cell.isPinned) {
        delete state.schedule[key];
        renderAll();
        syncSingleCellToCloud(key, null);
    } else {
        state.schedule[key] = cell;
        renderAll();
        syncSingleCellToCloud(key, cell);
    }
}

function getCourseBadgeSummary(memberId, dateStr) {
    const ca = getCourseAssignment(memberId, dateStr);
    if (!ca) return '';

    const findName = (cid) => {
        const c = state.courses.find(item => item.id === cid);
        return c ? c.name.replace('コース', '') : '';
    };

    const recentColor = state.courseHistoryRecentColor || '#f97316';

    if (ca.isSplit) {
        const c1 = findName(ca.firstHalf?.courseId);
        const c2 = findName(ca.secondHalf?.courseId);
        if (!c1 && !c2) return '';

        const r1 = ca.firstHalf?.courseId ? isCourseRecentRun(memberId, ca.firstHalf.courseId, dateStr) : { isRecent: false, days: null };
        const r2 = ca.secondHalf?.courseId ? isCourseRecentRun(memberId, ca.secondHalf.courseId, dateStr) : { isRecent: false, days: null };

        const span1Style = r1.isRecent ? `background-color: ${recentColor}; color: #000000; font-weight: 900; padding: 0.5px 2px; border-radius: 2px;` : '';
        const span2Style = r2.isRecent ? `background-color: ${recentColor}; color: #000000; font-weight: 900; padding: 0.5px 2px; border-radius: 2px;` : '';

        const title1 = c1 ? `${c1}${r1.days !== null ? ` (${r1.days}日ぶり)` : ''}` : '未定';
        const title2 = c2 ? `${c2}${r2.days !== null ? ` (${r2.days}日ぶり)` : ''}` : '未定';

        return `
            <div class="mt-0.5 text-[8px] bg-slate-900/90 text-white px-1 py-0.2 rounded font-black tracking-tight flex items-center justify-center gap-0.5 shadow-2xs" title="前半: ${title1} / 後半: ${title2}">
                <span style="${span1Style}">${c1 || 'ー'}</span>/<span style="${span2Style}">${c2 || 'ー'}</span>
            </div>
        `;
    } else {
        const c = findName(ca.courseId);
        if (!c) return '';

        const recentCheck = isCourseRecentRun(memberId, ca.courseId, dateStr);
        let style = 'background-color: rgba(15, 23, 42, 0.88); color: #ffffff;';
        let title = `コース: ${c}`;
        if (recentCheck.isRecent) {
            style = `background-color: ${recentColor}; color: #000000; font-weight: 900;`;
            title = `コース: ${c} (${recentCheck.days}日ぶり)`;
        }

        return `
            <div class="mt-0.5 text-[9px] px-1 py-0.2 rounded font-black tracking-tight shadow-2xs" style="${style}" title="${title}">
                ${c}
            </div>
        `;
    }
}

function renderMatrixMode2() {
    renderTab2ModeControls();
    const container = document.getElementById('matrix-container-2');
    if (!container) return;
    const prevScrollTop = container.scrollTop;
    const prevScrollLeft = container.scrollLeft;
    const days = getMonthDays();
    const isGenerateMode = state.tab2Mode === 'generate';

    // 前月末の7日間（参照専用）
    const prevDays = [];
    const prevLastDate = new Date(state.currentYear, state.currentMonth - 1, 0);
    const dayNamesJa = ['日', '月', '火', '水', '木', '金', '土'];
    for (let i = 6; i >= 0; i--) {
        const dt = new Date(prevLastDate);
        dt.setDate(prevLastDate.getDate() - i);
        const dow = dt.getDay();
        const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        prevDays.push({
            month: dt.getMonth() + 1,
            day: dt.getDate(),
            dayOfWeek: dayNamesJa[dow],
            dateStr,
            isSunday: dow === 0,
            isSaturday: dow === 6
        });
    }

    const displayMembers = state.activeStaffFilter 
        ? state.members.filter(m => m.attributes && m.attributes.includes(state.activeStaffFilter))
        : state.members;

    let html = `<table class="min-w-[2400px] w-full text-center border-separate border-spacing-0 text-xs"><thead><tr class="bg-slate-100 text-slate-700 border-b border-slate-300">`;
    
    const filterNotice = state.activeStaffFilter 
        ? `<span class="block text-[10px] text-indigo-600 font-bold">絞込中 (${displayMembers.length}/${state.members.length})</span>` 
        : `<span class="block text-[10px] text-slate-500 font-normal">全員 (${state.members.length}名)</span>`;

    html += `<th class="p-2 border-r border-b border-slate-300 min-w-[170px] w-[170px] sticky-col-corner font-bold align-middle">
        <div>メンバー</div>
        ${filterNotice}
    </th>`;

    prevDays.forEach((pd, idx) => {
        const isLastPrev = idx === prevDays.length - 1;
        const borderClass = isLastPrev ? 'border-r-2 border-r-indigo-400' : 'border-r border-slate-300';
        let dayBadgeStyle = "bg-slate-200 text-slate-700";
        if (pd.isSunday) dayBadgeStyle = "bg-rose-200/70 text-rose-800";
        else if (pd.isSaturday) dayBadgeStyle = "bg-sky-200/70 text-sky-800";
        html += `
            <th class="p-1 ${borderClass} border-b border-slate-300 min-w-[56px] sticky-col-header font-bold align-top bg-slate-200/80 text-slate-600" title="前月（参照専用・編集不可）">
                <div class="flex flex-col items-center gap-0.5">
                    <span class="px-1 py-0.2 rounded text-[9px] font-bold bg-slate-300/80 text-slate-700">前月</span>
                    <div class="font-black text-[11px] w-full py-0.5 rounded-md ${dayBadgeStyle}">
                        ${pd.month}/${pd.day}<span class="text-[9px] font-bold">(${pd.dayOfWeek})</span>
                    </div>
                </div>
            </th>
        `;
    });

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

        let shiftBadgesHTML = `<div class="flex flex-col gap-1 items-center w-full my-1">`;
        
        // 減算方式（目標人数から引いていく表示）
        state.shiftTypes.forEach(st => {
            let count = 0;
            state.members.forEach(m => {
                const cell = getCellData(`${m.id}_${d.dateStr}`);
                if (cell.shiftId === st.id) count++;
            });

            const remaining = (st.count || 0) - count;
            let remainBadge = '';
            let opacityClass = 'opacity-90';

            if (remaining === 0) {
                remainBadge = `${st.shortName} 0`;
                opacityClass = 'opacity-100 ring-1 ring-emerald-400 font-black';
            } else if (remaining > 0) {
                remainBadge = `${st.shortName} ${remaining}`;
            } else {
                remainBadge = `${st.shortName} +${Math.abs(remaining)}`;
                opacityClass = 'opacity-100 ring-1 ring-amber-400 font-black';
            }

            shiftBadgesHTML += `
                <span class="inline-flex items-center justify-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold text-white shadow-2xs w-full max-w-[56px] ${opacityClass}" style="background-color:${st.color}" title="${st.name}: 目標 ${st.count}名 / 現在 ${count}名配置 / 残り ${remaining}名">
                    <span>${remainBadge}</span>
                </span>
            `;
        });
        shiftBadgesHTML += `</div>`;

        let headerBg = "bg-slate-100";
        let dayBadgeStyle = "bg-slate-200 text-slate-800";
        if (d.isSunday) {
            headerBg = "bg-rose-100";
            dayBadgeStyle = "bg-rose-200 text-rose-900 font-extrabold";
        } else if (d.isSaturday) {
            headerBg = "bg-sky-100";
            dayBadgeStyle = "bg-sky-200 text-sky-900 font-extrabold";
        }

        const eventVal = state.dailyEvents?.[d.dateStr] || '';
        const eventDisplayHTML = eventVal
            ? `<div class="w-full px-1 py-0.2 rounded text-[9px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 truncate shadow-2xs text-center leading-tight select-none" title="特別イベント: ${eventVal}">${eventVal}</div>`
            : `<div class="w-full h-3"></div>`;

        html += `
            <th class="p-1 border-r border-b border-slate-300 min-w-[72px] sticky-col-header font-bold align-top ${headerBg}">
                <div class="flex flex-col items-center gap-1">
                    <span class="px-1 py-0.5 border rounded text-[9px] font-black ${badgeClass}">${badgeText}</span>
                    ${eventDisplayHTML}
                    <div class="font-black text-xs w-full py-0.5 rounded-md ${dayBadgeStyle}">
                        ${d.day} <span class="text-[10px] font-bold">(${d.dayOfWeek})</span>
                    </div>
                    ${shiftBadgesHTML}
                </div>
            </th>
        `;
    });

    html += `<th class="p-2 border-l border-b border-slate-300 min-w-[120px] text-center font-bold sticky-col-corner-right align-middle">シフト属性計</th></tr></thead><tbody>`;

    if (displayMembers.length === 0) {
        html += `
            <tr>
                <td colspan="${prevDays.length + days.length + 2}" class="p-8 text-center text-slate-400 font-bold bg-slate-50">
                    選択された属性に該当するスタッフがいません。<br>
                    <button onclick="setStaffFilter(null)" class="mt-2 text-xs text-indigo-600 underline font-bold">全員表示に戻す</button>
                </td>
            </tr>
        `;
    } else {
        displayMembers.forEach(m => {
            const allDays = getMonthDays();
            const badgesHTML = getMemberBadgesHTML(m);
            const isOverRestraint = typeof isMemberOverRestraintLimit === 'function' && isMemberOverRestraintLimit(m.id);

            html += `<tr class="border-b border-slate-300 hover:bg-slate-50 transition">`;
            html += `
                <td class="p-1.5 border-r border-b border-slate-300 font-bold sticky-col-left shadow-2xs text-left ${isOverRestraint ? 'member-over-restraint-cell' : 'text-slate-800'}">
                    <div class="flex items-center gap-1.5 justify-start">
                        <button onclick="clearMemberShifts('${m.id}')" title="ピン留め・休み以外のシフトを一括クリア" class="px-1.5 py-0.5 border rounded text-[10px] font-bold transition shrink-0 bg-slate-100 hover:bg-rose-500 hover:text-white text-slate-600 border-slate-300">
                            クリア
                        </button>
                        <div class="flex flex-col min-w-0 flex-1 cursor-pointer" onclick="openMemberEditModal('${m.id}')" title="クリックして属性や担当不可コースを編集">
                            <div class="flex items-center gap-1 min-w-0">
                                <span class="truncate text-xs font-bold hover:text-indigo-600 ${isOverRestraint ? 'text-rose-700' : ''}">${m.name}</span>
                            </div>
                            <div class="flex items-center gap-1 mt-0.5 overflow-hidden">
                                ${badgesHTML || '<span class="text-[9px] text-slate-300 font-normal">属性なし</span>'}
                            </div>
                        </div>
                    </div>
                </td>
            `;

            // 前月末7日間（参照専用・編集不可）
            prevDays.forEach((pd, idx) => {
                const isLastPrev = idx === prevDays.length - 1;
                const borderClass = isLastPrev ? 'border-r-2 border-r-indigo-400' : 'border-r border-slate-300';
                const cell = getCellDataForAnyDate(m.id, pd.dateStr);
                const val = cell.shiftId;

                if (isHolidayValue(val)) {
                    const hType = getHolidayType(val);
                    const shortName = hType ? hType.shortName : val;
                    const color = hType ? hType.color : '#f43f5e';
                    html += `<td class="p-1 ${borderClass} border-b border-slate-300 font-extrabold cursor-default text-[11px] opacity-80" style="background-color: ${color}18; color: ${color};" title="前月（参照専用）">${shortName}</td>`;
                } else {
                    const shift = state.shiftTypes.find(s => s.id === val);
                    const customColor = state.colorTypes.find(c => c.id === cell.colorId);
                    const label = shift ? shift.shortName : 'ー';
                    let styleColor = '';
                    if (shift) styleColor = shift.color;
                    else if (customColor) styleColor = customColor.color;

                    let cellBgClass = "bg-slate-100/80 text-slate-400";
                    if (pd.isSunday) cellBgClass = "bg-rose-50/50 text-rose-300/80";
                    if (pd.isSaturday) cellBgClass = "bg-sky-50/50 text-sky-300/80";

                    const style = styleColor ? "font-extrabold text-white opacity-80" : cellBgClass;
                    const colorMarkerBadge = (shift && customColor)
                        ? `<div class="mt-0.5"><span class="inline-block px-1 py-0 rounded-full text-[8px] font-black text-white border border-white/90 leading-tight" style="background-color:${customColor.color}">${customColor.shortName || customColor.name}</span></div>`
                        : '';

                    html += `
                        <td class="p-1 ${borderClass} border-b border-slate-300 cursor-default select-none text-[11px] ${style}" ${styleColor ? `style="background-color:${styleColor}"` : ''} title="前月（参照専用）">
                            <div class="leading-tight">${label}</div>
                            ${colorMarkerBadge}
                        </td>
                    `;
                }
            });

            days.forEach(d => {
                const key = `${m.id}_${d.dateStr}`;
                const cell = getCellData(key);
                const val = cell.shiftId;
                const isPinned = cell.isPinned;
                const courseBadge = getCourseBadgeSummary(m.id, d.dateStr);
                
                if (isHolidayValue(val)) {
                    const hType = getHolidayType(val);
                    const shortName = hType ? hType.shortName : val;
                    const name = hType ? hType.name : val;
                    const color = hType ? hType.color : '#f43f5e';
                    html += `<td class="p-1 border-r border-b border-slate-300 font-extrabold cursor-not-allowed text-xs" style="background-color: ${color}20; color: ${color}; border-color: ${color}50;" title="${name}で固定されています">🔒${shortName}</td>`;
                } else {
                    const shift = state.shiftTypes.find(s => s.id === cell.shiftId);
                    const customColor = state.colorTypes.find(c => c.id === cell.colorId);
                    
                    let label = shift ? shift.shortName : 'ー';
                    if (isGenerateMode && shift) {
                        label = cell.isGeneratedShift
                            ? `<span class="text-[9px] mr-0.5 opacity-85">⚡</span>${shift.shortName}`
                            : `<span class="text-[9px] mr-0.5 opacity-85">🔒</span>${shift.shortName}`;
                    }
                    
                    let styleColor = '';
                    if (shift) {
                        styleColor = shift.color;
                    } else if (customColor) {
                        styleColor = customColor.color;
                    }

                    let cellBgClass = "bg-white text-slate-300";
                    if (d.isSunday) cellBgClass = "bg-rose-50/40 text-rose-300/60";
                    if (d.isSaturday) cellBgClass = "bg-sky-50/40 text-sky-300/60";

                    let style = cellBgClass;
                    if (styleColor) {
                        style = `font-extrabold text-white shadow-2xs transition transform active:scale-95`;
                        if (isGenerateMode && shift && cell.isGeneratedShift) {
                            style += ` outline outline-1 outline-dashed outline-white/75 -outline-offset-2`;
                        }
                    }

                    const pinBadge = isPinned 
                        ? `<span class="absolute top-0.5 right-0.5 text-[9px] leading-none drop-shadow-xs" title="ピン留め保護中（自動生成で上書きされません）">📌</span>` 
                        : '';

                    const colorMarkerBadge = (shift && customColor)
                        ? `<div class="mt-0.5"><span class="inline-block px-1.5 py-0 rounded-full text-[9px] font-black text-white border border-white/90 leading-tight shadow-xs" style="background-color:${customColor.color}" title="カラーマーカー: ${customColor.name}">${customColor.shortName || customColor.name}</span></div>`
                        : '';

                    const cellTitle = isGenerateMode && shift
                        ? (cell.isGeneratedShift ? 'title="自動ジェネレートで生成されたシフト"' : 'title="通常モードで設定されたシフト（ロック中）"')
                        : '';

                    html += `
                        <td onclick="toggleShiftStamp('${m.id}', '${d.dateStr}')" ${cellTitle} class="p-1 border-r border-b border-slate-300 cursor-pointer select-none text-xs relative ${style}" style="${styleColor ? `background-color:${styleColor}` : ''}">
                            ${pinBadge}
                            <div class="leading-tight">${label}</div>
                            ${colorMarkerBadge}
                            ${courseBadge}
                        </td>
                    `;
                }
            });

            // 各シフト属性（通し・単独等）の個数集計
            let shiftCountSummaryHTML = `<div class="flex items-center justify-center gap-1.5 flex-wrap">`;
            state.shiftTypes.forEach(st => {
                let cnt = 0;
                allDays.forEach(ad => {
                    const cell = getCellData(`${m.id}_${ad.dateStr}`);
                    if (cell.shiftId === st.id) cnt++;
                });
                shiftCountSummaryHTML += `
                    <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-2xs" style="background-color:${st.color}">
                        <span>${st.shortName}:</span>
                        <span class="font-black">${cnt}</span>
                    </span>
                `;
            });
            shiftCountSummaryHTML += `</div>`;

            html += `<td class="p-1.5 border-l border-b border-slate-300 bg-slate-50 sticky-col-right text-center">${shiftCountSummaryHTML}</td></tr>`;
        });
    }

    html += `</tbody></table>`;
    container.innerHTML = html;
    container.scrollTop = prevScrollTop;
    container.scrollLeft = prevScrollLeft;
}


function generateSpanPattern(spanDays, rules, passThroughId, singleId) {
    if (spanDays <= 0) return [];
    if (spanDays === 1) return [singleId];

    const pattern = [];
    if (rules.holidayNextSingle) {
        pattern.push(singleId);
    }

    const remaining = spanDays - pattern.length;
    if (remaining <= 0) return pattern;

    const maxThroughConsecutive = rules.maxConsecutiveThrough || 2;
    let currentThroughStreak = 0;

    let targetThroughCount = Math.floor(spanDays / 2);
    if (spanDays % 2 !== 0 && rules.oddRemainderPriority === 'single') {
        targetThroughCount = Math.floor(spanDays / 2);
    }

    let assignedThrough = 0;
    for (let i = 0; i < remaining; i++) {
        if (assignedThrough < targetThroughCount && currentThroughStreak < maxThroughConsecutive) {
            pattern.push(passThroughId);
            assignedThrough++;
            currentThroughStreak++;
        } else {
            pattern.push(singleId);
            currentThroughStreak = 0;
        }
    }

    return pattern;
}

function setTab2Mode(mode) {
    state.tab2Mode = (mode === 'generate') ? 'generate' : 'normal';
    renderMatrixMode2();
}

function renderTab2ModeControls() {
    const mode = state.tab2Mode || 'normal';
    const btnNormal = document.getElementById('tab2-mode-btn-normal');
    const btnGen = document.getElementById('tab2-mode-btn-generate');
    const genBar = document.getElementById('tab2-generate-bar');

    if (btnNormal && btnGen) {
        if (mode === 'generate') {
            btnNormal.className = "px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition";
            btnGen.className = "px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white shadow-xs transition flex items-center gap-1";
        } else {
            btnNormal.className = "px-2.5 py-1.5 rounded-lg bg-white text-indigo-600 shadow-xs transition";
            btnGen.className = "px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center gap-1";
        }
    }
    if (genBar) genBar.classList.toggle('hidden', mode !== 'generate');

    const days = getMonthDays();
    const startInput = document.getElementById('tab2-gen-start-day');
    const endInput = document.getElementById('tab2-gen-end-day');
    if (startInput && endInput && days.length > 0) {
        startInput.max = days.length;
        endInput.max = days.length;
        if (parseInt(endInput.value, 10) > days.length || !endInput.dataset.initialized) {
            endInput.value = days.length;
            endInput.dataset.initialized = '1';
        }
    }

    const undoBtn = document.getElementById('tab2-gen-undo-btn');
    if (undoBtn) {
        const currentMonthPrefix = `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}`;
        const hasUndoForMonth = shiftGenerateUndoStack.some(item => item.monthKey === currentMonthPrefix);
        undoBtn.disabled = !hasUndoForMonth;
    }
}

function setTab2GenRange(rangeType) {
    const days = getMonthDays();
    const lastDay = days.length || 31;
    const startInput = document.getElementById('tab2-gen-start-day');
    const endInput = document.getElementById('tab2-gen-end-day');
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

function getTab2GenRangeDays() {
    const days = getMonthDays();
    const lastDay = days.length;
    const startInput = document.getElementById('tab2-gen-start-day');
    const endInput = document.getElementById('tab2-gen-end-day');
    let startDay = parseInt(startInput ? startInput.value : '1', 10) || 1;
    let endDay = parseInt(endInput ? endInput.value : String(lastDay), 10) || lastDay;
    startDay = Math.max(1, Math.min(lastDay, startDay));
    endDay = Math.max(startDay, Math.min(lastDay, endDay));
    if (startInput) startInput.value = startDay;
    if (endInput) endInput.value = endDay;
    return { startDay, endDay, days };
}

function pushShiftGenerateUndoSnapshot() {
    const monthKey = `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}`;
    const snapshot = {};
    Object.keys(state.schedule).forEach(k => {
        if (k.includes(`_${monthKey}-`)) {
            snapshot[k] = JSON.parse(JSON.stringify(state.schedule[k]));
        }
    });
    shiftGenerateUndoStack.push({ monthKey, snapshot });
    if (shiftGenerateUndoStack.length > 20) {
        shiftGenerateUndoStack.shift();
    }
}

function executeTab2ShiftGenerate() {
    const { startDay, endDay, days } = getTab2GenRangeDays();
    const targetMembers = state.activeStaffFilter
        ? state.members.filter(m => m.attributes && m.attributes.includes(state.activeStaffFilter))
        : state.members;

    if (targetMembers.length === 0) {
        showMessageModal("生成対象となるスタッフがいません。");
        return;
    }

    const throughShift = state.shiftTypes.find(s => s.name.includes('通') || s.shortName.includes('通')) || state.shiftTypes[0];
    const singleShift = state.shiftTypes.find(s => s.name.includes('単') || s.shortName.includes('単')) || state.shiftTypes[1] || state.shiftTypes[0];

    if (!throughShift || !singleShift) {
        showMessageModal("シフト属性に「通し」および「単独」が登録されている必要があります。");
        return;
    }

    pushShiftGenerateUndoSnapshot();

    let generatedCount = 0;
    let skippedLockedCount = 0;
    const updatedCellsMap = {};

    targetMembers.forEach(member => {
        let seenFirstHoliday = false;
        let leadingCurDays = [];
        let currentSpanDays = [];

        days.forEach(d => {
            const key = `${member.id}_${d.dateStr}`;
            const cell = getCellData(key);

            if (isHolidayValue(cell.shiftId)) {
                if (!seenFirstHoliday && leadingCurDays.length > 0 && leadingCurDays.length < 7) {
                    processCrossMonthLeadingSpan(leadingCurDays);
                } else if (seenFirstHoliday && currentSpanDays.length > 0 && currentSpanDays.length < 7) {
                    processSpan(currentSpanDays);
                }
                seenFirstHoliday = true;
                currentSpanDays = [];
            } else {
                if (!seenFirstHoliday) {
                    leadingCurDays.push(d);
                } else {
                    currentSpanDays.push(d);
                }
            }
        });

        // 月の最後の休み〜月末までは7日未満であれば生成
        if (seenFirstHoliday && currentSpanDays.length > 0 && currentSpanDays.length < 7) {
            processSpan(currentSpanDays);
        }

        function processCrossMonthLeadingSpan(curDays) {
            // 前月末からさかのぼって直近の休みを探す（合計7日未満の範囲のみ）
            const maxLookback = 7 - curDays.length;
            const prevDaysInfo = [];
            let foundPrevHoliday = false;
            const firstDate = new Date(state.currentYear, state.currentMonth - 1, 1);

            for (let i = 1; i <= maxLookback; i++) {
                const dt = new Date(firstDate);
                dt.setDate(dt.getDate() - i);
                const dStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
                const prevCell = getCellDataForAnyDate(member.id, dStr);
                if (isHolidayValue(prevCell.shiftId)) {
                    foundPrevHoliday = true;
                    break;
                }
                prevDaysInfo.unshift(prevCell);
            }

            if (!foundPrevHoliday) return;

            if (prevDaysInfo.length === 0) {
                processSpan(curDays);
                return;
            }

            const totalSpanLen = prevDaysInfo.length + curDays.length;
            const rules = state.generatorRules;
            const maxThroughConsecutive = rules.maxConsecutiveThrough || 2;
            const targetThroughCount = Math.floor(totalSpanLen / 2);

            let assignedThrough = 0;
            let currentThroughStreak = 0;
            prevDaysInfo.forEach(pc => {
                if (pc.shiftId === throughShift.id) {
                    assignedThrough++;
                    currentThroughStreak++;
                } else {
                    currentThroughStreak = 0;
                }
            });

            const curPattern = [];
            for (let i = 0; i < curDays.length; i++) {
                if (assignedThrough < targetThroughCount && currentThroughStreak < maxThroughConsecutive) {
                    curPattern.push(throughShift.id);
                    assignedThrough++;
                    currentThroughStreak++;
                } else {
                    curPattern.push(singleShift.id);
                    currentThroughStreak = 0;
                }
            }
            applyPatternToSpan(curDays, curPattern);
        }

        function processSpan(span) {
            const pattern = generateSpanPattern(span.length, state.generatorRules, throughShift.id, singleShift.id);
            applyPatternToSpan(span, pattern);
        }

        function applyPatternToSpan(span, pattern) {
            span.forEach((dayObj, idx) => {
                if (dayObj.day >= startDay && dayObj.day <= endDay) {
                    const key = `${member.id}_${dayObj.dateStr}`;
                    const cell = getCellData(key);

                    if (isHolidayValue(cell.shiftId)) return;

                    // ピン留め、および通常モードで入力されたロック済みシフトは上書きしない
                    if (cell.isPinned || (cell.shiftId && !cell.isGeneratedShift)) {
                        skippedLockedCount++;
                        return;
                    }

                    const targetShiftId = pattern[idx] || singleShift.id;
                    const newCell = {
                        shiftId: targetShiftId,
                        colorId: cell.colorId || '',
                        isPinned: false,
                        isGeneratedShift: true
                    };
                    state.schedule[key] = newCell;
                    updatedCellsMap[key] = newCell;
                    generatedCount++;
                }
            });
        }
    });

    renderAll();
    if (Object.keys(updatedCellsMap).length > 0) {
        syncBatchCellsToCloud(updatedCellsMap);
    }

    let msg = `${startDay}日〜${endDay}日のシフトを自動ジェネレートしました！\n・自動入力: ${generatedCount} 箇所`;
    if (skippedLockedCount > 0) {
        msg += `\n・ロック保護によりスキップ: ${skippedLockedCount} 箇所`;
    }
    showMessageModal(msg);
}

function clearTab2GeneratedShifts() {
    const { startDay, endDay, days } = getTab2GenRangeDays();
    const targetMembers = state.activeStaffFilter
        ? state.members.filter(m => m.attributes && m.attributes.includes(state.activeStaffFilter))
        : state.members;

    pushShiftGenerateUndoSnapshot();

    const batchUpdates = {};
    let clearedCount = 0;

    targetMembers.forEach(m => {
        for (let day = startDay; day <= endDay; day++) {
            const d = days[day - 1];
            if (!d) continue;
            const key = `${m.id}_${d.dateStr}`;
            const cell = getCellData(key);
            if (cell.isGeneratedShift && !isHolidayValue(cell.shiftId)) {
                cell.shiftId = '';
                cell.isGeneratedShift = false;
                if (!cell.colorId && !cell.isPinned) {
                    delete state.schedule[key];
                    batchUpdates[key] = null;
                } else {
                    state.schedule[key] = cell;
                    batchUpdates[key] = cell;
                }
                clearedCount++;
            }
        }
    });

    renderAll();
    if (Object.keys(batchUpdates).length > 0) {
        syncBatchCellsToCloud(batchUpdates);
    }
    showMessageModal(`${startDay}日〜${endDay}日の自動生成シフトをクリアしました（${clearedCount}件）。`);
}

function undoTab2ShiftGenerate() {
    const monthKey = `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}`;
    let idx = -1;
    for (let i = shiftGenerateUndoStack.length - 1; i >= 0; i--) {
        if (shiftGenerateUndoStack[i].monthKey === monthKey) {
            idx = i;
            break;
        }
    }
    if (idx === -1) return;

    const entry = shiftGenerateUndoStack.splice(idx, 1)[0];
    const batchUpdates = {};

    Object.keys(state.schedule).forEach(k => {
        if (k.includes(`_${monthKey}-`) && !(k in entry.snapshot)) {
            delete state.schedule[k];
            batchUpdates[k] = null;
        }
    });
    Object.keys(entry.snapshot).forEach(k => {
        state.schedule[k] = JSON.parse(JSON.stringify(entry.snapshot[k]));
        batchUpdates[k] = state.schedule[k];
    });

    renderAll();
    if (Object.keys(batchUpdates).length > 0) {
        syncBatchCellsToCloud(batchUpdates);
    }
}

function openRuleConfigModal() {
    const r1 = document.getElementById('rule-holiday-next-single');
    const r2 = document.getElementById('rule-max-consecutive-through');
    const r3 = document.getElementById('rule-odd-remainder-priority');

    if (r1) r1.checked = state.generatorRules.holidayNextSingle;
    if (r2) r2.value = state.generatorRules.maxConsecutiveThrough || 2;
    if (r3) r3.value = state.generatorRules.oddRemainderPriority || 'single';

    document.getElementById('rule-config-modal').classList.remove('hidden');
}

function closeRuleConfigModal() {
    document.getElementById('rule-config-modal').classList.add('hidden');
}

function saveRuleConfig() {
    state.generatorRules = {
        holidayNextSingle: document.getElementById('rule-holiday-next-single').checked,
        maxConsecutiveThrough: parseInt(document.getElementById('rule-max-consecutive-through').value) || 2,
        oddRemainderPriority: document.getElementById('rule-odd-remainder-priority').value
    };

    closeRuleConfigModal();
    saveData();
    saveMasterToCloud(true);
    showMessageModal("自動生成ルール設定を更新・保存しました。");
}
