
const API = '';

// Globals for Enum mappings
let enumMap = null;
let rEnumMap = {};

function toZh(id, cat) {
  if (!rEnumMap[cat] || !id) return id;
  return rEnumMap[cat][id] || id;
}

function toId(zh, cat) {
  if (!enumMap[cat] || !zh) return zh;
  return enumMap[cat][zh]?.id || zh;
}

const MODULES = [
  'First Steps','Basic Tragedy X','Midnight Zone','Mystery Circle',
  'Haunted Stage A','Weird Mythology','Another Horizon Revised','Last Liar',
  'Haunted Stage Again','（模糊，待补充）','（非公开）'
];

let allScripts = [];
let allGlobalScripts = []; // store mapping for link references
let scriptLinks = []; // store tuple links
let currentFile = '';
let currentIdx = -1;
let dirty = false;

// DOM refs
const $ = id => document.getElementById(id);
const fileSelect = $('fileSelect');
const moduleFilter = $('moduleFilter');
const auditMode = $('auditMode');
const searchBox = $('searchBox');
const filterCast = $('filterCast');
const filterDays = $('filterDays');
const filterLoops = $('filterLoops');
const filterIncidents = $('filterIncidents');
const sortSelect = $('sortSelect');
const scriptList = $('scriptList');
const scriptCount = $('scriptCount');
const welcomeScreen = $('welcomeScreen');
const scriptView = $('scriptView');

// ========== INIT ==========
async function init() {
  const enumData = await fetch(`${API}/api/enums`).then(r => r.json()).catch(()=>null);
  if (enumData) {
     enumMap = enumData;
     for (const cat in enumData) {
         rEnumMap[cat] = {};
         for (const zh in enumData[cat]) {
             if (enumData[cat][zh].id) {
                 rEnumMap[cat][enumData[cat][zh].id] = zh;
             }
         }
     }
  }

  const files = await fetch(`${API}/api/files`).then(r => r.json());
  fileSelect.innerHTML = files.map(f => {
    if (f === '_all') return `<option value="_all">📚 全部剧本</option>`;
    const label = f.replace('.json','').replace('scripts-collection-', '剧本集 ').replace('en', 'EN');
    return `<option value="${f}">${label}</option>`;
  }).join('');
  
  if (enumMap) {
    const mods = Object.values(enumMap.modules).map(m => m.id);
    moduleFilter.innerHTML = `<option value="">(所有模组)</option>` + 
      mods.map(m => `<option value="${m}">${toZh(m, 'modules')}</option>`).join('');
  } else {
    moduleFilter.innerHTML = `<option value="">(所有模组)</option>`;
  }

  fileSelect.addEventListener('change', () => loadFile(fileSelect.value));
  moduleFilter.addEventListener('change', filterList);
  auditMode.addEventListener('change', filterList);
  searchBox.addEventListener('input', filterList);
  filterCast.addEventListener('input', filterList);
  filterDays.addEventListener('input', filterList);
  filterLoops.addEventListener('input', filterList);
  filterIncidents.addEventListener('input', filterList);
  sortSelect.addEventListener('change', filterList);
  
  $('saveBtn').addEventListener('click', saveScript);
  $('linkBtn').addEventListener('click', openLinkModal);
  $('prevBtn').addEventListener('click', () => navigate(-1));
  $('nextBtn').addEventListener('click', () => navigate(1));
  $('addCastBtn').addEventListener('click', addCastRow);
  $('addIncidentBtn').addEventListener('click', addIncidentRow);
  $('addDiffBtn').addEventListener('click', addDiffRow);
  $('verifyBtn').addEventListener('click', toggleVerify);
  $('deleteBtn').addEventListener('click', deleteScript);
  
  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveScript(); }
    if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); navigate(-1); }
    if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); navigate(1); }
  });

  if (files.length > 0) loadFile(files[0]);
  
  // Fetch links and global script index for referencing
  scriptLinks = await fetch(`${API}/api/links`).then(r => r.json()).catch(()=>[]);
  allGlobalScripts = await fetch(`${API}/api/scripts?file=_all`).then(r => r.json()).catch(()=>[]);
  
  $('closeLinkModal').addEventListener('click', () => $('linkModal').style.display='none');
  $('linkSearch').addEventListener('input', renderLinkResults);
}

