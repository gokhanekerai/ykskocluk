/**
 * exams.js — Deneme Sonuçları Girişi ve Puan Hesaplama
 */

// TYT Puan hesaplama sabitleri (ÖSYM standart)
const TYT_COEFFICIENTS = {
  Türkçe:    3.30,
  Matematik: 3.30,
  Fen:       3.40,
  Sosyal:    3.40
};
const TYT_BASE = 100;

// AYT SAY katsayıları
const AYT_SAY = { Matematik: 3.00, Fizik: 2.857, Kimya: 3.077, Biyoloji: 3.077 };
// AYT EA
const AYT_EA  = { Matematik: 3.00, Edebiyat: 3.00, Tarih: 2.80, Coğrafya: 3.333 };
// AYT SÖZ
const AYT_SOZ = { Edebiyat: 3.00, Tarih1: 2.80, Coğrafya1: 3.333, Felsefe: 3.333, Tarih2: 3.636, Coğrafya2: 3.636, Din: 3.333 };

let examLatestChartTYT = null;
let examTrendChartTYT = null;
let examLatestChartAYT = null;
let examTrendChartAYT = null;
let editingExamId = null;

function renderExams() {
  if (!window.activeStudent) {
    _renderExamTable([]);
    _renderExamCharts([]);
    return;
  }
  const data = getStudentData(window.activeStudent);
  _renderExamTable(data.mockLog);
  _renderExamCharts(data.mockLog);
  renderExamDetailedAnalysis();
  updateMockFormFields();
}

function _renderExamTable(mockLog) {
  const tbody = document.getElementById('exam-table-body');
  if (!tbody) return;

  if (!mockLog || mockLog.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">Henüz deneme eklenmedi.</td></tr>';
    return;
  }

  const sorted = [...mockLog].sort((a,b) => b.date.localeCompare(a.date));

  tbody.innerHTML = sorted.map(m => {
    const scores = m.scores || {};
    return `
      <tr>
        <td>${formatDate(m.date)}</td>
        <td><span class="badge ${m.type === 'TYT' ? 'badge-tyt' : 'badge-ayt'}">${m.type}</span></td>
        <td>${m.name || '—'}</td>
        <td class="net-cell">${Number(m.totalNet || 0).toFixed(2)}</td>
        <td>${scores.TYT ?? scores.SAY ?? '—'}</td>
        <td>${scores.SAY ?? scores.EA ?? '—'}</td>
        <td>${scores.SOZ ?? '—'}</td>
        <td>
          <button class="btn-sm btn-accent" onclick="editExam('${m.id}')" style="margin-right:4px;">✏️</button>
          <button class="btn-sm btn-danger coach-only" onclick="deleteExam('${m.id}')">🗑️</button>
        </td>
      </tr>`;
  }).join('');
}

function updateMockFormFields() {
  const type = document.getElementById('exam-type')?.value || 'TYT';
  const tytFields = document.getElementById('tyt-fields');
  const aytFields = document.getElementById('ayt-fields');

  if (tytFields) tytFields.style.display = type === 'TYT' ? '' : 'none';
  if (aytFields) aytFields.style.display = type !== 'TYT' ? '' : 'none';
  calcExamBlanks();
}

function calcExamBlanks() {
  const type = document.getElementById('exam-type')?.value || 'TYT';

  if (type === 'TYT') {
    _calcSingleSubjectBlank('tyt-turkce-c', 'tyt-turkce-w', 'tyt-turkce-b', 40);
    _calcSingleSubjectBlank('tyt-mat-c',    'tyt-mat-w',    'tyt-mat-b',    40);
    _calcSingleSubjectBlank('tyt-fen-c',    'tyt-fen-w',    'tyt-fen-b',    20);
    _calcSingleSubjectBlank('tyt-sosyal-c', 'tyt-sosyal-w', 'tyt-sosyal-b', 20);
  } else {
    const branch = document.getElementById('exam-branch')?.value || 'SAY';
    const ids = {
      SAY: [['ayt-mat-c','ayt-mat-w','ayt-mat-b',40],['ayt-fiz-c','ayt-fiz-w','ayt-fiz-b',14],['ayt-kim-c','ayt-kim-w','ayt-kim-b',13],['ayt-bio-c','ayt-bio-w','ayt-bio-b',13]],
      EA:  [['ayt-mat-c','ayt-mat-w','ayt-mat-b',40],['ayt-tur-c','ayt-tur-w','ayt-tur-b',24],['ayt-tar-c','ayt-tar-w','ayt-tar-b',10],['ayt-cog-c','ayt-cog-w','ayt-cog-b',6]],
      SOZ: [['ayt-tur-c','ayt-tur-w','ayt-tur-b',24],['ayt-tar1-c','ayt-tar1-w','ayt-tar1-b',10],['ayt-cog1-c','ayt-cog1-w','ayt-cog1-b',6],['ayt-fel-c','ayt-fel-w','ayt-fel-b',12],['ayt-tar2-c','ayt-tar2-w','ayt-tar2-b',11],['ayt-cog2-c','ayt-cog2-w','ayt-cog2-b',11],['ayt-din-c','ayt-din-w','ayt-din-b',6]]
    };

    (ids[branch] || []).forEach(([cId, wId, bId, maxQ]) => {
      _calcSingleSubjectBlank(cId, wId, bId, maxQ);
    });
  }
}

