/**
 * YKS Koçum - Uygulama Mantığı (Engine)
 * localStorage veri yönetimi, Chart.js entegrasyonu, YKS Puan Hesaplama ve Arayüz Güncellemeleri.
 */

// Global Uygulama Durumu
let currentStudent = 'kaan';
let activeTab = 'dashboard';
let charts = {}; // Grafikleri saklamak için obje

// ==================== FIREBASE SYNC ====================
let isFirebaseSyncing = false;

function saveToFirebase(key, data) {
  if (window.db && !isFirebaseSyncing) {
    window.db.ref('ykskocum_data/' + key).set(data).catch(e => console.error("Firebase error:", e));
  }
}

function initFirebaseSync() {
  if (window.db) {
    window.db.ref('ykskocum_data').on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) {
        isFirebaseSyncing = true; // Prevent bounce-back saves
        let needsRender = false;
        
        for (const [key, value] of Object.entries(data)) {
          const localStr = localStorage.getItem(key);
          const remoteStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
          
          if (localStr !== remoteStr) {
            try {
              const localObj = localStr ? JSON.parse(localStr) : null;
              const remoteObj = typeof value === 'object' ? value : JSON.parse(remoteStr || "{}");
              
              // Heuristic: If local has tasks/books but remote is empty, PUSH LOCAL UP! (Data Recovery)
              const localTasks = (localObj && localObj.tasks) ? localObj.tasks.length : 0;
              const remoteTasks = (remoteObj && remoteObj.tasks) ? remoteObj.tasks.length : 0;
              const localTopics = (localObj && localObj.topicStatus) ? Object.keys(localObj.topicStatus).length : 0;
              const remoteTopics = (remoteObj && remoteObj.topicStatus) ? Object.keys(remoteObj.topicStatus).length : 0;
              
              if (localTasks > remoteTasks || localTopics > remoteTopics) {
                 console.log(`Recovering ${key} from local to Firebase...`);
                 window.db.ref('ykskocum_data/' + key).set(localObj).catch(e => console.error(e));
                 continue;
              }
            } catch(e) {}
            
            localStorage.setItem(key, remoteStr);
            needsRender = true;
          }
        }
        
        isFirebaseSyncing = false;
        
        if (needsRender && typeof renderAll === 'function') {
          // Re-auth if user data changed
          if (currentUserSession) {
             const users = getUsers();
             if (users[currentUserSession.id]) {
                applyUserSession(users[currentUserSession.id]);
             }
          }
          renderAll();
        }
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initFirebaseSync();
});
// ========================================================

// Varsayılan Öğrenci Veri Yapısı
const DEFAULT_STUDENT_DATA = {
  dailyLog: [], // { id, date, tytAyt, subject, solved, correct, wrong }
  mockLog: [],  // { id, date, type, name, results: { ... }, nets: { ... }, totalNet, scores: { SAY, SOZ, EA, TYT } }
  topicStatus: {}, // Key: "tytAyt_subject_topic", Value: "not_started" | "studying" | "review" | "completed"
  tasks: [],    // { id, text, checked }
  weeklyGoal: 1000,
  wrongLog: [],  // { id, date, tytAyt, subject, topic, source, reason, note, reviewed }
  books: [],
  streak: 0,
  lastActiveDate: null,
  badges: [],
  maxDaily: 0,
  personalGoal: { university: "", profession: "", ranking: "" }
};

// Veriyi localStorage'dan yükle veya oluştur
function getStudentData(student) {
  const dataStr = localStorage.getItem(`yks_coach_${student}`);
  let data;
  if (!dataStr) {
    data = JSON.parse(JSON.stringify(DEFAULT_STUDENT_DATA));
    localStorage.setItem(`yks_coach_${student}`, JSON.stringify(data));
  } else {
    data = JSON.parse(dataStr);
  }
  
  // Firebase strips empty arrays and objects. Ensure they exist to prevent UI crashes.
  if (!data.dailyLog) data.dailyLog = [];
  if (!data.mockLog) data.mockLog = [];
  if (!data.topicStatus) data.topicStatus = {};
  if (!data.tasks) data.tasks = [];
  if (!data.wrongLog) data.wrongLog = [];
  if (!data.books) data.books = [];
  if (!data.badges) data.badges = [];
  if (!data.personalGoal) data.personalGoal = { university: "", profession: "", ranking: "" };
  if (!data.liveSession) data.liveSession = null;
  
  return data;
}

// Veriyi localStorage'a kaydet
function saveStudentData(student, data) {
  localStorage.setItem(`yks_coach_${student}`, JSON.stringify(data));
  if (typeof saveToFirebase === 'function') saveToFirebase(`yks_coach_${student}`, data);
}

// ==================== KULLANICI & KİMLİK DOĞRULAMA (AUTH) MANTIĞI ====================

const DEFAULT_USERS = {
  gokhan: {
    id: 'coach',
    username: 'gokhan',
    name: 'Gökhan EKER',
    role: 'coach',
    roleTitle: 'YKS Eğitim Koçu',
    password: 'koc123',
    avatar: 'G'
  },
  koc: {
    id: 'coach',
    username: 'koc',
    name: 'Gökhan EKER',
    role: 'coach',
    roleTitle: 'YKS Eğitim Koçu',
    password: 'koc123',
    avatar: 'G'
  },
  kaan: {
    id: 'kaan',
    username: 'kaan',
    name: 'Kaan',
    role: 'student',
    roleTitle: 'Öğrenci',
    password: 'kaan123',
    avatar: 'K'
  },
  cagan: {
    id: 'cagan',
    username: 'cagan',
    name: 'Çağan',
    role: 'student',
    roleTitle: 'Öğrenci',
    password: 'cagan123',
    avatar: 'Ç'
  }
};

let currentUserSession = null; // User object or null

function getUsers() {
  const data = localStorage.getItem('yks_coach_users');
  if (!data || data === 'undefined' || data === 'null') {
    localStorage.setItem('yks_coach_users', JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }
  const parsed = JSON.parse(data);
  if (!parsed.koc) parsed.koc = DEFAULT_USERS.koc;
  if (!parsed.gokhan) parsed.gokhan = DEFAULT_USERS.gokhan;
  if (!parsed.kaan) parsed.kaan = DEFAULT_USERS.kaan;
  if (!parsed.cagan) parsed.cagan = DEFAULT_USERS.cagan;
  return parsed;
}

function saveUsers(users) {
  localStorage.setItem('yks_coach_users', JSON.stringify(users));
  if (typeof saveToFirebase === 'function') saveToFirebase('yks_coach_users', users);
}

function initAuth() {
  const savedSessionKey = localStorage.getItem('yks_coach_session');
  const users = getUsers();

  if (savedSessionKey && users[savedSessionKey]) {
    // Oturum mevcut ve geçerli
    applyUserSession(users[savedSessionKey]);
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) loginScreen.classList.add('hidden');
  } else {
    // Oturum yok, giriş ekranını göster
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) loginScreen.classList.remove('hidden');
    hideLoginError();
  }
}

function handleLoginSubmit(e) {
  if (e) e.preventDefault();
  
  const usernameInput = document.getElementById('login-username');
  const passwordInput = document.getElementById('login-password');
  
  const username = usernameInput ? usernameInput.value.trim().toLowerCase() : '';
  const password = passwordInput ? passwordInput.value.trim() : '';

  if (!username) {
    showLoginError("Lütfen kullanıcı adınızı giriniz.");
    return;
  }

  const users = getUsers();
  
  // Kullanıcı adına göre arama
  let foundKey = Object.keys(users).find(key => 
    key.toLowerCase() === username || 
    (users[key].username && users[key].username.toLowerCase() === username)
  );

  if (!foundKey) {
    showLoginError("Girilen kullanıcı adı sistemde kayıtlı değil.");
    if (usernameInput) usernameInput.select();
    return;
  }

  const targetUser = users[foundKey];

  if (targetUser.password !== password) {
    showLoginError("Hatalı şifre girdiniz. Lütfen tekrar deneyiniz.");
    if (passwordInput) passwordInput.select();
    return;
  }

  // Giriş Başarılı!
  localStorage.setItem('yks_coach_session', foundKey);
  const loginScreen = document.getElementById('login-screen');
  if (loginScreen) loginScreen.classList.add('hidden');
  
  applyUserSession(targetUser);

  showToast(`Hoş geldiniz, ${targetUser.name}! (${targetUser.roleTitle})`, 'success');
}

function applyUserSession(user) {
  currentUserSession = user;
  
  // Sidebar Kullanıcı Bilgilerini Güncelle
  const avatarEl = document.getElementById('sidebar-user-avatar');
  const nameEl = document.getElementById('sidebar-user-name');
  const roleEl = document.getElementById('sidebar-user-role');
  const studentSelector = document.getElementById('sidebar-student-selector');

  if (avatarEl) avatarEl.innerText = user.avatar;
  if (nameEl) nameEl.innerText = user.name;
  if (roleEl) roleEl.innerText = user.roleTitle;

  // Öğrenci Listesi Butonlarını Dinamik Oluştur
  renderSidebarStudentSelector();

  // Menü Yetkilendirmeleri
  const coachItems = document.querySelectorAll('.coach-only-item');

  if (user.role === 'student') {
    // Öğrenci Oturumu: Koç menülerini ve öğrenci seçiciyi gizle
    coachItems.forEach(item => item.style.display = 'none');
    if (studentSelector) studentSelector.style.display = 'none';
    
    const addTaskForm = document.getElementById('add-task-form');
    if (addTaskForm) addTaskForm.style.display = 'none';
    
    // Öğrenciyi kendi profiline kilitle
    switchStudent(user.id, true);

    // Dashboard Başlığı
    const dashTitle = document.getElementById('dashboard-student-name');
    if (dashTitle) {
      dashTitle.innerText = `${user.name} - Gelişim Paneli`;
    }
  } else {
    // Koç Oturumu: Koç menülerini ve öğrenci seçiciyi göster
    coachItems.forEach(item => item.style.display = 'block');
    if (studentSelector) studentSelector.style.display = 'block';
    
    const addTaskForm = document.getElementById('add-task-form');
    if (addTaskForm) addTaskForm.style.display = 'flex';
    
    // Dashboard Başlığı
    const dashTitle = document.getElementById('dashboard-student-name');
    if (dashTitle) {
      dashTitle.innerText = `Öğrenci Gelişim Paneli`;
    }

    switchStudent(currentStudent, true);
  }
}

// Sidebar Öğrenci Seçici Butonlarını Dinamik Oluştur
function renderSidebarStudentSelector() {
  const container = document.querySelector('#sidebar-student-selector .student-options');
  if (!container) return;

  const users = getUsers();
  let html = '';

  Object.keys(users).forEach(key => {
    const u = users[key];
    if (u.role === 'student') {
      const isActive = key === currentStudent;
      html += `
        <button id="btn-select-${key}" class="student-btn ${isActive ? 'active' : ''}" data-student="${key}" onclick="switchStudent('${key}')">
          <span class="student-avatar">${u.avatar}</span>
          <span>${u.name}</span>
        </button>
      `;
    }
  });

  container.innerHTML = html;
}

// Tema Yönetimi (Yazılı Menü Uyumlu)
function initTheme() {
  const savedTheme = localStorage.getItem('yks_coach_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('yks_coach_theme', next);
  updateThemeIcon(next);
  
  // Grafikleri yeni temaya göre yeniden çiz
  if (charts.questions) updateChartTheme(charts.questions);
  if (charts.nets) updateChartTheme(charts.nets);
}

function updateThemeIcon(theme) {
  const iconEl = document.getElementById('theme-menu-icon');
  const textEl = document.getElementById('theme-menu-text');
  
  if (theme === 'dark') {
    if (iconEl) iconEl.innerText = '☀️';
    if (textEl) textEl.innerText = 'Açık Moda Geç';
  } else {
    if (iconEl) iconEl.innerText = '🌙';
    if (textEl) textEl.innerText = 'Koyu Moda Geç';
  }
}

// ==================== ÖĞRENCİ YÖNETİMİ & ŞİFRE DEĞİŞTİRME MANTIĞI ====================

function openStudentMgmtModal() {
  if (!currentUserSession || currentUserSession.role !== 'coach') return;
  const modal = document.getElementById('student-mgmt-modal');
  renderStudentMgmtList();
  if (modal) modal.style.display = 'flex';
}

function closeStudentMgmtModal() {
  const modal = document.getElementById('student-mgmt-modal');
  if (modal) modal.style.display = 'none';
}

function renderStudentMgmtList() {
  const container = document.getElementById('students-mgmt-list');
  if (!container) return;

  const users = getUsers();
  let html = '';

  Object.keys(users).forEach(key => {
    const u = users[key];
    if (u.role === 'student') {
      html += `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span class="student-avatar-lg" style="width:34px; height:34px; font-size:14px;">${u.avatar}</span>
            <div>
              <div style="font-weight:700; color:var(--text-main); font-size:14px;">${u.name} <span style="font-size:11px; color:var(--text-muted); font-weight:normal;">(${u.branch || 'YKS'})</span></div>
              <div style="font-size:12px; color:var(--text-muted);">Kullanıcı Adı: <code style="background:rgba(255,255,255,0.06); padding:1px 6px; border-radius:4px;">${u.username}</code> | Şifre: <strong style="color:var(--color-primary-light,#a78bfa);">${u.password}</strong></div>
            </div>
          </div>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn-icon" onclick="changeStudentPassword('${key}')" title="Şifreyi Değiştir" style="padding:4px 10px; font-size:12px; border-radius:6px; border:1px solid var(--border-color); background:transparent; cursor:pointer;">🔑 Şifre Değiştir</button>
            <button type="button" class="btn-icon delete" onclick="deleteStudent('${key}')" title="Öğrenciyi Sil" style="padding:4px 10px; font-size:12px; border-radius:6px; border:1px solid var(--color-wrong); color:var(--color-wrong); background:transparent; cursor:pointer;">🗑️ Sil</button>
          </div>
        </div>
      `;
    }
  });

  if (!html) {
    html = `<p style="font-size:13px; color:var(--text-muted); padding:10px;">Henüz sistemde kayıtlı öğrenci bulunmuyor.</p>`;
  }

  container.innerHTML = html;
}

function handleAddStudentSubmit(e) {
  if (e) e.preventDefault();

  const nameIn = document.getElementById('new-student-name');
  const usernameIn = document.getElementById('new-student-username');
  const passIn = document.getElementById('new-student-password');
  const branchIn = document.getElementById('new-student-branch');

  const name = nameIn ? nameIn.value.trim() : '';
  const username = usernameIn ? usernameIn.value.trim().toLowerCase() : '';
  const password = passIn ? passIn.value.trim() : '';
  const branch = branchIn ? branchIn.value : 'Sayısal';

  if (!name || !username || !password) {
    showToast("Lütfen tüm alanları doldurunuz.", "warning");
    return;
  }

  const users = getUsers();

  // Kullanıcı adı çakışma kontrolü
  const exists = Object.keys(users).some(k => k.toLowerCase() === username || (users[k].username && users[k].username.toLowerCase() === username));
  if (exists) {
    showToast(`"${username}" kullanıcı adı zaten kullanılıyor!`, "warning");
    return;
  }

  const studentId = username.replace(/[^a-z0-9]/gi, '_');

  users[studentId] = {
    id: studentId,
    username: username,
    name: name,
    role: 'student',
    roleTitle: 'Öğrenci',
    password: password,
    avatar: name.charAt(0).toUpperCase(),
    branch: branch
  };

  saveUsers(users);

  // Öğrenci verisini ilkle
  getStudentData(studentId);

  // Formu temizle
  if (nameIn) nameIn.value = '';
  if (usernameIn) usernameIn.value = '';
  if (passIn) passIn.value = '';

  renderStudentMgmtList();
  renderSidebarStudentSelector();

  showToast(`Yeni öğrenci "${name}" başarıyla sisteme eklendi!`, "success");
}

function changeStudentPassword(studentKey) {
  const users = getUsers();
  const student = users[studentKey];
  if (!student) return;

  const newPass = prompt(`"${student.name}" öğrencisi için yeni şifreyi giriniz:`, student.password);
  if (newPass !== null && newPass.trim().length >= 3) {
    student.password = newPass.trim();
    users[studentKey] = student;
    saveUsers(users);
    renderStudentMgmtList();
    showToast(`"${student.name}" şifresi güncellendi!`, "success");
  } else if (newPass !== null) {
    showToast("Şifre en az 3 karakter olmalıdır.", "warning");
  }
}

function deleteStudent(studentKey) {
  const users = getUsers();
  const student = users[studentKey];
  if (!student) return;

  if (confirm(`"${student.name}" öğrencisini ve tüm çalışma kayıtlarını silmek istediğinize emin misiniz?`)) {
    delete users[studentKey];
    saveUsers(users);

    localStorage.removeItem(`yks_coach_${studentKey}`);

    if (currentStudent === studentKey) {
      const remainingStudents = Object.keys(users).filter(k => users[k].role === 'student');
      if (remainingStudents.length > 0) {
        switchStudent(remainingStudents[0], true);
      }
    }

    renderStudentMgmtList();
    renderSidebarStudentSelector();
    showToast(`Öğrenci kaydı silindi.`, "info");
  }
}

function logoutUser() {
  localStorage.removeItem('yks_coach_session');
  currentUserSession = null;
  const loginScreen = document.getElementById('login-screen');
  if (loginScreen) loginScreen.classList.remove('hidden');

  const userIn = document.getElementById('login-username');
  const passIn = document.getElementById('login-password');
  if (userIn) userIn.value = '';
  if (passIn) passIn.value = '';
  hideLoginError();

  showToast("Oturum kapatıldı.", "info");
}

function showLoginError(msg) {
  const errEl = document.getElementById('login-error-msg');
  if (errEl) {
    errEl.innerText = msg;
    errEl.style.display = 'block';
  }
}

function hideLoginError() {
  const errEl = document.getElementById('login-error-msg');
  if (errEl) {
    errEl.style.display = 'none';
  }
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.innerText = '🙈';
  } else {
    input.type = 'password';
    btn.innerText = '👁️';
  }
}

