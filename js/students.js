/**
 * students.js — Öğrenci Yönetimi ve Seçici
 */

function renderStudentSelector() {
  const container = document.querySelector('#student-selector .student-btns');
  if (!container) return;

  const users = getUsers();
  let html = '';

  Object.entries(users).forEach(([key, u]) => {
    if (u.role !== 'student') return;
    const active = key === window.activeStudent;
    html += `
      <button class="student-tab-btn ${active ? 'active' : ''}"
              onclick="switchStudent('${key}')"
              title="${u.name}">
        <span class="s-avatar">${u.avatar}</span>
        <span>${u.name}</span>
      </button>`;
  });

  container.innerHTML = html;
}

// Öğrenci Yönetimi Modalı
function openStudentMgmt() {
  if (!isCoach()) return;
  renderStudentMgmtList();
  openModal('student-mgmt-modal');
}

function renderStudentMgmtList() {
  const container = document.getElementById('student-mgmt-list');
  if (!container) return;

  const users = getUsers();
  let html = '';

  Object.entries(users).forEach(([key, u]) => {
    if (u.role !== 'student') return;
    html += `
      <div class="mgmt-student-row">
        <div class="mgmt-student-info">
          <span class="s-avatar">${u.avatar}</span>
          <div>
            <div class="mgmt-name">${u.name} <span class="mgmt-branch">${u.branch || 'YKS'}</span></div>
            <div class="mgmt-creds">
              <span>Kullanıcı: <code>${u.username}</code></span>
              <span>Şifre: <strong>${u.password}</strong></span>
            </div>
          </div>
        </div>
        <div class="mgmt-actions">
          <button class="btn-sm" onclick="changePassword('${key}')">🔑 Şifre</button>
          <button class="btn-sm btn-danger" onclick="deleteStudent('${key}')">🗑️ Sil</button>
        </div>
      </div>`;
  });

  if (!html) html = '<p class="empty-msg">Henüz öğrenci yok.</p>';
  container.innerHTML = html;
}

function handleAddStudent(e) {
  if (e) e.preventDefault();

  const name     = document.getElementById('new-student-name')?.value.trim() || '';
  const username = document.getElementById('new-student-username')?.value.trim().toLowerCase() || '';
  const password = document.getElementById('new-student-password')?.value.trim() || '';
  const branch   = document.getElementById('new-student-branch')?.value || 'Sayısal';

  if (!name || !username || !password) {
    showToast('Tüm alanları doldurun.', 'warning'); return;
  }

  const users = getUsers();
  if (Object.keys(users).some(k => k.toLowerCase() === username)) {
    showToast('Bu kullanıcı adı zaten kullanılıyor.', 'warning'); return;
  }

  const id = username.replace(/[^a-z0-9]/gi, '_');
  users[id] = {
    id, username, name, branch,
    role: 'student', roleTitle: 'Öğrenci',
    password, avatar: name.charAt(0).toUpperCase()
  };
  saveUsers(users);
  getStudentData(id); // ilkle

  // Formu temizle
  ['new-student-name','new-student-username','new-student-password'].forEach(fid => {
    const el = document.getElementById(fid);
    if (el) el.value = '';
  });

  renderStudentMgmtList();
  renderStudentSelector();
  showToast(`${name} eklendi!`, 'success');
}

function changePassword(studentKey) {
  const users = getUsers();
  const s = users[studentKey];
  if (!s) return;

  const newPwd = prompt(`"${s.name}" için yeni şifre:`, s.password);
  if (newPwd === null) return;
  if (newPwd.trim().length < 3) { showToast('Şifre en az 3 karakter olmalı.', 'warning'); return; }

  users[studentKey].password = newPwd.trim();
  saveUsers(users);
  renderStudentMgmtList();
  showToast('Şifre güncellendi!', 'success');
}

function deleteStudent(studentKey) {
  const users = getUsers();
  const s = users[studentKey];
  if (!s) return;

  if (!confirm(`"${s.name}" ve tüm verileri silinecek. Emin misin?`)) return;

  delete users[studentKey];
  saveUsers(users);
  localStorage.removeItem(`yks_coach_${studentKey}`);

  // Başka bir öğrenciye geç
  const remaining = Object.keys(users).filter(k => users[k].role === 'student');
  if (remaining.length > 0) switchStudent(remaining[0], true);

  renderStudentMgmtList();
  renderStudentSelector();
  showToast('Öğrenci silindi.', 'info');
}

// Kişisel Hedef
function savePersonalGoal(e) {
  if (e) e.preventDefault();
  const data = getStudentData(window.activeStudent);
  data.personalGoal = {
    university: document.getElementById('goal-university')?.value.trim() || '',
    profession: document.getElementById('goal-profession')?.value.trim() || '',
    ranking:    document.getElementById('goal-ranking')?.value.trim() || ''
  };
  saveStudentData(window.activeStudent, data);
  closeModal('personal-goal-modal');
  showToast('Hedef kaydedildi!', 'success');
  renderDashboard();
}

function openPersonalGoalModal() {
  const data = getStudentData(window.activeStudent);
  const g = data.personalGoal || {};
  const el = id => document.getElementById(id);
  if (el('goal-university')) el('goal-university').value = g.university || '';
  if (el('goal-profession')) el('goal-profession').value = g.profession || '';
  if (el('goal-ranking'))    el('goal-ranking').value    = g.ranking    || '';
  openModal('personal-goal-modal');
}

window.renderStudentSelector  = renderStudentSelector;
window.openStudentMgmt        = openStudentMgmt;
window.renderStudentMgmtList  = renderStudentMgmtList;
window.handleAddStudent       = handleAddStudent;
window.changePassword         = changePassword;
window.deleteStudent          = deleteStudent;
window.savePersonalGoal       = savePersonalGoal;
window.openPersonalGoalModal  = openPersonalGoalModal;
