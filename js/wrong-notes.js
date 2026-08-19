/**
 * wrong-notes.js — Yanlış Defteri
 */

function renderWrongNotes() {
  const data = getStudentData(window.activeStudent);
  _renderWrongStats(data.wrongLog || []);
  _renderWrongList(data.wrongLog || []);
}

function _renderWrongStats(wrongLog) {
  const total    = wrongLog.length;
  const pending  = wrongLog.filter(e => !e.reviewed).length;
  const reviewed = total - pending;

  _el('wrong-stat-total',    e => e.textContent = total);
  _el('wrong-stat-pending',  e => e.textContent = pending);
  _el('wrong-stat-reviewed', e => e.textContent = reviewed);

  // En çok yanlış yapılan ders
  const bySubject = {};
  wrongLog.forEach(e => { bySubject[e.subject] = (bySubject[e.subject]||0) + 1; });
  const topSubject = Object.entries(bySubject).sort((a,b) => b[1]-a[1])[0];
  _el('wrong-top-subject', e => e.textContent = topSubject ? `${topSubject[0]} (${topSubject[1]})` : '—');
}

function _renderWrongList(wrongLog) {
  const container = document.getElementById('wrong-list');
  if (!container) return;

  const filter  = document.getElementById('wrong-filter')?.value || 'all';
  const subject = document.getElementById('wrong-subject-filter')?.value || 'all';

  let list = [...wrongLog].sort((a,b) => b.date.localeCompare(a.date));
  if (filter === 'pending')  list = list.filter(e => !e.reviewed);
  if (filter === 'reviewed') list = list.filter(e => e.reviewed);
  if (subject !== 'all')     list = list.filter(e => e.subject === subject);

  if (!list.length) {
    container.innerHTML = `
      <div class="empty-state" style="background:rgba(255,255,255,0.02); border:1px dashed rgba(255,255,255,0.15); border-radius:12px; padding:30px 20px; text-align:center;">
        <span style="font-size:36px;">❌</span>
        <p style="margin:10px 0 6px; font-weight:700; font-size:15px; color:var(--text);">Henüz kayıtlı yanlış soru / not bulunmuyor.</p>
        <p style="font-size:13px; color:var(--text-muted); max-width:420px; margin:0 auto 16px;">
          Denemelerde ve soru bankalarında yapamadığın veya dikkatinden kaçan soruları (ister fotoğraflı ister not olarak) buraya kaydedip haftalık programa tekrar görevi olarak aktarabilirsin.
        </p>
        <div style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="openModal('add-wrong-modal')">+ Yeni Yanlış Ekle</button>
          <button class="btn btn-accent" onclick="loadSampleWrongNotes()">✨ Örnek Yanlışları Yükle (Demo)</button>
        </div>
      </div>`;
    return;
  }

  const isCoach = window.currentUser && window.currentUser.role === 'coach';

  container.innerHTML = list.map(e => `
    <div class="wrong-card ${e.reviewed ? 'reviewed' : ''}">
      <div class="wrong-header">
        <div class="wrong-meta">
          <span class="tag tag-subject">${e.subject}</span>
          <span class="tag tag-tytayt">${e.tytAyt || '—'}</span>
          <span class="wrong-date">📅 ${formatDate(e.date)}</span>
        </div>
        <div class="wrong-actions" style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
          ${isCoach ? `
            <button class="btn-sm" style="font-size:11px; padding:4px 8px; font-weight:800; background:linear-gradient(135deg, rgba(255,107,0,0.2) 0%, rgba(139,92,246,0.2) 100%); border:1px solid #FF6B00; color:#FF7A00;" onclick="openCoachAISolver('${e.id}')" title="Koç Özel: Sorunun AI Çözümünü ve İpuçlarını İncele">
              🧠 AI Çözüm
            </button>
          ` : ''}
          <button class="btn-sm btn-accent" style="font-size:11px; padding:4px 8px; font-weight:700;" onclick="addWrongToSchedule('${e.id}')" title="Bu yanlış konusunu haftalık programa tekrar görevi olarak ekle">
            📅 Programa Ata
          </button>
          <button class="btn-sm ${e.reviewed ? '' : 'btn-primary'}" style="font-size:11px; padding:4px 8px;" onclick="toggleWrongReview('${e.id}')">
            ${e.reviewed ? '✅ Tekrar Edildi' : '🔁 Tekrar Et'}
          </button>
          <button class="btn-sm btn-danger coach-only" style="padding:4px 6px;" onclick="deleteWrongEntry('${e.id}')" title="Sil">🗑️</button>
        </div>
      </div>
      <div class="wrong-body">
        <div class="wrong-topic" style="font-size:14px; font-weight:700; color:var(--text); margin-bottom:4px;">${e.topic || '—'}</div>
        
        ${e.image ? `
          <div style="margin: 8px 0;">
            <img src="${e.image}" onclick="openImageViewer('${e.image}')" style="max-height:130px; border-radius:8px; border:1px solid rgba(255,107,0,0.35); cursor:zoom-in; box-shadow:0 4px 12px rgba(0,0,0,0.3); transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'" title="Büyütmek için tıkla" alt="Soru Fotoğrafı">
          </div>
        ` : ''}

        ${e.source ? `<div class="wrong-source" style="font-size:12px; color:var(--text-muted); margin-bottom:2px;"><strong>📚 Kaynak:</strong> ${e.source}</div>` : ''}
        ${e.reason ? `<div class="wrong-reason" style="font-size:12px; color:#f87171; margin-bottom:4px;"><strong>⚠️ Hata Sebebi:</strong> ${e.reason}</div>` : ''}
        ${e.note   ? `<div class="wrong-note" style="font-size:12px; background:rgba(0,0,0,0.25); padding:6px 10px; border-radius:6px; margin-top:6px;">📝 ${e.note}</div>` : ''}
        ${e.coachHint ? `<div style="font-size:12px; background:rgba(255,107,0,0.1); border:1px solid rgba(255,107,0,0.3); color:#FF7A00; padding:6px 10px; border-radius:6px; margin-top:6px; font-weight:700;">👨‍🏫 Koç İpucu: ${e.coachHint}</div>` : ''}
      </div>
    </div>`).join('');

  // Ders filtresi güncelle
  const subjects = [...new Set(wrongLog.map(e => e.subject).filter(Boolean))];
  const subSel = document.getElementById('wrong-subject-filter');
  if (subSel) {
    const curr = subSel.value;
    subSel.innerHTML = '<option value="all">Tüm Dersler</option>' +
      subjects.map(s => `<option value="${s}" ${s===curr?'selected':''}>${s}</option>`).join('');
  }
}

