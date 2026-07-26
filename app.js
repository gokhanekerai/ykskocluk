/**
 * app.js — YKS Koçum Ana Uygulama Mantığı
 * Sekme yönetimi, form işleyicileri, başlatma
 */

// ── Uygulama Durumu ───────────────────────────────────────────────────────────

let currentStudent = 'kaan'; // Varsayılan öğrenci
let activeTab = 'dashboard';

// ── Oturum Hazır Callback ─────────────────────────────────────────────────────

function onSessionReady(user) {
  // Öğrenci ise kendi profiline kilitle
  if (user.role === 'student') {
    currentStudent = user.id;
  }

  // Sidebar öğrenci seçiciyi çiz
  renderSidebarStudentSelector();

  // Kayıtlı sekmeye git veya dashboard'a
  const savedTab = localStorage.getItem('yks_active_tab') || 'dashboard';
  switchTab(savedTab, true);

  // Firebase senkronizasyonu başlat
  initFirebaseSync(() => refreshUI());

  // Geri sayımı güncelle ve zamanlayıcı kur
  updateExamCountdown();
  setInterval(updateExamCountdown, 60000);
}

// ── Sekme Yönetimi ────────────────────────────────────────────────────────────

function switchTab(tabId, skipSave) {
  activeTab = tabId;
  if (!skipSave) localStorage.setItem('yks_active_tab', tabId);

  // Sekme görünürlüğü
  document.querySelectorAll('.tab-view').forEach(el => {
    el.classList.toggle('active', el.id === tabId);
  });

  // Menü aktif durumu
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tabId);
  });

  // Sekmeye özel render
  const data = getStudentData(currentStudent);
  switch (tabId) {
    case 'dashboard':
      renderDashboard(data);
      break;
    case 'deneme-takip':
      renderMockTable(data);
      updateMockFormFields();
      break;
    case 'konu-takip':
      renderTopicTracker();
      break;
    case 'haftalik-program':
      renderWeeklyPlanner(data);
      _initProgramTab();
      break;
    case 'kaynak-takip':
      renderBooks(data);
      break;
    case 'yanlis-defter':
      renderWrongLog(data);
      _initWrongSubjectFilter(data);
      break;
    case 'puan-hesapla':
      initCalculator();
      break;
  }
}

// ── Öğrenci Değiştirme ────────────────────────────────────────────────────────

function switchStudent(studentId) {
  currentStudent = studentId;
  renderSidebarStudentSelector();
  switchTab(activeTab, true);
  const students = getStudentList();
  const s = students.find(x => x.id === studentId);
  if (s) showToast(`${s.name}'ın profili açıldı`, 'info');
}

// ── UI Yenileme ───────────────────────────────────────────────────────────────

function refreshUI() {
  const data = getStudentData(currentStudent);
  switch (activeTab) {
    case 'dashboard':        renderDashboard(data);     break;
    case 'deneme-takip':     renderMockTable(data);     break;
    case 'konu-takip':       renderTopicTracker();      break;
    case 'haftalik-program': renderWeeklyPlanner(data); break;
    case 'kaynak-takip':     renderBooks(data);         break;
    case 'yanlis-defter':    renderWrongLog(data);      break;
  }
}

// ── Deneme Sınavı ─────────────────────────────────────────────────────────────

