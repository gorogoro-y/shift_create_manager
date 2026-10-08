// js/app.js
// アプリケーション全体初期化・描画統括・グローバル公開

function renderAll(triggerSave = true) {
    if (triggerSave && !isSyncingFromCloud) {
        saveData();
    }
    renderMatrixMode1();
    renderFilterToolbar();
    renderShiftStamps();
    renderMatrixMode2();
    renderAssignmentFilterToolbar();
    renderCourseAssignmentTab();
    if (typeof renderPrintTab === 'function') {
        renderPrintTab();
    }
    renderMode4();
    updatePinnedStats();
}


window.changeMonth = changeMonth;
window.switchTab = switchTab;
window.setPrintMode = setPrintMode;
window.setPrintPeriod = setPrintPeriod;
window.onPrintCutoffChange = onPrintCutoffChange;
window.executePrint = executePrint;
window.renderPrintTab = renderPrintTab;
window.selectStamp = selectStamp;
window.toggleStamp = toggleStamp;
window.setMemberAllHoliday = setMemberAllHoliday;
window.setMemberAllWait = setMemberAllWait;
window.updateDailyRequired = updateDailyRequired;
window.updateDailyEvent = updateDailyEvent;
window.applyDefaultRequired = applyDefaultRequired;
window.openStaffImportModal = openStaffImportModal;
window.closeStaffImportModal = closeStaffImportModal;
window.executeStaffImport = executeStaffImport;
window.openShiftImportModal = openShiftImportModal;
window.closeShiftImportModal = closeShiftImportModal;
window.executeShiftImport = executeShiftImport;
window.openColorImportModal = openColorImportModal;
window.closeColorImportModal = closeColorImportModal;
window.executeColorImport = executeColorImport;
window.openShiftModal = openShiftModal;
window.closeShiftModal = closeShiftModal;
window.saveShiftType = saveShiftType;
window.deleteShiftType = deleteShiftType;
window.openColorModal = openColorModal;
window.closeColorModal = closeColorModal;
window.saveColorType = saveColorType;
window.deleteColorType = deleteColorType;

window.openHolidayModal = openHolidayModal;
window.closeHolidayModal = closeHolidayModal;
window.saveHolidayType = saveHolidayType;
window.deleteHolidayType = deleteHolidayType;
window.renderHolidayStampsBar = renderHolidayStampsBar;
window.getPreviousMonthConsecutiveWorkdays = getPreviousMonthConsecutiveWorkdays;
window.selectTool = selectTool;
window.clearMemberShifts = clearMemberShifts;
window.toggleShiftStamp = toggleShiftStamp;
window.saveAsDefaultMaster = saveAsDefaultMaster;
window.resetToDefaultMaster = resetToDefaultMaster;
window.saveDirectToFile = saveDirectToFile;
window.setSaveFileAs = setSaveFileAs;
window.openDirectFile = openDirectFile;
window.importData = importData;
window.showMessageModal = showMessageModal;
window.closeMessageModal = closeMessageModal;
window.scrollToPosition = scrollToPosition;

window.showAuthLockOverlay = showAuthLockOverlay;
window.hideAuthLockOverlay = hideAuthLockOverlay;

window.openStaffAttrModal = openStaffAttrModal;
window.closeStaffAttrModal = closeStaffAttrModal;
window.saveStaffAttr = saveStaffAttr;
window.deleteStaffAttr = deleteStaffAttr;
window.openMemberEditModal = openMemberEditModal;
window.closeMemberEditModal = closeMemberEditModal;
window.saveMemberEdit = saveMemberEdit;
window.deleteCurrentMember = deleteCurrentMember;
window.deleteStaffDirect = deleteStaffDirect;
window.moveMember = moveMember;
window.moveCourse = moveCourse;
window.setStaffFilter = setStaffFilter;
window.setAssignmentStaffFilter = setAssignmentStaffFilter;
window.saveAllToCloud = saveAllToCloud;

window.openGeneratorModal = openGeneratorModal;
window.closeGeneratorModal = closeGeneratorModal;
window.setGeneratorRange = setGeneratorRange;
window.executeShiftGeneration = executeShiftGeneration;
window.openRuleConfigModal = openRuleConfigModal;
window.closeRuleConfigModal = closeRuleConfigModal;
window.saveRuleConfig = saveRuleConfig;

window.openCourseModal = openCourseModal;
window.closeCourseModal = closeCourseModal;
window.saveCourse = saveCourse;
window.deleteCourse = deleteCourse;
window.openCourseGroupModal = openCourseGroupModal;
window.closeCourseGroupModal = closeCourseGroupModal;
window.saveCourseGroup = saveCourseGroup;
window.deleteCourseGroup = deleteCourseGroup;
window.openCourseImportModal = openCourseImportModal;
window.closeCourseImportModal = closeCourseImportModal;
window.executeCourseImport = executeCourseImport;
window.onAssignmentDateChange = onAssignmentDateChange;
window.changeAssignmentDay = changeAssignmentDay;
window.updateCourseAssignment = updateCourseAssignment;
window.clearCourseAssignment = clearCourseAssignment;

window.loginWithGoogle = loginWithGoogle;
window.logoutGoogle = logoutGoogle;

window.onload = function() {
    loadData();
    renderAll();
    initFirebase();
};
