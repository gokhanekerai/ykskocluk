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
  
  if (window.populateDailyFilter) populateDailyFilter();
  if (window.updateDailyAddSubjects) updateDailyAddSubjects();

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

  // Sidebar buton durumunu güncelle
  if (typeof renderStudentSelector === 'function') {
    renderStudentSelector();
  }

  // Başlık güncelle
  const users = getUsers();
  const user  = users[studentId] || {};
  _el('page-student-name', e => e.textContent = user.name || studentId);

  renderCurrentTab();
  if (typeof checkNotifications === 'function') checkNotifications();
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

  // Topbar Butonlarını Güncelle
  const topbar = document.getElementById('topbar-actions');
  if (topbar) {
    if (tabId === 'daily') {
      topbar.innerHTML = `<button class="btn" onclick="openModal('add-daily-modal')">+ Soru Ekle</button>`;
    } else if (tabId === 'exams') {
      topbar.innerHTML = `
        <button class="btn btn-accent" onclick="openModal('ai-vision-modal')" style="margin-right:8px;">📸 Görselden Oku</button>
        <button class="btn" onclick="openModal('add-exam-modal')">✏️ Manuel Ekle</button>
      `;
    } else if (tabId === 'resources') {
      topbar.innerHTML = `<button class="btn" onclick="openModal('add-book-modal')">+ Kaynak Ekle</button>`;
    } else if (tabId === 'calculator') {
      topbar.innerHTML = `<button class="btn btn-primary" onclick="calculateAllScores()">⚡ Canlı Hesapla</button>`;
    } else {
      topbar.innerHTML = '';
    }
  }

  renderCurrentTab();
}

function renderCurrentTab() {
  const data = getStudentData(window.activeStudent);
  if (activeTab === 'schedule' && window.currentUser && window.currentUser.role === 'student' && data.hasNewTasks) {
    data.hasNewTasks = false;
    saveStudentData(window.activeStudent, data);
  }
  
  checkNotifications();

  switch (activeTab) {
    case 'dashboard':  renderDashboard();                            break;
    case 'exams':      renderExams();                                break;
    case 'calculator': if (window.renderCalculator) renderCalculator(); break;
    case 'resources':  renderResources();                            break;
    case 'topics':     renderTopics();                               break;
    case 'schedule':   renderSchedule();                             break;
    case 'wrong':      renderWrongNotes();                           break;
    case 'ai':         renderAIAnalysis();                           break;
    case 'daily':     renderDailyLog();     break;
  }
}

function checkNotifications() {
  const badge = document.getElementById('nav-badge-schedule');
  const dashBadge = document.getElementById('dash-badge-schedule');

  if (!window.currentUser || window.currentUser.role !== 'student') {
    if (badge) badge.style.display = 'none';
    if (dashBadge) dashBadge.style.display = 'none';
    return;
  }

  const data = getStudentData(window.activeStudent);
  
  let hasPendingTasks = false;
  const todayStr = new Date().toISOString().split('T')[0];
  
  if (data.schedule && data.schedule.length > 0) {
     for (const day of data.schedule) {
         if (day.date <= todayStr) {
             const uncompleted = day.items.some(item => !item.done);
             if (uncompleted) {
                 hasPendingTasks = true;
                 break;
             }
         }
     }
  }
  
  if (data.hasNewTasks || hasPendingTasks) {
    if (badge) badge.style.display = 'inline-block';
    if (dashBadge) dashBadge.style.display = 'inline-block';
  } else {
    if (badge) badge.style.display = 'none';
    if (dashBadge) dashBadge.style.display = 'none';
  }
}

// ─── Günlük Soru Takibi ────────────────────────────────────────────────────────