function _calcSingleSubjectBlank(cId, wId, bId, maxQ) {
  const cEl = document.getElementById(cId);
  const wEl = document.getElementById(wId);
  const bEl = document.getElementById(bId);

  if (!cEl || !wEl || !bEl) return;

  const cVal = cEl.value;
  const wVal = wEl.value;

  if (cVal === '' && wVal === '') {
    return;
  }

  const c = parseFloat(cVal) || 0;
  const w = parseFloat(wVal) || 0;
  const b = Math.max(0, maxQ - c - w);
  bEl.value = b;
}

document.addEventListener('input', (e) => {
  if (e.target && e.target.closest('#add-exam-modal')) {
    if (e.target.id && (e.target.id.endsWith('-c') || e.target.id.endsWith('-w'))) {
      calcExamBlanks();
    }
  }
});

function handleAddExam(e) {
  if (e) e.preventDefault();

  const type = document.getElementById('exam-type')?.value || 'TYT';
  const name = document.getElementById('exam-name')?.value.trim() || `${type} Denemesi`;
  const date = document.getElementById('exam-date')?.value || getTodayStr();

  let nets = {};
  let details = {};
  let totalNet = 0;
  let scores = {};

  if (type === 'TYT') {
    details = {
      Türkçe:    _getDYB('tyt-turkce-c', 'tyt-turkce-w', 'tyt-turkce-b', 40),
      Matematik: _getDYB('tyt-mat-c',    'tyt-mat-w',    'tyt-mat-b',    40),
      Fen:       _getDYB('tyt-fen-c',    'tyt-fen-w',    'tyt-fen-b',    20),
      Sosyal:    _getDYB('tyt-sosyal-c', 'tyt-sosyal-w', 'tyt-sosyal-b', 20),
    };
    nets = {
      Türkçe:    parseFloat(Math.max(0, details.Türkçe.c - details.Türkçe.w / 4).toFixed(2)),
      Matematik: parseFloat(Math.max(0, details.Matematik.c - details.Matematik.w / 4).toFixed(2)),
      Fen:       parseFloat(Math.max(0, details.Fen.c - details.Fen.w / 4).toFixed(2)),
      Sosyal:    parseFloat(Math.max(0, details.Sosyal.c - details.Sosyal.w / 4).toFixed(2)),
    };
    totalNet = Object.values(nets).reduce((s,n) => s + n, 0);
    scores.TYT = _calcTYTScore(nets);
  } else {
    const branch = document.getElementById('exam-branch')?.value || 'SAY';
    const aytData = _getAYTDetailsAndNets(branch);
    details = aytData.details;
    nets = aytData.nets;
    totalNet = Object.values(nets).reduce((s,n) => s + n, 0);
    scores[branch] = _calcAYTScore(branch, nets);
  }

  const data = getStudentData(window.activeStudent);

  if (editingExamId) {
    const idx = data.mockLog.findIndex(m => m.id === editingExamId);
    if (idx !== -1) {
      data.mockLog[idx] = {
        ...data.mockLog[idx],
        date, type, name,
        nets, details, totalNet: parseFloat(totalNet.toFixed(2)),
        scores
      };
      saveStudentData(window.activeStudent, data);
      showToast('Deneme güncellendi!', 'success');
    }
    editingExamId = null;
  } else {
    const entry = {
      id: generateId(),
      date, type, name,
      nets, details, totalNet: parseFloat(totalNet.toFixed(2)),
      scores
    };
    data.mockLog.push(entry);
    saveStudentData(window.activeStudent, data);
    showToast('Deneme kaydedildi!', 'success');
  }

  closeModal('add-exam-modal');
  _clearExamForm();
  renderExams();
  renderDashboard();
}

function _getDYB(cId, wId, bId, maxQ) {
  const c = parseFloat(document.getElementById(cId)?.value) || 0;
  const w = parseFloat(document.getElementById(wId)?.value) || 0;
  let bInput = parseFloat(document.getElementById(bId)?.value);
  let b = isNaN(bInput) ? Math.max(0, maxQ - c - w) : bInput;
  return { c, w, b };
}

function _getNet(correctId, wrongId) {
  const c = parseFloat(document.getElementById(correctId)?.value) || 0;
  const w = parseFloat(document.getElementById(wrongId)?.value)   || 0;
  return parseFloat(Math.max(0, c - w / 4).toFixed(2));
}

function _getAYTNets(branch) {
  return _getAYTDetailsAndNets(branch).nets;
}

