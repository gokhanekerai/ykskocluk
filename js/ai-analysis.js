/**
 * ai-analysis.js — AI Analiz (Yöntem B: Prompt Kopyalama)
 *
 * Akış:
 * 1. Öğrenci verisinden otomatik prompt hazırla
 * 2. Kullanıcı promptu Gemini / ChatGPT'ye kopyalar
 * 3. AI yanıtını (JSON formatında) buraya yapıştırır
 * 4. Uygulama otomatik çalışma programı oluşturur
 */

const AI_RESPONSE_FORMAT = `
Lütfen aşağıdaki JSON formatında yanıt ver (başka metin ekleme):
{
  "ozetAnaliz": "Genel değerlendirme (2-3 cümle)",
  "gucluKonular": ["konu1", "konu2"],
  "zayifKonular": [
    { "ders": "Matematik", "konu": "Türev", "oncelik": "yüksek" },
    { "ders": "Fizik", "konu": "Elektrik", "oncelik": "orta" }
  ],
  "haftaProgram": {
    "Pazartesi":    [{ "ders": "Matematik", "konu": "Türev", "sure": 60, "tip": "konu çalışma" }],
    "Salı":         [{ "ders": "Fizik", "konu": "Elektrik", "sure": 45, "tip": "soru çözme" }],
    "Çarşamba":     [],
    "Perşembe":     [],
    "Cuma":         [],
    "Cumartesi":    [],
    "Pazar":        []
  },
  "tavsiyeler": ["Öneri 1", "Öneri 2"]
}`;

function renderAIAnalysis() {
  const data = getStudentData(window.activeStudent);
  _renderAnalysisList(data.aiAnalyses || []);
}

function _renderAnalysisList(analyses) {
  const container = document.getElementById('ai-analyses-list');
  if (!container) return;

  if (!analyses.length) {
    container.innerHTML = '<div class="empty-state"><span>🤖</span><p>Henüz analiz yapılmadı.<br>Deneme sonuçlarınızı girerek AI analizi başlatın.</p></div>';
    return;
  }

  const sorted = [...analyses].sort((a,b) => b.date.localeCompare(a.date));
  container.innerHTML = sorted.map(a => `
    <div class="analysis-card" onclick="openAnalysisDetail('${a.id}')">
      <div class="analysis-header">
        <span class="analysis-date">${formatDate(a.date)}</span>
        <span class="analysis-badge">AI Analiz</span>
      </div>
      <p class="analysis-summary">${a.ozetAnaliz?.substring(0,120) || '—'}...</p>
      <div class="analysis-tags">
        ${(a.zayifKonular || []).slice(0,3).map(z =>
          `<span class="tag tag-warn">${z.ders}: ${z.konu}</span>`
        ).join('')}
      </div>
      <button class="btn-sm btn-danger mt-1" onclick="event.stopPropagation(); deleteAnalysis('${a.id}')">🗑️ Sil</button>
    </div>
  `).join('');
}