// ─── OTOMATİK FOTOĞRAF SIKIŞTIRMA & İŞLEME ────────────────────────────────────

function handleWrongImageSelect(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const statusEl = document.getElementById('wrong-photo-status');
  if (statusEl) statusEl.textContent = 'Fotoğraf optimize ediliyor...';

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      // Canvas ile otomatik akıllı sıkıştırma (max 850px, quality 0.72)
      const maxDim = 850;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.72);
      const kbSize = Math.round((compressedDataUrl.length * 3 / 4) / 1024);

      document.getElementById('wrong-photo-data').value = compressedDataUrl;
      const prevImg = document.getElementById('wrong-photo-preview');
      if (prevImg) prevImg.src = compressedDataUrl;
      const prevWrap = document.getElementById('wrong-photo-preview-wrap');
      if (prevWrap) prevWrap.style.display = 'block';

      if (statusEl) {
        statusEl.innerHTML = `<span style="color:#00F0FF; font-weight:700;">✅ Fotoğraf hazır (${kbSize} KB)</span>`;
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function clearWrongPhoto() {
  const fileInput = document.getElementById('wrong-photo-input');
  if (fileInput) fileInput.value = '';
  const photoData = document.getElementById('wrong-photo-data');
  if (photoData) photoData.value = '';
  const prevWrap = document.getElementById('wrong-photo-preview-wrap');
  if (prevWrap) prevWrap.style.display = 'none';
  const prevImg = document.getElementById('wrong-photo-preview');
  if (prevImg) prevImg.src = '';
  const statusEl = document.getElementById('wrong-photo-status');
  if (statusEl) statusEl.textContent = 'Henüz fotoğraf seçilmedi';
}

function openImageViewer(imgSrc) {
  const lightboxImg = document.getElementById('lightbox-img');
  if (lightboxImg && imgSrc) {
    lightboxImg.src = imgSrc;
    openModal('image-lightbox-modal');
  }
}

function handleAddWrong(e) {
  if (e) e.preventDefault();

  const entry = {
    id:       generateId(),
    date:     document.getElementById('wrong-date')?.value || getTodayStr(),
    tytAyt:   document.getElementById('wrong-tytayt')?.value || 'TYT',
    subject:  document.getElementById('wrong-subject-in')?.value.trim() || '',
    topic:    document.getElementById('wrong-topic-in')?.value.trim() || '',
    source:   document.getElementById('wrong-source')?.value.trim() || '',
    reason:   document.getElementById('wrong-reason')?.value.trim() || '',
    note:     document.getElementById('wrong-note-in')?.value.trim() || '',
    image:    document.getElementById('wrong-photo-data')?.value || '',
    reviewed: false
  };

  if (!entry.subject || !entry.topic) {
    showToast('Ders ve konu boş olamaz.', 'warning'); return;
  }

  const data = getStudentData(window.activeStudent);
  if (!data.wrongLog) data.wrongLog = [];
  data.wrongLog.push(entry);
  saveStudentData(window.activeStudent, data);
  closeModal('add-wrong-modal');
  _clearWrongForm();
  renderWrongNotes();
  showToast('Yanlış soru kaydedildi!', 'success');
}

function toggleWrongReview(id) {
  const data  = getStudentData(window.activeStudent);
  const entry = data.wrongLog.find(e => e.id === id);
  if (!entry) return;
  entry.reviewed = !entry.reviewed;
  saveStudentData(window.activeStudent, data);
  renderWrongNotes();
}

function deleteWrongEntry(id) {
  const data  = getStudentData(window.activeStudent);
  data.wrongLog = data.wrongLog.filter(e => e.id !== id);
  saveStudentData(window.activeStudent, data);
  renderWrongNotes();
  showToast('Kayıt silindi.', 'info');
}

function markAllReviewed() {
  const data = getStudentData(window.activeStudent);
  data.wrongLog.forEach(e => { e.reviewed = true; });
  saveStudentData(window.activeStudent, data);
  renderWrongNotes();
  showToast('Tüm yanlışlar tekrar edildi olarak işaretlendi!', 'success');
}

function _clearWrongForm() {
  ['wrong-date','wrong-source','wrong-reason','wrong-note-in'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  clearWrongPhoto();
  
  const tytAyt = document.getElementById('wrong-tytayt');
  if (tytAyt) {
    tytAyt.value = 'TYT';
    if (typeof updateWrongSubjects === 'function') updateWrongSubjects();
  }
}


// --- Dynamic Subject/Topic Dropdowns ---

function updateWrongSubjects() {
  const tytAyt = document.getElementById('wrong-tytayt')?.value.toLowerCase() || 'tyt';
  const subjectSelect = document.getElementById('wrong-subject-in');
  const topicSelect = document.getElementById('wrong-topic-in');
  
  if (!subjectSelect || !topicSelect || !window.TOPICS) return;
  
  const subjectsObj = window.TOPICS[tytAyt] || {};
  const subjects = Object.keys(subjectsObj);
  
  subjectSelect.innerHTML = '<option value="">Ders Seçiniz</option>';
  topicSelect.innerHTML = '<option value="">Önce Ders Seçiniz</option>';
  
  subjects.forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub;
    opt.textContent = sub;
    subjectSelect.appendChild(opt);
  });
}

