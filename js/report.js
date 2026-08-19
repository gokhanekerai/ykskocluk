/**
 * report.js — Canlı Renkli Koçluk Raporu & PDF Çıktısı Modülü
 * Öğrenci ve veli için tek bakışta haftalık/aylık gelişim karnesi
 */

function openCoachReportModal() {
  const studentId = window.activeStudent;
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

  // En çok yanlış yapılan dersler
  const subjWrongMap = {};
  wrongList.forEach(w => {
    subjWrongMap[w.subject] = (subjWrongMap[w.subject] || 0) + 1;
  });
  const topWrongSubjs = Object.entries(subjWrongMap)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 3)
    .map(([s, c]) => `${s} (${c})`)
    .join(', ') || 'Kayıtlı hata yok';

  // 7. Koç Notu
  const coachNote = data.coachWeeklyNote || 'Bu hafta çalışma disiplini ve soru hedefleri gayet başarılı şekilde sürdürüldü. Yanlış defterindeki eksik konuların tekrarına odaklanarak net artışını hızlandıracağız.';

  const reportDateStr = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

  modalBody.innerHTML = `
    <div id="coach-report-print-area" class="report-paper">
      
      <!-- Üst Antet / Başlık -->
      <div class="report-header-box">
        <div class="report-brand-col">
          <div class="report-logo">🎓 YKS KOÇUM</div>
          <div class="report-coach-name">Koç: <strong>Gökhan EKER</strong></div>
          <div class="report-date-badge">📅 Rapor Tarihi: ${reportDateStr}</div>
        </div>
        <div class="report-student-col">
          <div class="report-student-name">${student.name}</div>
          <div class="report-student-branch">Alan: <strong>${branch}</strong> • OBP: <strong>${data.obp || 85}</strong></div>
          <div class="report-target-pill">
            🎯 Hedef: <strong>${goalUni} ${goalProf}</strong> ${goalRank !== '—' ? `(${goalRank})` : ''}
          </div>
        </div>
      </div>

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
          <div class="report-footer-tag">Hedeflenen Koridora Yakınlık: <strong>İyi Düzeyde</strong></div>
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
          <div class="report-footer-tag">Odak Alan: <strong>${topWrongSubjs}</strong></div>
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

      <!-- Koçun Haftalık Değerlendirmesi & Tavsiyeleri -->
      <div class="report-section-box" style="border-left: 4px solid #a855f7;">
        <div class="report-section-head" style="color:#a855f7; display:flex; justify-content:space-between; align-items:center;">
          <span>💬 Koçun Haftalık Değerlendirme & Strateji Notu</span>
          <button class="btn btn-sm no-print" onclick="editCoachNote('${studentId}')" style="font-size:11px; padding:2px 8px;">✏️ Notu Düzenle</button>
        </div>
        <div id="coach-note-display" style="font-size:13px; line-height:1.6; color:var(--text); white-space:pre-wrap; font-style:italic;">"${coachNote}"</div>
      </div>

      <!-- Alt Bilgilendirme -->
      <div class="report-footer-brand">
        <span>YKS Koçum • Kişisel Sınav Koçluğu Platformu</span>
        <span>Başarı, her gün tekrarlanan küçük disiplinlerin toplamıdır.</span>
      </div>

    </div>
  `;

  openModal('coach-report-modal');
}

function editCoachNote(studentId) {
  const data = getStudentData(studentId);
  const currentNote = data.coachWeeklyNote || 'Bu hafta çalışma disiplini ve soru hedefleri gayet başarılı şekilde sürdürüldü. Yanlış defterindeki eksik konuların tekrarına odaklanarak net artışını hızlandıracağız.';
  const newNote = prompt('Öğrenci ve Veli için Haftalık Koçluk Notu:', currentNote);
  if (newNote !== null) {
    data.coachWeeklyNote = newNote.trim();
    saveStudentData(studentId, data);
    const noteEl = document.getElementById('coach-note-display');
    if (noteEl) noteEl.textContent = `"${data.coachWeeklyNote}"`;
    showToast('Koç notu güncellendi!', 'success');
  }
}

function printCoachReport() {
  window.print();
}

function copyWhatsAppReportSummary() {
  const studentId = window.activeStudent;
  const users = getUsers();
  const student = users[studentId] || { name: 'Öğrenci' };
  const data = getStudentData(studentId);

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

  const text = `🎓 *YKS KOÇUM — HAFTALIK ÖĞRENCİ GELİŞİM RAPORU*
📅 *Tarih:* ${reportDateStr}
👤 *Öğrenci:* ${student.name} (${student.branch || 'Sayısal'})
🎯 *Hedef:* ${goalUni} ${goalProf}
👨‍🏫 *Koç:* Gökhan EKER

📊 *Haftalık Özet:*
• Çözülen Soru: ${formatNumber(totalSolvedWeek)} adet (Doğruluk: %${acc})
• Son TYT Neti: ${lastTyt ? (lastTyt.totalNet||0).toFixed(1) : '—'} Net
• Son AYT Neti: ${lastAyt ? (lastAyt.totalNet||0).toFixed(1) : '—'} Net
• Yanlış Defteri: ${(data.wrongLog||[]).filter(w=>!w.reviewed).length} bekleyen tekrar konusu

💬 *Koçun Değerlendirmesi:*
"${coachNote}"

_YKS Koçum Kişisel Başarı Sistemi_`;

  navigator.clipboard.writeText(text).then(() => {
    showToast('📋 WhatsApp rapor özeti panoya kopyalandı!', 'success');
  }).catch(() => {
    prompt('Rapor metnini kopyalayabilirsiniz:', text);
  });
}

window.openCoachReportModal        = openCoachReportModal;
window.editCoachNote              = editCoachNote;
window.printCoachReport           = printCoachReport;
window.copyWhatsAppReportSummary  = copyWhatsAppReportSummary;