function updateMockFormFields() {
  const type = document.getElementById('mock-type')?.value || 'TYT';
  const container = document.getElementById('mock-subjects-inputs');
  if (!container) return;

  const fields = type === 'TYT'
    ? [
        { id: 'Turkce',    label: 'Türkçe (40 Soru)'          },
        { id: 'Sosyal',    label: 'Sosyal Bilimler (20 Soru)'  },
        { id: 'Matematik', label: 'Temel Matematik (40 Soru)'  },
        { id: 'Fen',       label: 'Fen Bilimleri (20 Soru)'    }
      ]
    : [
        { id: 'Matematik', label: 'AYT Matematik (40 Soru)'    },
        { id: 'Fizik',     label: 'AYT Fizik (14 Soru)'        },
        { id: 'Kimya',     label: 'AYT Kimya (13 Soru)'        },
        { id: 'Biyoloji',  label: 'AYT Biyoloji (13 Soru)'     },
        { id: 'Edebiyat',  label: 'TDİL ve Edebiyat (24 Soru)' },
        { id: 'Tarih1',    label: 'Tarih-1 (10 Soru)'          },
        { id: 'Cografya1', label: 'Coğrafya-1 (6 Soru)'        }
      ];

  container.innerHTML = fields.map(f => `
    <div class="subject-input-group">
      <div class="subject-input-label">${f.label}</div>
      <div class="form-row-double">
        <div>
          <label>Doğru</label>
          <input type="number" id="mock-c-${f.id}" min="0" max="40" placeholder="0" class="form-input">
        </div>
        <div>
          <label>Yanlış</label>
          <input type="number" id="mock-w-${f.id}" min="0" max="40" placeholder="0" class="form-input">
        </div>
      </div>
    </div>
  `).join('');
}

function handleAddMock(e) {
  e.preventDefault();
  const date = document.getElementById('mock-date')?.value;
  const type = document.getElementById('mock-type')?.value;
  const name = document.getElementById('mock-name')?.value?.trim();

  if (!date || !name) { showToast('Lütfen tarih ve sınav adını giriniz.', 'warning'); return; }

  const fields = type === 'TYT'
    ? ['Turkce', 'Sosyal', 'Matematik', 'Fen']
    : ['Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Edebiyat', 'Tarih1', 'Cografya1'];

  const nets = {};
  let totalCorrect = 0, totalWrong = 0;

  for (const f of fields) {
    const c = parseInt(document.getElementById(`mock-c-${f}`)?.value) || 0;
    const w = parseInt(document.getElementById(`mock-w-${f}`)?.value) || 0;
    nets[f] = +(c - w * 0.25).toFixed(2);
    totalCorrect += c;
    totalWrong   += w;
  }

  const totalNet  = +(totalCorrect - totalWrong * 0.25).toFixed(2);
  const scores    = _calcYKSScores(type, nets);
  const data      = getStudentData(currentStudent);

  data.mockLog.push({ id: generateId(), date, type, name, nets, totalNet, scores });
  data.mockLog.sort((a, b) => new Date(b.date) - new Date(a.date));
  saveStudentData(currentStudent, data);

  e.target.reset();
  _setInputToday('mock-date');
  updateMockFormFields();
  renderMockTable(data);
  showToast('Deneme kaydedildi!', 'success');
}

function deleteMock(id) {
  if (!confirm('Bu deneme kaydını silmek istiyor musunuz?')) return;
  const data = getStudentData(currentStudent);
  data.mockLog = data.mockLog.filter(m => m.id !== id);
  saveStudentData(currentStudent, data);
  renderMockTable(data);
  showToast('Deneme silindi.', 'info');
}

