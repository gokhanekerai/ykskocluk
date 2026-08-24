/**
 * auth.js — Giriş / Oturum / Yetki Yönetimi
 */

let currentUser = null; // { id, username, name, role, roleTitle, avatar, branch? }

function initAuth() {
  const sessionKey = localStorage.getItem('yks_coach_session');
  const users = getUsers();

  if (sessionKey) {
    const user = users[sessionKey] || Object.values(users).find(u => u && (u.username === sessionKey || u.id === sessionKey));
    if (user) {
      _applySession(user);
      hideLoginScreen();
      return true;
    }
  }
  showLoginScreen();
  return false;
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

  localStorage.setItem('yks_coach_session', user.id || key);
  _applySession(user);
  hideLoginScreen();
  showToast(`Hoş geldiniz, ${user.name}!`, 'success');
}

function logout() {
  localStorage.removeItem('yks_coach_session');
  localStorage.removeItem('yks_coach_active_tab');
  currentUser = null;
  window.currentUser = null;
  showLoginScreen();
  // Formu temizle
  const u = document.getElementById('login-username');
  const p = document.getElementById('login-password');
  if (u) u.value = '';
  if (p) p.value = '';
  hideLoginError();
}

function _applySession(user) {
  if (!user) return;
  currentUser = user;
  window.currentUser = user;
  if (user.id || user.username) {
    localStorage.setItem('yks_coach_session', user.id || user.username);
  }

  const isCoachRole = user.role === 'coach' || user.role === 'supercoach';
  const isSuperCoachRole = user.role === 'supercoach' || user.username === 'gokhan' || user.username === 'koc';

  if (document.body) {
    if (user.role === 'student') {
      document.body.classList.add('student-role');
    } else {
      document.body.classList.remove('student-role');
    }
  }

  // Sidebar kullanıcı bilgisi
  _el('sidebar-user-avatar', el => el.textContent = user.avatar || 'K');
  _el('sidebar-user-name',   el => el.textContent = user.name);
  _el('sidebar-user-role',   el => el.textContent = user.roleTitle || (isSuperCoachRole ? 'YKS Süper Koçu' : (isCoachRole ? 'YKS Koçu' : 'Öğrenci')));

  // Dinamik menü ve başlık isimlendirmesi
  _el('menu-schedule-text', el => el.textContent = isCoachRole ? 'Görevlendirme' : 'Verilen Görevler');
  _el('tab-schedule-title', el => el.textContent = isCoachRole ? '📅 Görevlendirme' : '📅 Verilen Görevler');

  // Koç-only menü öğeleri
  document.querySelectorAll('.coach-only').forEach(el => {
    el.style.display = isCoachRole ? '' : 'none';
  });

  // Süper Koç (Gökhan) öğeleri
  document.querySelectorAll('.supercoach-only').forEach(el => {
    el.style.display = isSuperCoachRole ? '' : 'none';
  });

  // Öğrenci seçici (koça özel)
  const sel = document.getElementById('student-selector');
  if (sel) sel.style.display = isCoachRole ? '' : 'none';

  if (user.role === 'student') {
    if (typeof window.switchStudent === 'function') {
      window.switchStudent(user.id || user.username, true);
    }
  } else {
    const visibleStudents = typeof getVisibleStudents === 'function' ? getVisibleStudents(user) : [];
    const savedStudent = localStorage.getItem('yks_coach_active_student');
    const isSavedVisible = visibleStudents.some(s => s.key === savedStudent || s.id === savedStudent);
    const targetStudentId = isSavedVisible ? savedStudent : (visibleStudents[0]?.key || 'kaan');
    if (typeof window.switchStudent === 'function') {
      window.switchStudent(targetStudentId, true);
    }
  }

  if (typeof renderStudentSelector === 'function') {
    renderStudentSelector();
  }

  // Kullanıcının bulunduğu sekmeyi geri yükle
  const savedTab = localStorage.getItem('yks_coach_active_tab') || 'dashboard';
  if (typeof switchTab === 'function') {
    switchTab(savedTab);
  }
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

function isCoach() { 
  return currentUser?.role === 'coach' || currentUser?.role === 'supercoach'; 
}

function isSuperCoach() {
  return currentUser?.role === 'supercoach' || currentUser?.username === 'gokhan' || currentUser?.username === 'koc' || currentUser?.id === 'gokhan';
}

function isStudent() { 
  return currentUser?.role === 'student'; 
}

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
window.isSuperCoach              = isSuperCoach;
window.isStudent                 = isStudent;

Object.defineProperty(window, 'currentUser', {
  get: () => currentUser,
  set: v => { currentUser = v; }
});
