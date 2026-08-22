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

  // Kaçıncı Gün (Örn: 17 Ağustos = 1. Gün, 18 Ağustos = 2. Gün, 19 Ağustos = 3. Gün -> 3)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let startDateStr = data.personalGoal?.startDate;
  if (!startDateStr && data.schedule && data.schedule.length > 0) {
    const dates = data.schedule.map(s => s.date).sort();
    startDateStr = dates[0];
  }
  if (!startDateStr) startDateStr = '2026-08-17';

  const sDate = new Date(startDateStr + 'T00:00:00');
  sDate.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - sDate.getTime()) / 86400000);
  const currentDayNum = Math.max(1, diffDays + 1);

  _el('dash-streak', e => e.textContent = currentDayNum);
  _el('dash-streak-label', e => e.textContent = `Programın ${currentDayNum}. Günü`);


  // Soru Takibi: İki Satır (1. Satır: Günlük Çözülecek Soru Hedefi, 2. Satır: Toplam Çözülen Soru Sayısı)
  const allTimeSolved = _getAllTimeSolved(data);
  const dailyGoalVal  = _getDailyQuestionGoal(data);
  _el('dash-week-solved', e => {
    e.style.fontSize = '18px';
    e.style.lineHeight = '1.25';
    e.innerHTML = `
      <div style="display:flex; align-items:baseline; justify-content:space-between; margin-bottom:4px;">
        <span style="font-size:12px; color:var(--text-muted); font-weight:800; text-transform:uppercase; letter-spacing:0.04em;">Hedef:</span>
        <div style="display:flex; align-items:baseline; gap:3px;">
          <span style="font-size:26px; font-weight:900; color:#00F0FF; letter-spacing:-0.5px;">${formatNumber(dailyGoalVal)}</span>
          <span style="font-size:11px; font-weight:700; color:var(--text-muted);">Soru</span>
        </div>
      </div>
      <div style="display:flex; align-items:baseline; justify-content:space-between; border-top:1px solid rgba(255,255,255,0.06); padding-top:4px;">
        <span style="font-size:12px; color:var(--text-muted); font-weight:800; text-transform:uppercase; letter-spacing:0.04em;">Toplam:</span>
        <div style="display:flex; align-items:baseline; gap:3px;">
          <span style="font-size:26px; font-weight:900; color:#00F5A0; letter-spacing:-0.5px;">${formatNumber(allTimeSolved)}</span>
          <span style="font-size:11px; font-weight:700; color:var(--text-muted);">Soru</span>
        </div>
      </div>
    `;
  });
  _el('dash-solved-label', e => {
    e.textContent = 'GÜNLÜK HEDEF & TOPLAM';
  });

  // Toplam deneme
  _el('dash-total-mock', e => e.textContent = data.mockLog.length);

  // Konu tamamlama — Sadece Sayısal Müfredat (TYT & AYT iki ayrı satır)
  const topicStats = _getNumericalTopicStats(data);
  _el('dash-topics-done', e => {
    e.style.fontSize = '18px';
    e.style.lineHeight = '1.25';
    e.innerHTML = `
      <div style="display:flex; align-items:baseline; justify-content:space-between; margin-bottom:4px;">
        <span style="font-size:12px; color:var(--text-muted); font-weight:800; text-transform:uppercase; letter-spacing:0.04em;">TYT:</span>
        <div style="display:flex; align-items:baseline; gap:3px;">
          <span style="font-size:26px; font-weight:900; color:#00F0FF; letter-spacing:-0.5px;">${topicStats.tyt.done}</span>
          <span style="font-size:13px; font-weight:700; color:var(--text-muted);">/${topicStats.tyt.total}</span>
        </div>
      </div>
      <div style="display:flex; align-items:baseline; justify-content:space-between; border-top:1px solid rgba(255,255,255,0.06); padding-top:4px;">
        <span style="font-size:12px; color:var(--text-muted); font-weight:800; text-transform:uppercase; letter-spacing:0.04em;">AYT:</span>
        <div style="display:flex; align-items:baseline; gap:3px;">
          <span style="font-size:26px; font-weight:900; color:#c084fc; letter-spacing:-0.5px;">${topicStats.ayt.done}</span>
          <span style="font-size:13px; font-weight:700; color:var(--text-muted);">/${topicStats.ayt.total}</span>
        </div>
      </div>
    `;
  });



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

  // Görevlendirme İstatistiği (Tamamlanan / Toplam Görev)
  const schedule = data.schedule || [];
  let totalTasks = 0;
  let doneTasks = 0;
  schedule.forEach(day => {
    (day.items || []).forEach(item => {
      totalTasks++;
      if (item.done) doneTasks++;
    });
  });
  _el('dash-schedule-stat', e => e.textContent = `${doneTasks}/${totalTasks}`);

  // 🎯 Hedefe Kalan Netler & İlerleme Paneli
  _renderTargetGapWidget(data, user);

  // Grafikler
  _renderWeeklyChart(data.dailyLog);
  _renderMockNetChart(data.mockLog);
}