function _calcYKSScores(type, nets) {
  let TYT = 100, SAY = 100, EA = 100, SOZ = 100;
  if (type === 'TYT') {
    const t = nets.Turkce||0, s = nets.Sosyal||0, m = nets.Matematik||0, f = nets.Fen||0;
    TYT += (t*3.3)+(s*3.4)+(m*3.3)+(f*3.4);
    const contrib = (t*1.32)+(s*1.36)+(m*1.32)+(f*1.36);
    SAY += contrib; EA += contrib; SOZ += contrib;
  } else {
    const data = getStudentData(currentStudent);
    const lastTyt = data.mockLog.find(m => m.type === 'TYT');
    let contrib = 45;
    if (lastTyt) {
      const t=lastTyt.nets.Turkce||0, s=lastTyt.nets.Sosyal||0, m=lastTyt.nets.Matematik||0, f=lastTyt.nets.Fen||0;
      contrib = (t*1.32)+(s*1.36)+(m*1.32)+(f*1.36);
    }
    SAY += contrib; EA += contrib; SOZ += contrib;
    const mat=nets.Matematik||0, fiz=nets.Fizik||0, kim=nets.Kimya||0, biy=nets.Biyoloji||0;
    const edeb=nets.Edebiyat||0, tar=nets.Tarih1||0, cog=nets.Cografya1||0;
    SAY += (mat*3.0)+(fiz*2.85)+(kim*3.07)+(biy*3.07);
    EA  += (mat*3.0)+(edeb*3.0)+(tar*2.8)+(cog*3.33);
    SOZ += (edeb*3.0)+(tar*2.8)+(cog*3.33)+60;
  }
  return {
    TYT: Math.min(500, Math.round(TYT)),
    SAY: Math.min(500, Math.round(SAY)),
    EA:  Math.min(500, Math.round(EA)),
    SOZ: Math.min(500, Math.round(SOZ))
  };
}

// ── Haftalık Program / Görevler ───────────────────────────────────────────────

function handleAddTask(e) {
  e.preventDefault();
  const day  = document.getElementById('task-day')?.value;
  const text = document.getElementById('task-text')?.value?.trim();
  const q    = parseInt(document.getElementById('task-questions')?.value) || 0;
  const dur  = parseInt(document.getElementById('task-duration')?.value) || 0;

  if (!day || !text) { showToast('Gün ve görev metni zorunludur.', 'warning'); return; }

  const bothStudents = document.getElementById('task-both')?.checked;
  const targets = bothStudents ? getStudentList().map(s => s.id) : [currentStudent];

  targets.forEach((sid, i) => {
    const d = getStudentData(sid);
    d.tasks.push({ id: generateId() + i, text, day, questionTarget: q, durationTarget: dur, checked: false });
    saveStudentData(sid, d);
  });

  e.target.reset();
  renderWeeklyPlanner();
  showToast(`Görev eklendi${bothStudents ? ' (her iki öğrenciye)' : ''}.`, 'success');
}

function toggleTask(id) {
  const data = getStudentData(currentStudent);
  const task = data.tasks.find(t => t.id === id);
  if (task) {
    task.checked = !task.checked;
    saveStudentData(currentStudent, data);
    renderWeeklyPlanner(data);
  }
}

function deleteTask(id) {
  const data = getStudentData(currentStudent);
  data.tasks = data.tasks.filter(t => t.id !== id);
  saveStudentData(currentStudent, data);
  renderWeeklyPlanner(data);
  showToast('Görev silindi.', 'info');
}

function _initProgramTab() {
  const examInput = document.getElementById('exam-date-input');
  if (examInput) examInput.value = getExamDate();
}

function saveExamDateFromInput() {
  const val = document.getElementById('exam-date-input')?.value;
  if (!val) return;
  saveExamDate(val);
  updateExamCountdown();
  showToast('Sınav tarihi kaydedildi.', 'success');
}

// ── Kayıtlarım (Kitap) ────────────────────────────────────────────────────────

function handleAddBook(e) {
  e.preventDefault();
  const name   = document.getElementById('book-name')?.value?.trim();
  const subj   = document.getElementById('book-subject')?.value?.trim();
  const total  = parseInt(document.getElementById('book-pages')?.value) || 0;

  if (!name || !subj || total <= 0) { showToast('Kitap adı, ders ve sayfa sayısını girin.', 'warning'); return; }

  const data = getStudentData(currentStudent);
  data.books.push({ id: generateId(), name, subject: subj, totalPages: total, completedPages: 0, startDate: todayStr() });
  saveStudentData(currentStudent, data);
  e.target.reset();
  renderBooks(data);
  showToast('Kaynak eklendi.', 'success');
}

