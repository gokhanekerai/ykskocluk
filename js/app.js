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
  if (window.initPomodoro) initPomodoro();

  initAuth();
  initFirebaseSync(() => {
    if (window.currentUser) {
      renderCurrentTab();
      if (typeof renderSchedule === 'function') {
        renderSchedule();
      }
      if (typeof renderDashboard === 'function') {
        renderDashboard();
      }
    }
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

  dailyTrendOffset = 0;
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
    } else if (tabId === 'pomodoro') {
      topbar.innerHTML = `<button class="btn btn-primary" onclick="startPomodoro()">⚡ Başlat</button>`;
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
    case 'dashboard':  renderDashboard();                                  break;
    case 'exams':      renderExams();                                      break;
    case 'calculator': if (window.renderCalculator) renderCalculator();    break;
    case 'resources':  renderResources();                                  break;
    case 'topics':     renderTopics();                                     break;
    case 'schedule':   renderSchedule();                                   break;
    case 'wrong':      renderWrongNotes();                                 break;
    case 'ai':         renderAIAnalysis();                                 break;
    case 'daily':      renderDailyLog();                                   break;
    case 'pomodoro':   if (window._renderPomodoroUI) _renderPomodoroUI(); break;
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

function handleDailyDateRangeChange(val) {
  const dateInput = document.getElementById('daily-filter-date');
  if (dateInput) {
    if (val === 'custom') {
      dateInput.style.display = 'inline-block';
      if (!dateInput.value) dateInput.value = getTodayStr();
    } else {
      dateInput.style.display = 'none';
    }
  }
  renderDailyLog();
}

function handleDailyTypeChange(type) {
  populateDailyFilter(type);
  renderDailyLog();
}

function resetDailyFilters() {
  const rangeEl = document.getElementById('daily-filter-range');
  if (rangeEl) rangeEl.value = 'last2';
  
  const dateEl = document.getElementById('daily-filter-date');
  if (dateEl) { dateEl.value = ''; dateEl.style.display = 'none'; }

  const typeEl = document.getElementById('daily-filter-type');
  if (typeEl) typeEl.value = 'all';

  populateDailyFilter('all');
  
  const subjEl = document.getElementById('daily-filter-subject');
  if (subjEl) subjEl.value = 'all';

  renderDailyLog();
  showToast('Filtreler sıfırlandı (Son 2 gün)', 'info');
}

function renderDailyLog() {
  const data = getStudentData(window.activeStudent);
  const tbody = document.getElementById('daily-table-body');
  if (!tbody) return;

  const filterType       = document.getElementById('daily-filter-type')?.value || 'all';
  const filterSubj       = document.getElementById('daily-filter-subject')?.value || 'all';
  const filterRange      = document.getElementById('daily-filter-range')?.value || 'last2';
  const filterCustomDate = document.getElementById('daily-filter-date')?.value || '';

  // 1. TYT / AYT & Ders Bazlı Filtreleme
  let typeAndSubjFiltered = (data.dailyLog || []).filter(e => {
    if (filterType !== 'all' && e.tytAyt !== filterType) return false;
    if (filterSubj !== 'all') {
      if (filterSubj.includes('_')) {
        const parts = filterSubj.split('_');
        if (e.tytAyt !== parts[0] || e.subject !== parts.slice(1).join('_')) return false;
      } else {
        if (e.subject !== filterSubj) return false;
      }
    }
    return true;
  });

  // 2. Tarih Bazlı Filtreleme (Varsayılan: Son 2 Gün)
  let filteredData = typeAndSubjFiltered;
  if (filterRange === 'last2') {
    const distinctDates = [...new Set(typeAndSubjFiltered.map(e => e.date))].sort().reverse();
    const last2Dates = distinctDates.slice(0, 2);
    filteredData = typeAndSubjFiltered.filter(e => last2Dates.includes(e.date));
  } else if (filterRange === 'today') {
    const today = getTodayStr();
    filteredData = typeAndSubjFiltered.filter(e => e.date === today);
  } else if (filterRange === 'yesterday') {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = formatDateISO(yesterday);
    filteredData = typeAndSubjFiltered.filter(e => e.date === yStr);
  } else if (filterRange === 'last7') {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = formatDateISO(cutoff);
    filteredData = typeAndSubjFiltered.filter(e => e.date >= cutoffStr);
  } else if (filterRange === 'last30') {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = formatDateISO(cutoff);
    filteredData = typeAndSubjFiltered.filter(e => e.date >= cutoffStr);
  } else if (filterRange === 'custom' && filterCustomDate) {
    filteredData = typeAndSubjFiltered.filter(e => e.date === filterCustomDate);
  }

  const sorted = [...filteredData].sort((a,b) => b.date.localeCompare(a.date));

  if (!sorted.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">Seçilen filtrelere uygun soru kaydı bulunamadı.</td></tr>';
  } else {
    tbody.innerHTML = sorted.map(e => {
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
          <button class="btn-sm btn-primary" onclick="editDailyEntry('${e.id}')" title="Düzenle" style="padding:3px 7px; margin-right:4px; font-size:12px;">✏️</button>
          <button class="btn-sm btn-danger" onclick="deleteDailyEntry('${e.id}')" title="Sil" style="padding:3px 7px; font-size:12px;">🗑️</button>
        </td>
      </tr>`;
    }).join('');
  }

  // Genel İstatistikler
  const allTotal   = typeAndSubjFiltered.reduce((s,e) => s + (Number(e.solved)||0), 0);
  const allCorrect = typeAndSubjFiltered.reduce((s,e) => s + (Number(e.correct)||0), 0);
  const allWrong   = typeAndSubjFiltered.reduce((s,e) => s + (Number(e.wrong)||0), 0);
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

  _renderDailyCharts(data, allTotal, allCorrect, allWrong, allBlank, filterType, filterSubj);
}

let dailyTrendOffset = 0; // 0 = son 7 gün (bugüne kadar), 1 = 1 gün önce biten 7 gün, vs.

function changeDailyTrendOffset(delta) {
  const data = getStudentData(window.activeStudent);
  const startDateStr = data.personalGoal?.startDate || '2026-08-17';
  const startD = new Date(startDateStr + 'T00:00:00');
  const todayD = new Date(getTodayStr() + 'T00:00:00');
  const maxDays = Math.max(0, Math.floor((todayD - startD) / (1000 * 60 * 60 * 24)));

  const newOffset = dailyTrendOffset + delta;
  if (newOffset < 0) return;
  if (newOffset > maxDays) return;

  dailyTrendOffset = newOffset;
  renderDailyLog();
}

function resetDailyTrendOffset() {
  dailyTrendOffset = 0;
  renderDailyLog();
}

function _renderDailyCharts(data, allTotal, allCorrect, allWrong, allBlank, filterType = 'all', filterSubj = 'all') {
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
          minBarLength: 8
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

  // Sağdaki Grafik: Günlük Kaydırılabilir 7 Günlük Çizgi Grafik (Başlangıç Tarihi ve Bugün ile Sınırlı)
  const ctxTrend = document.getElementById('chart-daily-trend');
  if (ctxTrend) {
    const labels = [];
    const solvedData = [];
    const correctData = [];
    const wrongData = [];
    const days = ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];
    const monthsShort = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];

    const logData = data.dailyLog || [];
    const startDateStr = data.personalGoal?.startDate || '2026-08-17';
    const startLimitD = new Date(startDateStr + 'T00:00:00');
    const todayD = new Date(getTodayStr() + 'T00:00:00');

    // Bitiş tarihi: Bugün - dailyTrendOffset
    const endWindowDate = new Date(todayD);
    endWindowDate.setDate(endWindowDate.getDate() - dailyTrendOffset);

    let windowStartStr = '';
    const windowEndStr = formatDateISO(endWindowDate);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(endWindowDate);
      d.setDate(d.getDate() - i);
      const str = formatDateISO(d);
      if (i === 6) windowStartStr = str;

      const dayLabel = `${d.getDate()} ${monthsShort[d.getMonth()]} ${days[d.getDay()]}`;
      labels.push(dayLabel);

      const matchingEntries = logData.filter(e => {
        if (e.date !== str) return false;
        if (filterType !== 'all' && e.tytAyt !== filterType) return false;
        if (filterSubj !== 'all') {
          if (filterSubj.includes('_')) {
            const parts = filterSubj.split('_');
            if (e.tytAyt !== parts[0] || e.subject !== parts.slice(1).join('_')) return false;
          } else {
            if (e.subject !== filterSubj) return false;
          }
        }
        return true;
      });

      const solved = matchingEntries.reduce((s, e) => s + (Number(e.solved) || 0), 0);
      const correct = matchingEntries.reduce((s, e) => s + (Number(e.correct) || 0), 0);
      const wrong = matchingEntries.reduce((s, e) => s + (Number(e.wrong) || 0), 0);

      solvedData.push(solved);
      correctData.push(correct);
      wrongData.push(wrong);
    }

    // Başlık etiketini ve buton durumlarını güncelle
    const rangeLabelEl = document.getElementById('chart-trend-range-label');
    if (rangeLabelEl) {
      if (dailyTrendOffset === 0) {
        rangeLabelEl.textContent = `📅 ${formatDate(windowStartStr)} - ${formatDate(windowEndStr)} • (Son 7 Gün)`;
      } else {
        rangeLabelEl.textContent = `📅 ${formatDate(windowStartStr)} - ${formatDate(windowEndStr)} • (${dailyTrendOffset} Gün Önce)`;
      }
    }

    const btnNext = document.getElementById('btn-trend-next');
    if (btnNext) btnNext.disabled = (dailyTrendOffset <= 0);

    const btnToday = document.getElementById('btn-trend-today');
    if (btnToday) btnToday.style.opacity = (dailyTrendOffset === 0) ? '0.5' : '1';

    const btnPrev = document.getElementById('btn-trend-prev');
    if (btnPrev) {
      const windowStartD = new Date(windowStartStr + 'T00:00:00');
      btnPrev.disabled = (windowStartD <= startLimitD);
    }

    const chartCtx = ctxTrend.getContext('2d');
    const gradient = chartCtx.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, 'rgba(0, 240, 255, 0.25)');
    gradient.addColorStop(1, 'rgba(0, 240, 255, 0.01)');

    window._dailyTrendChart = new Chart(ctxTrend, {
      type: 'line',
      plugins: dlPlugin,
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Toplam Soru',
            data: solvedData,
            borderColor: '#00F0FF',
            borderWidth: 3,
            backgroundColor: gradient,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#00F0FF',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            datalabels: {
              display: (context) => (context.dataset.data[context.dataIndex] > 0),
              anchor: 'end',
              align: 'top',
              offset: 6,
              color: '#00F0FF',
              backgroundColor: 'rgba(10, 15, 30, 0.88)',
              borderColor: 'rgba(0, 240, 255, 0.4)',
              borderWidth: 1,
              borderRadius: 5,
              padding: { top: 2, bottom: 2, left: 5, right: 5 },
              font: { size: 11, weight: '800' },
              formatter: (value) => formatNumber(value)
            }
          },
          {
            label: 'Toplam Doğru',
            data: correctData,
            borderColor: '#00F5A0',
            borderWidth: 2.5,
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.35,
            pointBackgroundColor: '#00F5A0',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4.5,
            pointHoverRadius: 6.5,
            datalabels: {
              display: (context) => (context.dataset.data[context.dataIndex] > 0),
              anchor: 'start',
              align: 'bottom',
              offset: 6,
              color: '#00F5A0',
              backgroundColor: 'rgba(10, 30, 20, 0.88)',
              borderColor: 'rgba(0, 245, 160, 0.4)',
              borderWidth: 1,
              borderRadius: 5,
              padding: { top: 2, bottom: 2, left: 5, right: 5 },
              font: { size: 11, weight: '800' },
              formatter: (value) => formatNumber(value)
            }
          },
          {
            label: 'Toplam Yanlış',
            data: wrongData,
            borderColor: '#FF0055',
            borderWidth: 2.5,
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.35,
            pointBackgroundColor: '#FF0055',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4.5,
            pointHoverRadius: 6.5,
            datalabels: {
              display: (context) => (context.dataset.data[context.dataIndex] > 0),
              anchor: 'end',
              align: 'top',
              offset: 6,
              color: '#FF0055',
              backgroundColor: 'rgba(30, 10, 20, 0.88)',
              borderColor: 'rgba(255, 0, 85, 0.4)',
              borderWidth: 1,
              borderRadius: 5,
              padding: { top: 2, bottom: 2, left: 5, right: 5 },
              font: { size: 11, weight: '800' },
              formatter: (value) => formatNumber(value)
            }
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 28, bottom: 10, left: 12, right: 16 }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#cbd5e1',
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 8,
              padding: 16,
              font: { size: 12, weight: '700' }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 15, 25, 0.95)',
            titleColor: '#00F0FF',
            bodyColor: '#ffffff',
            borderColor: 'rgba(0, 240, 255, 0.3)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grace: '25%',
            ticks: { color: '#94a3b8', font: { size: 11 } },
            grid: { color: 'rgba(255,255,255,0.06)' }
          },
          x: {
            ticks: { color: '#f8fafc', font: { size: 11.5, weight: '700' } },
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

function populateDailyFilter(selectedType = 'all') {
  const select = document.getElementById('daily-filter-subject');
  if (!select || typeof YKS_TOPICS === 'undefined') return;
  
  const currentVal = select.value;
  let html = '<option value="all">Tüm Dersler</option>';
  
  if (selectedType === 'all') {
    for (const type of ['TYT', 'AYT']) {
      if (YKS_TOPICS[type]) {
        html += `<optgroup label="${type}">`;
        Object.keys(YKS_TOPICS[type]).forEach(subj => {
          html += `<option value="${type}_${subj}">${type} - ${subj}</option>`;
        });
        html += `</optgroup>`;
      }
    }
  } else if (YKS_TOPICS[selectedType]) {
    Object.keys(YKS_TOPICS[selectedType]).forEach(subj => {
      html += `<option value="${selectedType}_${subj}">${subj}</option>`;
    });
  }

  select.innerHTML = html;
  if (currentVal && select.querySelector(`option[value="${currentVal}"]`)) {
    select.value = currentVal;
  } else {
    select.value = 'all';
  }
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
window.toggleSidebar = toggleSidebar;
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
window.handleDailyDateRangeChange = handleDailyDateRangeChange;
window.handleDailyTypeChange = handleDailyTypeChange;
window.resetDailyFilters = resetDailyFilters;
window.changeDailyTrendOffset = changeDailyTrendOffset;
window.resetDailyTrendOffset = resetDailyTrendOffset;

Object.assign(window, {
  activeStudent, activeTab,
  switchStudent, switchTab, renderCurrentTab,
  renderDailyLog, handleAddDaily, editDailyEntry, openAddDailyModal, deleteDailyEntry,
  handleDailyDateRangeChange, handleDailyTypeChange, resetDailyFilters,
  changeDailyTrendOffset, resetDailyTrendOffset,
  openModal, closeModal, closeAllModals,
  initTheme, toggleTheme,
  startCountdown, showToast, toggleSidebar
});
