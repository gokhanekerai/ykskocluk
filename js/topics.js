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

function renderTopics() {
  _renderTopicStats();
  _renderTopicList();
}

function _renderTopicStats() {
  const data    = getStudentData(window.activeStudent);
  const status  = data.topicStatus || {};
  const vals    = Object.values(status);

  const counts  = {
    not_started: vals.filter(v => v === 'not_started').length,
    studying:    vals.filter(v => v === 'studying').length,
    review:      vals.filter(v => v === 'review').length,
    completed:   vals.filter(v => v === 'completed').length
  };
  const total = vals.length;

  _el('topic-stat-done', e => e.textContent = counts.completed);
  _el('topic-stat-study', e => e.textContent = counts.studying);
  _el('topic-stat-review', e => e.textContent = counts.review);
  _el('topic-stat-total', e => e.textContent = total);

  const pct = total > 0 ? Math.round(counts.completed/total*100) : 0;
  _el('topic-overall-bar', e => e.style.width = pct+'%');
  _el('topic-overall-pct', e => e.textContent = pct+'%');
}

function _renderTopicList() {
  const container = document.getElementById('topic-list');
  if (!container || !window.TOPICS) return;

  const data   = getStudentData(window.activeStudent);
  const status = data.topicStatus || {};

  const typedTopics = window.TOPICS[_currentTopicType] || {};
  const query = _topicSearchQuery.toLowerCase();

  let html = '';

  Object.entries(typedTopics).forEach(([subject, topics]) => {
    const filtered = query
      ? topics.filter(t => t.toLowerCase().includes(query) || subject.toLowerCase().includes(query))
      : topics;

    if (!filtered.length) return;

    const subjectDone = filtered.filter(t => status[`${_currentTopicType}_${subject}_${t}`] === 'completed').length;

    html += `
      <div class="topic-subject-group">
        <div class="topic-subject-header">
          <span class="topic-subject-name">${subject}</span>
          <span class="topic-subject-progress">${subjectDone}/${filtered.length}</span>
        </div>
        <div class="topic-items">
          ${filtered.map(topic => {
            const key = `${_currentTopicType}_${subject}_${topic}`;
            const st  = status[key] || 'not_started';
            const info = TOPIC_STATUS_LABELS[st];
            return `
              <div class="topic-item" style="border-left-color: ${info.color}">
                <span class="topic-name">${topic}</span>
                <select class="topic-select" onchange="changeTopicStatus('${key}', this.value)"
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
  document.querySelectorAll('.topic-type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
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

function _el(id, fn) { const el = document.getElementById(id); if (el) fn(el); }

window.renderTopics       = renderTopics;
window.changeTopicStatus  = changeTopicStatus;
window.switchTopicType    = switchTopicType;
window.searchTopics       = searchTopics;
window.markAllTopics      = markAllTopics;