// Şifre Değiştirme Modalı
function openPasswordModal() {
  if (!currentUserSession) return;
  const modal = document.getElementById('password-modal');
  const errEl = document.getElementById('password-change-error');
  if (errEl) errEl.style.display = 'none';
  
  const curr = document.getElementById('current-password');
  const n1 = document.getElementById('new-password');
  const n2 = document.getElementById('new-password-confirm');
  if (curr) curr.value = '';
  if (n1) n1.value = '';
  if (n2) n2.value = '';
  
  if (modal) modal.style.display = 'flex';
}

function closePasswordModal() {
  const modal = document.getElementById('password-modal');
  if (modal) modal.style.display = 'none';
}

function handlePasswordChangeSubmit(e) {
  if (e) e.preventDefault();
  
  const currentPass = document.getElementById('current-password').value.trim();
  const newPass = document.getElementById('new-password').value.trim();
  const confirmPass = document.getElementById('new-password-confirm').value.trim();
  const errEl = document.getElementById('password-change-error');

  if (!currentUserSession) return;

  const users = getUsers();
  const user = users[currentUserSession.id];

  if (user.password !== currentPass) {
    if (errEl) {
      errEl.innerText = "Mevcut şifreniz hatalı!";
      errEl.style.display = 'block';
    }
    return;
  }

  if (newPass.length < 3) {
    if (errEl) {
      errEl.innerText = "Yeni şifre en az 3 karakter olmalıdır!";
      errEl.style.display = 'block';
    }
    return;
  }

  if (newPass !== confirmPass) {
    if (errEl) {
      errEl.innerText = "Yeni şifreler birbiriyle eşleşmiyor!";
      errEl.style.display = 'block';
    }
    return;
  }

  // Güncelle
  user.password = newPass;
  users[currentUserSession.id] = user;
  saveUsers(users);

  closePasswordModal();
  showToast("Şifreniz başarıyla değiştirildi!", "success");
}

// Sayfa Yüklendiğinde Çalışacak Fonksiyonlar
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initAuth();
  setupEventListeners();
  startCountdown();
  
  // Restore active tab
  const savedTab = localStorage.getItem('yks_coach_active_tab');
  if (savedTab) {
    switchTab(savedTab);
  } else {
    switchTab('dashboard'); // Default
  }
  
  // Başlangıç tarihini banner'da göster
  updateProgramStartBanner();
});

// ==================== PROGRAM BAŞLANGIÇ TARİHİ ====================

function getProgramStartDate() {
  const val = localStorage.getItem('yks_coach_program_start');
  if (!val || val === 'undefined' || val === 'null') return null;
  return val;
}

function saveProgramStartDate() {
  const input = document.getElementById('program-start-input');
  if (!input || !input.value) {
    showToast('Lütfen bir tarih seçin.', 'warning');
    return;
  }
  localStorage.setItem('yks_coach_program_start', input.value);
  if (typeof saveToFirebase === 'function') saveToFirebase('yks_coach_program_start', input.value);
  updateProgramStartBanner();
  populateDaySelector();
  showToast('Program başlangıç tarihi kaydedildi! 🎉', 'success');
}

function clearProgramStartDate() {
  if (!confirm('Program başlangıç tarihini silmek istediğine emin misin?')) return;
  localStorage.removeItem('yks_coach_program_start');
  const input = document.getElementById('program-start-input');
  if (input) input.value = '';
  updateProgramStartBanner();
  populateDaySelector();
  showToast('Program başlangıç tarihi silindi.', 'info');
}

function updateProgramStartBanner() {
  const startDate = getProgramStartDate();
  const bannerEl = document.getElementById('program-start-banner');
  const displayEl = document.getElementById('program-start-display');
  if (startDate && bannerEl && displayEl) {
    const d = new Date(startDate);
    const formatted = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    displayEl.textContent = formatted;
    bannerEl.style.display = 'block';
  } else if (bannerEl) {
    bannerEl.style.display = 'none';
  }
}

// ==================== SINAV TARİHİ ====================
const DEFAULT_EXAM_DATE = '2027-06-19';

function getExamDate() {
  const val = localStorage.getItem('yks_coach_exam_date');
  if (!val || val === 'undefined' || val === 'null') return DEFAULT_EXAM_DATE;
  return val;
}

function saveExamDate() {
  const input = document.getElementById('exam-date-input');
  if (!input || !input.value) {
    showToast('Lütfen bir sınav tarihi seçin.', 'warning');
    return;
  }
  localStorage.setItem('yks_coach_exam_date', input.value);
  if (typeof saveToFirebase === 'function') saveToFirebase('yks_coach_exam_date', input.value);
  updateExamDateDisplay();
  populateDaySelector();
  startCountdown(); // Geri sayımı yenile
  showToast('Sınav tarihi güncellendi! ✅', 'success');
}

function clearExamDate() {
  if (!confirm('Sınav tarihi varsayılana (19 Haziran 2027) sıfırlansın mı?')) return;
  localStorage.removeItem('yks_coach_exam_date');
  const input = document.getElementById('exam-date-input');
  if (input) input.value = '';
  updateExamDateDisplay();
  populateDaySelector();
  startCountdown();
  showToast('Sınav tarihi varsayılana sıfırlandı.', 'info');
}

function updateExamDateDisplay() {
  const displayEl = document.getElementById('exam-date-display');
  if (!displayEl) return;
  const examDate = getExamDate();
  if (examDate) {
    const d = new Date(examDate);
    if (!isNaN(d.getTime())) {
      displayEl.textContent = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    } else {
      displayEl.textContent = 'Tarih Seçilmedi';
    }
  }
}

function populateDaySelector() {
  const sel = document.getElementById('smart-task-day');
  if (!sel) return;
  const startDate = getProgramStartDate();
  sel.innerHTML = '<option value="" disabled selected>Gün Seçin</option>';
  
  const examDate = new Date(getExamDate());
  const baseDate = startDate ? new Date(startDate) : new Date();
  
  if (isNaN(examDate.getTime()) || isNaN(baseDate.getTime())) return;
  
  const totalDays = Math.max(1, Math.ceil((examDate - baseDate) / (1000 * 60 * 60 * 24)));
  
  for (let i = 1; i <= totalDays; i++) {
    const opt = document.createElement('option');
    opt.value = `${i}. Gün`;
    let label = `${i}. Gün`;
    if (startDate) {
      const d = new Date(startDate);
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + (i - 1));
        label += ` (${d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })})`;
      }
    }
    opt.textContent = label;
    sel.appendChild(opt);
  }
}

function updateChartTheme(chart) {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

  chart.options.scales.x.grid.color = gridColor;
  chart.options.scales.y.grid.color = gridColor;
  chart.options.scales.x.ticks.color = textColor;
  chart.options.scales.y.ticks.color = textColor;
  chart.update();
}

// Öğrenci Değiştirme
function switchStudent(student, force = false) {
  if (!force && currentUserSession && currentUserSession.role === 'student' && student !== currentUserSession.id) {
    showToast(`Öğrenci oturumunda sadece kendi profilinize erişebilirsiniz.`, 'warning');
    return;
  }

  currentStudent = student;
  
  // Aktif sınıfları güncelle
  document.querySelectorAll('.student-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.student === student);
  });
  
  if (!force) {
    showToast(`${student === 'kaan' ? 'Kaan' : 'Çağan'} profiline geçiş yapıldı.`, 'info');
  }
  
  // Arayüz verilerini güncelle
  refreshUI();
}

// Sekme Değiştirme (Navigation)
function switchTab(tabId) {
  activeTab = tabId;
  localStorage.setItem('yks_coach_active_tab', tabId);
  
  // Menü öğelerini güncelle
  document.querySelectorAll('.menu-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === tabId);
  });
  
  // Sekme panellerini göster/gizle
  document.querySelectorAll('.tab-view').forEach(panel => {
    panel.classList.toggle('active', panel.id === tabId || panel.id === `${tabId}-tab`);
  });
  
  // Sekmeye özel veri yüklemeleri
  if (tabId === 'konu-takip') {
    renderTopicTracker();
  } else if (tabId === 'calisma-programi') {
    renderWeeklyPlanner();
    populateDaySelector();
    // Koç kartını göster/gizle
    const startCard = document.getElementById('program-start-date-card');
    const startInput = document.getElementById('program-start-input');
    if (startCard) {
      const isCoach = currentUserSession && currentUserSession.role === 'coach';
      startCard.style.display = isCoach ? 'flex' : 'none';
      if (isCoach && startInput) {
        const saved = getProgramStartDate();
        if (saved) startInput.value = saved;
      }
      // Sınav tarihi alanını doldur
      const examInput = document.getElementById('exam-date-input');
      if (examInput) {
        const savedExam = getExamDate();
        if (savedExam) examInput.value = savedExam;
      }
      updateExamDateDisplay();
    }

  } else if (tabId === 'kaynak-takip') {
    renderBooks();
  } else if (tabId === 'puan-hesaplama') {
    initCalculator();
  } else if (tabId === 'yanlis-defter') {
    initWrongSubjectFilter();
    renderWrongStats();
    renderWrongList();
  }
  
  // Grafikleri yeniden boyutlandır/çiz (gizli sekmeden çıkınca Chart.js boyutu şaşabilir)
  if (tabId === 'dashboard') {
    setTimeout(() => {
      if (charts.questions) charts.questions.resize();
      if (charts.nets) charts.nets.resize();
    }, 100);
  }
}