// ========== LOAD FILE ==========
async function loadFile(file) {
  currentFile = file;
  allScripts = await fetch(`${API}/api/scripts?file=${file}`).then(r => r.json());
  renderList();
  if (allScripts.length > 0) selectScript(0);
}

function renderList() {
  const q = searchBox.value.toLowerCase();
  const modFilter = moduleFilter.value;
  const isAudit = auditMode.checked;
  const sortMode = sortSelect.value;
  
  const fCast = parseInt(filterCast.value);
  const fDays = parseInt(filterDays.value);
  const fLoops = parseInt(filterLoops.value);
  const fIncidents = parseInt(filterIncidents.value);
  
  let visible = allScripts.map((s, i) => ({ s, originalIdx: i }));
  
  visible = visible.filter(item => {
    const s = item.s;
    
    // Feature Request: Hide linked English scripts
    // English scripts have _collectionLabel like 'EN' or we can check s.titleEN presence / id regex
    const isLinked = scriptLinks.some(l => l.includes(s.id));
    const isEnglish = s._originalFilename || (s.id && String(s.id).includes('-E')); 
    if (isLinked && isEnglish) {
        // Hide them to declutter the list. 
        return false; 
    }

    if (modFilter) {
        if (s.module !== modFilter) return false;
    }
    
    if (!isNaN(fCast) && (s.cast?.length || 0) !== fCast) return false;
    if (!isNaN(fDays) && (s.daysPerLoop || 0) !== fDays) return false;
    if (!isNaN(fLoops) && (s.loops || 0) !== fLoops) return false;
    if (!isNaN(fIncidents) && (s.incidents?.length || 0) !== fIncidents) return false;

    if (q) {
        const title = s.title?.toLowerCase() || '';
        const titleEN = s.titleEN?.toLowerCase() || '';
        const id = String(s.id).toLowerCase();
        if (!title.includes(q) && !titleEN.includes(q) && !id.includes(q)) return false;
    }
    return true;
  });

  if (isAudit) {
    visible.sort((a, b) => {
      const sa = a.s; const sb = b.s;
      // 1. 模组
      if (sa.module !== sb.module) return (sa.module || '').localeCompare(sb.module || '');
      // 2. 日数
      if (sa.daysPerLoop !== sb.daysPerLoop) return (sa.daysPerLoop || 0) - (sb.daysPerLoop || 0);
      // 3. 人数
      const castA = sa.cast?.length || 0;
      const castB = sb.cast?.length || 0;
      if (castA !== castB) return castA - castB;
      // 4. 事件数
      const incA = sa.incidents?.length || 0;
      const incB = sb.incidents?.length || 0;
      if (incA !== incB) return incA - incB;
      // 5. Rule Y 首字母排序
      const ryA = sa.mainPlot || '';
      const ryB = sb.mainPlot || '';
      if (ryA !== ryB) return ryA.localeCompare(ryB);
      // 6. Rule X1 首字母排序
      const rxA = sa.subplot1 || '';
      const rxB = sb.subplot1 || '';
      if (rxA !== rxB) return rxA.localeCompare(rxB);
      // 7. 标题
      return (sa.title || '').localeCompare(sb.title || '');
    });
    
    // Identify identical unlinked pairs/groups for coloring
    let colorIndex = 0;
    
    // Helper to get string signature of all incidents
    const getIncidentsSig = (s) => (s.incidents || []).map(inc => `${inc.day}|${inc.incident}`).join('///');
    
    // Condition 1: First 4 properties match
    const getBaseSig = (s) => [
        s.module || '',
        s.daysPerLoop || 0,
        s.cast?.length || 0,
        s.incidents?.length || 0
    ].join('|||');

    // We will build groups by clustering items that match EITHER Condition 1 OR Condition 2.
    // To do this simply, we will use a union-find or simple adjacency list clustering.
    let parent = new Array(visible.length).fill(0).map((_, i) => i);
    function find(i) {
        if (parent[i] === i) return i;
        return parent[i] = find(parent[i]);
    }
    function union(i, j) {
        let rootI = find(i);
        let rootJ = find(j);
        if (rootI !== rootJ) parent[rootI] = rootJ;
    }

    for (let i = 0; i < visible.length; i++) {
        const sig1A = getBaseSig(visible[i].s);
        const sig2A = getIncidentsSig(visible[i].s);
        const hasIncidentsA = (visible[i].s.incidents?.length || 0) > 0;
        
        for (let j = i + 1; j < visible.length; j++) {
            const sig1B = getBaseSig(visible[j].s);
            const sig2B = getIncidentsSig(visible[j].s);
            
            let match = false;
            // Match Condition 1: 4 base props
            if (sig1A === sig1B) match = true;
            // Match Condition 2: exactly same incidents (and at least 1 incident exists)
            else if (hasIncidentsA && sig2A === sig2B) match = true;
            
            if (match) {
                union(i, j);
            }
        }
    }

    // Gather groups
    const groupMap = {};
    for (let i = 0; i < visible.length; i++) {
        const root = find(i);
        if (!groupMap[root]) groupMap[root] = [];
        groupMap[root].push(visible[i]);
    }
    const groups = Object.values(groupMap).filter(g => g.length > 1);

    groups.forEach(g => {
        let needsLink = false;
        // Check if there's ANY pair in this identical group that is NOT linked
        for (let i = 0; i < g.length; i++) {
            let foundUnlinked = false;
            for (let j = i + 1; j < g.length; j++) {
                const id1 = String(g[i].s.id);
                const id2 = String(g[j].s.id);
                const linked = scriptLinks.some(l => 
                    (String(l[0]) === id1 && String(l[1]) === id2) || 
                    (String(l[0]) === id2 && String(l[1]) === id1)
                );
                if (!linked) {
                    needsLink = true; foundUnlinked = true; break;
                }
            }
            if (foundUnlinked) break;
        }
        
        if (needsLink) {
            const colorClass = colorIndex % 7;
            g.forEach(item => { item.matchColor = colorClass; });
            colorIndex++;
        }
    });

  } else if (sortMode !== 'id_asc') {
    visible.sort((a, b) => {
       const sa = a.s; const sb = b.s;
       if (sortMode === 'cast_asc') return (sa.cast?.length || 0) - (sb.cast?.length || 0);
       if (sortMode === 'cast_desc') return (sb.cast?.length || 0) - (sa.cast?.length || 0);
       if (sortMode === 'days_asc') return (sa.daysPerLoop || 0) - (sb.daysPerLoop || 0);
       if (sortMode === 'days_desc') return (sb.daysPerLoop || 0) - (sa.daysPerLoop || 0);
       if (sortMode === 'loops_asc') return (sa.loops || 0) - (sb.loops || 0);
       if (sortMode === 'loops_desc') return (sb.loops || 0) - (sa.loops || 0);
       if (sortMode === 'incidents_asc') return (sa.incidents?.length || 0) - (sb.incidents?.length || 0);
       if (sortMode === 'incidents_desc') return (sb.incidents?.length || 0) - (sa.incidents?.length || 0);
       return 0;
    });
  }

  scriptList.innerHTML = '';
  visible.forEach(item => {
    const s = item.s;
    const i = item.originalIdx;
    
    const isLinked = scriptLinks.some(l => l.includes(s.id));
    const linkIcon = isLinked ? '<span title="已关联" style="margin-right:4px; font-size:12px;">🔗</span>' : '';
    
    const li = document.createElement('li');
    const colLabel = s._collectionLabel ? `<span class="li-col">${s._collectionLabel}</span>` : '';
    const verifiedIcon = s.verified ? '<span class="li-verified">✓</span>' : '';
    li.innerHTML = `
      ${colLabel}<span class="li-id">#${s.id}</span>
      <span class="li-title">${linkIcon}${s.title || '(无标题)'}</span>
      ${verifiedIcon}
      <span class="li-module">${toZh(s.module, 'modules').substring(0,6)}</span>
    `;
    if (s.unclear && s.unclear.length > 0) li.classList.add('has-unclear');
    if (s.verified) li.classList.add('is-verified');
    if (i === currentIdx) li.classList.add('active');
    if (item.matchColor !== undefined) li.classList.add(`match-color-${item.matchColor}`);
    li.addEventListener('click', () => selectScript(i));
    scriptList.appendChild(li);
  });
  
  const verifiedCount = allScripts.filter(s => s.verified).length;
  scriptCount.textContent = `${allScripts.length} 个剧本 · ✓${verifiedCount} 已核对`;
}

