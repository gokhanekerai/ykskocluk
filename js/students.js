/**
 * students.js — Öğrenci & Koç Yönetimi ve Seçici
 */

function renderStudentSelector() {
  const container = document.querySelector('#student-selector .student-btns');
  if (!container) return;

  const visibleStudents = typeof getVisibleStudents === 'function' ? getVisibleStudents() : [];
  let html = '';

  if (visibleStudents.length === 0) {
    html = `
      <button class="btn btn-sm btn-primary" onclick="openStudentMgmt()" style="font-size:12px; padding:4px 10px;">
        + İlk Öğrencinizi Ekleyin
      </button>`;
  } else {
    visibleStudents.forEach(u => {
      const key = u.key || u.id;
      const active = key === window.activeStudent;
      html += `
        <button class="student-tab-btn ${active ? 'active' : ''}"
                onclick="switchStudent('${key}')"
                title="${u.name} (${u.branch || 'YKS'})">
          <span class="s-avatar">${u.avatar || u.name?.charAt(0).toUpperCase()}</span>
          <span>${u.name}</span>
        </button>`;
    });

    // Koç için hızlı ekle butonu
    if (typeof isCoach === 'function' && isCoach()) {
      html += `
        <button class="student-tab-btn add-btn" onclick="openStudentMgmt()" title="Yeni Öğrenci Ekle" style="border: 1px dashed rgba(255,255,255,0.25); background: transparent;">
          <span class="s-avatar">+</span>
          <span class="desktop-only">Ekle</span>
        </button>
      `;
    }
  }

  container.innerHTML = html;
}

// ─── ÖĞRENCİ YÖNETİMİ ────────────────────────────────────────────────────────

function openStudentMgmt() {
  if (typeof isCoach === 'function' && !isCoach()) return;
  renderStudentMgmtList();
  _populateCoachSelectInStudentModal();
  openModal('student-mgmt-modal');
}

function _populateCoachSelectInStudentModal() {
  const coachSelectGroup = document.getElementById('new-student-coach-group');
  const coachSelect = document.getElementById('new-student-coach');
  if (!coachSelectGroup || !coachSelect) return;

  const isSuper = typeof isSuperCoach === 'function' && isSuperCoach();
  if (isSuper) {
    coachSelectGroup.style.display = 'block';
    const coaches = typeof getVisibleCoaches === 'function' ? getVisibleCoaches() : [];
    coachSelect.innerHTML = coaches.map(c => `
      <option value="${c.key || c.id}" ${c.key === 'gokhan' ? 'selected' : ''}>${c.name} (${c.username})</option>
    `).join('');
  } else {
    coachSelectGroup.style.display = 'none';
  }
}