// YKS Sınavına Geri Sayım (Haziran 2027 YKS)
function startCountdown() {
  const countdownEl = document.getElementById('yks-countdown');
  const detailEl = document.getElementById('yks-countdown-detail');
  const progressFill = document.getElementById('yks-progress-fill');
  
  if (!countdownEl || !detailEl || !progressFill) return;
  
  // 1 Eylül 2025 akademik yıl başlangıcı (ilerlemeyi görebilmek için)
  const startDate = new Date('September 1, 2025 00:00:00').getTime();
  // Sınav tarihi: localStorage'dan al, yoksa varsayılan 19 Haziran 2027
  const examDate = new Date(getExamDate() + 'T10:15:00').getTime();
  const totalDuration = examDate - startDate;
  
  function update() {
    const now = new Date().getTime();
    const diff = examDate - now;
    
    if (diff < 0) {
      countdownEl.innerText = "YKS Sınavı Yapıldı!";
      detailEl.innerText = "Sınav süreci tamamlandı.";
      progressFill.style.width = "100%";
      return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const weeks = Math.ceil(days / 7);
    
    countdownEl.innerText = `Son ${weeks} Hafta Kaldı`;
    detailEl.innerText = `Sınava tam ${days} gün, ${hours} saat kaldı`;
    
    // Calculate progress based on a 360-day period (proportional decrease)
    let remainingDays = diff / (1000 * 60 * 60 * 24);
    if (remainingDays < 0) remainingDays = 0;
    
    let percent = (remainingDays / 360) * 100;
    if (percent > 100) percent = 100;
    
    progressFill.style.width = `${percent}%`;
    
    // Daralan vakte göre renk tonlaması
    if (percent > 85) {
      progressFill.style.backgroundColor = 'var(--color-danger)';
    } else if (percent > 60) {
      progressFill.style.backgroundColor = 'var(--color-warning)';
    } else {
      progressFill.style.backgroundColor = 'var(--color-primary)';
    }
  }
  
  update();
  setInterval(update, 60000); // Dakikada bir güncelle
}

// Arayüz Yenileme (UI Refresh)
function refreshUI() {
  const data = getStudentData(currentStudent);
  
  // 1. Dashboard Kartları
    // Dashboard Kartları
  updateDashboardStats(data);
  
  // Canlı Seans Güncellemesi
  populateLiveTasks();
  updateLiveSessionUI();
  
  // 2. Dashboard Grafikler
  renderDashboardCharts(data);
  
  // 3. Soru Tablosu
  renderSolvedTable(data);
  
  // 4. Deneme Tablosu
  renderMockTable(data);

  // 5. Kaynaklar
  if (activeTab === 'kaynak-takip') renderBooks();
}

// Dashboard İstatistik Hesaplamaları
function updateDashboardStats(data) {
  // Toplam Soru Çözümü
  let totalSolved = 0;
  let totalCorrect = 0;
  let totalWrong = 0;
  
  data.dailyLog.forEach(log => {
    totalSolved += parseInt(log.solved);
    totalCorrect += parseInt(log.correct);
    totalWrong += parseInt(log.wrong);
  });
  
  document.getElementById('stat-total-solved').innerText = totalSolved;
  
  // Doğruluk Oranı (Başarı Oranı)
  const totalAnswered = totalCorrect + totalWrong;
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  document.getElementById('stat-accuracy-rate').innerText = `%${accuracy}`;
  
  // TYT Ortalama Net
  const tytDenemes = data.mockLog.filter(m => m.type === 'TYT');
  const tytAvg = tytDenemes.length > 0 
    ? (tytDenemes.reduce((sum, d) => sum + d.totalNet, 0) / tytDenemes.length).toFixed(2)
    : '0.00';
  document.getElementById('stat-tyt-avg').innerText = tytAvg;

  // AYT Ortalama Net
  const aytDenemes = data.mockLog.filter(m => m.type === 'AYT');
  const aytAvg = aytDenemes.length > 0 
    ? (aytDenemes.reduce((sum, d) => sum + d.totalNet, 0) / aytDenemes.length).toFixed(2)
    : '0.00';
  document.getElementById('stat-ayt-avg').innerText = aytAvg;

  // Trend / Gelişim Hızı Hesaplaması
  // Son 7 günün soru sayısı ile önceki 7 günün karşılaştırılması
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  
  let thisWeekSolved = 0;
  let lastWeekSolved = 0;
  
  data.dailyLog.forEach(log => {
    const logDate = new Date(log.date);
    if (logDate >= oneWeekAgo) {
      thisWeekSolved += parseInt(log.solved);
    } else if (logDate >= twoWeeksAgo && logDate < oneWeekAgo) {
      lastWeekSolved += parseInt(log.solved);
    }
  });

  const solvedTrendEl = document.getElementById('solved-trend');
  if (lastWeekSolved > 0) {
    const changePct = Math.round(((thisWeekSolved - lastWeekSolved) / lastWeekSolved) * 100);
    if (changePct >= 0) {
      solvedTrendEl.innerHTML = `<span class="trend-up">▲ %${changePct}</span> geçen haftaya göre`;
    } else {
      solvedTrendEl.innerHTML = `<span class="trend-down">▼ %${Math.abs(changePct)}</span> geçen haftaya göre`;
    }
  } else {
    solvedTrendEl.innerHTML = `<span class="trend-neutral">● --</span> veri yetersiz`;
  }
  
  // Haftalık Hedef İlerlemesi
  let taskGoal = 0;
  let durationGoal = 0;
  if (data.tasks) {
    data.tasks.forEach(t => {
      taskGoal += (parseInt(t.questionTarget) || 0);
      durationGoal += (parseInt(t.durationTarget) || 0);
    });
  }
  const displayGoal = taskGoal;
  const displayDurationGoal = durationGoal;
  
  let thisWeekDuration = 0;
  data.dailyLog.forEach(log => {
    const logDate = new Date(log.date);
    if (logDate >= oneWeekAgo) {
      thisWeekDuration += (parseInt(log.duration) || 0);
    }
  });
  
  document.getElementById('goal-max-solved').innerText = displayGoal;
  document.getElementById('goal-current-solved').innerText = thisWeekSolved;
  const goalPct = displayGoal > 0 ? Math.min(100, Math.round((thisWeekSolved / displayGoal) * 100)) : 0;
  document.getElementById('goal-progress-fill').style.width = `${goalPct}%`;
  document.getElementById('goal-progress-pct').innerText = `%${goalPct}`;

  const durationMaxEl = document.getElementById('goal-max-duration');
  if (durationMaxEl) {
      durationMaxEl.innerText = displayDurationGoal;
      document.getElementById('goal-current-duration').innerText = thisWeekDuration;
      const durationPct = displayDurationGoal > 0 ? Math.min(100, Math.round((thisWeekDuration / displayDurationGoal) * 100)) : 0;
      document.getElementById('duration-progress-fill').style.width = `${durationPct}%`;
      document.getElementById('duration-progress-pct').innerText = `%${durationPct}`;
  }


  // Update Personal Goal Card
  const goalContent = document.getElementById('goal-display-content');
  
  if (goalContent) {
    if (data.personalGoal && data.personalGoal.ranking) {
      let text = `<strong style="color:var(--color-warning); font-size:16px;">${data.personalGoal.ranking}</strong>`;
      if (data.personalGoal.university || data.personalGoal.profession) {
        const uniInfo = [data.personalGoal.university, data.personalGoal.profession].filter(Boolean).join(" - ");
        text += ` <br><span style="font-size:13px;">${uniInfo}</span>`;
      }
      goalContent.innerHTML = text;
    } else {
      goalContent.innerHTML = "Hedefin henüz belirlenmedi. Hedefini belirle ve başarıya odaklan!";
    }
  }
  
  const goalEditIcon = document.getElementById('goal-edit-icon');
  const goalCard = document.getElementById('personal-goal-card');
  
  if (goalEditIcon && goalCard) {
    if (currentUserSession && currentUserSession.role === 'student') {
      goalEditIcon.style.display = 'inline-block';
      goalCard.style.cursor = 'pointer';
    } else {
      goalEditIcon.style.display = 'none';
      goalCard.style.cursor = 'default';
    }
  }

  // --- V2 GAMIFICATION UPDATE ---
  const xp = calculateStudentXP(data);
  const levelInfo = getStudentLevelInfo(xp);
  
  const badgeEl = document.getElementById('level-badge');
  if (badgeEl) {
    badgeEl.innerText = levelInfo.badge;
    document.getElementById('level-title').innerText = levelInfo.title;
    document.getElementById('level-title').style.color = levelInfo.colorStart;
    document.getElementById('level-xp').innerText = `Toplam XP: ${xp}`;
    
    if (levelInfo.nextXP > xp) {
      const remaining = levelInfo.nextXP - xp;
      document.getElementById('level-progress-text').innerText = `Sonraki Lige: ${remaining} XP`;
      const range = levelInfo.nextXP - levelInfo.minXP;
      const currentProgress = xp - levelInfo.minXP;
      const pct = Math.round((currentProgress / range) * 100);
      document.getElementById('level-pct').innerText = `%${pct}`;
      document.getElementById('level-progress-fill').style.width = `${pct}%`;
      document.getElementById('level-progress-fill').style.background = `linear-gradient(90deg, ${levelInfo.colorStart}, ${levelInfo.colorEnd})`;
    } else {
      document.getElementById('level-progress-text').innerText = "Son Ligdesin!";
      document.getElementById('level-pct').innerText = "%100";
      document.getElementById('level-progress-fill').style.width = "100%";
      document.getElementById('level-progress-fill').style.background = `linear-gradient(90deg, ${levelInfo.colorStart}, ${levelInfo.colorEnd})`;
    }
  }

  // Streak Update
  const streakEl = document.getElementById('streak-counter');
  if (streakEl) {
     streakEl.innerText = `🔥 ${data.streak || 0} Günlük Seri`;
     streakEl.style.filter = ((data.streak || 0) > 0) ? 'none' : 'grayscale(100%) opacity(50%)';
  }
  
  // Badges Update
  const badgesContainer = document.getElementById('earned-badges-container');
  if (badgesContainer) {
    if (data.badges && data.badges.length > 0) {
       badgesContainer.innerHTML = data.badges.map(b => `<div style="background:rgba(255,255,255,0.1); border:1px solid var(--border-color); padding:5px 10px; border-radius:15px; font-size:12px; font-weight:600; display:flex; align-items:center; gap:5px;" title="${b.desc}">${b.icon} ${b.name}</div>`).join('');
    } else {
       badgesContainer.innerHTML = `<span style="font-size:12px; color:var(--text-muted);">Henüz rozet kazanılmadı. Görevleri tamamlayarak rozet kazan!</span>`;
    }
  }

  // Quests Update (Middle Area)
  const questsContainer = document.getElementById('quest-list-container');
  if (questsContainer) {
     const today = new Date().toLocaleDateString('tr-TR', { weekday: 'long' });
     const activeQuests = data.tasks.filter(t => t.day === today);
     let completedCount = 0;
     
     if (activeQuests.length === 0) {
        questsContainer.innerHTML = `<div style="font-size:13px; color:var(--text-muted); padding:10px; background:rgba(0,0,0,0.02); border-radius:6px; text-align:center;">Bugün için planlanmış görev yok.</div>`;
     } else {
        questsContainer.innerHTML = activeQuests.map(q => {
           if (q.checked) completedCount++;
           const boxCount = 5;
           const boxesHTML = Array(boxCount).fill(0).map((_, i) => {
              const isFilled = q.checked ? true : false;
              return `<div style="width:12px; height:12px; border-radius:3px; background:${isFilled ? 'var(--color-primary)' : 'rgba(0,0,0,0.1)'};"></div>`;
           }).join('');
           
           return `<div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:var(--bg-main); border:1px solid ${q.checked ? 'var(--color-primary)' : 'var(--border-color)'}; border-radius:var(--radius-md); opacity:${q.checked ? '0.7' : '1'}; transition:0.2s;">
              <div style="display:flex; align-items:center; gap:10px;">
                 <input type="checkbox" ${q.checked ? 'checked' : ''} disabled style="transform:scale(1.2);">
                 <div>
                    <div style="font-size:13px; font-weight:600; color:var(--text-main); text-decoration:${q.checked ? 'line-through' : 'none'};">${q.text}</div>
                    <div style="font-size:11px; color:var(--text-muted);">${q.questionTarget || 0} Soru Hedefi</div>
                 </div>
              </div>
              <div style="display:flex; gap:3px;">${boxesHTML}</div>
           </div>`;
        }).join('');
     }
     document.getElementById('quest-completion-text').innerText = `${completedCount}/${activeQuests.length} Görev`;
  }
  
  // Weekly Chest Update (Bottom Area)
  const chestFill = document.getElementById('chest-progress-fill');
  const chestText = document.getElementById('chest-progress-text');
  if (chestFill && chestText) {
     const remainingChest = Math.max(0, displayGoal - thisWeekSolved);
     if (remainingChest === 0 && displayGoal > 0) {
        chestText.innerText = "Sandık Açıldı! 🏆";
        chestText.style.color = "var(--color-correct)";
        chestFill.style.width = "100%";
        chestFill.style.background = "var(--color-correct)";
     } else if (displayGoal > 0) {
        chestText.innerText = `Sandığın açılmasına son ${remainingChest} soru!`;
        chestFill.style.width = `${Math.round((thisWeekSolved / displayGoal) * 100)}%`;
        chestText.style.color = "var(--text-muted)";
        chestFill.style.background = "var(--color-warning)";
     } else {
        chestText.innerText = `Bu hafta hedef atanmadı.`;
        chestFill.style.width = "0%";
     }
  }
}


// Chart.js Grafikleri Çizme
function renderDashboardCharts(data) {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

  // 1. Grafik: Son 7 Gün Soru Sayısı Grafiği
  const ctxQuestions = document.getElementById('chart-questions').getContext('2d');
  
  // Son 7 günün tarih etiketlerini oluştur (bugünden geriye doğru)
  const labels = [];
  const questionCounts = [];
  const correctCounts = [];
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    // Tarih etiketi (Örn: "24 Tem")
    const formattedLabel = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    labels.push(formattedLabel);
    
    // O güne ait toplam soru ve doğruları bul
    let daySolved = 0;
    let dayCorrect = 0;
    data.dailyLog.forEach(log => {
      if (log.date === dateStr) {
        daySolved += parseInt(log.solved);
        dayCorrect += parseInt(log.correct);
      }
    });
    questionCounts.push(daySolved);
    correctCounts.push(dayCorrect);
  }

  if (charts.questions) {
    charts.questions.destroy();
  }

  charts.questions = new Chart(ctxQuestions, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Çözülen Soru',
          data: questionCounts,
          backgroundColor: 'rgba(139, 92, 246, 0.65)',
          borderColor: '#8b5cf6',
          borderWidth: 1.5,
          borderRadius: 4
        },
        {
          label: 'Doğru Cevap',
          data: correctCounts,
          backgroundColor: 'rgba(16, 185, 129, 0.65)',
          borderColor: '#10b981',
          borderWidth: 1.5,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 11 } }
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 11 } },
          beginAtZero: true
        }
      },
      plugins: {
        legend: {
          labels: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 12, weight: '500' } }
        }
      }
    }
  });

  // 2. Grafik: Deneme Net Gelişim Grafiği
  const ctxNets = document.getElementById('chart-nets').getContext('2d');
  
  // Tarihe göre sıralanmış denemeler
  const sortedDenemes = [...data.mockLog].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  const netLabels = sortedDenemes.map(d => {
    const dateObj = new Date(d.date);
    return `${d.name} (${dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })})`;
  });
  
  const tytNets = [];
  const aytNets = [];
  
  // Grafikte kesintiyi önlemek için her deneme noktasını yerleştirelim
  sortedDenemes.forEach(d => {
    if (d.type === 'TYT') {
      tytNets.push(d.totalNet);
      aytNets.push(null);
    } else {
      tytNets.push(null);
      aytNets.push(d.totalNet);
    }
  });

  if (charts.nets) {
    charts.nets.destroy();
  }

  charts.nets = new Chart(ctxNets, {
    type: 'line',
    data: {
      labels: netLabels,
      datasets: [
        {
          label: 'TYT Neti',
          data: tytNets,
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.1)',
          borderWidth: 3,
          spanGaps: true,
          tension: 0.35,
          pointBackgroundColor: '#06b6d4',
          pointRadius: 5
        },
        {
          label: 'AYT Neti',
          data: aytNets,
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          borderWidth: 3,
          spanGaps: true,
          tension: 0.35,
          pointBackgroundColor: '#8b5cf6',
          pointRadius: 5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 10 } }
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 11 } },
          min: 0,
          max: 120
        }
      },
      plugins: {
        legend: {
          labels: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 12, weight: '500' } }
        }
      }
    }
  });
}

// Soru Girişi Kaydetme
function handleAddSolved(e) {
  e.preventDefault();
  const date = document.getElementById('solved-date').value;
  const tytAyt = document.getElementById('solved-exam-type').value;
  const subject = document.getElementById('solved-subject').value;
  const solved = parseInt(document.getElementById('solved-count').value);
  const correct = parseInt(document.getElementById('solved-correct').value);
  const wrong = parseInt(document.getElementById('solved-wrong').value);

  // Doğrulama
  if (!date || !subject || isNaN(solved) || isNaN(correct) || isNaN(wrong)) {
    showToast('Lütfen tüm alanları doldurun.', 'wrong');
    return;
  }

  if (correct + wrong > solved) {
    showToast('Doğru ve yanlış soru toplamı, çözülen soru sayısından fazla olamaz.', 'wrong');
    return;
  }

  const data = getStudentData(currentStudent);
  const newLog = {
    id: Date.now().toString(),
    date,
    tytAyt,
    subject,
    solved,
    correct,
    wrong
  };

  data.dailyLog.push(newLog);
  // Tarihe göre sırala (en yeni üstte)
  data.dailyLog.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  saveStudentData(currentStudent, data);
  showToast('Soru kaydı başarıyla eklendi.', 'success');
  
  // Formu temizle ve arayüzü güncelle
  e.target.reset();
  setTodayDate('solved-date');
  refreshUI();
}

