// js/tab2_shift.js
// 【タブ2】属性設定（シフト作成・自動生成・ピン留め保護）

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
        <button onclick="selectTool('pin', 'toggle')" class="px-3 py-1.5 rounded-lg transition transform flex items-center gap-1 text-xs shadow-2xs ml-auto ${pinBtnStyle}" title="セルをクリックしてピン留め（上書き保護）を設定・解除">
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

    if (ca.isSplit) {
        const c1 = findName(ca.firstHalf?.courseId);
        const c2 = findName(ca.secondHalf?.courseId);
        if (!c1 && !c2) return '';
        return `
            <div class="mt-0.5 text-[8px] bg-sky-950/80 text-sky-200 px-1 py-0.2 rounded font-black tracking-tight flex items-center justify-center gap-0.5" title="前半: ${c1 || '未定'} / 後半: ${c2 || '未定'}">
                <span>${c1 || 'ー'}</span>/<span>${c2 || 'ー'}</span>
            </div>
        `;
    } else {
        const c = findName(ca.courseId);
        if (!c) return '';
        return `
            <div class="mt-0.5 text-[9px] bg-slate-900/80 text-white px-1 py-0.2 rounded font-black tracking-tight" title="コース: ${c}">
                ${c}
            </div>
        `;
    }
}

