/**
 * report.js — Canlı Renkli Koçluk Raporu, DISC Mizaç Analizi & Derin AI Entegrasyonu
 * Kaan ve Çağan için özel pedagojik koçluk karnesi, görüşme tutanağı ve otomatik 7 günlük program üretici
 */

let _reportActionEditing = false;
let _reportPasteAiOpen = false;
let _reportInspectionOpen = false;

// ─── Mizaç ve AI Yardımcıları ──────────────────────────────────────────────────

function getMizacTailoredGoals(studentId) {
  if (studentId === 'cagan') {
    return [
      'TYT Matematik & Paragraf: Günlük 30 soru odaklı rutin (35 dk blok + 10 dk mola kuralı).',
      'AYT Fizik / Fen: Zayıf konulardan şematik kavram haritası ve 30 soru derinleşme.',
      'Yanlış Defteri & Deneme: Hataları B/D/İ (Bilgi/Dikkat/İşlem) etiketleriyle kapatma ve hafta sonu turlama denemesi.'
    ];
  } else {
    // Kaan (veya genel)
    return [
      'TYT Matematik: Günlük 35 soru problem & rutin (2.5 dk kuralı, inatlaşma yok).',
      'AYT Fen & Matematik: Zayıf tespit edilen 1 ana konudan soru bankası taraması (45 dk blok).',
      'Deneme Stratejisi: Hafta sonu TYT/AYT denemesinde 2 turlu turlama taktiği ve Yanlış Defteri analizi.'
    ];
  }
}

function autoGenerateMizacGoals(studentId) {
  studentId = studentId || window.activeStudent || 'kaan';
  const goals = getMizacTailoredGoals(studentId);
  const data = getStudentData(studentId);
  data.meetingActionItems = goals;
  saveStudentData(studentId, data);
  showToast('✨ Öğrencinin DISC mizacına ve verilerine göre 3 ana hedef otomatik oluşturuldu!', 'success');
  openCoachReportModal();
}

function parseActionItemsFromAIText(text) {
  if (!text) return null;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const items = [];
  
  let inActionSection = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('EYLEM PLANI') || line.includes('ÖNÜMÜZDEKİ HAFTA İÇİN') || line.includes('EYLEM HEDEFLERİ') || line.includes('2. 🎯') || line.includes('2.')) {
      if (line.toLowerCase().includes('plan') || line.toLowerCase().includes('hedef') || line.toLowerCase().includes('ödev') || line.toLowerCase().includes('eylem')) {
        inActionSection = true;
        continue;
      }
    }
    if (inActionSection && (line.includes('3. 🗣️') || line.includes('GÖRÜŞMEDE ÖĞRENCİYE') || line.includes('MOTİVASYON') || line.includes('3. 💬') || line.includes('3.'))) {
      if (line.toLowerCase().includes('görüşme') || line.toLowerCase().includes('cümle') || line.toLowerCase().includes('motivasyon') || line.toLowerCase().includes('tavsiye')) {
        break;
      }
    }
    if (inActionSection) {
      const match = line.match(/^(\d+[\.\)]|\-|\*|•)\s*(.+)/);
      if (match && match[2].length > 5) {
        let cleanText = match[2].replace(/\*\*/g, '').replace(/^[•\-\*]\s*/, '').trim();
        items.push(cleanText);
        if (items.length >= 3) break;
      }
    }
  }

  return items.length >= 2 ? items.slice(0, 3) : null;
}

function get7DayScheduleFromGoals(studentId, actionItems) {
  studentId = studentId || window.activeStudent || 'kaan';
  const isCagan = studentId === 'cagan';
  const focusDur = isCagan ? 35 : 45;

  const act1 = actionItems[0] || 'TYT Matematik & Problem Rutini';
  const act2 = actionItems[1] || 'AYT Fen & Zayıf Konu Derinleşmesi';
  const act3 = actionItems[2] || 'Turlama Taktiğiyle Genel Deneme';

  return [
    {
      day: 'Pazartesi',
      badge: 'Rutin & Temel',
      tasks: [
        { subj: 'TYT Matematik', topic: `Rutin: ${act1.substring(0, 36)}...`, dur: `${focusDur} dk`, q: isCagan ? 30 : 35, type: 'Soru' },
        { subj: 'AYT Fizik', topic: `Hedef Odak: ${act2.substring(0, 36)}...`, dur: `${focusDur} dk`, q: 25, type: 'Konu' },
        { subj: 'Rehberlik', topic: 'Yanlış Defteri & Hata Analizi', dur: '25 dk', q: 0, type: 'Analiz' }
      ]
    },
    {
      day: 'Salı',
      badge: 'Hız & Alan',
      tasks: [
        { subj: 'TYT Türkçe', topic: 'Paragraf & Hızlı Okuma Rutini', dur: `${focusDur} dk`, q: 25, type: 'Soru' },
        { subj: 'AYT Kimya', topic: `Soru Bankası: ${act2.substring(0, 36)}...`, dur: `${focusDur} dk`, q: 30, type: 'Soru' },
        { subj: 'TYT Matematik', topic: 'Temel Kavramlar & Hız Testi', dur: `${focusDur} dk`, q: 30, type: 'Soru' }
      ]
    },
    {
      day: 'Çarşamba',
      badge: 'Derinleşme',
      tasks: [
        { subj: 'TYT Matematik', topic: `Rutin: ${act1.substring(0, 36)}...`, dur: `${focusDur} dk`, q: isCagan ? 30 : 35, type: 'Soru' },
        { subj: 'AYT Biyoloji', topic: 'Kavram Şeması & Nokta Soru Taraması', dur: `${focusDur} dk`, q: 30, type: 'Konu' },
        { subj: 'Rehberlik', topic: 'Zor Soru & Yanlış Defteri Kapanışı', dur: '30 dk', q: 0, type: 'Analiz' }
      ]
    },
    {
      day: 'Perşembe',
      badge: 'Geometri & AYT',
      tasks: [
        { subj: 'TYT Geometri', topic: 'Üçgenler & Görme Egzersizleri', dur: `${focusDur} dk`, q: 25, type: 'Soru' },
        { subj: 'AYT Matematik', topic: `Hedef Odak: ${act2.substring(0, 36)}...`, dur: `${focusDur} dk`, q: 35, type: 'Konu' },
        { subj: 'AYT Fen', topic: 'Karma Branş Testi', dur: `${focusDur} dk`, q: 30, type: 'Soru' }
      ]
    },
    {
      day: 'Cuma',
      badge: 'Haftalık Kapanış',
      tasks: [
        { subj: 'TYT Matematik', topic: 'Süreli Branş Rutini (2.5 Dk Sınırı)', dur: `${focusDur} dk`, q: 30, type: 'Soru' },
        { subj: 'AYT Fen', topic: 'Haftalık Zayıf Konu Soru Taraması', dur: `${focusDur} dk`, q: 35, type: 'Soru' },
        { subj: 'Rehberlik', topic: 'Deneme Öncesi Strateji & Turlama Provası', dur: '20 dk', q: 0, type: 'Strateji' }
      ]
    },
    {
      day: 'Cumartesi',
      badge: '🎯 Deneme Günü',
      isHighlight: true,
      tasks: [
        { subj: 'Deneme Sınavı', topic: `🎯 ${act3.substring(0, 42)}...`, dur: '165 dk', q: 120, type: 'Deneme' },
        { subj: 'Rehberlik', topic: 'Deneme Analizi & Yanlış Defterine Kayıt', dur: '45 dk', q: 0, type: 'Analiz' }
      ]
    },
    {
      day: 'Pazar',
      badge: 'Alan & Kapanış',
      tasks: [
        { subj: 'AYT Deneme', topic: 'AYT Branş Denemesi / Alan Testi', dur: `${focusDur * 2} dk`, q: 80, type: 'Deneme' },
        { subj: 'Koçluk', topic: 'Haftalık Koçluk Değerlendirmesi & Kapanış', dur: '30 dk', q: 0, type: 'Koçluk' }
      ]
    }
  ];
}

