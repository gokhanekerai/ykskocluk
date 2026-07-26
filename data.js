/**
 * data.js — YKS Koçum Veri Katmanı
 * Firebase + localStorage yönetimi
 */

const DEFAULT_STUDENT_DATA = {
  mockLog: [],      // { id, date, type, name, results, nets, totalNet, scores }
  topicStatus: {},  // "tytAyt_subject_topic": "not_started"|"studying"|"review"|"completed"
  tasks: [],        // { id, text, checked, date }
  wrongLog: [],     // { id, date, tytAyt, subject, topic, source, reason, note, reviewed }
  books: [],        // { id, name, subject, totalPages, completedPages, startDate }
  weeklyGoal: 1000,
  personalGoal: { university: '', profession: '', ranking: '' }
};

const DEFAULT_USERS = {
  gokhan: { id: 'coach', username: 'gokhan', name: 'Gökhan EKER', role: 'coach', roleTitle: 'YKS Eğitim Koçu', password: 'koc123', avatar: 'G' },
  koc:    { id: 'coach', username: 'koc',    name: 'Gökhan EKER', role: 'coach', roleTitle: 'YKS Eğitim Koçu', password: 'koc123', avatar: 'G' },
  kaan:   { id: 'kaan',  username: 'kaan',   name: 'Kaan',         role: 'student', roleTitle: 'Öğrenci', password: 'kaan123',   avatar: 'K' },
  cagan:  { id: 'cagan', username: 'cagan',  name: 'Çağan',        role: 'student', roleTitle: 'Öğrenci', password: 'cagan123',  avatar: 'Ç' }
};

let _isSyncing = false;

// ── Öğrenci Verisi ────────────────────────────────────────────────────────────

function getStudentData(studentId) {
  const raw = localStorage.getItem(`yks_coach_${studentId}`);
  const data = raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_STUDENT_DATA));
  // Firebase boş dizileri siler, garantile
  if (!Array.isArray(data.mockLog))  data.mockLog  = [];
  if (!Array.isArray(data.tasks))    data.tasks    = [];
  if (!Array.isArray(data.wrongLog)) data.wrongLog = [];
  if (!Array.isArray(data.books))    data.books    = [];
  if (typeof data.topicStatus !== 'object' || data.topicStatus === null) data.topicStatus = {};
  if (typeof data.personalGoal !== 'object' || data.personalGoal === null) data.personalGoal = { university: '', profession: '', ranking: '' };
  if (typeof data.weeklyGoal !== 'number') data.weeklyGoal = 1000;
  return data;
}

function saveStudentData(studentId, data) {
  localStorage.setItem(`yks_coach_${studentId}`, JSON.stringify(data));
  _firebaseSave(`yks_coach_${studentId}`, data);
}

// ── Kullanıcılar ──────────────────────────────────────────────────────────────

function getUsers() {
  const raw = localStorage.getItem('yks_coach_users');
  if (!raw || raw === 'null' || raw === 'undefined') {
    const users = JSON.parse(JSON.stringify(DEFAULT_USERS));
    localStorage.setItem('yks_coach_users', JSON.stringify(users));
    return users;
  }
  const parsed = JSON.parse(raw);
  if (!parsed.gokhan) parsed.gokhan = DEFAULT_USERS.gokhan;
  if (!parsed.kaan)   parsed.kaan   = DEFAULT_USERS.kaan;
  if (!parsed.cagan)  parsed.cagan  = DEFAULT_USERS.cagan;
  return parsed;
}

function saveUsers(users) {
  localStorage.setItem('yks_coach_users', JSON.stringify(users));
  _firebaseSave('yks_coach_users', users);
}

function getStudentList() {
  const users = getUsers();
  return Object.entries(users)
    .filter(([, u]) => u.role === 'student')
    .map(([key, u]) => ({ key, ...u }));
}

// ── Ayarlar ───────────────────────────────────────────────────────────────────

function getProgramStartDate() {
  const v = localStorage.getItem('yks_coach_program_start');
  return (v && v !== 'null' && v !== 'undefined') ? v : null;
}

function saveProgramStartDate(date) {
  localStorage.setItem('yks_coach_program_start', date);
  _firebaseSave('yks_coach_program_start', date);
}

function getExamDate() {
  const v = localStorage.getItem('yks_coach_exam_date');
  return (v && v !== 'null' && v !== 'undefined') ? v : '2027-06-19';
}

function saveExamDate(date) {
  localStorage.setItem('yks_coach_exam_date', date);
  _firebaseSave('yks_coach_exam_date', date);
}

// ── Firebase ──────────────────────────────────────────────────────────────────

function _firebaseSave(key, data) {
  if (window.db && !_isSyncing) {
    window.db.ref(`ykskocum_data/${key}`).set(data)
      .catch(e => console.warn('Firebase kayıt hatası:', e));
  }
}

function initFirebaseSync(onChanged) {
  if (!window.db) return;
  window.db.ref('ykskocum_data').on('value', snapshot => {
    const remote = snapshot.val();
    if (!remote) return;
    _isSyncing = true;
    let changed = false;
    for (const [key, value] of Object.entries(remote)) {
      const local = localStorage.getItem(key);
      const remoteStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
      if (local !== remoteStr) {
        localStorage.setItem(key, remoteStr);
        changed = true;
      }
    }
    _isSyncing = false;
    if (changed && typeof onChanged === 'function') onChanged();
  });
}

// ── Yardımcılar ───────────────────────────────────────────────────────────────

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('tr-TR');
}