function _getAYTDetailsAndNets(branch) {
  const nets = {};
  const details = {};
  const ids = {
    SAY: [['ayt-mat-c','ayt-mat-w','ayt-mat-b','Matematik',40],['ayt-fiz-c','ayt-fiz-w','ayt-fiz-b','Fizik',14],['ayt-kim-c','ayt-kim-w','ayt-kim-b','Kimya',13],['ayt-bio-c','ayt-bio-w','ayt-bio-b','Biyoloji',13]],
    EA:  [['ayt-mat-c','ayt-mat-w','ayt-mat-b','Matematik',40],['ayt-tur-c','ayt-tur-w','ayt-tur-b','Edebiyat',24],['ayt-tar-c','ayt-tar-w','ayt-tar-b','Tarih',10],['ayt-cog-c','ayt-cog-w','ayt-cog-b','Coğrafya',6]],
    SOZ: [['ayt-tur-c','ayt-tur-w','ayt-tur-b','Edebiyat',24],['ayt-tar1-c','ayt-tar1-w','ayt-tar1-b','Tarih',10],['ayt-cog1-c','ayt-cog1-w','ayt-cog1-b','Coğrafya',6],['ayt-fel-c','ayt-fel-w','ayt-fel-b','Felsefe',12],['ayt-tar2-c','ayt-tar2-w','ayt-tar2-b','Tarih2',11],['ayt-cog2-c','ayt-cog2-w','ayt-cog2-b','Coğrafya2',11],['ayt-din-c','ayt-din-w','ayt-din-b','Din',6]]
  };
  (ids[branch] || []).forEach(([cId, wId, bId, label, maxQ]) => { 
    const dyb = _getDYB(cId, wId, bId, maxQ);
    details[label] = dyb;
    nets[label] = parseFloat(Math.max(0, dyb.c - dyb.w / 4).toFixed(2));
  });
  return { details, nets };
}

function _calcTYTScore(nets) {
  let raw = TYT_BASE;
  Object.entries(nets).forEach(([k,n]) => { raw += n * (TYT_COEFFICIENTS[k] || 1); });
  return parseFloat(raw.toFixed(3));
}

function _calcAYTScore(branch, nets) {
  const coeff = branch === 'SAY' ? AYT_SAY : branch === 'EA' ? AYT_EA : AYT_SOZ;
  let raw = 100;
  Object.entries(nets).forEach(([k,n]) => { raw += n * (coeff[k] || 2.5); });
  return parseFloat(raw.toFixed(3));
}

function deleteExam(id) {
  const data = getStudentData(window.activeStudent);
  data.mockLog = data.mockLog.filter(m => m.id !== id);
  saveStudentData(window.activeStudent, data);
  renderExams();
  renderDashboard();
  showToast('Deneme silindi.', 'info');
}

function editExam(id) {
  const data = getStudentData(window.activeStudent);
  const exam = (data.mockLog || []).find(m => m.id === id);
  if (!exam) return;

  editingExamId = id;
  const titleEl = document.getElementById('exam-modal-title');
  if (titleEl) titleEl.textContent = '📝 Deneme Düzenle';

  const typeEl = document.getElementById('exam-type');
  const dateEl = document.getElementById('exam-date');
  const nameEl = document.getElementById('exam-name');

  if (typeEl) typeEl.value = exam.type || 'TYT';
  if (dateEl) dateEl.value = exam.date || getTodayStr();
  if (nameEl) nameEl.value = exam.name || '';

  updateMockFormFields();

  if (exam.type === 'TYT') {
    _populateDYB('tyt-turkce-c', 'tyt-turkce-w', 'tyt-turkce-b', exam, 'Türkçe', 40);
    _populateDYB('tyt-mat-c',    'tyt-mat-w',    'tyt-mat-b',    exam, 'Matematik', 40);
    _populateDYB('tyt-fen-c',    'tyt-fen-w',    'tyt-fen-b',    exam, 'Fen', 20);
    _populateDYB('tyt-sosyal-c', 'tyt-sosyal-w', 'tyt-sosyal-b', exam, 'Sosyal', 20);
  } else {
    const branch = exam.branch || (exam.scores && exam.scores.SAY ? 'SAY' : exam.scores && exam.scores.EA ? 'EA' : 'SOZ');
    const branchEl = document.getElementById('exam-branch');
    if (branchEl) branchEl.value = branch;
    updateAYTLabels();

    const ids = {
      SAY: [['ayt-mat-c','ayt-mat-w','ayt-mat-b','Matematik',40],['ayt-fiz-c','ayt-fiz-w','ayt-fiz-b','Fizik',14],['ayt-kim-c','ayt-kim-w','ayt-kim-b','Kimya',13],['ayt-bio-c','ayt-bio-w','ayt-bio-b','Biyoloji',13]],
      EA:  [['ayt-mat-c','ayt-mat-w','ayt-mat-b','Matematik',40],['ayt-tur-c','ayt-tur-w','ayt-tur-b','Edebiyat',24],['ayt-tar-c','ayt-tar-w','ayt-tar-b','Tarih',10],['ayt-cog-c','ayt-cog-w','ayt-cog-b','Coğrafya',6]],
      SOZ: [['ayt-tur-c','ayt-tur-w','ayt-tur-b','Edebiyat',24],['ayt-tar1-c','ayt-tar1-w','ayt-tar1-b','Tarih1',10],['ayt-cog1-c','ayt-cog1-w','ayt-cog1-b','Coğrafya1',6],['ayt-fel-c','ayt-fel-w','ayt-fel-b','Felsefe',12],['ayt-tar2-c','ayt-tar2-w','ayt-tar2-b','Tarih2',11],['ayt-cog2-c','ayt-cog2-w','ayt-cog2-b','Din',6]]
    };

    (ids[branch] || []).forEach(([cId, wId, bId, label, maxQ]) => {
      _populateDYB(cId, wId, bId, exam, label, maxQ);
    });
  }

  openModal('add-exam-modal');
}