function updateBookProgress(id, val) {
  const data = getStudentData(currentStudent);
  const book = data.books.find(b => b.id === id);
  if (book) {
    book.completedPages = Math.min(book.totalPages, Math.max(0, parseInt(val) || 0));
    saveStudentData(currentStudent, data);
    renderBooks(data);
  }
}

function deleteBook(id) {
  if (!confirm('Bu kaynağı silmek istiyor musunuz?')) return;
  const data = getStudentData(currentStudent);
  data.books = data.books.filter(b => b.id !== id);
  saveStudentData(currentStudent, data);
  renderBooks(data);
  showToast('Kaynak silindi.', 'info');
}

// ── Yanlış Defteri ────────────────────────────────────────────────────────────

function handleAddWrong(e) {
  e.preventDefault();
  const tytAyt  = document.getElementById('wrong-tytayt')?.value;
  const subject = document.getElementById('wrong-subject')?.value?.trim();
  const topic   = document.getElementById('wrong-topic')?.value?.trim();
  const source  = document.getElementById('wrong-source')?.value?.trim();
  const reason  = document.getElementById('wrong-reason')?.value?.trim();
  const note    = document.getElementById('wrong-note')?.value?.trim();

  if (!tytAyt || !subject || !topic) { showToast('Sınav türü, ders ve konu zorunludur.', 'warning'); return; }

  const data = getStudentData(currentStudent);
  data.wrongLog.push({ id: generateId(), date: todayStr(), tytAyt, subject, topic, source, reason, note, reviewed: false });
  saveStudentData(currentStudent, data);
  e.target.reset();
  renderWrongLog(data);
  showToast('Yanlış kaydedildi.', 'success');
}

function toggleWrongReviewed(id) {
  const data = getStudentData(currentStudent);
  const item = data.wrongLog.find(w => w.id === id);
  if (item) {
    item.reviewed = !item.reviewed;
    saveStudentData(currentStudent, data);
    renderWrongLog(data);
  }
}

function deleteWrong(id) {
  if (!confirm('Bu kaydı silmek istiyor musunuz?')) return;
  const data = getStudentData(currentStudent);
  data.wrongLog = data.wrongLog.filter(w => w.id !== id);
  saveStudentData(currentStudent, data);
  renderWrongLog(data);
  showToast('Kayıt silindi.', 'info');
}

function _initWrongSubjectFilter(data) {
  const sel = document.getElementById('wrong-tytayt-filter');
  if (sel) sel.onchange = () => renderWrongLog();
}

// ── Puan Hesaplama ────────────────────────────────────────────────────────────

function initCalculator() {
  const typeEl = document.getElementById('calc-type');
  if (typeEl) {
    _updateCalcFields();
    typeEl.onchange = _updateCalcFields;
  }
}

function _updateCalcFields() {
  const type = document.getElementById('calc-type')?.value || 'TYT';
  const container = document.getElementById('calc-inputs');
  if (!container) return;

  const fields = type === 'TYT'
    ? [{ id:'t', l:'Türkçe Net' },{ id:'s', l:'Sosyal Net' },{ id:'m', l:'Matematik Net' },{ id:'f', l:'Fen Net' }]
    : [{ id:'mat', l:'Mat Net' },{ id:'fiz', l:'Fizik Net' },{ id:'kim', l:'Kimya Net' },{ id:'biy', l:'Biyoloji Net' },{ id:'edeb', l:'Edebiyat Net' }];

  container.innerHTML = fields.map(f => `
    <div class="form-group">
      <label>${f.l}</label>
      <input type="number" id="calc-${f.id}" class="form-input" min="-10" max="40" placeholder="0" step="0.25" oninput="calculateScores()">
    </div>
  `).join('');
}