// Soru Kaydı Silme
function deleteSolved(id) {
  const data = getStudentData(currentStudent);
  data.dailyLog = data.dailyLog.filter(log => log.id !== id);
  saveStudentData(currentStudent, data);
  showToast('Soru kaydı silindi.', 'info');
  refreshUI();
}

// Soru Tablosunu Çizme
function renderSolvedTable(data) {
  const tbody = document.getElementById('solved-table-body');
  tbody.innerHTML = '';
  
  if (data.dailyLog.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">Henüz soru çözümü kaydedilmemiş.</td></tr>`;
    return;
  }

  data.dailyLog.forEach(log => {
    const tr = document.createElement('tr');
    
    // Net hesaplama
    const net = (log.correct - (log.wrong * 0.25)).toFixed(2);
    const dateFormatted = new Date(log.date).toLocaleDateString('tr-TR');

    tr.innerHTML = `
      <td>${dateFormatted}</td>
      <td><span class="badge ${log.tytAyt === 'TYT' ? 'badge-tyt' : 'badge-ayt'}">${log.tytAyt}</span></td>
      <td><strong>${log.subject}</strong></td>
      <td>${log.solved}</td>
      <td><span class="badge badge-correct">${log.correct} D</span></td>
      <td><span class="badge badge-wrong">${log.wrong} Y</span></td>
      <td><span class="badge" style="background: var(--bg-card-alt); color: var(--text-muted); border: 1px solid var(--border-color);">${log.blank || 0} B</span></td>
      <td style="font-weight: 700; color: var(--color-primary);">${net} Net</td>
      <td class="actions-cell">
        <button class="btn-delete-row" onclick="deleteSolved('${log.id}')" title="Sil">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Deneme Kaydı Ekleme
function handleAddMock(e) {
  e.preventDefault();
  const date = document.getElementById('mock-date').value;
  const type = document.getElementById('mock-type').value;
  const name = document.getElementById('mock-name').value;

  if (!date || !name) {
    showToast('Lütfen tarih ve sınav adını girin.', 'wrong');
    return;
  }

  const results = {};
  const nets = {};
  let totalCorrect = 0;
  let totalWrong = 0;

  // Ders alanlarını çek ve net hesapla
  let examFields = [];
  if (type === 'TYT') {
    examFields = ['Turkce', 'Sosyal', 'Matematik', 'Fen'];
  } else {
    examFields = ['Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Edebiyat', 'Tarih1', 'Cografya1'];
  }

  for (const field of examFields) {
    const corrVal = parseInt(document.getElementById(`mock-c-${field}`).value) || 0;
    const wrngVal = parseInt(document.getElementById(`mock-w-${field}`).value) || 0;
    
    results[field] = { correct: corrVal, wrong: wrngVal };
    const netVal = corrVal - (wrngVal * 0.25);
    nets[field] = netVal;
    
    totalCorrect += corrVal;
    totalWrong += wrngVal;
  }

  const totalNet = totalCorrect - (totalWrong * 0.25);

  // YKS Puan Hesaplama
  const estimatedScores = calculateEstimatedYKSScores(type, nets);

  const data = getStudentData(currentStudent);
  const newMock = {
    id: Date.now().toString(),
    date,
    type,
    name,
    results,
    nets,
    totalNet,
    scores: estimatedScores
  };

  data.mockLog.push(newMock);
  data.mockLog.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  saveStudentData(currentStudent, data);
  showToast('Deneme sınavı başarıyla kaydedildi.', 'success');
  
  e.target.reset();
  setTodayDate('mock-date');
  refreshUI();
  
  // Deneme form alanlarını sıfırla/güncelle
  updateMockFormFields();
}

// Katsayılara göre puan hesaplama
function calculateEstimatedYKSScores(type, nets) {
  // Katsayı Modeli (Yaklaşık YKS Katsayıları)
  // TYT Netleri: Türkçe (40), Sos (20), Mat (40), Fen (20). Max 120 net.
  // AYT Netleri: Matematik (40), Fizik (14), Kimya (13), Biyoloji (13), Edebiyat (24), Tarih1 (10), Coğrafya1 (6).
  
  let SAY = 100;
  let EA = 100;
  let SOZ = 100;
  let TYT = 100;

  if (type === 'TYT') {
    const t_net = nets.Turkce || 0;
    const s_net = nets.Sosyal || 0;
    const m_net = nets.Matematik || 0;
    const f_net = nets.Fen || 0;
    
    // TYT puanı (max 500)
    TYT += (t_net * 3.3) + (s_net * 3.4) + (m_net * 3.3) + (f_net * 3.4);
    // Diğer puan türleri için TYT katkısı (ÖSYM TYT'nin %40'ını alır)
    const tytContribution = (t_net * 1.32) + (s_net * 1.36) + (m_net * 1.32) + (f_net * 1.36);
    SAY += tytContribution;
    EA += tytContribution;
    SOZ += tytContribution;
  } else {
    // AYT Sınavı girildiğinde, TYT netleri olarak son TYT denemesinin ortalamasını alalım veya varsayılan 40 net ekleyelim
    const data = getStudentData(currentStudent);
    const lastTyt = data.mockLog.find(m => m.type === 'TYT');
    let tytContribution = 45; // Varsayılan TYT katkısı (Hiç TYT denemesi yoksa)
    
    if (lastTyt) {
      const t_net = lastTyt.nets.Turkce || 0;
      const s_net = lastTyt.nets.Sosyal || 0;
      const m_net = lastTyt.nets.Matematik || 0;
      const f_net = lastTyt.nets.Fen || 0;
      tytContribution = (t_net * 1.32) + (s_net * 1.36) + (m_net * 1.32) + (f_net * 1.36);
    }
    
    SAY += tytContribution;
    EA += tytContribution;
    SOZ += tytContribution;

    const aytMat = nets.Matematik || 0;
    const aytFiz = nets.Fizik || 0;
    const aytKim = nets.Kimya || 0;
    const aytBiy = nets.Biyoloji || 0;
    const aytEdeb = nets.Edebiyat || 0;
    const aytTar1 = nets.Tarih1 || 0;
    const aytCog1 = nets.Cografya1 || 0;

    // SAYISAL Puan
    SAY += (aytMat * 3.0) + (aytFiz * 2.85) + (aytKim * 3.07) + (aytBiy * 3.07);
    
    // EŞİT AĞIRLIK Puan
    EA += (aytMat * 3.0) + (aytEdeb * 3.0) + (aytTar1 * 2.8) + (aytCog1 * 3.33);

    // SÖZEL Puan (AYT Edeb + Tar1 + Cog1 ve diğer sözel konular)
    SOZ += (aytEdeb * 3.0) + (aytTar1 * 2.8) + (aytCog1 * 3.33) + 60; // Geri kalanı için yaklaşık 60 puan ekleyelim
  }

  return {
    TYT: Math.min(500, Math.round(TYT)),
    SAY: Math.min(500, Math.round(SAY)),
    EA: Math.min(500, Math.round(EA)),
    SOZ: Math.min(500, Math.round(SOZ))
  };
}

// Deneme Kaydı Silme
function deleteMock(id) {
  const data = getStudentData(currentStudent);
  data.mockLog = data.mockLog.filter(m => m.id !== id);
  saveStudentData(currentStudent, data);
  showToast('Deneme sınavı kaydı silindi.', 'info');
  refreshUI();
}

// Deneme Tablosunu Çizme
function renderMockTable(data) {
  const tbody = document.getElementById('mock-table-body');
  tbody.innerHTML = '';
  
  if (data.mockLog.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">Henüz deneme sınavı kaydedilmemiş.</td></tr>`;
    return;
  }

  data.mockLog.forEach(mock => {
    const tr = document.createElement('tr');
    const dateFormatted = new Date(mock.date).toLocaleDateString('tr-TR');
    
    // Detay metni oluşturma
    let detailHtml = '';
    if (mock.type === 'TYT') {
      detailHtml = `
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
          T: ${mock.nets.Turkce} | S: ${mock.nets.Sosyal} | M: ${mock.nets.Matematik} | F: ${mock.nets.Fen}
        </div>
      `;
    } else {
      detailHtml = `
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
          Mat: ${mock.nets.Matematik} | Fiz: ${mock.nets.Fizik} | Kim: ${mock.nets.Kimya} | Biy: ${mock.nets.Biyoloji} | Edeb: ${mock.nets.Edebiyat}
        </div>
      `;
    }

    // Puan gösterimi (Türe göre)
    let scoreDisplay = '';
    if (mock.type === 'TYT') {
      const pScore = mock.scores.TYT + 51; // +51 OBP eklenmiş tahmini yerleştirme puanı
      const range = getRankAndPercentileRange('TYT', pScore);
      scoreDisplay = `
        <div>TYT: <strong>${mock.scores.TYT}</strong></div>
        <div style="font-size:10px; color:var(--text-muted); margin-top:2px; font-weight:600;">Sıralama: ${range.rangeStr}</div>
      `;
    } else {
      const sayP = mock.scores.SAY + 51;
      const eaP = mock.scores.EA + 51;
      const rangeSay = getRankAndPercentileRange('SAY', sayP);
      const rangeEa = getRankAndPercentileRange('EA', eaP);
      scoreDisplay = `
        <div style="margin-bottom: 2px;">SAY: <strong>${mock.scores.SAY}</strong> <span style="font-size:10px; color:var(--text-muted); font-weight:600;">(${rangeSay.rangeStr})</span></div>
        <div>EA: <strong>${mock.scores.EA}</strong> <span style="font-size:10px; color:var(--text-muted); font-weight:600;">(${rangeEa.rangeStr})</span></div>
      `;
    }

    tr.innerHTML = `
      <td>${dateFormatted}</td>
      <td><span class="badge ${mock.type === 'TYT' ? 'badge-tyt' : 'badge-ayt'}">${mock.type}</span></td>
      <td>
        <strong>${mock.name}</strong>
        ${detailHtml}
      </td>
      <td style="font-weight: 700; color: var(--color-secondary); font-size: 15px;">${mock.totalNet.toFixed(2)} Net</td>
      <td>${scoreDisplay}</td>
      <td class="actions-cell">
        <button class="btn-delete-row" onclick="deleteMock('${mock.id}')" title="Sil">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Deneme Formu Sınav Türü Seçimine Göre Giriş Alanlarını Güncelleme
function updateMockFormFields() {
  const type = document.getElementById('mock-type').value;
  const container = document.getElementById('mock-subjects-inputs');
  container.innerHTML = '';

  let fields = [];
  if (type === 'TYT') {
    fields = [
      { id: 'Turkce', name: 'Türkçe (40 Soru)' },
      { id: 'Sosyal', name: 'Sosyal Bilimler (20 Soru)' },
      { id: 'Matematik', name: 'Temel Matematik (40 Soru)' },
      { id: 'Fen', name: 'Fen Bilimleri (20 Soru)' }
    ];
  } else {
    fields = [
      { id: 'Matematik', name: 'AYT Matematik (40 Soru)' },
      { id: 'Fizik', name: 'AYT Fizik (14 Soru)' },
      { id: 'Kimya', name: 'AYT Kimya (13 Soru)' },
      { id: 'Biyoloji', name: 'AYT Biyoloji (13 Soru)' },
      { id: 'Edebiyat', name: 'AYT Türk Dili ve Ed. (24 Soru)' },
      { id: 'Tarih1', name: 'AYT Tarih-1 (10 Soru)' },
      { id: 'Cografya1', name: 'AYT Coğrafya-1 (6 Soru)' }
    ];
  }

  fields.forEach(field => {
    const div = document.createElement('div');
    div.className = 'form-group section-box';
    div.innerHTML = `
      <div style="font-size:13px; font-weight:700; margin-bottom:8px; color:var(--text-main);">${field.name}</div>
      <div class="form-row-double">
        <div>
          <label>Doğru</label>
          <input type="number" id="mock-c-${field.id}" min="0" max="40" placeholder="0" class="form-input">
        </div>
        <div>
          <label>Yanlış</label>
          <input type="number" id="mock-w-${field.id}" min="0" max="40" placeholder="0" class="form-input">
        </div>
      </div>
    `;
    container.appendChild(div);
  });
}

// Konu Takip Sayfası
let currentSubjectType = 'TYT';
let currentSubjectName = 'Türkçe';

function renderTopicTracker() {
  const data = getStudentData(currentStudent);
  
  // Ders Listesini Hazırla
  const subjectListContainer = document.getElementById('subject-list');
  subjectListContainer.innerHTML = '';
  
  const subjects = Object.keys(YKS_TOPICS[currentSubjectType]);
  
  // Konu Tabı Butonlarını Aktifleştir
  document.getElementById('topic-tab-tyt').classList.toggle('active', currentSubjectType === 'TYT');
  document.getElementById('topic-tab-ayt').classList.toggle('active', currentSubjectType === 'AYT');

  // Varsayılan aktif dersi kontrol et
  if (!subjects.includes(currentSubjectName)) {
    currentSubjectName = subjects[0];
  }

  subjects.forEach(subject => {
    const btn = document.createElement('button');
    btn.className = `subject-btn ${subject === currentSubjectName ? 'active' : ''}`;
    
    // Ders tamamlama yüzdesi hesapla
    const topicList = YKS_TOPICS[currentSubjectType][subject];
    let completedCount = 0;
    topicList.forEach(topic => {
      const key = `${currentSubjectType}_${subject}_${topic}`;
      if (data.topicStatus[key] === 'completed') {
        completedCount++;
      }
    });
    const pct = topicList.length > 0 ? Math.round((completedCount / topicList.length) * 100) : 0;

    btn.innerHTML = `
      <span>${subject}</span>
      <span class="subject-progress">%${pct}</span>
    `;
    
    btn.onclick = () => {
      currentSubjectName = subject;
      renderTopicTracker();
    };
    
    subjectListContainer.appendChild(btn);
  });

  // Konuları Listele
  const topicItemsContainer = document.getElementById('topic-items');
  topicItemsContainer.innerHTML = '';
  
  const topics = YKS_TOPICS[currentSubjectType][currentSubjectName] || [];
  
  topics.forEach(topic => {
    const key = `${currentSubjectType}_${currentSubjectName}_${topic}`;
    const status = data.topicStatus[key] || 'not_started';
    
    const div = document.createElement('div');
    div.className = 'topic-row';
    div.innerHTML = `
      <div class="topic-name-col">${topic}</div>
      <div>
        <select class="topic-status-select status-${status}" data-key="${key}" onchange="changeTopicStatus(this)">
          <option value="not_started" ${status === 'not_started' ? 'selected' : ''}>Başlanmadı</option>
          <option value="studying" ${status === 'studying' ? 'selected' : ''}>Çalışılıyor</option>
          <option value="review" ${status === 'review' ? 'selected' : ''}>Tekrar Edilmeli</option>
          <option value="completed" ${status === 'completed' ? 'selected' : ''}>Tamamlandı</option>
        </select>
      </div>
    `;
    
    topicItemsContainer.appendChild(div);
  });
}

// Konu Durumu Değiştirme
function changeTopicStatus(selectEl) {
  const key = selectEl.dataset.key;
  const newStatus = selectEl.value;
  
  const data = getStudentData(currentStudent);
  data.topicStatus[key] = newStatus;
  saveStudentData(currentStudent, data);
  
  // Select rengini güncelle
  selectEl.className = `topic-status-select status-${newStatus}`;
  
  // Yan menüdeki ilerleme yüzdesini güncellemek için
  renderTopicTracker();
  refreshUI();
}

function switchTopicType(type) {
  currentSubjectType = type;
  currentSubjectName = Object.keys(YKS_TOPICS[type])[0];
  renderTopicTracker();
}

// Çalışma Programı & Görev Atama (Weekly Planner)
function renderWeeklyPlanner() {
  const data = getStudentData(currentStudent);
  const isStudent = currentUserSession && currentUserSession.role === 'student';
  
  // Akıllı Görev Kitap Listesini Doldur
  populateSmartTaskBooks();
  
  // 1. Haftalık Görevleri Listele
  const tasksContainer = document.getElementById('planner-tasks-list');
  tasksContainer.innerHTML = '';
  
  if (!data.tasks || data.tasks.length === 0) {
    tasksContainer.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:13px; padding:20px;">Henüz koçluk görevi eklenmemiş.</div>`;
  } else {
    // Mevcut görevlerdeki tüm benzersiz günleri bul ve sırala
    const allDayValues = [...new Set(data.tasks.map(t => t.day || 'Belirtilmemiş'))];
    // "X. Gün" formatında olanları sayısal olarak sırala
    allDayValues.sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      if (!isNaN(numA)) return -1;
      if (!isNaN(numB)) return 1;
      return a.localeCompare(b, 'tr');
    });
    const startDate = getProgramStartDate();
    
    allDayValues.forEach(day => {
      const dayTasks = data.tasks.filter(t => t.day === day || (!t.day && day === 'Belirtilmemiş'));
      
      if (dayTasks.length > 0) {
        const dayHeader = document.createElement('h3');
        // Tarih bilgisi ekle
        let headerLabel = day;
        const dayNum = parseInt(day);
        if (!isNaN(dayNum) && startDate) {
          const d = new Date(startDate);
          d.setDate(d.getDate() + (dayNum - 1));
          headerLabel += ` — ${d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' })}`;
        }
        dayHeader.style.cssText = "margin: 15px 0 5px 0; font-size: 14px; color: var(--color-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 5px;";
        dayHeader.innerText = headerLabel;
        tasksContainer.appendChild(dayHeader);
        
        dayTasks.forEach(task => {
          const div = document.createElement('div');
          div.className = 'task-item';
          
          let taskDetails = '';
          if (task.questionTarget || task.durationTarget) {
            taskDetails = `<div style="font-size:11px; color:var(--text-muted); margin-top:2px;">
              ${task.questionTarget ? `🎯 ${task.questionTarget} Soru ` : ''} 
              ${task.durationTarget ? `⏱️ ${task.durationTarget} dk` : ''}
            </div>`;
          }
          
          div.innerHTML = `
            <div class="task-content">
              <div class="task-checkbox ${task.checked ? 'checked' : ''}" onclick="toggleTask('${task.id}')">
                ${task.checked ? '✓' : ''}
              </div>
              <div style="display:flex; flex-direction:column;">
                <span class="task-text">${task.text}</span>
                ${taskDetails}
              </div>
            </div>
            ${isStudent ? '' : `
              <div style="display:flex; gap:8px;">
                <button onclick="editTask('${task.id}')" title="Düzenle" style="background:none; border:none; cursor:pointer; font-size:16px; padding:0;">✏️</button>
                <button class="task-delete" onclick="deleteTask('${task.id}')" title="Sil">🗑️</button>
              </div>
            `}
          `;
          tasksContainer.appendChild(div);
        });
      }
    });
  }

  // 2. Eksik Konu Önerileri Oluştur
  // Çözülen sorulardaki yanlış oranlarına göre sistem otomatik analiz yapar.
  // Yanlış sayısı / (Doğru + Yanlış) > %25 olan derslerde, "Tekrar Edilmeli" veya "Başlanmadı" durumdaki konuları öneririz.
  const suggestionsContainer = document.getElementById('missing-topics-suggestions');
  suggestionsContainer.innerHTML = '';

  const subjectStats = {};
  data.dailyLog.forEach(log => {
    const key = `${log.tytAyt}_${log.subject}`;
    if (!subjectStats[key]) {
      subjectStats[key] = { solved: 0, correct: 0, wrong: 0 };
    }
    subjectStats[key].solved += parseInt(log.solved);
    subjectStats[key].correct += parseInt(log.correct);
    subjectStats[key].wrong += parseInt(log.wrong);
  });

  const weakSubjects = [];
  for (const key in subjectStats) {
    const stat = subjectStats[key];
    const totalAnswered = stat.correct + stat.wrong;
    if (totalAnswered >= 30) { // En az 30 soruluk veri girdiyse analiz yap
      const wrongPct = stat.wrong / totalAnswered;
      if (wrongPct > 0.22) { // %22'den fazla hata oranı varsa zayıf kabul et
        weakSubjects.push({ key, wrongPct: Math.round(wrongPct * 100) });
      }
    }
  }

  // Zayıf derslerden tamamlanmamış (review veya studying) 3 konu öner
  let suggestionCount = 0;
  
  weakSubjects.forEach(ws => {
    if (suggestionCount >= 4) return;
    
    const [tytAyt, subject] = ws.key.split('_');
    const topicsList = YKS_TOPICS[tytAyt][subject] || [];
    
    for (const topic of topicsList) {
      if (suggestionCount >= 4) break;
      
      const topicKey = `${tytAyt}_${subject}_${topic}`;
      const status = data.topicStatus[topicKey] || 'not_started';
      
      if (status === 'review' || status === 'studying' || status === 'not_started') {
        const div = document.createElement('div');
        div.className = 'missing-topic-card';
        
        let statusText = 'Çalışılmadı';
        if (status === 'review') statusText = 'Tekrar Edilecek';
        if (status === 'studying') statusText = 'Çalışılıyor';

        div.innerHTML = `
          <div class="missing-topic-info">
            <span class="missing-topic-name">${subject} - ${topic} (${tytAyt})</span>
            <span class="missing-topic-meta">Hata Oranı: %${ws.wrongPct} | Durum: ${statusText}</span>
          </div>
          ${isStudent ? '' : `<button class="btn-study-action" onclick="addTaskFromSuggestion('${subject} - ${topic} (${tytAyt}) konusunu çalış')">Görev Ekle</button>`}
        `;
        suggestionsContainer.appendChild(div);
        suggestionCount++;
      }
    }
  });

  if (suggestionCount === 0) {
    suggestionsContainer.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:13px; padding:20px;">Harika! Otomatik öneri için henüz zayıf bir alan saptanmadı ya da tüm konular tamamlandı.</div>`;
  }
}