// ─── Ana Koçluk Raporu Modalı ──────────────────────────────────────────────────

function openCoachReportModal() {
  const studentId = window.activeStudent || 'kaan';
  const users = getUsers();
  const student = users[studentId] || { name: 'Öğrenci', branch: 'Sayısal' };
  const data = getStudentData(studentId);

  const modalBody = document.getElementById('coach-report-content');
  if (!modalBody) return;

  // 1. Öğrenci & Hedef Bilgileri
  const goalUni = data.personalGoal?.university || 'Belirlenmedi';
  const goalProf = data.personalGoal?.profession || '';
  const goalRank = data.personalGoal?.ranking ? `#${formatNumber(data.personalGoal.ranking)}` : '—';
  const branch = student.branch || 'Sayısal';
  const personality = student.personality || {};

  // 2. Son Deneme Bilgileri
  const mocks = (data.mockLog || []).sort((a,b) => b.date.localeCompare(a.date));
  const lastTytMock = mocks.find(m => m.type === 'TYT' || (m.results && m.results['TYT Türkçe'] !== undefined));
  const lastAytMock = mocks.find(m => m.type === 'AYT' || (m.results && m.results['AYT Matematik'] !== undefined));

  const tytNet = lastTytMock ? (lastTytMock.totalNet || 0).toFixed(1) : '—';
  const aytNet = lastAytMock ? (lastAytMock.totalNet || 0).toFixed(1) : '—';

  // 3. Son 7 Gün Soru Çözüm İstatistikleri
  const today = new Date();
  const weekDates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    weekDates.push(d.toISOString().split('T')[0]);
  }

  const recentDaily = (data.dailyLog || []).filter(d => weekDates.includes(d.date));
  const totalSolvedWeek = recentDaily.reduce((s, d) => s + (d.solved || 0), 0);
  const totalCorrectWeek = recentDaily.reduce((s, d) => s + (d.correct || 0), 0);
  const totalWrongWeek = recentDaily.reduce((s, d) => s + (d.wrong || 0), 0);
  const avgDaily = Math.round(totalSolvedWeek / 7);
  const accuracyRate = totalSolvedWeek > 0 ? Math.round((totalCorrectWeek / totalSolvedWeek) * 100) : 0;

  // 4. Haftalık Görev / Program Uyumu
  const recentSchedule = (data.schedule || []).filter(s => weekDates.includes(s.date));
  const allTasks = recentSchedule.flatMap(s => s.items || []);
  const completedTasks = allTasks.filter(t => t.done).length;
  const taskCompliance = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 100;

  // 5. Konu İlerleme Yüzdeleri
  let tytTotal = 0, tytDone = 0, aytTotal = 0, aytDone = 0;
  if (typeof YKS_TOPICS !== 'undefined') {
    if (YKS_TOPICS.TYT) {
      for (const sub in YKS_TOPICS.TYT) {
        YKS_TOPICS.TYT[sub].forEach(t => {
          tytTotal++;
          const st = data.topicStatus?.[`tyt_${sub}_${t}`];
          if (st === 'completed') tytDone++;
        });
      }
    }
    if (YKS_TOPICS.AYT) {
      for (const sub in YKS_TOPICS.AYT) {
        if (branch === 'Sayısal' && ['Edebiyat', 'Tarih (AYT)', 'Coğrafya (AYT)'].includes(sub)) continue;
        YKS_TOPICS.AYT[sub].forEach(t => {
          aytTotal++;
          const st = data.topicStatus?.[`ayt_${sub}_${t}`];
          if (st === 'completed') aytDone++;
        });
      }
    }
  }
  const tytPct = tytTotal > 0 ? Math.round((tytDone / tytTotal) * 100) : 0;
  const aytPct = aytTotal > 0 ? Math.round((aytDone / aytTotal) * 100) : 0;

  // 6. Yanlış Defteri Durumu
  const wrongList = data.wrongLog || [];
  const pendingWrongs = wrongList.filter(w => !w.reviewed);
  const reviewedWrongs = wrongList.filter(w => w.reviewed);

  const subjWrongMap = {};
  wrongList.forEach(w => {
    subjWrongMap[w.subject] = (subjWrongMap[w.subject] || 0) + 1;
  });
  const topWrongSubjs = Object.entries(subjWrongMap)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 3)
    .map(([s, c]) => `${s} (${c})`)
    .join(', ') || 'Kayıtlı açık yok';

  // 7. Eylem Planı (Haftalık 3 Ana Hedef / Action Items)
  const defaultActions = getMizacTailoredGoals(studentId);
  const actionItems = data.meetingActionItems && data.meetingActionItems.length ? data.meetingActionItems : defaultActions;

  // 7 Günlük Örnek Program Listesi
  const weeklyPlanDays = get7DayScheduleFromGoals(studentId, actionItems);

  // 8. Koç Notu
  const coachNote = data.coachWeeklyNote || (personality.discPrimary 
    ? `${student.name} için bu hafta ${personality.profileTag || 'analitik'} çalışma temposu ve soru hedefleri başarıyla yürütüldü. ${personality.learningStyle || 'Bireysel'} metotlarla net artışını desteklemeye devam edeceğiz.`
    : 'Bu hafta çalışma disiplini ve soru hedefleri gayet başarılı şekilde sürdürüldü. Yanlış defterindeki eksik konuların tekrarına odaklanarak net artışını hızlandıracağız.');

  const reportDateStr = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

  // DISC Rozet Rengi
  const discBadgeBg = studentId === 'kaan' ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)' : 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%)';
  const discBorder = studentId === 'kaan' ? '#10b981' : '#f59e0b';

  modalBody.innerHTML = `
    <div id="coach-report-print-area" class="report-paper">
      
      <!-- Üst Araç Çubuğu (Yazdırmada Gizli) -->
      <div class="report-toolbar no-print">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <button type="button" class="btn btn-sm btn-accent" onclick="copyDeepCoachingPrompt('${studentId}')" style="font-weight:800; background:linear-gradient(135deg, #a855f7, #ec4899); color:#fff; border:none; box-shadow:0 0 12px rgba(168,85,247,0.4);" title="Tüm veriler + DISC profilini içeren uzman promptunu kopyalar">
            🧠 AI Koçluk Promptunu Kopyala
          </button>
          <button type="button" class="btn btn-sm" onclick="togglePasteAIPanel('${studentId}')" style="background:rgba(168,85,247,0.2); color:#c084fc; border:1px solid rgba(168,85,247,0.4); font-weight:700;">
            ⚡ AI Yanıtını Rapora Aktar
          </button>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <button type="button" class="btn btn-sm btn-success" onclick="copyWhatsAppReportSummary()" style="background:#25D366; color:#fff; border:none; font-weight:700;" title="Veliye ve öğrenciye WhatsApp'tan göndermek için kopyala">
            📱 WhatsApp Özeti
          </button>
          <button type="button" class="btn btn-sm btn-primary" onclick="printCoachReport()" title="A4 Rapor Çıktısı Al">
            🖨️ PDF / Yazdır
          </button>
        </div>
      </div>

      <!-- Satır İçi AI Yapıştırma Paneli (Açılır Kapanır) -->
      <div id="inline-paste-ai-box" class="no-print" style="display:${_reportPasteAiOpen ? 'block' : 'none'}; background:rgba(168,85,247,0.1); border:1px solid rgba(168,85,247,0.4); border-radius:12px; padding:16px; margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <strong style="color:#c084fc; font-size:14px;">⚡ Gemini / ChatGPT Koçluk Yanıtını Yapıştırın:</strong>
          <button type="button" class="btn btn-sm" onclick="togglePasteAIPanel('${studentId}')" style="font-size:11px; padding:2px 8px;">✕ Kapat</button>
        </div>
        <p style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">
          Gemini'den gelen cevabı yapıştırın. Sistem <strong>hem değerlendirme notunu hem de 3 eylem hedefini</strong> otomatik olarak algılayıp rapora işleyecektir:
        </p>
        <textarea id="inline-paste-ai-textarea" class="form-input" rows="6" placeholder="Gemini veya ChatGPT'den kopyaladığınız metni buraya yapıştırın (Ctrl + V)..." style="width:100%; font-size:13px; line-height:1.5; background:rgba(0,0,0,0.4); border:1px solid rgba(168,85,247,0.3); border-radius:8px; padding:10px; color:#fff;"></textarea>
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px;">
          <button type="button" class="btn btn-sm btn-secondary" onclick="pasteFromClipboardInline()">📋 Panodan Yapıştır</button>
          <button type="button" class="btn btn-sm btn-accent" onclick="saveInlinePastedAIResponse('${studentId}')" style="font-weight:800; background:linear-gradient(135deg, #a855f7, #ec4899); color:#fff;">✨ Rapora & Hedeflere Otomatik İşle</button>
        </div>
      </div>

      <!-- Üst Antet / Başlık -->
      <div class="report-header-box">
        <div class="report-brand-col">
          <div class="report-logo">🎓 YKS KOÇUM & ROTA SİSTEMİ</div>
          <div class="report-coach-name">Süper Koç: <strong>Gökhan EKER</strong></div>
          <div class="report-date-badge">📅 Görüşme Tarihi: ${reportDateStr}</div>
        </div>
        <div class="report-student-col">
          <div class="report-student-name">${student.name}</div>
          <div class="report-student-branch">Alan: <strong>${branch}</strong> • OBP: <strong>${data.obp || 85}</strong></div>
          <div class="report-target-pill">
            🎯 Hedef: <strong>${goalUni} ${goalProf}</strong> ${goalRank !== '—' ? `(${goalRank})` : ''}
          </div>
        </div>
      </div>

      <!-- Mizaç & DISC Kişilik Profili Kartı -->
      ${personality.discPrimary ? `
      <div class="report-disc-box" style="background:${discBadgeBg}; border-left: 4px solid ${discBorder};">
        <div class="report-disc-header">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:20px;">🧩</span>
            <div>
              <strong style="color:var(--text); font-size:14px;">Bireysel Mizaç & Karakter Profili: ${personality.profileTag || ''}</strong>
              <div style="font-size:11.5px; color:var(--text-muted);">
                DISC: <strong style="color:#00F0FF;">${personality.discTypeNatural || personality.discPrimary}</strong> • 
                Uyarlanabilir: <strong style="color:#34d399;">${personality.discTypeAdapted || '—'}</strong> • 
                MBTI: <strong>${personality.mbti || 'ESTJ'}</strong> • 
                Değişim Stresi: <strong style="color:${personality.stressLevel?.includes('Yüksek') ? '#f87171' : '#34d399'};">${personality.stressLevel || 'Dengeli'}</strong>
              </div>
            </div>
          </div>
          <div class="report-disc-tag" style="border: 1px solid ${discBorder}; color:${discBorder};">
            ${personality.focusSpan || '45 Dk Odak'}
          </div>
        </div>
        <div class="report-disc-details">
          <div class="disc-col">
            <span class="disc-lbl">💡 Öğrenme Stili:</span>
            <span>${personality.learningStyle || 'Analitik & Görsel'}</span>
          </div>
          <div class="disc-col">
            <span class="disc-lbl">🛡️ Koçluk Stratejisi:</span>
            <span>${(personality.coachingRules && personality.coachingRules[0]) || 'Adım adım somut hedeflerle takip.'}</span>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- 4 Ana Canlı Kart Izgarası -->
      <div class="report-grid-4">
        
        <!-- Kart 1: Deneme Netleri -->
        <div class="report-card purple">
          <div class="report-card-title">📝 Son Deneme Performansı</div>
          <div class="report-card-row">
            <div>
              <div class="report-val" style="color:#a855f7;">${tytNet}</div>
              <div class="report-lbl">Son TYT Net</div>
            </div>
            <div>
              <div class="report-val" style="color:#00F5A0;">${aytNet}</div>
              <div class="report-lbl">Son AYT Net</div>
            </div>
          </div>
          <div class="report-footer-tag">Hedeflenen Sıralama Eğilimi: <strong>İyi Düzeyde</strong></div>
        </div>

        <!-- Kart 2: Haftalık Soru Çözümü -->
        <div class="report-card cyan">
          <div class="report-card-title">✏️ Bu Haftaki Soru Çözümü</div>
          <div class="report-card-row">
            <div>
              <div class="report-val" style="color:#00F0FF;">${formatNumber(totalSolvedWeek)}</div>
              <div class="report-lbl">Toplam Soru</div>
            </div>
            <div>
              <div class="report-val" style="color:#FFE600;">%${accuracyRate}</div>
              <div class="report-lbl">Doğruluk Oranı</div>
            </div>
          </div>
          <div class="report-footer-tag">Günlük Ortalama: <strong>${avgDaily} Soru/Gün</strong></div>
        </div>

        <!-- Kart 3: Program & Görev Uyumu -->
        <div class="report-card green">
          <div class="report-card-title">📅 Çalışma Programı Uyumu</div>
          <div class="report-card-row">
            <div>
              <div class="report-val" style="color:#10b981;">%${taskCompliance}</div>
              <div class="report-lbl">Görev Başarısı</div>
            </div>
            <div>
              <div class="report-val" style="color:#38bdf8;">${completedTasks}/${allTasks.length}</div>
              <div class="report-lbl">Biten Görev</div>
            </div>
          </div>
          <div class="report-footer-tag">Çalışma Disiplini: <strong>${taskCompliance >= 80 ? '🌟 Mükemmel' : '⚖️ Düzenli'}</strong></div>
        </div>

        <!-- Kart 4: Yanlış Analizi -->
        <div class="report-card red">
          <div class="report-card-title">❌ Yanlış & Eksik Takibi</div>
          <div class="report-card-row">
            <div>
              <div class="report-val" style="color:#f87171;">${pendingWrongs.length}</div>
              <div class="report-lbl">Tekrar Bekleyen</div>
            </div>
            <div>
              <div class="report-val" style="color:#34d399;">${reviewedWrongs.length}</div>
              <div class="report-lbl">Tekrar Edilen</div>
            </div>
          </div>
          <div class="report-footer-tag">Öncelikli Ders: <strong>${topWrongSubjs}</strong></div>
        </div>

      </div>

      <!-- Müfredat & Konu Bitirme İlerlemesi -->
      <div class="report-section-box">
        <div class="report-section-head">🗺️ YKS Konu & Müfredat Bitirme Durumu</div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div>
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px; font-weight:700;">
              <span>TYT Müfredatı (${tytDone}/${tytTotal} Konu)</span>
              <span style="color:#00F0FF;">%${tytPct}</span>
            </div>
            <div class="report-progress-bg">
              <div class="report-progress-bar" style="width:${tytPct}%; background:linear-gradient(90deg, #00F0FF, #00F5A0);"></div>
            </div>
          </div>
          <div>
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px; font-weight:700;">
              <span>AYT Müfredatı (${aytDone}/${aytTotal} Konu)</span>
              <span style="color:#a855f7;">%${aytPct}</span>
            </div>
            <div class="report-progress-bg">
              <div class="report-progress-bar" style="width:${aytPct}%; background:linear-gradient(90deg, #a855f7, #ec4899);"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Görüşme Tutanağı & Haftalık Eylem Planı (Action Items) -->
      <div class="report-section-box" style="border-left: 4px solid #00F0FF;">
        <div class="report-section-head" style="color:#00F0FF; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <span>🎯 Görüşme Tutanağı & Haftalık Eylem Planı (Öncelikli 3 Hedef)</span>
          <div class="no-print" style="display:flex; gap:6px;">
            <button type="button" class="btn btn-sm" onclick="autoGenerateMizacGoals('${studentId}')" style="font-size:11px; padding:3px 8px; background:rgba(0,240,255,0.12); color:#00F0FF; border:1px solid rgba(0,240,255,0.3); font-weight:700;" title="Öğrencinin mizaç ve sınav verilerine göre 3 hedefi otomatik doldurur">
              ✨ Mizaçtan Hedef Üret
            </button>
            <button type="button" class="btn btn-sm" onclick="toggleActionItemEditing('${studentId}')" style="font-size:11px; padding:3px 10px; background:rgba(255,255,255,0.08); color:#fff; border:1px solid rgba(255,255,255,0.2); font-weight:700;">
              ${_reportActionEditing ? '✕ İptal' : '✏️ Hedefleri Düzenle'}
            </button>
          </div>
        </div>

        ${_reportActionEditing ? `
          <div class="no-print" style="background:rgba(0,240,255,0.05); padding:12px; border-radius:8px; border:1px dashed rgba(0,240,255,0.3); margin-top:6px;">
            <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">Haftalık 3 ana hedefi yazıp kaydedin:</div>
            <input type="text" id="inline-action-1" class="form-input" style="margin-bottom:6px; font-size:12.5px;" value="${escapeHtml(actionItems[0]||'')}" placeholder="1. Hedef / Ödev...">
            <input type="text" id="inline-action-2" class="form-input" style="margin-bottom:6px; font-size:12.5px;" value="${escapeHtml(actionItems[1]||'')}" placeholder="2. Hedef / Ödev...">
            <input type="text" id="inline-action-3" class="form-input" style="margin-bottom:10px; font-size:12.5px;" value="${escapeHtml(actionItems[2]||'')}" placeholder="3. Hedef / Ödev...">
            <div style="display:flex; justify-content:flex-end; gap:8px;">
              <button type="button" class="btn btn-sm btn-primary" onclick="saveInlineActionItems('${studentId}')" style="font-weight:800; padding:4px 14px;">💾 Hedefleri Kaydet</button>
            </div>
          </div>
        ` : `
          <div id="action-items-display" class="report-action-list">
            ${actionItems.map((item, idx) => `
              <div class="report-action-row">
                <span class="action-num">${idx + 1}</span>
                <span class="action-text">${escapeHtml(item)}</span>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- 📅 Mizaç Odaklı Örnek Haftalık Çalışma Programı (7 Günlük Rota) -->
      <div class="report-section-box" style="border-left: 4px solid #10b981;">
        <div class="report-section-head" style="color:#10b981; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span>📅 Mizaç Odaklı Örnek Haftalık Çalışma Programı (7 Günlük Rota)</span>
            <span style="font-size:11px; padding:2px 8px; border-radius:10px; background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3); font-weight:700;">
              ${studentId === 'cagan' ? '35 Dk Blok' : '45-50 Dk Blok'}
            </span>
          </div>
          <div class="no-print" style="display:flex; gap:6px;">
            <button type="button" class="btn btn-sm" onclick="toggleScheduleInspection('${studentId}')" style="font-size:11.5px; padding:4px 12px; background:rgba(0,240,255,0.15); color:#00F0FF; border:1px solid rgba(0,240,255,0.4); font-weight:800;" title="Gün gün inceleyin, düzenleyin ve onaylayın">
              ${_reportInspectionOpen ? '✕ İncelemeyi Kapat' : '🔍 Gün Gün İncele & Onayla'}
            </button>
            <button type="button" class="btn btn-sm" onclick="generateScheduleFromGoals('${studentId}')" style="font-size:11.5px; padding:4px 12px; font-weight:800; background:linear-gradient(135deg, #10b981, #00F0FF); color:#000; border:none; box-shadow:0 0 12px rgba(16,185,129,0.4);" title="Programı doğrudan onaylayıp öğrencinin takvimine işler">
              ✅ Hızlı Onayla & Takvime Ekle
            </button>
          </div>
        </div>

        <!-- 7 Günlük Önizleme Kartları -->
        <div class="report-week-grid">
          ${weeklyPlanDays.map(d => `
            <div class="report-day-card" style="${d.isHighlight ? 'border-color:rgba(0,240,255,0.4); background:rgba(0,240,255,0.05);' : ''}">
              <div class="report-day-header" style="${d.isHighlight ? 'color:#00F0FF;' : ''}">
                <div>${d.day}</div>
                <div style="font-size:9.5px; color:var(--text-muted); font-weight:600;">${d.badge}</div>
              </div>
              <div class="report-day-tasks">
                ${d.tasks.map(t => `
                  <div class="report-task-mini">
                    <span class="report-task-subj">${escapeHtml(t.subj)}</span>
                    <span class="report-task-topic" title="${escapeHtml(t.topic)}">${escapeHtml(t.topic)}</span>
                    <div class="report-task-meta">
                      <span>⏱️ ${t.dur}</span>
                      <span>${t.q > 0 ? `✏️ ${t.q} S` : `📋 ${t.type}`}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Gün Gün Ayrıntılı İnceleme ve Düzenleme / Onaylama Paneli -->
        ${_reportInspectionOpen ? `
          <div class="report-inspection-box no-print">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px dashed rgba(16,185,129,0.3); padding-bottom:8px;">
              <div>
                <strong style="color:#10b981; font-size:14px;">🔍 Haftalık Programı İnceleyin, İstemediğiniz Görevleri Çıkarın veya Değiştirin:</strong>
                <div style="font-size:12px; color:var(--text-muted);">İşaretli olan görevler onaylandığında öğrencinin takvimine ve görevlendirme listesine işlenecektir.</div>
              </div>
              <button type="button" class="btn btn-sm" onclick="toggleScheduleInspection('${studentId}')" style="font-size:11px; padding:2px 8px;">✕ Kapat</button>
            </div>

            <form id="report-schedule-approval-form">
              ${weeklyPlanDays.map((d, dIdx) => `
                <div class="inspection-day-card">
                  <div class="inspection-day-head">
                    <span>🗓️ ${d.day} <span style="font-size:11px; color:var(--text-muted); font-weight:normal;">(${d.badge})</span></span>
                  </div>
                  <div class="inspection-tasks-list">
                    ${d.tasks.map((t, tIdx) => `
                      <div class="inspection-task-item">
                        <input type="checkbox" id="task_chk_${dIdx}_${tIdx}" name="task_include_${dIdx}_${tIdx}" checked style="width:18px; height:18px; cursor:pointer;" title="Bu görevi ekle/çıkar">
                        <input type="text" id="task_subj_${dIdx}_${tIdx}" class="form-input" style="font-size:12px; font-weight:700; padding:4px 8px;" value="${escapeHtml(t.subj)}">
                        <input type="text" id="task_topic_${dIdx}_${tIdx}" class="form-input" style="font-size:12px; padding:4px 8px;" value="${escapeHtml(t.topic)}" placeholder="Konu / Görev Notu...">
                        <div style="display:flex; align-items:center; gap:4px;">
                          <input type="number" id="task_dur_${dIdx}_${tIdx}" class="form-input" style="font-size:12px; padding:4px 6px; text-align:center; width:55px;" value="${parseInt(t.dur)||35}">
                          <span style="font-size:10px; color:var(--text-muted);">dk</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:4px;">
                          <input type="number" id="task_q_${dIdx}_${tIdx}" class="form-input" style="font-size:12px; padding:4px 6px; text-align:center; width:55px;" value="${t.q||0}">
                          <span style="font-size:10px; color:var(--text-muted);">Soru</span>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `).join('')}

              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; padding-top:12px; border-top:1px dashed rgba(16,185,129,0.3);">
                <span style="font-size:12.5px; color:#10b981; font-weight:700;">✨ Yalnızca onay verdiğiniz görevler takvime eklenecektir.</span>
                <div style="display:flex; gap:8px;">
                  <button type="button" class="btn btn-sm btn-secondary" onclick="toggleScheduleInspection('${studentId}')">✕ İptal</button>
                  <button type="button" class="btn btn-sm" onclick="saveApprovedScheduleFromInspection('${studentId}')" style="font-size:12.5px; padding:6px 18px; font-weight:800; background:linear-gradient(135deg, #10b981, #00F0FF); color:#000; border:none; box-shadow:0 0 14px rgba(16,185,129,0.4);">
                    ✅ Onayla ve Öğrencinin Takvimine Ekle
                  </button>
                </div>
              </div>
            </form>
          </div>
        ` : ''}

      </div>

      <!-- Koçun Haftalık Değerlendirmesi & Tavsiyeleri -->
      <div class="report-section-box" style="border-left: 4px solid #a855f7;">
        <div class="report-section-head" style="color:#a855f7; display:flex; justify-content:space-between; align-items:center;">
          <span>💬 Koçun Haftalık Değerlendirme & Pedagojik Strateji Notu</span>
          <button type="button" class="btn btn-sm no-print" onclick="togglePasteAIPanel('${studentId}')" style="font-size:11px; padding:3px 10px; background:rgba(168,85,247,0.15); color:#c084fc; border:1px solid rgba(168,85,247,0.4); font-weight:700;">
            ✏️ Notu Değiştir / AI Yanıtı Ekle
          </button>
        </div>
        <div id="coach-note-display" style="font-size:13px; line-height:1.6; color:var(--text); white-space:pre-wrap; font-style:italic;">"${coachNote}"</div>
      </div>

      <!-- Alt Bilgilendirme -->
      <div class="report-footer-brand">
        <span>YKS KOÇUM & ROTA • Gökhan EKER</span>
        <span>Başarı, doğru mizaç analizi ve her gün tekrarlanan küçük disiplinlerin toplamıdır.</span>
      </div>

    </div>
  `;

  openModal('coach-report-modal');
}

// ─── Satır İçi İşlemler ───────────────────────────────────────────────────────

function togglePasteAIPanel(studentId) {
  _reportPasteAiOpen = !_reportPasteAiOpen;
  openCoachReportModal();
}

function pasteFromClipboardInline() {
  if (navigator.clipboard && navigator.clipboard.readText) {
    navigator.clipboard.readText().then(text => {
      const textarea = document.getElementById('inline-paste-ai-textarea');
      if (textarea && text) {
        textarea.value = text;
        showToast('📋 Panodaki metin yapıştırıldı!', 'success');
      }
    }).catch(() => {
      showToast('Lütfen metni klavyeden Ctrl+V ile kutuya yapıştırın.', 'info');
    });
  } else {
    showToast('Lütfen metni klavyeden Ctrl+V ile kutuya yapıştırın.', 'info');
  }
}

function saveInlinePastedAIResponse(studentId) {
  const textarea = document.getElementById('inline-paste-ai-textarea');
  const text = textarea ? textarea.value.trim() : '';
  if (!text) {
    showToast('Lütfen yapıştırılacak bir metin girin.', 'error');
    return;
  }

  const data = getStudentData(studentId);
  data.coachWeeklyNote = text;

  // AI metninden 3 eylem hedefini otomatik ayıkla ve kaydet
  const parsedGoals = parseActionItemsFromAIText(text);
  if (parsedGoals && parsedGoals.length) {
    data.meetingActionItems = parsedGoals;
  }

  saveStudentData(studentId, data);

  _reportPasteAiOpen = false;
  showToast(parsedGoals ? '✨ AI Koçluk Değerlendirmesi ve 3 Ana Hedef Rapora Otomatik İşlendi!' : '✨ AI Koç Değerlendirmesi Rapora Başarıyla İşlendi!', 'success');
  openCoachReportModal();
}

function toggleActionItemEditing(studentId) {
  _reportActionEditing = !_reportActionEditing;
  openCoachReportModal();
}

function saveInlineActionItems(studentId) {
  const in1 = document.getElementById('inline-action-1');
  const in2 = document.getElementById('inline-action-2');
  const in3 = document.getElementById('inline-action-3');

  const items = [
    in1 ? in1.value.trim() : '',
    in2 ? in2.value.trim() : '',
    in3 ? in3.value.trim() : ''
  ].filter(Boolean);

  const data = getStudentData(studentId);
  data.meetingActionItems = items;
  saveStudentData(studentId, data);

  _reportActionEditing = false;
  showToast('🎯 Haftalık görüşme hedefleri güncellendi!', 'success');
  openCoachReportModal();
}

// ─── Derin AI Koçluk Promptu Üretici ──────────────────────────────────────────

function generateDeepCoachingPromptText(studentId) {
  const users = getUsers();
  const student = users[studentId] || { name: 'Öğrenci', branch: 'Sayısal' };
  const data = getStudentData(studentId);
  const p = student.personality || {};

  const goalUni = data.personalGoal?.university || 'Belirlenmedi';
  const goalProf = data.personalGoal?.profession || '';
  const goalRank = data.personalGoal?.ranking ? `#${data.personalGoal.ranking}` : 'Belirtilmedi';

  const mocks = (data.mockLog || []).sort((a,b) => b.date.localeCompare(a.date)).slice(0, 3);
  
  // Son 7 günün gerçek takvim tarihleri
  const today = new Date();
  const weekDates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    weekDates.push(d.toISOString().split('T')[0]);
  }
  const recentDaily = (data.dailyLog || []).filter(d => weekDates.includes(d.date));
  const totalSolved = recentDaily.reduce((s,d) => s + (d.solved||0), 0);
  const totalCorrect = recentDaily.reduce((s,d) => s + (d.correct||0), 0);
  const totalWrong = recentDaily.reduce((s,d) => s + (d.wrong||0), 0);
  const avgDaily = Math.round(totalSolved / 7);
  const acc = totalSolved > 0 ? Math.round((totalCorrect/totalSolved)*100) : 0;

  const wrongs = (data.wrongLog || []).filter(w => !w.reviewed).slice(0, 6);
  const wrongTopics = wrongs.map(w => `${w.subject}: ${w.topic}`).join(', ') || 'Belirtilmedi';

  const prompt = `Sen Türkiye'nin en deneyimli YKS Derece Koçusun. Aşağıdaki öğrenci verilerini ve DISC Kişilik & Davranış Envanter sonuçlarını pedagojik olarak analiz et.

════════════════════════════════════════════════════
ÖĞRENCİ PROFİLİ & TEST SONUÇLARI:
• Öğrenci: ${student.name} (${student.branch || 'Sayısal'})
• Hedef: ${goalUni} ${goalProf} (Hedef Sıralama: ${goalRank}, OBP: ${data.obp || 85})
• DISC Doğal Karakter: ${p.discTypeNatural || 'Ciddi (C)'}
• DISC Uyarlanabilir (Sınav/Baskı Anı): ${p.discTypeAdapted || 'Ciddi-Dominant'}
• DISC Skorları: ${JSON.stringify(p.discScores || {})}
• MBTI: ${p.mbti || 'ESTJ'}
• Değişim Stresi Düzeyi: ${p.stressLevel || 'Orta'} (Kritik: ${p.stressLevel?.includes('Yüksek') ? 'Ani değişikliklerden kaçın, net sabit plan ver' : 'Esnek stratejiye açık'})
• Belirgin Güçlü Yönleri: ${p.strengths || 'Analitik ve kuralcı'}
• Olası Sınav/Çalışma Riskleri: ${p.risks || 'Hata yapma korkusu, takılma'}
• Odak Süresi & Öğrenme Stili: ${p.focusSpan || '45 dk'} - ${p.learningStyle || 'Analitik'}

════════════════════════════════════════════════════
AKADEMİK & ÇALIŞMA VERİLERİ (SON DURUM):
• Son 7 Gün Çözülen Toplam Soru: ${totalSolved} adet (Doğruluk: %${acc})
• Son Denemeler: ${mocks.map(m => `${m.date} ${m.type || 'Deneme'}: ${m.totalNet || 0} Net`).join(' | ') || 'Kayıtlı deneme yok'}
• Yanlış Defterinde Tekrar Bekleyen Zayıf Konular: ${wrongTopics}

════════════════════════════════════════════════════
SENDEN İSTENEN YANIT (Lütfen profesyonel bir koç gibi şu başlıklarla yanıt ver):
1. 💬 MİZAÇ ODAKLI KOÇLUK DEĞERLENDİRMESİ (Öğrencinin DISC yapısına ve verilerine göre 2-3 güçlü paragraf)
2. 🎯 ÖNÜMÜZDEKİ HAFTA İÇİN 3 NET EYLEM PLANI / ÖDEVİ (Öğrencinin mizaç risklerini aşacak 3 somut hedef)
3. 📅 7 GÜNLÜK ÖRNEK ÇALIŞMA PROGRAMI (Pazartesi'den Pazar'a ${studentId === 'cagan' ? '35 dk Feynman blokları' : '45 dk odak blokları'} ile gün gün ders, soru sayısı ve konu dağılımı)
4. 🗣️ GÖRÜŞMEDE ÖĞRENCİYE SÖYLENMESİ GEREKEN KRİTİK KOÇLUK CÜMLESİ & MOTİVASYON TAKTİĞİ`;

  return prompt;
}

function copyDeepCoachingPrompt(studentId) {
  const promptText = generateDeepCoachingPromptText(studentId);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(promptText).then(() => {
      showToast('🧠 Uzman Koçluk Promptu Kopyalandı! Gemini veya ChatGPT\'ye yapıştırabilirsiniz.', 'success');
    }).catch(() => {
      showToast('Prompt panoya kopyalandı.', 'success');
    });
  } else {
    showToast('Prompt panoya kopyalandı.', 'success');
  }
}

function printCoachReport() {
  window.print();
}

function copyWhatsAppReportSummary() {
  const studentId = window.activeStudent || 'kaan';
  const users = getUsers();
  const student = users[studentId] || { name: 'Öğrenci' };
  const data = getStudentData(studentId);
  const p = student.personality || {};

  const goalUni = data.personalGoal?.university || '';
  const goalProf = data.personalGoal?.profession || '';
  const reportDateStr = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

  // Son 7 gün sorular
  const today = new Date();
  const weekDates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    weekDates.push(d.toISOString().split('T')[0]);
  }
  const recentDaily = (data.dailyLog || []).filter(d => weekDates.includes(d.date));
  const totalSolvedWeek = recentDaily.reduce((s, d) => s + (d.solved || 0), 0);
  const totalCorrectWeek = recentDaily.reduce((s, d) => s + (d.correct || 0), 0);
  const acc = totalSolvedWeek > 0 ? Math.round((totalCorrectWeek / totalSolvedWeek) * 100) : 0;

  const mocks = (data.mockLog || []).sort((a,b) => b.date.localeCompare(a.date));
  const lastTyt = mocks.find(m => m.type === 'TYT');
  const lastAyt = mocks.find(m => m.type === 'AYT');

  const coachNote = data.coachWeeklyNote || 'Bu hafta çalışma disiplini ve soru hedefleri gayet başarılı şekilde sürdürüldü.';
  const defaultActions = getMizacTailoredGoals(studentId);
  const actionItems = data.meetingActionItems && data.meetingActionItems.length ? data.meetingActionItems : defaultActions;

  const text = `🎓 *YKS KOÇUM — HAFTALIK GELİŞİM VE GÖRÜŞME RAPORU*
📅 *Tarih:* ${reportDateStr}
👤 *Öğrenci:* ${student.name} (${student.branch || 'Sayısal'})
🧩 *Mizaç & Karakter:* ${p.profileTag || 'Analitik'} (DISC: ${p.discTypeNatural || 'C'})
🎯 *Hedef:* ${goalUni} ${goalProf}
👨‍🏫 *Süper Koç:* Gökhan EKER

📊 *Haftalık Akademik Özet:*
• Çözülen Soru: ${formatNumber(totalSolvedWeek)} adet (Doğruluk: %${acc})
• Son TYT Neti: ${lastTyt ? (lastTyt.totalNet||0).toFixed(1) : '—'} Net
• Son AYT Neti: ${lastAyt ? (lastAyt.totalNet||0).toFixed(1) : '—'} Net
• Yanlış Defteri: ${(data.wrongLog||[]).filter(w=>!w.reviewed).length} bekleyen açık konu

🎯 *Görüşmede Kararlaştırılan Haftalık Eylem Planı:*
${actionItems.map((item, idx) => `${idx+1}. ${item}`).join('\n')}

💬 *Koçun Değerlendirmesi & Stratejisi:*
"${coachNote}"

_YKS Koçum Kişiselleştirilmiş Akıllı Sınav Koçluğu Platformu_`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('📋 WhatsApp rapor özeti panoya kopyalandı!', 'success');
    });
  } else {
    showToast('WhatsApp özeti hazırlandı!', 'success');
  }
}