function filterList() { renderList(); }

// ========== SELECT SCRIPT ==========
function selectScript(idx) {
  if (dirty && !confirm('有未保存的修改，是否放弃？')) return;
  currentIdx = idx;
  dirty = false;
  renderList();
  renderScript(allScripts[idx]);
  welcomeScreen.style.display = 'none';
  scriptView.style.display = 'block';
  // scroll list item into view
  const items = scriptList.querySelectorAll('li');
  items.forEach((li, i) => {
    if (li.classList.contains('active')) li.scrollIntoView({ block: 'nearest' });
  });
}

function navigate(dir) {
  const newIdx = currentIdx + dir;
  if (newIdx >= 0 && newIdx < allScripts.length) selectScript(newIdx);
}

// ========== RENDER SCRIPT ==========
function renderScript(s) {
  // Header
  $('cardId').textContent = `#${s.id}`;
  $('cardTitle').textContent = s.title || '';
  $('cardTitleEN').textContent = s.titleEN ? `(${s.titleEN})` : '';
  $('cardModule').textContent = `📦 ${toZh(s.module, 'modules') || '新剧本'}`;
  $('cardDifficulty').textContent = `⚡ ${s.difficulty || '?'}`;
  $('cardStars').textContent = '★'.repeat(s.difficultyStars || 0) + '☆'.repeat(Math.max(0, 5 - (s.difficultyStars || 0)));
  $('cardLoops').textContent = `🔄 ${s.loops || '?'} loops`;
  $('cardDays').textContent = `📅 ${s.daysPerLoop || '?'} days`;
  $('cardDiscuss').textContent = s.discussionAllowed ? '💬 可讨论' : '🚫 不可讨论';
  
  let meta = [];
  if (s.creator) meta.push(`创建者: ${s.creator}`);
  if (s.sourcePages) meta.push(`PDF页: ${s.sourcePages}`);
  if (s.wikiSource) meta.push(`Wiki: ${s.wikiSource}`);
  $('cardMetaSecondary').textContent = meta.join(' · ');

  // Rules
  $('mainPlotValue').textContent = toZh(s.mainPlot, 'rules') || '';
  $('mainPlotId').textContent = s.mainPlotId || '';
  $('subplot1Value').textContent = toZh(s.subplot1, 'rules') || '';
  $('subplot1Id').textContent = s.subplot1Id || '';
  $('subplot2Value').textContent = toZh(s.subplot2, 'rules') || '';
  $('subplot2Id').textContent = s.subplot2Id || '';
  $('subplot2Row').style.display = (s.subplot2 || s.subplot2Id) ? 'flex' : 'none';

  // Cast
  renderCast(s.cast || []);
  // Incidents
  renderIncidents(s.incidents || []);
  // Public info
  renderPublicInfo(s);
  // Schedule
  renderSchedule(s);
  // Difficulty sets
  renderDifficultySets(s.difficultySets);
  // Unclear
  renderUnclear(s.unclear);
  // Crossref / Links
  renderLinks(s);

  // Source info
  $('sourceInfo').textContent = s.sourcePages ? `📄 页 ${s.sourcePages}` : '';
  $('wikiInfo').textContent = s.wikiSource ? `🌐 ${s.wikiSource}` : '';
  
  // Verify status
  updateVerifyUI(s);

  // Mark clean
  markClean();
  
  // Attach change listeners to editable fields
  setupChangeListeners();
}

