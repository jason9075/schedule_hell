// Constants
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const STORAGE_KEY = 'access_control_state';

// Default State (Fallback)
const DEFAULT_STATE = {
  users: ['Marco', 'Jason', 'Milo', 'Vera', 'Mei', 'Ching', 'Jonas', 'Gary'],
  devices: ['台北', '桃園', '台中', '台南', '新竹'],
  groups: [
    {
      id: "default-all-day",
      name: "全天",
      members: ['Marco', 'Jason'],
      // Structure: { DeviceName: { Day: { start: mins, end: mins } } }
      configs: {
        "台北": createDefaultWeekConfig(),
        "桃園": createDefaultWeekConfig()
      }
    }
  ]
};

// Application State
let state = loadState();
let currentEditingGroupId = null;

// DOM Elements
const elements = {
  groupList: document.getElementById('group-list'),
  userList: document.getElementById('user-list'),
  deviceList: document.getElementById('device-list'),
  groupNameInput: document.getElementById('group-name'),
  addGroupBtn: document.getElementById('add-group-btn'),
  saveBtn: document.getElementById('save-btn'),
  deleteBtn: document.getElementById('delete-btn'),
  editorArea: document.getElementById('editor-area'),
  emptyState: document.getElementById('empty-state'),
  conflictMessage: document.getElementById('conflict-message'),
  // POV Elements
  povBtn: document.getElementById('pov-btn'),
  povModal: document.getElementById('pov-modal'),
  closeModalBtn: document.querySelector('.close-modal'),
  povUserSelect: document.getElementById('pov-user-select'),
  povResults: document.getElementById('pov-results'),
};

// --- Helpers ---