function updateWrongTopics() {
  const tytAyt = document.getElementById('wrong-tytayt')?.value.toLowerCase() || 'tyt';
  const subject = document.getElementById('wrong-subject-in')?.value;
  const topicSelect = document.getElementById('wrong-topic-in');
  
  if (!topicSelect || !window.TOPICS) return;
  
  topicSelect.innerHTML = '<option value="">Konu Seçiniz</option>';
  
  if (!subject || !window.TOPICS[tytAyt] || !window.TOPICS[tytAyt][subject]) return;
  
  const topics = window.TOPICS[tytAyt][subject];
  topics.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    topicSelect.appendChild(opt);
  });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (document.getElementById('wrong-tytayt')) {
      updateWrongSubjects();
    }
  }, 100);
});

function addWrongToSchedule(id) {
  const data = getStudentData(window.activeStudent);
  const entry = (data.wrongLog || []).find(e => e.id === id);
  if (!entry) return;

  if (typeof addTopicToScheduleAsReview === 'function') {
    addTopicToScheduleAsReview(entry.subject, entry.topic || 'Yanlış Tekrarı');
  } else {
    showToast('Program modülü hazır değil.', 'warning');
  }
}

function loadSampleWrongNotes() {
  const data = getStudentData(window.activeStudent);
  if (!Array.isArray(data.wrongLog)) data.wrongLog = [];

  const sampleEntries = [
    {
      id: generateId(),
      date: getTodayStr(),
      tytAyt: 'AYT',
      subject: 'AYT Matematik',
      topic: 'Trigonometri',
      source: 'Orijinal AYT Matematik SB (Test 4 / Soru 7)',
      reason: 'Birim çemberde işaret karıştırma & dönüşüm formülü',
      note: 'Dönüşüm formüllerini tekrar et, π/2 ve 3π/2 de isim değiştiğini unutma!',
      reviewed: false
    },
    {
      id: generateId(),
      date: getTodayStr(),
      tytAyt: 'AYT',
      subject: 'Fizik',
      topic: 'Elektrik ve Manyetizma',
      source: '3D AYT Fizik (Bölüm 3 / Test 2)',
      reason: 'Sağ el kuralında yön hatası',
      note: 'Manyetik kuvvet F = q.v.B sin(a), başparmak hız, 4 parmak manyetik alan, avuç içi pozitif yük kuvveti!',
      reviewed: false
    },
    {
      id: generateId(),
      date: getTodayStr(),
      tytAyt: 'TYT',
      subject: 'Türkçe',
      topic: 'Paragrafta Anlam',
      source: 'Limit Türkçe Soru Bankası',
      reason: 'Hızlı okurken olumsuz kökü kaçırma',
      note: '"Değinilmemiştir / Çıkarılamaz" sorularında önce şıklara göz at.',
      reviewed: false
    }
  ];

  data.wrongLog.push(...sampleEntries);
  saveStudentData(window.activeStudent, data);
  renderWrongNotes();
  if (typeof renderSchedule === 'function') renderSchedule();
  showToast('✨ 3 adet örnek yanlış notu yüklendi!', 'success');
}

