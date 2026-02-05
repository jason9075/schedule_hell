
// This version restores the Special Plan, Time Setting, and Simulation pages.
document.addEventListener('DOMContentLoaded', () => {
    // --- UTILS ---
    const $ = (selector, parent = document) => parent.querySelector(selector);
    const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

    // --- PAGE NAVIGATION ---
    const navItems = $$('.nav-item');
    const pages = $$('.page');
    const mainContent = $('#mainContent');

    function showPage(pageId) {
        pages.forEach(page => page.style.display = page.id === `page-${pageId}` ? 'block' : 'none');
        navItems.forEach(item => item.classList.toggle('active', item.dataset.page === pageId));
        if (pageId === 'simulation') {
            populateTimeSettingSelect();
        }
    }

    $('#sideNav').addEventListener('click', (e) => {
        if (e.target.classList.contains('nav-item')) {
            e.preventDefault();
            showPage(e.target.dataset.page);
        }
    });

    // --- DATA ---
    const state = {
        weeklyPlans: [
            { id: 'wp-1', name: '週計畫1', schedule: { mon: [{s: 9, e: 12}, {s: 13, e: 18}], tue: [{s: 9, e: 18}], wed: [{s: 9, e: 18}], thu: [{s: 9, e: 18}], fri: [{s: 9, e: 18}], sat: [], sun: [] } },
            { id: 'wp-2', name: '週計畫2', schedule: { mon: [], tue: [], wed: [{s: 18, e: 22}], thu: [{s: 18, e: 22}], fri: [{s: 18, e: 22}], sat: [{s: 10, e: 15}], sun: [{s: 10, e: 15}] } }
        ],
        specialPeriods: [
            { id: 'sp-1', name: '特殊期1', start: '2024-10-10T00:00', end: '2024-10-10T23:59', schedule: { mon: [{s: 0, e: 24}], tue: [{s: 0, e: 24}], wed: [{s: 0, e: 24}], thu: [{s: 0, e: 24}], fri: [{s: 0, e: 24}], sat: [{s: 0, e: 24}], sun: [{s: 0, e: 24}] } },
            { id: 'sp-2', name: '特殊期2', start: '2025-01-20T09:00', end: '2025-01-22T18:00', schedule: { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] } },
            { id: 'sp-3', name: '特殊期3', start: '2025-02-14T00:00', end: '2025-02-14T23:59', schedule: { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] } },
            { id: 'sp-4', name: '特殊期4', start: '2025-03-01T00:00', end: '2025-03-31T23:59', schedule: { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] } },
        ],
        specialPlans: [
            { id: 'spl-1', name: '特殊計畫1', periodIds: ['sp-1'] }, { id: 'spl-2', name: '特殊計畫2', periodIds: ['sp-2'] },
            { id: 'spl-3', name: '特殊計畫3', periodIds: [] }, { id: 'spl-4', name: '特殊計畫4', periodIds: [] }, { id: 'spl-5', name: '特殊計畫5', periodIds: [] },
        ],
        timeSettings: [
            { id: 'ts-1', name: 'Jason', weeklyPlanId: 'wp-1', specialPlanIds: [] },
            { id: 'ts-2', name: 'Marco', weeklyPlanId: 'wp-2', specialPlanIds: ['spl-1'] }
        ],
    };
    const daysOfWeek = [
        { key: 'mon', label: '週一' }, { key: 'tue', label: '週二' }, { key: 'wed', label: '週三' },
        { key: 'thu', label: '週四' }, { key: 'fri', label: '週五' }, { key: 'sat', label: '週六' },
        { key: 'sun', label: '週日' },
    ];
    function generateId(prefix) { return `${prefix}-${Date.now()}`; }

    // --- V2 TIME PICKER LOGIC (Shared & Corrected) ---
    let dragged = { element: null, bar: null, rect: null };

    function renderV2Selector(container, schedule, planContext) {
        container.innerHTML = '';
        daysOfWeek.forEach(day => {
            const daySchedule = schedule[day.key] || [];
            const dayRow = document.createElement('div');
            dayRow.className = 'day-row-v2';
            dayRow.dataset.day = day.key;
            dayRow.innerHTML = `<div class="day-header"><span class="day-label-v2">${day.label}</span><div class="summary-bar-container"></div><button type="button" class="btn edit-day-btn">編輯</button></div><div class="day-editor"></div>`;
            dayRow.dataset.planContext = JSON.stringify(planContext);
            container.appendChild(dayRow);
            renderSummary(dayRow.querySelector('.summary-bar-container'), daySchedule);
        });
    }

    function renderSummary(container, daySchedule) {
        container.innerHTML = '';
        const unionBar = document.createElement('div');
        unionBar.className = 'union-bar';
        const slots = daySchedule.filter(slot => slot.e > slot.s).sort((a, b) => a.s - b.s);
        if (slots.length > 0) {
            const merged = [JSON.parse(JSON.stringify(slots[0]))];
            for (let i = 1; i < slots.length; i++) {
                const last = merged[merged.length - 1];
                if (slots[i].s <= last.e) { last.e = Math.max(last.e, slots[i].e); } 
                else { merged.push(JSON.parse(JSON.stringify(slots[i]))); }
            }
            merged.forEach(slot => {
                const fill = document.createElement('div');
                fill.className = 'bar-fill';
                fill.style.left = `${(slot.s / 24) * 100}%`;
                fill.style.width = `${((slot.e - slot.s) / 24) * 100}%`;
                unionBar.appendChild(fill);
            });
        }
        container.appendChild(unionBar);
    }
    
    function renderDayEditor(editor, dayKey, daySchedule) {
        editor.innerHTML = '';
        const slots = JSON.parse(JSON.stringify(daySchedule));
        while (slots.length < 8) slots.push({ s: 0, e: 0 });
        slots.forEach((slot, i) => editor.appendChild(createSlotBar(dayKey, i, slot)));
        const unionContainer = document.createElement('div');
        unionContainer.innerHTML = '<p style="margin: 10px 0 5px 0; font-weight: bold;">Union 結果:</p>';
        const unionBar = document.createElement('div');
        unionBar.className = 'union-bar';
        unionContainer.appendChild(unionBar);
        editor.appendChild(unionContainer);
        const timeScale = document.createElement('div');
        timeScale.className = 'time-scale';
        timeScale.innerHTML = `<span>0</span><span>2</span><span>4</span><span>6</span><span>8</span><span>10</span><span>12</span><span>14</span><span>16</span><span>18</span><span>20</span><span>22</span><span>24</span>`;
        editor.appendChild(timeScale);
        updateUnionBar(editor);
    }

    function createSlotBar(dayKey, index, slotData) {
        const slotBar = document.createElement('div');
        slotBar.className = 'slot-bar';
        slotBar.dataset.day = dayKey;
        slotBar.dataset.index = index;
        slotBar.innerHTML = `<div class="bar-fill"></div><div class="bar-handle start" data-type="s"></div><div class="bar-handle end" data-type="e"></div>`;
        updateBarUI(slotBar, slotData);
        return slotBar;
    }

    function updateBarUI(slotBar, slotData) {
        slotBar.dataset.s = slotData.s;
        slotBar.dataset.e = slotData.e;
        const startPercent = (slotData.s / 24) * 100;
        const endPercent = (slotData.e / 24) * 100;
        $('.bar-fill', slotBar).style.left = `${startPercent}%`;
        $('.bar-fill', slotBar).style.width = `${endPercent - startPercent}%`;
        $('.bar-handle.start', slotBar).style.left = `calc(${startPercent}% - 5px)`;
        $('.bar-handle.end', slotBar).style.left = `calc(${endPercent}% - 5px)`;
    }

    function updateUnionBar(editor) {
        const slots = $$('.slot-bar', editor).map(bar => ({ s: parseFloat(bar.dataset.s), e: parseFloat(bar.dataset.e) }))
            .filter(slot => slot.e > slot.s).sort((a, b) => a.s - b.s);
        if (slots.length === 0) { $('.union-bar', editor).innerHTML = ''; return; }
        const merged = [JSON.parse(JSON.stringify(slots[0]))];
        for (let i = 1; i < slots.length; i++) {
            const last = merged[merged.length - 1];
            if (slots[i].s <= last.e) { last.e = Math.max(last.e, slots[i].e); } 
            else { merged.push(JSON.parse(JSON.stringify(slots[i]))); }
        }
        const unionBar = $('.union-bar', editor);
        unionBar.innerHTML = '';
        merged.forEach(slot => {
            const fill = document.createElement('div');
            fill.className = 'bar-fill';
            fill.style.left = `${(slot.s / 24) * 100}%`;
            fill.style.width = `${((slot.e - slot.s) / 24) * 100}%`;
            unionBar.appendChild(fill);
        });
    }

    mainContent.addEventListener('mousedown', e => {
        if (e.target.classList.contains('bar-handle')) { e.preventDefault(); dragged.element = e.target; dragged.bar = e.target.closest('.slot-bar'); dragged.rect = dragged.bar.getBoundingClientRect(); }
    });
    document.addEventListener('mousemove', event => {
        if (!dragged.element) return;
        event.preventDefault();
        const percent = Math.max(0, Math.min(100, (event.clientX - dragged.rect.left) / dragged.rect.width * 100));
        const hour = Math.round(percent / 100 * 24 * 2) / 2;
        const s = parseFloat(dragged.bar.dataset.s);
        const e = parseFloat(dragged.bar.dataset.e);
        const type = dragged.element.dataset.type;
        const newSlot = {s, e};
        if (type === 's') newSlot.s = Math.min(hour, e); else newSlot.e = Math.max(hour, s);
        updateBarUI(dragged.bar, newSlot);
        updateUnionBar(dragged.bar.closest('.day-editor'));
    });
    document.addEventListener('mouseup', () => { dragged.element = null; });

    mainContent.addEventListener('click', e => {
        if (e.target.classList.contains('edit-day-btn')) {
            const dayRow = e.target.closest('.day-row-v2');
            const editor = $('.day-editor', dayRow);
            const wasOpen = editor.classList.contains('open');
            editor.classList.toggle('open');
            e.target.textContent = wasOpen ? '編輯' : '完成';
            if (!wasOpen && !editor.innerHTML.trim()) {
                const dayKey = dayRow.dataset.day;
                const context = JSON.parse(dayRow.dataset.planContext);
                const item = state[context.type]?.find(p => p.id === context.id);
                const daySchedule = (item?.schedule || {})[dayKey] || [];
                renderDayEditor(editor, dayKey, daySchedule);
            }
            if (wasOpen) {
                const daySchedule = $$('.slot-bar', editor).map(bar => ({ s: parseFloat(bar.dataset.s), e: parseFloat(bar.dataset.e) })).filter(slot => slot.e > slot.s).sort((a,b) => a.s - b.s);
                renderSummary(dayRow.querySelector('.summary-bar-container'), daySchedule);
            }
        }
    });
        
    function getScheduleFromEditor(form, id, type) {
        const schedule = {};
        $$('.day-row-v2', form).forEach(dayRow => {
            const dayKey = dayRow.dataset.day;
            const editor = $('.day-editor', dayRow);
            if (editor.innerHTML.trim()) {
                 schedule[dayKey] = $$('.slot-bar', editor).map(bar => ({ s: parseFloat(bar.dataset.s), e: parseFloat(bar.dataset.e) })).filter(slot => slot.e > slot.s).sort((a,b) => a.s - b.s);
            } else {
                const oldItem = state[type]?.find(p => p.id === id);
                if (oldItem?.schedule) schedule[dayKey] = oldItem.schedule[dayKey];
                else schedule[dayKey] = [];
            }
        });
        return schedule;
    }

    function setupModal(modal, addBtnId, openFn, listId, deleteFn) {
        $(addBtnId).addEventListener('click', () => openFn());
        $('.close-btn', modal).addEventListener('click', () => modal.style.display = 'none');
        $(listId).addEventListener('click', e => {
            const id = e.target.dataset.id;
            if (e.target.classList.contains('btn-edit')) openFn(id);
            if (e.target.classList.contains('btn-delete')) deleteFn(id);
        });
    }

    // --- WEEKLY PLAN ---
    const weeklyPlanModal = $('#weeklyPlanModal');
    function openWeeklyPlanModal(id = null) {
        const plan = id ? state.weeklyPlans.find(p => p.id === id) : null;
        const isNew = !plan;
        const currentPlan = plan || { id: '', name: '', schedule: {} };
        $('#weeklyPlanModalTitle').textContent = isNew ? '新增週計畫' : '編輯週計畫';
        const newId = isNew ? generateId('wp') : currentPlan.id;
        $('#weeklyPlanId').value = newId;
        $('#weeklyPlanName').value = currentPlan.name;
        renderV2Selector($('#weeklyPlanTimeSelector'), currentPlan.schedule, { type: 'weeklyPlans', id: newId });
        weeklyPlanModal.style.display = 'block';
    }
    setupModal(weeklyPlanModal, '#addWeeklyPlanBtn', openWeeklyPlanModal, '#weeklyPlanList', (id) => {
        if(confirm('確定刪除嗎？')) { state.weeklyPlans = state.weeklyPlans.filter(p => p.id !== id); renderWeeklyPlans(); }
    });
    $('#weeklyPlanForm').addEventListener('submit', e => {
        e.preventDefault();
        const id = $('#weeklyPlanId').value;
        const newPlan = { id, name: $('#weeklyPlanName').value, schedule: getScheduleFromEditor(e.target, id, 'weeklyPlans') };
        const index = state.weeklyPlans.findIndex(p => p.id === id);
        if (index > -1) state.weeklyPlans[index] = newPlan; else state.weeklyPlans.push(newPlan);
        renderWeeklyPlans();
        weeklyPlanModal.style.display = 'none';
    });
    function renderWeeklyPlans() {
        $('#weeklyPlanList').innerHTML = state.weeklyPlans.map(plan => `<div class="plan-card"><h3>${plan.name}</h3><div class="card-actions"><button class="btn-edit" data-id="${plan.id}">編輯</button><button class="btn-delete" data-id="${plan.id}">刪除</button></div></div>`).join('');
    }

    // --- SPECIAL PERIOD ---
    const specialPeriodModal = $('#specialPeriodModal');
    function openSpecialPeriodModal(id = null) {
        const period = id ? state.specialPeriods.find(p => p.id === id) : null;
        const isNew = !period;
        const current = period || { id: '', name: '', start: '', end: '', schedule: {} };
        $('#specialPeriodModalTitle').textContent = isNew ? '新增特殊期' : '編輯特殊期';
        const newId = isNew ? generateId('sp') : current.id;
        $('#specialPeriodId').value = newId;
        $('#specialPeriodName').value = current.name;
        $('#specialPeriodStart').value = (current.start || '').slice(0, 10);
        $('#specialPeriodEnd').value = (current.end || '').slice(0, 10);
        renderV2Selector($('#specialPeriodTimeSelector'), current.schedule, { type: 'specialPeriods', id: newId });
        specialPeriodModal.style.display = 'block';
    }
    setupModal(specialPeriodModal, '#addSpecialPeriodBtn', openSpecialPeriodModal, '#specialPeriodList', (id) => {
        if(confirm('確定刪除嗎？')) { state.specialPeriods = state.specialPeriods.filter(p => p.id !== id); renderSpecialPeriods(); }
    });
    $('#specialPeriodForm').addEventListener('submit', e => {
        e.preventDefault();
        const id = $('#specialPeriodId').value;
        const newPeriod = { id, name: $('#specialPeriodName').value, start: $('#specialPeriodStart').value, end: $('#specialPeriodEnd').value, schedule: getScheduleFromEditor(e.target, id, 'specialPeriods') };
        const index = state.specialPeriods.findIndex(p => p.id === id);
        if (index > -1) state.specialPeriods[index] = newPeriod; else state.specialPeriods.push(newPeriod);
        renderSpecialPeriods();
        specialPeriodModal.style.display = 'none';
    });
    function renderSpecialPeriods() {
        $('#specialPeriodList').innerHTML = state.specialPeriods.map(p => `<div class="plan-card"><div><h3>${p.name}</h3><p>${(p.start||'')} ~ ${(p.end||'')}</p></div><div class="card-actions"><button class="btn-edit" data-id="${p.id}">編輯</button><button class="btn-delete" data-id="${p.id}">刪除</button></div></div>`).join('');
    }

    // --- SPECIAL PLAN ---
    const specialPlanModal = $('#specialPlanModal');
    function openSpecialPlanModal(id = null) {
        const plan = id ? state.specialPlans.find(p => p.id === id) : null;
        const isNew = !plan;
        const current = plan || { id: '', name: '', periodIds: [] };
        $('#specialPlanModalTitle').textContent = isNew ? '新增特殊計畫' : '編輯特殊計畫';
        $('#specialPlanId').value = current.id;
        $('#specialPlanName').value = current.name;
        $('#specialPeriodSelection').innerHTML = state.specialPeriods.map(p => `<label><input type="checkbox" value="${p.id}" ${current.periodIds.includes(p.id) ? 'checked' : ''}> ${p.name}</label>`).join('');
        specialPlanModal.style.display = 'block';
    }
    setupModal(specialPlanModal, '#addSpecialPlanBtn', openSpecialPlanModal, '#specialPlanList', (id) => {
        if(confirm('確定刪除嗎？')) { state.specialPlans = state.specialPlans.filter(p => p.id !== id); renderSpecialPlans(); }
    });
    $('#specialPlanForm').addEventListener('submit', e => {
        e.preventDefault();
        const id = $('#specialPlanId').value || generateId('spl');
        const periodIds = $$('input:checked', e.target.closest('.modal-content')).map(el => el.value);
        if (periodIds.length > 16) return alert('一個特殊計畫最多只能選16個特殊期。');
        const newPlan = { id, name: $('#specialPlanName').value, periodIds };
        const index = state.specialPlans.findIndex(p => p.id === id);
        if (index > -1) state.specialPlans[index] = newPlan; else state.specialPlans.push(newPlan);
        renderSpecialPlans();
        specialPlanModal.style.display = 'none';
    });
    function renderSpecialPlans() {
        $('#specialPlanList').innerHTML = state.specialPlans.map(plan => {
            const periodNames = plan.periodIds.map(pid => state.specialPeriods.find(p => p.id === pid)?.name || '未知').join(', ');
            return `<div class="plan-card"><div><h3>${plan.name}</h3><p>包含: ${periodNames || '無'}</p></div><div class="card-actions"><button class="btn-edit" data-id="${plan.id}">編輯</button><button class="btn-delete" data-id="${plan.id}">刪除</button></div></div>`;
        }).join('');
    }
    
    // --- TIME SETTING ---
    const timeSettingModal = $('#timeSettingModal');
    function openTimeSettingModal(id = null) {
        const setting = id ? state.timeSettings.find(s => s.id === id) : null;
        const isNew = !setting;
        const current = setting || {id: '', name: '', weeklyPlanId: '', specialPlanIds: []};
        $('#timeSettingModalTitle').textContent = isNew ? '新增時間設定' : '編輯時間設定';
        $('#timeSettingId').value = current.id;
        $('#timeSettingName').value = current.name;
        $('#weeklyPlanSelect').innerHTML = '<option value="">-- 請選擇 --</option>' + state.weeklyPlans.map(p => `<option value="${p.id}" ${current.weeklyPlanId === p.id ? 'selected' : ''}>${p.name}</option>`).join('');
        $('#specialPlanSelection').innerHTML = state.specialPlans.map(p => `<label><input type="checkbox" value="${p.id}" ${current.specialPlanIds.includes(p.id) ? 'checked' : ''}> ${p.name}</label>`).join('');
        timeSettingModal.style.display = 'block';
    }
    setupModal(timeSettingModal, '#addTimeSettingBtn', openTimeSettingModal, '#timeSettingList', (id) => {
        if(confirm('確定刪除嗎？')) { state.timeSettings = state.timeSettings.filter(s => s.id !== id); renderTimeSettings(); }
    });
    $('#timeSettingForm').addEventListener('submit', e => {
        e.preventDefault();
        const id = $('#timeSettingId').value || generateId('ts');
        const specialPlanIds = $$('#specialPlanSelection input:checked', e.target.closest('.modal-content')).map(el => el.value);
        if (specialPlanIds.length > 4) return alert('最多只能選擇4個特殊計畫。');
        const newSetting = { id, name: $('#timeSettingName').value, weeklyPlanId: $('#weeklyPlanSelect').value, specialPlanIds };
        const index = state.timeSettings.findIndex(s => s.id === id);
        if (index > -1) state.timeSettings[index] = newSetting; else state.timeSettings.push(newSetting);
        renderTimeSettings();
        timeSettingModal.style.display = 'none';
    });
    function renderTimeSettings() {
       $('#timeSettingList').innerHTML = state.timeSettings.map(s => {
           const wpName = state.weeklyPlans.find(p=>p.id===s.weeklyPlanId)?.name || 'N/A';
           const spNames = s.specialPlanIds.map(spid=>state.specialPlans.find(p=>p.id===spid)?.name||'N/A').join(', ');
           return `<div class="plan-card"><div><h3>${s.name}</h3><p><strong>週計畫:</strong> ${wpName}</p><p><strong>特殊計畫:</strong> ${spNames || '無'}</p></div><div class="card-actions"><button class="btn-edit" data-id="${s.id}">編輯</button><button class="btn-delete" data-id="${s.id}">刪除</button></div></div>`;
       }).join('');
    }

    // --- SIMULATION ---
    const simulationTimeSettingEl = $('#simulationTimeSetting');
    function populateTimeSettingSelect() {
        simulationTimeSettingEl.innerHTML = state.timeSettings.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }
    function checkAccess(timeSettingId, simTime) {
        const setting = state.timeSettings.find(s => s.id === timeSettingId);
        if (!setting) return { granted: false, reason: '找不到指定的時間設定。' };
        
        const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const dayKey = dayMap[simTime.getDay()];
        const hour = simTime.getHours() + simTime.getMinutes() / 60;

        const checkSchedule = (schedule) => {
            for (const slot of schedule[dayKey] || []) {
                if (hour >= slot.s && hour < slot.e) return true;
            }
            return false;
        };

        for (const spId of setting.specialPlanIds) {
            const specialPlan = state.specialPlans.find(sp => sp.id === spId);
            if (specialPlan) for (const pId of specialPlan.periodIds) {
                const period = state.specialPeriods.find(p => p.id === pId);
                if (period && period.start && period.end) {
                    const startTime = new Date(period.start); // 'YYYY-MM-DD' becomes YYYY-MM-DD 00:00:00 local time
                    const endTime = new Date(period.end);
                    endTime.setHours(23, 59, 59, 999); // Set to end of day
                    if (simTime >= startTime && simTime <= endTime) {
                        return checkSchedule(period.schedule)
                            ? { granted: true, reason: `符合特殊計畫 "${specialPlan.name}" 中特殊期 "${period.name}" 的通行時段。` }
                            : { granted: false, reason: `在特殊期 "${period.name}" 內，但不符合其通行時段。` };
                    }
                }
            }
        }

        const weeklyPlan = state.weeklyPlans.find(wp => wp.id === setting.weeklyPlanId);
        if (!weeklyPlan) return { granted: false, reason: '時間設定未綁定有效的週計畫。' };

        return checkSchedule(weeklyPlan.schedule)
            ? { granted: true, reason: `符合週計畫 "${weeklyPlan.name}" 的通行時段。` }
            : { granted: false, reason: `不符合週計畫 "${weeklyPlan.name}" 的通行時段。` };
    }
    $('#runSimulationBtn').addEventListener('click', () => {
        const simTimeVal = $('#simulationDateTime').value;
        if (!simulationTimeSettingEl.value || !simTimeVal) return alert('請選擇時間設定和模擬時間。');
        const result = checkAccess(simulationTimeSettingEl.value, new Date(simTimeVal));
        $('#resultText').textContent = result.granted ? '允許通行' : '禁止通行';
        $('#resultText').className = result.granted ? 'granted' : 'denied';
        $('#reasonText').textContent = `原因：${result.reason}`;
        $('#simulationResult').style.display = 'block';
    });

    // --- Init ---
    showPage('weekly-plan');
    renderWeeklyPlans();
    renderSpecialPeriods();
    renderSpecialPlans();
    renderTimeSettings();
});