function updateVerifyUI(s) {
  const btn = $('verifyBtn');
  const status = $('verifyStatus');
  if (s.verified) {
    btn.textContent = '☑ 已核对 ✓';
    btn.classList.add('btn-verify-done');
    status.textContent = `✓ 已核对 (${s.verifiedAt || ''})`;
    status.style.display = 'inline';
  } else {
    btn.textContent = '☐ 标记已核对';
    btn.classList.remove('btn-verify-done');
    status.textContent = '';
    status.style.display = 'none';
  }
}

async function toggleVerify() {
  const s = allScripts[currentIdx];
  if (s.verified) {
    if (!confirm('取消核对标记？')) return;
    s.verified = false;
    s.verifiedAt = null;
  } else {
    s.verified = true;
    s.verifiedAt = new Date().toISOString().split('T')[0];
  }
  // Auto save verify status
  markDirty();
  await saveScript();
  updateVerifyUI(s);
  renderList();
}

const ROLE_CLASSES = {
  '主谋': 'role-brain', '关键人物': 'role-key', '杀手': 'role-killer',
  '杀人狂': 'role-serial', '传谣人': 'role-conspirator', '阴谋家': 'role-conspirator',
  '亲友': 'role-friend', '心上人': 'role-lover', '求爱者': 'role-lover',
  '邪教徒': 'role-cultist', '暴徒': 'role-cultist',
  '平民': 'role-person', '目击者': 'role-person',
  '不安定因子': 'role-factor', '因果残片': 'role-factor',
  '时间旅者': 'role-time',
};

