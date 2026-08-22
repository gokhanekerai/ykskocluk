/**
 * YKS Koçum — Pomodoro & Akıllı Odaklanma Sayacı Modülü
 * Versiyon: 1.0.0
 */

let pomodoroTimer = null;
let pomodoroSecondsLeft = 25 * 60;
let pomodoroTotalSeconds = 25 * 60;
let pomodoroIsRunning = false;
let pomodoroIsPaused = false;
let pomodoroMode = 'pomodoro'; // 'pomodoro' (25m), 'deep' (45m), 'shortBreak' (5m), 'longBreak' (15m), 'custom'
let pomodoroSelectedSubject = '';
let pomodoroSelectedType = 'TYT';
let pomodoroSessionStartTime = null;
let pomodoroElapsedTime = 0; // for stopwatch or elapsed seconds

// Ses efekti (Web Audio API ile basit ve temiz bip/zil sesi)
function playTone(freq = 587.33, duration = 0.5) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.log('Audio error:', e);
  }
}

function initPomodoro() {
  _renderPomodoroUI();
  _updatePomodoroDisplay();
  populatePomodoroSubjects();
}

function populatePomodoroSubjects() {
  const typeSelect = document.getElementById('pomo-type-select');
  const subjSelect = document.getElementById('pomo-subject-select');
  if (!subjSelect) return;

  const type = typeSelect ? typeSelect.value : 'TYT';
  if (typeof YKS_TOPICS !== 'undefined' && YKS_TOPICS[type]) {
    const subjects = Object.keys(YKS_TOPICS[type]);
    subjSelect.innerHTML = '<option value="">Ders Seçiniz (İsteğe Bağlı)...</option>' + 
      subjects.map(s => `<option value="${s}">${s}</option>`).join('');
  }
}

function setPomodoroMode(mode) {
  if (pomodoroIsRunning) {
    if (!confirm('Devam eden bir odak seansı var. Sayacı sıfırlayıp modu değiştirmek istiyor musunuz?')) return;
    resetPomodoro();
  }

  pomodoroMode = mode;
  document.querySelectorAll('.pomo-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  if (mode === 'pomodoro') {
    pomodoroTotalSeconds = 25 * 60;
  } else if (mode === 'deep') {
    pomodoroTotalSeconds = 45 * 60;
  } else if (mode === 'shortBreak') {
    pomodoroTotalSeconds = 5 * 60;
  } else if (mode === 'longBreak') {
    pomodoroTotalSeconds = 15 * 60;
  } else if (mode === 'stopwatch') {
    pomodoroTotalSeconds = 0;
  }

  pomodoroSecondsLeft = pomodoroTotalSeconds;
  pomodoroElapsedTime = 0;
  _updatePomodoroDisplay();
}

function startPomodoro() {
  if (pomodoroIsRunning && !pomodoroIsPaused) return;

  const subjSelect = document.getElementById('pomo-subject-select');
  pomodoroSelectedSubject = subjSelect ? subjSelect.value : '';
  const typeSelect = document.getElementById('pomo-type-select');
  pomodoroSelectedType = typeSelect ? typeSelect.value : 'TYT';

  pomodoroIsRunning = true;
  pomodoroIsPaused = false;
  if (!pomodoroSessionStartTime) pomodoroSessionStartTime = new Date();

  _toggleStartButtons(true);
  playTone(523.25, 0.2); // C5 start sound

  clearInterval(pomodoroTimer);
  pomodoroTimer = setInterval(() => {
    if (pomodoroMode === 'stopwatch') {
      pomodoroElapsedTime++;
      pomodoroSecondsLeft = pomodoroElapsedTime;
    } else {
      pomodoroSecondsLeft--;
      pomodoroElapsedTime++;
      if (pomodoroSecondsLeft <= 0) {
        clearInterval(pomodoroTimer);
        pomodoroIsRunning = false;
        pomodoroIsPaused = false;
        _onPomodoroComplete();
        return;
      }
    }
    _updatePomodoroDisplay();
  }, 1000);
}

function pausePomodoro() {
  if (!pomodoroIsRunning || pomodoroIsPaused) return;
  clearInterval(pomodoroTimer);
  pomodoroIsPaused = true;
  _toggleStartButtons(false, true);
}

function resetPomodoro() {
  clearInterval(pomodoroTimer);
  pomodoroIsRunning = false;
  pomodoroIsPaused = false;
  pomodoroSessionStartTime = null;
  pomodoroElapsedTime = 0;
  pomodoroSecondsLeft = pomodoroTotalSeconds;
  _toggleStartButtons(false);
  _updatePomodoroDisplay();
  _updateTopbarPomodoroBadge();
}

