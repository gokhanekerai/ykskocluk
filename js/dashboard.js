/**
 * dashboard.js — Dashboard İstatistikleri ve Grafikler
 */

let _charts = {};

function renderDashboard() {
  const student = window.activeStudent;
  if (!student) return;

  const data  = getStudentData(student);
  const users = getUsers();
  const user  = users[student] || {};

  // Kişisel Hedef
  const g = data.personalGoal || {};
  _el('goal-uni',  e => e.textContent = g.university || '—');
  _el('goal-prof', e => e.textContent = g.profession || '—');
  _el('goal-rank', e => e.textContent = g.ranking    ? `#${g.ranking}` : '—');

  // Streak
  _updateStreak(data, student);
  _el('dash-streak', e => e.textContent = data.streak || 0);

  // Bu haftaki soru
  const weekSolved = _getWeekSolved(data.dailyLog);
  _el('dash-week-solved', e => e.textContent = formatNumber(weekSolved));
  _el('dash-week-goal',   e => e.textContent = formatNumber(data.weeklyGoal || 1000));

  const pct = Math.min(100, Math.round((weekSolved / (data.weeklyGoal || 1000)) * 100));
  _el('dash-week-bar', e => e.style.width = pct + '%');
  _el('dash-week-pct', e => e.textContent = pct + '%');

  // Toplam deneme
  _el('dash-total-mock', e => e.textContent = data.mockLog.length);

  // Konu tamamlama
  const topicVals = Object.values(data.topicStatus);
  const completed = topicVals.filter(v => v === 'completed').length;
  const total     = topicVals.length;
  _el('dash-topics-done', e => e.textContent = `${completed}/${total}`);

  // Son 7 gün TYT neti (en son deneme)
  const lastMock = [...data.mockLog].sort((a,b) => b.date.localeCompare(a.date))[0];
  if (lastMock) {
    _el('dash-last-mock-name', e => e.textContent = lastMock.name || lastMock.type);
    _el('dash-last-mock-net',  e => e.textContent = (lastMock.totalNet || 0).toFixed(2));
    _el('dash-last-mock-date', e => e.textContent = formatDate(lastMock.date));
  }

  // Kaynak tamamlama
  const totalBooks = data.books.length;
  const doneBooks  = data.books.filter(b => _bookProgress(b) >= 100).length;
  _el('dash-books-done', e => e.textContent = `${doneBooks}/${totalBooks}`);

  // Grafikler
  _renderWeeklyChart(data.dailyLog);
  _renderMockNetChart(data.mockLog);
}

function _bookProgress(book) {
  if (book.totalPages > 0) return Math.round((book.solvedPages / book.totalPages) * 100);
  if (book.totalQuestions > 0) return Math.round((book.solvedQuestions / book.totalQuestions) * 100);
  return 0;
}

function _getWeekSolved(dailyLog) {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  return dailyLog
    .filter(e => new Date(e.date) >= weekAgo)
    .reduce((sum, e) => sum + (Number(e.solved) || 0), 0);
}

function _updateStreak(data, studentId) {
  const today = getTodayStr();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split('T')[0];

  const hasTodayEntry = data.dailyLog.some(e => e.date === today);

  if (hasTodayEntry) {
    if (data.lastActiveDate !== today) {
      if (data.lastActiveDate === yStr) {
        data.streak = (data.streak || 0) + 1;
      } else if (!data.lastActiveDate) {
        data.streak = 1;
      }
      data.lastActiveDate = today;
      saveStudentData(studentId, data);
    }
  } else if (data.lastActiveDate && data.lastActiveDate !== today && data.lastActiveDate !== yStr) {
    data.streak = 0;
    saveStudentData(studentId, data);
  }
}

function _renderWeeklyChart(dailyLog) {
  const canvas = document.getElementById('chart-weekly');
  if (!canvas) return;

  const labels = [];
  const solvedData = [];
  const days = ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const str = d.toISOString().split('T')[0];
    labels.push(days[d.getDay()]);
    const solved = dailyLog
      .filter(e => e.date === str)
      .reduce((s, e) => s + (Number(e.solved) || 0), 0);
    solvedData.push(solved);
  }

  if (_charts.weekly) _charts.weekly.destroy();

  _charts.weekly = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Çözülen Soru',
        data: solvedData,
        backgroundColor: 'rgba(139,92,246,0.7)',
        borderColor: 'rgba(139,92,246,1)',
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { color: '#9ca3af', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { ticks: { color: '#9ca3af', font: { size: 11 } }, grid: { display: false } }
      }
    }
  });
}

function _renderMockNetChart(mockLog) {
  const canvas = document.getElementById('chart-mocks');
  if (!canvas) return;

  const sorted = [...mockLog].sort((a,b) => a.date.localeCompare(b.date)).slice(-10);
  const labels = sorted.map(m => m.name?.substring(0,15) || m.type);
  const netData = sorted.map(m => Number(m.totalNet) || 0);

  if (_charts.mocks) _charts.mocks.destroy();

  _charts.mocks = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Toplam Net',
        data: netData,
        borderColor: 'rgba(34,211,238,1)',
        backgroundColor: 'rgba(34,211,238,0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'rgba(34,211,238,1)',
        pointRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { color: '#9ca3af', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { ticks: { color: '#9ca3af', font: { size: 11 }, maxRotation: 30 }, grid: { display: false } }
      }
    }
  });
}

function editWeeklyGoal() {
  const data = getStudentData(window.activeStudent);
  const val = prompt('Haftalık soru hedefi:', data.weeklyGoal || 1000);
  if (val === null) return;
  const n = parseInt(val);
  if (isNaN(n) || n < 1) { showToast('Geçerli bir sayı girin.', 'warning'); return; }
  data.weeklyGoal = n;
  saveStudentData(window.activeStudent, data);
  renderDashboard();
  showToast('Haftalık hedef güncellendi!', 'success');
}

function _el(id, fn) {
  const el = document.getElementById(id);
  if (el) fn(el);
}

window.renderDashboard  = renderDashboard;
window.editWeeklyGoal   = editWeeklyGoal;