function renderDailyLog() {
  const data = getStudentData(window.activeStudent);
  const tbody = document.getElementById('daily-table-body');
  if (!tbody) return;

  const filterVal = document.getElementById('daily-filter-subject')?.value || 'all';

  let filteredData = (data.dailyLog || []).filter(e => {
    if (filterVal === 'all') return true;
    const parts = filterVal.split('_');
    const type = parts[0];
    const subj = parts.slice(1).join('_');
    return e.tytAyt === type && e.subject === subj;
  });

  const sorted = [...filteredData].sort((a,b) => b.date.localeCompare(a.date));

  if (!sorted.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">Henüz kayıt yok.</td></tr>';
  } else {
    tbody.innerHTML = sorted.slice(0, 50).map(e => {
      const blank = Math.max(0, (e.solved || 0) - (e.correct || 0) - (e.wrong || 0));
      return `
      <tr>
        <td style="white-space:nowrap;">${formatDate(e.date)}</td>
        <td style="text-align:center;"><span class="badge ${e.tytAyt==='TYT'?'badge-tyt':'badge-ayt'}">${e.tytAyt||'—'}</span></td>
        <td><strong>${e.subject || '—'}</strong></td>
        <td class="num" style="text-align:center; font-weight:600;">${e.solved || 0}</td>
        <td class="num correct" style="text-align:center; font-weight:700;">${e.correct || 0}</td>
        <td class="num wrong" style="text-align:center; font-weight:700;">${e.wrong || 0}</td>
        <td class="num" style="text-align:center; color:var(--text-muted); font-weight:600;">${blank}</td>
        <td style="text-align:center; white-space:nowrap;">
          <button class="btn-sm btn-primary coach-only" onclick="editDailyEntry('${e.id}')" title="Düzenle" style="padding:3px 7px; margin-right:4px; font-size:12px;">✏️</button>
          <button class="btn-sm btn-danger coach-only" onclick="deleteDailyEntry('${e.id}')" title="Sil" style="padding:3px 7px; font-size:12px;">🗑️</button>
        </td>
      </tr>`;
    }).join('');
  }

  // Genel İstatistikler (En baştan itibaren girilen tüm veriler)
  const allTotal   = filteredData.reduce((s,e) => s + (Number(e.solved)||0), 0);
  const allCorrect = filteredData.reduce((s,e) => s + (Number(e.correct)||0), 0);
  const allWrong   = filteredData.reduce((s,e) => s + (Number(e.wrong)||0), 0);
  const allBlank   = Math.max(0, allTotal - allCorrect - allWrong);

  _el('daily-today-total',   el => el.textContent = formatNumber(allTotal));
  _el('daily-today-correct', el => el.textContent = formatNumber(allCorrect));
  _el('daily-today-wrong',   el => el.textContent = formatNumber(allWrong));
  _el('daily-today-blank',   el => el.textContent = formatNumber(allBlank));

  // Günlük Hedef & O Gün Çözülen Soru Sayısı
  const dailyGoalVal = window._getDailyQuestionGoal ? window._getDailyQuestionGoal(data) : (data.dailyGoal || 150);
  const todayStr = getTodayStr();
  const todayEntries = (data.dailyLog || []).filter(e => e.date === todayStr);
  const todayTotal = todayEntries.reduce((s,e) => s + (Number(e.solved)||0), 0);
  
  _el('daily-tab-today-solved', e => e.textContent = formatNumber(todayTotal));
  _el('daily-tab-goal', e => e.textContent = formatNumber(dailyGoalVal));
  const pct = Math.min(100, Math.round((todayTotal / (dailyGoalVal || 1)) * 100));
  _el('daily-tab-bar', e => e.style.width = pct + '%');
  _el('daily-tab-pct', e => e.textContent = pct + '%');

  _renderDailyCharts(data, allTotal, allCorrect, allWrong, allBlank);
}

