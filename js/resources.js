/**
 * resources.js — Kaynak Takibi (Sayfa Bazlı)
 * Kitap/kaynak ekleme, sayfa ilerlemesi, tamamlanma oranı
 */

function renderResources() {
  const data = getStudentData(window.activeStudent);
  const container = document.getElementById('resources-list');
  if (!container) return;

  if (!data.books || data.books.length === 0) {
    container.innerHTML = '<div class="empty-state"><span>📚</span><p>Henüz kaynak eklenmedi.</p></div>';
    _updateResourceStats(data.books || []);
    return;
  }

  // Filtre
  const filter = document.getElementById('res-filter-subject')?.value || 'all';
  const books  = filter === 'all' ? data.books : data.books.filter(b => b.subject === filter);

  container.innerHTML = books.map(b => _bookCard(b)).join('');
  _updateResourceStats(data.books);
  _populateResourceSubjectFilter(data.books);
}

let editingBookId = null;

function _bookCard(book) {
  const pct = book.totalPages > 0
    ? Math.min(100, Math.round((book.solvedPages / book.totalPages) * 100))
    : 0;

  const colorClass = pct >= 100 ? 'done' : pct >= 60 ? 'good' : pct >= 30 ? 'mid' : 'low';

  return `
    <div class="resource-card">
      <div class="resource-header">
        <div class="resource-title">
          <span class="resource-icon">${_subjectIcon(book.subject)}</span>
          <div>
            <div class="resource-name">${book.name}</div>
            <div class="resource-subject">${book.subject || '—'} • ${book.type || 'Kitap'}</div>
          </div>
        </div>
        <div class="resource-pct ${colorClass}">${pct}%</div>
      </div>

      <div class="resource-progress-bar">
        <div class="resource-progress-fill ${colorClass}" style="width:${pct}%"></div>
      </div>

      <div class="resource-footer">
        <div class="resource-pages">
          <span>${book.solvedPages || 0} / ${book.totalPages || 0} sayfa</span>
        </div>
        <div class="resource-actions">
          <button class="btn-sm" onclick="addPages('${book.id}', -10)" title="−10 sayfa">−10</button>
          <button class="btn-sm" onclick="addPages('${book.id}', -1)" title="−1 sayfa">−1</button>
          <button class="btn-sm btn-primary" onclick="addPages('${book.id}', 1)" title="+1 sayfa">+1</button>
          <button class="btn-sm btn-primary" onclick="addPages('${book.id}', 10)" title="+10 sayfa">+10</button>
          <button class="btn-sm btn-accent" onclick="editBook('${book.id}')" title="Kaynağı Düzenle" style="margin-left:4px;">✏️</button>
          <button class="btn-sm btn-danger coach-only" onclick="deleteBook('${book.id}')" title="Sil">🗑️</button>
        </div>
      </div>
    </div>`;
}

function _subjectIcon(subject) {
  const icons = {
    'Matematik': '📐', 'Türkçe': '📖', 'Fizik': '⚡', 'Kimya': '🧪',
    'Biyoloji': '🧬', 'Tarih': '🏛️', 'Coğrafya': '🌍', 'Felsefe': '💭',
    'Edebiyat': '✍️', 'Geometri': '📏', 'Din': '☪️', 'İngilizce': '🌐'
  };
  return icons[subject] || '📚';
}

function _updateResourceStats(books) {
  const total   = books.length;
  const done    = books.filter(b => (b.totalPages > 0 && b.solvedPages >= b.totalPages)).length;
  const pages   = books.reduce((s, b) => s + (b.solvedPages || 0), 0);
  const totalPg = books.reduce((s, b) => s + (b.totalPages || 0), 0);

  _el('res-stat-total',  e => e.textContent = total);
  _el('res-stat-done',   e => e.textContent = done);
  _el('res-stat-pages',  e => e.textContent = formatNumber(pages));
  _el('res-stat-totalp', e => e.textContent = formatNumber(totalPg));
}

function _populateResourceSubjectFilter(books) {
  const sel = document.getElementById('res-filter-subject');
  if (!sel) return;
  const current = sel.value;
  const subjects = [...new Set(books.map(b => b.subject).filter(Boolean))];
  sel.innerHTML = '<option value="all">Tümü</option>' +
    subjects.map(s => `<option value="${s}" ${s===current?'selected':''}>${s}</option>`).join('');
}

