/**
 * firebase.js — Firebase Bağlantısı ve Gerçek Zamanlı Senkronizasyon
 */

const FIREBASE_ROOT = 'ykskocum_data';
let _syncListenerAttached = false;
let _isWritingLocally = false;
let _initialSyncDone = false;

// Firebase'e kaydet
function fbSet(key, data) {
  if (window.db) {
    _isWritingLocally = true;

    // Firebase RTDB boş array'leri ([]) saklamaz; açıkça kaldır
    const arrayKeys = ['wrongLog', 'dailyLog', 'mockLog', 'tasks', 'books', 'schedule', 'aiAnalyses'];
    arrayKeys.forEach(ak => {
      if (data && Array.isArray(data[ak]) && data[ak].length === 0) {
        window.db.ref(`${FIREBASE_ROOT}/${key}/${ak}`).remove().catch(() => {});
      }
    });

    window.db.ref(`${FIREBASE_ROOT}/${key}`).set(data)
      .catch(e => console.error('[Firebase] write error:', e))
      .finally(() => {
        setTimeout(() => { _isWritingLocally = false; }, 300);
      });
  }
}

// Firebase dinleyicisini başlat
function initFirebaseSync(onSyncCallback) {
  if (!window.db || _syncListenerAttached) return;
  _syncListenerAttached = true;

  window.db.ref(FIREBASE_ROOT).on('value', snapshot => {
    const remote = snapshot.val();
    if (!remote) return;

    let changed = false;

    for (const [key, value] of Object.entries(remote)) {
      const localStr = localStorage.getItem(key);
      const remoteStr = typeof value === 'object' ? JSON.stringify(value) : String(value);

      if (localStr !== remoteStr) {
        localStorage.setItem(key, remoteStr);
        changed = true;
      }
    }

    _initialSyncDone = true;
    window._initialSyncDone = true;

    if (changed && typeof onSyncCallback === 'function') {
      onSyncCallback();
    }
  });
}


window.fbSet = fbSet;
window.initFirebaseSync = initFirebaseSync;