function getRoleClass(role) {
  return ROLE_CLASSES[role] || '';
}

function renderCast(cast) {
  const tbody = $('castBody');
  tbody.innerHTML = '';
  cast.forEach((c, i) => {
    const tr = document.createElement('tr');
    const roleClass = getRoleClass(c.role);
    tr.innerHTML = `
      <td contenteditable="true" data-field="character" data-idx="${i}">${c.character || ''}</td>
      <td contenteditable="true" data-field="role" data-idx="${i}" class="${roleClass}">${toZh(c.role, 'roles')}</td>
      <td contenteditable="true" data-field="notes" data-idx="${i}">${c.notes || ''}</td>
      <td><button class="btn-del" onclick="delCast(${i})">✕</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderIncidents(incidents) {
  const tbody = $('incidentBody');
  tbody.innerHTML = '';
  incidents.forEach((inc, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td contenteditable="true" data-field="day" data-idx="${i}" class="incident-day">${inc.day ?? ''}</td>
      <td contenteditable="true" data-field="incident" data-idx="${i}">${inc.incident || ''}</td>
      <td contenteditable="true" data-field="culprit" data-idx="${i}">${inc.culprit || ''}</td>
      <td><button class="btn-del" onclick="delIncident(${i})">✕</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderPublicInfo(s) {
  // Module select
  const sel = $('pubModule');
  if (enumMap) {
    const mods = Object.values(enumMap.modules).map(m => m.id);
    sel.innerHTML = mods.map(m => 
      `<option value="${m}" ${m === s.module ? 'selected' : ''}>${toZh(m, 'modules')}</option>`
    ).join('');
  }
  if (s.module && !MODULES.includes(s.module)) {
    sel.innerHTML += `<option value="${s.module}" selected>${s.module}</option>`;
  }
  sel.onchange = () => markDirty();
  
  $('pubLoops').value = s.loops || 0;
  $('pubDays').value = s.daysPerLoop || 0;
  $('pubDiscuss').value = String(s.discussionAllowed !== false);
  
  $('pubLoops').oninput = markDirty;
  $('pubDays').oninput = markDirty;
  $('pubDiscuss').onchange = markDirty;
  
  $('specialRules').value = (s.specialRules || []).join('\n');
  $('specialRules').oninput = markDirty;
}

function renderSchedule(s) {
  const days = Math.max(s.daysPerLoop || 0, 7);
  const events = s.scheduledEvents || [];
  const tbody = $('scheduleBody');
  tbody.innerHTML = '';
  for (let d = 1; d <= days; d++) {
    const evt = events.find(e => e.day === d);
    const tr = document.createElement('tr');
    tr.className = evt ? 'schedule-day-has-event' : 'schedule-day-empty';
    tr.innerHTML = `
      <td>${d}</td>
      <td class="schedule-icon">${evt ? '📋' : ''}</td>
      <td>${evt ? toZh(evt.event, 'incidents') : ''}</td>
    `;
    tbody.appendChild(tr);
  }
}

function renderDifficultySets(sets) {
  const tbody = $('diffBody');
  tbody.innerHTML = '';
  if (!sets || sets.length === 0) return;
  sets.forEach((ds, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="number" class="diff-input" value="${ds.numberOfLoops || ''}" min="1" max="20" data-field="loops" data-idx="${i}" /></td>
      <td><input type="text" class="diff-input" value="${ds.difficulty || ''}" data-field="diff" data-idx="${i}" /></td>
      <td><button class="btn-del" onclick="delDiff(${i})">✕</button></td>
    `;
    tr.querySelectorAll('input').forEach(inp => inp.addEventListener('input', markDirty));
    tbody.appendChild(tr);
  });
}

