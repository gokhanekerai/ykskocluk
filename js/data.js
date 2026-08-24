/**
 * data.js — Merkezi Veri Yönetimi (localStorage + Firebase)
 */

const DEFAULT_STUDENT_DATA = {
  dailyLog: [],       // { id, date, tytAyt, subject, solved, correct, wrong }
  mockLog: [],        // { id, date, type, name, results:{}, nets:{}, totalNet, scores:{} }
  topicStatus: {},    // Key: "tytAyt_subject_topic", Value: "not_started"|"studying"|"review"|"completed"
  tasks: [],          // { id, text, checked, date }
  wrongLog: [],       // { id, date, tytAyt, subject, topic, source, reason, note, reviewed, photo }
  books: [],          // { id, name, subject, totalPages, solvedPages, totalQuestions, solvedQuestions, type }
  schedule: [],       // { id, date, items:[{time, subject, topic, duration, done}] }
  aiAnalyses: [],     // { id, date, examId, prompt, response, studyPlan }
  streak: 0,
  lastActiveDate: null,
  weeklyGoal: 1000,
  obp: 85,
  personalGoal: { university: '', profession: '', ranking: '' }
};

// --- Öğrenci Verisi ---

function getStudentData(studentId) {
  const key = `yks_coach_${studentId}`;
  const str = localStorage.getItem(key);
  let data;

  if (!str) {
    data = JSON.parse(JSON.stringify(DEFAULT_STUDENT_DATA));
  } else {
    data = JSON.parse(str);
  }

  // Firebase boş array/object'leri siliyor — garantile
  const required = ['dailyLog','mockLog','tasks','wrongLog','books','schedule','aiAnalyses'];
  required.forEach(k => { if (!Array.isArray(data[k])) data[k] = []; });
  
  // Schedule ve içerisindeki items dizilerini garantile
  if (Array.isArray(data.schedule)) {
    data.schedule.forEach(day => {
      if (!day) return;
      if (!Array.isArray(day.items)) {
        if (day.items && typeof day.items === 'object') {
          day.items = Object.values(day.items);
        } else {
          day.items = [];
        }
      }
    });
  }

  if (!data.topicStatus || typeof data.topicStatus !== 'object') data.topicStatus = {};
  if (!data.personalGoal) data.personalGoal = { university: '', profession: '', ranking: '' };
  if (data.obp === undefined || data.obp === null) data.obp = 85;

  return data;
}

function saveStudentData(studentId, data) {
  const key = `yks_coach_${studentId}`;
  localStorage.setItem(key, JSON.stringify(data));
  if (typeof fbSet === 'function') fbSet(key, data);
}

// --- Kullanıcılar & Rol Yönetimi ---

const DEFAULT_USERS = {
  gokhan: { id: 'gokhan', username: 'gokhan', name: 'Gökhan EKER', role: 'supercoach', roleTitle: 'YKS Süper Koçu', password: 'koc123', avatar: 'G' },
  koc:    { id: 'koc',    username: 'koc',    name: 'Gökhan EKER', role: 'supercoach', roleTitle: 'YKS Süper Koçu', password: 'koc123', avatar: 'G' },
  kaan:   { id: 'kaan',  username: 'kaan',   name: 'Kaan',         role: 'student', roleTitle: 'Öğrenci', password: 'kaan123', avatar: 'K', branch: 'Sayısal', coachId: 'gokhan' },
  cagan:  { id: 'cagan', username: 'cagan',  name: 'Çağan',        role: 'student', roleTitle: 'Öğrenci', password: 'cagan123', avatar: 'Ç', branch: 'Sayısal', coachId: 'gokhan' }
};

function getUsers() {
  const str = localStorage.getItem('yks_coach_users');
  let users;
  if (!str || str === 'null' || str === 'undefined') {
    users = JSON.parse(JSON.stringify(DEFAULT_USERS));
    localStorage.setItem('yks_coach_users', JSON.stringify(users));
  } else {
    users = JSON.parse(str);
  }

  // Gökhan ve Koç hesaplarını supercoach olarak güncelle
  if (users.gokhan) {
    users.gokhan.role = 'supercoach';
    users.gokhan.roleTitle = 'YKS Süper Koçu';
  } else {
    users.gokhan = DEFAULT_USERS.gokhan;
  }

  if (users.koc) {
    users.koc.role = 'supercoach';
    users.koc.roleTitle = 'YKS Süper Koçu';
  } else {
    users.koc = DEFAULT_USERS.koc;
  }

  // Mevcut Kaan ve Çağan'a coachId garantile
  if (users.kaan) {
    if (!users.kaan.coachId) users.kaan.coachId = 'gokhan';
  } else {
    users.kaan = DEFAULT_USERS.kaan;
  }

  if (users.cagan) {
    if (!users.cagan.coachId) users.cagan.coachId = 'gokhan';
  } else {
    users.cagan = DEFAULT_USERS.cagan;
  }

  return users;
}