function finishPomodoroEarly() {
  if (pomodoroElapsedTime < 60) {
    if (confirm('Seans henüz 1 dakikayı doldurmadı. İptal etmek istiyor musunuz?')) {
      resetPomodoro();
    }
    return;
  }
  if (confirm('Odak seansını şu anki süresiyle tamamlayıp soru girişine geçmek istiyor musunuz?')) {
    clearInterval(pomodoroTimer);
    pomodoroIsRunning = false;
    pomodoroIsPaused = false;
    _onPomodoroComplete();
  }
}

function _toggleStartButtons(running, paused = false) {
  const btnStart = document.getElementById('pomo-btn-start');
  const btnPause = document.getElementById('pomo-btn-pause');
  const btnFinish = document.getElementById('pomo-btn-finish');
  const btnReset = document.getElementById('pomo-btn-reset');

  if (btnStart) btnStart.style.display = (running && !paused) ? 'none' : 'inline-flex';
  if (btnPause) btnPause.style.display = (running && !paused) ? 'inline-flex' : 'none';
  if (btnFinish) btnFinish.style.display = (running || paused) ? 'inline-flex' : 'none';
  if (btnReset) btnReset.style.display = (running || paused) ? 'inline-flex' : 'none';

  if (btnStart && paused) {
    btnStart.innerHTML = '▶️ Devam Et';
  } else if (btnStart) {
    btnStart.innerHTML = '⚡ Başlat';
  }

  _updateTopbarPomodoroBadge();
}

function _updatePomodoroDisplay() {
  const mins = Math.floor(pomodoroSecondsLeft / 60);
  const secs = pomodoroSecondsLeft % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const timeEl = document.getElementById('pomo-time-display');
  if (timeEl) timeEl.textContent = timeStr;

  // Dairesel Progress Bar
  const circleEl = document.getElementById('pomo-circle-progress');
  if (circleEl && pomodoroTotalSeconds > 0) {
    const totalLength = 565.48; // 2 * PI * 90
    const progress = Math.max(0, pomodoroSecondsLeft / pomodoroTotalSeconds);
    const offset = totalLength * (1 - progress);
    circleEl.style.strokeDashoffset = offset;
  }

  _updateTopbarPomodoroBadge(timeStr);
}