function addDiffRow() {
  const s = allScripts[currentIdx];
  if (!s.difficultySets) s.difficultySets = [];
  s.difficultySets.push({ numberOfLoops: s.loops || 3, difficulty: '' });
  renderDifficultySets(s.difficultySets);
  markDirty();
}

function delDiff(i) {
  const s = allScripts[currentIdx];
  s.difficultySets.splice(i, 1);
  renderDifficultySets(s.difficultySets);
  markDirty();
}

function renderUnclear(unclear) {
  const section = $('unclearSection');
  const list = $('unclearList');
  if (!unclear || unclear.length === 0) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  list.innerHTML = unclear.map(u => `<div>• ${u}</div>`).join('');
}

function renderLinks(s) {
  const section = $('crossrefSection');
  const list = $('crossrefList');
  const myId = s.id;
  
  // Find all links containing this script ID
  const linkedIds = scriptLinks.filter(l => l.includes(myId)).map(l => l[0] === myId ? l[1] : l[0]);
  
  if (linkedIds.length === 0) { 
      section.style.display = 'none'; 
      return; 
  }
  
  section.style.display = 'block';
  list.innerHTML = linkedIds.map(id => {
      const gs = allGlobalScripts.find(x => x.id === id);
      const t = gs ? gs.title : '未知剧本';
      return `<div style="padding: 4px; background: #313244; margin-bottom: 4px; border-radius: 4px;">🔗 <b>[${id}]</b> ${t}</div>`;
  }).join('');
}

// ========== LINK MODAL ==========
function openLinkModal() {
  $('linkModal').style.display = 'flex';
  $('linkSearch').value = '';
  renderLinkResults();
  $('linkSearch').focus();
}