// Şablon Program Yükleme
function loadSelectedTemplate() {
  const isStudent = currentUserSession && currentUserSession.role === 'student';
  if (isStudent) {
    showToast('Öğrenciler şablon yükleyemez.', 'error');
    return;
  }
  
  const select = document.getElementById('template-select');
  const level = select ? select.value : '';
  
  if (!level) {
    showToast('Lütfen bir şablon seçin.', 'warning');
    return;
  }
  
  const templateName = select.options[select.selectedIndex].text;
  if (!confirm(`${templateName} yüklenecek. Onaylıyor musunuz?`)) return;
  
  let template = [];
  
  if (level === 'lvl1') {
    template = [
      { day: 'Pazartesi', text: 'TYT Matematik - Temel Kavramlar (Konu + Antrenman)', questionTarget: 15, durationTarget: 45 },
      { day: 'Salı', text: 'TYT Türkçe - Paragrafta Ana Düşünce (Yavaş Okuma)', questionTarget: 15, durationTarget: 30 },
      { day: 'Çarşamba', text: 'TYT Tarih - İlk Çağ Uygarlıkları', questionTarget: 15, durationTarget: 30 },
      { day: 'Perşembe', text: 'TYT Coğrafya - Doğa ve İnsan', questionTarget: 15, durationTarget: 30 },
      { day: 'Cuma', text: 'TYT Biyoloji - Canlıların Ortak Özellikleri', questionTarget: 15, durationTarget: 30 },
      { day: 'Cumartesi', text: 'Genel Tekrar ve Kitap Okuma', questionTarget: 0, durationTarget: 60 }
    ];
  } else if (level === 'lvl2') {
    template = [
      { day: 'Pazartesi', text: 'TYT Matematik - Rasyonel Sayılar (Dört İşlem)', questionTarget: 30, durationTarget: 60 },
      { day: 'Salı', text: 'TYT Türkçe - Sözcükte Anlam', questionTarget: 30, durationTarget: 60 },
      { day: 'Çarşamba', text: 'TYT Fizik - Madde ve Özellikleri', questionTarget: 30, durationTarget: 60 },
      { day: 'Perşembe', text: 'TYT Kimya - Kimya Bilimi', questionTarget: 30, durationTarget: 60 },
      { day: 'Cuma', text: 'AYT Matematik - Fonksiyonlar (Özet)', questionTarget: 40, durationTarget: 90 },
      { day: 'Cumartesi', text: 'Bölüm Denemeleri (Türkçe + Sosyal)', questionTarget: 60, durationTarget: 90 },
      { day: 'Pazar', text: 'Haftalık Analiz ve Eksik Kapatma', questionTarget: 0, durationTarget: 60 }
    ];
  } else if (level === 'lvl3') {
    template = [
      { day: 'Pazartesi', text: 'AYT Matematik - Fonksiyonlarda Uygulamalar (Orta-Zor)', questionTarget: 60, durationTarget: 90 },
      { day: 'Salı', text: 'AYT Fizik - Vektörler ve Bağıl Hareket', questionTarget: 60, durationTarget: 90 },
      { day: 'Çarşamba', text: 'AYT Kimya - Modern Atom Teorisi', questionTarget: 60, durationTarget: 90 },
      { day: 'Perşembe', text: 'AYT Biyoloji - Sinir Sistemi', questionTarget: 60, durationTarget: 90 },
      { day: 'Cuma', text: 'TYT Matematik - Sayı Kesir Problemleri (Süreli)', questionTarget: 40, durationTarget: 60 },
      { day: 'Cumartesi', text: 'Genel TYT Denemesi (Süre Tutarak)', questionTarget: 120, durationTarget: 165 },
      { day: 'Pazar', text: 'Deneme Analizi ve Zor Soruların Çözümü', questionTarget: 30, durationTarget: 120 }
    ];
  }
  
  const data = getStudentData(currentStudent);
  template.forEach((t, i) => {
    data.tasks.push({
      id: Date.now().toString() + i,
      text: t.text,
      day: t.day,
      questionTarget: t.questionTarget,
      durationTarget: t.durationTarget,
      checked: false
    });
  });
  
  saveStudentData(currentStudent, data);
  if(typeof updateDashboardStats === 'function') updateDashboardStats(data);
  renderWeeklyPlanner();
  showToast('Şablon başarıyla yüklendi.', 'success');
}

// Görev Ekleme
function handleAddTask(e) {
  e.preventDefault();
  
  const day = document.getElementById('smart-task-day') ? document.getElementById('smart-task-day').value : '';
  const exam = document.getElementById('smart-task-exam') ? document.getElementById('smart-task-exam').value : '';
  const subject = document.getElementById('smart-task-subject') ? document.getElementById('smart-task-subject').value : '';
  const topic = document.getElementById('smart-task-topic') ? document.getElementById('smart-task-topic').value : '';
  const bookSelect = document.getElementById('smart-task-book');
  const bookValue = bookSelect ? bookSelect.value : '';
  const bookText = (bookSelect && bookSelect.selectedIndex > 0) ? bookSelect.options[bookSelect.selectedIndex].text : '';
  
  const questionTarget = document.getElementById('smart-task-question') ? parseInt(document.getElementById('smart-task-question').value) || 0 : 0;
  const durationTarget = document.getElementById('smart-task-duration') ? parseInt(document.getElementById('smart-task-duration').value) || 0 : 0;
  
  let text = '';
  
  if (exam && subject && topic) {
    text = `${subject} (${topic})`;
    if (bookValue) {
      text += ` - ${bookText}`;
    }
  } else {
    // Manuel metin girişi kullanılmışsa
    const input = document.getElementById('planner-task-input');
    text = input ? input.value.trim() : '';
  }
  
  if (!text || !day) {
    showToast('Lütfen gün seçip görev bilgilerini tam giriniz.', 'warning');
    return;
  }

  const assignBoth = document.getElementById('task-assign-both') ? document.getElementById('task-assign-both').checked : false;
  const studentsToAssign = assignBoth ? ['kaan', 'cagan'] : [currentStudent];
  
  studentsToAssign.forEach((student, index) => {
    const data = getStudentData(student);
    data.tasks.push({
      id: Date.now().toString() + index,
      text,
      day,
      questionTarget,
      durationTarget,
      exam,
      subject,
      topic,
      checked: false
    });
    
    saveStudentData(student, data);
    if(typeof updateDashboardStats === 'function' && student === currentStudent) updateDashboardStats(data);
  });
  e.target.reset();
  
  // Menüleri sıfırla
  updateSmartTaskSubjects();
  
  renderWeeklyPlanner();
  showToast('Görev eklendi', 'success');
}

// Akıllı Görev Formu İçin Yardımcı Fonksiyonlar
function populateSmartTaskBooks() {
  const data = getStudentData(currentStudent);
  const bookSelect = document.getElementById('smart-task-book');
  if (!bookSelect) return;
  
  bookSelect.innerHTML = '<option value="">(İsteğe Bağlı) Kaynak Seçin</option>';
  if (data.books && data.books.length > 0) {
    data.books.forEach(b => {
      bookSelect.innerHTML += `<option value="${b.id}">${b.name} (${b.subject})</option>`;
    });
  }
}

function updateSmartTaskSubjects() {
  const examSel = document.getElementById('smart-task-exam');
  const subjectSel = document.getElementById('smart-task-subject');
  const topicSel = document.getElementById('smart-task-topic');
  
  if (!examSel || !subjectSel || !topicSel) return;
  
  const exam = examSel.value;
  subjectSel.innerHTML = '<option value="" disabled selected>Ders Seçin</option>';
  topicSel.innerHTML = '<option value="" disabled selected>Önce Ders Seçin</option>';
  
  if (exam && YKS_TOPICS[exam]) {
    Object.keys(YKS_TOPICS[exam]).forEach(sub => {
      subjectSel.innerHTML += `<option value="${sub}">${sub}</option>`;
    });
  }
}