function openCountdownModal() {
  const data = getStudentData(window.activeStudent);
  const g = data.personalGoal || {};
  document.getElementById('cd-start-date').value = g.startDate || '';
  document.getElementById('cd-exam-date').value = g.examDate || '';
  calcCountdown();
  openModal('countdown-modal');
}

function calcCountdown() {
  let startVal = document.getElementById('cd-start-date')?.value;
  const examVal  = document.getElementById('cd-exam-date')?.value;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!startVal) startVal = '2026-08-17';
  const sDate = new Date(startVal.includes('T') ? startVal : startVal + 'T00:00:00');
  sDate.setHours(0, 0, 0, 0);
  const diff = today.getTime() - sDate.getTime();
  const passed = Math.max(1, Math.floor(diff / 86400000) + 1);

  let remaining = 0;
  if (examVal) {
    const eDate = new Date(examVal.includes('T') ? examVal : examVal + 'T00:00:00');
    eDate.setHours(0, 0, 0, 0);
    const diffRem = eDate.getTime() - today.getTime();
    remaining = Math.max(0, Math.floor(diffRem / 86400000));
  }

  const passedEl = document.getElementById('cd-passed-days');
  if (passedEl) passedEl.textContent = passed;
  const remEl = document.getElementById('cd-remaining-days');
  if (remEl) remEl.textContent = remaining;
}



function handleSaveCountdown(e) {
  if (e) e.preventDefault();
  const data = getStudentData(window.activeStudent);
  if (!data.personalGoal) data.personalGoal = {};
  data.personalGoal.startDate = document.getElementById('cd-start-date').value;
  data.personalGoal.examDate = document.getElementById('cd-exam-date').value;
  saveStudentData(window.activeStudent, data);
  showToast('Sayaç bilgileri kaydedildi!', 'success');
  closeModal('countdown-modal');
  
  if (window.updateGlobalCountdown) window.updateGlobalCountdown();
  renderDashboard();
}

function _bookProgress(book) {
  if (book.totalPages > 0) return Math.round((book.solvedPages / book.totalPages) * 100);
  if (book.totalQuestions > 0) return Math.round((book.solvedQuestions / book.totalQuestions) * 100);
  return 0;
}

function _getTodaySolved(data) {
  const todayStr = getTodayStr();

  // O gün (bugün) Soru Takibi tablosuna girilen soruların toplamı
  const dailyTotal = (data.dailyLog || [])
    .filter(e => e.date === todayStr)
    .reduce((sum, e) => sum + (Number(e.solved) || 0), 0);

  return dailyTotal;
}

function _updateStreak(data, studentId) {
  const today = getTodayStr();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split('T')[0];

  const hasTodayEntry = (data.dailyLog || []).some(e => e.date === today);

  if (hasTodayEntry) {
    if (data.lastActiveDate !== today) {
      if (data.lastActiveDate === yStr) {
        data.streak = (data.streak || 0) + 1;
      } else if (!data.lastActiveDate) {
        data.streak = 1;
      }
      data.lastActiveDate = today;
    }
  } else if (data.lastActiveDate && data.lastActiveDate !== today && data.lastActiveDate !== yStr) {
    data.streak = 0;
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

  const chartCtx = canvas.getContext('2d');
  const barGradient = chartCtx.createLinearGradient(0, 0, 0, 200);
  barGradient.addColorStop(0, '#00F0FF'); // Halojen Cyan
  barGradient.addColorStop(1, '#A855F7'); // Halojen Mor

  _charts.weekly = new Chart(chartCtx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Çözülen Soru',
        data: solvedData,
        backgroundColor: barGradient,
        hoverBackgroundColor: '#00F5A0',
        borderColor: '#00F0FF',
        borderWidth: 1,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
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
        y: { beginAtZero: true, ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { display: false } }
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

  const lineCtx = canvas.getContext('2d');
  const lineGradient = lineCtx.createLinearGradient(0, 0, 0, 200);
  lineGradient.addColorStop(0, 'rgba(0, 240, 255, 0.35)');
  lineGradient.addColorStop(1, 'rgba(0, 240, 255, 0.0)');

  _charts.mocks = new Chart(lineCtx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Toplam Net',
        data: netData,
        borderColor: '#00F0FF',
        borderWidth: 3,
        backgroundColor: lineGradient,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#00F0FF',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: '#00F5A0'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 15, 25, 0.92)',
          titleColor: '#00F0FF',
          bodyColor: '#ffffff',
          borderColor: 'rgba(0, 240, 255, 0.3)',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => ` Toplam Net: ${Number(ctx.raw).toFixed(2)} Net`
          }
        }
      },
      scales: {
        y: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { ticks: { color: '#94a3b8', font: { size: 11 }, maxRotation: 30 }, grid: { display: false } }
      }
    }
  });
}