function _populateDYB(cId, wId, bId, exam, subj, maxQ) {
  const cEl = document.getElementById(cId);
  const wEl = document.getElementById(wId);
  const bEl = document.getElementById(bId);

  if (exam.details && exam.details[subj]) {
    if (cEl) cEl.value = exam.details[subj].c ?? '';
    if (wEl) wEl.value = exam.details[subj].w ?? '';
    if (bEl) bEl.value = exam.details[subj].b ?? '';
  } else if (exam.nets && exam.nets[subj] !== undefined) {
    const net = Math.max(0, exam.nets[subj]);
    if (cEl) cEl.value = Math.ceil(net);
    if (wEl) wEl.value = 0;
    if (bEl) bEl.value = Math.max(0, maxQ - Math.ceil(net));
  } else {
    if (cEl) cEl.value = '';
    if (wEl) wEl.value = '';
    if (bEl) bEl.value = '';
  }
}

function _clearExamForm() {
  editingExamId = null;
  const titleEl = document.getElementById('exam-modal-title');
  if (titleEl) titleEl.textContent = '📝 Deneme Ekle';
  ['exam-name','exam-date'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  document.querySelectorAll('#add-exam-modal input[type="number"]').forEach(el => el.value = '');
}

function updateAYTLabels() {
  const branch = document.getElementById('exam-branch')?.value || 'SAY';
  const l = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  if (branch === 'SAY') {
    l('lbl-ayt-mat-c', 'Matematik D'); l('lbl-ayt-mat-w', 'Matematik Y'); l('lbl-ayt-mat-b', 'Matematik B');
    l('lbl-ayt-fiz-c', 'Fizik D');     l('lbl-ayt-fiz-w', 'Fizik Y');     l('lbl-ayt-fiz-b', 'Fizik B');
    l('lbl-ayt-kim-c', 'Kimya D');     l('lbl-ayt-kim-w', 'Kimya Y');     l('lbl-ayt-kim-b', 'Kimya B');
    l('lbl-ayt-bio-c', 'Biyoloji D');  l('lbl-ayt-bio-w', 'Biyoloji Y');  l('lbl-ayt-bio-b', 'Biyoloji B');
  } else if (branch === 'EA') {
    l('lbl-ayt-mat-c', 'Matematik D'); l('lbl-ayt-mat-w', 'Matematik Y'); l('lbl-ayt-mat-b', 'Matematik B');
    l('lbl-ayt-fiz-c', 'Edebiyat D');  l('lbl-ayt-fiz-w', 'Edebiyat Y');  l('lbl-ayt-fiz-b', 'Edebiyat B');
    l('lbl-ayt-kim-c', 'Tarih-1 D');   l('lbl-ayt-kim-w', 'Tarih-1 Y');   l('lbl-ayt-kim-b', 'Tarih-1 B');
    l('lbl-ayt-bio-c', 'Coğrafya-1 D');l('lbl-ayt-bio-w', 'Coğrafya-1 Y');l('lbl-ayt-bio-b', 'Coğrafya-1 B');
  } else if (branch === 'SOZ') {
    l('lbl-ayt-mat-c', 'Edebiyat D');  l('lbl-ayt-mat-w', 'Edebiyat Y');  l('lbl-ayt-mat-b', 'Edebiyat B');
    l('lbl-ayt-fiz-c', 'Tarih-1 D');   l('lbl-ayt-fiz-w', 'Tarih-1 Y');   l('lbl-ayt-fiz-b', 'Tarih-1 B');
    l('lbl-ayt-kim-c', 'Coğrafya-1 D');l('lbl-ayt-kim-w', 'Coğrafya-1 Y');l('lbl-ayt-kim-b', 'Coğrafya-1 B');
    l('lbl-ayt-bio-c', 'Felsefe D');   l('lbl-ayt-bio-w', 'Felsefe Y');   l('lbl-ayt-bio-b', 'Felsefe B');
  }
  calcExamBlanks();
}

const MAX_Q = {
  'Türkçe': 40, 'Matematik': 40, 'Fen': 20, 'Sosyal': 20,
  'Fizik': 14, 'Kimya': 13, 'Biyoloji': 13, 'Edebiyat': 24,
  'Tarih': 10, 'Coğrafya': 6, 'Tarih1': 10, 'Coğrafya1': 6,
  'Felsefe': 12, 'Tarih2': 11, 'Coğrafya2': 11, 'Din': 6
};

function _renderExamCharts(mockLog) {
  if (!mockLog) return;
  const tytLog = mockLog.filter(m => m.type === 'TYT');
  const aytLog = mockLog.filter(m => m.type !== 'TYT');

  const selectedTYT = document.getElementById('tyt-subject-select')?.value || 'ALL';
  const selectedAYT = document.getElementById('ayt-subject-select')?.value || 'ALL';

  _renderChartGroup(tytLog, 'TYT', selectedTYT, 'examLatestChartTYT', 'examTrendChartTYT', 'tyt-latest-title', 'tyt-trend-title', examLatestChartTYT, examTrendChartTYT, (l, t) => { examLatestChartTYT = l; examTrendChartTYT = t; });
  _renderChartGroup(aytLog, 'AYT', selectedAYT, 'examLatestChartAYT', 'examTrendChartAYT', 'ayt-latest-title', 'ayt-trend-title', examLatestChartAYT, examTrendChartAYT, (l, t) => { examLatestChartAYT = l; examTrendChartAYT = t; });
}

function _renderChartGroup(log, type, selectedSubj, latestId, trendId, latestTitleId, trendTitleId, latestInst, trendInst, setInst) {
  const ctxLatest = document.getElementById(latestId);
  const ctxTrend = document.getElementById(trendId);
  if (!ctxLatest || !ctxTrend) return;

  if (latestInst) latestInst.destroy();
  if (trendInst) trendInst.destroy();

  const sorted = [...log].sort((a,b) => a.date.localeCompare(b.date));

  // Register DataLabels plugin if available
  if (typeof ChartDataLabels !== 'undefined' && typeof Chart !== 'undefined') {
    try { Chart.register(ChartDataLabels); } catch(e){}
  }

  // Card Titles Update
  const titleLatestEl = document.getElementById(latestTitleId);
  const titleTrendEl = document.getElementById(trendTitleId);

  if (selectedSubj === 'ALL') {
    if (titleLatestEl) titleLatestEl.textContent = `${type} Son Deneme (Net Dağılımı)`;
    if (titleTrendEl) titleTrendEl.textContent = `${type} Deneme Trendi`;
  } else {
    if (titleLatestEl) titleLatestEl.textContent = `${type} ${selectedSubj} Son Deneme (D / Y / B)`;
    if (titleTrendEl) titleTrendEl.textContent = `${type} ${selectedSubj} Net Trendi`;
  }

  // 1. Pie Chart
  const latest = sorted[sorted.length - 1];
  let newLatestInst = null;

  if (selectedSubj === 'ALL') {
    // Tüm Dersler Net Dağılımı + Boş/Kayıp
    if (latest && latest.nets) {
      const originalKeys = Object.keys(latest.nets);
      let totalMax = 0;
      const rawData = [];
      const legendLabels = [];

      originalKeys.forEach(k => {
        const max = MAX_Q[k] || 1;
        totalMax += max;
        const netVal = Math.max(0, latest.nets[k]);
        const pct = ((netVal / max) * 100).toFixed(1);
        rawData.push(netVal);
        legendLabels.push(`${k}: ${netVal} Net (%${pct})`);
      });
      
      let currentTotal = rawData.reduce((a,b)=>a+b, 0);
      let missing = Math.max(0, totalMax - currentTotal);
      
      if (missing > 0) {
        const missingPct = ((missing / totalMax) * 100).toFixed(1);
        legendLabels.push(`Boş/Kayıp: ${missing.toFixed(1)} Net (%${missingPct})`);
        rawData.push(missing);
      }
      
      newLatestInst = new Chart(ctxLatest, {
        type: 'pie',
        data: {
          labels: legendLabels,
          datasets: [{
            label: 'Netler',
            data: rawData,
            backgroundColor: [
              'rgba(139, 92, 246, 0.85)', 'rgba(34, 211, 238, 0.85)',
              'rgba(245, 158, 11, 0.85)', 'rgba(16, 185, 129, 0.85)',
              'rgba(239, 68, 68, 0.85)', 'rgba(236, 72, 153, 0.85)',
              'rgba(255, 255, 255, 0.1)'
            ],
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#f1f5f9', font: { size: 11, weight: 'bold' } } },
            datalabels: { display: false },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const rawNet = context.parsed;
                  if (label.startsWith('Boş/Kayıp')) {
                     const pct = (rawNet / totalMax * 100).toFixed(1);
                     return `Boş/Kayıp: ${rawNet.toFixed(2)} Net (Sınavın %${pct}'i)`;
                  }
                  const subjName = label.split(':')[0];
                  const max = MAX_Q[subjName] || '?';
                  const pct = (rawNet / max * 100).toFixed(1);
                  return `${subjName}: ${rawNet.toFixed(2)} / ${max} Net (Dersin %${pct}'i)`;
                }
              }
            }
          }
        }
      });
    } else {
      newLatestInst = new Chart(ctxLatest, { type: 'pie', data: { labels: [], datasets: [] }, options: { responsive: true, maintainAspectRatio: false } });
    }
  } else {
    // Tek Bir Ders İçi Doğru / Yanlış / Boş Analizi
    const maxQ = MAX_Q[selectedSubj] || 40;
    if (latest && latest.nets && latest.nets[selectedSubj] !== undefined) {
      let c = 0, w = 0, b = 0;
      if (latest.details && latest.details[selectedSubj]) {
        c = latest.details[selectedSubj].c || 0;
        w = latest.details[selectedSubj].w || 0;
        b = latest.details[selectedSubj].b !== undefined ? latest.details[selectedSubj].b : Math.max(0, maxQ - c - w);
      } else {
        const net = Math.max(0, latest.nets[selectedSubj]);
        c = Math.min(maxQ, Math.ceil(net));
        w = 0;
        b = Math.max(0, maxQ - c);
      }

      const netCalc = Math.max(0, c - w / 4);
      const cPct = ((c / maxQ) * 100).toFixed(1);
      const wPct = ((w / maxQ) * 100).toFixed(1);
      const bPct = ((b / maxQ) * 100).toFixed(1);

      newLatestInst = new Chart(ctxLatest, {
        type: 'pie',
        data: {
          labels: [`Doğru: ${c} (%${cPct})`, `Yanlış: ${w} (%${wPct})`, `Boş: ${b} (%${bPct})`],
          datasets: [{
            label: `${selectedSubj} Dağılımı`,
            data: [c, w, b],
            backgroundColor: [
              '#00F5A0', // ⚡ Halojen Neon Mint (Doğru)
              '#FF0055', // ⚡ Halojen Hot Crimson (Yanlış)
              '#FFE600'  // ⚡ Halojen Cyber Gold (Boş)
            ],
            borderColor: '#0d0d12',
            borderWidth: 2,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#f1f5f9', font: { size: 12, weight: 'bold' } } },
            datalabels: { display: false },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const val = context.parsed;
                  const pct = ((val / maxQ) * 100).toFixed(1);
                  return `${label} [Net: ${netCalc.toFixed(2)}]`;
                }
              }
            }
          }
        }
      });
    } else {
      newLatestInst = new Chart(ctxLatest, { type: 'pie', data: { labels: [], datasets: [] }, options: { responsive: true, maintainAspectRatio: false } });
    }
  }

  // 2. Trend (Line Chart)
  const trendLabels = sorted.map(m => formatDate(m.date));
  let maxQ = type === 'TYT' ? 120 : 80;
  let dataTrend = [];
  let lineLabel = `${type} Toplam`;

  if (selectedSubj === 'ALL') {
    dataTrend = sorted.map(m => m.totalNet);
  } else {
    maxQ = MAX_Q[selectedSubj] || 40;
    lineLabel = `${type} ${selectedSubj} Net`;
    dataTrend = sorted.map(m => (m.nets && m.nets[selectedSubj] !== undefined) ? m.nets[selectedSubj] : 0);
  }

  newTrendInst = new Chart(ctxTrend, {
    type: 'line',
    data: { 
      labels: trendLabels, 
      datasets: [{
        label: lineLabel,
        data: dataTrend,
        borderColor: type === 'TYT' ? '#8b5cf6' : '#22d3ee',
        backgroundColor: type === 'TYT' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(34, 211, 238, 0.1)',
        spanGaps: true,
        tension: 0.3,
        fill: true,
        borderWidth: 2,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        y: { 
          beginAtZero: true, max: maxQ, 
          grid: { color: 'rgba(255,255,255,0.05)' }, 
          ticks: { color: '#94a3b8' } 
        },
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
      },
      plugins: {
        datalabels: { display: false },
        legend: { labels: { color: '#f1f5f9', font: { size: 12 } }, position: 'top' },
        tooltip: {
          callbacks: {
            label: function(context) {
              const rawNet = context.parsed.y;
              const pct = (rawNet / maxQ) * 100;
              return `${context.dataset.label}: ${rawNet.toFixed(2)} / ${maxQ} Net (%${pct.toFixed(1)})`;
            }
          }
        }
      }
    }
  });

  setInst(newLatestInst, newTrendInst);
}