function updateSmartTaskTopics() {
  const examSel = document.getElementById('smart-task-exam');
  const subjectSel = document.getElementById('smart-task-subject');
  const topicSel = document.getElementById('smart-task-topic');
  
  if (!examSel || !subjectSel || !topicSel) return;

  const exam = examSel.value;
  const subject = subjectSel.value;
  
  topicSel.innerHTML = '<option value="" disabled selected>Konu Seçin</option>';
  
  if (exam && subject && YKS_TOPICS[exam][subject]) {
    YKS_TOPICS[exam][subject].forEach(top => {
      topicSel.innerHTML += `<option value="${top}">${top}</option>`;
    });
  }
}

// Öneriden Görev Ekleme
function addTaskFromSuggestion(taskText) {
  const data = getStudentData(currentStudent);
  data.tasks.push({
    id: Date.now().toString(),
    text: taskText,
    checked: false
  });
  
  saveStudentData(currentStudent, data);
  if(typeof updateDashboardStats === 'function') updateDashboardStats(data);
  renderWeeklyPlanner();
  showToast('Konu çalışma görevi eklendi.', 'success');
}

// Görev Durumu Değiştirme
function toggleTask(id) {
  const data = getStudentData(currentStudent);
  const task = data.tasks.find(t => t.id === id);
  if (task) {
    if (!task.checked) {
      document.getElementById('accuracy-task-id').value = id;
      document.getElementById('accuracy-correct').value = '';
      document.getElementById('accuracy-wrong').value = '';
      const blankInput = document.getElementById('accuracy-blank');
      if(blankInput) blankInput.value = '';
      const modal = document.getElementById('task-accuracy-modal');
      if (modal) modal.style.display = 'flex';
      return;
    }
    
    task.checked = !task.checked;
    if (!task.checked) {
      delete task.correctCount;
      delete task.wrongCount;
      delete task.blankCount;
    }
    saveStudentData(currentStudent, data);
    renderWeeklyPlanner();
    if(typeof updateDashboardStats === 'function') updateDashboardStats(data);
    if(typeof populateLiveTasks === 'function') populateLiveTasks();
    if(typeof updateLiveSessionUI === 'function') updateLiveSessionUI();
  }
}

function closeTaskAccuracyModal() {
  const modal = document.getElementById('task-accuracy-modal');
  if (modal) modal.style.display = 'none';
}

function handleTaskAccuracySubmit(e) {
  e.preventDefault();
  const id = document.getElementById('accuracy-task-id').value;
  const correct = parseInt(document.getElementById('accuracy-correct').value) || 0;
  const wrong = parseInt(document.getElementById('accuracy-wrong').value) || 0;
  
  let blank = 0;
  const blankInput = document.getElementById('accuracy-blank');
  if(blankInput && blankInput.value !== '') {
    blank = parseInt(blankInput.value) || 0;
  }
  
  const data = getStudentData(currentStudent);
  const task = data.tasks.find(t => t.id === id);
  if (task) {
    if (task.questionTarget && (correct + wrong + blank > task.questionTarget)) {
      showToast('Doğru, yanlış ve boş toplamı hedeflenen soru sayısından büyük olamaz!', 'error');
      return;
    }
    task.checked = true;
    task.correctCount = correct;
    task.wrongCount = wrong;
    task.blankCount = blank;
    saveStudentData(currentStudent, data);
    
    // Soru Takip menüsüne otomatik ekle
    const dateStr = task.day || new Date().toLocaleDateString('tr-TR', {weekday: 'long'});
    const subject = task.subject || 'Genel';
    const topic = task.topic || task.text;
    
    const entry = {
      id: 'log_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      tytAyt: task.exam || 'TYT',
      subject: subject,
      solved: (correct + wrong + blank).toString(),
      correct: correct.toString(),
      wrong: wrong.toString(),
      blank: blank.toString()
    };
    
    if (!data.dailyLog) data.dailyLog = [];
    data.dailyLog.push(entry);
    saveStudentData(currentStudent, data);
    
    renderWeeklyPlanner();
    if (typeof renderSolvedTable === 'function') renderSolvedTable(data);
    if(typeof updateDashboardStats === 'function') updateDashboardStats(data);
    if(typeof populateLiveTasks === 'function') populateLiveTasks();
    if(typeof updateLiveSessionUI === 'function') updateLiveSessionUI();
    showToast('Görev tamamlandı ve Soru Takip menüsüne işlendi! 🎉', 'success');
  }
  closeTaskAccuracyModal();
}

// Görev Düzenleme
function editTask(id) {
  if (currentUserSession && currentUserSession.role === 'student') return; // Sadece koç düzenleyebilir
  
  const data = getStudentData(currentStudent);
  const task = data.tasks.find(t => t.id === id);
  if (!task) return;
  
  const newText = prompt('Görevi düzenleyin:', task.text);
  if (newText !== null && newText.trim() !== '') {
    task.text = newText.trim();
    saveStudentData(currentStudent, data);
    renderWeeklyPlanner();
    showToast('Görev güncellendi.', 'success');
  }
}

// Görev Silme
function deleteTask(id) {
  if (currentUserSession && currentUserSession.role === 'student') {
    showToast('Öğrenciler görev silemez.', 'error');
    return;
  }
  
  const data = getStudentData(currentStudent);
  data.tasks = data.tasks.filter(t => t.id !== id);
  saveStudentData(currentStudent, data);
  if(typeof updateDashboardStats === 'function') updateDashboardStats(data);
  renderWeeklyPlanner();
  showToast('Görev silindi.', 'info');
}

// Puan Hesaplama Modülü (Dynamic Interactive Calculator)
function initCalculator() {
  const obpInput = document.getElementById('calc-obp');
  if (obpInput) obpInput.oninput = runInteractiveCalculator;
  
  const inputs = document.querySelectorAll('.calc-input-box');
  inputs.forEach(input => {
    input.oninput = runInteractiveCalculator;
  });
}

function runInteractiveCalculator(e) {
  const obp = parseFloat(document.getElementById('calc-obp').value) || 50;
  
  // Soru sayıları haritası
  const maxQ = {
    'tyt-tr': 40, 'tyt-sos': 20, 'tyt-mat': 40, 'tyt-fen': 20,
    'ayt-mat': 40, 'ayt-fiz': 14, 'ayt-kim': 13, 'ayt-biy': 13,
    'ayt-edeb': 24, 'ayt-tar1': 10, 'ayt-cog1': 6,
    'ayt-tar2': 11, 'ayt-cog2': 11, 'ayt-fels': 12, 'ayt-din': 6
  };

  // Dinamik Boş-Yanlış senkronizasyonu
  if (e && e.target && e.target.id && e.target.id.startsWith('calc-')) {
    const parts = e.target.id.split('-');
    if (parts.length === 4) {
      const type = parts[1]; // tyt or ayt
      const field = parts[2]; // c, w, b
      const subj = parts[3]; // tr, mat vb.
      const key = `${type}-${subj}`;
      
      const total = maxQ[key];
      if (total) {
        const cInput = document.getElementById(`calc-${type}-c-${subj}`);
        const wInput = document.getElementById(`calc-${type}-w-${subj}`);
        const bInput = document.getElementById(`calc-${type}-b-${subj}`);
        
        if (cInput && wInput && bInput) {
          let c = parseInt(cInput.value) || 0;
          let w = parseInt(wInput.value) || 0;
          let b = parseInt(bInput.value) || 0;
          
          if (field === 'c' || field === 'w') {
            b = Math.max(0, total - c - w);
            bInput.value = b;
          } else if (field === 'b') {
            w = Math.max(0, total - c - b);
            wInput.value = w;
          }
        }
      }
    }
  }

  // TYT Net Hesaplamaları
  const tytFields = ['tr', 'sos', 'mat', 'fen'];
  const tytNets = {};
  
  tytFields.forEach(f => {
    const c = parseInt(document.getElementById(`calc-tyt-c-${f}`).value) || 0;
    const w = parseInt(document.getElementById(`calc-tyt-w-${f}`).value) || 0;
    const net = c - (w * 0.25);
    document.getElementById(`calc-tyt-n-${f}`).innerText = net.toFixed(2);
    tytNets[f] = net;
  });

  const tytNetSum = tytNets.tr + tytNets.sos + tytNets.mat + tytNets.fen;
  document.getElementById('calc-tyt-total-net').innerText = tytNetSum.toFixed(2);

  // AYT Net Hesaplamaları
  const aytFields = ['mat', 'fiz', 'kim', 'biy', 'edeb', 'tar1', 'cog1', 'tar2', 'cog2', 'fels', 'din'];
  const aytNets = {};
  
  aytFields.forEach(f => {
    const c = parseInt(document.getElementById(`calc-ayt-c-${f}`).value) || 0;
    const w = parseInt(document.getElementById(`calc-ayt-w-${f}`).value) || 0;
    const net = c - (w * 0.25);
    document.getElementById(`calc-ayt-n-${f}`).innerText = net.toFixed(2);
    aytNets[f] = net;
  });

  const aytNetSum = aytFields.reduce((sum, f) => sum + aytNets[f], 0);
  document.getElementById('calc-ayt-total-net').innerText = aytNetSum.toFixed(2);

  // Puan Hesaplama Algoritması
  let TYT_S = 100;
  let SAY_S = 100;
  let EA_S = 100;
  let SOZ_S = 100;

  // TYT Puanı (ÖSYM Katsayıları)
  TYT_S += (tytNets.tr * 3.3) + (tytNets.sos * 3.4) + (tytNets.mat * 3.3) + (tytNets.fen * 3.4);
  
  // TYT'nin AYT puanlarına katkısı (%40)
  const tytContribution = (tytNets.tr * 1.32) + (tytNets.sos * 1.36) + (tytNets.mat * 1.32) + (tytNets.fen * 1.36);
  
  // Sayısal
  SAY_S += tytContribution + (aytNets.mat * 3.0) + (aytNets.fiz * 2.85) + (aytNets.kim * 3.07) + (aytNets.biy * 3.07);
  
  // Eşit Ağırlık
  EA_S += tytContribution + (aytNets.mat * 3.0) + (aytNets.edeb * 3.0) + (aytNets.tar1 * 2.80) + (aytNets.cog1 * 3.33);

  // Sözel
  SOZ_S += tytContribution + (aytNets.edeb * 3.0) + (aytNets.tar1 * 2.80) + (aytNets.cog1 * 3.33) + 
           (aytNets.tar2 * 2.91) + (aytNets.cog2 * 2.91) + (aytNets.fels * 3.0) + (aytNets.din * 3.33);

  // OBP Yerleştirme Puanı (OBP Graduation Grade * 5 = max 500. Placed score = OBP_Score * 0.12 = max 60 puan)
  const obpContribution = obp * 0.6; // graduation grade * 5 * 0.12 = grade * 0.6

  // Sınırlandırma
  TYT_S = Math.min(500, Math.max(100, TYT_S));
  SAY_S = Math.min(500, Math.max(100, SAY_S));
  EA_S = Math.min(500, Math.max(100, EA_S));
  SOZ_S = Math.min(500, Math.max(100, SOZ_S));

  // Sonuçları Yazdır
  document.getElementById('res-tyt-raw').innerText = TYT_S.toFixed(3);
  document.getElementById('res-tyt-place').innerText = (TYT_S + obpContribution).toFixed(3);

  document.getElementById('res-say-raw').innerText = SAY_S.toFixed(3);
  document.getElementById('res-say-place').innerText = (SAY_S + obpContribution).toFixed(3);

  document.getElementById('res-ea-raw').innerText = EA_S.toFixed(3);
  document.getElementById('res-ea-place').innerText = (EA_S + obpContribution).toFixed(3);

  document.getElementById('res-soz-raw').innerText = SOZ_S.toFixed(3);
  document.getElementById('res-soz-place').innerText = (SOZ_S + obpContribution).toFixed(3);

  // Sıralamaları hesapla ve yazdır
  const tytRange = getRankAndPercentileRange('TYT', TYT_S + obpContribution);
  const sayRange = getRankAndPercentileRange('SAY', SAY_S + obpContribution);
  const eaRange = getRankAndPercentileRange('EA', EA_S + obpContribution);
  const sozRange = getRankAndPercentileRange('SOZ', SOZ_S + obpContribution);

  document.getElementById('res-tyt-rank').innerHTML = `${tytRange.rangeStr} <span style="font-size:10px; opacity:0.8;">(${tytRange.pctStr})</span>`;
  document.getElementById('res-say-rank').innerHTML = `${sayRange.rangeStr} <span style="font-size:10px; opacity:0.8;">(${sayRange.pctStr})</span>`;
  document.getElementById('res-ea-rank').innerHTML = `${eaRange.rangeStr} <span style="font-size:10px; opacity:0.8;">(${eaRange.pctStr})</span>`;
  document.getElementById('res-soz-rank').innerHTML = `${sozRange.rangeStr} <span style="font-size:10px; opacity:0.8;">(${sozRange.pctStr})</span>`;
}

// Soru Girişi İçin Seçilen Dersleri Güncelleme (TYT/AYT Toggle'ına Göre)
function updateSolvedFormSubjects() {
  const type = document.getElementById('solved-exam-type').value;
  const select = document.getElementById('solved-subject');
  select.innerHTML = '';

  const subjects = Object.keys(YKS_TOPICS[type]);
  subjects.forEach(subject => {
    const opt = document.createElement('option');
    opt.value = subject;
    opt.innerText = subject;
    select.appendChild(opt);
  });
}

// Yardımcı Tarih Ayarlama
function setTodayDate(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    const today = new Date().toISOString().split('T')[0];
    el.value = today;
  }
}

// Olay Dinleyicileri Kurma
function setupEventListeners() {
  // Soru Ekleme Formu
  const solvedForm = document.getElementById('add-solved-form');
  if (solvedForm) {
    solvedForm.onsubmit = handleAddSolved;
  }

  // Deneme Ekleme Formu
  const mockForm = document.getElementById('add-mock-form');
  if (mockForm) {
    mockForm.onsubmit = handleAddMock;
  }

  // Görev Ekleme Formu
  const taskForm = document.getElementById('add-task-form');
  if (taskForm) {
    taskForm.onsubmit = handleAddTask;
  }

  // Soru Formu Ders Seçici İlklemesi
  const typeSelect = document.getElementById('solved-exam-type');
  if (typeSelect) {
    typeSelect.onchange = updateSolvedFormSubjects;
    updateSolvedFormSubjects();
  }

  // Deneme Formu Sınav Türü Seçici İlklemesi
  const mockTypeSelect = document.getElementById('mock-type');
  if (mockTypeSelect) {
    mockTypeSelect.onchange = updateMockFormFields;
    updateMockFormFields();
  }

  // Tarihleri bugüne ayarla
  setTodayDate('solved-date');
  setTodayDate('mock-date');
}

