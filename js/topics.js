/**
 * topics.js — Konu Takibi
 * TYT ve AYT konuları — durum takibi
 */

const TOPIC_STATUS_LABELS = {
  'not_started': { label: 'Başlanmadı', color: '#6b7280' },
  'studying':    { label: 'Çalışılıyor', color: '#f59e0b' },
  'review':      { label: 'Tekrar',      color: '#3b82f6' },
  'completed':   { label: 'Tamamlandı',  color: '#10b981' }
};

let _currentTopicType = 'tyt';
let _topicSearchQuery = '';
let _currentSubject = 'all';
let _currentField = 'all';

function renderTopics() {
  _renderTopicStats();
  _updateSubjectDropdown();
  _renderTopicList();
}

function _getFilteredSubjects(typedTopics) {
  const subjects = Object.keys(typedTopics);
  if (_currentTopicType === 'tyt' || _currentField === 'all') return subjects;
  
  if (_currentField === 'SAY') {
    return subjects.filter(s => ['Matematik', 'Geometri', 'Fizik', 'Kimya', 'Biyoloji'].includes(s));
  }
  if (_currentField === 'EA') {
    return subjects.filter(s => ['Matematik', 'Geometri', 'Edebiyat', 'Tarih (AYT)', 'Coğrafya (AYT)'].includes(s));
  }
  if (_currentField === 'SOZ') {
    return subjects.filter(s => ['Edebiyat', 'Tarih (AYT)', 'Coğrafya (AYT)'].includes(s));
  }
  return subjects;
}

function _updateSubjectDropdown() {
  const select = document.getElementById('topic-subject-filter');
  if (!select || !window.TOPICS) return;
  
  const currentVal = select.value || 'all';
  const typedTopics = window.TOPICS[_currentTopicType] || {};
  let html = '<option value="all">Tüm Dersler</option>';
  
  const allowedSubjects = _getFilteredSubjects(typedTopics);
  
  allowedSubjects.forEach(subject => {
    html += `<option value="${subject}">${subject}</option>`;
  });
  
  select.innerHTML = html;
  
  if (currentVal === 'all' || allowedSubjects.includes(currentVal)) {
    select.value = currentVal;
    _currentSubject = currentVal;
  } else {
    select.value = 'all';
    _currentSubject = 'all';
  }
}

function _renderTopicStats() {
  const data = getStudentData(window.activeStudent);
  const status = data.topicStatus || {};
  const tytTopics = (window.TOPICS && window.TOPICS.tyt) || (window.YKS_TOPICS && window.YKS_TOPICS.TYT) || {};
  const aytTopics = (window.TOPICS && window.TOPICS.ayt) || (window.YKS_TOPICS && window.YKS_TOPICS.AYT) || {};

  // Sayısal TYT Dersleri: Türkçe (18), Matematik (26), Geometri (13), Fizik (11), Kimya (9), Biyoloji (8) = 85
  const tytSaySubjects = ['Türkçe', 'Matematik', 'Geometri', 'Fizik', 'Kimya', 'Biyoloji'];
  let tytTotal = 0;
  let tytDone = 0;
  let tytStudy = 0;
  let tytReview = 0;

  tytSaySubjects.forEach(sub => {
    const list = tytTopics[sub] || [];
    list.forEach(t => {
      tytTotal++;
      const v = status[`tyt_${sub}_${t}`] || status[`TYT_${sub}_${t}`];
      if (v === 'completed') tytDone++;
      else if (v === 'studying') tytStudy++;
      else if (v === 'review') tytReview++;
    });
  });

  // Sayısal AYT Dersleri: Matematik (18), Geometri (4), Fizik (24), Kimya (20), Biyoloji (18) = 84
  const aytSaySubjects = ['Matematik', 'Geometri', 'Fizik', 'Kimya', 'Biyoloji'];
  let aytTotal = 0;
  let aytDone = 0;
  let aytStudy = 0;
  let aytReview = 0;

  aytSaySubjects.forEach(sub => {
    const list = aytTopics[sub] || [];
    list.forEach(t => {
      aytTotal++;
      const v = status[`ayt_${sub}_${t}`] || status[`AYT_${sub}_${t}`];
      if (v === 'completed') aytDone++;
      else if (v === 'studying') aytStudy++;
      else if (v === 'review') aytReview++;
    });
  });

  if (tytTotal === 0) tytTotal = 85;
  if (aytTotal === 0) aytTotal = 84;

  const totalAll = tytTotal + aytTotal; // 169
  const doneAll = tytDone + aytDone;
  const studyAll = tytStudy + aytStudy;
  const reviewAll = tytReview + aytReview;

  // 4 Adet Stat Kartı
  _el('topic-stat-done', e => e.textContent = doneAll);
  _el('topic-stat-study', e => e.textContent = studyAll);
  _el('topic-stat-review', e => e.textContent = reviewAll);
  _el('topic-stat-total', e => e.textContent = totalAll);

  // 📘 TYT Yatay İlerleme Barı
  const tytPct = tytTotal > 0 ? Math.round((tytDone / tytTotal) * 100) : 0;
  _el('topic-tyt-bar', e => e.style.width = `${tytPct}%`);
  _el('topic-tyt-pct', e => e.textContent = `${tytDone}/${tytTotal} Konu (%${tytPct})`);

  // 📙 AYT Yatay İlerleme Barı
  const aytPct = aytTotal > 0 ? Math.round((aytDone / aytTotal) * 100) : 0;
  _el('topic-ayt-bar', e => e.style.width = `${aytPct}%`);
  _el('topic-ayt-pct', e => e.textContent = `${aytDone}/${aytTotal} Konu (%${aytPct})`);
}


