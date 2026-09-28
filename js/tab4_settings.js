// js/tab4_settings.js
// 【タブ4】設定（スタッフ・コース・グループ・属性各種マスター管理）

function renderMode4() {
    const staffCountBadge = document.getElementById('staff-count-badge');
    if (staffCountBadge) staffCountBadge.innerText = state.members.length;

    const staffTableBody = document.getElementById('staff-master-table-body');
    if (staffTableBody) {
        if (state.members.length === 0) {
            staffTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="p-6 text-center text-slate-400 font-bold bg-slate-50">
                        登録されているスタッフがいません。「＋ スタッフを追加」または「📋 スプレッドシート取り込み」から追加してください。
                    </td>
                </tr>
            `;
        } else {
            staffTableBody.innerHTML = state.members.map((m, idx) => {
                const badgesHTML = getMemberBadgesHTML(m);
                const ngCount = (m.ngCourses || []).length;
                const isFirst = idx === 0;
                const isLast = idx === state.members.length - 1;
                return `
                    <tr class="border-b border-slate-200 hover:bg-slate-50">
                        <td class="p-3 text-center">
                            <div class="flex items-center justify-center gap-1">
                                <div class="flex flex-col gap-0.5">
                                    <button onclick="moveMember(${idx}, -1)" ${isFirst ? 'disabled class="text-slate-300 cursor-not-allowed text-[10px] leading-none px-1 py-0.5"' : 'class="text-slate-600 hover:text-indigo-600 hover:bg-slate-200 rounded text-[10px] leading-none font-black px-1 py-0.5 transition"'} title="上へ移動">▲</button>
                                    <button onclick="moveMember(${idx}, 1)" ${isLast ? 'disabled class="text-slate-300 cursor-not-allowed text-[10px] leading-none px-1 py-0.5"' : 'class="text-slate-600 hover:text-indigo-600 hover:bg-slate-200 rounded text-[10px] leading-none font-black px-1 py-0.5 transition"'} title="下へ移動">▼</button>
                                </div>
                                <span class="font-bold text-slate-600 text-xs w-5 text-right">${idx + 1}</span>
                            </div>
                        </td>
                        <td class="p-3 font-bold text-slate-800">${m.name}</td>
                        <td class="p-3">
                            <div class="flex items-center gap-1 flex-wrap">
                                ${badgesHTML || '<span class="text-xs text-slate-400">なし</span>'}
                            </div>
                        </td>
                        <td class="p-3 text-xs font-bold ${ngCount > 0 ? 'text-rose-600' : 'text-slate-400'}">
                            ${ngCount > 0 ? `⚠️ ${ngCount}コースNG` : 'NGなし'}
                        </td>
                        <td class="p-3 text-right space-x-2">
                            <button onclick="openMemberEditModal('${m.id}')" class="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 rounded text-xs font-bold">編集</button>
                            <button onclick="deleteStaffDirect('${m.id}')" class="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded text-xs font-bold">削除</button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    const courseCountBadge = document.getElementById('course-count-badge');
    if (courseCountBadge) courseCountBadge.innerText = state.courses.length;

    const courseTableBody = document.getElementById('course-master-table-body');
    if (courseTableBody) {
        state.courses.sort((a, b) => (a.order || 0) - (b.order || 0));
        courseTableBody.innerHTML = state.courses.map((crs, idx) => {
            const ngStaffCount = state.members.filter(m => m.ngCourses && m.ngCourses.includes(crs.id)).length;
            const isReq = crs.isRequired !== false;
            const isFirst = idx === 0;
            const isLast = idx === state.courses.length - 1;
            return `
                <tr class="border-b border-slate-200 hover:bg-slate-50">
                    <td class="p-3 text-center">
                        <div class="flex items-center justify-center gap-1">
                            <div class="flex flex-col gap-0.5">
                                <button onclick="moveCourse(${idx}, -1)" ${isFirst ? 'disabled class="text-slate-300 cursor-not-allowed text-[10px] leading-none px-1 py-0.5"' : 'class="text-slate-600 hover:text-sky-600 hover:bg-slate-200 rounded text-[10px] leading-none font-black px-1 py-0.5 transition"'} title="上へ移動">▲</button>
                                <button onclick="moveCourse(${idx}, 1)" ${isLast ? 'disabled class="text-slate-300 cursor-not-allowed text-[10px] leading-none px-1 py-0.5"' : 'class="text-slate-600 hover:text-sky-600 hover:bg-slate-200 rounded text-[10px] leading-none font-black px-1 py-0.5 transition"'} title="下へ移動">▼</button>
                            </div>
                            <span class="font-black text-slate-700 text-xs w-5 text-right">${crs.order}</span>
                        </div>
                    </td>
                    <td class="p-3 text-center">
                        <span class="px-2 py-0.5 rounded text-[11px] font-black ${isReq ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">
                            ${isReq ? '必須' : '任意'}
                        </span>
                    </td>
                    <td class="p-3 font-bold text-slate-800">${crs.name}</td>
                    <td class="p-3 text-xs font-bold ${ngStaffCount > 0 ? 'text-rose-600' : 'text-slate-400'}">
                        ${ngStaffCount > 0 ? `⚠️ ${ngStaffCount}名が担当不可` : '担当不可なし'}
                    </td>
                    <td class="p-3 text-right space-x-2">
                        <button onclick="openCourseModal('${crs.id}')" class="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 rounded text-xs font-bold">編集</button>
                        <button onclick="deleteCourse('${crs.id}')" class="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded text-xs font-bold">削除</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // コース選択グループ（いずれか選択枠）のレンダリング
    const groupCountBadge = document.getElementById('course-group-count-badge');
    if (groupCountBadge) groupCountBadge.innerText = (state.courseGroups || []).length;

    const courseGroupTableBody = document.getElementById('course-group-table-body');
    if (courseGroupTableBody) {
        if (!state.courseGroups || state.courseGroups.length === 0) {
            courseGroupTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="p-6 text-center text-slate-400 font-bold bg-slate-50">
                        登録されているコース選択グループがありません。「＋ 選択グループを追加」から設定してください。
                    </td>
                </tr>
            `;
        } else {
            courseGroupTableBody.innerHTML = state.courseGroups.map(group => {
                const targetCourses = (group.courseIds || []).map(cid => state.courses.find(c => c.id === cid)).filter(Boolean);
                return `
                    <tr class="border-b border-slate-200 hover:bg-slate-50">
                        <td class="p-3 font-bold text-slate-800">
                            <div class="flex items-center gap-1.5">
                                <span class="text-violet-600">🔀</span>
                                <span>${group.name}</span>
                            </div>
                        </td>
                        <td class="p-3 text-center">
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-violet-100 text-violet-800 border border-violet-200">
                                ${group.requiredCount || 1} 枠
                            </span>
                        </td>
                        <td class="p-3">
                            <div class="flex items-center gap-1.5 flex-wrap">
                                ${targetCourses.length > 0 
                                    ? targetCourses.map(c => `
                                        <span class="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                            ${c.order}. ${c.name}
                                        </span>
                                    `).join('')
                                    : '<span class="text-xs text-rose-500 font-bold">対象コース未選択</span>'
                                }
                            </div>
                        </td>
                        <td class="p-3 text-right space-x-2">
                            <button onclick="openCourseGroupModal('${group.id}')" class="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 rounded text-xs font-bold">編集</button>
                            <button onclick="deleteCourseGroup('${group.id}')" class="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded text-xs font-bold">削除</button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    const staffAttrTableBody = document.getElementById('staff-attributes-table-body');
    if (staffAttrTableBody) {
        staffAttrTableBody.innerHTML = state.staffAttributes.map(attr => {
            const count = state.members.filter(m => m.attributes && m.attributes.includes(attr.id)).length;
            return `
                <tr class="border-b border-slate-200 hover:bg-slate-50">
                    <td class="p-3">
                        <span class="text-xs px-2 py-0.5 rounded font-black text-white shadow-2xs" style="background-color:${attr.color}">${attr.shortName || attr.name}</span>
                    </td>
                    <td class="p-3 font-bold text-slate-800">${attr.name}</td>
                    <td class="p-3 font-black text-slate-700">${attr.shortName || attr.name}</td>
                    <td class="p-3 text-xs font-bold text-slate-600">${count}名</td>
                    <td class="p-3 text-right space-x-2">
                        <button onclick="openStaffAttrModal('${attr.id}')" class="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 rounded text-xs font-bold">編集</button>
                        <button onclick="deleteStaffAttr('${attr.id}')" class="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded text-xs font-bold">削除</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    const shiftTableBody = document.getElementById('shift-types-table-body');
    if (shiftTableBody) {
        shiftTableBody.innerHTML = state.shiftTypes.map(st => {
            return `
                <tr class="border-b border-slate-200 hover:bg-slate-50">
                    <td class="p-3">
                        <span class="w-6 h-6 rounded-full inline-block align-middle border border-slate-300 shadow-2xs" style="background-color:${st.color}"></span>
                    </td>
                    <td class="p-3 font-bold text-slate-800">${st.name}</td>
                    <td class="p-3 font-black text-slate-700">${st.shortName}</td>
                    <td class="p-3 text-center font-bold text-slate-800">${st.count}人</td>
                    <td class="p-3 text-right space-x-2">
                        <button onclick="openShiftModal('${st.id}')" class="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 rounded text-xs font-bold">編集</button>
                        <button onclick="deleteShiftType('${st.id}')" class="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded text-xs font-bold">削除</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    const colorTableBody = document.getElementById('color-types-table-body');
    if (colorTableBody) {
        colorTableBody.innerHTML = state.colorTypes.map(ct => {
            return `
                <tr class="border-b border-slate-200 hover:bg-slate-50">
                    <td class="p-3">
                        <span class="w-6 h-6 rounded-full inline-block align-middle border border-slate-300 shadow-2xs" style="background-color:${ct.color}"></span>
                    </td>
                    <td class="p-3 font-bold text-slate-800">${ct.name}</td>
                    <td class="p-3 font-black text-slate-700">${ct.shortName || 'なし'}</td>
                    <td class="p-3 text-xs text-slate-400 font-medium">カウント対象外</td>
                    <td class="p-3 text-right space-x-2">
                        <button onclick="openColorModal('${ct.id}')" class="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 rounded text-xs font-bold">編集</button>
                        <button onclick="deleteColorType('${ct.id}')" class="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded text-xs font-bold">削除</button>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

function openCourseModal(id = null) {
    document.getElementById('course-modal-id').value = id || '';
    document.getElementById('course-modal-title').innerText = id ? 'コースの編集' : 'コースの追加';

    if (id) {
        const crs = state.courses.find(c => c.id === id);
        if (crs) {
            document.getElementById('course-modal-order').value = crs.order || 1;
            document.getElementById('course-modal-name').value = crs.name;
            document.getElementById('course-modal-required').value = crs.isRequired !== false ? 'true' : 'false';
        }
    } else {
        const nextOrder = state.courses.length > 0 ? Math.max(...state.courses.map(c => c.order || 0)) + 1 : 1;
        document.getElementById('course-modal-order').value = nextOrder;
        document.getElementById('course-modal-name').value = '';
        document.getElementById('course-modal-required').value = 'true';
    }
    document.getElementById('course-modal').classList.remove('hidden');
}

function closeCourseModal() {
    document.getElementById('course-modal').classList.add('hidden');
}

function saveCourse() {
    const id = document.getElementById('course-modal-id').value;
    const order = parseInt(document.getElementById('course-modal-order').value) || 1;
    const name = document.getElementById('course-modal-name').value.trim();
    const isRequired = document.getElementById('course-modal-required').value === 'true';

    if (!name) return;

    if (id) {
        const crs = state.courses.find(c => c.id === id);
        if (crs) {
            crs.order = order;
            crs.name = name;
            crs.isRequired = isRequired;
        }
    } else {
        state.courses.push({
            id: 'c_' + Date.now(),
            order: order,
            name: name,
            isRequired: isRequired
        });
    }

    closeCourseModal();
    renderAll();
    saveMasterToCloud(true);
}

function deleteCourse(id) {
    state.courses = state.courses.filter(c => c.id !== id);
    state.members.forEach(m => {
        if (m.ngCourses) {
            m.ngCourses = m.ngCourses.filter(cid => cid !== id);
        }
    });
    renderAll();
    saveMasterToCloud(true);
}

function openCourseGroupModal(id = null) {
    const modal = document.getElementById('course-group-modal');
    if (!modal) return;

    document.getElementById('course-group-modal-id').value = id || '';
    document.getElementById('course-group-modal-title').innerText = id ? '🔀 コース選択グループの編集' : '🔀 コース選択グループの追加';

    const container = document.getElementById('course-group-modal-courses-container');
    const targetGroup = id && state.courseGroups ? state.courseGroups.find(g => g.id === id) : null;

    document.getElementById('course-group-modal-name').value = targetGroup ? targetGroup.name : '';
    document.getElementById('course-group-modal-count').value = targetGroup ? (targetGroup.requiredCount || 1) : 1;

    const selectedCourseIds = targetGroup && Array.isArray(targetGroup.courseIds) ? targetGroup.courseIds : [];

    if (container) {
        container.innerHTML = state.courses.map(crs => {
            const isChecked = selectedCourseIds.includes(crs.id);
            return `
                <label class="flex items-center gap-1.5 p-1.5 rounded-md border text-xs cursor-pointer transition select-none ${isChecked ? 'bg-violet-50 border-violet-300 text-violet-800 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}">
                    <input type="checkbox" value="${crs.id}" class="course-group-checkbox text-violet-600 rounded" ${isChecked ? 'checked' : ''}>
                    <span class="truncate">${crs.order}. ${crs.name}</span>
                </label>
            `;
        }).join('');
    }

    modal.classList.remove('hidden');
}

function closeCourseGroupModal() {
    const modal = document.getElementById('course-group-modal');
    if (modal) modal.classList.add('hidden');
}

function saveCourseGroup() {
    if (!state.courseGroups) state.courseGroups = [];

    const id = document.getElementById('course-group-modal-id').value;
    const name = document.getElementById('course-group-modal-name').value.trim();
    const requiredCount = parseInt(document.getElementById('course-group-modal-count').value) || 1;

    if (!name) {
        showMessageModal("グループ名を入力してください。");
        return;
    }

    const cbs = document.querySelectorAll('.course-group-checkbox:checked');
    const selectedCourseIds = Array.from(cbs).map(cb => cb.value);

    if (id) {
        const group = state.courseGroups.find(g => g.id === id);
        if (group) {
            group.name = name;
            group.requiredCount = requiredCount;
            group.courseIds = selectedCourseIds;
        }
    } else {
        state.courseGroups.push({
            id: 'cg_' + Date.now(),
            name: name,
            requiredCount: requiredCount,
            courseIds: selectedCourseIds
        });
    }

    closeCourseGroupModal();
    renderAll();
    saveMasterToCloud(true);
}

function deleteCourseGroup(id) {
    if (!state.courseGroups) return;
    state.courseGroups = state.courseGroups.filter(g => g.id !== id);
    renderAll();
    saveMasterToCloud(true);
}

function openCourseImportModal() {
    document.getElementById('course-import-textarea').value = '';
    document.getElementById('course-import-modal').classList.remove('hidden');
}

function closeCourseImportModal() {
    document.getElementById('course-import-modal').classList.add('hidden');
}

function executeCourseImport() {
    const text = document.getElementById('course-import-textarea').value.trim();
    if (!text) return;

    const mode = document.querySelector('input[name="course-import-mode"]:checked').value;
    if (mode === 'replace') {
        state.courses = [];
    }

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let addedCount = 0;

    lines.forEach((line, idx) => {
        const parts = line.split(/[\t,]/).map(p => p.trim());
        let order = (state.courses.length + 1);
        let name = '';
        let isRequired = true;

        if (parts.length >= 3 && !isNaN(parseInt(parts[0]))) {
            order = parseInt(parts[0]);
            name = parts[1];
            if (['任意', '臨時', '予備', 'false', '0'].includes(parts[2])) {
                isRequired = false;
            }
        } else if (parts.length === 2) {
            if (!isNaN(parseInt(parts[0]))) {
                order = parseInt(parts[0]);
                name = parts[1];
            } else {
                name = parts[0];
                if (['任意', '臨時', '予備', 'false', '0'].includes(parts[1])) {
                    isRequired = false;
                }
            }
        } else {
            name = parts[0];
        }

        if (name) {
            state.courses.push({
                id: 'c_' + Date.now() + '_' + idx,
                order: order,
                name: name,
                isRequired: isRequired
            });
            addedCount++;
        }
    });

    closeCourseImportModal();
    renderAll();
    saveMasterToCloud(true);
    showMessageModal(`${addedCount}件のコースを取り込みました！`);
}

function openMemberEditModal(memberId = null) {
    const titleEl = document.getElementById('member-edit-modal-title');
    const deleteContainer = document.getElementById('member-edit-delete-container');
    const member = memberId ? state.members.find(m => m.id === memberId) : null;

    document.getElementById('member-edit-id').value = memberId || '';

    if (member) {
        titleEl.innerText = '👤 スタッフ情報の編集';
        document.getElementById('member-edit-name').value = member.name;
        deleteContainer.classList.remove('hidden');
    } else {
        titleEl.innerText = '👤 スタッフの新規追加';
        document.getElementById('member-edit-name').value = '';
        deleteContainer.classList.add('hidden');
    }

    const attrContainer = document.getElementById('member-edit-attributes-container');
    const currentAttrs = member ? (member.attributes || []) : [];
    attrContainer.innerHTML = state.staffAttributes.map(attr => {
        const isChecked = currentAttrs.includes(attr.id);
        return `
            <label class="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
                <input type="checkbox" value="${attr.id}" class="member-attr-checkbox text-indigo-600 rounded" ${isChecked ? 'checked' : ''}>
                <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${attr.color}"></span>
                <span class="font-bold text-slate-700 truncate">${attr.name}</span>
            </label>
        `;
    }).join('');

    const ngContainer = document.getElementById('member-edit-ng-courses-container');
    const currentNG = member ? (member.ngCourses || []) : [];
    ngContainer.innerHTML = state.courses.map(crs => {
        const isNG = currentNG.includes(crs.id);
        return `
            <label class="flex items-center gap-1.5 p-1.5 rounded-md border text-xs cursor-pointer transition select-none ${isNG ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}">
                <input type="checkbox" value="${crs.id}" class="member-ng-checkbox text-rose-600 rounded" ${isNG ? 'checked' : ''}>
                <span class="truncate">${crs.order}. ${crs.name}</span>
            </label>
        `;
    }).join('');

    document.getElementById('member-edit-modal').classList.remove('hidden');
}

function closeMemberEditModal() {
    document.getElementById('member-edit-modal').classList.add('hidden');
}

function saveMemberEdit() {
    const memberId = document.getElementById('member-edit-id').value;
    const newName = document.getElementById('member-edit-name').value.trim();
    if (!newName) {
        showMessageModal("スタッフ名を入力してください。");
        return;
    }

    const attrCbs = document.querySelectorAll('.member-attr-checkbox:checked');
    const selectedAttrs = Array.from(attrCbs).map(cb => cb.value);

    const ngCbs = document.querySelectorAll('.member-ng-checkbox:checked');
    const selectedNGs = Array.from(ngCbs).map(cb => cb.value);

    if (memberId) {
        const member = state.members.find(m => m.id === memberId);
        if (member) {
            member.name = newName;
            member.attributes = selectedAttrs;
            member.ngCourses = selectedNGs;
        }
    } else {
        state.members.push({
            id: 'm_' + Date.now(),
            name: newName,
            attributes: selectedAttrs,
            ngCourses: selectedNGs
        });
    }

    closeMemberEditModal();
    renderAll();
    saveMasterToCloud(true);
}

function deleteCurrentMember() {
    const memberId = document.getElementById('member-edit-id').value;
    if (!memberId) return;

    deleteStaffDirect(memberId);
    closeMemberEditModal();
}

function deleteStaffDirect(memberId) {
    const target = state.members.find(m => m.id === memberId);
    if (!target) return;

    state.members = state.members.filter(m => m.id !== memberId);
    renderAll();
    saveMasterToCloud(true);
    showMessageModal(`スタッフ「${target.name}」を削除しました。`);
}

function moveMember(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= state.members.length) return;

    const temp = state.members[index];
    state.members[index] = state.members[newIndex];
    state.members[newIndex] = temp;

    renderAll();
    saveMasterToCloud(true);
}

function moveCourse(index, direction) {
    state.courses.sort((a, b) => (a.order || 0) - (b.order || 0));

    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= state.courses.length) return;

    const temp = state.courses[index];
    state.courses[index] = state.courses[newIndex];
    state.courses[newIndex] = temp;

    state.courses.forEach((crs, i) => {
        crs.order = i + 1;
    });

    renderAll();
    saveMasterToCloud(true);
}


function initDefaultMembers() {
    state.members = [
        { id: 'm_1', name: 'スタッフ 01', attributes: ['attr_1t', 'attr_tenko'], ngCourses: [] },
        { id: 'm_2', name: 'スタッフ 02', attributes: ['attr_night'], ngCourses: ['c_01'] }
    ];
}

function saveAsDefaultMaster() {
    try {
        localStorage.setItem('shift_app_default_shift_types', JSON.stringify(state.shiftTypes));
        localStorage.setItem('shift_app_default_color_types', JSON.stringify(state.colorTypes));
        localStorage.setItem('shift_app_default_staff_attributes', JSON.stringify(state.staffAttributes));
        localStorage.setItem('shift_app_default_courses', JSON.stringify(state.courses));
        saveMasterToCloud(true);
        showMessageModal("現在の設定を「デフォルト設定」として保存しました！");
    } catch (e) {
        console.error("Failed to save default master", e);
        showMessageModal("デフォルト設定の保存に失敗しました。");
    }
}

function resetToDefaultMaster() {
    const defShift = localStorage.getItem('shift_app_default_shift_types');
    const defColor = localStorage.getItem('shift_app_default_color_types');
    const defStaffAttr = localStorage.getItem('shift_app_default_staff_attributes');
    const defCourses = localStorage.getItem('shift_app_default_courses');

    if (!defShift && !defColor && !defStaffAttr && !defCourses) {
        showMessageModal("保存されたデフォルト設定がありません。");
        return;
    }

    try {
        if (defShift) state.shiftTypes = JSON.parse(defShift);
        if (defColor) state.colorTypes = JSON.parse(defColor);
        if (defStaffAttr) state.staffAttributes = JSON.parse(defStaffAttr);
        if (defCourses) state.courses = JSON.parse(defCourses);
        renderAll();
        saveMasterToCloud(true);
        showMessageModal("デフォルト設定を読み込み、属性とコース一覧を復元しました。");
    } catch (e) {
        console.error("Failed to reset default master", e);
        showMessageModal("デフォルト設定の読み込みに失敗しました。");
    }
}



function openStaffAttrModal(id = null) {
    document.getElementById('staff-attr-modal-id').value = id || '';
    document.getElementById('staff-attr-modal-title').innerText = id ? 'スタッフ属性の編集' : 'スタッフ属性の追加';

    if (id) {
        const attr = state.staffAttributes.find(a => a.id === id);
        if (attr) {
            document.getElementById('staff-attr-modal-name').value = attr.name;
            document.getElementById('staff-attr-modal-short').value = attr.shortName || '';
            document.getElementById('staff-attr-modal-color').value = attr.color;
        }
    } else {
        document.getElementById('staff-attr-modal-name').value = '';
        document.getElementById('staff-attr-modal-short').value = '';
        document.getElementById('staff-attr-modal-color').value = getRandomColor();
    }
    document.getElementById('staff-attr-modal').classList.remove('hidden');
}

function closeStaffAttrModal() {
    document.getElementById('staff-attr-modal').classList.add('hidden');
}

function saveStaffAttr() {
    const id = document.getElementById('staff-attr-modal-id').value;
    const name = document.getElementById('staff-attr-modal-name').value.trim();
    const shortName = document.getElementById('staff-attr-modal-short').value.trim() || name.substring(0, 2);
    const color = document.getElementById('staff-attr-modal-color').value;

    if (!name) return;

    if (id) {
        const attr = state.staffAttributes.find(a => a.id === id);
        if (attr) {
            attr.name = name;
            attr.shortName = shortName;
            attr.color = color;
        }
    } else {
        state.staffAttributes.push({
            id: 'attr_' + Date.now(),
            name: name,
            shortName: shortName,
            color: color
        });
    }

    closeStaffAttrModal();
    renderAll();
    saveMasterToCloud(true);
}

function deleteStaffAttr(id) {
    state.staffAttributes = state.staffAttributes.filter(a => a.id !== id);
    state.members.forEach(m => {
        if (m.attributes) {
            m.attributes = m.attributes.filter(attrId => attrId !== id);
        }
    });
    if (state.activeStaffFilter === id) {
        state.activeStaffFilter = null;
    }
    if (state.activeAssignmentStaffFilter === id) {
        state.activeAssignmentStaffFilter = null;
    }
    renderAll();
    saveMasterToCloud(true);
}

function openStaffImportModal() {
    document.getElementById('staff-import-textarea').value = '';
    document.getElementById('staff-import-modal').classList.remove('hidden');
}

function closeStaffImportModal() {
    document.getElementById('staff-import-modal').classList.add('hidden');
}

function executeStaffImport() {
    const text = document.getElementById('staff-import-textarea').value.trim();
    if (!text) return;

    const mode = document.querySelector('input[name="staff-import-mode"]:checked').value;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    if (lines.length === 0) return;

    if (mode === 'replace') {
        state.members = [];
    }

    const firstLineParts = lines[0].split(/[\t,]/).map(p => p.trim());
    const hasHeader = firstLineParts.length > 1;

    let startIndex = 0;
    let attrColMap = [];

    if (hasHeader) {
        startIndex = 1;
        for (let col = 1; col < firstLineParts.length; col++) {
            const colName = firstLineParts[col];
            if (!colName) continue;

            let existingAttr = state.staffAttributes.find(a => a.name === colName || a.shortName === colName);
            if (!existingAttr) {
                existingAttr = {
                    id: 'attr_' + Date.now() + '_' + col,
                    name: colName,
                    shortName: colName.substring(0, 2),
                    color: getRandomColor()
                };
                state.staffAttributes.push(existingAttr);
            }
            attrColMap.push({ colIndex: col, attrId: existingAttr.id });
        }
    }

    let importedCount = 0;
    for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(/[\t,]/).map(p => p.trim());
        const name = parts[0];
        if (!name) continue;

        const assignedAttrs = [];

        if (hasHeader) {
            attrColMap.forEach(map => {
                const cellVal = parts[map.colIndex] || '';
                if (['〇', '○', '1', '有', 'true', 'TRUE', 'ok', 'OK', 'レ'].includes(cellVal) || cellVal.length > 0) {
                    assignedAttrs.push(map.attrId);
                }
            });
        }

        state.members.push({
            id: 'm_' + Date.now() + '_' + i,
            name: name,
            attributes: assignedAttrs,
            ngCourses: []
        });
        importedCount++;
    }

    closeStaffImportModal();
    renderAll();
    saveMasterToCloud(true);
    showMessageModal(`${importedCount}名のスタッフを取り込みました！`);
}

function openShiftImportModal() {
    document.getElementById('shift-import-textarea').value = '';
    document.getElementById('shift-import-modal').classList.remove('hidden');
}

function closeShiftImportModal() {
    document.getElementById('shift-import-modal').classList.add('hidden');
}

function executeShiftImport() {
    const text = document.getElementById('shift-import-textarea').value.trim();
    if (!text) return;

    const mode = document.querySelector('input[name="shift-import-mode"]:checked').value;
    if (mode === 'replace') state.shiftTypes = [];

    const lines = text.split('\n');
    let count = 0;

    lines.forEach((line, idx) => {
        const parts = line.split(/[\t,]/).map(p => p.trim());
        if (parts.length >= 1 && parts[0] !== '') {
            const shiftName = parts[0];
            const shortName = parts[1] || shiftName.substring(0, 1);
            const targetCount = parseInt(parts[2]) || 1;

            state.shiftTypes.push({
                id: 's_' + Date.now() + '_' + idx,
                name: shiftName,
                shortName: shortName,
                count: targetCount,
                color: getRandomColor()
            });
            count++;
        }
    });

    closeShiftImportModal();
    renderAll();
    saveMasterToCloud(true);
    showMessageModal(`${count}件のシフト属性を取り込みました。`);
}

function openColorImportModal() {
    document.getElementById('color-import-textarea').value = '';
    document.getElementById('color-import-modal').classList.remove('hidden');
}

function closeColorImportModal() {
    document.getElementById('color-import-modal').classList.add('hidden');
}

function executeColorImport() {
    const text = document.getElementById('color-import-textarea').value.trim();
    if (!text) return;

    const mode = document.querySelector('input[name="color-import-mode"]:checked').value;
    if (mode === 'replace') state.colorTypes = [];

    const lines = text.split('\n');
    let count = 0;

    lines.forEach((line, idx) => {
        const parts = line.split(/[\t,]/).map(p => p.trim());
        if (parts.length >= 1 && parts[0] !== '') {
            const colorName = parts[0];
            const shortName = parts[1] || '';

            state.colorTypes.push({
                id: 'c_' + Date.now() + '_' + idx,
                name: colorName,
                shortName: shortName,
                color: getRandomColor()
            });
            count++;
        }
    });

    closeColorImportModal();
    renderAll();
    saveMasterToCloud(true);
    showMessageModal(`${count}件のカラー属性を取り込みました。`);
}

function openShiftModal(id = null) {
    document.getElementById('shift-modal-id').value = id || '';
    document.getElementById('shift-modal-title').innerText = id ? 'シフト属性の編集' : 'シフト属性の追加';

    if (id) {
        const st = state.shiftTypes.find(s => s.id === id);
        if (st) {
            document.getElementById('shift-modal-name').value = st.name;
            document.getElementById('shift-modal-short').value = st.shortName;
            document.getElementById('shift-modal-count').value = st.count;
            document.getElementById('shift-modal-color').value = st.color;
        }
    } else {
        document.getElementById('shift-modal-name').value = '';
        document.getElementById('shift-modal-short').value = '';
        document.getElementById('shift-modal-count').value = 14;
        document.getElementById('shift-modal-color').value = getRandomColor();
    }
    document.getElementById('shift-modal').classList.remove('hidden');
}

function closeShiftModal() {
    document.getElementById('shift-modal').classList.add('hidden');
}

function saveShiftType() {
    const id = document.getElementById('shift-modal-id').value;
    const name = document.getElementById('shift-modal-name').value.trim();
    const shortName = document.getElementById('shift-modal-short').value.trim() || name.substring(0, 1);
    const count = parseInt(document.getElementById('shift-modal-count').value) || 0;
    const color = document.getElementById('shift-modal-color').value;

    if (!name) return;

    if (id) {
        const st = state.shiftTypes.find(s => s.id === id);
        if (st) {
            st.name = name;
            st.shortName = shortName;
            st.count = count;
            st.color = color;
        }
    } else {
        state.shiftTypes.push({
            id: 's_' + Date.now(),
            name: name,
            shortName: shortName,
            count: count,
            color: color
        });
    }

    closeShiftModal();
    renderAll();
    saveMasterToCloud(true);
}

function deleteShiftType(id) {
    state.shiftTypes = state.shiftTypes.filter(s => s.id !== id);
    renderAll();
    saveMasterToCloud(true);
}

function openColorModal(id = null) {
    document.getElementById('color-modal-id').value = id || '';
    document.getElementById('color-modal-title').innerText = id ? 'カラー属性の編集' : 'カラー属性の追加';

    if (id) {
        const ct = state.colorTypes.find(c => c.id === id);
        if (ct) {
            document.getElementById('color-modal-name').value = ct.name;
            document.getElementById('color-modal-short').value = ct.shortName || '';
            document.getElementById('color-modal-color').value = ct.color;
        }
    } else {
        document.getElementById('color-modal-name').value = '';
        document.getElementById('color-modal-short').value = '';
        document.getElementById('color-modal-color').value = getRandomColor();
    }
    document.getElementById('color-modal').classList.remove('hidden');
}

function closeColorModal() {
    document.getElementById('color-modal').classList.add('hidden');
}

function saveColorType() {
    const id = document.getElementById('color-modal-id').value;
    const name = document.getElementById('color-modal-name').value.trim();
    const shortName = document.getElementById('color-modal-short').value.trim();
    const color = document.getElementById('color-modal-color').value;

    if (!name) return;

    if (id) {
        const ct = state.colorTypes.find(c => c.id === id);
        if (ct) {
            ct.name = name;
            ct.shortName = shortName;
            ct.color = color;
        }
    } else {
        state.colorTypes.push({
            id: 'c_' + Date.now(),
            name: name,
            shortName: shortName,
            color: color
        });
    }

    closeColorModal();
    renderAll();
    saveMasterToCloud(true);
}

function deleteColorType(id) {
    state.colorTypes = state.colorTypes.filter(c => c.id !== id);
    renderAll();
    saveMasterToCloud(true);
}