// Bildirim Gösterme (Toast)
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = '📢';
  if (type === 'success') icon = '✅';
  if (type === 'wrong') icon = '❌';
  if (type === 'info') icon = 'ℹ️';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  // 3 saniye sonra sil
  setTimeout(() => {
    toast.style.animation = 'slideIn var(--transition-normal) reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Resmi ÖSYM verilerine göre sıralama ve yüzdelik dilim tahmini yapan fonksiyon (Doğrusal enterpolasyon)
function getRankAndPercentileRange(scoreType, placementScore) {
  // placementScore: Ham Puan + OBP Katkısı (100 - 560 arası)
  if (placementScore < 100) return { rangeStr: "--", pctStr: "--" };
  if (placementScore > 560) placementScore = 560;
  
  // 2025 ve 2026 yıllarındaki sıralamayı bul
  const rank2025 = interpolateRank(scoreType, placementScore, "2025");
  const rank2026 = interpolateRank(scoreType, placementScore, "2026");

  // Raporlamak üzere sıralama aralığı ve yüzdelik dilim aralığı oluştur
  // Genellikle 2026'da yığılma daha fazla olduğu için 2026 sıralaması daha büyüktür (yani daha geridedir).
  // 2025 sıralaması ise daha küçüktür (yani daha önlerdedir).
  const minRank = Math.min(rank2025.rank, rank2026.rank);
  const maxRank = Math.max(rank2025.rank, rank2026.rank);
  const minPct = Math.min(rank2025.pct, rank2026.pct);
  const maxPct = Math.max(rank2025.pct, rank2026.pct);

  return {
    rangeStr: `${formatNumber(minRank)} - ${formatNumber(maxRank)}`,
    pctStr: `%${minPct.toFixed(2)} - %${maxPct.toFixed(2)}`
  };
}

function interpolateRank(scoreType, score, year) {
  const dataset = YKS_RANKINGS[year][scoreType];
  if (!dataset) return { rank: 0, pct: 0 };

  // Eğer score maksimum puandan büyük veya eşitse 1. sırayı döndür
  if (score >= dataset[0].score) {
    return { rank: dataset[0].rank, pct: dataset[0].pct };
  }

  // Eğer score minimum puandan küçükse en son sıralamayı döndür
  const lastIndex = dataset.length - 1;
  if (score <= dataset[lastIndex].score) {
    return { rank: dataset[lastIndex].rank, pct: dataset[lastIndex].pct };
  }

  // Araya yerleştirme (enterpolasyon) yap
  for (let i = 0; i < dataset.length - 1; i++) {
    const high = dataset[i];
    const low = dataset[i + 1];
    if (score <= high.score && score >= low.score) {
      // Doğrusal enterpolasyon formülü
      const ratio = (high.score - score) / (high.score - low.score);
      const interpolatedRank = high.rank + ratio * (low.rank - high.rank);
      const interpolatedPct = high.pct + ratio * (low.pct - high.pct);
      return { 
        rank: Math.round(interpolatedRank), 
        pct: interpolatedPct 
      };
    }
  }

  return { rank: 0, pct: 0 };
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}


// ==============================================================
// YANLIŞ DEFTERİ MODÜLÜ
// ==============================================================

const REASON_LABELS = {
  kavram: 'Kavram Yanılgısı',
  dikkatsizlik: 'Dikkatsizlik',
  bilgi: 'Bilgi Eksikliği',
  zaman: 'Zaman Yetersizliği'
};

function openAddWrongModal() {
  // Tarih varsayılanı
  document.getElementById('wrong-date').value = new Date().toISOString().split('T')[0];
  // Ders listesini güncelle
  updateWrongSubjectList();
  // Formu sıfırla
  document.getElementById('add-wrong-form').reset();
  document.getElementById('wrong-date').value = new Date().toISOString().split('T')[0];
  // Fotoğraf alanını sıfırla
  removeWrongPhoto();
  // Modalı aç
  document.getElementById('wrong-modal').style.display = 'flex';
}

function closeAddWrongModal() {
  document.getElementById('wrong-modal').style.display = 'none';
  window._wrongPhotoBase64 = null;
}

function closeWrongModalOnOverlay(e) {
  if (e.target === document.getElementById('wrong-modal')) closeAddWrongModal();
}

function updateWrongSubjectList() {
  const tytAyt = document.getElementById('wrong-tytayt').value;
  const subjectSel = document.getElementById('wrong-subject');
  const subjects = Object.keys(YKS_TOPICS[tytAyt] || {});
  subjectSel.innerHTML = subjects.map(s => `<option value="${s}">${s}</option>`).join('');
}

function submitWrongEntry(e) {
  e.preventDefault();
  const data = getStudentData(currentStudent);
  if (!data.wrongLog) data.wrongLog = [];

  const entry = {
    id: Date.now(),
    date: document.getElementById('wrong-date').value,
    tytAyt: document.getElementById('wrong-tytayt').value,
    subject: document.getElementById('wrong-subject').value,
    topic: document.getElementById('wrong-topic').value.trim(),
    source: document.getElementById('wrong-source').value.trim(),
    reason: document.getElementById('wrong-reason').value,
    note: document.getElementById('wrong-note').value.trim(),
    photo: window._wrongPhotoBase64 || null, // base64 fotoğraf verisi
    reviewed: false
  };
  window._wrongPhotoBase64 = null; // sıfırla

  data.wrongLog.unshift(entry);
  saveStudentData(currentStudent, data);
  closeAddWrongModal();
  renderWrongList();
  renderWrongStats();
  showToast('✅ Yanlış soru deftere eklendi!');
}

function toggleWrongReview(id) {
  const data = getStudentData(currentStudent);
  if (!data.wrongLog) data.wrongLog = [];
  const entry = data.wrongLog.find(e => e.id === id);
  if (entry) entry.reviewed = !entry.reviewed;
  saveStudentData(currentStudent, data);
  renderWrongList();
  renderWrongStats();
}

function deleteWrongEntry(id) {
  const data = getStudentData(currentStudent);
  data.wrongLog = (data.wrongLog || []).filter(e => e.id !== id);
  saveStudentData(currentStudent, data);
  renderWrongList();
  renderWrongStats();
  showToast('🗑️ Kayıt silindi.');
}

function markAllPendingReviewed() {
  const data = getStudentData(currentStudent);
  (data.wrongLog || []).forEach(e => { if (!e.reviewed) e.reviewed = true; });
  saveStudentData(currentStudent, data);
  renderWrongList();
  renderWrongStats();
  showToast('✅ Tekrar bekleyen tüm sorular tekrar edildi olarak işaretlendi!');
}

function renderWrongStats() {
  const data = getStudentData(currentStudent);
  const list = data.wrongLog || [];
  const total = list.length;
  const reviewed = list.filter(e => e.reviewed).length;
  const pending = total - reviewed;

  // Ders bazı dağılım (en çok hata
  const subjectCounts = {};
  list.forEach(e => { subjectCounts[e.subject] = (subjectCounts[e.subject] || 0) + 1; });
  const topSubject = Object.entries(subjectCounts).sort((a,b) => b[1]-a[1])[0];

  document.getElementById('wrong-stats-grid').innerHTML = `
    <div class="stat-card">
      <div class="stat-header"><span class="stat-label">📕 Toplam Yanlış</span></div>
      <div class="stat-value" style="color: var(--color-wrong);">${total}</div>
      <div class="stat-sub">Defterdeki toplam soru sayısı</div>
    </div>
    <div class="stat-card">
      <div class="stat-header"><span class="stat-label">⏳ Tekrar Bekleyenler</span></div>
      <div class="stat-value" style="color: #fbbf24;">${pending}</div>
      <div class="stat-sub">Bu hafta tekrar edilmesi gereken</div>
    </div>
    <div class="stat-card">
      <div class="stat-header"><span class="stat-label">✅ Tekrar Edilenler</span></div>
      <div class="stat-value" style="color: var(--color-correct);">${reviewed}</div>
      <div class="stat-sub">Başarıyla tekrar edilen sorular</div>
    </div>
    <div class="stat-card">
      <div class="stat-header"><span class="stat-label">🎯 En Çok Hata Yapılan Ders</span></div>
      <div class="stat-value" style="font-size:20px; color: var(--color-primary);">${topSubject ? topSubject[0] : '--'}</div>
      <div class="stat-sub">${topSubject ? topSubject[1] + ' soru hatası' : 'Henüz kayıt yok'}</div>
    </div>
  `;
}

function renderWrongList() {
  const data = getStudentData(currentStudent);
  let list = data.wrongLog || [];

  const filterSubject = document.getElementById('filter-wrong-subject')?.value || 'all';
  const filterType    = document.getElementById('filter-wrong-type')?.value || 'all';
  const filterReason  = document.getElementById('filter-wrong-reason')?.value || 'all';

  if (filterSubject !== 'all') list = list.filter(e => e.subject === filterSubject);
  if (filterType === 'pending')  list = list.filter(e => !e.reviewed);
  if (filterType === 'reviewed') list = list.filter(e => e.reviewed);
  if (filterReason !== 'all') list = list.filter(e => e.reason === filterReason);

  const container = document.getElementById('wrong-list-container');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 60px 20px; color: var(--text-muted);">
        <div style="font-size:48px; margin-bottom:12px;">📕</div>
        <p style="font-size:16px; font-weight:600;">Henüz kayıt yok</p>
        <p style="font-size:13px; margin-top:6px;">"Yanlış Soru Ekle" butonuyla deftere soru ekleyin.</p>
      </div>`;
    return;
  }

  container.innerHTML = list.map(entry => {
    const statusClass = entry.reviewed ? 'reviewed' : 'pending';
    const statusBadge = entry.reviewed
      ? `<span class="badge badge-reviewed">✅ Tekrar Edildi</span>`
      : `<span class="badge badge-pending">⏳ Tekrar Bekliyor</span>`;
    const reasonBadge = `<span class="badge badge-${entry.reason}">${REASON_LABELS[entry.reason] || entry.reason}</span>`;
    const noteHtml = entry.note
      ? `<div class="wrong-entry-note">📝 ${entry.note}</div>` : '';
    const photoHtml = entry.photo
      ? `<div style="display:flex; align-items:flex-start; gap:10px; margin-top:10px;">
           <img class="wrong-photo-thumb" src="${entry.photo}" alt="Soru Fotoğrafı" onclick="openLightbox('${entry.id}')" title="Büyüt">
           <button class="btn-icon delete" onclick="removeEntryPhoto(${entry.id})" title="Fotoğrafı sil" style="font-size:11px; align-self:flex-start; margin-top:4px;">🗑️ Fotoğrafı Sil</button>
         </div>` : '';
    const reviewBtnLabel = entry.reviewed ? '↩ Tekrarı Geri Al' : '✅ Tekrar Edildi';

    return `
      <div class="wrong-entry-card ${statusClass}">
        <div class="wrong-entry-header">
          <div>
            <div class="wrong-entry-title">${entry.tytAyt} &rsaquo; ${entry.subject} &rsaquo; ${entry.topic}</div>
            <div class="wrong-entry-meta">📅 ${entry.date} &nbsp;│&nbsp; 📚 ${entry.source}</div>
          </div>
          <div class="wrong-entry-actions">
            ${reasonBadge}
            ${statusBadge}
            <button class="btn-icon" onclick="toggleWrongReview(${entry.id})">${reviewBtnLabel}</button>
            <button class="btn-icon delete" onclick="deleteWrongEntry(${entry.id})">🗑️</button>
          </div>
        </div>
        ${noteHtml}
        ${photoHtml}
      </div>`;
  }).join('');
}

function initWrongSubjectFilter() {
  const sel = document.getElementById('filter-wrong-subject');
  if (!sel) return;
  const allSubjects = [
    ...Object.keys(YKS_TOPICS.TYT || {}),
    ...Object.keys(YKS_TOPICS.AYT || {})
  ];
  const unique = [...new Set(allSubjects)];
  sel.innerHTML = `<option value="all">Tüm Dersler</option>` +
    unique.map(s => `<option value="${s}">${s}</option>`).join('');
}

// Fotoğraf önizleme
function previewWrongPhoto(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showToast('⚠️ Fotoğraf 5 MB\'dan küçük olmalıdır!');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    window._wrongPhotoBase64 = e.target.result;
    const preview = document.getElementById('photo-preview-img');
    const placeholder = document.getElementById('photo-upload-placeholder');
    const area = document.getElementById('photo-upload-area');
    const removeBtn = document.getElementById('photo-remove-btn');
    preview.src = e.target.result;
    preview.style.display = 'block';
    placeholder.style.display = 'none';
    area.classList.add('has-image');
    removeBtn.style.display = 'inline-block';
  };
  reader.readAsDataURL(file);
}

// Fotoğrafı kaldır
function removeWrongPhoto() {
  window._wrongPhotoBase64 = null;
  const preview = document.getElementById('photo-preview-img');
  const placeholder = document.getElementById('photo-upload-placeholder');
  const area = document.getElementById('photo-upload-area');
  const removeBtn = document.getElementById('photo-remove-btn');
  const input = document.getElementById('wrong-photo');
  if (!preview) return;
  preview.src = '';
  preview.style.display = 'none';
  placeholder.style.display = 'flex';
  area.classList.remove('has-image');
  removeBtn.style.display = 'none';
  if (input) input.value = '';
}

// Fotoğrafı büyük göster (lightbox)
function openLightbox(entryId) {
  const data = getStudentData(currentStudent);
  const entry = (data.wrongLog || []).find(e => String(e.id) === String(entryId));
  if (!entry || !entry.photo) return;
  const lightbox = document.getElementById('photo-lightbox');
  const img = document.getElementById('lightbox-img');
  img.src = entry.photo;
  lightbox.style.display = 'flex';
}

// Kaydedilmiş bir girdinin fotoğrafını sil (girdinin kendisini silmez)
function removeEntryPhoto(id) {
  const data = getStudentData(currentStudent);
  const entry = (data.wrongLog || []).find(e => e.id === id);
  if (entry) {
    entry.photo = null;
    saveStudentData(currentStudent, data);
    renderWrongList();
    showToast('🗑️ Fotoğraf silindi.');
  }
}

// ==================== KİTAP & KAYNAK TAKİBİ ====================

function renderBooks() {
  const data = getStudentData(currentStudent);
  const container = document.getElementById('books-list-container');
  if (!container) return;

  container.innerHTML = '';

  if (!data.books || data.books.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:20px; font-size: 13px;">Henüz hiç kaynak eklenmemiş.</div>`;
    return;
  }

  data.books.forEach(book => {
    // Migration for older data
    if (book.total !== undefined && book.totalTest === undefined) {
      book.totalTest = book.total;
      book.completedTest = book.completed || 0;
      book.totalPage = 0;
      book.completedPage = 0;
    }

    let barsHtml = '';
    
    if (book.totalTest > 0) {
      const pct = Math.min(100, Math.round((book.completedTest / book.totalTest) * 100));
      barsHtml += `
        <div style="margin-bottom: 10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
            <span style="font-size:12px; color:var(--text-muted); font-weight:600;">Test: %${pct} Tamamlandı</span>
            <div style="display:flex; align-items:center; gap: 6px;">
              <input type="number" id="book-input-test-${book.id}" class="form-input" style="width:55px; padding:2px 4px; font-size:12px; text-align:center;" min="0" max="${book.totalTest}" value="${book.completedTest || 0}">
              <span style="font-size:12px; color:var(--text-muted);">/ ${book.totalTest}</span>
              <button onclick="updateBookProgress('${book.id}', 'test')" style="background:var(--color-primary); color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:11px; font-weight:600;">Kaydet</button>
            </div>
          </div>
          <div class="book-progress-container" style="background:var(--bg-dark); height:6px; border-radius:3px; overflow:hidden;">
            <div class="book-progress-bar" style="width: ${pct}%; background:var(--gradient-primary); height:100%; border-radius:3px; transition:width 0.4s ease;"></div>
          </div>
        </div>
      `;
    }

    if (book.totalPage > 0) {
      const pct = Math.min(100, Math.round((book.completedPage / book.totalPage) * 100));
      barsHtml += `
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
            <span style="font-size:12px; color:var(--text-muted); font-weight:600;">Sayfa: %${pct} Tamamlandı</span>
            <div style="display:flex; align-items:center; gap: 6px;">
              <input type="number" id="book-input-page-${book.id}" class="form-input" style="width:55px; padding:2px 4px; font-size:12px; text-align:center;" min="0" max="${book.totalPage}" value="${book.completedPage || 0}">
              <span style="font-size:12px; color:var(--text-muted);">/ ${book.totalPage}</span>
              <button onclick="updateBookProgress('${book.id}', 'page')" style="background:var(--color-secondary); color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:11px; font-weight:600;">Kaydet</button>
            </div>
          </div>
          <div class="book-progress-container" style="background:var(--bg-dark); height:6px; border-radius:3px; overflow:hidden;">
            <div class="book-progress-bar" style="width: ${pct}%; background:var(--color-secondary); height:100%; border-radius:3px; transition:width 0.4s ease;"></div>
          </div>
        </div>
      `;
    }

    const html = `
      <div class="book-card" style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:var(--radius-lg); padding: 15px; position:relative;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 12px;">
          <div>
            <h3 style="font-size:15px; margin:0 0 4px 0; color:var(--text-main); font-weight:600;">${book.name}</h3>
            <span style="font-size:11px; background:rgba(6,182,212,0.1); color:var(--color-primary); padding:3px 8px; border-radius:12px; font-weight:600;">${book.subject}</span>
          </div>
          <button class="btn-delete-row" onclick="deleteBook('${book.id}')" title="Sil">🗑️</button>
        </div>
        ${barsHtml}
      </div>
    `;
    container.innerHTML += html;
  });
}

function handleAddBook(e) {
  e.preventDefault();
  const name = document.getElementById('book-name').value.trim();
  const subject = document.getElementById('book-subject').value.trim();
  const totalTest = parseInt(document.getElementById('book-total-test').value) || 0;
  const totalPage = parseInt(document.getElementById('book-total-page').value) || 0;

  if (!name || !subject) return;
  
  if (totalTest === 0 && totalPage === 0) {
    showToast('En az bir test veya sayfa sayısı girmelisiniz.', 'warning');
    return;
  }
  const addToBoth = document.getElementById('add-to-both') ? document.getElementById('add-to-both').checked : false;
  const studentsToUpdate = addToBoth ? ['kaan', 'cagan'] : [currentStudent];

  studentsToUpdate.forEach(student => {
    const data = getStudentData(student);
    if (!data.books) data.books = [];

    data.books.push({
      id: 'book_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name,
      subject,
      totalTest,
      completedTest: 0,
      totalPage,
      completedPage: 0
    });

    saveStudentData(student, data);
  });

  e.target.reset();
  renderBooks();
  showToast('Kitap başarıyla eklendi.', 'success');
}

function updateBookProgress(id, type) {
  const input = document.getElementById(`book-input-${type}-${id}`);
  if (!input) return;
  const val = parseInt(input.value);

  const data = getStudentData(currentStudent);
  const book = data.books.find(b => b.id === id);
  if (book) {
    let max = type === 'test' ? book.totalTest : book.totalPage;
    
    if (!isNaN(val) && val >= 0 && val <= max) {
      if (type === 'test') book.completedTest = val;
      else book.completedPage = val;
      
      saveStudentData(currentStudent, data);
      renderBooks();
      showToast('İlerleme güncellendi!', 'success');
    } else {
      showToast('Geçersiz değer girdiniz!', 'wrong');
      input.value = type === 'test' ? book.completedTest : book.completedPage;
    }
  }
}

function deleteBook(id) {
  if (!confirm('Bu kitabı silmek istediğinize emin misiniz?')) return;
  const data = getStudentData(currentStudent);
  data.books = data.books.filter(b => b.id !== id);
  saveStudentData(currentStudent, data);
  renderBooks();
  showToast('Kitap silindi.', 'info');
}


// ----------------- Canlı Çalışma Seansı -----------------
let liveSessionTimer = null;

function populateLiveTasks() {
  const select = document.getElementById('live-task-select');
  if (!select) return;
  const data = getStudentData(currentStudent);
  
  // Sadece tamamlanmamış görevleri al
  const tasks = data.tasks.filter(t => !t.checked);
  select.innerHTML = '<option value="">Çalışılacak Görevi Seçin...</option>';
  
  tasks.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.innerText = t.text;
    select.appendChild(opt);
  });
}

