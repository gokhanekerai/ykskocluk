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
          <button class="btn-sm" onclick="setPages('${book.id}')" title="Manuel gir">✏️</button>
          <button class="btn-sm btn-danger" onclick="deleteBook('${book.id}')" title="Sil">🗑️</button>
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

function handleAddBook(e) {
  if (e) e.preventDefault();

  const name       = document.getElementById('book-name')?.value.trim() || '';
  const subject    = document.getElementById('book-subject')?.value.trim() || '';
  const totalPages = parseInt(document.getElementById('book-total-pages')?.value) || 0;
  const type       = document.getElementById('book-type')?.value || 'Kitap';

  if (!name) { showToast('Kaynak adı boş olamaz.', 'warning'); return; }
  if (totalPages <= 0) { showToast('Geçerli bir sayfa sayısı girin.', 'warning'); return; }

  const data = getStudentData(window.activeStudent);
  data.books.push({
    id: generateId(),
    name, subject, type,
    totalPages,
    solvedPages: 0,
    addedDate: getTodayStr()
  });

  saveStudentData(window.activeStudent, data);
  closeModal('add-book-modal');

  // Formu sıfırla
  ['book-name','book-subject','book-total-pages'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  renderResources();
  showToast(`"${name}" eklendi!`, 'success');
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
  const data = getStudentData(window.activeStudent);
  const book = data.books.find(b => b.id === bookId);
  if (!book) return;

  const val = prompt(`"${book.name}" — Çözülen sayfa sayısı (Max: ${book.totalPages}):`, book.solvedPages || 0);
  if (val === null) return;
  const n = parseInt(val);
  if (isNaN(n) || n < 0) { showToast('Geçersiz değer.', 'warning'); return; }

  book.solvedPages = Math.min(book.totalPages, n);
  saveStudentData(window.activeStudent, data);
  renderResources();
  showToast('İlerleme güncellendi!', 'success');
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

window.renderResources = renderResources;
window.handleAddBook   = handleAddBook;
window.addPages        = addPages;
window.setPages        = setPages;
window.deleteBook      = deleteBook;
