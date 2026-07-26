/**
 * schedule.js — Çalışma Programı Yönetimi
 * AI analizinden otomatik oluşturulur, koç de el ile düzenleyebilir.
 */

function renderSchedule() {
  const data = getStudentData(window.activeStudent);
  _renderWeekView(data.schedule || []);
  _renderScheduleStats(data.schedule || []);
}

function _renderWeekView(schedule) {
  const container = document.getElementById('schedule-week');
  if (!container) return;

  // Bu haftanın günlerini bul
  const today    = new Date();
  const dayOfWk  = today.getDay();
  const monday   = new Date(today);
  monday.setDate(today.getDate() - (dayOfWk === 0 ? 6 : dayOfWk - 1));

  const DAYS = ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];

  container.innerHTML = DAYS.map((dayName, i) => {
    const date    = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const isToday = dateStr === today.toISOString().split('T')[0];

    const dayData = schedule.find(s => s.date === dateStr);
    const items   = dayData?.items || [];
    const doneCount = items.filter(item => item.done).length;

    return `
      <div class="schedule-day ${isToday ? 'today' : ''}">
        <div class="day-header">
          <div class="day-name">${dayName}</div>
          <div class="day-date">${date.toLocaleDateString('tr-TR', { day:'2-digit', month:'short' })}</div>
          ${items.length ? `<div class="day-progress">${doneCount}/${items.length}</div>` : ''}
        </div>
        <div class="day-items" id="day-${dateStr}">
          ${items.length ? items.map(item => _scheduleItemHtml(item, dateStr)).join('') :
            '<div class="day-empty">Ders yok</div>'}
        </div>
        <button class="btn-add-task" onclick="openAddScheduleItem('${dateStr}')">+ Ekle</button>
      </div>`;
  }).join('');
}

function _scheduleItemHtml(item, dateStr) {
  const icon = {
    'konu çalışma': '📖', 'soru çözme': '✏️', 'deneme': '📝', 'tekrar': '🔁', 'video': '🎬'
  }[item.type] || '📌';

  return `
    <div class="schedule-item ${item.done ? 'done' : ''}" id="si-${item.id}">
      <input type="checkbox" class="item-check" ${item.done ? 'checked' : ''}
             onchange="toggleScheduleItem('${dateStr}', '${item.id}', this.checked)">
      <div class="item-info">
        <div class="item-subject">${icon} ${item.subject}</div>
        <div class="item-topic">${item.topic}</div>
        <div class="item-meta">${item.duration} dk • ${item.type}</div>
      </div>
      <button class="btn-icon-sm" onclick="deleteScheduleItem('${dateStr}','${item.id}')">×</button>
    </div>`;
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
}

// ─── El ile Öğe Ekleme ────────────────────────────────────────────────────────

function openAddScheduleItem(dateStr) {
  document.getElementById('sched-item-date').value = dateStr;
  openModal('add-schedule-item-modal');
}

function handleAddScheduleItem(e) {
  if (e) e.preventDefault();

  const dateStr = document.getElementById('sched-item-date')?.value;
  const subject = document.getElementById('sched-subject')?.value.trim() || '';
  const topic   = document.getElementById('sched-topic')?.value.trim() || '';
  const dur     = parseInt(document.getElementById('sched-duration')?.value) || 60;
  const type    = document.getElementById('sched-type')?.value || 'konu çalışma';

  if (!subject || !topic) { showToast('Ders ve konu boş olamaz.', 'warning'); return; }

  const data = getStudentData(window.activeStudent);
  let day = data.schedule.find(s => s.date === dateStr);
  if (!day) {
    day = { id: generateId(), date: dateStr, items: [] };
    data.schedule.push(day);
  }

  day.items.push({ id: generateId(), subject, topic, duration: dur, type, done: false });
  saveStudentData(window.activeStudent, data);
  closeModal('add-schedule-item-modal');

  // Formu temizle
  ['sched-subject','sched-topic'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });

  renderSchedule();
  showToast('Ders eklendi!', 'success');
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

function _el(id, fn) { const el = document.getElementById(id); if (el) fn(el); }

window.renderSchedule        = renderSchedule;
window.toggleScheduleItem    = toggleScheduleItem;
window.deleteScheduleItem    = deleteScheduleItem;
window.openAddScheduleItem   = openAddScheduleItem;
window.handleAddScheduleItem = handleAddScheduleItem;
window.clearWeekSchedule     = clearWeekSchedule;
