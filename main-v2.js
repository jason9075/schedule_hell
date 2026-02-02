// Constants
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const USERS = ['Marco', 'Jason', 'Milo', 'Vera', 'Mei', 'Ching', 'Jonas', 'Gary'];
const DEVICES = ['台北', '桃園', '台中', '台南', '新竹'];
const STORAGE_KEY_V2 = 'ac_system_v2';

// --- Default Data ---
const DEFAULT_TEMPLATES = [
  { id: 't1', name: 'Office Hours', color: '#28a745', schedule: createWeekSchedule(9*60, 18*60) },
  { id: 't2', name: '24/7 Access', color: '#007bff', schedule: createWeekSchedule(0, 1439) },
  { id: 't3', name: 'Morning Shift', color: '#ffc107', schedule: createWeekSchedule(6*60, 14*60) }
];

const DEFAULT_GROUPS = [
  { id: 'g1', name: 'General Staff', priority: 10, members: ['Marco', 'Mei', 'Ching'] },
  { id: 'g2', name: 'Managers', priority: 90, members: ['Jason', 'Vera'] },
  { id: 'g3', name: 'IT Support', priority: 50, members: ['Jason', 'Gary'] } // Jason is in g2(90) and g3(50)
];

// Matrix: { groupId: { deviceId: templateId } }
const DEFAULT_RULES = {
  'g1': { '台北': 't1', '桃園': 't1' }, // Staff: Office Hours
  'g2': { '台北': 't2', '桃園': 't2', '台中': 't2' }, // Managers: 24/7
  'g3': { '台北': 't3', '新竹': 't2' } // IT: Morning in TP, 24/7 in HC
};

// --- State Management ---
let state = loadState();
let activeTab = 'templates';
let editingTemplateId = null;
let editingGroupId = null;

// --- Helpers ---
function createWeekSchedule(start, end) {
  const s = {};
  DAYS.forEach(d => s[d] = { start, end });
  return s;
}

function generateId() { return Math.random().toString(36).substr(2, 9); }

function minsToTime(m) {
  const h = Math.floor(m/60).toString().padStart(2,'0');
  const min = Math.floor(m%60).toString().padStart(2,'0');
  return `${h}:${min}`;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY_V2);
  if(raw) return JSON.parse(raw);
  return {
    templates: DEFAULT_TEMPLATES,
    groups: DEFAULT_GROUPS,
    rules: DEFAULT_RULES
  };
}

// --- Logic: Resolution ---
/**
 * Resolves access for a User on a specific Device.
 * Strategy: Find all groups user belongs to -> Find rules for this device -> Pick Max(Priority).
 */
function resolveAccess(user, device) {
  const userGroups = state.groups.filter(g => g.members.includes(user));
  
  if (userGroups.length === 0) return null;

  const candidates = [];

  userGroups.forEach(group => {
    // Check if this group has a rule for this device
    const groupRules = state.rules[group.id];
    if (groupRules && groupRules[device]) {
      const templateId = groupRules[device];
      const template = state.templates.find(t => t.id === templateId);
      if (template) {
        candidates.push({
          groupName: group.name,
          priority: parseInt(group.priority),
          template: template
        });
      }
    }
  });

  if (candidates.length === 0) return null;

  // Sort by Priority DESC
  candidates.sort((a, b) => b.priority - a.priority);
  
  // Winner is the first one
  return {
    winner: candidates[0],
    others: candidates.slice(1)
  };
}

// --- UI Components ---

// 1. Templates View
function renderTemplates() {
  const list = document.getElementById('template-list');
  list.innerHTML = '';
  
  state.templates.forEach(t => {
    const card = document.createElement('li');
    card.className = 'template-card';
    card.innerHTML = `
      <div class="template-card-bar" style="background:${t.color}"></div>
      <h4>${t.name}</h4>
      <small>${minsToTime(t.schedule['Mon'].start)} - ${minsToTime(t.schedule['Mon'].end)} (Mon)</small>
    `;
    card.onclick = () => openTemplateEditor(t.id);
    list.appendChild(card);
  });
}