function renderMatrixMode2() {
    const container = document.getElementById('matrix-container-2');
    if (!container) return;
    const days = getMonthDays();

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
                <td colspan="${days.length + 2}" class="p-8 text-center text-slate-400 font-bold bg-slate-50">
                    選択された属性に該当するスタッフがいません。<br>
                    <button onclick="setStaffFilter(null)" class="mt-2 text-xs text-indigo-600 underline font-bold">全員表示に戻す</button>
                </td>
            </tr>
        `;
    } else {
        displayMembers.forEach(m => {
            const allDays = getMonthDays();
            const badgesHTML = getMemberBadgesHTML(m);

            html += `<tr class="border-b border-slate-300 hover:bg-slate-50 transition">`;
            html += `
                <td class="p-1.5 border-r border-b border-slate-300 font-bold text-slate-800 sticky-col-left shadow-2xs text-left">
                    <div class="flex items-center gap-1.5 justify-start">
                        <button onclick="clearMemberShifts('${m.id}')" title="ピン留め・休み以外のシフトを一括クリア" class="px-1.5 py-0.5 border rounded text-[10px] font-bold transition shrink-0 bg-slate-100 hover:bg-rose-500 hover:text-white text-slate-600 border-slate-300">
                            クリア
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
                    
                    let styleColor = '';
                    if (customColor) {
                        styleColor = customColor.color;
                    } else if (shift) {
                        styleColor = shift.color;
                    }

                    let cellBgClass = "bg-white text-slate-300";
                    if (d.isSunday) cellBgClass = "bg-rose-50/40 text-rose-300/60";
                    if (d.isSaturday) cellBgClass = "bg-sky-50/40 text-sky-300/60";

                    let style = cellBgClass;
                    if (styleColor) {
                        style = `font-extrabold text-white shadow-2xs transition transform active:scale-95`;
                    }

                    const pinBadge = isPinned 
                        ? `<span class="absolute top-0.5 right-0.5 text-[9px] leading-none drop-shadow-xs" title="ピン留め保護中（自動生成で上書きされません）">📌</span>` 
                        : '';

                    html += `
                        <td onclick="toggleShiftStamp('${m.id}', '${d.dateStr}')" class="p-1 border-r border-b border-slate-300 cursor-pointer select-none text-xs relative ${style}" style="${styleColor ? `background-color:${styleColor}` : ''}">
                            ${pinBadge}
                            <div class="leading-tight">${label}</div>
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

function openGeneratorModal() {
    const days = getMonthDays();
    if (days.length === 0) return;

    const startDateEl = document.getElementById('generator-start-date');
    const endDateEl = document.getElementById('generator-end-date');
    if (startDateEl && endDateEl) {
        startDateEl.value = days[0].dateStr;
        endDateEl.value = days[days.length - 1].dateStr;
    }

    const allCountEl = document.getElementById('gen-scope-all-count');
    if (allCountEl) allCountEl.innerText = state.members.length;

    const filteredLabel = document.getElementById('gen-scope-filtered-label');
    if (filteredLabel) {
        if (state.activeStaffFilter) {
            const matchCount = state.members.filter(m => m.attributes && m.attributes.includes(state.activeStaffFilter)).length;
            filteredLabel.innerHTML = `<input type="radio" name="generator-target-scope" value="filtered" class="text-indigo-600"> <span>絞り込み中のスタッフのみ (${matchCount}名)</span>`;
            filteredLabel.classList.remove('hidden');
        } else {
            filteredLabel.classList.add('hidden');
        }
    }

    document.getElementById('generator-modal').classList.remove('hidden');
}

function closeGeneratorModal() {
    document.getElementById('generator-modal').classList.add('hidden');
}

function setGeneratorRange(rangeType) {
    const days = getMonthDays();
    if (days.length === 0) return;

    const startDateEl = document.getElementById('generator-start-date');
    const endDateEl = document.getElementById('generator-end-date');
    if (!startDateEl || !endDateEl) return;

    if (rangeType === 'full') {
        startDateEl.value = days[0].dateStr;
        endDateEl.value = days[days.length - 1].dateStr;
    } else if (rangeType === 'first_half') {
        startDateEl.value = days[0].dateStr;
        const mid = days.find(d => d.day === 15) || days[Math.min(14, days.length - 1)];
        endDateEl.value = mid.dateStr;
    } else if (rangeType === 'second_half') {
        const mid = days.find(d => d.day === 16) || days[Math.min(15, days.length - 1)];
        startDateEl.value = mid.dateStr;
        endDateEl.value = days[days.length - 1].dateStr;
    }
}

function executeShiftGeneration() {
    const startDateStr = document.getElementById('generator-start-date').value;
    const endDateStr = document.getElementById('generator-end-date').value;

    if (!startDateStr || !endDateStr) {
        showMessageModal("開始日と終了日を正しく選択してください。");
        return;
    }
    if (startDateStr > endDateStr) {
        showMessageModal("開始日は終了日以前の日付を指定してください。");
        return;
    }

    const scope = document.querySelector('input[name="generator-target-scope"]:checked')?.value || 'all';
    let targetMembers = state.members;
    if (scope === 'filtered' && state.activeStaffFilter) {
        targetMembers = state.members.filter(m => m.attributes && m.attributes.includes(state.activeStaffFilter));
    }

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

    const days = getMonthDays();
    let generatedCount = 0;
    let skippedPinnedCount = 0;
    const updatedCellsMap = {};

    targetMembers.forEach(member => {
        let currentSpanDays = [];

        days.forEach(d => {
            const key = `${member.id}_${d.dateStr}`;
            const cell = getCellData(key);

            if (['休', '指', '有', '待', '健診', '健'].includes(cell.shiftId)) {
                if (currentSpanDays.length > 0) {
                    processSpan(currentSpanDays);
                    currentSpanDays = [];
                }
            } else {
                currentSpanDays.push(d);
            }
        });

        if (currentSpanDays.length > 0) {
            processSpan(currentSpanDays);
        }

        function processSpan(span) {
            const pattern = generateSpanPattern(span.length, state.generatorRules, throughShift.id, singleShift.id);

            span.forEach((dayObj, idx) => {
                if (dayObj.dateStr >= startDateStr && dayObj.dateStr <= endDateStr) {
                    const key = `${member.id}_${dayObj.dateStr}`;
                    const cell = getCellData(key);

                    if (['休', '指', '有', '待', '健診', '健'].includes(cell.shiftId)) return;

                    if (cell.isPinned) {
                        skippedPinnedCount++;
                        return;
                    }

                    const targetShiftId = pattern[idx] || singleShift.id;
                    const newCell = {
                        shiftId: targetShiftId,
                        colorId: cell.colorId || '',
                        isPinned: false
                    };
                    state.schedule[key] = newCell;
                    updatedCellsMap[key] = newCell;
                    generatedCount++;
                }
            });
        }
    });

    closeGeneratorModal();
    renderAll();
    syncBatchCellsToCloud(updatedCellsMap);

    let msg = `指定期間（${startDateStr} 〜 ${endDateStr}）のシフト自動生成が完了しました！\n・自動入力: ${generatedCount} 箇所`;
    if (skippedPinnedCount > 0) {
        msg += `\n・ピン留め保護によりスキップ: ${skippedPinnedCount} 箇所`;
    }
    showMessageModal(msg);
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