// ─── Adım 1: Prompt Hazırla ───────────────────────────────────────────────────
function generateAnalysisPrompt() {
  const student = window.activeStudent;
  const data    = getStudentData(student);
  const users   = getUsers();
  const user    = users[student] || {};

  // Son 5 deneme
  const recentMocks = [...(data.mockLog || [])]
    .sort((a,b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  // Zayıf konular (topicStatus = studying veya not_started)
  const weakTopics = Object.entries(data.topicStatus || {})
    .filter(([, v]) => v === 'studying' || v === 'not_started')
    .map(([k]) => k.replace(/_/g, ' '))
    .slice(0, 20);

  // Kaynak ilerlemesi
  const booksInfo = (data.books || []).map(b => {
    const pct = b.totalPages > 0 ? Math.round(b.solvedPages/b.totalPages*100) : 0;
    return `${b.name} (${b.subject}): ${pct}% tamamlandı (${b.solvedPages}/${b.totalPages} sayfa)`;
  }).join('\n');

  // Son 7 gün çalışma
  const today = new Date();
  const last7 = (data.dailyLog || []).filter(e => {
    const d = new Date(e.date);
    return (today - d) / 86400000 <= 7;
  });
  const dailySummary = _groupByDate(last7);

  const prompt = `Sen bir YKS hazırlık koçusun. Aşağıdaki öğrenci verilerini analiz et ve haftalık çalışma programı öner.

## Öğrenci Bilgileri
- Ad: ${user.name || student}
- Alan: ${user.branch || 'Sayısal'}
- Hedef: ${data.personalGoal?.university || 'Belirtilmemiş'} / ${data.personalGoal?.ranking || '—'}

## Son ${recentMocks.length} Deneme Sonuçları
${recentMocks.length ? recentMocks.map(m =>
  `- ${formatDate(m.date)} | ${m.name} (${m.type}) | Toplam Net: ${m.totalNet}
   Netler: ${Object.entries(m.nets||{}).map(([k,v]) => `${k}:${v}`).join(', ')}`
).join('\n') : 'Deneme kaydı yok.'}

## Zayıf / Çalışılmakta Olan Konular
${weakTopics.length ? weakTopics.join(', ') : 'Konu takibi yapılmamış.'}

## Kaynak Takibi
${booksInfo || 'Kaynak kaydı yok.'}

## Son 7 Gün Çalışma Özeti
${Object.entries(dailySummary).map(([d,s]) =>
  `${d}: ${s.solved} soru (${s.subjects.join(', ')})`
).join('\n') || 'Veri yok.'}

${AI_RESPONSE_FORMAT}`;

  return prompt;
}

function _groupByDate(logs) {
  const result = {};
  logs.forEach(e => {
    if (!result[e.date]) result[e.date] = { solved: 0, subjects: [] };
    result[e.date].solved += Number(e.solved) || 0;
    if (e.subject && !result[e.date].subjects.includes(e.subject)) {
      result[e.date].subjects.push(e.subject);
    }
  });
  return result;
}

// ─── Adım 2: Promptu göster, kullanıcının kopyalaması için ───────────────────
function openAIPromptModal() {
  const prompt = generateAnalysisPrompt();
  const textarea = document.getElementById('ai-prompt-text');
  if (textarea) textarea.value = prompt;
  openModal('ai-prompt-modal');
}

function copyPrompt() {
  const textarea = document.getElementById('ai-prompt-text');
  if (!textarea) return;
  navigator.clipboard.writeText(textarea.value).then(() => {
    showToast('Prompt kopyalandı! ChatGPT veya Gemini\'ye yapıştırın.', 'success');
  }).catch(() => {
    textarea.select();
    document.execCommand('copy');
    showToast('Prompt kopyalandı!', 'success');
  });
}

// ─── Adım 3: AI yanıtını yapıştır ve programa aktar ───────────────────────────
function openAIResponseModal() {
  const textarea = document.getElementById('ai-response-text');
  if (textarea) textarea.value = '';
  closeModal('ai-prompt-modal');
  openModal('ai-response-modal');
}

function processAIResponse() {
  const textarea = document.getElementById('ai-response-text');
  if (!textarea) return;

  const raw = textarea.value.trim();
  if (!raw) { showToast('AI yanıtını yapıştırın.', 'warning'); return; }

  let parsed;
  try {
    // JSON bloğunu çıkar (AI bazen ```json ... ``` ekleyebilir)
    const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) ||
                      raw.match(/```\s*([\s\S]*?)\s*```/);
    const jsonStr   = jsonMatch ? jsonMatch[1] : raw;
    parsed = JSON.parse(jsonStr);
  } catch {
    showToast('JSON formatı hatalı. Lütfen AI\'dan tam JSON yanıtı isteyin.', 'error');
    return;
  }

  // Veri doğrulama
  if (!parsed.haftaProgram) {
    showToast('Geçersiz AI yanıtı: haftaProgram alanı bulunamadı.', 'error');
    return;
  }

  const analysis = {
    id:           generateId(),
    date:         getTodayStr(),
    ozetAnaliz:   parsed.ozetAnaliz || '',
    gucluKonular: parsed.gucluKonular || [],
    zayifKonular: parsed.zayifKonular || [],
    haftaProgram: parsed.haftaProgram,
    tavsiyeler:   parsed.tavsiyeler || []
  };

  const data = getStudentData(window.activeStudent);
  if (!data.aiAnalyses) data.aiAnalyses = [];
  data.aiAnalyses.push(analysis);

  // Çalışma programına aktar
  _importScheduleFromAnalysis(data, analysis);

  saveStudentData(window.activeStudent, data);
  closeModal('ai-response-modal');

  showToast('Analiz kaydedildi ve çalışma programı güncellendi!', 'success');
  renderAIAnalysis();
  renderSchedule();
  switchTab('schedule');
}

// ─── Çalışma Programına Otomatik Aktar ────────────────────────────────────────
function _importScheduleFromAnalysis(data, analysis) {
  const DAYS_TR = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
  const today   = new Date();

  // Bu haftanın Pazartesisini bul
  const dayOfWeek = today.getDay(); // 0=Pazar
  const monday    = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const weekDays = ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];

  weekDays.forEach((dayName, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const items = (analysis.haftaProgram[dayName] || []).map(item => ({
      id:       generateId(),
      subject:  item.ders   || '',
      topic:    item.konu   || '',
      duration: item.sure   || 60,
      type:     item.tip    || 'konu çalışma',
      done:     false
    }));

    if (!items.length) return;

    // Mevcut günü bul veya oluştur
    let day = data.schedule.find(s => s.date === dateStr);
    if (!day) {
      day = { id: generateId(), date: dateStr, items: [] };
      data.schedule.push(day);
    }
    // AI oluşturulan öğeleri mevcut öğelerin başına ekle (duplicate önle)
    const existingTopics = new Set(day.items.map(i => i.topic));
    items.forEach(item => {
      if (!existingTopics.has(item.topic)) {
        day.items.push(item);
        existingTopics.add(item.topic);
      }
    });
  });
}