function renderLinkResults() {
  const q = $('linkSearch').value.toLowerCase();
  const resDiv = $('linkResults');
  const cs = allScripts[currentIdx];
  
  const results = allGlobalScripts.filter(s => {
      if (s.id === cs.id) return false;
      if (!q) return true;
      return (s.title && s.title.toLowerCase().includes(q)) || 
             (s.titleEN && s.titleEN.toLowerCase().includes(q)) || 
             (s.id && String(s.id).toLowerCase().includes(q));
  }).slice(0, 50); // limit 50
  
  resDiv.innerHTML = results.map(s => {
      return `<div class="link-item" style="padding: 8px; border-bottom: 1px solid #313244; display: flex; justify-content: space-between; align-items: center;">
          <div><span style="color:#89b4fa; font-size:12px;">[${s.id}]</span> ${s.title}</div>
          <button style="background:#89b4fa; color:#11111b; border:none; border-radius:4px; padding:4px 8px; cursor:pointer;" onclick="createLink('${cs.id}', '${s.id}')">关联</button>
      </div>`;
  }).join('');
}

async function createLink(id1, id2) {
  try {
      const res = await fetch(`${API}/api/links`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id1, id2 })
      });
      const data = await res.json();
      if (data.ok) {
          scriptLinks = data.links;
          $('linkModal').style.display = 'none';
          renderLinks(allScripts[currentIdx]);
          showToast('✅ 剧本关联成功');
      }
  } catch(e) { showToast('❌ 关联失败'); }
}

// ========== EDIT HELPERS ==========
function setupChangeListeners() {
  document.querySelectorAll('[contenteditable="true"]').forEach(el => {
    el.addEventListener('input', markDirty);
  });
}

function markDirty() {
  if (!dirty) {
    dirty = true;
    $('unsavedLabel').style.display = 'inline';
    $('saveBtn').disabled = false;
  }
}

function markClean() {
  dirty = false;
  $('unsavedLabel').style.display = 'none';
  $('saveBtn').disabled = true;
}

function addCastRow() {
  const s = allScripts[currentIdx];
  if (!s.cast) s.cast = [];
  s.cast.push({ character: '', role: '', notes: '' });
  renderCast(s.cast);
  markDirty();
  setupChangeListeners();
}

function delCast(i) {
  const s = allScripts[currentIdx];
  s.cast.splice(i, 1);
  renderCast(s.cast);
  markDirty();
  setupChangeListeners();
}

function addIncidentRow() {
  const s = allScripts[currentIdx];
  if (!s.incidents) s.incidents = [];
  s.incidents.push({ day: 1, incident: '', culprit: '' });
  renderIncidents(s.incidents);
  markDirty();
  setupChangeListeners();
}

function delIncident(i) {
  const s = allScripts[currentIdx];
  s.incidents.splice(i, 1);
  renderIncidents(s.incidents);
  markDirty();
  setupChangeListeners();
}