function calculateScores() {
  const type = document.getElementById('calc-type')?.value || 'TYT';
  const get = id => parseFloat(document.getElementById(`calc-${id}`)?.value) || 0;

  let TYT=100, SAY=100, EA=100, SOZ=100;

  if (type === 'TYT') {
    const t=get('t'), s=get('s'), m=get('m'), f=get('f');
    TYT += (t*3.3)+(s*3.4)+(m*3.3)+(f*3.4);
    const c=(t*1.32)+(s*1.36)+(m*1.32)+(f*1.36);
    SAY+=c; EA+=c; SOZ+=c;
  } else {
    const mat=get('mat'), fiz=get('fiz'), kim=get('kim'), biy=get('biy'), edeb=get('edeb');
    SAY += (mat*3.0)+(fiz*2.85)+(kim*3.07)+(biy*3.07);
    EA  += (mat*3.0)+(edeb*3.0);
    SOZ += (edeb*3.0)+60;
  }

  const scores = {
    TYT: Math.min(500, Math.round(TYT)),
    SAY: Math.min(500, Math.round(SAY)),
    EA:  Math.min(500, Math.round(EA)),
    SOZ: Math.min(500, Math.round(SOZ))
  };

  const res = document.getElementById('calc-result');
  if (res) {
    const rows = Object.entries(scores).map(([k, v]) => {
      const range = getRankAndPercentileRange(k, v + 51);
      return `<tr><td><strong>${k}</strong></td><td style="color:var(--color-secondary);font-size:18px;font-weight:700;">${v}</td><td style="color:var(--text-muted);font-size:12px;">${range.rangeStr}</td></tr>`;
    });
    res.innerHTML = `<table style="width:100%;border-collapse:collapse;">${rows.join('')}</table>`;
  }
}

// ── Kişisel Hedef Modal ───────────────────────────────────────────────────────

function openPersonalGoalModal() {
  const data = getStudentData(currentStudent);
  const g = data.personalGoal || {};
  const fields = ['goal-university','goal-profession','goal-ranking'];
  const vals   = [g.university||'', g.profession||'', g.ranking||''];
  fields.forEach((id,i) => { const el = document.getElementById(id); if (el) el.value = vals[i]; });
  const m = document.getElementById('personal-goal-modal');
  if (m) m.style.display = 'flex';
}

function closePersonalGoalModal() {
  const m = document.getElementById('personal-goal-modal');
  if (m) m.style.display = 'none';
}

function savePersonalGoal() {
  const data = getStudentData(currentStudent);
  data.personalGoal = {
    university: document.getElementById('goal-university')?.value?.trim() || '',
    profession: document.getElementById('goal-profession')?.value?.trim() || '',
    ranking:    document.getElementById('goal-ranking')?.value?.trim()    || ''
  };
  saveStudentData(currentStudent, data);
  closePersonalGoalModal();
  showToast('Hedef kaydedildi!', 'success');
  renderDashboard(data);
}

// ── Toast Bildirimi ───────────────────────────────────────────────────────────

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success:'✅', warning:'⚠️', info:'ℹ️', error:'❌' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type]||'📢'}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── Yardımcılar ───────────────────────────────────────────────────────────────

function _setInputToday(id) {
  const el = document.getElementById(id);
  if (el) el.value = todayStr();
}

// ── DOMContentLoaded: Başlatma ────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initAuth();

  // Tarih alanlarını bugüne ayarla
  _setInputToday('mock-date');
  _setInputToday('wrong-date');

  // Form dinleyicileri
  document.getElementById('add-mock-form')?.addEventListener('submit', handleAddMock);
  document.getElementById('add-task-form')?.addEventListener('submit', handleAddTask);
  document.getElementById('add-book-form')?.addEventListener('submit', handleAddBook);
  document.getElementById('add-wrong-form')?.addEventListener('submit', handleAddWrong);
  document.getElementById('login-form')?.addEventListener('submit', handleLoginSubmit);

  // Deneme türü değiştiğinde alanları güncelle
  document.getElementById('mock-type')?.addEventListener('change', updateMockFormFields);
  updateMockFormFields();
});

// ── Tema ──────────────────────────────────────────────────────────────────────

function initTheme() {
  const saved = localStorage.getItem('yks_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('yks_theme', next);
}