function _renderDailyCharts(data, allTotal, allCorrect, allWrong, allBlank) {
  if (window._dailyPieChart) window._dailyPieChart.destroy();
  if (window._dailyTrendChart) window._dailyTrendChart.destroy();

  const dlPlugin = typeof ChartDataLabels !== 'undefined' ? [ChartDataLabels] : [];

  // Soldaki Grafik: Çubuk Grafik (Doğru, Yanlış, Boş)
  const ctxPie = document.getElementById('chart-daily-pie');
  if (ctxPie) {
    const hasData = (allTotal > 0);
    const pctCorrect = hasData ? Math.round((allCorrect / allTotal) * 100) : 0;
    const pctWrong   = hasData ? Math.round((allWrong / allTotal) * 100) : 0;
    const pctBlank   = hasData ? Math.max(0, 100 - pctCorrect - pctWrong) : 0;

    window._dailyPieChart = new Chart(ctxPie, {
      type: 'bar',
      plugins: dlPlugin,
      data: {
        labels: [
          `Doğru (%${pctCorrect})`,
          `Yanlış (%${pctWrong})`,
          `Boş (%${pctBlank})`
        ],
        datasets: [{
          label: 'Soru Sayısı',
          data: [allCorrect, allWrong, allBlank],
          backgroundColor: [
            '#00F5A0', // ⚡ Halojen Neon Mint (Doğru)
            '#FF0055', // ⚡ Halojen Hot Crimson (Yanlış)
            '#FFE600'  // ⚡ Halojen Cyber Gold (Boş)
          ],
          borderColor: [
            '#00F5A0',
            '#FF0055',
            '#FFE600'
          ],
          borderWidth: 1,
          borderRadius: 8,
          borderSkipped: false,
          minBarLength: 8 // Küçük sayıların (örn. 1 boş) görünür olmasını sağlar
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 20 }
        },
        plugins: {
          legend: { display: false },
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'top',
            offset: 4,
            color: '#f8fafc',
            font: { size: 12, weight: '800' },
            formatter: (value) => `${formatNumber(value)} Soru`
          },
          tooltip: {
            backgroundColor: 'rgba(15, 15, 25, 0.92)',
            titleColor: '#00F0FF',
            bodyColor: '#ffffff',
            borderColor: 'rgba(0, 240, 255, 0.3)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: function(context) {
                const val = context.raw || 0;
                const total = allTotal || 1;
                const pct = Math.round((val / total) * 100);
                return ` ${context.label}: ${formatNumber(val)} Soru (%${pct})`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grace: '15%',
            ticks: { color: '#94a3b8', font: { size: 11 } },
            grid: { color: 'rgba(255,255,255,0.05)' }
          },
          x: {
            ticks: { color: '#f8fafc', font: { size: 12, weight: '700' } },
            grid: { display: false }
          }
        }
      }
    });
  }

  // Sağdaki Grafik: Çizgi Grafik (Son 7 Günlük Soru Eğilimi)
  const ctxTrend = document.getElementById('chart-daily-trend');
  if (ctxTrend) {
    const labels = [];
    const solvedData = [];
    const days = ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];

    const filterVal = document.getElementById('daily-filter-subject')?.value || 'all';
    const logData = data.dailyLog || [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = d.toISOString().split('T')[0];
      labels.push(days[d.getDay()]);
      const solved = logData
        .filter(e => {
          if (e.date !== str) return false;
          if (filterVal === 'all') return true;
          const parts = filterVal.split('_');
          return e.tytAyt === parts[0] && e.subject === parts.slice(1).join('_');
        })
        .reduce((s, e) => s + (Number(e.solved) || 0), 0);
      solvedData.push(solved);
    }

    const chartCtx = ctxTrend.getContext('2d');
    const gradient = chartCtx.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, 'rgba(0, 240, 255, 0.4)');   // Halojen Cyan dolgu
    gradient.addColorStop(1, 'rgba(168, 85, 247, 0.02)'); // Şeffaf mor

    window._dailyTrendChart = new Chart(ctxTrend, {
      type: 'line',
      plugins: dlPlugin,
      data: {
        labels: labels,
        datasets: [{
          label: 'Çözülen Soru',
          data: solvedData,
          borderColor: '#00F0FF',
          borderWidth: 3,
          backgroundColor: gradient,
          fill: true,
          tension: 0.38,
          pointBackgroundColor: '#00F0FF',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointHoverBackgroundColor: '#00F5A0',
          pointHoverBorderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 20 }
        },
        plugins: {
          legend: { display: false },
          datalabels: {
            display: (context) => (context.dataset.data[context.dataIndex] > 0),
            anchor: 'end',
            align: 'top',
            offset: 6,
            color: '#00F0FF',
            font: { size: 11, weight: '800' },
            formatter: (value) => formatNumber(value)
          },
          tooltip: {
            backgroundColor: 'rgba(15, 15, 25, 0.92)',
            titleColor: '#00F0FF',
            bodyColor: '#ffffff',
            borderColor: 'rgba(0, 240, 255, 0.3)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => ` Çözülen: ${formatNumber(ctx.raw)} Soru`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grace: '20%',
            ticks: { color: '#94a3b8', font: { size: 11 } },
            grid: { color: 'rgba(255,255,255,0.05)' }
          },
          x: {
            ticks: { color: '#94a3b8', font: { size: 11 } },
            grid: { display: false }
          }
        }
      }
    });
  }
}