function _updateTopbarPomodoroBadge(timeStr = null) {
  const badgeEl = document.getElementById('topbar-pomo-badge');
  if (!badgeEl) return;

  if (pomodoroIsRunning) {
    if (!timeStr) {
      const mins = Math.floor(pomodoroSecondsLeft / 60);
      const secs = pomodoroSecondsLeft % 60;
      timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    badgeEl.style.display = 'flex';
    badgeEl.innerHTML = `⏱️ <span style="font-family:monospace; margin-left:4px;">${timeStr}</span> ${pomodoroIsPaused ? '(Duraklatıldı)' : ''}`;
  } else {
    badgeEl.style.display = 'none';
  }
}

function _onPomodoroComplete() {
  // Tamamlanma zili
  playTone(880, 0.4);
  setTimeout(() => playTone(1174.66, 0.6), 250);

  _toggleStartButtons(false);
  _updateTopbarPomodoroBadge();

  const durationMins = Math.max(1, Math.round(pomodoroElapsedTime / 60));

  // Modal'ı hazırla ve aç
  _el('pomo-comp-duration', e => e.textContent = `${durationMins} Dakika`);
  _el('pomo-comp-type', e => e.value = pomodoroSelectedType || 'TYT');
  
  // Ders seçimi
  updatePomoCompSubjects();
  _el('pomo-comp-subject', e => {
    if (pomodoroSelectedSubject) e.value = pomodoroSelectedSubject;
  });

  _el('pomo-comp-solved', e => e.value = '');
  _el('pomo-comp-correct', e => e.value = '');
  _el('pomo-comp-wrong', e => e.value = '');
  _el('pomo-comp-blank', e => e.value = '0');
  _el('pomo-comp-notes', e => e.value = '');

  openModal('pomodoro-completion-modal');
  resetPomodoro();
}

function updatePomoCompSubjects() {
  const type = document.getElementById('pomo-comp-type')?.value || 'TYT';
  const select = document.getElementById('pomo-comp-subject');
  if (!select) return;

  if (typeof YKS_TOPICS !== 'undefined' && YKS_TOPICS[type]) {
    const subjects = Object.keys(YKS_TOPICS[type]);
    select.innerHTML = '<option value="">Ders Seçiniz...</option>' + 
      subjects.map(s => `<option value="${s}">${s}</option>`).join('');
  }
}

function calcPomoCompBlank() {
  const s = parseInt(document.getElementById('pomo-comp-solved')?.value) || 0;
  const d = parseInt(document.getElementById('pomo-comp-correct')?.value) || 0;
  const y = parseInt(document.getElementById('pomo-comp-wrong')?.value) || 0;
  const b = Math.max(0, s - d - y);
  const blankEl = document.getElementById('pomo-comp-blank');
  if (blankEl) blankEl.value = b;
}

function handlePomoSaveWithQuestions() {
  const studentId = window.activeStudent;
  if (!studentId) return;

  const data = getStudentData(studentId);
  const todayStr = getTodayStr();

  const type = document.getElementById('pomo-comp-type')?.value || 'TYT';
  const subject = document.getElementById('pomo-comp-subject')?.value;
  const solved = parseInt(document.getElementById('pomo-comp-solved')?.value) || 0;
  const correct = parseInt(document.getElementById('pomo-comp-correct')?.value) || 0;
  const wrong = parseInt(document.getElementById('pomo-comp-wrong')?.value) || 0;
  const blank = Math.max(0, solved - correct - wrong);
  const durationText = document.getElementById('pomo-comp-duration')?.textContent || '25 Dakika';
  const durationMins = parseInt(durationText) || 25;
  const notes = document.getElementById('pomo-comp-notes')?.value || '';

  if (solved > 0 && !subject) {
    alert('Lütfen çözülen soruların ait olduğu dersi seçin!');
    return;
  }

  // 1. Çalışma Seansı Kaydı
  if (!data.studySessions) data.studySessions = [];
  data.studySessions.push({
    id: 'pomo_' + Date.now(),
    date: todayStr,
    durationMins: durationMins,
    type: type,
    subject: subject || 'Genel Çalışma',
    solved: solved,
    correct: correct,
    wrong: wrong,
    blank: blank,
    notes: notes,
    createdAt: new Date().toISOString()
  });

  // 2. Soru Takibine Ekle
  if (solved > 0 && subject) {
    if (!data.dailyLog) data.dailyLog = [];
    data.dailyLog.push({
      id: 'dlog_' + Date.now(),
      date: todayStr,
      tytAyt: type,
      subject: subject,
      topic: notes ? `⏱️ Pomodoro Odak (${notes})` : `⏱️ Pomodoro Odak (${durationMins} dk)`,
      solved: solved,
      correct: correct,
      wrong: wrong,
      blank: blank,
      source: 'Pomodoro Odak Seansı',
      createdAt: new Date().toISOString()
    });
  }

  saveStudentData(studentId, data);
  closeModal('pomodoro-completion-modal');

  showToast(`🎉 ${durationMins} dk odak seansı ${solved > 0 ? `ve ${solved} soru` : ''} başarıyla kaydedildi!`, 'success');

  // Sayfaları yeniden çiz
  _renderPomodoroUI();
  if (typeof renderDailyLog === 'function') renderDailyLog();
  if (typeof renderDashboard === 'function') renderDashboard();
}

function handlePomoSaveDurationOnly() {
  const studentId = window.activeStudent;
  if (!studentId) return;

  const data = getStudentData(studentId);
  const todayStr = getTodayStr();

  const type = document.getElementById('pomo-comp-type')?.value || 'TYT';
  const subject = document.getElementById('pomo-comp-subject')?.value || 'Konu Çalışması';
  const durationText = document.getElementById('pomo-comp-duration')?.textContent || '25 Dakika';
  const durationMins = parseInt(durationText) || 25;
  const notes = document.getElementById('pomo-comp-notes')?.value || '';

  if (!data.studySessions) data.studySessions = [];
  data.studySessions.push({
    id: 'pomo_' + Date.now(),
    date: todayStr,
    durationMins: durationMins,
    type: type,
    subject: subject,
    solved: 0,
    correct: 0,
    wrong: 0,
    blank: 0,
    notes: notes,
    createdAt: new Date().toISOString()
  });

  saveStudentData(studentId, data);
  closeModal('pomodoro-completion-modal');

  showToast(`⏱️ ${durationMins} dakikalık çalışma süresi başarıyla kaydedildi!`, 'success');

  _renderPomodoroUI();
  if (typeof renderDashboard === 'function') renderDashboard();
}

function _renderPomodoroUI() {
  const studentId = window.activeStudent;
  if (!studentId) return;

  const data = getStudentData(studentId);
  const todayStr = getTodayStr();
  const sessions = (data.studySessions || []).filter(s => s.date === todayStr);

  const totalMinsToday = sessions.reduce((s, e) => s + (Number(e.durationMins) || 0), 0);
  const totalHours = Math.floor(totalMinsToday / 60);
  const remainingMins = totalMinsToday % 60;
  const timeFormatted = totalHours > 0 ? `${totalHours}s ${remainingMins}dk` : `${remainingMins} dk`;

  const totalQuestionsPomo = sessions.reduce((s, e) => s + (Number(e.solved) || 0), 0);

  _el('pomo-stat-today-time', e => e.textContent = timeFormatted);
  _el('pomo-stat-today-sessions', e => e.textContent = sessions.length);
  _el('pomo-stat-today-questions', e => e.textContent = totalQuestionsPomo);

  // Seans geçmişi listesi
  const listEl = document.getElementById('pomo-sessions-list');
  if (listEl) {
    if (sessions.length === 0) {
      listEl.innerHTML = `
        <div style="text-align:center; padding:30px 10px; color:var(--text-muted);">
          <div style="font-size:32px; margin-bottom:6px;">⏱️</div>
          <div>Bugün henüz tamamlanmış odaklanma seansı bulunmuyor.</div>
          <div style="font-size:12px; margin-top:4px;">Yukarıdan süreyi seçip "Başlat"a basarak ilk seansına başlayabilirsin!</div>
        </div>
      `;
    } else {
      listEl.innerHTML = sessions.slice().reverse().map(s => `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 14px; margin-bottom:8px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:36px; height:36px; border-radius:8px; background:linear-gradient(135deg, rgba(0,240,255,0.2), rgba(139,92,246,0.2)); border:1px solid rgba(0,240,255,0.3); display:flex; align-items:center; justify-content:center; font-size:16px;">
              ⏱️
            </div>
            <div>
              <div style="font-weight:700; font-size:13.5px; color:var(--text);">${escapeHtml(s.subject)} <span style="font-size:11px; padding:2px 6px; border-radius:4px; background:rgba(255,255,255,0.08); color:var(--primary);">${s.type}</span></div>
              <div style="font-size:11.5px; color:var(--text-muted);">${s.notes ? escapeHtml(s.notes) : 'Odaklanma Seansı'}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:800; font-size:14px; color:#00F0FF;">${s.durationMins} dk</div>
            <div style="font-size:11.5px; color:${s.solved > 0 ? '#00F5A0' : 'var(--text-muted)'};">
              ${s.solved > 0 ? `+${s.solved} Soru (${s.correct}D / ${s.wrong}Y)` : 'Konu Tekrarı'}
            </div>
          </div>
        </div>
      `).join('');
    }
  }
}

// Görevden Tek Tıkla Odak Sayacı Başlatma
function startFocusForTask(subject, topic, durationMins = 45) {
  if (typeof switchTab === 'function') switchTab('pomodoro');
  
  pomodoroSelectedSubject = subject || '';
  pomodoroTotalSeconds = (parseInt(durationMins) || 45) * 60;
  pomodoroSecondsLeft = pomodoroTotalSeconds;
  pomodoroElapsedTime = 0;
  pomodoroMode = 'custom';
  
  const subjSelect = document.getElementById('pomo-subject-select');
  if (subjSelect && subject) {
    subjSelect.value = subject;
  }
  
  const modeLabel = document.getElementById('pomo-current-mode-label');
  if (modeLabel) modeLabel.textContent = `${subject} • ${topic}`;
  
  _updatePomodoroDisplay();
  startPomodoro();
  showToast(`⏱️ "${topic}" için ${durationMins} dk odak sayacı başlatıldı! 🚀`, 'info');
}

// Seans Bitiminde Ek Süre Ekleme
function extendPomodoroTime(extraMins = 15) {
  closeModal('pomodoro-completion-modal');
  pomodoroTotalSeconds = extraMins * 60;
  pomodoroSecondsLeft = pomodoroTotalSeconds;
  pomodoroIsRunning = true;
  pomodoroIsPaused = false;
  _toggleStartButtons(true);
  _updatePomodoroDisplay();
  
  clearInterval(pomodoroTimer);
  pomodoroTimer = setInterval(() => {
    pomodoroSecondsLeft--;
    pomodoroElapsedTime++;
    if (pomodoroSecondsLeft <= 0) {
      clearInterval(pomodoroTimer);
      pomodoroIsRunning = false;
      pomodoroIsPaused = false;
      _onPomodoroComplete();
      return;
    }
    _updatePomodoroDisplay();
  }, 1000);
  
  showToast(`⏱️ +${extraMins} dakika ek süre eklendi, odaklanmaya devam! 🚀`, 'info');
}

// Global export
window.initPomodoro = initPomodoro;
window.setPomodoroMode = setPomodoroMode;
window.startPomodoro = startPomodoro;
window.pausePomodoro = pausePomodoro;
window.resetPomodoro = resetPomodoro;
window.finishPomodoroEarly = finishPomodoroEarly;
window.startFocusForTask = startFocusForTask;
window.extendPomodoroTime = extendPomodoroTime;
window.populatePomodoroSubjects = populatePomodoroSubjects;
window.updatePomoCompSubjects = updatePomoCompSubjects;
window.calcPomoCompBlank = calcPomoCompBlank;
window.handlePomoSaveWithQuestions = handlePomoSaveWithQuestions;
window.handlePomoSaveDurationOnly = handlePomoSaveDurationOnly;
window._renderPomodoroUI = _renderPomodoroUI;