// ─── Hedefleri Takvime / Görevlendirmeye Otomatik Aktar ────────────────────────

function generateScheduleFromGoals(studentId) {
  studentId = studentId || window.activeStudent || 'kaan';
  const data = getStudentData(studentId);
  const users = getUsers();
  const student = users[studentId] || { name: studentId === 'kaan' ? 'Kaan' : 'Çağan' };
  
  const defaultActions = getMizacTailoredGoals(studentId);
  const actionItems = data.meetingActionItems && data.meetingActionItems.length ? data.meetingActionItems : defaultActions;

  // Bu haftanın Pazartesi'sini bul
  const now = new Date();
  const dayOfWk = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWk === 0 ? 6 : dayOfWk - 1));

  const weekDays = [
    { name: 'Pazartesi', offset: 0 },
    { name: 'Salı', offset: 1 },
    { name: 'Çarşamba', offset: 2 },
    { name: 'Perşembe', offset: 3 },
    { name: 'Cuma', offset: 4 },
    { name: 'Cumartesi', offset: 5 },
    { name: 'Pazar', offset: 6 }
  ];

  const focusDur = studentId === 'cagan' ? 35 : 45; // Çağan 35 dk Feynman blokları, Kaan 45-50 dk odak blokları

  // 7 günlük plan şablonu (Rapordaki hedefler ve mizaç odağında)
  const templatePlan = [
    // Pazartesi
    [
      { subject: 'TYT Matematik', topic: `Rutin: ${actionItems[0] || 'Problem & Paragraf'}`, duration: focusDur, type: 'question', questions: studentId === 'cagan' ? 30 : 35, note: 'Süreli ve odaklı çözüm' },
      { subject: 'AYT Fizik', topic: `Konu Tekrarı: ${actionItems[1] || 'Zayıf Konu Çalışması'}`, duration: focusDur, type: 'study', questions: 25, note: 'Kavram haritası çıkararak' },
      { subject: 'Rehberlik / Koçluk', topic: 'Yanlış Defteri & Hata Analizi', duration: 25, type: 'review', questions: 0, note: 'Boş ve yanlışları kategorize et' }
    ],
    // Salı
    [
      { subject: 'TYT Türkçe', topic: 'Paragraf Rutini & Hızlı Okuma', duration: focusDur, type: 'question', questions: 25, note: 'Turlama taktiğiyle' },
      { subject: 'AYT Kimya', topic: `Soru Bankası: ${actionItems[1] || 'AYT Kimya Zayıf Konu'}`, duration: focusDur, type: 'question', questions: 30, note: 'Hata yapmaktan korkmadan, süreyle çöz' },
      { subject: 'TYT Matematik', topic: 'İlk 12 Konu Pekiştirme Testi', duration: focusDur, type: 'question', questions: 30, note: 'Zaman sınırı koyarak' }
    ],
    // Çarşamba
    [
      { subject: 'TYT Matematik', topic: `Rutin: ${actionItems[0] || 'Problem Rutini'}`, duration: focusDur, type: 'question', questions: studentId === 'cagan' ? 30 : 35, note: 'Tek oturuşta blok çalışma' },
      { subject: 'AYT Biyoloji', topic: 'Konu Özeti & Soru Taraması', duration: focusDur, type: 'study', questions: 30, note: 'Görsel şemalarla tekrar' },
      { subject: 'Rehberlik / Koçluk', topic: 'Yanlış Defterindeki Konuların Tekrarı', duration: 30, type: 'review', questions: 0, note: 'Yapılamayan soruları baştan çöz' }
    ],
    // Perşembe
    [
      { subject: 'TYT Geometri', topic: 'Üçgenler / Özel Teoremler Soru Çözümü', duration: focusDur, type: 'question', questions: 25, note: 'Şekil çizerek analiz' },
      { subject: 'AYT Matematik', topic: `Hedef Odak: ${actionItems[1] || 'AYT Matematik Fonksiyon/Polinom'}`, duration: focusDur, type: 'study', questions: 35, note: 'Derinleşme ve soru bankası' },
      { subject: 'AYT Fen', topic: 'Karma Branş Testi', duration: focusDur, type: 'question', questions: 30, note: 'Hız ve doğruluk dengesi' }
    ],
    // Cuma
    [
      { subject: 'TYT Matematik', topic: 'Süreli Branş Denemesi / Rutin', duration: focusDur, type: 'question', questions: 30, note: 'Takılınan soruyu geçme kuralı (2.5 dk)' },
      { subject: 'AYT Fen', topic: `Haftalık Tekrar: ${actionItems[1] || 'AYT Fen Zayıf Konu'}`, duration: focusDur, type: 'question', questions: 35, note: 'Haftanın tüm eksiklerini kapatma' },
      { subject: 'Rehberlik / Koçluk', topic: 'Hafta Sonu Denemesi Öncesi Strateji', duration: 20, type: 'review', questions: 0, note: 'Turlama taktiği zihinsel provası' }
    ],
    // Cumartesi
    [
      { subject: 'Deneme Sınavı', topic: `🎯 ${actionItems[2] || 'TYT Genel Denemesi (Turlama Taktiği)'}`, duration: 165, type: 'mock', questions: 120, note: 'Mizaç kuralı: İnatlaşma yok, 1. tur ve 2. tur yap' },
      { subject: 'Rehberlik / Koçluk', topic: 'Deneme Analizi & Yanlış Defterine Ekleme', duration: 45, type: 'review', questions: 0, note: 'Tüm yanlışların videosunu izle ve kaydet' }
    ],
    // Pazar
    [
      { subject: 'AYT Deneme / Alan Testi', topic: 'AYT Alan Branş Denemesi', duration: focusDur * 2, type: 'mock', questions: 80, note: 'Sakin ve odaklanmış modda' },
      { subject: 'Rehberlik / Koçluk', topic: 'Haftalık Koçluk Değerlendirmesi & Kapanış', duration: 30, type: 'review', questions: 0, note: 'Haftalık hedeflerin kontrolü ve kutlama' }
    ]
  ];

  if (!Array.isArray(data.schedule)) data.schedule = [];

  let addedTaskCount = 0;

  weekDays.forEach((dayInfo, dIdx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + dayInfo.offset);
    const dateStr = d.toISOString().split('T')[0];

    const dayTasks = templatePlan[dIdx] || [];
    let existingDay = data.schedule.find(s => s.date === dateStr);

    if (!existingDay) {
      existingDay = { id: (typeof generateId === 'function' ? generateId() : 'day_' + Date.now() + '_' + dIdx), date: dateStr, items: [] };
      data.schedule.push(existingDay);
    }
    if (!Array.isArray(existingDay.items)) {
      existingDay.items = existingDay.items && typeof existingDay.items === 'object' ? Object.values(existingDay.items) : [];
    }

    dayTasks.forEach(task => {
      const isAlreadyAdded = existingDay.items.some(i => i.topic === task.topic && i.subject === task.subject);
      if (!isAlreadyAdded) {
        existingDay.items.push({
          id: (typeof generateId === 'function' ? generateId() : 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
          subject: task.subject,
          topic: task.topic,
          duration: task.duration,
          type: task.type,
          done: false,
          questions: task.questions || 0,
          note: task.note || ''
        });
        addedTaskCount++;
      }
    });
  });

  data.hasNewTasks = true;
  saveStudentData(studentId, data);

  if (typeof closeModal === 'function') closeModal('coach-report-modal');

  showToast(`🎯 Rapordaki 3 ana hedef ${student.name}'in haftalık çalışma programına başarıyla işlendi! (${addedTaskCount} yeni görev tanımlandı)`, 'success');

  // Çalışma Programı sekmesine geç
  if (typeof switchTab === 'function') {
    switchTab('schedule');
  }
}