function updateDailyAddSubjects() {
  const type = document.getElementById('daily-tytayt')?.value;
  const select = document.getElementById('daily-subject');
  if (!select) return;
  
  if (typeof YKS_TOPICS !== 'undefined' && YKS_TOPICS[type]) {
    const subjects = Object.keys(YKS_TOPICS[type]);
    select.innerHTML = '<option value="">Ders Seçiniz...</option>' + subjects.map(s => `<option value="${s}">${s}</option>`).join('');
  } else {
    select.innerHTML = '<option value="">Önce TYT/AYT seçin</option>';
  }
}

function populateDailyFilter() {
  const select = document.getElementById('daily-filter-subject');
  if (!select || typeof YKS_TOPICS === 'undefined') return;
  
  let html = '<option value="all">Tüm Dersler (Genel Özet)</option>';
  
  for (const type of ['TYT', 'AYT']) {
    if (YKS_TOPICS[type]) {
      html += `<optgroup label="${type}">`;
      Object.keys(YKS_TOPICS[type]).forEach(subj => {
        html += `<option value="${type}_${subj}">${type} - ${subj}</option>`;
      });
      html += `</optgroup>`;
    }
  }
  select.innerHTML = html;
}

let editingDailyId = null;

function openAddDailyModal() {
  editingDailyId = null;
  const title = document.getElementById('daily-modal-title');
  if (title) title.textContent = '✏️ Soru Kaydı Ekle';
  const btn = document.getElementById('daily-submit-btn');
  if (btn) btn.textContent = 'Kaydet';

  const dateEl = document.getElementById('daily-date');
  if (dateEl) dateEl.value = getTodayStr();
  const typeEl = document.getElementById('daily-tytayt');
  if (typeEl) typeEl.value = 'TYT';
  updateDailyAddSubjects();
  ['daily-solved','daily-correct','daily-wrong'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  openModal('add-daily-modal');
}

function editDailyEntry(id) {
  const data = getStudentData(window.activeStudent);
  const entry = (data.dailyLog || []).find(e => e.id === id);
  if (!entry) return;

  editingDailyId = id;
  const title = document.getElementById('daily-modal-title');
  if (title) title.textContent = '✏️ Soru Kaydını Düzenle';
  const btn = document.getElementById('daily-submit-btn');
  if (btn) btn.textContent = 'Güncelle';

  const dateEl = document.getElementById('daily-date');
  if (dateEl) dateEl.value = entry.date || getTodayStr();
  const typeEl = document.getElementById('daily-tytayt');
  if (typeEl) typeEl.value = entry.tytAyt || 'TYT';
  updateDailyAddSubjects();
  const subjEl = document.getElementById('daily-subject');
  if (subjEl) subjEl.value = entry.subject || '';
  const solvedEl = document.getElementById('daily-solved');
  if (solvedEl) solvedEl.value = entry.solved ?? '';
  const correctEl = document.getElementById('daily-correct');
  if (correctEl) correctEl.value = entry.correct ?? '';
  const wrongEl = document.getElementById('daily-wrong');
  if (wrongEl) wrongEl.value = entry.wrong ?? '';

  openModal('add-daily-modal');
}

function handleAddDaily(e) {
  if (e) e.preventDefault();

  const entryData = {
    date:    document.getElementById('daily-date')?.value || getTodayStr(),
    tytAyt:  document.getElementById('daily-tytayt')?.value || 'TYT',
    subject: document.getElementById('daily-subject')?.value.trim() || '',
    solved:  parseInt(document.getElementById('daily-solved')?.value) || 0,
    correct: parseInt(document.getElementById('daily-correct')?.value) || 0,
    wrong:   parseInt(document.getElementById('daily-wrong')?.value) || 0,
  };

  if (!entryData.subject || entryData.solved <= 0) {
    showToast('Ders ve soru sayısını doldurun.', 'warning'); return;
  }

  const data = getStudentData(window.activeStudent);
  if (!Array.isArray(data.dailyLog)) data.dailyLog = [];

  if (editingDailyId) {
    const idx = data.dailyLog.findIndex(e => e.id === editingDailyId);
    if (idx !== -1) {
      data.dailyLog[idx] = { ...entryData, id: editingDailyId };
      saveStudentData(window.activeStudent, data);
      showToast('Kayıt güncellendi!', 'success');
    }
    editingDailyId = null;
  } else {
    data.dailyLog.push({ ...entryData, id: generateId() });
    saveStudentData(window.activeStudent, data);
    showToast('Kayıt eklendi!', 'success');
  }

  closeModal('add-daily-modal');
  ['daily-subject','daily-solved','daily-correct','daily-wrong'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  renderDailyLog();
  renderDashboard();
}

function deleteDailyEntry(id) {
  if (!confirm('Bu soru kaydı silinecek. Emin misiniz?')) return;
  const data = getStudentData(window.activeStudent);
  data.dailyLog = (data.dailyLog || []).filter(e => e.id !== id);
  saveStudentData(window.activeStudent, data);
  renderDailyLog();
  renderDashboard();
  showToast('Kayıt silindi.', 'info');
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
  function update() {
    let examDateStr = '2026-06-13T09:00:00'; // Varsayılan
    try {
      if (window.activeStudent) {
        const data = getStudentData(window.activeStudent);
        if (data && data.personalGoal && data.personalGoal.examDate) {
          examDateStr = data.personalGoal.examDate + 'T00:00:00';
        }
      }
    } catch(e) {}

    const yksDate = new Date(examDateStr);
    const now   = new Date();
    const diff  = yksDate - now;
    if (diff <= 0) { 
      _el('countdown-days', e => e.textContent = '0');
      _el('countdown-hours', e => e.textContent = '00');
      _el('countdown-mins', e => e.textContent = '00');
      return; 
    }

    const days  = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins  = Math.floor((diff % 3600000) / 60000);

    _el('countdown-days',  e => e.textContent = days);
    _el('countdown-hours', e => e.textContent = String(hours).padStart(2,'0'));
    _el('countdown-mins',  e => e.textContent = String(mins).padStart(2,'0'));
  }
  update();
  // 1 dakikada bir güncelle
  setInterval(update, 60000);
  
  // Dışarıdan tetiklenebilmesi için window'a ekle
  window.updateGlobalCountdown = update;
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

function checkNotifications() {
  // Empty or simple check
}

// Global olarak dışa aktar
window.switchTab = switchTab;
window.switchSidebar = switchSidebar;
window.renderDailyLog = renderDailyLog;
window.handleAddDaily = handleAddDaily;
window.editDailyEntry = editDailyEntry;
window.openAddDailyModal = openAddDailyModal;
window.deleteDailyEntry = deleteDailyEntry;
window.openModal = openModal;
window.closeModal = closeModal;
window.toggleTheme = toggleTheme;
window.populateDailyFilter = populateDailyFilter;
window.updateDailyAddSubjects = updateDailyAddSubjects;

Object.assign(window, {
  activeStudent, activeTab,
  switchStudent, switchTab, renderCurrentTab,
  renderDailyLog, handleAddDaily, editDailyEntry, openAddDailyModal, deleteDailyEntry,
  openModal, closeModal, closeAllModals,
  initTheme, toggleTheme,
  startCountdown, showToast, toggleSidebar
});