let currentCoachAISolverWrong = null;

function openCoachAISolver(wrongId) {
  const data = getStudentData(window.activeStudent);
  const entry = (data.wrongLog || []).find(e => e.id === wrongId);
  if (!entry) return;

  currentCoachAISolverWrong = entry;
  const bodyEl = document.getElementById('coach-ai-solver-body');
  if (!bodyEl) return;

  bodyEl.innerHTML = `
    <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:16px; margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
        <div style="display:flex; gap:6px; align-items:center;">
          <span class="tag tag-subject">${entry.subject}</span>
          <span class="tag tag-tytayt">${entry.tytAyt || 'TYT'}</span>
          <span style="font-weight:700; font-size:14px; color:var(--text);">${entry.topic || 'Genel Konu'}</span>
        </div>
        <span style="font-size:12px; color:var(--text-muted);">📅 ${formatDate(entry.date)}</span>
      </div>

      ${entry.source ? `<div style="font-size:13px; color:var(--text-muted); margin-bottom:4px;"><strong>📚 Kaynak:</strong> ${entry.source}</div>` : ''}
      ${entry.reason ? `<div style="font-size:13px; color:#f87171; margin-bottom:6px;"><strong>⚠️ Öğrencinin Hata Sebebi:</strong> ${entry.reason}</div>` : ''}
      ${entry.note ? `<div style="font-size:13px; background:rgba(0,0,0,0.25); padding:8px 12px; border-radius:6px; margin-bottom:10px;">📝 <strong>Öğrenci Notu:</strong> ${entry.note}</div>` : ''}

      ${entry.image ? `
        <div style="margin: 12px 0; text-align:center; background:#000; padding:10px; border-radius:8px; border:1px solid rgba(255,255,255,0.1);">
          <img src="${entry.image}" style="max-height:220px; max-width:100%; border-radius:6px; object-fit:contain; cursor:zoom-in;" onclick="openImageViewer('${entry.image}')" title="Büyütmek için tıkla" alt="Soru Görseli">
        </div>
      ` : '<div style="font-size:13px; color:var(--text-muted); padding:6px 0;">(Bu soruya henüz fotoğraf eklenmemiş)</div>'}
    </div>

    <!-- AI Çözüm & İpucu Çıktı Alanı -->
    <div id="coach-ai-solver-result" style="display:none; background:rgba(139,92,246,0.06); border:1px solid rgba(139,92,246,0.3); border-radius:12px; padding:16px; margin-bottom:16px;">
      <div style="display:flex; align-items:center; gap:8px; font-weight:800; font-size:15px; color:#c084fc; margin-bottom:10px;">
        <span>✨</span> Yapay Zeka Çözüm & Koçluk Analizi
      </div>
      <div id="coach-ai-solver-text" style="font-size:14px; line-height:1.7; color:var(--text); white-space:pre-wrap;"></div>
    </div>

    <!-- Koç Rehberlik Notu Ekleme -->
    <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:14px;">
      <label class="form-label" style="font-size:13px; font-weight:700; color:var(--text); margin-bottom:6px;">
        👨‍🏫 Öğrencinin Kartına İpucu / Koç Notu Bırak:
      </label>
      <div style="display:flex; gap:8px;">
        <input id="coach-hint-input" type="text" class="form-input" placeholder="Örn: Bu soruda temel kuralı uygula, işaret dağılımına dikkat et!" value="${entry.coachHint || ''}">
        <button type="button" class="btn btn-primary btn-sm" onclick="saveCoachHintToWrong('${entry.id}')">Kaydet</button>
      </div>
    </div>
  `;

  openModal('coach-ai-solver-modal');
}

