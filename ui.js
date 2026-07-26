/**
 * ui.js — YKS Koçum Arayüz Render Katmanı
 * Tüm DOM güncellemeleri burada yapılır
 */

// ── Sidebar Öğrenci Seçici ─────────────────────────────────────────────────────

function renderSidebarStudentSelector() {
  const container = document.getElementById('sidebar-student-selector');
  if (!container) return;
  const students = getStudentList();
  container.innerHTML = `
    <div class="selector-label">ÖĞRENCİ SEÇ</div>
    ${students.map(s => `
      <button class="student-btn ${currentStudent === s.id ? 'active' : ''}" onclick="switchStudent('${s.id}')">
        <span class="student-avatar">${s.avatar}</span>
        <span>${s.name}</span>
      </button>
    `).join('')}
    <button class="student-btn coach-only" onclick="openStudentMgmtModal()" title="Öğrenci Ekle/Çıkar" style="margin-top:6px; opacity:0.7;">
      <span class="student-avatar" style="font-size:14px;">⚙️</span>
      <span>Öğrenci Yönet</span>
    </button>
  `;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function renderDashboard(data) {
  _renderDashboardStats(data);
  _renderDashboardCharts(data);
  _renderCoachOverview(); // Koç genel bakış (sadece koç görür)
}

function _renderDashboardStats(data) {
  const tytLogs = data.mockLog.filter(m => m.type === 'TYT');
  const aytLogs = data.mockLog.filter(m => m.type === 'AYT');

  const tytAvg = tytLogs.length > 0
    ? (tytLogs.reduce((s, m) => s + m.totalNet, 0) / tytLogs.length).toFixed(1)
    : '--';
  const aytAvg = aytLogs.length > 0
    ? (aytLogs.reduce((s, m) => s + m.totalNet, 0) / aytLogs.length).toFixed(1)
    : '--';

  // Konu tamamlama yüzdesi
  let total = 0, completed = 0;
  for (const val of Object.values(data.topicStatus)) {
    total++;
    if (val === 'completed') completed++;
  }
  const topicPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Görev tamamlama
  const taskDone = data.tasks.filter(t => t.checked).length;
  const taskTotal = data.tasks.length;

  _setHtml('stat-tyt-avg',    tytAvg + (tytAvg !== '--' ? ' Net' : ''));
  _setHtml('stat-ayt-avg',    aytAvg + (aytAvg !== '--' ? ' Net' : ''));
  _setHtml('stat-topic-pct',  topicPct + '%');
  _setHtml('stat-tasks-done', `${taskDone}/${taskTotal}`);
  _setHtml('stat-mock-count', data.mockLog.length + ' Deneme');

  // Son deneme
  if (data.mockLog.length > 0) {
    const last = data.mockLog[0];
    _setHtml('stat-last-mock', `${last.name} — ${last.totalNet.toFixed(1)} Net`);
  } else {
    _setHtml('stat-last-mock', 'Henüz deneme yok');
  }
}

function _renderDashboardCharts(data) {
  _renderNetProgressChart(data);
  _renderTopicPieChart(data);
}

function _renderNetProgressChart(data) {
  const canvas = document.getElementById('chart-net-progress');
  if (!canvas) return;

  const tytLogs = [...data.mockLog].filter(m => m.type === 'TYT').reverse().slice(-10);
  const aytLogs = [...data.mockLog].filter(m => m.type === 'AYT').reverse().slice(-10);

  if (window._netChart) window._netChart.destroy();
  window._netChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: tytLogs.map((m, i) => formatDate(m.date)),
      datasets: [
        {
          label: 'TYT Net',
          data: tytLogs.map(m => +m.totalNet.toFixed(2)),
          borderColor: '#6c63ff',
          backgroundColor: 'rgba(108,99,255,0.15)',
          tension: 0.4, fill: true, pointRadius: 4
        },
        {
          label: 'AYT Net',
          data: aytLogs.map(m => +m.totalNet.toFixed(2)),
          borderColor: '#00d4aa',
          backgroundColor: 'rgba(0,212,170,0.1)',
          tension: 0.4, fill: true, pointRadius: 4
        }
      ]
    },
    options: _chartDefaults('Net Gelişim Grafiği')
  });
}

