// js/tab5_history.js
// タブ5: コース乗務履歴・適性管理（ブランク日数マトリクス、スプレッドシート取込、可否トグル、印刷）

function renderCourseHistoryTab() {
    const container = document.getElementById('course-history-table-container');
    if (!container) return;

    const targetDateInput = document.getElementById('history-target-date-input');
    const baseDateInput = document.getElementById('history-base-date-input');
    const alertDaysInput = document.getElementById('history-alert-days-input');
    const alertColorInput = document.getElementById('history-alert-color-input');
    const recentDaysInput = document.getElementById('history-recent-days-input');
    const recentColorInput = document.getElementById('history-recent-color-input');
    const printRowHeightInput = document.getElementById('history-print-row-height-input');
    const searchInput = document.getElementById('history-search-input');

    const baseDateStr = state.courseHistoryBase?.baseDate || '2026-10-15';
    const targetDateStr = state.courseHistoryTargetDate || state.selectedAssignmentDate || baseDateStr;
    const alertDays = state.courseHistoryAlertDays !== undefined ? Number(state.courseHistoryAlertDays) : 20;
    const alertColor = state.courseHistoryAlertColor || '#fef08a';
    const recentDays = state.courseHistoryRecentDays !== undefined ? Number(state.courseHistoryRecentDays) : 7;
    const recentColor = state.courseHistoryRecentColor || '#f97316';
    const printRowHeight = (state.courseHistoryPrintRowHeight !== undefined && state.courseHistoryPrintRowHeight !== null) ? Number(state.courseHistoryPrintRowHeight) : 5.0;
    const searchKeyword = searchInput ? searchInput.value.trim().toLowerCase() : '';

    if (targetDateInput && targetDateInput.value !== targetDateStr) {
        targetDateInput.value = targetDateStr;
    }
    if (baseDateInput && baseDateInput.value !== baseDateStr) {
        baseDateInput.value = baseDateStr;
    }
    if (alertDaysInput && Number(alertDaysInput.value) !== alertDays) {
        alertDaysInput.value = alertDays;
    }
    if (alertColorInput && alertColorInput.value !== alertColor) {
        alertColorInput.value = alertColor;
    }
    if (recentDaysInput && Number(recentDaysInput.value) !== recentDays) {
        recentDaysInput.value = recentDays;
    }
    if (recentColorInput && recentColorInput.value !== recentColor) {
        recentColorInput.value = recentColor;
    }
    if (printRowHeightInput && Number(printRowHeightInput.value) !== printRowHeight) {
        printRowHeightInput.value = printRowHeight.toFixed(1);
    }

    // コース一覧（任意区分を除外、順番通り）
    const sortedCourses = [...state.courses]
        .filter(c => c.isRequired !== false)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    // スタッフ絞り込み（同乗・待機区分は非表示・集計外）
    let displayMembers = (state.members || []).filter(m => {
        const role = getMemberRole(m);
        return role !== 'training_only' && role !== 'standby';
    });
    if (searchKeyword) {
        displayMembers = displayMembers.filter(m => (m.name || '').toLowerCase().includes(searchKeyword));
    }

    // 集計カウント
    const totalMembers = displayMembers.length;
    const totalCourses = sortedCourses.length;

    let html = `
        <div id="course-history-scroll-wrapper" class="w-full max-h-[calc(100vh-230px)] overflow-auto rounded-lg border border-slate-200 print:max-h-none print:overflow-visible print:rounded-none print:border-none">
            <table class="w-full text-center border-collapse text-xs history-matrix-table shadow-xs" style="--history-row-height: ${printRowHeight.toFixed(1)}mm;">
                <thead>
                    <tr class="bg-slate-100 text-slate-700 border-b-2 border-slate-300">
                        <th class="p-2 border border-slate-300 w-36 min-w-[120px] text-left font-extrabold sticky top-0 left-0 bg-slate-100 z-30 shadow-r history-col-name"></th>
                        ${sortedCourses.map(crs => `
                            <th class="p-1.5 border border-slate-300 min-w-[44px] text-center font-extrabold text-slate-800 sticky top-0 bg-slate-100 z-20" title="${crs.name}">
                                ${crs.name}
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody>
    `;

    // 印刷時用の中間コース名ヘッダー行（上から4人目のリーダーの上に挿入、4人未満なら非表示）
    const midHeaderHtml = `
        <tr class="hidden print:table-row bg-slate-100 text-slate-700 font-extrabold border-y-2 border-slate-400 break-after-avoid">
            <th class="p-1 px-2 border border-slate-300 text-left font-extrabold text-slate-800 history-col-name"></th>
            ${sortedCourses.map(crs => `
                <th class="p-1 border border-slate-300 min-w-[44px] text-center font-extrabold text-slate-800" title="${crs.name}">
                    ${crs.name}
                </th>
            `).join('')}
        </tr>
    `;

    if (displayMembers.length === 0) {
        html += `
            <tr>
                <td colspan="${1 + sortedCourses.length}" class="p-8 text-center text-slate-400 font-bold">
                    表示対象のスタッフデータがありません
                </td>
            </tr>
        `;
    } else {
        let leaderCount = 0;
        let hasInsertedMidHeader = false;

        displayMembers.forEach((member) => {
            const role = getMemberRole(member);
            if (role === 'leader') {
                leaderCount++;
                if (leaderCount === 4 && !hasInsertedMidHeader) {
                    html += midHeaderHtml;
                    hasInsertedMidHeader = true;
                }
            }

            const ngCourses = member.ngCourses || [];

            html += `
                <tr class="border-b border-slate-200 hover:bg-slate-50/80 transition">
                    <td class="p-1.5 px-2.5 border border-slate-200 text-left font-bold text-slate-900 whitespace-nowrap sticky left-0 bg-white z-10 shadow-r history-col-name" title="${member.name}">
                        ${member.name}
                    </td>
            `;

            sortedCourses.forEach(crs => {
                const isNG = ngCourses.includes(crs.id);
                // includeTargetDate = true で、表示対象日時点（当日に走ったシフトも含む）の経過日数を取得
                const info = getCourseBlankDisplayInfo(member.id, crs.id, targetDateStr, true);

                let cellBg = '';
                let cellText = '';
                let cellTitle = '';

                if (isNG) {
                    // 走行不可: グレーで塗りつぶし
                    cellBg = 'background-color: #cbd5e1;'; // slate-300
                    cellText = '<span class="text-slate-600 font-black text-xs select-none">✕</span>';
                    cellTitle = `${member.name} - ${crs.name}: 走行不可（クリックで可能に変更）`;
                } else if (info.isAlert) {
                    // 20日以上または90日以上ブランク（薄黄色警告）
                    cellBg = `background-color: ${alertColor};`;
                    cellText = `<span class="font-black text-xs text-amber-950">${info.text}</span>`;
                    cellTitle = `${member.name} - ${crs.name}: ${info.text === '-' ? '90日以上/未経験' : info.text + '日ぶり'} [${targetDateStr}時点]（クリックで走行不可に変更）`;
                } else {
                    // 20日未満（通常）
                    cellText = `<span class="font-bold text-xs text-slate-700">${info.text}</span>`;
                    cellTitle = `${member.name} - ${crs.name}: ${info.text}日ぶり [${targetDateStr}時点]（クリックで走行不可に変更）`;
                }

                html += `
                    <td onclick="toggleCourseNG('${member.id}', '${crs.id}')"
                        class="p-1 border border-slate-300 text-center align-middle cursor-pointer hover:ring-2 hover:ring-indigo-400 hover:ring-inset transition select-none"
                        style="${cellBg}"
                        title="${cellTitle}">
                        ${cellText}
                    </td>
                `;
            });

            html += `</tr>`;
        });
    }

    html += `
                </tbody>
            </table>
        </div>
    `;

    // スクロール位置の記憶（更新前の縦・横スクロール位置を保持）
    const prevScrollDiv = container.querySelector('#course-history-scroll-wrapper');
    const prevScrollTop = prevScrollDiv ? prevScrollDiv.scrollTop : 0;
    const prevScrollLeft = prevScrollDiv ? prevScrollDiv.scrollLeft : 0;
    const containerScrollLeft = container.scrollLeft;

    container.innerHTML = html;

    // スクロール位置の即時復元
    const newScrollDiv = container.querySelector('#course-history-scroll-wrapper');
    if (newScrollDiv) {
        newScrollDiv.scrollTop = prevScrollTop;
        newScrollDiv.scrollLeft = prevScrollLeft;
    }
    if (container) {
        container.scrollLeft = containerScrollLeft;
    }
    requestAnimationFrame(() => {
        if (newScrollDiv) {
            newScrollDiv.scrollTop = prevScrollTop;
            newScrollDiv.scrollLeft = prevScrollLeft;
        }
    });
}

// コースの走行可否（NG）をワンクリックでトグル切替
function toggleCourseNG(memberId, courseId) {
    const member = state.members.find(m => m.id === memberId);
    if (!member) return;

    if (!member.ngCourses) member.ngCourses = [];
    const idx = member.ngCourses.indexOf(courseId);
    const crs = state.courses.find(c => c.id === courseId);
    const courseName = crs ? crs.name : courseId;

    if (idx >= 0) {
        member.ngCourses.splice(idx, 1);
        if (typeof showToast === 'function') {
            showToast(`${member.name} さんの「${courseName}」を【走行可能】に設定しました`);
        }
    } else {
        member.ngCourses.push(courseId);
        if (typeof showToast === 'function') {
            showToast(`${member.name} さんの「${courseName}」を【走行不可（✕）】に設定しました`);
        }
    }

    saveData();
    renderAll();
    if (typeof saveMasterToCloud === 'function') {
        saveMasterToCloud(true);
    }
}

// 表示対象日変更
function onCourseHistoryTargetDateChange(val) {
    if (!val) return;
    state.courseHistoryTargetDate = val;
    renderCourseHistoryTab();
}

// タブ3の配車日と表示対象日を同期
function syncHistoryTargetDateWithToday() {
    const d = state.selectedAssignmentDate || state.courseHistoryBase?.baseDate || `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}-01`;
    state.courseHistoryTargetDate = d;
    renderCourseHistoryTab();
}

// 基準日変更
function onCourseHistoryBaseDateChange(val) {
    if (!val) return;
    if (!state.courseHistoryBase) {
        state.courseHistoryBase = { baseDate: val, records: {} };
    } else {
        state.courseHistoryBase.baseDate = val;
    }
    saveData();
    renderAll();
    if (typeof saveMasterToCloud === 'function') {
        saveMasterToCloud(true);
    }
}

// 警告日数閾値変更
function onCourseHistoryAlertDaysChange(val) {
    const num = parseInt(val);
    state.courseHistoryAlertDays = isNaN(num) ? 20 : num;
    saveData();
    renderAll();
    if (typeof saveMasterToCloud === 'function') {
        saveMasterToCloud(true);
    }
}

// 警告色変更
function onCourseHistoryAlertColorChange(val) {
    if (!val) return;
    state.courseHistoryAlertColor = val;
    saveData();
    renderAll();
    if (typeof saveMasterToCloud === 'function') {
        saveMasterToCloud(true);
    }
}

// 直近乗務日数閾値変更（7日以内）
function onCourseHistoryRecentDaysChange(val) {
    const num = parseInt(val);
    state.courseHistoryRecentDays = isNaN(num) ? 7 : num;
    saveData();
    renderAll();
    if (typeof saveMasterToCloud === 'function') {
        saveMasterToCloud(true);
    }
}

// 直近乗務強調色変更（オレンジ）
function onCourseHistoryRecentColorChange(val) {
    if (!val) return;
    state.courseHistoryRecentColor = val;
    saveData();
    renderAll();
    if (typeof saveMasterToCloud === 'function') {
        saveMasterToCloud(true);
    }
}

// 印刷時の行の高さ変更（mm）
function onCourseHistoryPrintRowHeightChange(val) {
    let num = parseFloat(val);
    if (isNaN(num)) num = 5.0;
    num = Math.max(3.5, Math.min(10.0, num));
    num = Math.round(num * 10) / 10;
    state.courseHistoryPrintRowHeight = num;
    saveData();
    renderCourseHistoryTab();
    if (typeof saveMasterToCloud === 'function') {
        saveMasterToCloud(true);
    }
}

// スプレッドシート取り込みモーダル開閉
function openCourseHistoryImportModal() {
    const textarea = document.getElementById('course-history-import-textarea');
    if (textarea) textarea.value = '';
    const modal = document.getElementById('course-history-import-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeCourseHistoryImportModal() {
    const modal = document.getElementById('course-history-import-modal');
    if (modal) modal.classList.add('hidden');
}

// スプレッドシート貼り付けデータの一括解析・保存
function saveCourseHistoryImport() {
    const textarea = document.getElementById('course-history-import-textarea');
    const text = textarea ? textarea.value.trim() : '';
    if (!text) {
        showMessageModal('貼り付けデータが空です。スプレッドシートの表をコピーして貼り付けてください。');
        return;
    }

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) {
        showMessageModal('データが不足しています。1行目にコース名ヘッダー、2行目以降にスタッフ別の経過日数が含まれる表をコピーしてください。');
        return;
    }

    // 1行目: ヘッダー解析（コースの列インデックス特定）
    const headerParts = lines[0].split('\t').map(p => p.trim());
    const courseColMap = []; // { colIdx, courseId, courseName }

    // コース検索用マップ（正規化キー: "01", "1", "01コース", etc.）
    const courseMap = new Map();
    state.courses.forEach(crs => {
        const cleanName = crs.name.replace(/コース$/, '').trim();
        courseMap.set(crs.name, crs.id);
        courseMap.set(cleanName, crs.id);
        const numOnly = cleanName.replace(/[^0-9]/g, '');
        if (numOnly) {
            courseMap.set(numOnly, crs.id);
            courseMap.set(String(parseInt(numOnly, 10)), crs.id);
            courseMap.set(String(parseInt(numOnly, 10)).padStart(2, '0'), crs.id);
        }
    });

    for (let c = 1; c < headerParts.length; c++) {
        const colHeader = headerParts[c];
        const cid = courseMap.get(colHeader) || 
                    courseMap.get(colHeader.replace(/コース$/, '').trim()) || 
                    courseMap.get(colHeader.replace(/[^0-9]/g, ''));
        if (cid) {
            courseColMap.push({ colIdx: c, courseId: cid, colHeader: colHeader });
        }
    }

    if (courseColMap.length === 0) {
        showMessageModal('1行目から該当するコース名（01コース〜31コース）を検出できませんでした。ヘッダーの列名をご確認ください。');
        return;
    }

    if (!state.courseHistoryBase) {
        state.courseHistoryBase = { baseDate: '2026-10-15', records: {} };
    }
    if (!state.courseHistoryBase.records) {
        state.courseHistoryBase.records = {};
    }

    let matchCount = 0;
    let memberMatchCount = 0;

    // 2行目以降: 各スタッフ行の解析
    for (let i = 1; i < lines.length; i++) {
        const rowParts = lines[i].split('\t').map(p => p.trim());
        if (rowParts.length === 0 || !rowParts[0]) continue;

        const rawName = rowParts[0];
        // スタッフ名照合（完全一致、または空白除去一致）
        const member = state.members.find(m => {
            if (m.name === rawName) return true;
            const normM = m.name.replace(/[\s　]/g, '');
            const normR = rawName.replace(/[\s　]/g, '');
            return normM === normR || normM.includes(normR) || normR.includes(normM);
        });

        if (!member) continue;

        memberMatchCount++;
        if (!state.courseHistoryBase.records[member.id]) {
            state.courseHistoryBase.records[member.id] = {};
        }

        courseColMap.forEach(({ colIdx, courseId }) => {
            if (colIdx < rowParts.length) {
                const valStr = rowParts[colIdx];
                if (valStr !== '' && valStr !== '-' && valStr !== 'ー') {
                    const num = parseInt(valStr.replace(/[^0-9]/g, ''), 10);
                    if (!isNaN(num)) {
                        state.courseHistoryBase.records[member.id][courseId] = num;
                        matchCount++;
                    }
                }
            }
        });
    }

    closeCourseHistoryImportModal();
    saveData();
    renderAll();
    if (typeof saveMasterToCloud === 'function') {
        saveMasterToCloud(true);
    }

    showMessageModal(`【取り込み完了】\nスタッフ ${memberMatchCount} 名、合計 ${matchCount} 件のコース乗務経過日数を登録しました！`);
}

// 帳票印刷（横向き）
function executeHistoryPrint() {
    document.body.classList.add('printing-mode-5');

    // タブ5専用のB4横向き@pageルールを動的に注入（タブ4のB4縦と分離）
    let printStyle = document.getElementById('tab5-print-style-tag');
    if (!printStyle) {
        printStyle = document.createElement('style');
        printStyle.id = 'tab5-print-style-tag';
        printStyle.textContent = `
            @page {
                size: B4 landscape !important;
                margin: 4mm 4mm !important;
            }
        `;
        document.head.appendChild(printStyle);
    }

    setTimeout(() => {
        window.print();
    }, 50);
}

window.addEventListener('afterprint', () => {
    document.body.classList.remove('printing-mode-5');
    const printStyle = document.getElementById('tab5-print-style-tag');
    if (printStyle) {
        printStyle.remove();
    }
});

// グローバル公開
window.renderCourseHistoryTab = renderCourseHistoryTab;
window.toggleCourseNG = toggleCourseNG;
window.onCourseHistoryTargetDateChange = onCourseHistoryTargetDateChange;
window.syncHistoryTargetDateWithToday = syncHistoryTargetDateWithToday;
window.onCourseHistoryBaseDateChange = onCourseHistoryBaseDateChange;
window.onCourseHistoryAlertDaysChange = onCourseHistoryAlertDaysChange;
window.onCourseHistoryAlertColorChange = onCourseHistoryAlertColorChange;
window.onCourseHistoryRecentDaysChange = onCourseHistoryRecentDaysChange;
window.onCourseHistoryRecentColorChange = onCourseHistoryRecentColorChange;
window.onCourseHistoryPrintRowHeightChange = onCourseHistoryPrintRowHeightChange;
window.openCourseHistoryImportModal = openCourseHistoryImportModal;
window.closeCourseHistoryImportModal = closeCourseHistoryImportModal;
window.saveCourseHistoryImport = saveCourseHistoryImport;
window.executeHistoryPrint = executeHistoryPrint;