function openTemplateEditor(id) {
  editingTemplateId = id;
  const t = state.templates.find(x => x.id === id);
  
  document.getElementById('template-editor').classList.remove('hidden');
  document.getElementById('template-name-input').value = t.name;
  document.getElementById('template-color-input').value = t.color;
  
  const container = document.getElementById('template-schedule-editor');
  container.innerHTML = '';
  
  DAYS.forEach(day => {
    const dayConfig = t.schedule[day];
    const bar = createTimeBar(day, dayConfig.start, dayConfig.end, t.color, (s, e) => {
      t.schedule[day] = { start: s, end: e };
    });
    container.appendChild(bar);
  });
}

// 2. Groups View
function renderGroups() {
  const list = document.getElementById('group-list');
  list.innerHTML = '';
  
  state.groups.sort((a,b) => b.priority - a.priority); // Visual sort

  state.groups.forEach(g => {
    const li = document.createElement('li');
    li.className = `group-item ${g.id === editingGroupId ? 'active' : ''}`;
    li.innerHTML = `
      <span>${g.name}</span>
      <span class="group-priority-badge">P-${g.priority}</span>
    `;
    li.onclick = () => openGroupEditor(g.id);
    list.appendChild(li);
  });
}

function openGroupEditor(id) {
  editingGroupId = id;
  const g = state.groups.find(x => x.id === id);
  
  renderGroups(); // Update active class
  document.getElementById('group-editor').classList.remove('hidden');
  document.getElementById('group-name-input').value = g.name;
  document.getElementById('group-priority-input').value = g.priority;
  
  const memberList = document.getElementById('group-member-list');
  memberList.innerHTML = '';
  USERS.forEach(user => {
    const label = document.createElement('label');
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = g.members.includes(user);
    chk.onchange = (e) => {
      if(e.target.checked) g.members.push(user);
      else g.members = g.members.filter(m => m !== user);
      saveState();
    };
    label.appendChild(chk);
    label.appendChild(document.createTextNode(' ' + user));
    memberList.appendChild(label);
  });
}

// 3. Rules View
function renderRulesMatrix() {
  const table = document.getElementById('rules-matrix');
  const thead = table.querySelector('thead tr');
  const tbody = table.querySelector('tbody');
  
  // Headers: Device \ Group 1 | Group 2 ...
  thead.innerHTML = '<th>Device \\ Group</th>';
  state.groups.forEach(g => {
    const th = document.createElement('th');
    th.innerHTML = `${g.name}<br><small>P-${g.priority}</small>`;
    thead.appendChild(th);
  });
  
  // Rows: Devices
  tbody.innerHTML = '';
  DEVICES.forEach(dev => {
    const tr = document.createElement('tr');
    
    // 1st cell: Device Name
    const tdDev = document.createElement('td');
    tdDev.textContent = dev;
    tdDev.style.fontWeight = 'bold';
    tr.appendChild(tdDev);
    
    // Cells: Config for each group
    state.groups.forEach(g => {
      const td = document.createElement('td');
      const select = document.createElement('select');
      
      // Options: Empty + Templates
      const optEmpty = document.createElement('option');
      optEmpty.value = '';
      optEmpty.text = '--';
      select.appendChild(optEmpty);
      
      state.templates.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.text = t.name;
        select.appendChild(opt);
      });
      
      // Set current value
      if (state.rules[g.id] && state.rules[g.id][dev]) {
        select.value = state.rules[g.id][dev];
      }
      
      select.onchange = (e) => {
        if (!state.rules[g.id]) state.rules[g.id] = {};
        if (e.target.value === '') delete state.rules[g.id][dev];
        else state.rules[g.id][dev] = e.target.value;
        saveState();
      };
      
      td.appendChild(select);
      tr.appendChild(td);
    });
    
    tbody.appendChild(tr);
  });
}

