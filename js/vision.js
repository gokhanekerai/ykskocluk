/**
 * vision.js — Görselden Deneme Okuma (No-API / Kopyala-Yapıştır)
 */

const VISION_PROMPT = `Sen bir YKS deneme optik okuyucu analiz asistanısın. 
Görselde verilen deneme sınavı sonuç belgesini (TYT veya AYT) analiz et.
Bana şu JSON formatında bir veri döndür (başka hiçbir metin veya markdown ekleme, sadece JSON olsun):
{
  "type": "TYT", // veya "AYT"
  "name": "Sınavın Adı veya YKS Deneme",
  "date": "YYYY-MM-DD", // eğer tarih okunmuyorsa bugünün tarihini at
  "tyt": {
    "turkce": { "c": 35, "w": 5 },
    "mat": { "c": 30, "w": 4 },
    "fen": { "c": 15, "w": 2 },
    "sosyal": { "c": 18, "w": 2 }
  },
  "ayt": {
    "branch": "SAY", // SAY, EA veya SOZ
    "mat": { "c": 0, "w": 0 },
    "fiz": { "c": 0, "w": 0 }, // Edebiyat veya Fizik ise buraya (Fizik/Edebiyat D/Y alanına)
    "kim": { "c": 0, "w": 0 }, // Tarih veya Kimya ise buraya
    "bio": { "c": 0, "w": 0 }  // Coğrafya veya Biyoloji ise buraya
  }
}
Not: "c" doğru sayısını, "w" yanlış sayısını temsil eder. Sadece görselde okunabilen veya mantıklı olan kısımları doldur, okunmayan yerlere 0 yaz.
`;

function copyVisionPrompt() {
  navigator.clipboard.writeText(VISION_PROMPT).then(() => {
    showToast('Prompt kopyalandı! Şimdi ChatGPT/Gemini\'ye yapıştırın.', 'success');
  }).catch(err => {
    console.error('Kopyalama hatası:', err);
    showToast('Kopyalama başarısız oldu.', 'error');
  });
}

function processVisionResponse() {
  const textarea = document.getElementById('vision-ai-response');
  if (!textarea) return;
  
  const text = textarea.value.trim();
  if (!text) {
    showToast('Lütfen AI yanıtını kutuya yapıştırın!', 'warning');
    return;
  }

  try {
    // Markdown code block formatını temizle
    let cleanText = text;
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '').trim();
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/```/g, '').trim();
    }

    const parsed = JSON.parse(cleanText);
    
    // Formu doldur
    autofillExamForm(parsed);

    closeModal('ai-vision-modal');
    textarea.value = ''; // temizle
    
    // Ana form modali açıksa onu göster, değilse aç
    openModal('add-exam-modal');
    showToast('Sonuçlar başarıyla okundu! Kaydetmeyi unutmayın.', 'success');

  } catch (error) {
    console.error(error);
    showToast('Yanıt formatı hatalı. Sadece JSON formatında kopyaladığınıza emin olun.', 'error');
  }
}

function autofillExamForm(data) {
  // Sınav Adı ve Tarihi
  if (data.name) {
    const el = document.getElementById('exam-name');
    if (el) el.value = data.name;
  }
  if (data.date) {
    const el = document.getElementById('exam-date');
    if (el) el.value = data.date;
  } else {
    const el = document.getElementById('exam-date');
    if (el) el.value = new Date().toISOString().split('T')[0];
  }

  // TYT/AYT Seçimi
  const typeSelect = document.getElementById('exam-type');
  if (typeSelect) {
    typeSelect.value = data.type === 'AYT' ? 'AYT' : 'TYT';
  }
  if (window.updateMockFormFields) window.updateMockFormFields();

  // TYT Değerleri
  if (data.type === 'TYT' && data.tyt) {
    const setVal = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };
    if (data.tyt.turkce) {
      setVal('tyt-turkce-c', data.tyt.turkce.c);
      setVal('tyt-turkce-w', data.tyt.turkce.w);
    }
    if (data.tyt.mat) {
      setVal('tyt-mat-c', data.tyt.mat.c);
      setVal('tyt-mat-w', data.tyt.mat.w);
    }
    if (data.tyt.fen) {
      setVal('tyt-fen-c', data.tyt.fen.c);
      setVal('tyt-fen-w', data.tyt.fen.w);
    }
    if (data.tyt.sosyal) {
      setVal('tyt-sosyal-c', data.tyt.sosyal.c);
      setVal('tyt-sosyal-w', data.tyt.sosyal.w);
    }
  }

  // AYT Değerleri
  if (data.type === 'AYT' && data.ayt) {
    const branchEl = document.getElementById('exam-branch');
    if (branchEl && data.ayt.branch) {
      branchEl.value = data.ayt.branch;
    }
    if (window.updateAYTLabels) window.updateAYTLabels();

    const setVal = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };
    if (data.ayt.mat) {
      setVal('ayt-mat-c', data.ayt.mat.c);
      setVal('ayt-mat-w', data.ayt.mat.w);
    }
    // SAY
    if (data.ayt.fiz) { setVal('ayt-fiz-c', data.ayt.fiz.c); setVal('ayt-fiz-w', data.ayt.fiz.w); }
    if (data.ayt.kim) { setVal('ayt-kim-c', data.ayt.kim.c); setVal('ayt-kim-w', data.ayt.kim.w); }
    if (data.ayt.bio) { setVal('ayt-bio-c', data.ayt.bio.c); setVal('ayt-bio-w', data.ayt.bio.w); }
    // EA
    if (data.ayt.tur) { setVal('ayt-tur-c', data.ayt.tur.c); setVal('ayt-tur-w', data.ayt.tur.w); }
    if (data.ayt.tar) { setVal('ayt-tar-c', data.ayt.tar.c); setVal('ayt-tar-w', data.ayt.tar.w); }
    if (data.ayt.cog) { setVal('ayt-cog-c', data.ayt.cog.c); setVal('ayt-cog-w', data.ayt.cog.w); }
  }

  if (window.calcExamBlanks) window.calcExamBlanks();
  if (window.calcExamScorePreview) window.calcExamScorePreview();
}

window.copyVisionPrompt = copyVisionPrompt;
window.processVisionResponse = processVisionResponse;
