/**
 * schedule.js — Çalışma Programı & Görevlendirme Yönetimi
 * Masaüstü (PC) ve Mobil için tam uyumlu, Aylık / Haftalık / Günlük görünümler
 */

function _escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

window.currentScheduleViewMode = window.innerWidth < 768 ? 'week' : 'month'; // 'month' | 'week' | 'day'
let currentPeriodOffset = 0;
window.currentSelectedDayDate = getTodayStr();

function setScheduleViewMode(mode) {
  window.currentScheduleViewMode = mode;
  ['month', 'week', 'day'].forEach(m => {
    const btn = document.getElementById(`sched-view-${m}`);
    if (btn) {
      if (m === mode) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });
  currentPeriodOffset = 0;
  renderSchedule();
}

function changePeriodOffset(delta) {
  currentPeriodOffset += delta;
  renderSchedule();
}

function resetPeriodOffset() {
  currentPeriodOffset = 0;
  window.currentSelectedDayDate = getTodayStr();
  renderSchedule();
}

function selectScheduleDay(dateStr) {
  window.currentSelectedDayDate = dateStr;
  renderSchedule();
}

function renderSchedule() {
  const data = getStudentData(window.activeStudent);
  const schedule = data.schedule || [];
  const wrongLog = data.wrongLog || [];

  _renderWrongPoolBanner(wrongLog);
  _renderScheduleStats(schedule);

  const container = document.getElementById('schedule-week');
  if (!container) return;

  const mode = window.currentScheduleViewMode || 'month';

  // Görünüm moduna göre render et
  if (mode === 'month') {
    _renderMonthView(container, schedule, wrongLog);
  } else if (mode === 'week') {
    _renderWeekView(container, schedule, wrongLog);
  } else if (mode === 'day') {
    _renderDayView(container, schedule, wrongLog);
  }

  // Koç butonları görünürlüğü
  const coachActions = document.getElementById('schedule-coach-actions');
  if (coachActions) {
    coachActions.style.display = (window.currentUser && window.currentUser.role === 'coach') ? 'flex' : 'none';
  }
}

// ─── 1. AYLIK GÖRÜNÜM (MONTH VIEW) ──────────────────────────────────────────

function _renderMonthView(container, schedule, wrongLog) {
  const now = new Date();
  const viewDate = new Date(now.getFullYear(), now.getMonth() + currentPeriodOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const monthName = MONTHS[month];

  const lbl = document.getElementById('schedule-week-label');
  if (lbl) lbl.textContent = `📅 ${monthName} ${year}`;
  
  const subLbl = document.getElementById('schedule-period-sub');
  if (subLbl) subLbl.textContent = currentPeriodOffset === 0 ? 'Bu Ay' : `${Math.abs(currentPeriodOffset)} ay ${currentPeriodOffset > 0 ? 'sonra' : 'önce'}`;

  const DAYS = ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];
  const DAYS_SHORT = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];

  let firstDayOfWeek = viewDate.getDay();
  firstDayOfWeek = (firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;

  let html = '<div class="calendar-month-wrapper">';

  // 1. Haftanın Günleri Başlıkları
  html += '<div class="calendar-weekdays-header">';
  for (let d = 0; d < 7; d++) {
    html += `<div class="calendar-weekday-title"><span class="desktop-only">${DAYS[d]}</span><span class="mobile-only">${DAYS_SHORT[d]}</span></div>`;
  }
  html += '</div>';

  // 2. Takvim Izgarası
  html += '<div class="month-calendar-grid">';
  const todayStr = now.toISOString().split('T')[0];

  for (let i = 0; i < totalCells; i++) {
    let cellYear = year;
    let cellMonth = month;
    let cellDayNum = 0;
    let isOtherMonth = false;

    if (i < firstDayOfWeek) {
      isOtherMonth = true;
      cellDayNum = daysInPrevMonth - (firstDayOfWeek - i - 1);
      const prevDate = new Date(year, month - 1, cellDayNum);
      cellYear = prevDate.getFullYear();
      cellMonth = prevDate.getMonth();
    } else if (i >= firstDayOfWeek + daysInMonth) {
      isOtherMonth = true;
      cellDayNum = i - (firstDayOfWeek + daysInMonth) + 1;
      const nextDate = new Date(year, month + 1, cellDayNum);
      cellYear = nextDate.getFullYear();
      cellMonth = nextDate.getMonth();
    } else {
      cellDayNum = i - firstDayOfWeek + 1;
    }

    const dStr = `${cellYear}-${String(cellMonth + 1).padStart(2, '0')}-${String(cellDayNum).padStart(2, '0')}`;
    const isToday = (dStr === todayStr);
    const isSelected = (dStr === window.currentSelectedDayDate);

    const dayData = schedule.find(s => s.date === dStr);
    const items = dayData?.items || [];
    const doneCount = items.filter(item => item.done).length;
    const isAllDone = items.length > 0 && (doneCount === items.length);

    // Nokta Göstergeleri (Mobil İçin)
    let dotsHtml = '';
    if (items.length > 0) {
      const dotColor = isAllDone ? '#10b981' : '#a855f7';
      dotsHtml = `
        <div class="month-day-dots mobile-only">
          <span class="month-day-dot" style="background:${dotColor};"></span>
          ${items.length > 1 ? `<span class="month-day-dot-count" style="color:${dotColor};">${items.length}</span>` : ''}
        </div>
      `;
    }

    // Masaüstü için Görev Chip'leri
    let chipsHtml = '';
    if (items.length > 0) {
      const visibleItems = items.slice(0, 2);
      chipsHtml = visibleItems.map(it => `
        <div class="month-task-chip ${it.done ? 'done' : ''}" title="${_escapeHtml(it.subject)}: ${_escapeHtml(it.topic)}">
          <span>${it.done ? '✓' : '•'}</span>
          <span>${_escapeHtml(it.subject)}</span>
        </div>
      `).join('');

      if (items.length > 2) {
        chipsHtml += `<div class="month-task-more">+${items.length - 2} daha</div>`;
      }
    } else {
      chipsHtml = `<div class="month-task-empty desktop-only">+ Görev Ekle</div>`;
    }

    let badgeHtml = '';
    if (items.length > 0) {
      const badgeStyle = isAllDone ? 'background:rgba(16,185,129,0.2); color:#34d399;' : 'background:rgba(139,92,246,0.2); color:#c084fc;';
      badgeHtml = `<span class="month-day-badge desktop-only" style="${badgeStyle}">${doneCount}/${items.length}</span>`;
    }

    const MONTHS_SHORT = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
    const monthShort = MONTHS_SHORT[cellMonth];

    html += `
      <div class="month-day-cell ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}"
           onclick="selectScheduleDay('${dStr}')">
        <div class="month-day-top">
          <div style="display:flex; align-items:baseline; gap:3px;">
            <span class="month-day-num">${cellDayNum}</span>
            <span class="month-short-name desktop-only">${monthShort}</span>
          </div>
          ${badgeHtml}
        </div>
        ${dotsHtml}
        <div class="month-day-tasks desktop-only">
          ${chipsHtml}
        </div>
      </div>
    `;
  }
  html += '</div>'; // .month-calendar-grid

  // 3. Seçili Günün Görevleri Paneli
  html += _renderSelectedDayCardHtml(schedule, wrongLog, window.currentSelectedDayDate);
  html += '</div>'; // .calendar-month-wrapper

  container.innerHTML = html;
}

// ─── 2. HAFTALIK GÖRÜNÜM (WEEK VIEW - 7 GÜN GENİŞ) ──────────────────────────

function _renderWeekView(container, schedule, wrongLog) {
  const now = new Date();
  const baseDate = new Date(now);
  baseDate.setDate(now.getDate() + (currentPeriodOffset * 7));

  // Haftanın Pazartesi gününü bul
  const dayOfWk = baseDate.getDay();
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - (dayOfWk === 0 ? 6 : dayOfWk - 1));

  const weekDates = Array.from({length: 7}, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const startMonth = MONTHS[weekDates[0].getMonth()];
  const endMonth = MONTHS[weekDates[6].getMonth()];
  const yearStr = weekDates[0].getFullYear();

  const rangeLabel = startMonth === endMonth 
    ? `${weekDates[0].getDate()} - ${weekDates[6].getDate()} ${startMonth} ${yearStr}`
    : `${weekDates[0].getDate()} ${startMonth} - ${weekDates[6].getDate()} ${endMonth} ${yearStr}`;

  const lbl = document.getElementById('schedule-week-label');
  if (lbl) lbl.textContent = `🗓️ ${rangeLabel}`;

  const subLbl = document.getElementById('schedule-period-sub');
  if (subLbl) subLbl.textContent = currentPeriodOffset === 0 ? 'Bu Hafta' : `${Math.abs(currentPeriodOffset)} hafta ${currentPeriodOffset > 0 ? 'sonra' : 'önce'}`;

  const DAYS = ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];
  const DAYS_SHORT = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
  const todayStr = getTodayStr();

  let html = '<div class="calendar-week-container">';

  // Mobil için Gün Seçici Şerit (Pills)
  html += '<div class="week-pills-bar mobile-only">';
  weekDates.forEach((dObj, idx) => {
    const dStr = formatDateISO(dObj);
    const isToday = (dStr === todayStr);
    const isSelected = (dStr === window.currentSelectedDayDate);
    const dayData = schedule.find(s => s.date === dStr);
    const items = dayData?.items || [];
    const doneCount = items.filter(it => it.done).length;
    const isAllDone = items.length > 0 && doneCount === items.length;

    let dotClass = '';
    if (items.length > 0) dotClass = isAllDone ? 'dot-done' : 'dot-active';

    html += `
      <button class="week-pill-btn ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}" onclick="selectScheduleDay('${dStr}')">
        <div class="week-pill-name">${DAYS_SHORT[idx]}</div>
        <div class="week-pill-num">${dObj.getDate()}</div>
        ${dotClass ? `<div class="week-pill-dot ${dotClass}"></div>` : '<div class="week-pill-dot empty"></div>'}
      </button>
    `;
  });
  html += '</div>';

  // 7 Günlük Kartlar Izgarası
  html += '<div class="week-columns-grid">';
  weekDates.forEach((dObj, idx) => {
    const dStr = formatDateISO(dObj);
    const isToday = (dStr === todayStr);
    const isSelected = (dStr === window.currentSelectedDayDate);
    const dayData = schedule.find(s => s.date === dStr);
    const items = dayData?.items || [];
    const doneCount = items.filter(it => it.done).length;
    const isAllDone = items.length > 0 && doneCount === items.length;

    const isCoach = (window.currentUser && window.currentUser.role === 'coach');

    html += `
      <div class="week-day-column ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" id="wcol-${dStr}">
        <!-- Gün Başlığı -->
        <div class="week-day-header" onclick="selectScheduleDay('${dStr}')">
          <div>
            <div class="week-day-name">${DAYS[idx]}</div>
            <div class="week-day-date">${dObj.getDate()} ${MONTHS[dObj.getMonth()]}</div>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            ${items.length > 0 ? `
              <span class="week-day-badge ${isAllDone ? 'done' : ''}">${doneCount}/${items.length}</span>
            ` : ''}
            <button class="btn-icon-sm" style="color:var(--primary); font-size:14px;" onclick="event.stopPropagation(); openAddScheduleItem('${dStr}')" title="Bu güne görev ekle">➕</button>
          </div>
        </div>

        <!-- Görev Listesi -->
        <div class="week-day-tasks-list">
          ${items.length === 0 ? `
            <div class="week-empty-day" onclick="openAddScheduleItem('${dStr}')">
              <span>+</span>
              <p>Görev Ata</p>
            </div>
          ` : items.map(item => {
            const icon = {
              'konu çalışma': '📖', 'soru çözme': '✏️', 'deneme': '📝', 'tekrar': '🔁', 'video': '🎬'
            }[item.type] || '📌';

            return `
              <div class="week-task-card ${item.done ? 'done' : ''}" id="si-${item.id}">
                <div style="display:flex; align-items:flex-start; gap:8px;">
                  <input type="checkbox" class="task-check" ${item.done ? 'checked' : ''}
                         onchange="toggleScheduleItem('${dStr}', '${item.id}', this.checked)">
                  <div style="flex:1; min-width:0;">
                    <div class="week-task-subject">${_escapeHtml(item.subject)}</div>
                    <div class="week-task-topic" title="${_escapeHtml(item.topic)}">${_escapeHtml(item.topic)}</div>
                    <div class="week-task-meta">
                      <span>⏱️ ${item.duration || 60} dk</span>
                      ${item.questions ? `<span>• ✏️ ${item.questions} S</span>` : ''}
                      ${_renderTaskBooksSpan(item)}
                    </div>
                  </div>
                  ${isCoach ? `
                    <div class="week-task-actions">
                      <button class="btn-icon-xs" onclick="openEditScheduleItem('${dStr}','${item.id}')" title="Düzenle">✏️</button>
                      <button class="btn-icon-xs text-danger" onclick="deleteScheduleItem('${dStr}','${item.id}')" title="Sil">🗑️</button>
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Kolon Altı Buton -->
        <div class="week-day-footer">
          <button class="btn btn-sm btn-secondary week-add-btn" onclick="openAddScheduleItem('${dStr}')">
            + Görev Ekle
          </button>
        </div>
      </div>
    `;
  });
  html += '</div>'; // .week-columns-grid

  // Mobilde seçili günün detay paneli
  html += '<div class="mobile-only" style="margin-top:16px;">';
  html += _renderSelectedDayCardHtml(schedule, wrongLog, window.currentSelectedDayDate);
  html += '</div>';

  html += '</div>'; // .calendar-week-container
  container.innerHTML = html;
}

// ─── 3. GÜNLÜK GÖRÜNÜM (DAY / LIST VIEW) ────────────────────────────────────

function _renderDayView(container, schedule, wrongLog) {
  const targetDateStr = window.currentSelectedDayDate || getTodayStr();
  const dateObj = new Date(targetDateStr + 'T00:00:00');
  
  const formattedDate = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });

  const lbl = document.getElementById('schedule-week-label');
  if (lbl) lbl.textContent = `📋 ${formattedDate}`;

  const subLbl = document.getElementById('schedule-period-sub');
  if (subLbl) {
    const todayStr = getTodayStr();
    subLbl.textContent = (targetDateStr === todayStr) ? 'Bugün' : targetDateStr;
  }

  let html = '<div class="calendar-day-view-container">';
  html += _renderSelectedDayCardHtml(schedule, wrongLog, targetDateStr, true);
  html += '</div>';

  container.innerHTML = html;
}

