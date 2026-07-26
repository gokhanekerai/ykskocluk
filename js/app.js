/**
 * app.js — Ana Koordinatör
 * Tab routing, öğrenci geçişi, modal yönetimi, toast bildirimleri
 */

let activeStudent = 'kaan';
let activeTab     = 'dashboard';

window.activeStudent = activeStudent;
window.activeTab     = activeTab;

// ─── Başlatma ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initAuth();
  initFirebaseSync(() => {
    if (window.currentUser) renderCurrentTab();
  });

  // Enter tuşu ile form gönder
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAllModals();
  });

  // Geri sayım
  startCountdown();
});

// ─── Öğrenci Geçişi ────────────────────────────────────────────────────────────

function switchStudent(studentId, force = false) {
  if (!force && activeStudent === studentId) return;

  activeStudent = studentId;
  window.activeStudent = studentId;

  // Sidebar buton durumu
  document.querySelectorAll('.student-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.onclick?.toString().includes(studentId));
  });

  // Başlık güncelle
  const users = getUsers();
  const user  = users[studentId] || {};
  _el('page-student-name', e => e.textContent = user.name || studentId);

  renderCurrentTab();
}

// ─── Tab Geçişi ────────────────────────────────────────────────────────────────

function switchTab(tabId) {
  activeTab        = tabId;
  window.activeTab = tabId;

  // Tüm sekmeleri gizle
  document.querySelectorAll('.tab-view').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));

  // Hedef sekmeyi göster
  const tab    = document.getElementById(`tab-${tabId}`);
  const menuEl = document.querySelector(`.menu-item[data-tab="${tabId}"]`);
  if (tab)    tab.classList.add('active');
  if (menuEl) menuEl.classList.add('active');

  // Mobil: sidebar kapat
  document.getElementById('sidebar')?.classList.remove('open');

  renderCurrentTab();
}

function renderCurrentTab() {
  switch (activeTab) {
    case 'dashboard': renderDashboard();    break;
    case 'exams':     renderExams();        break;
    case 'resources': renderResources();    break;
    case 'topics':    renderTopics();       break;
    case 'schedule':  renderSchedule();     break;
    case 'wrong':     renderWrongNotes();   break;
    case 'ai':        renderAIAnalysis();   break;
    case 'daily':     renderDailyLog();     break;
  }
}

// ─── Günlük Soru Takibi ────────────────────────────────────────────────────────

function renderDailyLog() {
  const data = getStudentData(window.activeStudent);
  const tbody = document.getElementById('daily-table-body');
  if (!tbody) return;

  const sorted = [...(data.dailyLog || [])].sort((a,b) => b.date.localeCompare(a.date));

  if (!sorted.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">Henüz kayıt yok.</td></tr>';
    return;
  }

  tbody.innerHTML = sorted.slice(0, 50).map(e => `
    <tr>
      <td>${formatDate(e.date)}</td>
      <td><span class="badge ${e.tytAyt==='TYT'?'badge-tyt':'badge-ayt'}">${e.tytAyt||'—'}</span></td>
      <td>${e.subject || '—'}</td>
      <td class="num">${e.solved || 0}</td>
      <td class="num correct">${e.correct || 0}</td>
      <td class="num wrong">${e.wrong || 0}</td>
      <td><button class="btn-sm btn-danger" onclick="deleteDailyEntry('${e.id}')">🗑️</button></td>
    </tr>`).join('');

  // Toplam istatistik
  const total   = data.dailyLog.reduce((s,e) => s + (Number(e.solved)||0), 0);
  const correct = data.dailyLog.reduce((s,e) => s + (Number(e.correct)||0), 0);
  _el('daily-stat-total',   el => el.textContent = formatNumber(total));
  _el('daily-stat-correct', el => el.textContent = formatNumber(correct));
  _el('daily-stat-acc',     el => el.textContent = total > 0 ? Math.round(correct/total*100)+'%' : '—');
}

function handleAddDaily(e) {
  if (e) e.preventDefault();

  const entry = {
    id:      generateId(),
    date:    document.getElementById('daily-date')?.value || getTodayStr(),
    tytAyt:  document.getElementById('daily-tytayt')?.value || 'TYT',
    subject: document.getElementById('daily-subject')?.value.trim() || '',
    solved:  parseInt(document.getElementById('daily-solved')?.value) || 0,
    correct: parseInt(document.getElementById('daily-correct')?.value) || 0,
    wrong:   parseInt(document.getElementById('daily-wrong')?.value) || 0,
  };

  if (!entry.subject || entry.solved <= 0) {
    showToast('Ders ve soru sayısını doldurun.', 'warning'); return;
  }

  const data = getStudentData(window.activeStudent);
  data.dailyLog.push(entry);
  saveStudentData(window.activeStudent, data);
  closeModal('add-daily-modal');
  ['daily-subject','daily-solved','daily-correct','daily-wrong'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  renderDailyLog();
  renderDashboard();
  showToast('Kayıt eklendi!', 'success');
}

function deleteDailyEntry(id) {
  const data = getStudentData(window.activeStudent);
  data.dailyLog = data.dailyLog.filter(e => e.id !== id);
  saveStudentData(window.activeStudent, data);
  renderDailyLog();
  renderDashboard();
}

// ─── Modal Yönetimi ────────────────────────────────────────────────────────────

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.classList.add('open'); modal.style.display = 'flex'; }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.classList.remove('open'); modal.style.display = 'none'; }
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(m => {
    m.classList.remove('open');
    m.style.display = 'none';
  });
}

// Overlay tıklamasıyla kapat
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal')) closeAllModals();
});

// ─── Tema ─────────────────────────────────────────────────────────────────────

function initTheme() {
  const saved = localStorage.getItem('yks_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('yks_theme', next);
  _el('theme-btn', e => e.textContent = next === 'dark' ? '☀️' : '🌙');
}

// ─── Geri Sayım ───────────────────────────────────────────────────────────────

function startCountdown() {
  const yksDate = new Date('2026-06-13T09:00:00');

  function update() {
    const now   = new Date();
    const diff  = yksDate - now;
    if (diff <= 0) { _el('countdown', e => e.textContent = 'YKS BAŞLADI! 🎉'); return; }

    const days  = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins  = Math.floor((diff % 3600000) / 60000);

    _el('countdown-days',  e => e.textContent = days);
    _el('countdown-hours', e => e.textContent = String(hours).padStart(2,'0'));
    _el('countdown-mins',  e => e.textContent = String(mins).padStart(2,'0'));
  }
  update();
  setInterval(update, 60000);
}

// ─── Toast Bildirimi ──────────────────────────────────────────────────────────

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container') || _createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' }[type] || '📢';
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));

  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 350);
  }, 3500);
}

function _createToastContainer() {
  const div = document.createElement('div');
  div.id = 'toast-container';
  document.body.appendChild(div);
  return div;
}

// ─── Mobil Sidebar ────────────────────────────────────────────────────────────

function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
}

// ─── Yardımcılar ──────────────────────────────────────────────────────────────

function _el(id, fn) { const el = document.getElementById(id); if (el) fn(el); }

// ─── Global Export ────────────────────────────────────────────────────────────

Object.assign(window, {
  activeStudent, activeTab,
  switchStudent, switchTab, renderCurrentTab,
  renderDailyLog, handleAddDaily, deleteDailyEntry,
  openModal, closeModal, closeAllModals,
  initTheme, toggleTheme,
  startCountdown, showToast, toggleSidebar
});
