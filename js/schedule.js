/**
 * schedule.js — Çalışma Programı Yönetimi
 * AI analizinden otomatik oluşturulur, koç de el ile düzenleyebilir.
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

let currentPeriodOffset = 0;

function changePeriodOffset(delta) {
  currentPeriodOffset += delta;
  renderSchedule();
}

function resetPeriodOffset() {
  currentPeriodOffset = 0;
  renderSchedule();
}

function renderSchedule() {
  const data = getStudentData(window.activeStudent);
  _renderWrongPoolBanner(data.wrongLog || []);
  _renderPeriodView(data.schedule || [], data.wrongLog || []);
  _renderScheduleStats(data.schedule || []);

  const coachActions = document.getElementById('schedule-coach-actions');
  if (coachActions) {
    coachActions.style.display = (window.currentUser && window.currentUser.role === 'coach') ? 'flex' : 'none';
  }
}

function _renderWrongPoolBanner(wrongLog) {
  const bannerEl = document.getElementById('schedule-wrong-pool-bar');
  if (!bannerEl) return;

  const pending = (wrongLog || []).filter(w => !w.reviewed);
  if (!pending.length) {
    bannerEl.innerHTML = '';
    return;
  }

  // Gruplanmış konu sayısı
  const topicsMap = {};
  pending.forEach(w => {
    const key = `${w.subject || ''} - ${w.topic || ''}`;
    topicsMap[key] = (topicsMap[key] || 0) + 1;
  });
  const topicCount = Object.keys(topicsMap).length;

  bannerEl.innerHTML = `
    <div class="card" style="background: linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(30,30,36,0.95) 100%); border: 1px solid rgba(239,68,68,0.3); padding: 12px 16px; border-radius: 10px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="font-size:24px; background:rgba(239,68,68,0.15); width:42px; height:42px; border-radius:8px; display:flex; align-items:center; justify-content:center; border:1px solid rgba(239,68,68,0.3);">🔥</div>
          <div>
            <div style="font-weight:800; font-size:14px; color:#f87171;">Yanlış Defterinde Tekrar Bekleyen ${pending.length} Soru / Not Var! (${topicCount} Farklı Konu)</div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">Öğrencinin eksik kaldığı bu konuları tek tıkla haftalık programa tekrar görevi olarak ekleyebilirsin.</div>
          </div>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <button class="btn btn-sm" style="border:1px solid rgba(239,68,68,0.4); color:#f87171; background:rgba(239,68,68,0.1); font-weight:700;" onclick="openWrongPoolModal()">📋 Havuzu İncele (${pending.length})</button>
          <button class="btn btn-sm btn-primary" style="background:linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border:none; font-weight:700;" onclick="autoAssignWrongReviewsToSchedule()">🔁 Tek Tıkla Programa Dağıt</button>
        </div>
      </div>
    </div>
  `;
}

function _renderPeriodView(schedule, wrongLog = []) {
  const container = document.getElementById('schedule-week');
  if (!container) return;

  // Gerçek Aylık Takvim Hesabı
  const now = new Date();
  const viewDate = new Date(now.getFullYear(), now.getMonth() + currentPeriodOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-11

  const MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const monthName = MONTHS[month];

  // Etiketi güncelle
  const lbl = document.getElementById('schedule-week-label');
  if (lbl) {
    lbl.textContent = `📅 ${monthName} ${year}`;
  }

  const DAYS = ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];

  // Ayın ilk gününün haftanın hangi günü olduğu (Pzt=0..Paz=6)
  let firstDayOfWeek = viewDate.getDay();
  firstDayOfWeek = (firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1);

  // Bu aydaki gün sayısı
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Önceki aydaki gün sayısı
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Toplam hücre sayısı (7'nin tam katı)
  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;

  let gridHtml = '';

  // 1. Haftanın günleri başlıkları (7 sütun)
  gridHtml += '<div style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 10px; margin-top: 14px; margin-bottom: 8px; width: 100%;">';
  for (let d = 0; d < 7; d++) {
    gridHtml += `<div style="text-align: center; font-size: 11px; font-weight: 800; color: var(--text-muted, #94a3b8); text-transform: uppercase; letter-spacing: 0.06em; padding: 8px 0; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px;">${DAYS[d]}</div>`;
  }
  gridHtml += '</div>';

  // 2. Takvim Hücreleri Izgarası (Her satırda tam 7 gün = 1 hafta)
  gridHtml += '<div style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 10px; width: 100%;">';

  const todayStr = now.toISOString().split('T')[0];

  for (let i = 0; i < totalCells; i++) {
    let cellYear = year;
    let cellMonth = month;
    let cellDayNum = 0;
    let isOtherMonth = false;

    if (i < firstDayOfWeek) {
      // Önceki aydan taşan günler
      isOtherMonth = true;
      cellDayNum = daysInPrevMonth - (firstDayOfWeek - i - 1);
      const prevDate = new Date(year, month - 1, cellDayNum);
      cellYear = prevDate.getFullYear();
      cellMonth = prevDate.getMonth();
    } else if (i >= firstDayOfWeek + daysInMonth) {
      // Sonraki aydan taşan günler
      isOtherMonth = true;
      cellDayNum = i - (firstDayOfWeek + daysInMonth) + 1;
      const nextDate = new Date(year, month + 1, cellDayNum);
      cellYear = nextDate.getFullYear();
      cellMonth = nextDate.getMonth();
    } else {
      // Bu ayın günleri
      cellDayNum = i - firstDayOfWeek + 1;
    }

    const dStr = `${cellYear}-${String(cellMonth + 1).padStart(2, '0')}-${String(cellDayNum).padStart(2, '0')}`;
    const isToday = (dStr === todayStr);

    const dayData = schedule.find(s => s.date === dStr);
    const items = dayData?.items || [];
    const doneCount = items.filter(item => item.done).length;

    let badgeHtml = '';
    if (items.length > 0) {
      const isAllDone = (doneCount === items.length);
      const badgeStyle = isAllDone ? 'background:rgba(16,185,129,0.2); color:#34d399;' : 'background:rgba(139,92,246,0.2); color:#c084fc;';
      badgeHtml = `<span style="${badgeStyle} font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px;">${doneCount}/${items.length}</span>`;
    }

    // Görev chip'leri (maksimum 2 adet, fazlası +X daha)
    let chipsHtml = '';
    if (items.length > 0) {
      const visibleItems = items.slice(0, 2);
      chipsHtml = visibleItems.map(it => `
        <div style="font-size:11px; line-height:1.3; padding:3px 6px; border-radius:4px; background:${it.done ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)'}; border:1px solid ${it.done ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.08)'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:${it.done ? '#34d399' : 'var(--text, #f1f5f9)'}; ${it.done ? 'text-decoration:line-through; opacity:0.85;' : ''} display:flex; align-items:center; gap:5px; font-weight:600;" title="${_escapeHtml(it.subject)}: ${_escapeHtml(it.topic)}">
          <span>${it.done ? '✓' : '•'}</span>
          <span>${_escapeHtml(it.subject)}</span>
        </div>
      `).join('');

      if (items.length > 2) {
        chipsHtml += `<div style="font-size:10px; font-weight:700; color:var(--text-muted, #94a3b8); margin-top:2px; padding-left:2px;">+${items.length - 2} görev daha</div>`;
      }
    } else {
      chipsHtml = `<div style="font-size:11px; color:var(--text-muted, #94a3b8); margin-top:16px; text-align:center; font-weight:600; opacity:0.75; display:flex; align-items:center; justify-content:center; gap:4px;"><span>+</span> <span>Görev Ekle</span></div>`;
    }

    const monthShortNames = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
    const monthShort = monthShortNames[cellMonth];

    const cardBg = isToday 
      ? 'background: linear-gradient(135deg, rgba(139,92,246,0.18) 0%, rgba(30,30,36,0.95) 100%); border: 1px solid #8b5cf6; box-shadow: 0 0 0 1px #8b5cf6, 0 4px 14px rgba(139,92,246,0.25);'
      : 'background: var(--bg-card, #1e1e24); border: 1px solid rgba(255,255,255,0.08);';

    gridHtml += `
      <div style="${cardBg} border-radius: 10px; padding: 8px 10px; height: 115px; min-height: 115px; max-height: 115px; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-start; cursor: pointer; opacity: ${isOtherMonth ? '0.35' : '1'}; transition: all 0.2s ease; box-sizing: border-box;" onclick="openDayDetailModal('${dStr}')" title="${dStr} görevlerini yönetmek için tıkla">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; padding-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.04);">
          <div style="font-size:13px; font-weight:800; color:${isToday ? '#c084fc' : 'var(--text, #f8fafc)'}; display:flex; align-items:center; gap:4px;">
            <span>${cellDayNum}</span>
            <span style="font-size:10px; font-weight:600; color:var(--text-muted, #94a3b8);">${monthShort}</span>
          </div>
          ${badgeHtml}
        </div>
        <div style="display:flex; flex-direction:column; gap:3px; flex:1; overflow:hidden;">
          ${chipsHtml}
        </div>
      </div>
    `;
  }

  gridHtml += '</div>';
  container.innerHTML = gridHtml;
}

window.currentSelectedDayDate = null;

function openDayDetailModal(dateStr) {
  window.currentSelectedDayDate = dateStr;
  const data = getStudentData(window.activeStudent);
  const dayData = (data.schedule || []).find(s => s.date === dateStr);
  const items = dayData?.items || [];
  const wrongLog = data.wrongLog || [];

  const dateObj = new Date(dateStr + 'T00:00:00');
  const formattedDate = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });

  const titleEl = document.getElementById('schedule-day-modal-title');
  if (titleEl) {
    const doneCount = items.filter(i => i.done).length;
    const progStr = items.length ? ` (${doneCount}/${items.length} Tamamlandı)` : '';
    titleEl.textContent = `📅 ${formattedDate}${progStr}`;
  }

  const bodyEl = document.getElementById('schedule-day-modal-body');
  if (!bodyEl) return;

  if (!items.length) {
    bodyEl.innerHTML = `
      <div class="empty-state" style="padding: 30px 10px; text-align:center;">
        <span style="font-size:32px;">📌</span>
        <p style="margin:8px 0 14px; font-weight:700; color:var(--text);">Bu gün için planlanmış bir görev bulunmuyor.</p>
        <button class="btn btn-primary" onclick="openAddTaskForCurrentDay()">+ Görev Ekle</button>
      </div>
    `;
    openModal('schedule-day-modal');
    return;
  }

  bodyEl.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:10px;">
      ${items.map(item => {
        const icon = {
          'konu çalışma': '📖', 'soru çözme': '✏️', 'deneme': '📝', 'tekrar': '🔁', 'video': '🎬'
        }[item.type] || '📌';

        let metaParts = [`${item.duration || 60} dk`, item.type || 'konu çalışma'];
        if (item.questions) metaParts.push(`${item.questions} Soru`);
        if (item.pages) metaParts.push(`${item.pages} Sayfa`);
        if (item.book) metaParts.push(`📚 ${item.book}`);

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

        const isCoach = (window.currentUser && window.currentUser.role === 'coach');

        return `
          <div class="card" style="background:${item.done ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.03)'}; border:1px solid ${item.done ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.08)'}; padding:12px 16px; border-radius:8px; display:flex; align-items:flex-start; gap:12px;">
            <input type="checkbox" class="item-check" style="margin-top:4px; transform:scale(1.2); cursor:pointer;" ${item.done ? 'checked' : ''}
                   onchange="toggleScheduleItemFromDayModal('${dateStr}', '${item.id}', this.checked)">
            
            <div style="flex:1;">
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:4px;">
                <span style="font-size:15px;">${icon}</span>
                <span class="tag tag-subject" style="font-size:11px;">${item.subject}</span>
                <span style="font-size:14px; font-weight:700; color:${item.done ? '#34d399' : 'var(--text)'}; ${item.done ? 'text-decoration:line-through;' : ''}">${item.topic}</span>
              </div>
              <div style="font-size:12px; color:var(--text-muted);">${metaParts.join(' • ')}</div>
              ${wrongBtnHtml}
            </div>

            ${isCoach ? `
              <div style="display:flex; gap:6px; align-items:center;">
                <button class="btn-icon-sm" style="color:var(--primary); font-size:14px; padding:4px 6px;" onclick="openEditScheduleItem('${dateStr}','${item.id}')" title="Düzenle">✏️</button>
                <button class="btn-icon-sm" style="color:var(--danger); font-size:16px; padding:4px 6px;" onclick="deleteScheduleItemFromDayModal('${dateStr}','${item.id}')" title="Sil">🗑️</button>
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;

  openModal('schedule-day-modal');
}

function toggleScheduleItemFromDayModal(dateStr, itemId, isDone) {
  toggleScheduleItem(dateStr, itemId, isDone);
  setTimeout(() => {
    openDayDetailModal(dateStr);
  }, 50);
}

function deleteScheduleItemFromDayModal(dateStr, itemId) {
  deleteScheduleItem(dateStr, itemId);
  setTimeout(() => {
    openDayDetailModal(dateStr);
  }, 50);
}

function openAddTaskForCurrentDay() {
  const dateStr = window.currentSelectedDayDate || new Date().toISOString().split('T')[0];
  closeModal('schedule-day-modal');
  openAddScheduleItem(dateStr);
}

function openWrongPoolForCurrentDay() {
  closeModal('schedule-day-modal');
  openWrongPoolModal();
}

function viewScheduleItem(e, dateStr, itemId) {
  const data = getStudentData(window.activeStudent);
  const day  = data.schedule.find(s => s.date === dateStr);
  if (!day) return;
  const item = day.items.find(i => i.id === itemId);
  if (!item) return;

  const matchingWrongs = _getMatchingWrongNotes(item.subject, item.topic, data.wrongLog || []);

  let wrongNotesSection = '';
  if (matchingWrongs.length > 0) {
    wrongNotesSection = `
      <div style="margin-top:16px; padding:12px; background:rgba(239,68,68,0.06); border-radius:8px; border:1px solid rgba(239,68,68,0.2);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <strong style="color:#f87171; font-size:13px;">❌ Bu Konuya Ait Yanlış Defteri Kayıtları (${matchingWrongs.length})</strong>
          <button class="btn btn-sm" style="font-size:11px; padding:2px 8px;" onclick="closeModal('view-schedule-item-modal'); openScheduleWrongModal('${(item.subject||'').replace(/'/g,"\\'")}','${(item.topic||'').replace(/'/g,"\\'")}')">Tümünü İncele →</button>
        </div>
        <div style="font-size:12px; color:var(--text-muted);">
          ${matchingWrongs.slice(0, 3).map(w => `
            <div style="padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
              <span>${w.reviewed ? '✅' : '🔴'}</span> 
              <strong>${w.source ? w.source + ': ' : ''}</strong>
              <span>${w.reason || w.note || 'Hata kaydı'}</span>
            </div>
          `).join('')}
          ${matchingWrongs.length > 3 ? `<div style="margin-top:4px; font-style:italic;">+ ${matchingWrongs.length - 3} kayıt daha...</div>` : ''}
        </div>
      </div>
    `;
  }

  const c = document.getElementById('view-schedule-content');
  if (c) {
    c.innerHTML = `
      <div style="margin-bottom:8px;"><strong>Tarih:</strong> ${dateStr}</div>
      <div style="margin-bottom:8px;"><strong>Ders:</strong> ${item.subject}</div>
      <div style="margin-bottom:8px;"><strong>Konu:</strong> ${item.topic}</div>
      <div style="margin-bottom:8px;"><strong>Tür:</strong> ${item.type || '—'}</div>
      <div style="margin-bottom:8px;"><strong>Süre:</strong> ${item.duration} dk</div>
      ${item.questions ? `<div style="margin-bottom:8px;"><strong>Hedef Soru:</strong> ${item.questions}</div>` : ''}
      ${item.pages ? `<div style="margin-bottom:8px;"><strong>Hedef Sayfa:</strong> ${item.pages}</div>` : ''}
      ${item.book ? `<div style="margin-bottom:8px;"><strong>Kaynak:</strong> ${item.book}</div>` : ''}
      <div style="margin-top:12px;">
        <strong>Durum:</strong> 
        <span class="badge ${item.done ? 'badge-ayt' : 'badge-tyt'}">${item.done ? 'Tamamlandı ✅' : 'Bekliyor ⏳'}</span>
      </div>
      ${wrongNotesSection}
    `;
  }
  openModal('view-schedule-item-modal');
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

// ─── Öğe İşlemleri ────────────────────────────────────────────────────────────

function toggleScheduleItem(dateStr, itemId, done) {
  const data = getStudentData(window.activeStudent);
  const day  = data.schedule.find(s => s.date === dateStr);
  if (!day) return;

  const item = day.items.find(i => i.id === itemId);
  if (item) item.done = done;

  saveStudentData(window.activeStudent, data);
  _renderScheduleStats(data.schedule);
  if (typeof checkNotifications === 'function') checkNotifications();

  // Sadece o öğeyi güncelle (performans)
  const el = document.getElementById(`si-${itemId}`);
  if (el) el.className = `schedule-item ${done ? 'done' : ''}`;
}

function deleteScheduleItem(dateStr, itemId) {
  const data = getStudentData(window.activeStudent);
  const day  = data.schedule.find(s => s.date === dateStr);
  if (!day) return;

  day.items = day.items.filter(i => i.id !== itemId);
  if (day.items.length === 0) {
    data.schedule = data.schedule.filter(s => s.date !== dateStr);
  }

  saveStudentData(window.activeStudent, data);
  renderSchedule();
  if (typeof renderDashboard === 'function') renderDashboard();
  if (typeof checkNotifications === 'function') checkNotifications();
}

// ─── El ile Öğe Ekleme & Düzenleme ──────────────────────────────────────────

let editingScheduleContext = null; // { dateStr, itemId }

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

function openAddScheduleItem(dateStr) {
  editingScheduleContext = null;
  if (!dateStr) dateStr = getTodayStr();
  document.getElementById('sched-item-date').value = dateStr;

  const title = document.getElementById('schedule-modal-title');
  if (title) title.textContent = '📅 Görev Ekle';
  const btn = document.getElementById('schedule-submit-btn');
  if (btn) btn.textContent = 'Ekle';

  _populateSchedSubjectSelect();
  
  document.getElementById('sched-topic').innerHTML = '<option value="">Önce ders seçin...</option>';
  const bookSelect = document.getElementById('sched-book');
  if (bookSelect) bookSelect.innerHTML = '<option value="">Önce ders seçin...</option>';

  ['sched-duration','sched-questions','sched-pages','sched-book'].forEach(id => {
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
  if (topicSelect) topicSelect.value = item.topic || '';

  const durEl = document.getElementById('sched-duration');
  if (durEl) durEl.value = item.duration || 60;

  const typeEl = document.getElementById('sched-type');
  if (typeEl) typeEl.value = item.type || 'konu çalışma';

  const qEl = document.getElementById('sched-questions');
  if (qEl) qEl.value = item.questions ?? '';

  const pEl = document.getElementById('sched-pages');
  if (pEl) pEl.value = item.pages ?? '';

  const bEl = document.getElementById('sched-book');
  if (bEl) bEl.value = item.book ?? '';

  openModal('add-schedule-item-modal');
}

function updateSchedTopics() {
  const subjSelect = document.getElementById('sched-subject');
  const topicSelect = document.getElementById('sched-topic');
  const selectedOpt = subjSelect.options[subjSelect.selectedIndex];
  
  if (!selectedOpt || !selectedOpt.value) {
    topicSelect.innerHTML = '<option value="">Önce ders seçin...</option>';
    return;
  }
  
  const group = selectedOpt.getAttribute('data-group');
  const subj = selectedOpt.getAttribute('data-subj');
  
  if (typeof YKS_TOPICS !== 'undefined' && YKS_TOPICS[group] && YKS_TOPICS[group][subj]) {
    const topics = YKS_TOPICS[group][subj];
    topicSelect.innerHTML = '<option value="">Konu Seçin...</option>' + topics.map(t => `<option value="${t}">${t}</option>`).join('');
  } else {
    topicSelect.innerHTML = '<option value="">Önce ders seçin...</option>';
  }
  
  const bookSelect = document.getElementById('sched-book');
  if (bookSelect) {
    const data = getStudentData(window.activeStudent);
    let opts = '<option value="">Seçiniz...</option>';
    if (data && data.books && data.books.length > 0) {
      const filteredBooks = data.books.filter(b => {
        if (!b.subject) return true;
        const bSubj = b.subject.toLowerCase();
        const curSubj = (subj || '').toLowerCase();
        return bSubj.includes(curSubj) || curSubj.includes(bSubj);
      });
      filteredBooks.forEach(b => {
        opts += `<option value="${b.name}">${b.name}</option>`;
      });
    }
    bookSelect.innerHTML = opts;
  }
}

function handleAddScheduleItem(e) {
  if (e) e.preventDefault();

  const dateStr = document.getElementById('sched-item-date')?.value;
  const subject = document.getElementById('sched-subject')?.value.trim() || '';
  const topic   = document.getElementById('sched-topic')?.value.trim() || '';
  const dur     = parseInt(document.getElementById('sched-duration')?.value) || 60;
  const type    = document.getElementById('sched-type')?.value || 'konu çalışma';
  const questions = parseInt(document.getElementById('sched-questions')?.value) || 0;
  const pages     = parseInt(document.getElementById('sched-pages')?.value) || 0;
  const book      = document.getElementById('sched-book')?.value || '';

  if (!subject || !topic) { showToast('Ders ve konu boş olamaz.', 'warning'); return; }

  const data = getStudentData(window.activeStudent);
  if (!Array.isArray(data.schedule)) data.schedule = [];

  if (editingScheduleContext) {
    // Düzenleme modu
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
    targetDay.items.push({ id: oldItemId, subject, topic, duration: dur, type, done: isDone, questions, pages, book });

    editingScheduleContext = null;
    saveStudentData(window.activeStudent, data);
    showToast('Görev güncellendi!', 'success');
  } else {
    // Yeni ekleme
    let day = data.schedule.find(s => s.date === dateStr);
    if (!day) {
      day = { id: generateId(), date: dateStr, items: [] };
      data.schedule.push(day);
    }

    day.items.push({ id: generateId(), subject, topic, duration: dur, type, done: false, questions, pages, book });
    data.hasNewTasks = true;
    saveStudentData(window.activeStudent, data);
    showToast('Görev eklendi!', 'success');
  }

  closeModal('add-schedule-item-modal');

  // Formu temizle
  ['sched-subject','sched-topic','sched-questions','sched-pages','sched-book'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });

  renderSchedule();
  if (window.currentSelectedDayDate === dateStr) {
    openDayDetailModal(dateStr);
  }
  if (typeof renderDashboard === 'function') renderDashboard();
  if (typeof checkNotifications === 'function') checkNotifications();
}

// Haftayı temizle
function clearWeekSchedule() {
  if (!confirm('Bu haftanın tüm programı silinecek. Emin misin?')) return;

  const today   = new Date();
  const dayOfWk = today.getDay();
  const monday  = new Date(today);
  monday.setDate(today.getDate() - (dayOfWk === 0 ? 6 : dayOfWk - 1));

  const dates = Array.from({length:7}, (_,i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const data = getStudentData(window.activeStudent);
  data.schedule = (data.schedule || []).filter(s => !dates.includes(s.date));
  saveStudentData(window.activeStudent, data);
  renderSchedule();
  showToast('Bu haftanın programı temizlendi.', 'info');
}

// ─── Yanlış Defteri Entegrasyon Fonksiyonları ─────────────────────────────────

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
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.06);">
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

  // Modal ve programı yenile
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

  // Konulara göre grupla
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

function addTopicToScheduleAsReview(subject, topic, targetDate = null) {
  const data = getStudentData(window.activeStudent);
  if (!Array.isArray(data.schedule)) data.schedule = [];

  const dateStr = targetDate || new Date().toISOString().split('T')[0];
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
  showToast(`"${subject} - ${topic}" tekrar görevi bugüne (${dateStr}) eklendi!`, 'success');
}

function autoAssignWrongReviewsToSchedule() {
  const data = getStudentData(window.activeStudent);
  const wrongLog = data.wrongLog || [];
  const pending = wrongLog.filter(w => !w.reviewed);

  if (!pending.length) {
    showToast('Tekrar edilecek bekleyen yanlış bulunmuyor.', 'info');
    return;
  }

  // Konuları topla
  const grouped = {};
  pending.forEach(w => {
    const key = `${w.subject || 'Ders'}|||${w.topic || 'Konu'}`;
    if (!grouped[key]) grouped[key] = 0;
    grouped[key]++;
  });

  const topTopics = Object.entries(grouped)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 5); // En çok hata yapılan ilk 5 konu

  if (!Array.isArray(data.schedule)) data.schedule = [];

  const today = new Date();
  let addedCount = 0;

  topTopics.forEach(([key, count], idx) => {
    const [subj, top] = key.split('|||');
    const targetDateObj = new Date(today);
    targetDateObj.setDate(today.getDate() + idx);
    const dateStr = targetDateObj.toISOString().split('T')[0];

    let day = data.schedule.find(s => s.date === dateStr);
    if (!day) {
      day = { id: generateId(), date: dateStr, items: [] };
      data.schedule.push(day);
    }

    // Aynı görev zaten varsa ekleme
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
    showToast(`✨ En çok hata yapılan ${addedCount} konu haftalık programa tekrar görevi olarak dağıtıldı!`, 'success');
  } else {
    showToast('Bu konular zaten haftalık programda mevcut.', 'info');
  }
}

function _el(id, fn) { const el = document.getElementById(id); if (el) fn(el); }

window.renderSchedule                  = renderSchedule;
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
window.openDayDetailModal              = openDayDetailModal;
window.toggleScheduleItemFromDayModal  = toggleScheduleItemFromDayModal;
window.deleteScheduleItemFromDayModal  = deleteScheduleItemFromDayModal;
window.openAddTaskForCurrentDay        = openAddTaskForCurrentDay;
window.openWrongPoolForCurrentDay      = openWrongPoolForCurrentDay;


