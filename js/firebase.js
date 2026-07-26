/**
 * firebase.js — Firebase Bağlantısı ve Çift Yönlü Senkronizasyon
 */

const FIREBASE_ROOT = 'ykskocum_data';
let _syncListenerAttached = false;
let _isSyncing = false;

// Firebase'e kaydet
function fbSet(key, data) {
  if (window.db) {
    window.db.ref(`${FIREBASE_ROOT}/${key}`).set(data)
      .catch(e => console.error('[Firebase] write error:', e));
  }
}

// Firebase dinleyicisini başlat (sadece bir kez)
function initFirebaseSync(onSyncCallback) {
  if (!window.db || _syncListenerAttached) return;
  _syncListenerAttached = true;

  window.db.ref(FIREBASE_ROOT).on('value', snapshot => {
    if (_isSyncing) return;
    const remote = snapshot.val();
    if (!remote) return;

    _isSyncing = true;
    let changed = false;

    for (const [key, value] of Object.entries(remote)) {
      const localStr = localStorage.getItem(key);
      const remoteStr = typeof value === 'object' ? JSON.stringify(value) : String(value);

      if (localStr === remoteStr) continue;

      // Yerel veri remote'dan daha doluysa → yerel'i Firebase'e geri yaz
      try {
        const localObj = localStr ? JSON.parse(localStr) : null;
        const remoteObj = typeof value === 'object' ? value : JSON.parse(remoteStr || '{}');

        const localCount = _countEntries(localObj);
        const remoteCount = _countEntries(remoteObj);

        if (localCount > remoteCount) {
          console.log(`[Firebase] Yerel veri daha güncel, Firebase'e yazılıyor: ${key}`);
          fbSet(key, localObj);
          continue;
        }
      } catch (_) {}

      localStorage.setItem(key, remoteStr);
      changed = true;
    }

    _isSyncing = false;
    if (changed && typeof onSyncCallback === 'function') {
      onSyncCallback();
    }
  });
}

function _countEntries(obj) {
  if (!obj) return 0;
  let count = 0;
  if (Array.isArray(obj.tasks)) count += obj.tasks.length;
  if (Array.isArray(obj.dailyLog)) count += obj.dailyLog.length;
  if (Array.isArray(obj.mockLog)) count += obj.mockLog.length;
  if (Array.isArray(obj.books)) count += obj.books.length;
  if (obj.topicStatus) count += Object.keys(obj.topicStatus).length;
  return count;
}

window.fbSet = fbSet;
window.initFirebaseSync = initFirebaseSync;