// ─── SEÇİLİ GÜNÜN DETAY KARTI (INLINE AKTİF GÜN GÖREV YÖNETİCİSİ) ────────────

function _renderSelectedDayCardHtml(schedule, wrongLog, dateStr, isFullDayView = false) {
  if (!dateStr) dateStr = getTodayStr();
  const dateObj = new Date(dateStr + 'T00:00:00');
  const formattedDate = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });

  const todayStr = getTodayStr();
  const isToday = (dateStr === todayStr);

  const dayData = schedule.find(s => s.date === dateStr);
  const items = dayData?.items || [];
  const doneCount = items.filter(it => it.done).length;
  const isCoach = (window.currentUser && window.currentUser.role === 'coach');

  let html = `
    <div class="card selected-day-panel" style="margin-top: 16px; border: 1px solid rgba(139,92,246,0.3); background: linear-gradient(145deg, rgba(26,26,38,0.95) 0%, rgba(18,18,28,0.98) 100%);">
      <div class="selected-day-panel-header">
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <div class="selected-day-badge-today ${isToday ? 'is-today' : ''}">
            ${isToday ? 'BUGÜN' : 'GÜN'}
          </div>
          <div>
            <div class="selected-day-panel-title">
              📅 ${formattedDate}
            </div>
            <div class="selected-day-panel-subtitle">
              ${items.length > 0 ? `Toplam <strong>${items.length}</strong> görev • <strong>${doneCount}</strong> tamamlandı` : 'Planlanmış görev yok'}
            </div>
          </div>
        </div>

        <div class="selected-day-panel-actions">
          <button class="btn btn-sm btn-accent" onclick="openWrongPoolForCurrentDay()" title="Yanlış havuzundan görev ekle">
            📋 Yanlış Havuzu
          </button>
          <button class="btn btn-sm btn-primary" onclick="openAddScheduleItem('${dateStr}')">
            + Görev Ekle
          </button>
        </div>
      </div>

      <!-- Görev Listesi -->
      <div class="selected-day-items-list">
  `;

  if (!items.length) {
    html += `
      <div class="selected-day-empty-box">
        <div style="font-size:32px; margin-bottom:8px;">🎯</div>
        <div style="font-weight:700; font-size:15px; color:var(--text); margin-bottom:4px;">Bu gün için henüz bir görev eklenmemiş</div>
        <div style="font-size:13px; color:var(--text-muted); margin-bottom:14px;">Öğrenciye bu gün çalışacağı konuları veya soru hedeflerini atayabilirsiniz.</div>
        <button class="btn btn-primary" onclick="openAddScheduleItem('${dateStr}')">
          + Bu Güne Görev Ata
        </button>
      </div>
    `;
  } else {
    html += items.map(item => {
      const icon = {
        'konu çalışma': '📖', 'soru çözme': '✏️', 'deneme': '📝', 'tekrar': '🔁', 'video': '🎬'
      }[item.type] || '📌';

      let metaParts = [`⏱️ ${item.duration || 60} dk`, item.type || 'konu çalışma'];
      if (item.questions) metaParts.push(`✏️ ${item.questions} Soru`);
      if (item.pages) metaParts.push(`📄 ${item.pages} Sayfa`);
      const taskBooks = _getTaskBooks(item);
      if (taskBooks.length > 0) metaParts.push(`📚 ${_escapeHtml(taskBooks.join(', '))}`);

      // Yanlış Notu Eşleşmesi
      const matchingWrongs = _getMatchingWrongNotes(item.subject, item.topic, wrongLog);
      const pendingWrongs = matchingWrongs.filter(w => !w.reviewed);

      let wrongBtnHtml = '';
      if (matchingWrongs.length > 0) {
        const isPending = pendingWrongs.length > 0;
        const badgeText = isPending ? `🔴 ${pendingWrongs.length} Yanlış Notu` : `✅ ${matchingWrongs.length} Tekrar Edildi`;
        const badgeStyle = isPending 
          ? 'background:rgba(239,68,68,0.18); color:#f87171; border:1px solid rgba(239,68,68,0.4);' 
          : 'background:rgba(16,185,129,0.15); color:#34d399; border:1px solid rgba(16,185,129,0.3);';

        const safeSubj = (item.subject || '').replace(/'/g, "\\'");
        const safeTopic = (item.topic || '').replace(/'/g, "\\'");

        wrongBtnHtml = `
          <button type="button" 
                  style="${badgeStyle} border-radius: 4px; padding: 2px 8px; font-size: 11px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; margin-top:6px;"
                  onclick="event.stopPropagation(); openScheduleWrongModal('${safeSubj}', '${safeTopic}')">
            ${badgeText} →
          </button>
        `;
      }

      return `
        <div class="selected-day-task-card ${item.done ? 'done' : ''}">
          <div class="selected-day-task-check-wrapper">
            <input type="checkbox" class="task-checkbox-lg" ${item.done ? 'checked' : ''}
                   onchange="toggleScheduleItem('${dateStr}', '${item.id}', this.checked)">
          </div>

          <div class="selected-day-task-content">
            <div class="selected-day-task-top">
              <span style="font-size:16px;">${icon}</span>
              <span class="tag tag-subject" style="font-size:11px;">${_escapeHtml(item.subject)}</span>
              <span class="selected-day-task-title ${item.done ? 'done' : ''}">
                ${_escapeHtml(item.topic)}
              </span>
            </div>
            <div class="selected-day-task-meta" style="display:flex; align-items:center; flex-wrap:wrap; gap:6px;">
              <span>${metaParts.join(' • ')}</span>
              ${!item.done ? `
                <button type="button" class="btn btn-xs" 
                        style="padding:2px 7px; font-size:11px; font-weight:700; background:linear-gradient(135deg, rgba(0,240,255,0.15), rgba(139,92,246,0.15)); border:1px solid rgba(0,240,255,0.35); color:#00F0FF; border-radius:6px; cursor:pointer;"
                        onclick="event.stopPropagation(); startFocusForTask('${safeSubj}', '${safeTopic}', ${item.duration || 45})" 
                        title="Bu göreve odaklan ve Pomodoro sayacını başlat">
                  ⏱️ Odaklan (${item.duration || 45} dk)
                </button>
              ` : ''}
            </div>
            ${wrongBtnHtml}
          </div>

          ${isCoach ? `
            <div class="selected-day-task-actions">
              <button class="btn-icon-sm" style="color:var(--primary);" onclick="openEditScheduleItem('${dateStr}','${item.id}')" title="Düzenle">✏️</button>
              <button class="btn-icon-sm text-danger" onclick="deleteScheduleItem('${dateStr}','${item.id}')" title="Sil">🗑️</button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  html += `
      </div>
    </div>
  `;

  return html;
}

// ─── BANNER & İSTATİSTİKLER ──────────────────────────────────────────────────

function _renderWrongPoolBanner(wrongLog) {
  const bannerEl = document.getElementById('schedule-wrong-pool-bar');
  if (!bannerEl) return;

  const pending = (wrongLog || []).filter(w => !w.reviewed);
  if (!pending.length) {
    bannerEl.innerHTML = '';
    return;
  }

  const topicsMap = {};
  pending.forEach(w => {
    const key = `${w.subject || ''} - ${w.topic || ''}`;
    topicsMap[key] = (topicsMap[key] || 0) + 1;
  });
  const topicCount = Object.keys(topicsMap).length;

  bannerEl.innerHTML = `
    <div class="card" style="background: linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(30,30,36,0.95) 100%); border: 1px solid rgba(239,68,68,0.35); padding: 12px 16px; border-radius: 10px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="font-size:24px; background:rgba(239,68,68,0.18); width:42px; height:42px; border-radius:8px; display:flex; align-items:center; justify-content:center; border:1px solid rgba(239,68,68,0.3);">🔥</div>
          <div>
            <div style="font-weight:800; font-size:14px; color:#f87171;">Yanlış Defterinde Tekrar Bekleyen ${pending.length} Soru / Not Var! (${topicCount} Farklı Konu)</div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">Öğrencinin eksik kaldığı bu konuları tek tıkla haftalık programa tekrar görevi olarak ekleyebilirsiniz.</div>
          </div>
        </div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <button class="btn btn-sm" style="border:1px solid rgba(239,68,68,0.4); color:#f87171; background:rgba(239,68,68,0.1); font-weight:700;" onclick="openWrongPoolModal()">📋 Havuzu İncele (${pending.length})</button>
          <button class="btn btn-sm btn-primary" style="background:linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border:none; font-weight:700;" onclick="autoAssignWrongReviewsToSchedule()">🔁 Tek Tıkla Programa Dağıt</button>
        </div>
      </div>
    </div>
  `;
}

function _renderScheduleStats(schedule) {
  const allItems  = schedule.flatMap(s => s.items || []);
  const total     = allItems.length;
  const done      = allItems.filter(i => i.done).length;
  const totalMins = allItems.reduce((s,i) => s + (i.duration || 0), 0);
  const doneMins  = allItems.filter(i=>i.done).reduce((s,i) => s + (i.duration||0), 0);

  _el('sched-total',   e => e.textContent = total);
  _el('sched-done',    e => e.textContent = done);
  _el('sched-mins',    e => e.textContent = doneMins + ' dk');
  _el('sched-pct',     e => e.textContent = total > 0 ? Math.round(done/total*100) + '%' : '0%');
}

// ─── ÖĞE İŞLEMLERİ ────────────────────────────────────────────────────────────

// ─── OTOMATİK KONU TAKİBİ SENKRONİZASYONU ────────────────────────────────────

function _syncScheduleWithTopicStatus(data, subject, topic, targetStatus) {
  if (!data || !subject || !topic) return;
  if (!data.topicStatus) data.topicStatus = {};

  let group = 'tyt';
  let baseSubject = subject;

  if (subject.startsWith('TYT ')) {
    group = 'tyt';
    baseSubject = subject.replace('TYT ', '').trim();
  } else if (subject.startsWith('AYT ')) {
    group = 'ayt';
    baseSubject = subject.replace('AYT ', '').trim();
  } else {
    if (typeof YKS_TOPICS !== 'undefined') {
      if (YKS_TOPICS.TYT && YKS_TOPICS.TYT[subject]) group = 'tyt';
      else if (YKS_TOPICS.AYT && YKS_TOPICS.AYT[subject]) group = 'ayt';
    }
  }

  // Standart key
  const topicKey = `${group}_${baseSubject}_${topic}`;
  const legacyKey = `${group.toUpperCase()}_${baseSubject}_${topic}`;

  if (targetStatus === 'completed') {
    data.topicStatus[topicKey] = 'completed';
    delete data.topicStatus[legacyKey];
  } else if (targetStatus === 'studying') {
    if (data.topicStatus[topicKey] !== 'completed' && data.topicStatus[legacyKey] !== 'completed') {
      data.topicStatus[topicKey] = 'studying';
    }
    delete data.topicStatus[legacyKey];
  } else if (targetStatus === 'revert_from_completed') {
    const hasOtherDone = (data.schedule || []).some(day =>
      (day.items || []).some(i => i.done && i.subject === subject && i.topic === topic)
    );
    if (!hasOtherDone) {
      data.topicStatus[topicKey] = 'studying';
    }
  }
}

let pendingCompletionContext = null;

function _resolveTytAyt(subject) {
  if (!subject) return 'TYT';
  if (subject.startsWith('AYT ') || subject.includes('(AYT)')) return 'AYT';
  if (subject.startsWith('TYT ') || subject.includes('(TYT)')) return 'TYT';
  if (typeof YKS_TOPICS !== 'undefined') {
    if (YKS_TOPICS.AYT && YKS_TOPICS.AYT[subject]) return 'AYT';
    if (YKS_TOPICS.TYT && YKS_TOPICS.TYT[subject]) return 'TYT';
  }
  return 'TYT';
}

function _cleanSubjectName(subject) {
  if (!subject) return '';
  return subject.replace(/^(TYT|AYT)\s+/, '').replace(/\s+\((TYT|AYT)\)/, '').trim();
}

function toggleScheduleItem(dateStr, itemId, done) {
  const data = getStudentData(window.activeStudent);
  const day  = (data.schedule || []).find(s => s.date === dateStr);
  if (!day) return;

  const item = (day.items || []).find(i => i.id === itemId);
  if (!item) return;

  if (done) {
    // Görevi tamamlama ve soru girişi modalını aç
    openTaskCompletionModal(dateStr, itemId, item);
  } else {
    // Tamamlanmayı geri al
    item.done = false;
    _syncScheduleWithTopicStatus(data, item.subject, item.topic, 'revert_from_completed');

    // Eğer bu göreve bağlı eklenmiş soru kaydı varsa temizle
    if (Array.isArray(data.dailyLog)) {
      data.dailyLog = data.dailyLog.filter(e => e.taskId !== itemId);
    }
    delete item.completedResult;

    saveStudentData(window.activeStudent, data);
    renderSchedule();
    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof _renderTopicStats === 'function') _renderTopicStats();
    if (typeof renderTopics === 'function') renderTopics();
    if (typeof renderDailyLog === 'function') renderDailyLog();
    if (typeof checkNotifications === 'function') checkNotifications();
    showToast(`"${item.topic}" tamamlanmadı olarak işaretlendi.`, 'info');
  }
}

function openTaskCompletionModal(dateStr, itemId, item) {
  pendingCompletionContext = { dateStr, itemId, item };

  const titleEl = document.getElementById('comp-task-title');
  if (titleEl) titleEl.textContent = `${item.subject} — ${item.topic}`;

  const metaEl = document.getElementById('comp-task-meta');
  if (metaEl) {
    const books = _getTaskBooks(item);
    let metaTxt = `⏱️ ${item.duration || 60} dk`;
    if (item.questions) metaTxt += ` • 🎯 Hedef: ${item.questions} Soru`;
    if (books.length > 0) metaTxt += ` • 📚 ${books.join(', ')}`;
    metaEl.textContent = metaTxt;
  }

  const solvedInput = document.getElementById('comp-solved');
  if (solvedInput) solvedInput.value = item.questions || '';

  const correctInput = document.getElementById('comp-correct');
  if (correctInput) correctInput.value = '';

  const wrongInput = document.getElementById('comp-wrong');
  if (wrongInput) wrongInput.value = '';

  calcCompBlank();
  openModal('task-completion-modal');
}

function calcCompBlank() {
  const solved = parseInt(document.getElementById('comp-solved')?.value) || 0;
  const correct = parseInt(document.getElementById('comp-correct')?.value) || 0;
  const wrong = parseInt(document.getElementById('comp-wrong')?.value) || 0;
  const blank = Math.max(0, solved - correct - wrong);

  const display = document.getElementById('comp-blank-display');
  if (display) {
    display.textContent = `${blank} Boş`;
    display.style.color = (correct + wrong > solved && solved > 0) ? 'var(--danger)' : '#FFE600';
  }
}

function handleTaskCompletionSubmit(e) {
  if (e) e.preventDefault();
  if (!pendingCompletionContext) return;

  const { dateStr, itemId, item } = pendingCompletionContext;
  const data = getStudentData(window.activeStudent);
  const day = (data.schedule || []).find(s => s.date === dateStr);
  if (!day) return;
  const currentItem = (day.items || []).find(i => i.id === itemId) || item;

  const solved = parseInt(document.getElementById('comp-solved')?.value) || 0;
  const correct = parseInt(document.getElementById('comp-correct')?.value) || 0;
  const wrong = parseInt(document.getElementById('comp-wrong')?.value) || 0;

  if (solved > 0 && (correct + wrong > solved)) {
    showToast('Doğru + Yanlış sayısı toplam çözülen sorudan fazla olamaz!', 'warning');
    return;
  }

  // 1. Görevi tamamlandı olarak işaretle
  currentItem.done = true;
  _syncScheduleWithTopicStatus(data, currentItem.subject, currentItem.topic, 'completed');

  // 2. Eğer soru çözülmüşse Soru Takibine (dailyLog) otomatik işle
  if (solved > 0) {
    if (!Array.isArray(data.dailyLog)) data.dailyLog = [];
    
    const existingIdx = data.dailyLog.findIndex(el => el.taskId === itemId);
    const logEntry = {
      id: existingIdx !== -1 ? data.dailyLog[existingIdx].id : generateId(),
      date: dateStr,
      tytAyt: _resolveTytAyt(currentItem.subject),
      subject: _cleanSubjectName(currentItem.subject),
      solved: solved,
      correct: correct,
      wrong: wrong,
      taskId: itemId
    };

    if (existingIdx !== -1) {
      data.dailyLog[existingIdx] = logEntry;
    } else {
      data.dailyLog.push(logEntry);
    }
    currentItem.completedResult = { solved, correct, wrong, blank: Math.max(0, solved - correct - wrong) };
  }

  saveStudentData(window.activeStudent, data);
  closeModal('task-completion-modal');
  pendingCompletionContext = null;

  renderSchedule();
  if (typeof renderDashboard === 'function') renderDashboard();
  if (typeof _renderTopicStats === 'function') _renderTopicStats();
  if (typeof renderTopics === 'function') renderTopics();
  if (typeof renderDailyLog === 'function') renderDailyLog();
  if (typeof checkNotifications === 'function') checkNotifications();

  if (solved > 0) {
    showToast(`🎉 Tebrikler! Görev tamamlandı ve Soru Takibine ${solved} soru (${correct} D, ${wrong} Y) işlendi!`, 'success');
  } else {
    showToast(`🎉 Tebrikler! "${currentItem.topic}" tamamlandı!`, 'success');
  }
}

function completeTaskWithoutQuestions() {
  if (!pendingCompletionContext) return;
  const { dateStr, itemId, item } = pendingCompletionContext;
  const data = getStudentData(window.activeStudent);
  const day = (data.schedule || []).find(s => s.date === dateStr);
  if (day) {
    const currentItem = (day.items || []).find(i => i.id === itemId) || item;
    currentItem.done = true;
    _syncScheduleWithTopicStatus(data, currentItem.subject, currentItem.topic, 'completed');
  }
  saveStudentData(window.activeStudent, data);
  closeModal('task-completion-modal');
  pendingCompletionContext = null;

  renderSchedule();
  if (typeof renderDashboard === 'function') renderDashboard();
  if (typeof _renderTopicStats === 'function') _renderTopicStats();
  if (typeof renderTopics === 'function') renderTopics();
  if (typeof checkNotifications === 'function') checkNotifications();
  showToast(`🎉 "${item.topic}" tamamlandı olarak işaretlendi!`, 'success');
}

function cancelTaskCompletion() {
  if (pendingCompletionContext) {
    const { itemId } = pendingCompletionContext;
    const chk = document.querySelector(`#si-${itemId} input[type="checkbox"]`);
    if (chk) chk.checked = false;
    renderSchedule();
  }
  closeModal('task-completion-modal');
  pendingCompletionContext = null;
}

function deleteScheduleItem(dateStr, itemId) {
  if (!confirm('Bu görevi silmek istediğinize emin misiniz?')) return;
  const data = getStudentData(window.activeStudent);
  const day  = (data.schedule || []).find(s => s.date === dateStr);
  if (!day) return;

  const item = (day.items || []).find(i => i.id === itemId);
  day.items = day.items.filter(i => i.id !== itemId);
  if (day.items.length === 0) {
    data.schedule = data.schedule.filter(s => s.date !== dateStr);
  }

  if (item) {
    _syncScheduleWithTopicStatus(data, item.subject, item.topic, 'revert_from_completed');
  }

  saveStudentData(window.activeStudent, data);
  renderSchedule();
  if (typeof renderDashboard === 'function') renderDashboard();
  if (typeof _renderTopicStats === 'function') _renderTopicStats();
  if (typeof renderTopics === 'function') renderTopics();
  if (typeof checkNotifications === 'function') checkNotifications();
  showToast('Görev silindi.', 'info');
}

// ─── EL İLE ÖĞE EKLEME & DÜZENLEME ──────────────────────────────────────────

let editingScheduleContext = null;

function toggleCustomTopicInput(isCustom) {
  const select = document.getElementById('sched-topic');
  const customWrapper = document.getElementById('sched-custom-topic-wrapper');
  const customInput = document.getElementById('sched-custom-topic');

  if (isCustom) {
    if (customWrapper) customWrapper.style.display = 'block';
    if (select) {
      select.required = false;
      select.value = '__custom__';
    }
    if (customInput) {
      customInput.required = true;
      customInput.focus();
    }
  } else {
    if (customWrapper) customWrapper.style.display = 'none';
    if (customInput) {
      customInput.required = false;
      customInput.value = '';
    }
    if (select) {
      select.required = true;
      if (select.value === '__custom__') select.value = '';
    }
  }
}

function handleTopicSelectChange(val) {
  if (val === '__custom__') {
    toggleCustomTopicInput(true);
  } else {
    toggleCustomTopicInput(false);
  }
}

function _populateSchedSubjectSelect() {
  const subjSelect = document.getElementById('sched-subject');
  if (!subjSelect) return;
  if (subjSelect.options.length <= 1) {
    let opts = '<option value="">Ders Seçin...</option>';
    if (typeof YKS_TOPICS !== 'undefined') {
      const users = getUsers();
      const student = users[window.activeStudent];
      
      for (const group in YKS_TOPICS) {
        opts += `<optgroup label="${group}">`;
        for (const subj in YKS_TOPICS[group]) {
          if (student && student.branch === 'Sayısal' && group === 'AYT') {
            if (['Edebiyat', 'Tarih (AYT)', 'Coğrafya (AYT)'].includes(subj)) {
              continue;
            }
          }
          opts += `<option value="${group} ${subj}" data-group="${group}" data-subj="${subj}">${subj}</option>`;
        }
        opts += `</optgroup>`;
      }
    }
    subjSelect.innerHTML = opts;
  }
}

// ─── ÇOKLU KAYNAK (MULTI-RESOURCE) YARDIMCILARI ──────────────────────────

window._currentSchedBooks = [];

function _getTaskBooks(item) {
  if (!item) return [];
  if (Array.isArray(item.books) && item.books.length > 0) {
    return item.books.map(b => String(b).trim()).filter(Boolean);
  }
  if (typeof item.book === 'string' && item.book.trim()) {
    return item.book.split(',').map(b => b.trim()).filter(Boolean);
  }
  return [];
}

function _renderTaskBooksSpan(item) {
  const books = _getTaskBooks(item);
  if (!books.length) return '';
  return `<span class="week-task-book" title="Kaynaklar: ${_escapeHtml(books.join(', '))}">• 📚 ${_escapeHtml(books.join(', '))}</span>`;
}

function _renderSchedSelectedBooksChips() {
  const container = document.getElementById('sched-selected-books-container');
  if (!container) return;
  const books = window._currentSchedBooks || [];
  if (!books.length) {
    container.innerHTML = '<span style="font-size:12px; color:var(--text-muted); font-style:italic;">Seçilen kaynak yok</span>';
    return;
  }
  container.innerHTML = books.map(b => `
    <span class="sched-book-badge" style="background:rgba(255,107,0,0.18); border:1px solid rgba(255,107,0,0.4); color:#FF9040; padding:3px 8px; border-radius:12px; font-size:12px; font-weight:600; display:inline-flex; align-items:center; gap:6px;">
      📚 ${_escapeHtml(b)}
      <span onclick="removeSchedBook('${b.replace(/'/g, "\\'")}')" style="cursor:pointer; font-weight:800; font-size:13px; margin-left:2px; color:#ff5555;" title="Kaldır">✕</span>
    </span>
  `).join('');
}

function _syncSchedBooksPickerCheckboxes() {
  const picker = document.getElementById('sched-books-picker');
  if (!picker) return;
  const selected = window._currentSchedBooks || [];
  picker.querySelectorAll('input[type="checkbox"]').forEach(chk => {
    chk.checked = selected.includes(chk.value);
  });
}

function _updateSchedBooksPicker(subjectOverride) {
  const picker = document.getElementById('sched-books-picker');
  if (!picker) return;
  
  const subjSelect = document.getElementById('sched-subject');
  const subj = subjectOverride || (subjSelect ? (subjSelect.options[subjSelect.selectedIndex]?.getAttribute('data-subj') || subjSelect.value) : '');
  
  const data = getStudentData(window.activeStudent);
  const allBooks = (data && data.books) ? data.books : [];
  const selected = window._currentSchedBooks || [];
  
  if (!allBooks.length && !selected.length) {
    picker.innerHTML = `
      <div style="font-size:12px; color:var(--text-muted); padding:4px 0;">
        Kütüphanede kayıtlı kaynak yok. 
        <a href="javascript:void(0)" onclick="toggleCustomBookInput(true)" style="color:#00F0FF; font-weight:700; text-decoration:underline;">Özel Kaynak Ekle</a>
      </div>`;
    _renderSchedSelectedBooksChips();
    return;
  }

  const curSubj = (subj || '').toLowerCase().trim();
  const matchingBooks = allBooks.filter(b => {
    if (!b.subject || !curSubj) return true;
    const bSubj = b.subject.toLowerCase();
    return bSubj.includes(curSubj) || curSubj.includes(bSubj);
  });
  const otherBooks = allBooks.filter(b => !matchingBooks.includes(b));

  let html = '';
  if (matchingBooks.length > 0) {
    if (curSubj) html += `<div style="font-size:11px; font-weight:700; color:var(--primary); margin:2px 0 4px;">📖 Bu Dersin Kaynakları:</div>`;
    matchingBooks.forEach(b => {
      const isChecked = selected.includes(b.name);
      html += `
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12.5px; padding:3px 6px; border-radius:4px; transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background='transparent'">
          <input type="checkbox" value="${_escapeHtml(b.name)}" onchange="toggleSchedBook(this.value, this.checked)" ${isChecked ? 'checked' : ''} style="cursor:pointer; accent-color:var(--primary);">
          <span style="color:var(--text);">${_escapeHtml(b.name)} <small style="color:var(--text-muted);">(${_escapeHtml(b.subject || '')})</small></span>
        </label>
      `;
    });
  }

  if (otherBooks.length > 0) {
    html += `<div style="font-size:11px; font-weight:700; color:var(--text-muted); margin:6px 0 4px;">📚 Diğer Derslerin Kaynakları:</div>`;
    otherBooks.forEach(b => {
      const isChecked = selected.includes(b.name);
      html += `
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12px; padding:3px 6px; border-radius:4px; transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background='transparent'">
          <input type="checkbox" value="${_escapeHtml(b.name)}" onchange="toggleSchedBook(this.value, this.checked)" ${isChecked ? 'checked' : ''} style="cursor:pointer; accent-color:var(--primary);">
          <span style="color:var(--text-dim);">${_escapeHtml(b.name)} <small style="color:var(--text-muted);">(${_escapeHtml(b.subject || '')})</small></span>
        </label>
      `;
    });
  }

  picker.innerHTML = html;
  _renderSchedSelectedBooksChips();
}

function toggleSchedBook(bookName, isChecked) {
  if (!bookName) return;
  if (!Array.isArray(window._currentSchedBooks)) window._currentSchedBooks = [];
  if (isChecked) {
    if (!window._currentSchedBooks.includes(bookName)) {
      window._currentSchedBooks.push(bookName);
    }
  } else {
    window._currentSchedBooks = window._currentSchedBooks.filter(b => b !== bookName);
  }
  _renderSchedSelectedBooksChips();
}

function removeSchedBook(bookName) {
  if (!Array.isArray(window._currentSchedBooks)) return;
  window._currentSchedBooks = window._currentSchedBooks.filter(b => b !== bookName);
  _renderSchedSelectedBooksChips();
  _syncSchedBooksPickerCheckboxes();
}

function addCustomSchedBook() {
  const input = document.getElementById('sched-custom-book-input');
  const val = input?.value.trim();
  if (!val) return;
  if (!Array.isArray(window._currentSchedBooks)) window._currentSchedBooks = [];
  if (!window._currentSchedBooks.includes(val)) {
    window._currentSchedBooks.push(val);
    showToast(`"${val}" kaynağı eklendi.`, 'success');
  }
  if (input) input.value = '';
  _renderSchedSelectedBooksChips();
  _syncSchedBooksPickerCheckboxes();
}

function toggleCustomBookInput(show) {
  const wrapper = document.getElementById('sched-custom-book-wrapper');
  if (!wrapper) return;
  wrapper.style.display = show ? 'block' : 'none';
  if (show) {
    const inp = document.getElementById('sched-custom-book-input');
    if (inp) setTimeout(() => inp.focus(), 50);
  }
}

function openAddScheduleItem(dateStr) {
  editingScheduleContext = null;
  if (!dateStr) dateStr = window.currentSelectedDayDate || new Date().toISOString().split('T')[0];
  document.getElementById('sched-item-date').value = dateStr;

  const title = document.getElementById('schedule-modal-title');
  if (title) title.textContent = '📅 Görev Ekle';
  const btn = document.getElementById('schedule-submit-btn');
  if (btn) btn.textContent = 'Ekle';

  _populateSchedSubjectSelect();
  
  document.getElementById('sched-topic').innerHTML = '<option value="">Önce ders seçin...</option>';
  toggleCustomTopicInput(false);

  window._currentSchedBooks = [];
  _updateSchedBooksPicker();
  toggleCustomBookInput(false);

  ['sched-duration','sched-questions','sched-pages','sched-custom-topic','sched-custom-book-input'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = id === 'sched-duration' ? '60' : '';
  });

  openModal('add-schedule-item-modal');
}

function openEditScheduleItem(dateStr, itemId) {
  const data = getStudentData(window.activeStudent);
  const day = (data.schedule || []).find(s => s.date === dateStr);
  if (!day) return;
  const item = (day.items || []).find(i => i.id === itemId);
  if (!item) return;

  editingScheduleContext = { dateStr, itemId, done: item.done };

  document.getElementById('sched-item-date').value = dateStr;
  const title = document.getElementById('schedule-modal-title');
  if (title) title.textContent = '📝 Görevi Düzenle';
  const btn = document.getElementById('schedule-submit-btn');
  if (btn) btn.textContent = 'Güncelle';

  _populateSchedSubjectSelect();

  const subjSelect = document.getElementById('sched-subject');
  if (subjSelect) {
    for (let i = 0; i < subjSelect.options.length; i++) {
      if (subjSelect.options[i].value.includes(item.subject) || subjSelect.options[i].text === item.subject) {
        subjSelect.selectedIndex = i;
        break;
      }
    }
  }

  updateSchedTopics();

  const topicSelect = document.getElementById('sched-topic');
  let topicFound = false;
  if (topicSelect) {
    for (let i = 0; i < topicSelect.options.length; i++) {
      if (topicSelect.options[i].value === item.topic) {
        topicSelect.selectedIndex = i;
        topicFound = true;
        break;
      }
    }
  }

  if (!topicFound && item.topic) {
    toggleCustomTopicInput(true);
    const customInput = document.getElementById('sched-custom-topic');
    if (customInput) customInput.value = item.topic;
  } else {
    toggleCustomTopicInput(false);
  }

  const durEl = document.getElementById('sched-duration');
  if (durEl) durEl.value = item.duration || 60;

  const typeEl = document.getElementById('sched-type');
  if (typeEl) typeEl.value = item.type || 'konu çalışma';

  const qEl = document.getElementById('sched-questions');
  if (qEl) qEl.value = item.questions ?? '';

  const pEl = document.getElementById('sched-pages');
  if (pEl) pEl.value = item.pages ?? '';

  // Çoklu kaynakları doldur
  window._currentSchedBooks = _getTaskBooks(item);
  _updateSchedBooksPicker(item.subject);
  _renderSchedSelectedBooksChips();
  toggleCustomBookInput(false);

  openModal('add-schedule-item-modal');
}

function updateSchedTopics() {
  const subjSelect = document.getElementById('sched-subject');
  const topicSelect = document.getElementById('sched-topic');
  const selectedOpt = subjSelect?.options[subjSelect?.selectedIndex];
  
  if (!selectedOpt || !selectedOpt.value) {
    if (topicSelect) topicSelect.innerHTML = '<option value="">Önce ders seçin...</option>';
    _updateSchedBooksPicker();
    return;
  }
  
  const group = selectedOpt.getAttribute('data-group');
  const subj = selectedOpt.getAttribute('data-subj');
  
  let html = '<option value="">Konu Seçin...</option>';

  if (typeof YKS_TOPICS !== 'undefined' && YKS_TOPICS[group] && YKS_TOPICS[group][subj]) {
    const topics = YKS_TOPICS[group][subj];
    html += topics.map(t => `<option value="${t}">${t}</option>`).join('');
  }

  html += '<option value="__custom__">✏️ Özel / Manuel Konu Yaz...</option>';
  if (topicSelect) topicSelect.innerHTML = html;
  
  _updateSchedBooksPicker(subj);
}

function handleAddScheduleItem(e) {
  if (e) e.preventDefault();

  const dateStr = document.getElementById('sched-item-date')?.value || window.currentSelectedDayDate;
  const subject = document.getElementById('sched-subject')?.value.trim() || '';

  let topic = document.getElementById('sched-topic')?.value.trim() || '';
  const customTopic = document.getElementById('sched-custom-topic')?.value.trim() || '';
  if (topic === '__custom__' || (!topic && customTopic)) {
    topic = customTopic;
  }

  const dur       = parseInt(document.getElementById('sched-duration')?.value) || 60;
  const type      = document.getElementById('sched-type')?.value || 'konu çalışma';
  const questions = parseInt(document.getElementById('sched-questions')?.value) || 0;
  const pages     = parseInt(document.getElementById('sched-pages')?.value) || 0;

  // Kaynaklar: seçili liste + eğer inputta yazılmış ve eklenmemiş değer varsa ekle
  let books = Array.isArray(window._currentSchedBooks) ? [...window._currentSchedBooks] : [];
  const customBookVal = document.getElementById('sched-custom-book-input')?.value.trim();
  if (customBookVal && !books.includes(customBookVal)) {
    books.push(customBookVal);
  }
  const book = books.join(', ');

  if (!subject || !topic) { showToast('Ders ve konu boş olamaz.', 'warning'); return; }

  const data = getStudentData(window.activeStudent);
  if (!Array.isArray(data.schedule)) data.schedule = [];

  if (editingScheduleContext) {
    const oldDateStr = editingScheduleContext.dateStr;
    const oldItemId = editingScheduleContext.itemId;
    const isDone = editingScheduleContext.done || false;

    // Eski günden çıkar
    const oldDay = data.schedule.find(s => s.date === oldDateStr);
    if (oldDay) {
      oldDay.items = (oldDay.items || []).filter(i => i.id !== oldItemId);
      if (oldDay.items.length === 0 && oldDateStr !== dateStr) {
        data.schedule = data.schedule.filter(s => s.date !== oldDateStr);
      }
    }

    // Yeni güne ekle
    let targetDay = data.schedule.find(s => s.date === dateStr);
    if (!targetDay) {
      targetDay = { id: generateId(), date: dateStr, items: [] };
      data.schedule.push(targetDay);
    }
    targetDay.items.push({ id: oldItemId, subject, topic, duration: dur, type, done: isDone, questions, pages, book, books });

    _syncScheduleWithTopicStatus(data, subject, topic, isDone ? 'completed' : 'studying');

    editingScheduleContext = null;
    saveStudentData(window.activeStudent, data);
    showToast('Görev güncellendi & Konu durumu senkronize edildi!', 'success');
  } else {
    let day = data.schedule.find(s => s.date === dateStr);
    if (!day) {
      day = { id: generateId(), date: dateStr, items: [] };
      data.schedule.push(day);
    }

    day.items.push({ id: generateId(), subject, topic, duration: dur, type, done: false, questions, pages, book, books });
    data.hasNewTasks = true;

    _syncScheduleWithTopicStatus(data, subject, topic, 'studying');

    saveStudentData(window.activeStudent, data);
    showToast(`Görev eklendi! "${topic}" konusu "Çalışılıyor" durumuna alındı 🟡`, 'success');
  }

  closeModal('add-schedule-item-modal');

  ['sched-subject','sched-topic','sched-custom-topic','sched-questions','sched-pages','sched-custom-book-input'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  toggleCustomTopicInput(false);
  toggleCustomBookInput(false);
  window._currentSchedBooks = [];

  window.currentSelectedDayDate = dateStr;
  renderSchedule();
  if (typeof renderDashboard === 'function') renderDashboard();
  if (typeof _renderTopicStats === 'function') _renderTopicStats();
  if (typeof renderTopics === 'function') renderTopics();
  if (typeof checkNotifications === 'function') checkNotifications();
}


function clearWeekSchedule() {
  if (!confirm('Seçili dönemin tüm programı silinecek. Emin misiniz?')) return;

  const data = getStudentData(window.activeStudent);
  data.schedule = [];
  saveStudentData(window.activeStudent, data);
  renderSchedule();
  showToast('Program temizlendi.', 'info');
}

// ─── YANLIŞ DEFTERİ ENTEGRASYONU ─────────────────────────────────────────────

function _normStr(str) {
  if (!str) return '';
  return str.toString().toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}

function _getMatchingWrongNotes(subject, topic, wrongLog = []) {
  if (!Array.isArray(wrongLog) || !wrongLog.length) return [];
  const normSubj = _normStr(subject);
  const normTop  = _normStr(topic);

  return wrongLog.filter(w => {
    const wSubj = _normStr(w.subject);
    const wTop  = _normStr(w.topic);

    const subjMatch = normSubj.includes(wSubj) || wSubj.includes(normSubj);
    const topMatch = normTop && wTop && (normTop.includes(wTop) || wTop.includes(normTop));

    return subjMatch && (topMatch || !normTop || !wTop);
  });
}

function openScheduleWrongModal(subject, topic) {
  const data = getStudentData(window.activeStudent);
  const wrongLog = data.wrongLog || [];
  const matching = _getMatchingWrongNotes(subject, topic, wrongLog);

  const titleEl = document.getElementById('schedule-wrong-modal-title');
  if (titleEl) {
    titleEl.textContent = `❌ ${subject}${topic ? ' - ' + topic : ''} Yanlışları (${matching.length})`;
  }

  const bodyEl = document.getElementById('schedule-wrong-modal-body');
  if (!bodyEl) return;

  if (!matching.length) {
    bodyEl.innerHTML = '<div class="empty-state"><span>✅</span><p>Bu konuya ait kayıtlı yanlış bulunamadı.</p></div>';
    openModal('schedule-wrong-modal');
    return;
  }

  bodyEl.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.06); flex-wrap:wrap; gap:8px;">
      <div style="font-size:13px; color:var(--text-muted);">
        Toplam <strong>${matching.length}</strong> kayıt • <span style="color:#f87171;">${matching.filter(w=>!w.reviewed).length} bekleyen</span>
      </div>
      <button class="btn btn-sm btn-primary" onclick="addTopicToScheduleAsReview('${subject.replace(/'/g,"\\'")}','${topic.replace(/'/g,"\\'")}'); closeModal('schedule-wrong-modal');">
        + Bu Konuya 40 Dk Tekrar Görevi Ata
      </button>
    </div>
    <div style="display:flex; flex-direction:column; gap:10px;">
      ${matching.map(w => `
        <div class="card" style="background: ${w.reviewed ? 'rgba(255,255,255,0.02)' : 'rgba(239,68,68,0.05)'}; border: 1px solid ${w.reviewed ? 'rgba(255,255,255,0.08)' : 'rgba(239,68,68,0.25)'}; padding: 12px 16px; border-radius: 8px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
            <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
              <span class="tag tag-subject" style="font-size:11px;">${w.subject}</span>
              <span class="tag tag-tytayt" style="font-size:11px;">${w.tytAyt || 'TYT'}</span>
              <span style="font-size:11px; color:var(--text-muted);">📅 ${w.date || '—'}</span>
              ${w.source ? `<span style="font-size:11px; background:rgba(255,255,255,0.06); padding:1px 6px; border-radius:4px; color:var(--text-dim);">📚 ${w.source}</span>` : ''}
            </div>
            <button class="btn btn-sm ${w.reviewed ? '' : 'btn-primary'}" style="font-size:11px; padding:3px 8px;" onclick="toggleWrongReviewFromSchedule('${w.id}', '${subject.replace(/'/g,"\\'")}', '${topic.replace(/'/g,"\\'")}')">
              ${w.reviewed ? '✅ Tekrar Edildi' : '🔁 Tekrar Et'}
            </button>
          </div>
          <div style="font-size:13px; font-weight:700; color:var(--text); margin-bottom:4px;">
            ${w.topic || 'Genel Soru'}
          </div>
          ${w.image ? `
            <div style="margin: 6px 0;">
              <img src="${w.image}" onclick="if(typeof openImageViewer==='function') openImageViewer('${w.image}')" style="max-height:120px; border-radius:6px; border:1px solid rgba(255,107,0,0.35); cursor:zoom-in;" title="Büyütmek için tıkla" alt="Soru Fotoğrafı">
            </div>
          ` : ''}
          ${w.reason ? `<div style="font-size:12px; color:#f87171; margin-bottom:4px;"><strong>Hata Nedeni:</strong> ${w.reason}</div>` : ''}
          ${w.note ? `<div style="font-size:12px; color:var(--text-muted); background:rgba(0,0,0,0.2); padding:6px 10px; border-radius:6px; margin-top:6px;">📝 ${w.note}</div>` : ''}
        </div>
      `).join('')}
    </div>
  `;

  openModal('schedule-wrong-modal');
}

function toggleWrongReviewFromSchedule(wrongId, subject, topic) {
  const data = getStudentData(window.activeStudent);
  const entry = (data.wrongLog || []).find(e => e.id === wrongId);
  if (!entry) return;
  entry.reviewed = !entry.reviewed;
  saveStudentData(window.activeStudent, data);

  openScheduleWrongModal(subject, topic);
  renderSchedule();
  if (typeof renderWrongNotes === 'function') renderWrongNotes();
}

function openWrongPoolModal() {
  const data = getStudentData(window.activeStudent);
  const wrongLog = data.wrongLog || [];
  const pending = wrongLog.filter(w => !w.reviewed);

  const bodyEl = document.getElementById('schedule-wrong-pool-body');
  if (!bodyEl) return;

  if (!pending.length) {
    bodyEl.innerHTML = '<div class="empty-state"><span>🎉</span><p>Tüm yanlışlar tekrar edilmiş! Bekleyen kayıt yok.</p></div>';
    openModal('schedule-wrong-pool-modal');
    return;
  }

  const grouped = {};
  pending.forEach(w => {
    const key = `${w.subject || 'Diğer'}|||${w.topic || 'Genel'}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(w);
  });

  const list = Object.entries(grouped).sort((a,b) => b[1].length - a[1].length);

  bodyEl.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:10px;">
      ${list.map(([key, items]) => {
        const [subj, top] = key.split('|||');
        return `
          <div class="card" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); padding:12px 16px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                <span class="tag tag-subject" style="font-size:11px;">${subj}</span>
                <span style="font-weight:700; font-size:13px; color:var(--text);">${top}</span>
              </div>
              <div style="font-size:12px; color:#f87171;">
                🔴 <strong>${items.length}</strong> adet tekrar edilmemiş yanlış soru / not
              </div>
            </div>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-sm" style="font-size:11px;" onclick="closeModal('schedule-wrong-pool-modal'); openScheduleWrongModal('${subj.replace(/'/g,"\\'")}','${top.replace(/'/g,"\\'")}');">
                🔍 Notları Gör
              </button>
              <button class="btn btn-sm btn-primary" style="font-size:11px;" onclick="addTopicToScheduleAsReview('${subj.replace(/'/g,"\\'")}','${top.replace(/'/g,"\\'")}');">
                + Göreve Ekle
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  openModal('schedule-wrong-pool-modal');
}

function openWrongPoolForCurrentDay() {
  openWrongPoolModal();
}

function openAddTaskForCurrentDay() {
  openAddScheduleItem(window.currentSelectedDayDate);
}

function addTopicToScheduleAsReview(subject, topic, targetDate = null) {
  const data = getStudentData(window.activeStudent);
  if (!Array.isArray(data.schedule)) data.schedule = [];

  const dateStr = targetDate || window.currentSelectedDayDate || getTodayStr();
  let day = data.schedule.find(s => s.date === dateStr);
  if (!day) {
    day = { id: generateId(), date: dateStr, items: [] };
    data.schedule.push(day);
  }

  day.items.push({
    id: generateId(),
    subject: subject,
    topic: `${topic} (Yanlış Tekrarı)`,
    duration: 40,
    type: 'tekrar',
    done: false,
    questions: 20
  });

  data.hasNewTasks = true;
  saveStudentData(window.activeStudent, data);
  renderSchedule();
  if (typeof renderDashboard === 'function') renderDashboard();
  showToast(`"${subject} - ${topic}" tekrar görevi (${dateStr}) gününe eklendi!`, 'success');
}

function autoAssignWrongReviewsToSchedule() {
  const data = getStudentData(window.activeStudent);
  const wrongLog = data.wrongLog || [];
  const pending = wrongLog.filter(w => !w.reviewed);

  if (!pending.length) {
    showToast('Tekrar edilecek bekleyen yanlış bulunmuyor.', 'info');
    return;
  }

  const grouped = {};
  pending.forEach(w => {
    const key = `${w.subject || 'Ders'}|||${w.topic || 'Konu'}`;
    if (!grouped[key]) grouped[key] = 0;
    grouped[key]++;
  });

  const topTopics = Object.entries(grouped)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 5);

  if (!Array.isArray(data.schedule)) data.schedule = [];

  const today = new Date();
  let addedCount = 0;

  topTopics.forEach(([key, count], idx) => {
    const [subj, top] = key.split('|||');
    const targetDateObj = new Date(today);
    targetDateObj.setDate(today.getDate() + idx);
    const dateStr = formatDateISO(targetDateObj);

    let day = data.schedule.find(s => s.date === dateStr);
    if (!day) {
      day = { id: generateId(), date: dateStr, items: [] };
      data.schedule.push(day);
    }

    const exists = (day.items || []).some(i => i.subject === subj && i.topic.includes(top));
    if (!exists) {
      day.items.push({
        id: generateId(),
        subject: subj,
        topic: `${top} (Yanlış Tekrarı - ${count} Soru)`,
        duration: 45,
        type: 'tekrar',
        done: false,
        questions: 20
      });
      addedCount++;
    }
  });

  if (addedCount > 0) {
    data.hasNewTasks = true;
    saveStudentData(window.activeStudent, data);
    renderSchedule();
    closeModal('schedule-wrong-pool-modal');
    showToast(`✨ En çok hata yapılan ${addedCount} konu programa tekrar görevi olarak dağıtıldı!`, 'success');
  } else {
    showToast('Bu konular zaten programda mevcut.', 'info');
  }
}

function _el(id, fn) { const el = document.getElementById(id); if (el) fn(el); }

function openDayDetailModal(dateStr) {
  if (!dateStr) dateStr = window.currentSelectedDayDate || getTodayStr();
  window.currentSelectedDayDate = dateStr;
  const data = getStudentData(window.activeStudent);
  const schedule = data.schedule || [];
  const wrongLog = data.wrongLog || [];
  const bodyEl = document.getElementById('schedule-day-modal-body');
  if (bodyEl) {
    bodyEl.innerHTML = _renderSelectedDayCardHtml(schedule, wrongLog, dateStr, true);
  }
  const titleEl = document.getElementById('schedule-day-modal-title');
  if (titleEl) {
    const dateObj = new Date(dateStr + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
    titleEl.textContent = `📅 Günlük Görev Yönetimi (${formattedDate})`;
  }
  openModal('schedule-day-modal');
}

window.renderSchedule                  = renderSchedule;
window.setScheduleViewMode             = setScheduleViewMode;
window.selectScheduleDay               = selectScheduleDay;
window.changePeriodOffset              = changePeriodOffset;
window.resetPeriodOffset               = resetPeriodOffset;
window.toggleScheduleItem              = toggleScheduleItem;
window.deleteScheduleItem              = deleteScheduleItem;
window.openAddScheduleItem             = openAddScheduleItem;
window.openEditScheduleItem            = openEditScheduleItem;
window.handleAddScheduleItem           = handleAddScheduleItem;
window.clearWeekSchedule               = clearWeekSchedule;
window.updateSchedTopics               = updateSchedTopics;
window.openScheduleWrongModal          = openScheduleWrongModal;
window.toggleWrongReviewFromSchedule   = toggleWrongReviewFromSchedule;
window.openWrongPoolModal              = openWrongPoolModal;
window.addTopicToScheduleAsReview      = addTopicToScheduleAsReview;
window.autoAssignWrongReviewsToSchedule= autoAssignWrongReviewsToSchedule;
window.openAddTaskForCurrentDay        = openAddTaskForCurrentDay;
window.openWrongPoolForCurrentDay      = openWrongPoolForCurrentDay;
window.openDayDetailModal              = openDayDetailModal;
window.toggleCustomTopicInput          = toggleCustomTopicInput;
window.handleTopicSelectChange         = handleTopicSelectChange;
window._syncScheduleWithTopicStatus    = _syncScheduleWithTopicStatus;
window._getTaskBooks                   = _getTaskBooks;
window._renderTaskBooksSpan            = _renderTaskBooksSpan;
window.toggleSchedBook                 = toggleSchedBook;
window.removeSchedBook                 = removeSchedBook;
window.addCustomSchedBook              = addCustomSchedBook;
window.toggleCustomBookInput           = toggleCustomBookInput;
window.openTaskCompletionModal        = openTaskCompletionModal;
window.calcCompBlank                  = calcCompBlank;
window.handleTaskCompletionSubmit     = handleTaskCompletionSubmit;
window.completeTaskWithoutQuestions   = completeTaskWithoutQuestions;
window.cancelTaskCompletion           = cancelTaskCompletion;