function openAnalysisDetail(id) {
  const data     = getStudentData(window.activeStudent);
  const analysis = data.aiAnalyses.find(a => a.id === id);
  if (!analysis) return;

  const container = document.getElementById('analysis-detail-body');
  if (!container) return;

  container.innerHTML = `
    <div class="analysis-detail">
      <div class="detail-section">
        <h4>📊 Genel Değerlendirme</h4>
        <p>${analysis.ozetAnaliz || '—'}</p>
      </div>
      <div class="detail-section">
        <h4>💪 Güçlü Konular</h4>
        <div class="tag-list">${(analysis.gucluKonular||[]).map(k=>`<span class="tag tag-ok">${k}</span>`).join('') || '—'}</div>
      </div>
      <div class="detail-section">
        <h4>⚠️ Zayıf Konular</h4>
        ${(analysis.zayifKonular||[]).map(z=>`
          <div class="weak-item">
            <span class="tag tag-warn">${z.ders}</span>
            <span>${z.konu}</span>
            <span class="priority priority-${z.oncelik}">${z.oncelik} öncelik</span>
          </div>`).join('') || '—'}
      </div>
      <div class="detail-section">
        <h4>💡 Tavsiyeler</h4>
        <ul>${(analysis.tavsiyeler||[]).map(t=>`<li>${t}</li>`).join('') || '<li>—</li>'}</ul>
      </div>
    </div>`;

  openModal('analysis-detail-modal');
}

function deleteAnalysis(id) {
  if (!confirm('Bu analiz silinecek. Emin misin?')) return;
  const data = getStudentData(window.activeStudent);
  data.aiAnalyses = (data.aiAnalyses || []).filter(a => a.id !== id);
  saveStudentData(window.activeStudent, data);
  renderAIAnalysis();
  showToast('Analiz silindi.', 'info');
}

window.renderAIAnalysis     = renderAIAnalysis;
window.openAIPromptModal    = openAIPromptModal;
window.copyPrompt           = copyPrompt;
window.openAIResponseModal  = openAIResponseModal;
window.processAIResponse    = processAIResponse;
window.openAnalysisDetail   = openAnalysisDetail;
window.deleteAnalysis       = deleteAnalysis;