// ========== SAVE ==========
async function saveScript() {
  if (!dirty) return;
  const s = allScripts[currentIdx];
  
  // Collect editable values
  s.title = $('cardTitle').textContent.trim();
  s.mainPlot = toId($('mainPlotValue').textContent.trim(), 'rules');
  const sp1 = $('subplot1Value').textContent.trim();
  s.subplot1 = sp1 ? toId(sp1, 'rules') : null;
  const sp2 = $('subplot2Value').textContent.trim();
  s.subplot2 = sp2 ? toId(sp2, 'rules') : null;
  s.module = $('pubModule').value;
  s.loops = parseInt($('pubLoops').value) || 0;
  s.daysPerLoop = parseInt($('pubDays').value) || 0;
  s.discussionAllowed = $('pubDiscuss').value === 'true';
  
  const rules = $('specialRules').value.trim();
  s.specialRules = rules ? rules.split('\n').map(r => r.trim()).filter(Boolean) : [];
  
  // Collect difficulty sets from table
  const diffRows = $('diffBody').querySelectorAll('tr');
  s.difficultySets = Array.from(diffRows).map(tr => {
    const inputs = tr.querySelectorAll('input');
    return {
      numberOfLoops: parseInt(inputs[0].value) || 0,
      difficulty: inputs[1].value.trim(),
    };
  }).filter(ds => ds.numberOfLoops > 0);
  
  // Collect cast from table
  const castRows = $('castBody').querySelectorAll('tr');
  s.cast = Array.from(castRows).map(tr => {
    const tds = tr.querySelectorAll('td');
    const idx = parseInt(tds[0].dataset.idx);
    const existing = s.cast?.[idx] || {};
    return {
      id: toId(tds[0].textContent.trim(), 'characters'),
      role: toId(tds[1].textContent.trim(), 'roles'),
      notes: tds[2].textContent.trim(),
      ...(existing.characterId ? { characterId: existing.characterId } : {}),
      ...(existing.roleId ? { roleId: existing.roleId } : {}),
    };
  });
  
  // Collect incidents from table
  const incRows = $('incidentBody').querySelectorAll('tr');
  s.incidents = Array.from(incRows).map(tr => {
    const tds = tr.querySelectorAll('td');
    const idx = parseInt(tds[0].dataset.idx);
    const existing = s.incidents?.[idx] || {};
    return {
      day: parseInt(tds[0].textContent.trim()) || 0,
      incident: toId(tds[1].textContent.trim(), 'incidents'),
      culprit: tds[2].textContent.trim(),
      ...(existing.incidentId ? { incidentId: existing.incidentId } : {}),
      ...(existing.culpritId ? { culpritId: existing.culpritId } : {}),
    };
  });
  
  // Update scheduled events to match incidents (public view)
  s.scheduledEvents = s.incidents.map(inc => ({
    day: inc.day,
    event: inc.incident,
    ...(inc.incidentId ? { eventId: inc.incidentId } : {}),
  }));
  
  allScripts[currentIdx] = s;
  
  try {
    const res = await fetch(`${API}/api/scripts`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: currentFile, script: s })
    });
    const result = await res.json();
    if (result.ok) {
      markClean();
      // Re-render to update schedule
      renderSchedule(s);
      renderList();
      showToast('✅ 保存成功');
    } else {
      showToast('❌ 保存失败');
    }
  } catch (err) {
    showToast('❌ 网络错误: ' + err.message);
  }
}

// ========== TOAST ==========
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position: fixed; bottom: 24px; right: 24px; 
      background: #1e1e2e; border: 1px solid #3a3a4a;
      color: #e8e6e3; padding: 10px 20px; border-radius: 8px;
      font-size: 0.85rem; z-index: 1000;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      transition: opacity 0.3s;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, 2000);
}

// ========== DELETE ==========
async function deleteScript() {
  const s = allScripts[currentIdx];
  if (!s) return;
  
  const title = s.title || `#${s.id}`;
  if (!confirm(`确定要删除剧本「${title}」吗？\n此操作不可恢复！`)) return;
  
  try {
    const url = new URL(`${API}/api/scripts`, window.location.href);
    url.searchParams.set('id', s.id);
    url.searchParams.set('file', currentFile);
    if (currentFile === '_all') {
      url.searchParams.set('sourceFile', s._sourceFile);
    }
    
    const res = await fetch(url, { method: 'DELETE' });
    const result = await res.json();
    
    if (result.ok) {
      showToast(`✅ 已删除: ${title}`);
      
      // Remove from frontend array
      allScripts.splice(currentIdx, 1);
      
      // Navigate to another script or clear view if empty
      dirty = false;
      if (allScripts.length > 0) {
        selectScript(Math.min(currentIdx, allScripts.length - 1));
      } else {
        scriptView.style.display = 'none';
        welcomeScreen.style.display = 'flex'; // Usually flex or block
        welcomeScreen.querySelector('h2').textContent = '当前分类为空';
        welcomeScreen.querySelector('p').textContent = '所有剧本已被删除';
        renderList();
      }
    } else {
      showToast(`❌ 删除失败: ${result.error || '未知错误'}`);
    }
  } catch (err) {
    showToast(`❌ 网络错误: ${err.message}`);
  }
}

// ========== BOOT ==========
init();
