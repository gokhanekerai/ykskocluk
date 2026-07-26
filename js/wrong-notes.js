/**
 * wrong-notes.js — Yanlış Defteri
 */

function renderWrongNotes() {
  const data = getStudentData(window.activeStudent);
  _renderWrongStats(data.wrongLog || []);
  _renderWrongList(data.wrongLog || []);
}

function _renderWrongStats(wrongLog) {
  const total    = wrongLog.length;
  const pending  = wrongLog.filter(e => !e.reviewed).length;
  const reviewed = total - pending;

  _el('wrong-stat-total',    e => e.textContent = total);
  _el('wrong-stat-pending',  e => e.textContent = pending);
  _el('wrong-stat-reviewed', e => e.textContent = reviewed);

  // En çok yanlış yapılan ders
  const bySubject = {};
  wrongLog.forEach(e => { bySubject[e.subject] = (bySubject[e.subject]||0) + 1; });
  const topSubject = Object.entries(bySubject).sort((a,b) => b[1]-a[1])[0];
  _el('wrong-top-subject', e => e.textContent = topSubject ? `${topSubject[0]} (${topSubject[1]})` : '—');
}

function _renderWrongList(wrongLog) {
  const container = document.getElementById('wrong-list');
  if (!container) return;

  const filter  = document.getElementById('wrong-filter')?.value || 'all';
  const subject = document.getElementById('wrong-subject-filter')?.value || 'all';

  let list = [...wrongLog].sort((a,b) => b.date.localeCompare(a.date));
  if (filter === 'pending')  list = list.filter(e => !e.reviewed);
  if (filter === 'reviewed') list = list.filter(e => e.reviewed);
  if (subject !== 'all')     list = list.filter(e => e.subject === subject);

  if (!list.length) {
    container.innerHTML = '<div class="empty-state"><span>✅</span><p>Yanlış kaydı bulunamadı.</p></div>';
    return;
  }

  container.innerHTML = list.map(e => `
    <div class="wrong-card ${e.reviewed ? 'reviewed' : ''}">
      <div class="wrong-header">
        <div class="wrong-meta">
          <span class="tag tag-subject">${e.subject}</span>
          <span class="tag tag-tytayt">${e.tytAyt || '—'}</span>
          <span class="wrong-date">${formatDate(e.date)}</span>
        </div>
        <div class="wrong-actions">
          <button class="btn-sm ${e.reviewed ? '' : 'btn-primary'}" onclick="toggleWrongReview('${e.id}')">
            ${e.reviewed ? '✅ Tekrar Edildi' : '🔁 Tekrar Et'}
          </button>
          <button class="btn-sm btn-danger" onclick="deleteWrongEntry('${e.id}')">🗑️</button>
        </div>
      </div>
      <div class="wrong-body">
        <div class="wrong-topic"><strong>Konu:</strong> ${e.topic || '—'}</div>
        ${e.source ? `<div class="wrong-source"><strong>Kaynak:</strong> ${e.source}</div>` : ''}
        ${e.reason ? `<div class="wrong-reason"><strong>Hata Sebebi:</strong> ${e.reason}</div>` : ''}
        ${e.note   ? `<div class="wrong-note">📝 ${e.note}</div>` : ''}
      </div>
    </div>`).join('');

  // Ders filtresi güncelle
  const subjects = [...new Set(wrongLog.map(e => e.subject).filter(Boolean))];
  const subSel = document.getElementById('wrong-subject-filter');
  if (subSel) {
    const curr = subSel.value;
    subSel.innerHTML = '<option value="all">Tüm Dersler</option>' +
      subjects.map(s => `<option value="${s}" ${s===curr?'selected':''}>${s}</option>`).join('');
  }
}

function handleAddWrong(e) {
  if (e) e.preventDefault();

  const entry = {
    id:       generateId(),
    date:     document.getElementById('wrong-date')?.value || getTodayStr(),
    tytAyt:   document.getElementById('wrong-tytayt')?.value || 'TYT',
    subject:  document.getElementById('wrong-subject-in')?.value.trim() || '',
    topic:    document.getElementById('wrong-topic-in')?.value.trim() || '',
    source:   document.getElementById('wrong-source')?.value.trim() || '',
    reason:   document.getElementById('wrong-reason')?.value.trim() || '',
    note:     document.getElementById('wrong-note-in')?.value.trim() || '',
    reviewed: false
  };

  if (!entry.subject || !entry.topic) {
    showToast('Ders ve konu boş olamaz.', 'warning'); return;
  }

  const data = getStudentData(window.activeStudent);
  data.wrongLog.push(entry);
  saveStudentData(window.activeStudent, data);
  closeModal('add-wrong-modal');
  _clearWrongForm();
  renderWrongNotes();
  showToast('Yanlış kaydedildi!', 'success');
}

function toggleWrongReview(id) {
  const data  = getStudentData(window.activeStudent);
  const entry = data.wrongLog.find(e => e.id === id);
  if (!entry) return;
  entry.reviewed = !entry.reviewed;
  saveStudentData(window.activeStudent, data);
  renderWrongNotes();
}

function deleteWrongEntry(id) {
  const data  = getStudentData(window.activeStudent);
  data.wrongLog = data.wrongLog.filter(e => e.id !== id);
  saveStudentData(window.activeStudent, data);
  renderWrongNotes();
  showToast('Kayıt silindi.', 'info');
}

function markAllReviewed() {
  const data = getStudentData(window.activeStudent);
  data.wrongLog.forEach(e => { e.reviewed = true; });
  saveStudentData(window.activeStudent, data);
  renderWrongNotes();
  showToast('Tüm yanlışlar tekrar edildi olarak işaretlendi!', 'success');
}

function _clearWrongForm() {
  ['wrong-date','wrong-subject-in','wrong-topic-in','wrong-source','wrong-reason','wrong-note-in'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function _el(id, fn) { const el = document.getElementById(id); if (el) fn(el); }

window.renderWrongNotes   = renderWrongNotes;
window.handleAddWrong     = handleAddWrong;
window.toggleWrongReview  = toggleWrongReview;
window.deleteWrongEntry   = deleteWrongEntry;
window.markAllReviewed    = markAllReviewed;