function _renderTopicPieChart(data) {
  const canvas = document.getElementById('chart-topic-pie');
  if (!canvas) return;

  const counts = { not_started: 0, studying: 0, review: 0, completed: 0 };
  for (const val of Object.values(data.topicStatus)) {
    if (counts[val] !== undefined) counts[val]++;
  }

  if (window._topicChart) window._topicChart.destroy();
  window._topicChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Başlanmadı', 'Çalışılıyor', 'Tekrar', 'Tamamlandı'],
      datasets: [{
        data: [counts.not_started, counts.studying, counts.review, counts.completed],
        backgroundColor: ['#3a3a5c', '#f59e0b', '#8b5cf6', '#00d4aa'],
        borderWidth: 2, borderColor: '#1a1a2e'
      }]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: '#a0aec0', font: { size: 11 } } } } }
  });
}

function _chartDefaults(title) {
  return {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#a0aec0', font: { size: 11 } } }
    },
    scales: {
      x: { ticks: { color: '#a0aec0' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#a0aec0' }, grid: { color: 'rgba(255,255,255,0.05)' } }
    }
  };
}

// Koç Genel Bakış: Tüm öğrencilerin özetini gösterir
function _renderCoachOverview() {
  const container = document.getElementById('coach-overview');
  if (!container) return;
  if (!currentUserSession || currentUserSession.role !== 'coach') {
    container.style.display = 'none';
    return;
  }
  container.style.display = 'block';

  const students = getStudentList();
  container.innerHTML = `
    <h2 class="panel-title" style="margin-bottom:16px;">👨‍🏫 Koç Genel Bakışı</h2>
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:16px;">
      ${students.map(s => {
        const d = getStudentData(s.id);
        const lastMock = d.mockLog[0];
        const taskDone = d.tasks.filter(t => t.checked).length;
        const tytLogs = d.mockLog.filter(m => m.type === 'TYT');
        const tytAvg = tytLogs.length > 0 ? (tytLogs.reduce((sum, m) => sum + m.totalNet, 0) / tytLogs.length).toFixed(1) : '--';
        return `
          <div class="panel-card" style="cursor:pointer;" onclick="switchStudent('${s.id}')">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
              <div class="student-avatar" style="width:40px; height:40px; font-size:18px; flex-shrink:0;">${s.avatar}</div>
              <div>
                <div style="font-weight:700; font-size:15px;">${s.name}</div>
                <div style="color:var(--text-muted); font-size:11px;">${d.mockLog.length} deneme kaydı</div>
              </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:12px;">
              <div style="background:rgba(108,99,255,0.1); padding:8px; border-radius:8px;">
                <div style="color:var(--text-muted);">TYT Ort.</div>
                <div style="font-weight:700; color:var(--color-primary); font-size:16px;">${tytAvg}</div>
              </div>
              <div style="background:rgba(0,212,170,0.1); padding:8px; border-radius:8px;">
                <div style="color:var(--text-muted);">Görev</div>
                <div style="font-weight:700; color:var(--color-secondary); font-size:16px;">${taskDone}/${d.tasks.length}</div>
              </div>
            </div>
            ${lastMock ? `<div style="margin-top:10px; font-size:11px; color:var(--text-muted);">Son: ${lastMock.name} — ${lastMock.totalNet.toFixed(1)} Net</div>` : ''}
          </div>`;
      }).join('')}
    </div>
  `;
}

// ── Deneme Sınavları ───────────────────────────────────────────────────────────

function renderMockTable(data) {
  const tbody = document.getElementById('mock-table-body');
  if (!tbody) return;

  if (data.mockLog.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-row">Henüz deneme sınavı kaydedilmemiş.</td></tr>';
    return;
  }

  tbody.innerHTML = data.mockLog.map(mock => {
    const detail = mock.type === 'TYT'
      ? `T:${mock.nets.Turkce?.toFixed(1)} | S:${mock.nets.Sosyal?.toFixed(1)} | M:${mock.nets.Matematik?.toFixed(1)} | F:${mock.nets.Fen?.toFixed(1)}`
      : `Mat:${mock.nets.Matematik?.toFixed(1)} | Fiz:${mock.nets.Fizik?.toFixed(1)} | Kim:${mock.nets.Kimya?.toFixed(1)} | Biy:${mock.nets.Biyoloji?.toFixed(1)}`;

    let scoreHtml = '';
    if (mock.type === 'TYT' && mock.scores) {
      const range = getRankAndPercentileRange('TYT', (mock.scores.TYT || 0) + 51);
      scoreHtml = `TYT: <strong>${mock.scores.TYT}</strong><br><span style="font-size:10px;color:var(--text-muted);">${range.rangeStr}</span>`;
    } else if (mock.scores) {
      const rSAY = getRankAndPercentileRange('SAY', (mock.scores.SAY || 0) + 51);
      const rEA  = getRankAndPercentileRange('EA',  (mock.scores.EA  || 0) + 51);
      scoreHtml  = `SAY: <strong>${mock.scores.SAY}</strong> <span style="font-size:10px;color:var(--text-muted);">(${rSAY.rangeStr})</span><br>`;
      scoreHtml += `EA: <strong>${mock.scores.EA}</strong> <span style="font-size:10px;color:var(--text-muted);">(${rEA.rangeStr})</span>`;
    }

    return `<tr>
      <td>${formatDate(mock.date)}</td>
      <td><span class="badge badge-${mock.type.toLowerCase()}">${mock.type}</span></td>
      <td><strong>${mock.name}</strong><div style="font-size:11px;color:var(--text-muted);margin-top:3px;">${detail}</div></td>
      <td style="font-weight:700;color:var(--color-secondary);">${mock.totalNet.toFixed(2)} Net</td>
      <td>${scoreHtml}</td>
      <td class="actions-cell"><button class="btn-delete-row" onclick="deleteMock('${mock.id}')">🗑️</button></td>
    </tr>`;
  }).join('');
}

// ── Konu Takip ────────────────────────────────────────────────────────────────

let _currentSubjectType = 'TYT';
let _currentSubjectName = '';

function renderTopicTracker() {
  const data = getStudentData(currentStudent);

  // TYT/AYT tab butonları
  document.getElementById('topic-tab-tyt')?.classList.toggle('active', _currentSubjectType === 'TYT');
  document.getElementById('topic-tab-ayt')?.classList.toggle('active', _currentSubjectType === 'AYT');

  const subjects = Object.keys(YKS_TOPICS[_currentSubjectType] || {});
  if (!subjects.includes(_currentSubjectName)) _currentSubjectName = subjects[0] || '';

  // Ders listesi (sol panel)
  const subjectList = document.getElementById('subject-list');
  if (subjectList) {
    subjectList.innerHTML = subjects.map(sub => {
      const topics = YKS_TOPICS[_currentSubjectType][sub] || [];
      const done = topics.filter(t => data.topicStatus[`${_currentSubjectType}_${sub}_${t}`] === 'completed').length;
      const pct = topics.length > 0 ? Math.round((done / topics.length) * 100) : 0;
      return `
        <button class="subject-btn ${sub === _currentSubjectName ? 'active' : ''}" onclick="selectSubject('${sub}')">
          <span>${sub}</span>
          <span class="subject-progress">%${pct}</span>
        </button>`;
    }).join('');
  }

  // Konu listesi (sağ panel)
  const topicItems = document.getElementById('topic-items');
  if (topicItems) {
    const topics = YKS_TOPICS[_currentSubjectType][_currentSubjectName] || [];
    topicItems.innerHTML = topics.map(topic => {
      const key = `${_currentSubjectType}_${_currentSubjectName}_${topic}`;
      const status = data.topicStatus[key] || 'not_started';
      return `
        <div class="topic-row">
          <div class="topic-name-col">${topic}</div>
          <div>
            <select class="topic-status-select status-${status}" data-key="${key}" onchange="changeTopicStatus(this)">
              <option value="not_started" ${status==='not_started'?'selected':''}>Başlanmadı</option>
              <option value="studying"    ${status==='studying'?'selected':''}>Çalışılıyor</option>
              <option value="review"      ${status==='review'?'selected':''}>Tekrar</option>
              <option value="completed"   ${status==='completed'?'selected':''}>Tamamlandı</option>
            </select>
          </div>
        </div>`;
    }).join('');
  }
}

function selectSubject(name) {
  _currentSubjectName = name;
  renderTopicTracker();
}

function switchTopicType(type) {
  _currentSubjectType = type;
  _currentSubjectName = '';
  renderTopicTracker();
}

function changeTopicStatus(sel) {
  const data = getStudentData(currentStudent);
  data.topicStatus[sel.dataset.key] = sel.value;
  saveStudentData(currentStudent, data);
  sel.className = `topic-status-select status-${sel.value}`;
  // Sadece ders listesindeki yüzde güncellenir
  renderTopicTracker();
}

// ── Haftalık Program ──────────────────────────────────────────────────────────

function renderWeeklyPlanner(data) {
  if (!data) data = getStudentData(currentStudent);
  const isStudent = currentUserSession?.role === 'student';
  _populateSmartTaskBooks(data);

  const container = document.getElementById('planner-tasks-list');
  if (!container) return;

  if (!data.tasks || data.tasks.length === 0) {
    container.innerHTML = '<div class="empty-row">Henüz görev eklenmemiş.</div>';
    return;
  }

  const days = [...new Set(data.tasks.map(t => t.day || 'Belirtilmemiş'))].sort((a, b) => {
    const na = parseInt(a), nb = parseInt(b);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.localeCompare(b, 'tr');
  });

  container.innerHTML = days.map(day => {
    const dayTasks = data.tasks.filter(t => (t.day || 'Belirtilmemiş') === day);
    return `
      <div class="day-group">
        <h3 class="day-header">${day}</h3>
        ${dayTasks.map(task => `
          <div class="task-item">
            <div class="task-content">
              <div class="task-checkbox ${task.checked ? 'checked' : ''}" onclick="toggleTask('${task.id}')">
                ${task.checked ? '✓' : ''}
              </div>
              <div>
                <span class="task-text ${task.checked ? 'task-done' : ''}">${task.text}</span>
                ${task.questionTarget || task.durationTarget ? `
                  <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">
                    ${task.questionTarget ? `🎯 ${task.questionTarget} Soru` : ''}
                    ${task.durationTarget ? `⏱️ ${task.durationTarget} dk` : ''}
                  </div>` : ''}
              </div>
            </div>
            ${!isStudent ? `<button class="btn-delete-row" onclick="deleteTask('${task.id}')">🗑️</button>` : ''}
          </div>
        `).join('')}
      </div>`;
  }).join('');
}

function _populateSmartTaskBooks(data) {
  const sel = document.getElementById('smart-task-book');
  if (!sel) return;
  sel.innerHTML = '<option value="">(İsteğe bağlı) Kaynak seçin</option>' +
    (data.books || []).map(b => `<option value="${b.id}">${b.name}</option>`).join('');
}

// ── Kayıtlarım (Kitap Takibi) ─────────────────────────────────────────────────

function renderBooks(data) {
  if (!data) data = getStudentData(currentStudent);
  const container = document.getElementById('books-list');
  if (!container) return;

  if (!data.books || data.books.length === 0) {
    container.innerHTML = '<div class="empty-row">Henüz kaynak eklenmemiş.</div>';
    return;
  }

  container.innerHTML = data.books.map(book => {
    const pct = book.totalPages > 0 ? Math.round((book.completedPages / book.totalPages) * 100) : 0;
    return `
      <div class="panel-card" style="margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
          <div>
            <div style="font-weight:700;">${book.name}</div>
            <div style="font-size:12px; color:var(--text-muted);">${book.subject}</div>
          </div>
          <button class="btn-delete-row" onclick="deleteBook('${book.id}')">🗑️</button>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="flex:1;">
            <div style="background:rgba(255,255,255,0.08); border-radius:4px; height:8px; overflow:hidden;">
              <div style="width:${pct}%; height:100%; background:var(--color-primary); border-radius:4px;"></div>
            </div>
          </div>
          <span style="font-size:12px; color:var(--text-muted); white-space:nowrap;">%${pct}</span>
          <input type="number" class="form-input" style="width:70px; padding:4px 8px;"
            value="${book.completedPages}" min="0" max="${book.totalPages}"
            onchange="updateBookProgress('${book.id}', this.value)"
            title="Tamamlanan sayfa">
          <span style="color:var(--text-muted); font-size:13px;">/ ${book.totalPages}</span>
        </div>
      </div>`;
  }).join('');
}

// ── Yanlış Defteri ────────────────────────────────────────────────────────────

function renderWrongLog(data) {
  if (!data) data = getStudentData(currentStudent);
  const container = document.getElementById('wrong-list');
  if (!container) return;

  const filterSub = document.getElementById('wrong-filter-subject')?.value || '';
  const filterReview = document.getElementById('wrong-filter-reviewed')?.value || '';

  let items = [...(data.wrongLog || [])].reverse();
  if (filterSub)    items = items.filter(w => w.subject === filterSub);
  if (filterReview === 'pending')   items = items.filter(w => !w.reviewed);
  if (filterReview === 'reviewed')  items = items.filter(w => w.reviewed);

  // Filtre seçeneklerini güncelle
  const subjSel = document.getElementById('wrong-filter-subject');
  if (subjSel && data.wrongLog?.length) {
    const subjects = [...new Set(data.wrongLog.map(w => w.subject))].sort();
    const cur = subjSel.value;
    subjSel.innerHTML = '<option value="">Tüm Dersler</option>' +
      subjects.map(s => `<option value="${s}" ${s===cur?'selected':''}>${s}</option>`).join('');
  }

  if (items.length === 0) {
    container.innerHTML = '<div class="empty-row">Kayıt yok.</div>';
    return;
  }

  container.innerHTML = items.map(w => `
    <div class="wrong-item ${w.reviewed ? 'wrong-reviewed' : ''}">
      <div style="flex:1;">
        <div style="display:flex; gap:8px; align-items:center; margin-bottom:4px;">
          <span class="badge badge-${w.tytAyt?.toLowerCase()}">${w.tytAyt}</span>
          <strong>${w.subject}</strong>
          <span style="color:var(--text-muted); font-size:12px;">${w.topic}</span>
        </div>
        ${w.source ? `<div style="font-size:12px; color:var(--text-muted);">📖 ${w.source}</div>` : ''}
        ${w.reason ? `<div style="font-size:12px; color:var(--text-muted);">💡 ${w.reason}</div>` : ''}
        ${w.note   ? `<div style="font-size:12px; color:var(--color-primary); margin-top:4px;">📝 ${w.note}</div>` : ''}
      </div>
      <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px; flex-shrink:0;">
        <span style="font-size:11px; color:var(--text-muted);">${formatDate(w.date)}</span>
        <div style="display:flex; gap:6px;">
          <button class="btn-small ${w.reviewed ? 'btn-success' : ''}" onclick="toggleWrongReviewed('${w.id}')">
            ${w.reviewed ? '✅ Tekrar edildi' : '⬜ Tekrar et'}
          </button>
          <button class="btn-delete-row" onclick="deleteWrong('${w.id}')">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ── Geri Sayım (Sınav) ────────────────────────────────────────────────────────

function updateExamCountdown() {
  const el = document.getElementById('countdown-days');
  if (!el) return;
  const examDate = new Date(getExamDate());
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
  el.textContent = diff > 0 ? diff : '0';
}

// ── Yardımcılar ───────────────────────────────────────────────────────────────

function _setHtml(id, val) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = val;
}