function renderStudentMgmtList() {
  const container = document.getElementById('student-mgmt-list');
  if (!container) return;

  const users = getUsers();
  const visibleStudents = typeof getVisibleStudents === 'function' ? getVisibleStudents() : [];
  const isSuper = typeof isSuperCoach === 'function' && isSuperCoach();
  let html = '';

  visibleStudents.forEach(u => {
    const key = u.key || u.id;
    const coachUser = u.coachId ? users[u.coachId] : null;
    const coachLabel = coachUser ? coachUser.name : (u.coachId || 'Gökhan EKER');

    html += `
      <div class="mgmt-student-row">
        <div class="mgmt-student-info">
          <span class="s-avatar">${u.avatar || u.name?.charAt(0).toUpperCase()}</span>
          <div>
            <div class="mgmt-name">
              ${u.name} <span class="mgmt-branch">${u.branch || 'YKS'}</span>
              ${isSuper ? `<span style="font-size:11px; padding:2px 6px; border-radius:4px; background:rgba(0,240,255,0.1); color:#00F0FF; margin-left:6px;">👨‍🏫 ${coachLabel}</span>` : ''}
            </div>
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

  if (!html) html = '<p class="empty-msg" style="padding:20px; text-align:center; color:var(--text-muted);">Henüz öğrenci kaydı bulunmuyor. Aşağıdan yeni öğrenci ekleyebilirsiniz.</p>';
  container.innerHTML = html;
}

function handleAddStudent(e) {
  if (e) e.preventDefault();

  const name     = document.getElementById('new-student-name')?.value.trim() || '';
  const username = document.getElementById('new-student-username')?.value.trim().toLowerCase() || '';
  const password = document.getElementById('new-student-password')?.value.trim() || '';
  const branch   = document.getElementById('new-student-branch')?.value || 'Sayısal';

  let coachId = 'gokhan';
  const isSuper = typeof isSuperCoach === 'function' && isSuperCoach();
  if (isSuper) {
    coachId = document.getElementById('new-student-coach')?.value || 'gokhan';
  } else if (window.currentUser) {
    coachId = window.currentUser.id || window.currentUser.username || 'gokhan';
  }

  if (!name || !username || !password) {
    showToast('Lütfen tüm alanları doldurun.', 'warning'); return;
  }

  const users = getUsers();
  if (Object.keys(users).some(k => k.toLowerCase() === username)) {
    showToast('Bu kullanıcı adı zaten kullanılıyor. Lütfen farklı bir kullanıcı adı seçin.', 'warning'); return;
  }

  const id = username.replace(/[^a-z0-9]/gi, '_');
  users[id] = {
    id, username, name, branch, coachId,
    role: 'student', roleTitle: 'Öğrenci',
    password, avatar: name.charAt(0).toUpperCase()
  };
  saveUsers(users);
  getStudentData(id); // veritabanı yapısını ilkle

  // Formu temizle
  ['new-student-name','new-student-username','new-student-password'].forEach(fid => {
    const el = document.getElementById(fid);
    if (el) el.value = '';
  });

  renderStudentMgmtList();
  renderStudentSelector();
  switchStudent(id);
  showToast(`🎉 ${name} başarıyla öğrenci olarak eklendi!`, 'success');
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

  if (!confirm(`"${s.name}" ve tüm verileri silinecek. Emin misiniz?`)) return;

  delete users[studentKey];
  saveUsers(users);
  localStorage.removeItem(`yks_coach_${studentKey}`);

  // Başka bir öğrenciye geç
  const visible = typeof getVisibleStudents === 'function' ? getVisibleStudents() : [];
  if (visible.length > 0) {
    switchStudent(visible[0].key || visible[0].id, true);
  }

  renderStudentMgmtList();
  renderStudentSelector();
  showToast('Öğrenci silindi.', 'info');
}

// ─── KOÇ YÖNETİMİ (SÜPER KOÇ İÇİN) ──────────────────────────────────────────

function openCoachMgmt() {
  if (typeof isSuperCoach === 'function' && !isSuperCoach()) {
    showToast('Bu alana sadece Süper Koç (Gökhan EKER) erişebilir.', 'warning');
    return;
  }
  renderCoachMgmtList();
  openModal('coach-mgmt-modal');
}

function renderCoachMgmtList() {
  const container = document.getElementById('coach-mgmt-list');
  if (!container) return;

  const coaches = typeof getVisibleCoaches === 'function' ? getVisibleCoaches() : [];
  const users = getUsers();
  let html = '';

  coaches.forEach(c => {
    const key = c.key || c.id;
    const isMain = key === 'gokhan';
    const studentsOfCoach = Object.values(users).filter(u => u && u.role === 'student' && u.coachId === key);

    html += `
      <div class="mgmt-student-row" style="border-left: 3px solid ${isMain ? '#00F0FF' : '#8B5CF6'};">
        <div class="mgmt-student-info">
          <span class="s-avatar" style="background:${isMain ? 'linear-gradient(135deg,#00F0FF,#0080FF)' : 'linear-gradient(135deg,#8B5CF6,#EC4899)'};">${c.avatar || '👨‍🏫'}</span>
          <div>
            <div class="mgmt-name">
              ${c.name} 
              <span class="mgmt-branch" style="background:rgba(255,255,255,0.08); color:var(--text);">${isMain ? '👑 Süper Koç' : '👔 Koç'}</span>
              <span style="font-size:11.5px; color:var(--text-muted); margin-left:6px;">(${studentsOfCoach.length} Öğrenci)</span>
            </div>
            <div class="mgmt-creds">
              <span>Kullanıcı: <code>${c.username}</code></span>
              <span>Şifre: <strong>${c.password}</strong></span>
            </div>
          </div>
        </div>
        <div class="mgmt-actions">
          <button class="btn-sm" onclick="changePassword('${key}')">🔑 Şifre</button>
          ${!isMain ? `<button class="btn-sm btn-danger" onclick="deleteCoachAction('${key}')">🗑️ Sil</button>` : ''}
        </div>
      </div>`;
  });

  container.innerHTML = html;
}

function handleAddCoach(e) {
  if (e) e.preventDefault();

  const name     = document.getElementById('new-coach-name')?.value.trim() || '';
  const username = document.getElementById('new-coach-username')?.value.trim().toLowerCase() || '';
  const password = document.getElementById('new-coach-password')?.value.trim() || '';

  try {
    addCoachUser(name, username, password);

    ['new-coach-name','new-coach-username','new-coach-password'].forEach(fid => {
      const el = document.getElementById(fid);
      if (el) el.value = '';
    });

    renderCoachMgmtList();
    showToast(`🎉 ${name} koç olarak başarıyla tanımlandı!`, 'success');
  } catch (err) {
    showToast(err.message || 'Koç eklenirken hata oluştu.', 'warning');
  }
}

function deleteCoachAction(coachKey) {
  const users = getUsers();
  const c = users[coachKey];
  if (!c) return;

  if (!confirm(`"${c.name}" koç hesabını silmek istediğinize emin misiniz?`)) return;

  try {
    deleteCoachUser(coachKey);
    renderCoachMgmtList();
    renderStudentSelector();
    showToast('Koç hesabı silindi.', 'info');
  } catch (err) {
    showToast(err.message, 'warning');
  }
}

// Kişisel Hedef
function savePersonalGoal(e) {
  if (e) e.preventDefault();
  const data = getStudentData(window.activeStudent);
  data.personalGoal = {
    ...(data.personalGoal || {}),
    university: document.getElementById('goal-university')?.value.trim() || '',
    profession: document.getElementById('goal-profession')?.value.trim() || '',
    ranking:    document.getElementById('goal-ranking')?.value.trim() || ''
  };
  saveStudentData(window.activeStudent, data);
  closeModal('personal-goal-modal');
  showToast('Hedef kaydedildi!', 'success');
  if (typeof renderDashboard === 'function') renderDashboard();
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
window.openCoachMgmt          = openCoachMgmt;
window.renderCoachMgmtList    = renderCoachMgmtList;
window.handleAddCoach         = handleAddCoach;
window.deleteCoachAction      = deleteCoachAction;
window.savePersonalGoal       = savePersonalGoal;
window.openPersonalGoalModal  = openPersonalGoalModal;