function openAddBookModal() {
  editingBookId = null;
  const title = document.getElementById('book-modal-title');
  if (title) title.textContent = '📚 Kaynak Ekle';
  const btn = document.getElementById('book-submit-btn');
  if (btn) btn.textContent = 'Ekle';

  const addAllGroup = document.getElementById('book-add-all-group');
  if (addAllGroup) addAllGroup.style.display = 'flex';

  ['book-name','book-total-pages','book-solved-pages'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  const cb = document.getElementById('book-add-all-students');
  if (cb) cb.checked = false;

  updateBookSubjects();
  openModal('add-book-modal');
}

function editBook(bookId) {
  const data = getStudentData(window.activeStudent);
  const book = (data.books || []).find(b => b.id === bookId);
  if (!book) return;

  editingBookId = bookId;
  const title = document.getElementById('book-modal-title');
  if (title) title.textContent = '📚 Kaynağı Düzenle';
  const btn = document.getElementById('book-submit-btn');
  if (btn) btn.textContent = 'Güncelle';

  const addAllGroup = document.getElementById('book-add-all-group');
  if (addAllGroup) addAllGroup.style.display = 'none';

  const nameEl = document.getElementById('book-name');
  if (nameEl) nameEl.value = book.name || '';

  const typeEl = document.getElementById('book-type');
  if (typeEl) typeEl.value = book.type || 'Kitap';

  const totalEl = document.getElementById('book-total-pages');
  if (totalEl) totalEl.value = book.totalPages || '';

  const solvedEl = document.getElementById('book-solved-pages');
  if (solvedEl) solvedEl.value = book.solvedPages ?? 0;

  updateBookSubjects();
  const subjEl = document.getElementById('book-subject');
  if (subjEl && book.subject) {
    for (let i = 0; i < subjEl.options.length; i++) {
      if (subjEl.options[i].value === book.subject || subjEl.options[i].text === book.subject) {
        subjEl.selectedIndex = i;
        break;
      }
    }
  }

  openModal('add-book-modal');
}

function handleAddBook(e) {
  if (e) e.preventDefault();

  const name        = document.getElementById('book-name')?.value.trim() || '';
  const examType    = document.getElementById('book-exam-type')?.value || 'tyt';
  const subject     = document.getElementById('book-subject')?.value.trim() || '';
  const totalPages  = parseInt(document.getElementById('book-total-pages')?.value) || 0;
  const solvedPages = parseInt(document.getElementById('book-solved-pages')?.value) || 0;
  const type        = document.getElementById('book-type')?.value || 'Kitap';
  const addAll      = document.getElementById('book-add-all-students')?.checked;

  if (!name) { showToast('Kaynak adı boş olamaz.', 'warning'); return; }
  if (totalPages <= 0) { showToast('Geçerli bir sayfa sayısı girin.', 'warning'); return; }

  const data = getStudentData(window.activeStudent);
  if (!Array.isArray(data.books)) data.books = [];

  if (editingBookId) {
    const idx = data.books.findIndex(b => b.id === editingBookId);
    if (idx !== -1) {
      data.books[idx] = {
        ...data.books[idx],
        name,
        subject,
        type,
        totalPages,
        solvedPages: Math.min(totalPages, Math.max(0, solvedPages))
      };
      saveStudentData(window.activeStudent, data);
      showToast(`"${name}" güncellendi!`, 'success');
    }
    editingBookId = null;
  } else {
    const targetStudents = addAll 
      ? Object.keys(getUsers()).filter(k => getUsers()[k].role === 'student') 
      : [window.activeStudent];

    targetStudents.forEach(studentId => {
      const sData = getStudentData(studentId);
      if (!Array.isArray(sData.books)) sData.books = [];
      sData.books.push({
        id: generateId(),
        name, subject, type,
        totalPages,
        solvedPages: Math.min(totalPages, Math.max(0, solvedPages)),
        addedDate: getTodayStr()
      });
      saveStudentData(studentId, sData);
    });
    showToast(`"${name}" eklendi!`, 'success');
  }

  closeModal('add-book-modal');

  // Formu sıfırla
  ['book-name','book-total-pages','book-solved-pages'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  
  const cb = document.getElementById('book-add-all-students');
  if (cb) cb.checked = false;

  renderResources();
}

function addPages(bookId, delta) {
  const data = getStudentData(window.activeStudent);
  const book = data.books.find(b => b.id === bookId);
  if (!book) return;

  book.solvedPages = Math.max(0, Math.min(book.totalPages, (book.solvedPages || 0) + delta));
  saveStudentData(window.activeStudent, data);
  renderResources();

  if (book.solvedPages >= book.totalPages) {
    showToast(`🎉 "${book.name}" tamamlandı!`, 'success');
  }
}

function setPages(bookId) {
  editBook(bookId);
}

function deleteBook(bookId) {
  const data = getStudentData(window.activeStudent);
  const book = data.books.find(b => b.id === bookId);
  if (!book) return;
  if (!confirm(`"${book.name}" silinecek. Emin misin?`)) return;

  data.books = data.books.filter(b => b.id !== bookId);
  saveStudentData(window.activeStudent, data);
  renderResources();
  showToast('Kaynak silindi.', 'info');
}

function _el(id, fn) { const el = document.getElementById(id); if (el) fn(el); }

function updateBookSubjects() {
  const examType = document.getElementById('book-exam-type')?.value || 'tyt';
  const select = document.getElementById('book-subject');
  if (!select) return;

  if (window.TOPICS) {
    const topicsObj = window.TOPICS[examType.toLowerCase()] || {};
    const subjects = Object.keys(topicsObj);
    if (subjects.length > 0) {
      select.innerHTML = subjects.map(s => `<option value="${s}">${s}</option>`).join('');
      return;
    }
  }

  if (typeof YKS_TOPICS !== 'undefined') {
    const groupKey = examType.toUpperCase() === 'AYT' ? 'AYT' : 'TYT';
    const subjs = Object.keys(YKS_TOPICS[groupKey] || {});
    select.innerHTML = subjs.map(s => `<option value="${s}">${s}</option>`).join('');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(updateBookSubjects, 500);
});

window.renderResources = renderResources;
window.openAddBookModal = openAddBookModal;
window.editBook        = editBook;
window.addPages        = addPages;
window.setPages        = setPages;
window.deleteBook      = deleteBook;
window.handleAddBook   = handleAddBook;
window.updateBookSubjects = updateBookSubjects;
