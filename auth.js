/**
 * auth.js — YKS Koçum Kimlik Doğrulama Katmanı
 * Giriş, oturum ve kullanıcı yönetimi
 */

let currentUserSession = null; // { id, username, name, role, roleTitle, avatar, password }

// ── Başlatma ──────────────────────────────────────────────────────────────────

function initAuth() {
  const savedKey = localStorage.getItem('yks_coach_session');
  const users = getUsers();

  if (savedKey && users[savedKey]) {
    _applySession(users[savedKey]);
    document.getElementById('login-screen').classList.add('hidden');
  } else {
    document.getElementById('login-screen').classList.remove('hidden');
  }
}

// ── Giriş ─────────────────────────────────────────────────────────────────────

function handleLoginSubmit(e) {
  if (e) e.preventDefault();
  const username = (document.getElementById('login-username').value || '').trim().toLowerCase();
  const password = (document.getElementById('login-password').value || '').trim();

  if (!username) { showLoginError('Kullanıcı adı boş bırakılamaz.'); return; }

  const users = getUsers();
  const key = Object.keys(users).find(k =>
    k.toLowerCase() === username ||
    (users[k].username && users[k].username.toLowerCase() === username)
  );

  if (!key) { showLoginError('Kullanıcı adı bulunamadı.'); return; }
  if (users[key].password !== password) { showLoginError('Şifre hatalı.'); return; }

  localStorage.setItem('yks_coach_session', key);
  document.getElementById('login-screen').classList.add('hidden');
  hideLoginError();
  _applySession(users[key]);
  showToast(`Hoş geldiniz, ${users[key].name}!`, 'success');
}

function logout() {
  localStorage.removeItem('yks_coach_session');
  currentUserSession = null;
  location.reload();
}

// ── Oturum Uygulama ───────────────────────────────────────────────────────────

function _applySession(user) {
  currentUserSession = user;

  // Sidebar kullanıcı bilgileri
  _setText('sidebar-user-avatar', user.avatar);
  _setText('sidebar-user-name', user.name);
  _setText('sidebar-user-role', user.roleTitle);

  // Koça özel öğrenci seçici
  const selector = document.getElementById('sidebar-student-selector');
  if (selector) selector.style.display = user.role === 'coach' ? 'block' : 'none';

  // Koça özel menü öğeleri
  document.querySelectorAll('.coach-only').forEach(el => {
    el.style.display = user.role === 'coach' ? '' : 'none';
  });

  // Öğrenci görünümünde görev ekleme formu gizli
  const addTaskForm = document.getElementById('add-task-form');
  if (addTaskForm) addTaskForm.style.display = user.role === 'coach' ? 'flex' : 'none';

  // Uygulamayı başlat
  if (typeof onSessionReady === 'function') onSessionReady(user);
}

// ── Şifre Değiştirme ──────────────────────────────────────────────────────────

function openPasswordModal() {
  const modal = document.getElementById('password-modal');
  if (modal) modal.style.display = 'flex';
  const errEl = document.getElementById('password-error');
  if (errEl) errEl.style.display = 'none';
}

function closePasswordModal() {
  const modal = document.getElementById('password-modal');
  if (modal) modal.style.display = 'none';
}

function savePasswordChange() {
  const current = (document.getElementById('current-password').value || '').trim();
  const newPass  = (document.getElementById('new-password').value || '').trim();
  const confirm  = (document.getElementById('confirm-password').value || '').trim();
  const errEl = document.getElementById('password-error');

  function showErr(msg) { if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; } }

  if (!current || !newPass || !confirm) { showErr('Tüm alanlar zorunludur.'); return; }
  if (newPass !== confirm) { showErr('Yeni şifreler eşleşmiyor.'); return; }
  if (newPass.length < 4) { showErr('Şifre en az 4 karakter olmalıdır.'); return; }

  const users = getUsers();
  const user  = users[currentUserSession.username] || users[currentUserSession.id];
  if (!user || user.password !== current) { showErr('Mevcut şifre yanlış.'); return; }

  user.password = newPass;
  const key = Object.keys(users).find(k => users[k] === user);
  if (key) { users[key] = user; saveUsers(users); }
  currentUserSession.password = newPass;

  closePasswordModal();
  showToast('Şifre başarıyla değiştirildi!', 'success');
}

// ── Öğrenci Yönetimi (Koç) ───────────────────────────────────────────────────

function openStudentMgmtModal() {
  renderStudentMgmtList();
  const modal = document.getElementById('student-mgmt-modal');
  if (modal) modal.style.display = 'flex';
}

function closeStudentMgmtModal() {
  const modal = document.getElementById('student-mgmt-modal');
  if (modal) modal.style.display = 'none';
}

function renderStudentMgmtList() {
  const container = document.getElementById('student-mgmt-list');
  if (!container) return;
  const users = getUsers();
  const students = Object.entries(users).filter(([, u]) => u.role === 'student');
  container.innerHTML = students.map(([key, u]) => `
    <div style="display:flex; align-items:center; justify-content:space-between; padding:10px; background:rgba(255,255,255,0.05); border-radius:8px; margin-bottom:8px;">
      <span style="font-weight:600;">${u.name} <span style="color:var(--text-muted); font-size:12px;">(${u.username})</span></span>
      <button class="btn-delete-row" onclick="deleteStudent('${key}')" title="Sil">🗑️</button>
    </div>
  `).join('') || '<p style="color:var(--text-muted);">Henüz öğrenci yok.</p>';
}

function addNewStudent() {
  const name = (document.getElementById('new-student-name').value || '').trim();
  const user = (document.getElementById('new-student-username').value || '').trim().toLowerCase();
  const pass = (document.getElementById('new-student-password').value || '').trim();
  if (!name || !user || !pass) { showToast('Tüm alanlar zorunludur.', 'warning'); return; }

  const users = getUsers();
  if (users[user]) { showToast('Bu kullanıcı adı zaten kullanımda.', 'warning'); return; }

  users[user] = { id: user, username: user, name, role: 'student', roleTitle: 'Öğrenci', password: pass, avatar: name[0].toUpperCase() };
  saveUsers(users);
  renderStudentMgmtList();
  renderSidebarStudentSelector();
  document.getElementById('new-student-name').value = '';
  document.getElementById('new-student-username').value = '';
  document.getElementById('new-student-password').value = '';
  showToast(`${name} eklendi.`, 'success');
}

function deleteStudent(key) {
  if (!confirm('Bu öğrenciyi silmek istediğinize emin misiniz?')) return;
  const users = getUsers();
  delete users[key];
  saveUsers(users);
  renderStudentMgmtList();
  renderSidebarStudentSelector();
  showToast('Öğrenci silindi.', 'info');
}

// ── Yardımcılar ───────────────────────────────────────────────────────────────

function showLoginError(msg) {
  const el = document.getElementById('login-error-msg');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function hideLoginError() {
  const el = document.getElementById('login-error-msg');
  if (el) el.style.display = 'none';
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
  btn.textContent = input.type === 'password' ? '👁️' : '🙈';
}

function _setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