function createDefaultWeekConfig() {
  const config = {};
  DAYS.forEach(day => {
    config[day] = { start: 0, end: 1439 }; // 00:00 to 23:59
  });
  return config;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = Math.floor(mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

// --- Persistence ---

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save state", e);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Simple migration check: if config is old format (no day keys), reset or migrate
      // For now, we'll just check if it looks like the new structure.
      // If we find a config that has "start" directly, it's old.
      // We will lazily migrate in the UI or here.
      // Let's just return parsed and handle potential structure mismatches gracefully if possible.
      return parsed;
    }
  } catch (e) {
    console.error("Failed to load state", e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

// --- Conflict Logic ---

/**
 * Checks for device conflicts.
 * Strict Rule: A user cannot be in two groups that configure the same device.
 */
function checkConflict(targetUserId, targetGroupId, targetDeviceKeys) {
  for (const group of state.groups) {
    if (group.id === targetGroupId) continue;

    if (group.members.includes(targetUserId)) {
      const existingDevices = Object.keys(group.configs);
      const conflicts = targetDeviceKeys.filter(d => existingDevices.includes(d));
      
      if (conflicts.length > 0) {
        return {
          hasConflict: true,
          conflictingGroup: group.name,
          devices: conflicts
        };
      }
    }
  }
  return { hasConflict: false };
}

// --- Rendering ---

function renderGroupList() {
  elements.groupList.innerHTML = '';
  state.groups.forEach(group => {
    const li = document.createElement('li');
    li.className = `group-item ${group.id === currentEditingGroupId ? 'active' : ''}`;
    li.textContent = group.name;
    li.addEventListener('click', () => selectGroup(group.id));
    elements.groupList.appendChild(li);
  });
}

function renderUserList(currentGroup, activeDeviceKeys) {
  elements.userList.innerHTML = '';
  
  state.users.forEach(user => {
    const isMember = currentGroup.members.includes(user);
    // If checking a member, use the active keys. If not, use checking logic.
    const conflictResult = checkConflict(user, currentGroup.id, activeDeviceKeys);
    
    const label = document.createElement('label');
    if (conflictResult.hasConflict && isMember) {
      label.classList.add('user-conflict');
    }

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = user;
    checkbox.checked = isMember;
    
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(user));
    
    if (conflictResult.hasConflict) {
      const icon = document.createElement('span');
      icon.className = 'conflict-icon';
      icon.textContent = '⚠️';
      icon.title = `Conflict in "${conflictResult.conflictingGroup}"`;
      label.appendChild(icon);
    }

    elements.userList.appendChild(label);
  });
}

// --- Time Bar Component ---

function createTimeBar(day, start, end, onUpdate) {
  const row = document.createElement('div');
  row.className = 'day-row';
  
  const label = document.createElement('div');
  label.className = 'day-label';
  label.textContent = day;
  
  const track = document.createElement('div');
  track.className = 'time-track';
  
  const segment = document.createElement('div');
  segment.className = 'time-segment';
  
  const handleL = document.createElement('div');
  handleL.className = 'time-handle handle-left';
  
  const handleR = document.createElement('div');
  handleR.className = 'time-handle handle-right';
  
  const display = document.createElement('div');
  display.className = 'time-display';
  
  segment.appendChild(handleL);
  segment.appendChild(handleR);
  track.appendChild(segment);
  row.appendChild(label);
  row.appendChild(track);
  row.appendChild(display);

  // State
  let currentStart = start;
  let currentEnd = end;

  function updateVisuals() {
    const total = 1440;
    const leftPct = (currentStart / total) * 100;
    const widthPct = ((currentEnd - currentStart) / total) * 100;
    
    segment.style.left = `${leftPct}%`;
    segment.style.width = `${widthPct}%`;
    
    display.textContent = `${minutesToTime(currentStart)} - ${minutesToTime(currentEnd)}`;
  }

  // Drag Logic
  let isDragging = null; // 'start', 'end', 'move'
  let startX = 0;
  let initialStart = 0;
  let initialEnd = 0;

  function handleMouseDown(e, type) {
    e.stopPropagation();
    isDragging = type;
    startX = e.clientX;
    initialStart = currentStart;
    initialEnd = currentEnd;
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  handleL.addEventListener('mousedown', (e) => handleMouseDown(e, 'start'));
  handleR.addEventListener('mousedown', (e) => handleMouseDown(e, 'end'));
  segment.addEventListener('mousedown', (e) => handleMouseDown(e, 'move'));
  // Click track to move segment center or create new? 
  // For now, simplify: just handles and move.

  function handleMouseMove(e) {
    if (!isDragging) return;
    
    const rect = track.getBoundingClientRect();
    const deltaPx = e.clientX - startX;
    const deltaMins = Math.round((deltaPx / rect.width) * 1440);
    
    // Snap to 60 mins (1 hour)
    const snap = (m) => Math.round(m / 60) * 60;

    if (isDragging === 'move') {
      let newStart = initialStart + deltaMins;
      let newEnd = initialEnd + deltaMins;
      const duration = initialEnd - initialStart;

      // Clamp
      if (newStart < 0) { newStart = 0; newEnd = duration; }
      if (newEnd > 1440) { newEnd = 1440; newStart = 1440 - duration; }
      
      currentStart = snap(newStart);
      currentEnd = snap(newEnd);
    } 
    else if (isDragging === 'start') {
      let newStart = initialStart + deltaMins;
      if (newStart < 0) newStart = 0;
      if (newStart >= currentEnd - 60) newStart = currentEnd - 60; // Min duration 60m
      currentStart = snap(newStart);
    } 
    else if (isDragging === 'end') {
      let newEnd = initialEnd + deltaMins;
      if (newEnd > 1440) newEnd = 1440;
      if (newEnd <= currentStart + 60) newEnd = currentStart + 60;
      currentEnd = snap(newEnd);
    }

    updateVisuals();
    onUpdate(currentStart, currentEnd);
  }

  function handleMouseUp() {
    isDragging = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }

  updateVisuals();
  return row;
}

function renderDeviceList(currentGroup) {
  // Save current scroll position if possible, or just rebuild
  elements.deviceList.innerHTML = '';
  
  state.devices.forEach(device => {
    const config = currentGroup.configs[device]; // This is now a Week Object or undefined
    const isEnabled = !!config;
    
    const row = document.createElement('div');
    row.className = `device-row ${isEnabled ? '' : 'disabled'}`;
    row.dataset.device = device;

    // Header
    const header = document.createElement('div');
    header.className = 'device-header';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'device-enable';
    checkbox.checked = isEnabled;
    header.appendChild(checkbox);
    header.appendChild(document.createTextNode(device));
    row.appendChild(header);

    // Days Container
    const daysContainer = document.createElement('div');
    daysContainer.className = 'device-days';

    if (isEnabled) {
      // If config exists but is old format (missing Mon/Tue...), re-init
      // Or just assume valid structure if code assumes correct save.
      // We'll use defaults if day missing.
      
      DAYS.forEach(day => {
        let dayConfig = config[day];
        if (!dayConfig) dayConfig = { start: 0, end: 1439 };

        const bar = createTimeBar(day, dayConfig.start, dayConfig.end, (newStart, newEnd) => {
          // Update internal temporary state in DOM is hard. 
          // We should update the group object directly? 
          // Current architecture: "getEditorState" scrapes DOM.
          // BUT "Time Bar" is complex to scrape.
          // BETTER: Update the group object in memory immediately?
          // OR: Store values on the DOM element dataset.
          
          bar.dataset.start = newStart;
          bar.dataset.end = newEnd;
          
          // Trigger validation (though time conflict isn't logic anymore, valid range is auto-handled by slider)
        });
        
        // Store initial values for scraper
        bar.dataset.start = dayConfig.start;
        bar.dataset.end = dayConfig.end;
        bar.dataset.day = day;
        
        daysContainer.appendChild(bar);
      });
    }

    row.appendChild(daysContainer);
    elements.deviceList.appendChild(row);
  });
}

// --- Logic ---

function selectGroup(id) {
  currentEditingGroupId = id;
  const group = state.groups.find(g => g.id === id);
  if (!group) return;

  // Render Editor
  elements.editorArea.style.display = 'flex';
  elements.emptyState.style.display = 'none';
  elements.groupNameInput.value = group.name;

  renderGroupList();
  
  // Need to know active devices to check user conflicts
  const activeKeys = Object.keys(group.configs);
  renderUserList(group, activeKeys);
  renderDeviceList(group);
  
  validateAndRenderConflicts();
}

function getEditorState() {
  const id = currentEditingGroupId;
  const name = elements.groupNameInput.value;
  
  const members = Array.from(elements.userList.querySelectorAll('input[type="checkbox"]:checked'))
    .map(cb => cb.value);

  const configs = {};
  const deviceRows = elements.deviceList.querySelectorAll('.device-row');
  
  deviceRows.forEach(row => {
    const deviceName = row.dataset.device;
    const enabled = row.querySelector('.device-enable').checked;
    
    if (enabled) {
      configs[deviceName] = {};
      // Scrape days
      const dayRows = row.querySelectorAll('.day-row');
      dayRows.forEach(dRow => {
        const day = dRow.dataset.day;
        const start = parseInt(dRow.dataset.start);
        const end = parseInt(dRow.dataset.end);
        configs[deviceName][day] = { start, end };
      });
    }
  });

  return { id, name, members, configs };
}

function validateAndRenderConflicts() {
  const editorState = getEditorState();
  const activeDeviceKeys = Object.keys(editorState.configs);
  
  let hasUserConflict = false;

  // Render User Conflicts
  const userLabels = elements.userList.querySelectorAll('label');
  userLabels.forEach(label => {
    const checkbox = label.querySelector('input');
    const user = checkbox.value;
    
    // Check conflicts for ALL selected users, and even unselected ones to show status
    if (checkbox.checked) {
      const conflict = checkConflict(user, editorState.id, activeDeviceKeys);
      if (conflict.hasConflict) {
        label.classList.add('user-conflict');
        if (!label.querySelector('.conflict-icon')) {
             const icon = document.createElement('span');
             icon.className = 'conflict-icon';
             icon.textContent = '⚠️';
             label.appendChild(icon);
        }
        hasUserConflict = true;
      } else {
        label.classList.remove('user-conflict');
        const icon = label.querySelector('.conflict-icon');
        if (icon) icon.remove();
      }
    } else {
      label.classList.remove('user-conflict');
      const icon = label.querySelector('.conflict-icon');
      if (icon) icon.remove();
    }
  });

  // Time validity is enforced by Slider constraints (start < end), so no validation needed there.

  if (hasUserConflict) {
    elements.saveBtn.disabled = true;
    elements.conflictMessage.classList.remove('hidden');
    elements.conflictMessage.textContent = "Cannot save: User conflicts detected.";
  } else {
    elements.saveBtn.disabled = false;
    elements.conflictMessage.classList.add('hidden');
  }

  return !hasUserConflict;
}

function saveGroup() {
  if (!validateAndRenderConflicts()) return;

  const editorState = getEditorState();
  const index = state.groups.findIndex(g => g.id === editorState.id);
  if (index !== -1) {
    state.groups[index] = editorState;
    saveState(); // Persist
    renderGroupList();
    // alert("Group saved!"); // Removed alert for smoother UX
  }
}

// --- POV Logic ---

function openPOVModal() {
  elements.povModal.classList.remove('hidden');
  
  // Populate User Select
  elements.povUserSelect.innerHTML = '<option value="">-- Select a User --</option>';
  state.users.forEach(user => {
    const option = document.createElement('option');
    option.value = user;
    option.textContent = user;
    elements.povUserSelect.appendChild(option);
  });
  
  elements.povResults.innerHTML = '';
}

function closePOVModal() {
  elements.povModal.classList.add('hidden');
}

function renderPOV(userId) {
  elements.povResults.innerHTML = '';
  
  if (!userId) return;

  // 1. Find all accessible devices for this user
  const accessList = [];
  
  state.groups.forEach(group => {
    if (group.members.includes(userId)) {
      Object.keys(group.configs).forEach(device => {
        accessList.push({
          device: device,
          groupName: group.name,
          config: group.configs[device]
        });
      });
    }
  });

  if (accessList.length === 0) {
    elements.povResults.innerHTML = `<div class="no-access">No access configured for ${userId}.</div>`;
    return;
  }

  // 2. Render Cards
  accessList.forEach(item => {
    const card = document.createElement('div');
    card.className = 'pov-device-card';
    
    const title = document.createElement('div');
    title.className = 'pov-device-title';
    title.innerHTML = `<span>${item.device}</span> <span class="pov-group-tag">${item.groupName}</span>`;
    card.appendChild(title);

    // Render Days
    DAYS.forEach(day => {
      const dayConfig = item.config[day];
      if (dayConfig) {
        const row = document.createElement('div');
        row.className = 'pov-day-row';
        
        const dayLabel = document.createElement('div');
        dayLabel.className = 'pov-day-name';
        dayLabel.textContent = day;
        
        const timeRange = document.createElement('div');
        timeRange.className = 'pov-time-range';
        
        // Format time
        const startStr = minutesToTime(dayConfig.start);
        const endStr = minutesToTime(dayConfig.end);
        
        // Simple visual check: is it full day?
        if (dayConfig.start === 0 && dayConfig.end === 1439) {
          timeRange.textContent = "All Day (00:00 - 23:59)";
        } else {
          timeRange.textContent = `${startStr} - ${endStr}`;
        }
        
        row.appendChild(dayLabel);
        row.appendChild(timeRange);
        card.appendChild(row);
      }
    });

    elements.povResults.appendChild(card);
  });
}

// --- Event Listeners ---

function generateDefaultName() {
  const existingNames = state.groups.map(g => g.name);
  let suffix = 'A'.charCodeAt(0);
  
  while (true) {
    const char = String.fromCharCode(suffix);
    const name = `Group ${char}`;
    if (!existingNames.includes(name)) {
      return name;
    }
    suffix++;
    // Fallback if we run out of letters (though unlikely for this scope)
    if (suffix > 'Z'.charCodeAt(0)) {
        return `Group ${Date.now()}`;
    }
  }
}

elements.addGroupBtn.addEventListener('click', () => {
  const newGroup = {
    id: generateId(),
    name: generateDefaultName(),
    members: [],
    configs: {}
  };
  state.groups.push(newGroup);
  selectGroup(newGroup.id);
});

elements.deleteBtn.addEventListener('click', () => {
  if (!confirm("Delete group?")) return;
  state.groups = state.groups.filter(g => g.id !== currentEditingGroupId);
  saveState();
  currentEditingGroupId = null;
  renderGroupList();
  elements.editorArea.style.display = 'none';
  elements.emptyState.style.display = 'flex';
});

elements.saveBtn.addEventListener('click', saveGroup);

// POV Events
elements.povBtn.addEventListener('click', openPOVModal);
elements.closeModalBtn.addEventListener('click', closePOVModal);
elements.povUserSelect.addEventListener('change', (e) => {
  renderPOV(e.target.value);
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
  if (e.target === elements.povModal) {
    closePOVModal();
  }
});

elements.userList.addEventListener('change', (e) => {
  if (e.target.matches('input[type="checkbox"]')) {
    validateAndRenderConflicts();
  }
});

elements.deviceList.addEventListener('change', (e) => {
  if (e.target.classList.contains('device-enable')) {
    const row = e.target.closest('.device-row');
    const deviceName = row.dataset.device;
    
    // We need to re-render this row to show/hide day sliders
    // Use current state to preserve others? 
    // Easier: Update the temporary config in memory for this device
    // But we are scraping DOM. 
    
    // Quick Hack: Toggle visibility via CSS first, but we need to inject the sliders if they don't exist.
    // Since renderDeviceList uses 'config' existence, we need to mock it.
    
    const isChecked = e.target.checked;
    
    // We essentially need to rebuild the device row.
    // Let's get current editor state, toggle this device, and re-render the list.
    const tempState = getEditorState();
    
    if (isChecked) {
      if (!tempState.configs[deviceName]) {
        tempState.configs[deviceName] = createDefaultWeekConfig();
      }
    } else {
      delete tempState.configs[deviceName];
    }
    
    // We only want to re-render the device list to avoid losing user selection
    // But we need the 'group' object to pass to renderDeviceList.
    // Let's create a proxy group object.
    const proxyGroup = {
      ...state.groups.find(g => g.id === currentEditingGroupId),
      configs: tempState.configs
    };
    
    renderDeviceList(proxyGroup);
    validateAndRenderConflicts();
  }
});

elements.groupNameInput.addEventListener('input', () => {
   // Optional auto-save or debounce
});

// Initial Load
renderGroupList();