function saveUsers(users) {
  localStorage.setItem('yks_coach_users', JSON.stringify(users));
  if (typeof fbSet === 'function') fbSet('yks_coach_users', users);
}

// Giriş yapan kullanıcıya göre sadece görmeye yetkili olduğu öğrencileri döndürür
function getVisibleStudents(user = window.currentUser) {
  const users = getUsers();
  if (!user) return [];

  const isSuper = user.role === 'supercoach' || user.username === 'gokhan' || user.username === 'koc' || user.id === 'gokhan';

  if (isSuper) {
    return Object.entries(users)
      .filter(([_, u]) => u && u.role === 'student')
      .map(([k, u]) => ({ key: k, ...u }));
  }

  if (user.role === 'coach') {
    return Object.entries(users)
      .filter(([_, u]) => u && u.role === 'student' && (u.coachId === user.id || u.coachId === user.username))
      .map(([k, u]) => ({ key: k, ...u }));
  }

  if (user.role === 'student') {
    const studentKey = user.id || user.username;
    const u = users[studentKey] || user;
    return [{ key: studentKey, ...u }];
  }

  return [];
}

// Süper Koç için sistemdeki tüm koçları listeler
function getVisibleCoaches() {
  const users = getUsers();
  return Object.entries(users)
    .filter(([k, u]) => u && (u.role === 'coach' || u.role === 'supercoach') && k !== 'koc')
    .map(([k, u]) => ({ key: k, ...u }));
}

// Yeni Koç Ekleme (Süper Koç yetkisiyle)
function addCoachUser(name, username, password) {
  name = (name || '').trim();
  username = (username || '').toLowerCase().trim();
  password = (password || '').trim();

  if (!name || !username || !password) {
    throw new Error('Koç adı, kullanıcı adı ve şifre zorunludur.');
  }

  const users = getUsers();
  if (Object.keys(users).some(k => k.toLowerCase() === username)) {
    throw new Error('Bu kullanıcı adı zaten başka bir hesap tarafından kullanılıyor.');
  }

  const id = username.replace(/[^a-z0-9]/gi, '_');
  users[id] = {
    id,
    username,
    name,
    role: 'coach',
    roleTitle: 'YKS Koçu',
    password,
    avatar: name.charAt(0).toUpperCase()
  };

  saveUsers(users);
  return users[id];
}

// Koç Silme
function deleteCoachUser(coachId) {
  if (coachId === 'gokhan' || coachId === 'koc') {
    throw new Error('Ana yönetici hesabı silinemez.');
  }

  const users = getUsers();
  if (!users[coachId]) return;

  delete users[coachId];

  // Bu koça ait öğrencileri gokhan'a aktar veya sil
  Object.entries(users).forEach(([k, u]) => {
    if (u.role === 'student' && (u.coachId === coachId)) {
      u.coachId = 'gokhan'; // sahipsiz kalmaması için gokhana bağla
    }
  });

  saveUsers(users);
}

// --- Genel Yardımcılar ---

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function getTodayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateISO(d) {
  if (!d) return getTodayStr();
  const dateObj = (typeof d === 'string') ? new Date(d.length === 10 ? d + 'T00:00:00' : d) : d;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatNumber(n) {
  if (n === undefined || n === null) return '0';
  return Number(n).toLocaleString('tr-TR');
}

// Export globals
window.getStudentData    = getStudentData;
window.saveStudentData   = saveStudentData;
window.getUsers          = getUsers;
window.saveUsers         = saveUsers;
window.getVisibleStudents = getVisibleStudents;
window.getVisibleCoaches = getVisibleCoaches;
window.addCoachUser      = addCoachUser;
window.deleteCoachUser   = deleteCoachUser;
window.generateId        = generateId;
window.getTodayStr       = getTodayStr;
window.formatDateISO     = formatDateISO;
window.formatDate        = formatDate;
window.formatNumber      = formatNumber;