function toggleScheduleInspection(studentId) {
  _reportInspectionOpen = !_reportInspectionOpen;
  openCoachReportModal();
}

function saveApprovedScheduleFromInspection(studentId) {
  studentId = studentId || window.activeStudent || 'kaan';
  const data = getStudentData(studentId);
  const users = getUsers();
  const student = users[studentId] || { name: studentId === 'kaan' ? 'Kaan' : 'Çağan' };

  // Bu haftanın Pazartesi'sini bul
  const now = new Date();
  const dayOfWk = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWk === 0 ? 6 : dayOfWk - 1));

  if (!Array.isArray(data.schedule)) data.schedule = [];

  let addedTaskCount = 0;

  for (let dIdx = 0; dIdx < 7; dIdx++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + dIdx);
    const dateStr = d.toISOString().split('T')[0];

    let existingDay = data.schedule.find(s => s.date === dateStr);
    if (!existingDay) {
      existingDay = { id: (typeof generateId === 'function' ? generateId() : 'day_' + Date.now() + '_' + dIdx), date: dateStr, items: [] };
      data.schedule.push(existingDay);
    }
    if (!Array.isArray(existingDay.items)) {
      existingDay.items = existingDay.items && typeof existingDay.items === 'object' ? Object.values(existingDay.items) : [];
    }

    // Formdan gelen görevleri tara
    for (let tIdx = 0; tIdx < 10; tIdx++) {
      const chk = document.getElementById(`task_chk_${dIdx}_${tIdx}`);
      if (!chk) continue;
      if (chk.checked) {
        const subjEl = document.getElementById(`task_subj_${dIdx}_${tIdx}`);
        const topicEl = document.getElementById(`task_topic_${dIdx}_${tIdx}`);
        const durEl = document.getElementById(`task_dur_${dIdx}_${tIdx}`);
        const qEl = document.getElementById(`task_q_${dIdx}_${tIdx}`);

        const subj = subjEl ? subjEl.value.trim() : 'Genel';
        const topic = topicEl ? topicEl.value.trim() : 'Çalışma';
        const dur = durEl ? (parseInt(durEl.value) || 35) : 35;
        const q = qEl ? (parseInt(qEl.value) || 0) : 0;

        const isAlreadyAdded = existingDay.items.some(i => i.topic === topic && i.subject === subj);
        if (!isAlreadyAdded) {
          existingDay.items.push({
            id: (typeof generateId === 'function' ? generateId() : 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
            subject: subj,
            topic: topic,
            duration: dur,
            type: q > 0 ? 'question' : (subj.includes('Deneme') ? 'mock' : 'study'),
            done: false,
            questions: q,
            note: 'Koç Onaylı Haftalık Program'
          });
          addedTaskCount++;
        }
      }
    }
  }

  data.hasNewTasks = true;
  saveStudentData(studentId, data);

  _reportInspectionOpen = false;
  if (typeof closeModal === 'function') closeModal('coach-report-modal');

  showToast(`✅ İncelediğiniz ve onayladığınız ${addedTaskCount} görev ${student.name}'in takvimine başarıyla eklendi!`, 'success');

  if (typeof switchTab === 'function') {
    switchTab('schedule');
  }
}

window.openCoachReportModal           = openCoachReportModal;
window.generateDeepCoachingPromptText = generateDeepCoachingPromptText;
window.copyDeepCoachingPrompt         = copyDeepCoachingPrompt;
window.togglePasteAIPanel             = togglePasteAIPanel;
window.pasteFromClipboardInline       = pasteFromClipboardInline;
window.saveInlinePastedAIResponse     = saveInlinePastedAIResponse;
window.toggleActionItemEditing        = toggleActionItemEditing;
window.saveInlineActionItems          = saveInlineActionItems;
window.autoGenerateMizacGoals         = autoGenerateMizacGoals;
window.printCoachReport              = printCoachReport;
window.copyWhatsAppReportSummary     = copyWhatsAppReportSummary;
window.generateScheduleFromGoals      = generateScheduleFromGoals;
window.toggleScheduleInspection       = toggleScheduleInspection;
window.saveApprovedScheduleFromInspection = saveApprovedScheduleFromInspection;