function editWeeklyGoal() {
  const data = getStudentData(window.activeStudent);
  const val = prompt('Günlük soru hedefi:', data.dailyGoal || 150);
  if (val === null) return;
  const n = parseInt(val);
  if (isNaN(n) || n < 1) { showToast('Geçerli bir sayı girin.', 'warning'); return; }
  data.dailyGoal = n;
  saveStudentData(window.activeStudent, data);
  renderDashboard();
  showToast('Günlük hedef güncellendi!', 'success');
}

function _getDailyQuestionGoal(data, dateStr = null) {
  if (!data) return 150;
  const targetDate = dateStr || getTodayStr();

  // 1. O günün programındaki görevlerin hedef soru toplamı
  const daySched = (data.schedule || []).find(s => s.date === targetDate);
  if (daySched && Array.isArray(daySched.items) && daySched.items.length > 0) {
    const assignedQuestions = daySched.items.reduce((sum, item) => sum + (Number(item.questions) || 0), 0);
    if (assignedQuestions > 0) return assignedQuestions;
  }

  // 2. Eğer o gün için özel görev soru hedefi yoksa öğrencinin günlük hedefini al
  return Number(data.dailyGoal) || 150;
}

function _renderTargetGapWidget(data, user) {
  const container = document.getElementById('dash-target-gap-container');
  if (!container) return;

  // 1. Hedef Sıralama & Alan
  let targetRank = 38000;
  if (data.targetRank) {
    targetRank = parseInt(data.targetRank) || 38000;
  } else if (data.personalGoal && data.personalGoal.ranking) {
    const p = parseInt(String(data.personalGoal.ranking).replace(/[^0-9]/g, ''));
    if (p) targetRank = p;
  }

  let branch = 'SAY';
  if (user.branch === 'EA') branch = 'EA';
  else if (user.branch === 'Sözel' || user.branch === 'SOZ') branch = 'SOZ';
  else if (user.branch === 'Dil' || user.branch === 'DIL') branch = 'DIL';
  else branch = 'SAY';

  const obp = data.obp || 85;

  // 2. Güvenli Hedef Netlerini Hesapla
  let rec26 = null;
  let rec25 = null;
  if (typeof window.calculateRequiredNets === 'function') {
    rec26 = window.calculateRequiredNets(targetRank, branch, obp, "2026", "personalized");
    rec25 = window.calculateRequiredNets(targetRank, branch, obp, "2025", "personalized");
  }

  if (!rec26 || !rec25) {
    container.innerHTML = '';
    return;
  }

  // 3. Son Denemeleri Çek
  const mockLog = data.mockLog || [];
  const sortedMocks = [...mockLog].sort((a, b) => b.date.localeCompare(a.date));
  const latestTytMock = sortedMocks.find(m => m.type === 'TYT') || null;
  const latestAytMock = sortedMocks.find(m => m.type !== 'TYT') || null;
  const latestMock = sortedMocks[0] || null;

  const tytCurrentNets = latestTytMock?.nets || {};
  const aytCurrentNets = latestAytMock?.nets || {};

  const curTotalTyt = latestTytMock ? Number(latestTytMock.totalNet || 0) : 0;
  const curTotalAyt = latestAytMock ? Number(latestAytMock.totalNet || 0) : 0;

  const safeTargetTyt = Math.max(rec26.totalTytNet, rec25.totalTytNet);
  const safeTargetAyt = Math.max(rec26.totalAytNet, rec25.totalAytNet);

  const tytGap = safeTargetTyt - curTotalTyt;
  const aytGap = safeTargetAyt - curTotalAyt;

  const studentName = user.name || 'Öğrenci';

  // Ders İlerleme Kartları Üreticisi
  const renderSubjProgress = (subj, curNet, targetNet, maxQ, isAyt = false) => {
    const isDone = curNet >= targetNet;
    const diff = targetNet - curNet;
    const pct = targetNet > 0 ? Math.min(100, Math.round((curNet / targetNet) * 100)) : 0;
    
    // Gradient ve Rozet Renkleri
    let barGradient = 'linear-gradient(90deg, #00F5A0, #00F0FF)';
    let badgeHtml = '';
    
    if (isDone) {
      barGradient = 'linear-gradient(90deg, #00F5A0, #00D26A)';
      badgeHtml = `<span style="font-size:11px; font-weight:800; color:#00F5A0; background:rgba(0,245,160,0.12); padding:2px 6px; border-radius:4px; border:1px solid rgba(0,245,160,0.3);">✅ Hedefte (+${Math.abs(diff).toFixed(1)})</span>`;
    } else if (diff > 5) {
      barGradient = 'linear-gradient(90deg, #FF0055, #FF5E00)';
      badgeHtml = `<span style="font-size:11px; font-weight:800; color:#FF0055; background:rgba(255,0,85,0.12); padding:2px 6px; border-radius:4px; border:1px solid rgba(255,0,85,0.3);">🔥 +${diff.toFixed(1)} Net</span>`;
    } else {
      barGradient = 'linear-gradient(90deg, #FFE600, #FF9E00)';
      badgeHtml = `<span style="font-size:11px; font-weight:800; color:#FFE600; background:rgba(255,230,0,0.12); padding:2px 6px; border-radius:4px; border:1px solid rgba(255,230,0,0.3);">⚡ +${diff.toFixed(1)} Net</span>`;
    }

    const coeffMap = {
      'Türkçe': '×3.30', 'Matematik': isAyt ? '×3.00' : '×3.30',
      'Fen': '×3.40', 'Sosyal': '×3.40',
      'Fizik': '×2.85', 'Kimya': '×3.08', 'Biyoloji': '×3.08',
      'Edebiyat': '×3.00', 'Tarih': '×2.80', 'Coğrafya': '×3.33'
    };
    const coeffBadge = coeffMap[subj] ? `<span style="font-size:10px; font-weight:700; color:#00F0FF; opacity:0.85;">(${coeffMap[subj]})</span>` : '';

    return `
      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 10px 12px; display:flex; flex-direction:column; gap:6px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:13px; font-weight:700; color:var(--text);">${subj} ${coeffBadge}</span>
          ${badgeHtml}
        </div>
        <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--text-muted);">
          <span>Mevcut: <strong style="color:var(--text);">${curNet.toFixed(1)}</strong></span>
          <span>Hedef: <strong style="color:#00F0FF;">${targetNet.toFixed(1)}</strong> <span style="font-size:10px; opacity:0.6;">(/ ${maxQ})</span></span>
        </div>
        <div style="width:100%; height:6px; background:rgba(255,255,255,0.08); border-radius:3px; overflow:hidden;">
          <div style="width:${pct}%; height:100%; background:${barGradient}; border-radius:3px; transition:width 0.5s ease;"></div>
        </div>
      </div>`;
  };

  // TYT Dersleri Listesi
  const tytSubjs = [
    { name: 'Türkçe', max: 40 },
    { name: 'Matematik', max: 40 },
    { name: 'Fen', max: 20 },
    { name: 'Sosyal', max: 20 }
  ];

  const tytCardsHtml = tytSubjs.map(s => {
    const cur = tytCurrentNets[s.name] !== undefined ? Number(tytCurrentNets[s.name]) : 0;
    const tgt = Math.max(rec26.tytNets[s.name] || 0, rec25.tytNets[s.name] || 0);
    return renderSubjProgress(s.name, cur, tgt, s.max, false);
  }).join('');

  // AYT Dersleri Listesi
  let aytCardsHtml = '';
  if (branch !== 'TYT' && rec26.aytNets) {
    const aytSubjs = Object.keys(rec26.aytNets).map(name => {
      let max = 40;
      if (name === 'Fizik') max = 14;
      else if (name === 'Kimya' || name === 'Biyoloji') max = 13;
      else if (name === 'Edebiyat') max = 24;
      else if (name === 'Tarih') max = 10;
      else if (name === 'Coğrafya') max = 6;
      return { name, max };
    });

    aytCardsHtml = aytSubjs.map(s => {
      const cur = aytCurrentNets[s.name] !== undefined ? Number(aytCurrentNets[s.name]) : 0;
      const tgt = Math.max(rec26.aytNets[s.name] || 0, rec25.aytNets[s.name] || 0);
      return renderSubjProgress(s.name, cur, tgt, s.max, true);
    }).join('');
  }

  // HTML Render
  container.innerHTML = `
    <div class="card" style="background: linear-gradient(180deg, rgba(24,28,42,0.98) 0%, rgba(15,18,28,1) 100%); border: 1px solid rgba(0,240,255,0.25); box-shadow: 0 8px 32px rgba(0,0,0,0.35); position:relative; overflow:hidden;">
      <!-- Neon Üst Şerit -->
      <div style="position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg, #8b5cf6, #00F0FF, #00F5A0);"></div>

      <!-- Başlık & Buton -->
      <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:12px; margin-bottom:16px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:36px; height:36px; border-radius:8px; background:rgba(0,240,255,0.1); border:1px solid rgba(0,240,255,0.3); display:flex; align-items:center; justify-content:center; font-size:18px;">
            🎯
          </div>
          <div>
            <div style="font-size:16px; font-weight:800; color:var(--text); display:flex; align-items:center; gap:8px;">
              Hedef Sıralamaya Kalan Net Analizi
              <span style="font-size:12px; font-weight:700; color:#00F0FF; background:rgba(0,240,255,0.1); padding:2px 8px; border-radius:12px; border:1px solid rgba(0,240,255,0.25);">
                #${formatNumber(targetRank)} (${branch})
              </span>
            </div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">
              ${latestMock ? `Son Sınav: <strong>${latestMock.name || latestMock.type}</strong> (${formatDate(latestMock.date)})` : 'Henüz deneme kaydı girilmedi'}
            </div>
          </div>
        </div>

        <button class="btn btn-sm btn-primary" onclick="switchTab('calculator')" style="box-shadow:0 4px 14px rgba(0,240,255,0.2); font-weight:700;">
          🧮 Detaylı Simülatör ➔
        </button>
      </div>

      <!-- 3 Ana Özet Kartı -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-bottom:16px;">
        <div style="background:rgba(139,92,246,0.08); border:1px solid rgba(139,92,246,0.25); border-radius:8px; padding:10px 14px;">
          <div style="font-size:11px; font-weight:700; color:var(--primary); text-transform:uppercase;">Gereken Ham Puan</div>
          <div style="font-size:20px; font-weight:800; color:#fff; margin-top:2px;">
            ${rec26.requiredRawScore.toFixed(1)} <span style="font-size:12px; color:var(--text-muted);">/ 500</span>
          </div>
          <div style="font-size:11px; color:var(--text-dim); margin-top:2px;">OBP Katkısı: +${(obp*0.6).toFixed(1)}</div>
        </div>

        <div style="background:rgba(0,240,255,0.08); border:1px solid rgba(0,240,255,0.25); border-radius:8px; padding:10px 14px;">
          <div style="font-size:11px; font-weight:700; color:#00F0FF; text-transform:uppercase;">TYT Net İlerlemesi</div>
          <div style="font-size:20px; font-weight:800; color:#fff; margin-top:2px;">
            ${curTotalTyt.toFixed(1)} <span style="font-size:13px; color:#00F0FF;">/ ${safeTargetTyt.toFixed(1)}</span>
          </div>
          <div style="font-size:11px; font-weight:700; margin-top:2px; color:${tytGap <= 0 ? '#00F5A0' : '#FF0055'};">
            ${tytGap <= 0 ? `✅ Hedefte (+${Math.abs(tytGap).toFixed(1)} Net)` : `🔥 +${tytGap.toFixed(1)} Net Gerekiyor`}
          </div>
        </div>

        ${branch !== 'TYT' ? `
          <div style="background:rgba(255,230,0,0.08); border:1px solid rgba(255,230,0,0.25); border-radius:8px; padding:10px 14px;">
            <div style="font-size:11px; font-weight:700; color:#FFE600; text-transform:uppercase;">AYT Net İlerlemesi</div>
            <div style="font-size:20px; font-weight:800; color:#fff; margin-top:2px;">
              ${curTotalAyt.toFixed(1)} <span style="font-size:13px; color:#FFE600;">/ ${safeTargetAyt.toFixed(1)}</span>
            </div>
            <div style="font-size:11px; font-weight:700; margin-top:2px; color:${aytGap <= 0 ? '#00F5A0' : '#FF0055'};">
              ${aytGap <= 0 ? `✅ Hedefte (+${Math.abs(aytGap).toFixed(1)} Net)` : `🔥 +${aytGap.toFixed(1)} Net Gerekiyor`}
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Ders Bazlı Net Çubukları Grid -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:16px;">
        <div>
          <div style="font-size:12px; font-weight:800; color:#00F0FF; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
            <span>📝 TYT DERSLERİ</span>
            <span style="font-size:11px; font-weight:normal; color:var(--text-muted);">(Kalan Net Açıkları)</span>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
            ${tytCardsHtml}
          </div>
        </div>

        ${branch !== 'TYT' ? `
          <div>
            <div style="font-size:12px; font-weight:800; color:var(--primary); margin-bottom:8px; display:flex; align-items:center; gap:6px;">
              <span>📐 AYT DERSLERİ (${branch})</span>
              <span style="font-size:11px; font-weight:normal; color:var(--text-muted);">(Kalan Net Açıkları)</span>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
              ${aytCardsHtml}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function _getAllTimeSolved(data) {
  if (!data) return 0;
  // Günlük Soru Takibi kayıtlarının tümü (başlangıçtan bugüne girilen çözülen sorular)
  return (data.dailyLog || []).reduce((sum, e) => sum + (Number(e.solved) || 0), 0);
}

function _el(id, fn) {
  const el = document.getElementById(id);
  if (el) fn(el);
}

function _getNumericalTopicStats(data) {
  const status = data.topicStatus || {};
  const tytTopics = (window.TOPICS && window.TOPICS.tyt) || (window.YKS_TOPICS && window.YKS_TOPICS.TYT) || {};
  const aytTopics = (window.TOPICS && window.TOPICS.ayt) || (window.YKS_TOPICS && window.YKS_TOPICS.AYT) || {};

  // Sayısal TYT Dersleri (Türkçe, Matematik, Geometri, Fizik, Kimya, Biyoloji)
  const tytSaySubjects = ['Türkçe', 'Matematik', 'Geometri', 'Fizik', 'Kimya', 'Biyoloji'];
  let tytTotal = 0;
  let tytDone = 0;

  tytSaySubjects.forEach(sub => {
    const list = tytTopics[sub] || [];
    list.forEach(t => {
      tytTotal++;
      const v = status[`tyt_${sub}_${t}`] || status[`TYT_${sub}_${t}`];
      if (v === 'completed') tytDone++;
    });
  });

  // Sayısal AYT Dersleri (Matematik, Geometri, Fizik, Kimya, Biyoloji)
  const aytSaySubjects = ['Matematik', 'Geometri', 'Fizik', 'Kimya', 'Biyoloji'];
  let aytTotal = 0;
  let aytDone = 0;

  aytSaySubjects.forEach(sub => {
    const list = aytTopics[sub] || [];
    list.forEach(t => {
      aytTotal++;
      const v = status[`ayt_${sub}_${t}`] || status[`AYT_${sub}_${t}`];
      if (v === 'completed') aytDone++;
    });
  });

  // Fallback if window.TOPICS was not loaded yet
  if (tytTotal === 0) tytTotal = 85;
  if (aytTotal === 0) aytTotal = 84;

  return {
    tyt: { done: tytDone, total: tytTotal },
    ayt: { done: aytDone, total: aytTotal }
  };
}

window.renderDashboard        = renderDashboard;
window.editWeeklyGoal         = editWeeklyGoal;
window._getTodaySolved        = _getTodaySolved;
window._getAllTimeSolved      = _getAllTimeSolved;
window._getDailyQuestionGoal  = _getDailyQuestionGoal;
window._renderTargetGapWidget = _renderTargetGapWidget;
window._getNumericalTopicStats = _getNumericalTopicStats;