function toggleLiveSession() {
  const data = getStudentData(currentStudent);
  const btn = document.getElementById('btn-start-session');
  
  if (!data.liveSession || !data.liveSession.active) {
    // Başlat
    const select = document.getElementById('live-task-select');
    if (select.value === "") {
      showToast("Lütfen önce bir görev seçin", "warning");
      return;
    }
    const taskName = select.options[select.selectedIndex].text;
    
    data.liveSession = {
      active: true,
      taskId: select.value,
      taskName: taskName,
      startTime: Date.now()
    };
    saveStudentData(currentStudent, data);
    showToast("Çalışma seansı başladı!", "success");
  } else {
    // Bitir
    const elapsed = Date.now() - data.liveSession.startTime;
    const elapsedMinutes = Math.round(elapsed / 60000);
    
    // Öğrenciye sor
    const solvedQuestions = prompt(`Çalışma seansını bitirdiniz!\nTahmini geçen süre: ${elapsedMinutes} dakika.\n\nKaç soru çözdünüz?`, '0');
    
    if (solvedQuestions !== null) {
      // Görevi tamamlandı işaretle
      const task = data.tasks.find(t => t.id === data.liveSession.taskId);
      if (task) {
        task.checked = true;
      }
      
      const solvedNum = parseInt(solvedQuestions) || 0;
      if (solvedNum > 0) {
         const today = new Date().toISOString().split('T')[0];
         data.dailyLog.push({
             id: Date.now().toString(),
             date: today,
             tytAyt: 'Çalışma Görevi',
             subject: data.liveSession.taskName,
             solved: solvedNum,
             correct: solvedNum,
             wrong: 0,
             duration: elapsedMinutes
         });
         
         // Gamification Triggers
         // 1. Streak Tracker
         if (solvedNum >= 15) { 
            if (data.lastActiveDate !== today) {
               const yesterday = new Date();
               yesterday.setDate(yesterday.getDate() - 1);
               const ymd = yesterday.toISOString().split('T')[0];
               if (data.lastActiveDate === ymd || data.streak === 0) {
                   data.streak = (data.streak || 0) + 1;
               } else {
                   data.streak = 1; 
               }
               data.lastActiveDate = today;
               showToast(`🔥 ${data.streak} Günlük Seri!`, 'info');
            }
         }

         // 2. Badges
         const totalSolvedXP = calculateStudentXP(data);
         if (totalSolvedXP >= 20) {
            awardBadge(data, 'first_step', 'İlk Adım', '🌱', 'Sistemdeki ilk 20 sorunu çözdün!');
         }
         const currentHour = new Date().getHours();
         if (currentHour >= 23 || currentHour < 4) {
            awardBadge(data, 'night_owl', 'Gece Kuşu', '🦉', 'Gece 23:00 sonrasında ders çalıştın!');
         }
         let todayTotal = data.dailyLog.filter(l => l.date === today).reduce((sum, l) => sum + parseInt(l.solved), 0);
         if (todayTotal > (data.maxDaily || 0) && todayTotal >= 40) {
            data.maxDaily = todayTotal;
            awardBadge(data, 'personal_best', 'Kendi Rekorum', '🚀', `Bir günde ${todayTotal} soru çözerek kendi rekorunu kırdın!`);
         }
      }
      
      data.liveSession = null;
      saveStudentData(currentStudent, data);
      showToast('Tebrikler! Seans kaydedildi ve görev tamamlandı.', 'success');
      if(typeof updateDashboardStats === 'function') updateDashboardStats(data);
      if(typeof renderWeeklyPlanner === 'function') renderWeeklyPlanner();
    } else {
      // İptal edilirse seansı bitirme
      return;
    }
  }
  
  updateLiveSessionUI();
}

function updateLiveSessionUI() {
  const data = getStudentData(currentStudent);
  const isStudent = currentUserSession && currentUserSession.role === 'student';
  
  const studentControls = document.getElementById('student-live-controls');
  const coachView = document.getElementById('coach-live-view');
  
  if (isStudent) {
    if (studentControls) studentControls.style.display = 'flex';
    if (coachView) coachView.style.display = 'none';
    
    const btn = document.getElementById('btn-start-session');
    const select = document.getElementById('live-task-select');
    const timerDisplay = document.getElementById('live-timer-display');
    
    if (data.liveSession && data.liveSession.active) {
      if (btn) {
        btn.innerText = "Çalışmayı Bitir";
        btn.style.backgroundColor = "var(--color-danger)";
      }
      if (select) {
        select.value = data.liveSession.taskId;
        select.disabled = true;
      }
    } else {
      if (btn) {
        btn.innerText = "Çalışmayı Başlat";
        btn.style.backgroundColor = "var(--color-primary)";
      }
      if (select) select.disabled = false;
      if (timerDisplay) timerDisplay.innerText = "00:00";
    }
  } else {
    // Koç Ekranı
    if (studentControls) studentControls.style.display = 'none';
    if (coachView) coachView.style.display = 'block';
    
    const pulse = document.getElementById('coach-live-pulse');
    const text = document.getElementById('coach-live-text');
    const timerDisplay = document.getElementById('coach-live-timer');
    
    if (data.liveSession && data.liveSession.active) {
      if (pulse) {
        pulse.style.backgroundColor = "var(--color-danger)";
        pulse.style.boxShadow = "0 0 8px 2px rgba(220,53,69,0.6)";
      }
      if (text) text.innerText = `Öğrenci şu an çalışıyor: ${data.liveSession.taskName}`;
    } else {
      if (pulse) {
        pulse.style.backgroundColor = "var(--color-muted)";
        pulse.style.boxShadow = "none";
      }
      if (text) text.innerText = "Öğrenci şu an çevrimdışı / çalışmıyor";
      if (timerDisplay) timerDisplay.innerText = "--:--";
    }
  }
}

function updateLiveTimerLoop() {
  const data = getStudentData(currentStudent);
  if (data.liveSession && data.liveSession.active) {
    const elapsed = Date.now() - data.liveSession.startTime;
    const totalSeconds = Math.floor(elapsed / 1000);
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    
    const isStudent = currentUserSession && currentUserSession.role === 'student';
    if (isStudent) {
       const timerDisplay = document.getElementById('live-timer-display');
       if (timerDisplay) timerDisplay.innerText = `${m}:${s}`;
    } else {
       const timerDisplay = document.getElementById('coach-live-timer');
       if (timerDisplay) timerDisplay.innerText = `${m}:${s}`;
    }
  }
}

// 1 Saniyede bir zamanı güncelle
setInterval(updateLiveTimerLoop, 1000);



// --- WEEKLY GOAL EDIT ---
function editWeeklyGoals() {
  const data = getStudentData(currentStudent);
  const currentQ = data.weeklyGoal || 1000;
  const currentD = data.weeklyDurationGoal || 0;
  
  const qStr = prompt("Haftalık SORU hedefini girin:", currentQ);
  if (qStr === null) return;
  const dStr = prompt("Haftalık SÜRE (dk) hedefini girin:", currentD);
  if (dStr === null) return;
  
  data.weeklyGoal = parseInt(qStr) || 0;
  data.weeklyDurationGoal = parseInt(dStr) || 0;
  
  saveStudentData(currentStudent, data);
  if(typeof updateDashboardStats === 'function') updateDashboardStats(data);
  showToast('Hedefler başarıyla güncellendi.', 'success');
}

// --- GAMIFICATION LOGIC ---
function calculateStudentXP(data) {
  let xp = 0;
  if (data.dailyLog) {
    data.dailyLog.forEach(log => {
      xp += parseInt(log.solved) || 0;
    });
  }
  return xp;
}

function getStudentLevelInfo(xp) {
  if (xp < 1000) {
    return { badge: '🥉', title: 'Çırak Ligi', nextXP: 1000, minXP: 0, colorStart: '#b87333', colorEnd: '#d2b48c' };
  } else if (xp < 3000) {
    return { badge: '🥈', title: 'Savaşçı Ligi', nextXP: 3000, minXP: 1000, colorStart: '#9ca3af', colorEnd: '#f3f4f6' };
  } else {
    return { badge: '🥇', title: 'Efsane Ligi', nextXP: xp, minXP: 3000, colorStart: '#fbbf24', colorEnd: '#fef08a' };
  }
}


// --- BADGE HELPER ---
function awardBadge(data, badgeId, badgeName, badgeIcon, badgeDesc) {
   if (!data.badges) data.badges = [];
   const exists = data.badges.find(b => b.id === badgeId);
   if (!exists) {
      data.badges.push({ id: badgeId, name: badgeName, icon: badgeIcon, desc: badgeDesc, date: new Date().toISOString() });
      showToast(`🏆 Yeni Rozet Kazandın: ${badgeName}!`, 'success');
   }
}


// --- PERSONAL GOAL FUNCTIONS ---
function openPersonalGoalModal() {
  if (!currentStudent || !currentUserSession || currentUserSession.role !== 'student') return;
  const data = getStudentData(currentStudent);
  document.getElementById('goal-university').value = data.personalGoal?.university || "";
  document.getElementById('goal-profession').value = data.personalGoal?.profession || "";
  document.getElementById('goal-ranking').value = data.personalGoal?.ranking || "";
  
  document.getElementById('modal-personal-goal').style.display = 'flex';
}

function closePersonalGoalModal() {
  document.getElementById('modal-personal-goal').style.display = 'none';
}

function savePersonalGoal() {
  const ranking = document.getElementById('goal-ranking').value.trim();
  if (!ranking) {
    showToast('Lütfen hedef sıralamanızı girin! Bu alan zorunludur.', 'warning');
    return;
  }
  
  const university = document.getElementById('goal-university').value.trim();
  const profession = document.getElementById('goal-profession').value.trim();
  
  if (currentStudent) {
    const data = getStudentData(currentStudent);
    data.personalGoal = { university, profession, ranking };
    saveStudentData(currentStudent, data);
    updateDashboardStats(data);
    closePersonalGoalModal();
    showToast('Hedefin başarıyla kaydedildi! Şimdi çalışma zamanı 🚀', 'success');
  }
}

function deletePersonalGoal() {
  if (currentStudent) {
    if(confirm("Hedefini silmek istediğine emin misin?")) {
      const data = getStudentData(currentStudent);
      data.personalGoal = { university: "", profession: "", ranking: "" };
      saveStudentData(currentStudent, data);
      updateDashboardStats(data);
      closePersonalGoalModal();
      showToast('Hedefin silindi.', 'info');
    }
  }
}