// ─── Detaylı Deneme Analizi & Eksik/Güçlü Konu Raporu ─────────────────────────

function renderExamDetailedAnalysis(selectedExamId) {
  const data = getStudentData(window.activeStudent);
  const mockLog = data.mockLog || [];
  const selectEl = document.getElementById('exam-analysis-select');
  const summaryGrid = document.getElementById('exam-analysis-summary-grid');
  const subjectsContainer = document.getElementById('exam-analysis-subjects-container');

  if (!summaryGrid || !subjectsContainer) return;

  if (mockLog.length === 0) {
    if (selectEl) selectEl.innerHTML = '<option value="">Deneme Kaydı Yok</option>';
    summaryGrid.innerHTML = '';
    subjectsContainer.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1; padding: 32px 16px;">
        <span style="font-size:36px;">📊</span>
        <h4 style="color:var(--text); margin-top:8px; font-size:16px;">Henüz Deneme Kaydı Bulunmuyor</h4>
        <p style="color:var(--text-muted); font-size:13px;">Deneme Takibi'nden yeni bir deneme girdiğinizde; ders ders eksik, güçlü ve çalışılması gereken tüm konular otomatik analiz edilecektir.</p>
      </div>`;
    return;
  }

  const sorted = [...mockLog].sort((a,b) => b.date.localeCompare(a.date));
  
  // Populate Select
  if (selectEl) {
    const currentVal = selectedExamId || selectEl.value;
    selectEl.innerHTML = sorted.map(m => `
      <option value="${m.id}" ${(!selectedExamId && m.id === sorted[0].id) || m.id === currentVal ? 'selected' : ''}>
        ${formatDate(m.date)} — ${m.name} (${m.type} • ${Number(m.totalNet||0).toFixed(2)} Net)
      </option>
    `).join('');
  }

  const chosenId = selectedExamId || selectEl?.value || sorted[0].id;
  const exam = sorted.find(m => m.id === chosenId) || sorted[0];
  if (!exam) return;

  const totalPossible = exam.type === 'TYT' ? 120 : 80;
  const totalNet = Number(exam.totalNet || 0);
  const overallPct = Math.min(100, Math.max(0, Math.round((totalNet / totalPossible) * 100)));

  // Subject Stats Calculation
  const subjectsData = [];
  const examNets = exam.nets || {};
  const examDetails = exam.details || {};

  const subjectsList = Object.keys(MAX_Q).filter(s => {
    if (exam.type === 'TYT') return ['Türkçe', 'Matematik', 'Fen', 'Sosyal'].includes(s);
    return !['Türkçe', 'Fen', 'Sosyal'].includes(s) && (examNets[s] !== undefined || examDetails[s] !== undefined);
  });

  Object.keys(examNets).forEach(k => {
    if (!subjectsList.includes(k)) subjectsList.push(k);
  });

  subjectsList.forEach(subj => {
    const maxQ = MAX_Q[subj] || 40;
    let c = 0, w = 0, b = 0, net = 0;
    if (examDetails[subj]) {
      c = examDetails[subj].c || 0;
      w = examDetails[subj].w || 0;
      b = examDetails[subj].b !== undefined ? examDetails[subj].b : Math.max(0, maxQ - c - w);
      net = Math.max(0, c - w / 4);
    } else if (examNets[subj] !== undefined) {
      net = Math.max(0, examNets[subj]);
      c = Math.min(maxQ, Math.ceil(net));
      w = 0;
      b = Math.max(0, maxQ - c);
    } else {
      return;
    }
    const pct = Math.min(100, Math.max(0, Math.round((net / maxQ) * 100)));
    subjectsData.push({ subj, c, w, b, net, maxQ, pct });
  });

  if (subjectsData.length === 0) return;

  // Best and Weakest
  const sortedByPct = [...subjectsData].sort((a,b) => b.pct - a.pct);
  const bestSubj = sortedByPct[0];
  const weakestSubj = sortedByPct[sortedByPct.length - 1];

  // Summary Grid HTML
  summaryGrid.innerHTML = `
    <div class="stat-card purple">
      <div class="stat-value" style="font-size:18px; color:var(--text);">${exam.type} • ${exam.name.substring(0,18)}</div>
      <div class="stat-label">İncelenen Deneme (${formatDate(exam.date)})</div>
    </div>
    <div class="stat-card cyan">
      <div class="stat-value" style="font-size:22px; color:#00F0FF;">${totalNet.toFixed(2)} / ${totalPossible}</div>
      <div class="stat-label">Toplam Net (Başarı: %${overallPct})</div>
    </div>
    <div class="stat-card green">
      <div class="stat-value" style="font-size:20px; color:#00F5A0;">${bestSubj.subj}</div>
      <div class="stat-label">En Güçlü Ders (${bestSubj.net.toFixed(2)} Net • %${bestSubj.pct})</div>
    </div>
    <div class="stat-card red">
      <div class="stat-value" style="font-size:20px; color:#FF0055;">${weakestSubj.subj}</div>
      <div class="stat-label">Öncelikli Gelişim Dersi (${weakestSubj.net.toFixed(2)} Net • %${weakestSubj.pct})</div>
    </div>
  `;

  // Subject Cards HTML
  subjectsContainer.innerHTML = subjectsData.map(item => {
    const isStrong = item.pct >= 65;
    const isMid = item.pct >= 40 && item.pct < 65;

    const badgeColor = isStrong ? '#00F5A0' : isMid ? '#FFE600' : '#FF0055';
    const statusText = isStrong ? 'Güçlü Seviye 🌟' : isMid ? 'Geliştirilmeli ⚡' : 'Kritik Seviye ⚠️';

    const groupKey = exam.type === 'TYT' ? 'TYT' : 'AYT';
    const curriculumTopics = (typeof YKS_TOPICS !== 'undefined' && YKS_TOPICS[groupKey] && YKS_TOPICS[groupKey][item.subj])
      ? YKS_TOPICS[groupKey][item.subj]
      : [];

    const studentWrongNotes = (data.wrongNotes || []).filter(wn => 
      wn.subject && wn.subject.toLowerCase() === item.subj.toLowerCase()
    );
    const wrongTopicNames = [...new Set(studentWrongNotes.map(wn => wn.topic).filter(Boolean))];

    let weakTopics = [];
    if (wrongTopicNames.length > 0) {
      weakTopics = wrongTopicNames.slice(0, 4);
    }
    if (weakTopics.length < 3 && curriculumTopics.length > 0) {
      const defaults = curriculumTopics.slice(0, 4);
      defaults.forEach(t => { if (!weakTopics.includes(t)) weakTopics.push(t); });
    }
    weakTopics = weakTopics.slice(0, 3);

    let strongTopics = [];
    if (isStrong) {
      strongTopics = curriculumTopics.filter(t => !weakTopics.includes(t)).slice(0, 3);
    } else if (curriculumTopics.length > 3) {
      strongTopics = [curriculumTopics[0], curriculumTopics[1]];
    }

    let recommendation = '';
    if (item.w > item.c) {
      recommendation = `Dikkatsizlik ve bilgi eksikliği kaynaklı hatalar yüksek. Temel konu tekrarları ve soru çözüm videoları izlenmeli.`;
    } else if (item.b >= item.maxQ * 0.35) {
      recommendation = `Boş bırakılan soru sayısı fazla. Soru tiplerine aşinalık kazanmak için hız ve branş denemeleri çözülmeli.`;
    } else if (isStrong) {
      recommendation = `Net durumu çok iyi. Çıkmış sınav soruları ve zor seviye soru bankalarıyla seviye korunmalı.`;
    } else {
      recommendation = `Günde bu dersten en az 25-30 soru hedeflenmeli ve yanlış yapılan sorular Yanlış Defterine kaydedilmeli.`;
    }

    return `
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px; display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <!-- Header -->
          <div class="flex-between" style="margin-bottom: 12px;">
            <div style="font-size: 16px; font-weight: 800; color: var(--text);">
              ${item.subj}
            </div>
            <span style="background: rgba(255,255,255,0.05); color: ${badgeColor}; border: 1px solid ${badgeColor}40; padding: 3px 8px; border-radius: 20px; font-size: 11px; font-weight: 700;">
              ${statusText}
            </span>
          </div>

          <!-- Net & Progress Bar -->
          <div style="margin-bottom: 14px;">
            <div class="flex-between" style="font-size: 13px; margin-bottom: 5px;">
              <span style="color: var(--text-dim);">Net Skoru: <strong style="color: #00F0FF; font-size: 15px;">${item.net.toFixed(2)}</strong> / ${item.maxQ} Net</span>
              <span style="font-weight: 700; color: ${badgeColor};">%${item.pct} Başarı</span>
            </div>
            <div class="progress-bar" style="height: 6px; background: rgba(255,255,255,0.08); border-radius: 99px; overflow:hidden;">
              <div style="height:100%; width:${item.pct}%; background: linear-gradient(90deg, #00F0FF, ${badgeColor}); border-radius:99px; transition: width 0.4s ease;"></div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-muted); margin-top:4px;">
              <span>Doğru: <strong style="color:#00F5A0">${item.c}</strong></span>
              <span>Yanlış: <strong style="color:#FF0055">${item.w}</strong></span>
              <span>Boş: <strong style="color:#FFE600">${item.b}</strong></span>
            </div>
          </div>

          <!-- Eksik / Çalışılması Gereken Konular -->
          <div style="margin-bottom: 14px; background: rgba(255, 0, 85, 0.05); border: 1px dashed rgba(255, 0, 85, 0.25); border-radius: 8px; padding: 10px;">
            <div style="font-size: 12px; font-weight: 700; color: #FF0055; margin-bottom: 6px; display:flex; align-items:center; gap:5px;">
              <span>⚠️</span> Eksik / Çalışılması Gereken Konular:
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
              ${weakTopics.map(topic => `
                <div style="display:flex; justify-content:space-between; align-items:center; background: rgba(0,0,0,0.25); padding: 4px 8px; border-radius: 4px; font-size: 12px; color: var(--text);">
                  <span>📌 ${topic}</span>
                  <button class="btn-sm btn-accent" style="padding: 2px 6px; font-size: 10px; border-radius: 4px;" onclick="assignTopicToSchedule('${groupKey} ${item.subj}', '${topic}')" title="Bu konuyu çalışma programına ekle">
                    + Görevlendir
                  </button>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Güçlü Olduğu Konular -->
          ${strongTopics.length > 0 ? `
            <div style="margin-bottom: 12px; background: rgba(0, 245, 160, 0.04); border: 1px dashed rgba(0, 245, 160, 0.2); border-radius: 8px; padding: 8px 10px;">
              <div style="font-size: 11px; font-weight: 700; color: #00F5A0; margin-bottom: 4px;">
                🌟 Güçlü Olduğu Konular:
              </div>
              <div style="font-size: 12px; color: var(--text-dim);">
                ${strongTopics.join(' • ')}
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Koç Tavsiyesi & Strateji -->
        <div style="border-top: 1px solid var(--border); padding-top: 10px; margin-top: 6px; font-size: 12px; color: var(--text-muted); line-height: 1.4;">
          <strong style="color:var(--text);">💡 Koç Stratejisi:</strong> ${recommendation}
        </div>
      </div>`;
  }).join('');
}

function assignTopicToSchedule(subj, topic) {
  if (typeof switchTab === 'function') switchTab('schedule');
  if (typeof openAddScheduleItem === 'function') {
    openAddScheduleItem(getTodayStr());
    setTimeout(() => {
      const subjSelect = document.getElementById('sched-subject');
      if (subjSelect) {
        for (let i = 0; i < subjSelect.options.length; i++) {
          if (subjSelect.options[i].value.includes(subj) || subjSelect.options[i].text.includes(subj)) {
            subjSelect.selectedIndex = i;
            break;
          }
        }
      }
      if (typeof updateSchedTopics === 'function') updateSchedTopics();
      const topicSelect = document.getElementById('sched-topic');
      if (topicSelect) topicSelect.value = topic;
    }, 150);
  }
}

// Update initially when modal opens or field changes
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('exam-branch')) {
    updateAYTLabels();
  }
});

window.renderExams               = renderExams;
window.renderExamDetailedAnalysis = renderExamDetailedAnalysis;
window.assignTopicToSchedule     = assignTopicToSchedule;
window.updateMockFormFields      = updateMockFormFields;
window.handleAddExam             = handleAddExam;
window.editExam                  = editExam;
window.deleteExam                = deleteExam;
window.updateAYTLabels           = updateAYTLabels;