function _renderTopicList() {
  const container = document.getElementById('topic-list');
  if (!container || !window.TOPICS) return;

  const data   = getStudentData(window.activeStudent);
  const status = data.topicStatus || {};

  const typedTopics = window.TOPICS[_currentTopicType] || {};
  const query = _topicSearchQuery.toLowerCase();

  let html = '';
  
  const allowedSubjects = _getFilteredSubjects(typedTopics);

  Object.entries(typedTopics).forEach(([subject, topics]) => {
    if (!allowedSubjects.includes(subject)) return;
    if (_currentSubject !== 'all' && subject !== _currentSubject) return;

    const filtered = query
      ? topics.filter(t => t.toLowerCase().includes(query) || subject.toLowerCase().includes(query))
      : topics;

    if (!filtered.length) return;

    const subjectDone = filtered.filter(t => status[`${_currentTopicType}_${subject}_${t}`] === 'completed').length;

    html += `
      <div class="topic-subject-group">
        <div class="topic-subject-header" style="display:flex; align-items:center; gap:16px;">
          <span class="topic-subject-name" style="min-width:140px; font-weight:600;">${subject}</span>
          <div class="progress-bar" style="flex:1; height:8px; margin:0;">
            <div class="progress-fill" style="width:${Math.round(subjectDone/filtered.length*100)}%"></div>
          </div>
          <span class="topic-subject-progress" style="min-width:40px; text-align:right; color:var(--text-muted); font-size:13px;">${subjectDone}/${filtered.length}</span>
        </div>
        <div class="topic-items">
          ${filtered.map(topic => {
            const key = `${_currentTopicType}_${subject}_${topic}`;
            const st  = status[key] || 'not_started';
            const info = TOPIC_STATUS_LABELS[st] || TOPIC_STATUS_LABELS['not_started'];
            return `
              <div class="topic-item" style="border-left-color: ${info.color}">
                <span class="topic-name">${topic}</span>
                <select class="topic-select" data-key="${key.replace(/"/g, '&quot;')}" onchange="changeTopicStatus(this.dataset.key, this.value)"
                        style="color: ${info.color}; border-color: ${info.color}20">
                  ${Object.entries(TOPIC_STATUS_LABELS).map(([v,l]) =>
                    `<option value="${v}" ${v===st?'selected':''}>${l.label}</option>`
                  ).join('')}
                </select>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  });

  container.innerHTML = html || '<div class="empty-state"><span>🔍</span><p>Konu bulunamadı.</p></div>';
}

function changeTopicStatus(key, value) {
  const data = getStudentData(window.activeStudent);
  if (!data.topicStatus) data.topicStatus = {};
  data.topicStatus[key] = value;
  saveStudentData(window.activeStudent, data);
  _renderTopicStats();
}

function switchTopicType(type) {
  _currentTopicType = type;
  _currentSubject = 'all'; // reset subject filter on type switch
  document.querySelectorAll('.topic-type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
  _updateSubjectDropdown();
  _renderTopicList();
}

function filterTopicField(field) {
  _currentField = field;
  _currentSubject = 'all';
  _updateSubjectDropdown();
  _renderTopicList();
}

function filterTopicSubject(subject) {
  _currentSubject = subject;
  _renderTopicList();
}

function searchTopics(query) {
  _topicSearchQuery = query;
  _renderTopicList();
}

// Tümünü işaretle
function markAllTopics(status) {
  if (!confirm(`Tüm ${_currentTopicType.toUpperCase()} konuları "${TOPIC_STATUS_LABELS[status].label}" olarak işaretlensin mi?`)) return;

  const data = getStudentData(window.activeStudent);
  if (!data.topicStatus) data.topicStatus = {};

  const typedTopics = window.TOPICS[_currentTopicType] || {};
  Object.entries(typedTopics).forEach(([subject, topics]) => {
    topics.forEach(topic => {
      data.topicStatus[`${_currentTopicType}_${subject}_${topic}`] = status;
    });
  });

  saveStudentData(window.activeStudent, data);
  renderTopics();
  showToast('Konular güncellendi!', 'success');
}

function clearAllTopicsData() {
  if (!confirm("Tüm konu takip verileri kalıcı olarak silinecek. Emin misiniz?")) return;
  const data = getStudentData(window.activeStudent);
  data.topicStatus = {};
  saveStudentData(window.activeStudent, data);
  renderTopics();
  showToast('Tüm konu verileri silindi.', 'success');
}

function _el(id, fn) { const el = document.getElementById(id); if (el) fn(el); }

window.renderTopics       = renderTopics;
window.changeTopicStatus  = changeTopicStatus;
window.switchTopicType    = switchTopicType;
window.searchTopics       = searchTopics;
window.markAllTopics      = markAllTopics;
window.filterTopicField   = filterTopicField;
window.filterTopicSubject = filterTopicSubject;
window.clearAllTopicsData = clearAllTopicsData;