// 4. POV View
function renderPOV() {
  const select = document.getElementById('pov-user-select');
  if (select.options.length === 0) {
    USERS.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u;
      opt.text = u;
      select.appendChild(opt);
    });
    select.onchange = renderPOV;
    select.value = 'Jason'; // Default
  }
  
  const user = select.value;
  const container = document.getElementById('pov-output');
  container.innerHTML = '';
  
  DEVICES.forEach(dev => {
    const access = resolveAccess(user, dev);
    
    if (access) {
      const div = document.createElement('div');
      div.className = 'pov-result-card';
      
      const { winner, others } = access;
      const t = winner.template;
      
      let debugText = others.length > 0 
        ? `(Defeated: ${others.map(o => `${o.groupName}[P-${o.priority}]`).join(', ')})`
        : '';

      div.innerHTML = `
        <div class="pov-header">
          <span class="pov-device-name">${dev}</span>
          <span class="pov-source">Via Group: <strong>${winner.groupName}</strong> <span class="winning-priority">P-${winner.priority}</span></span>
        </div>
        <div style="border-left: 4px solid ${t.color}; padding-left: 10px;">
          <h3>${t.name}</h3>
          <div>Mon: ${minsToTime(t.schedule.Mon.start)} - ${minsToTime(t.schedule.Mon.end)}</div>
        </div>
        <div class="priority-debug">${debugText}</div>
      `;
      container.appendChild(div);
    }
  });
  
  if (container.innerHTML === '') {
    container.innerHTML = '<div class="no-access">No access rights found for this user.</div>';
  }
}

// --- Time Bar (Simplified for V2) ---
function createTimeBar(day, start, end, color, onUpdate) {
  const row = document.createElement('div');
  row.className = 'day-row';
  
  // Minimal implementation reuse concepts from V1 but cleaner
  row.innerHTML = `<div class="day-label">${day}</div>`;
  const track = document.createElement('div');
  track.className = 'time-track';
  
  const segment = document.createElement('div');
  segment.className = 'time-segment';
  segment.style.backgroundColor = color;
  
  // Render
  const update = (s, e) => {
    const left = (s/1440)*100;
    const width = ((e-s)/1440)*100;
    segment.style.left = `${left}%`;
    segment.style.width = `${width}%`;
    onUpdate(s, e);
  };
  update(start, end);
  
  track.appendChild(segment);
  row.appendChild(track);
  
  // Display text
  const disp = document.createElement('div');
  disp.className = 'time-display';
  disp.textContent = `${minsToTime(start)}-${minsToTime(end)}`;
  row.appendChild(disp);
  
  // Note: Skipping full drag implementation for V2 demo brevity
  // Just hardcode click to toggle full day vs office hours for demo?
  // Or simple click to shift.
  track.onclick = () => {
    // Demo interaction: Cycle 9-18 -> 0-24 -> 0-0
    if (start === 0 && end === 1439) { start = 0; end = 0; }
    else if (start === 0 && end === 0) { start = 540; end = 1080; } // 9-18
    else { start = 0; end = 1439; }
    
    update(start, end);
    disp.textContent = `${minsToTime(start)}-${minsToTime(end)}`;
  };
  
  return row;
}

// --- Main Init ---

// Tab Switching
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden'));
    const tab = btn.dataset.tab;
    document.getElementById(`view-${tab}`).classList.remove('hidden');
    
    // Refresh logic
    if(tab === 'templates') renderTemplates();
    if(tab === 'groups') renderGroups();
    if(tab === 'rules') renderRulesMatrix();
    if(tab === 'pov') renderPOV();
  };
});

// Event Listeners for Editor
document.getElementById('save-template-btn').onclick = () => {
  const name = document.getElementById('template-name-input').value;
  const color = document.getElementById('template-color-input').value;
  const t = state.templates.find(x => x.id === editingTemplateId);
  t.name = name;
  t.color = color;
  saveState();
  renderTemplates();
  document.getElementById('template-editor').classList.add('hidden');
};

document.getElementById('close-template-btn').onclick = () => {
  document.getElementById('template-editor').classList.add('hidden');
};

document.getElementById('add-template-btn').onclick = () => {
  const newId = generateId();
  state.templates.push({
    id: newId,
    name: 'New Template',
    color: '#666666',
    schedule: createWeekSchedule(540, 1080)
  });
  renderTemplates();
  openTemplateEditor(newId);
};

document.getElementById('add-group-btn').onclick = () => {
  const newId = generateId();
  state.groups.push({
    id: newId,
    name: 'New Group',
    priority: 10,
    members: []
  });
  renderGroups();
  openGroupEditor(newId);
};

document.getElementById('save-group-btn').onclick = () => {
  const g = state.groups.find(x => x.id === editingGroupId);
  g.name = document.getElementById('group-name-input').value;
  g.priority = document.getElementById('group-priority-input').value;
  saveState();
  renderGroups();
  // Don't close, allow continuous edit
};

// Initial Render
renderTemplates();
