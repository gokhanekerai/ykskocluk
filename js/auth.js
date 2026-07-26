/**
 * auth.js — Giriş / Oturum / Yetki Yönetimi
 */

let currentUser = null; // { id, username, name, role, roleTitle, avatar, branch? }

function initAuth() {
  const sessionKey = localStorage.getItem('yks_coach_session');
  const users = getUsers();

  if (sessionKey && users[sessionKey]) {
    _applySession(users[sessionKey]);
    hideLoginScreen();
  } else {
    showLoginScreen();
  }
}

function handleLogin(e) {
  if (e) e.preventDefault();

  const username = document.getElementById('login-username')?.value.trim().toLowerCase() || '';
  const password = document.getElementById('login-password')?.value.trim() || '';

  if (!username) { showLoginError('Kullanıcı adı boş olamaz.'); return; }

  const users = getUsers();
  const key = Object.keys(users).find(k =>
    k.toLowerCase() === username ||
    (users[k].username && users[k].username.toLowerCase() === username)
  );

  if (!key) { showLoginError('Kullanıcı adı bulunamadı.'); return; }

  const user = users[key];
  if (user.password !== password) { showLoginError('Şifre hatalı.'); return; }

  localStorage.setItem('yks_coach_session', key);
  _applySession(user);
  hideLoginScreen();
  showToast(`Hoş geldiniz, ${user.name}!`, 'success');
}

function logout() {
  localStorage.removeItem('yks_coach_session');
  currentUser = null;
  showLoginScreen();
  // Formu temizle
  const u = document.getElementById('login-username');
  const p = document.getElementById('login-password');
  if (u) u.value = '';
  if (p) p.value = '';
  hideLoginError();
}

function _applySession(user) {
  currentUser = user;

  // Sidebar kullanıcı bilgisi
  _el('sidebar-user-avatar', el => el.textContent = user.avatar);
  _el('sidebar-user-name',   el => el.textContent = user.name);
  _el('sidebar-user-role',   el => el.textContent = user.roleTitle);

  // Koç-only menü öğeleri
  document.querySelectorAll('.coach-only').forEach(el => {
    el.style.display = user.role === 'coach' ? '' : 'none';
  });

  // Öğrenci seçici (koça özel)
  const sel = document.getElementById('student-selector');
  if (sel) sel.style.display = user.role === 'coach' ? '' : 'none';

  if (user.role === 'student') {
    window.switchStudent(user.id, true);
  } else {
    window.switchStudent(window.activeStudent || 'kaan', true);
  }

  renderStudentSelector();
}

function showLoginScreen() {
  document.getElementById('login-screen')?.classList.remove('hidden');
}

function hideLoginScreen() {
  document.getElementById('login-screen')?.classList.add('hidden');
}

function showLoginError(msg) {
  const el = document.getElementById('login-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function hideLoginError() {
  const el = document.getElementById('login-error');
  if (el) el.style.display = 'none';
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') { input.type = 'text'; btn.textContent = '🙈'; }
  else { input.type = 'password'; btn.textContent = '👁️'; }
}

// Şifre değiştirme
function handlePasswordChange(e) {
  if (e) e.preventDefault();
  if (!currentUser) return;

  const curr    = document.getElementById('pwd-current')?.value.trim() || '';
  const newPwd  = document.getElementById('pwd-new')?.value.trim() || '';
  const confirm = document.getElementById('pwd-confirm')?.value.trim() || '';
  const errEl   = document.getElementById('pwd-error');

  const users = getUsers();
  const user  = users[currentUser.username] || users[currentUser.id];

  if (!user || user.password !== curr) {
    if (errEl) { errEl.textContent = 'Mevcut şifre hatalı.'; errEl.style.display='block'; } return;
  }
  if (newPwd.length < 3) {
    if (errEl) { errEl.textContent = 'Yeni şifre en az 3 karakter olmalı.'; errEl.style.display='block'; } return;
  }
  if (newPwd !== confirm) {
    if (errEl) { errEl.textContent = 'Şifreler eşleşmiyor.'; errEl.style.display='block'; } return;
  }

  user.password = newPwd;
  const key = Object.keys(users).find(k => users[k] === user);
  if (key) {
    users[key].password = newPwd;
    saveUsers(users);
    closeModal('pwd-modal');
    showToast('Şifre güncellendi!', 'success');
  }
}

function isCoach() { return currentUser?.role === 'coach'; }
function isStudent() { return currentUser?.role === 'student'; }

function _el(id, fn) {
  const el = document.getElementById(id);
  if (el) fn(el);
}

// Globals
window.currentUser               = currentUser;
window.initAuth                  = initAuth;
window.handleLogin               = handleLogin;
window.logout                    = logout;
window.togglePasswordVisibility  = togglePasswordVisibility;
window.handlePasswordChange      = handlePasswordChange;
window.isCoach                   = isCoach;
window.isStudent                 = isStudent;

Object.defineProperty(window, 'currentUser', {
  get: () => currentUser,
  set: v => { currentUser = v; }
});