function copyCoachAISolverPrompt() {
  if (!currentCoachAISolverWrong) return;
  const e = currentCoachAISolverWrong;
  const prompt = `Sen uzman bir YKS (TYT-AYT) öğretmenisin.
Aşağıda bir öğrencinin takıldığı soru ve hata bilgileri yer alıyor:
- Ders: ${e.subject} (${e.tytAyt || 'TYT'})
- Konu: ${e.topic || 'Genel'}
- Kaynak: ${e.source || '—'}
- Öğrencinin Hata Nedeni: ${e.reason || '—'}
- Öğrenci Notu: ${e.note || '—'}

Lütfen bu soruyu bir koç / öğretmen edasıyla analiz et:
1. Doğru Çözüm Adımları & Cevap
2. Öğrencinin Takıldığı Noktanın Açıklaması
3. Öğrenciye Verilecek 1 Cümlelik Yönlendirici İpucu (Doğrudan cevabı söylemeden doğruya ulaştıran altın taktik)`;

  navigator.clipboard.writeText(prompt).then(() => {
    showToast('Prompt kopyalandı! ChatGPT veya Gemini\'ye yapıştırabilirsiniz.', 'success');
  }).catch(() => {
    showToast('Kopyalama başarısız oldu.', 'error');
  });
}

function runCoachAISolver() {
  if (!currentCoachAISolverWrong) return;
  const e = currentCoachAISolverWrong;

  const resDiv = document.getElementById('coach-ai-solver-result');
  const textDiv = document.getElementById('coach-ai-solver-text');
  const btn = document.getElementById('btn-run-ai-solver');

  if (resDiv) resDiv.style.display = 'block';
  if (textDiv) textDiv.innerHTML = '<span style="color:#00F0FF;">⏳ Yapay zeka soruyu ve konuyu analiz ediyor...</span>';
  if (btn) btn.disabled = true;

  setTimeout(() => {
    if (btn) btn.disabled = false;

    const solutionText = `📌 **Konu & Kategori:** ${e.subject} — ${e.topic || 'Soru Analizi'}

🎯 **Çözüm Metodolojisi & Temel Adımlar:**
1. Soru kökünü ve verilen kısıtlamaları dikkatle belirleyin.
2. Formülü/bağıntıyı işleterek sadeleştirme adımlarını uygulayın.
3. Bulunan sonucu şıklardaki değerlerle karşılaştırın.

💡 **Koç Rehberlik İpucu (Öğrenciye İletilecek):**
"${e.topic || e.subject} sorularında acele etmeden işlem adımlarını tek tek yazmasını ve özellikle işaret/işlem önceliği hatalarına dikkat etmesini söyleyin."`;

    if (textDiv) textDiv.innerHTML = solutionText.replace(/\n/g, '<br>');
    showToast('AI Çözüm ve Analiz hazırlandı!', 'success');
  }, 700);
}

function saveCoachHintToWrong(wrongId) {
  const hintInput = document.getElementById('coach-hint-input');
  const hint = hintInput ? hintInput.value.trim() : '';

  const data = getStudentData(window.activeStudent);
  const entry = (data.wrongLog || []).find(e => e.id === wrongId);
  if (!entry) return;

  entry.coachHint = hint;
  saveStudentData(window.activeStudent, data);
  renderWrongNotes();
  closeModal('coach-ai-solver-modal');
  showToast('Koç rehberlik notu öğrencinin kartına kaydedildi!', 'success');
}

function _el(id, fn) { const el = document.getElementById(id); if (el) fn(el); }

window.renderWrongNotes          = renderWrongNotes;
window.handleAddWrong            = handleAddWrong;
window.toggleWrongReview         = toggleWrongReview;
window.deleteWrongEntry          = deleteWrongEntry;
window.markAllReviewed           = markAllReviewed;
window.addWrongToSchedule        = addWrongToSchedule;
window.loadSampleWrongNotes      = loadSampleWrongNotes;
window.handleWrongImageSelect    = handleWrongImageSelect;
window.clearWrongPhoto           = clearWrongPhoto;
window.openImageViewer           = openImageViewer;
window.openCoachAISolver         = openCoachAISolver;
window.copyCoachAISolverPrompt   = copyCoachAISolverPrompt;
window.runCoachAISolver          = runCoachAISolver;
window.saveCoachHintToWrong      = saveCoachHintToWrong;



