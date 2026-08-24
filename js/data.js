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

// --- Kullanıcılar ---

const DEFAULT_USERS = {
  gokhan: { id: 'gokhan', username: 'gokhan', name: 'Gökhan EKER', role: 'coach', roleTitle: 'YKS Koçu', password: 'koc123', avatar: 'G' },
  koc:    { id: 'koc',    username: 'koc',    name: 'Gökhan EKER', role: 'coach', roleTitle: 'YKS Koçu', password: 'koc123', avatar: 'G' },
  kaan:   { id: 'kaan',  username: 'kaan',   name: 'Kaan',         role: 'student', roleTitle: 'Öğrenci', password: 'kaan123', avatar: 'K', branch: 'Sayısal' },
  cagan:  { id: 'cagan', username: 'cagan',  name: 'Çağan',        role: 'student', roleTitle: 'Öğrenci', password: 'cagan123', avatar: 'Ç', branch: 'Sayısal' }
};

function getUsers() {
  const str = localStorage.getItem('yks_coach_users');
  if (!str || str === 'null' || str === 'undefined') {
    localStorage.setItem('yks_coach_users', JSON.stringify(DEFAULT_USERS));
    return JSON.parse(JSON.stringify(DEFAULT_USERS));
  }
  const users = JSON.parse(str);
  // Her zaman koç hesabının mevcut olduğundan emin ol
  ['gokhan','koc','kaan','cagan'].forEach(k => {
    if (!users[k]) users[k] = DEFAULT_USERS[k];
  });
  return users;
}

function saveUsers(users) {
  localStorage.setItem('yks_coach_users', JSON.stringify(users));
  if (typeof fbSet === 'function') fbSet('yks_coach_users', users);
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
window.getStudentData  = getStudentData;
window.saveStudentData = saveStudentData;
window.getUsers        = getUsers;
window.saveUsers       = saveUsers;
window.generateId      = generateId;
window.getTodayStr     = getTodayStr;
window.formatDateISO   = formatDateISO;
window.formatDate      = formatDate;
window.formatNumber    = formatNumber;
