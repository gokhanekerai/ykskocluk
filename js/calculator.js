/**
 * calculator.js — TYT & AYT Puan ve Sıralama Hesaplama Modülü
 */

const CALC_COEFF = {
  TYT_BASE: 100,
  TYT: { Türkçe: 3.30, Matematik: 3.30, Fen: 3.40, Sosyal: 3.40 },
  AYT_SAY: { Matematik: 3.00, Fizik: 2.857, Kimya: 3.077, Biyoloji: 3.077 },
  AYT_EA:  { Matematik: 3.00, Edebiyat: 3.00, Tarih: 2.80, Coğrafya: 3.333 },
  AYT_SOZ: { Edebiyat: 3.00, Tarih1: 2.80, Coğrafya1: 3.333, Felsefe: 3.333, Tarih2: 3.636, Coğrafya2: 3.636, Din: 3.333 }
};

function renderCalculator() {
  const container = document.getElementById('tab-calculator');
  if (!container) return;

  const data = typeof getStudentData === 'function' ? getStudentData(window.activeStudent) : {};
  const currentObp = data.obp !== undefined ? data.obp : 85;

  const calcObpEl = document.getElementById('calc-obp');
  if (calcObpEl) calcObpEl.value = currentObp;

  const targetObpEl = document.getElementById('target-obp-input');
  if (targetObpEl) targetObpEl.value = currentObp;

  calculateAllScores();
  renderTargetNetRecommendations();
}

function calculateAllScores() {
  const obpEl = document.getElementById('calc-obp');
  const obpInput = parseFloat(obpEl?.value) || 85;
  const obpContribution = parseFloat((obpInput * 0.6).toFixed(2));

  // Branch Selection updates for AYT
  const aytBranch = document.getElementById('calc-ayt-branch-select')?.value || 'SAY';
  let a1Max = 14, a2Max = 13, a3Max = 13;

  if (aytBranch === 'SAY') {
    _setTxt('label-ayt-1-name', 'Fizik');
    _setTxt('label-ayt-1-coeff', '×2.85 Puan');
    _setTxt('label-ayt-1-qcount', '(14)');

    _setTxt('label-ayt-2-name', 'Kimya');
    _setTxt('label-ayt-2-coeff', '×3.08 Puan');
    _setTxt('label-ayt-2-qcount', '(13)');

    _setTxt('label-ayt-3-name', 'Biyoloji');
    _setTxt('label-ayt-3-coeff', '×3.08 Puan');
    _setTxt('label-ayt-3-qcount', '(13)');

    a1Max = 14; a2Max = 13; a3Max = 13;
  } else {
    _setTxt('label-ayt-1-name', 'Edebiyat');
    _setTxt('label-ayt-1-coeff', '×3.00 Puan');
    _setTxt('label-ayt-1-qcount', '(24)');

    _setTxt('label-ayt-2-name', 'Tarih-1');
    _setTxt('label-ayt-2-coeff', '×2.80 Puan');
    _setTxt('label-ayt-2-qcount', '(10)');

    _setTxt('label-ayt-3-name', 'Coğrafya-1');
    _setTxt('label-ayt-3-coeff', '×3.33 Puan');
    _setTxt('label-ayt-3-qcount', '(6)');

    a1Max = 24; a2Max = 10; a3Max = 6;
  }
  
  // Auto-calculate blanks and update max properties
  _updateMaxAndBlank('calc-tyt-tur', 40);
  _updateMaxAndBlank('calc-tyt-mat', 40);
  _updateMaxAndBlank('calc-tyt-fen', 20);
  _updateMaxAndBlank('calc-tyt-sos', 20);
  _updateMaxAndBlank('calc-ayt-mat', 40);
  _updateMaxAndBlank('calc-ayt-1', a1Max);
  _updateMaxAndBlank('calc-ayt-2', a2Max);
  _updateMaxAndBlank('calc-ayt-3', a3Max);

  // TYT Nets
  const tytTurNet = _getCalcNet('calc-tyt-tur-c', 'calc-tyt-tur-w', 'calc-tyt-tur-net');
  const tytMatNet = _getCalcNet('calc-tyt-mat-c', 'calc-tyt-mat-w', 'calc-tyt-mat-net');
  const tytFenNet = _getCalcNet('calc-tyt-fen-c', 'calc-tyt-fen-w', 'calc-tyt-fen-net');
  const tytSosNet = _getCalcNet('calc-tyt-sos-c', 'calc-tyt-sos-w', 'calc-tyt-sos-net');
  const tytTotalNet = tytTurNet + tytMatNet + tytFenNet + tytSosNet;
  _setTxt('calc-tyt-total-net', tytTotalNet.toFixed(2));

  let tytRaw = CALC_COEFF.TYT_BASE + (tytTurNet * CALC_COEFF.TYT.Türkçe) + (tytMatNet * CALC_COEFF.TYT.Matematik) + (tytFenNet * CALC_COEFF.TYT.Fen) + (tytSosNet * CALC_COEFF.TYT.Sosyal);
  tytRaw = Math.min(500, Math.max(100, tytRaw));
  const tytYerlestirme = tytRaw + obpContribution;
  _setTxt('calc-res-tyt-raw', tytRaw.toFixed(3));
  _setTxt('calc-res-tyt-yer', tytYerlestirme.toFixed(3));
  _setTxt('calc-res-tyt-rank', _estimateRank(tytYerlestirme, 'TYT'));

  // AYT Nets
  const aytMatNet = _getCalcNet('calc-ayt-mat-c', 'calc-ayt-mat-w', 'calc-ayt-mat-net');
  const ayt1Net = _getCalcNet('calc-ayt-1-c', 'calc-ayt-1-w', 'calc-ayt-1-net');
  const ayt2Net = _getCalcNet('calc-ayt-2-c', 'calc-ayt-2-w', 'calc-ayt-2-net');
  const ayt3Net = _getCalcNet('calc-ayt-3-c', 'calc-ayt-3-w', 'calc-ayt-3-net');
  
  const aytTotalNet = aytMatNet + ayt1Net + ayt2Net + ayt3Net;
  _setTxt('calc-ayt-total-net', aytTotalNet.toFixed(2));

  // ÖSYM Standard: AYT Sayısal / EA = 100 Taban + (%40 TYT Katkısı) + (%60 AYT Katkısı)
  const tytContrib = (tytRaw - 100) * 0.40; // Max 160 points
  let sayRaw = 100, eaRaw = 100;
  if (aytBranch === 'SAY') {
    const aytContrib = (aytMatNet * CALC_COEFF.AYT_SAY.Matematik) + (ayt1Net * CALC_COEFF.AYT_SAY.Fizik) + (ayt2Net * CALC_COEFF.AYT_SAY.Kimya) + (ayt3Net * CALC_COEFF.AYT_SAY.Biyoloji);
    sayRaw = 100 + tytContrib + aytContrib;
    eaRaw = 100 + tytContrib + (aytMatNet * 3.0);
  } else {
    const aytContrib = (aytMatNet * CALC_COEFF.AYT_EA.Matematik) + (ayt1Net * CALC_COEFF.AYT_EA.Edebiyat) + (ayt2Net * CALC_COEFF.AYT_EA.Tarih) + (ayt3Net * CALC_COEFF.AYT_EA.Coğrafya);
    eaRaw = 100 + tytContrib + aytContrib;
    sayRaw = 100 + tytContrib + (aytMatNet * 3.0);
  }
  
  sayRaw = Math.min(500, Math.max(100, sayRaw));
  eaRaw = Math.min(500, Math.max(100, eaRaw));

  const sayYerlestirme = sayRaw + obpContribution;
  _setTxt('calc-res-say-raw', sayRaw.toFixed(3));
  _setTxt('calc-res-say-yer', sayYerlestirme.toFixed(3));
  _setTxt('calc-res-say-rank', _estimateRank(sayYerlestirme, 'SAY'));

  const eaYerlestirme = eaRaw + obpContribution;
  _setTxt('calc-res-ea-raw', eaRaw.toFixed(3));
  _setTxt('calc-res-ea-yer', eaYerlestirme.toFixed(3));
  _setTxt('calc-res-ea-rank', _estimateRank(eaYerlestirme, 'EA'));

  _setTxt('calc-obp-val-display', obpContribution.toFixed(2));
}

function _updateMaxAndBlank(prefix, maxVal) {
  const cEl = document.getElementById(prefix + '-c');
  const wEl = document.getElementById(prefix + '-w');
  const bEl = document.getElementById(prefix + '-b');
  if (cEl) cEl.max = maxVal;
  if (wEl) wEl.max = maxVal;
  
  if (cEl && wEl && bEl) {
    const c = parseInt(cEl.value) || 0;
    const w = parseInt(wEl.value) || 0;
    const blank = Math.max(0, maxVal - (c + w));
    bEl.value = blank;
    bEl.setAttribute('value', blank);
    bEl.placeholder = maxVal;
  }
}

function _getCalcNet(cId, wId, displayId) {
  const c = parseFloat(document.getElementById(cId)?.value) || 0;
  const w = parseFloat(document.getElementById(wId)?.value) || 0;
  const net = Math.max(0, c - w / 4);
  _setTxt(displayId, net.toFixed(2));
  return net;
}

function _setTxt(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function _estimateRank(score, type) {
  const rankingsData = typeof window !== 'undefined' && window.YKS_RANKINGS ? window.YKS_RANKINGS : (typeof YKS_RANKINGS !== 'undefined' ? YKS_RANKINGS : null);
  if (!rankingsData) return _basicEstimateRank(score, type);
  
  const rank25 = _interpolateRank(score, rankingsData["2025"]?.[type]);
  const rank26 = _interpolateRank(score, rankingsData["2026"]?.[type]);
  
  if (!rank25 && !rank26) return _basicEstimateRank(score, type);
  if (rank25 && !rank26) return rank25.toLocaleString('tr-TR');
  if (!rank25 && rank26) return rank26.toLocaleString('tr-TR');
  
  const minRank = Math.min(rank25, rank26);
  const maxRank = Math.max(rank25, rank26);
  
  // If the score is identical and rank is the same, just return one
  if (minRank === maxRank) return minRank.toLocaleString('tr-TR');
  
  return `${minRank.toLocaleString('tr-TR')} - ${maxRank.toLocaleString('tr-TR')}`;
}

function _interpolateRank(score, data) {
  if (!data || data.length === 0) return 0;
  // Top bounded
  if (score >= data[0].score) return data[0].rank;
  // Bottom bounded
  if (score <= data[data.length-1].score) return data[data.length-1].rank;
  
  for (let i = 0; i < data.length - 1; i++) {
    const upper = data[i];
    const lower = data[i+1];
    
    if (score <= upper.score && score >= lower.score) {
      if (upper.score === lower.score) return Math.round((upper.rank + lower.rank)/2);
      
      const ratio = (upper.score - score) / (upper.score - lower.score);
      const rankDiff = lower.rank - upper.rank;
      return Math.round(upper.rank + (rankDiff * ratio));
    }
  }
  return 0;
}

function _basicEstimateRank(score, type) {
  if (score >= 480) return "1 - 2.500";
  if (score >= 450) return "2.500 - 10.000";
  if (score >= 420) return "10.000 - 25.000";
  if (score >= 380) return "25.000 - 60.000";
  if (score >= 340) return "60.000 - 120.000";
  if (score >= 300) return "120.000 - 220.000";
  if (score >= 250) return "220.000 - 450.000";
  return "450.000+";
}

function saveCalcAsExam(type) {
  const date = getTodayStr();
  const name = `${type} Hesaplama Kaydı`;

  let nets = {};
  let details = {};
  let totalNet = 0;
  let scores = {};

  if (type === 'TYT') {
    const tTurD = parseFloat(document.getElementById('calc-tyt-tur-c')?.value) || 0;
    const tTurW = parseFloat(document.getElementById('calc-tyt-tur-w')?.value) || 0;
    const tMatD = parseFloat(document.getElementById('calc-tyt-mat-c')?.value) || 0;
    const tMatW = parseFloat(document.getElementById('calc-tyt-mat-w')?.value) || 0;
    const tFenD = parseFloat(document.getElementById('calc-tyt-fen-c')?.value) || 0;
    const tFenW = parseFloat(document.getElementById('calc-tyt-fen-w')?.value) || 0;
    const tSosD = parseFloat(document.getElementById('calc-tyt-sos-c')?.value) || 0;
    const tSosW = parseFloat(document.getElementById('calc-tyt-sos-w')?.value) || 0;

    details = {
      Türkçe:    { c: tTurD, w: tTurW, b: Math.max(0, 40 - tTurD - tTurW) },
      Matematik: { c: tMatD, w: tMatW, b: Math.max(0, 40 - tMatD - tMatW) },
      Fen:       { c: tFenD, w: tFenW, b: Math.max(0, 20 - tFenD - tFenW) },
      Sosyal:    { c: tSosD, w: tSosW, b: Math.max(0, 20 - tSosD - tSosW) }
    };
    nets = {
      Türkçe:    parseFloat(Math.max(0, tTurD - tTurW / 4).toFixed(2)),
      Matematik: parseFloat(Math.max(0, tMatD - tMatW / 4).toFixed(2)),
      Fen:       parseFloat(Math.max(0, tFenD - tFenW / 4).toFixed(2)),
      Sosyal:    parseFloat(Math.max(0, tSosD - tSosW / 4).toFixed(2))
    };
    totalNet = Object.values(nets).reduce((a,b)=>a+b, 0);
    const scoreVal = parseFloat(document.getElementById('calc-res-tyt-raw')?.textContent) || 0;
    scores.TYT = scoreVal;
  } else {
    // AYT SAY / EA
    const aytBranch = document.getElementById('calc-ayt-branch-select')?.value || 'SAY';
    const mD = parseFloat(document.getElementById('calc-ayt-mat-c')?.value)||0, mW = parseFloat(document.getElementById('calc-ayt-mat-w')?.value)||0;
    const a1D = parseFloat(document.getElementById('calc-ayt-1-c')?.value)||0, a1W = parseFloat(document.getElementById('calc-ayt-1-w')?.value)||0;
    const a2D = parseFloat(document.getElementById('calc-ayt-2-c')?.value)||0, a2W = parseFloat(document.getElementById('calc-ayt-2-w')?.value)||0;
    const a3D = parseFloat(document.getElementById('calc-ayt-3-c')?.value)||0, a3W = parseFloat(document.getElementById('calc-ayt-3-w')?.value)||0;

    if (aytBranch === 'SAY') {
      details = {
        Matematik: { c: mD, w: mW, b: Math.max(0, 40 - mD - mW) },
        Fizik:     { c: a1D, w: a1W, b: Math.max(0, 14 - a1D - a1W) },
        Kimya:     { c: a2D, w: a2W, b: Math.max(0, 13 - a2D - a2W) },
        Biyoloji:  { c: a3D, w: a3W, b: Math.max(0, 13 - a3D - a3W) }
      };
      nets = {
        Matematik: parseFloat(Math.max(0, mD - mW/4).toFixed(2)),
        Fizik:     parseFloat(Math.max(0, a1D - a1W/4).toFixed(2)),
        Kimya:     parseFloat(Math.max(0, a2D - a2W/4).toFixed(2)),
        Biyoloji:  parseFloat(Math.max(0, a3D - a3W/4).toFixed(2))
      };
      totalNet = Object.values(nets).reduce((a,b)=>a+b, 0);
      scores.SAY = parseFloat(document.getElementById('calc-res-say-raw')?.textContent) || 0;
    } else {
      details = {
        Matematik: { c: mD, w: mW, b: Math.max(0, 40 - mD - mW) },
        Edebiyat:  { c: a1D, w: a1W, b: Math.max(0, 24 - a1D - a1W) },
        Tarih:     { c: a2D, w: a2W, b: Math.max(0, 10 - a2D - a2W) },
        Coğrafya:  { c: a3D, w: a3W, b: Math.max(0, 6 - a3D - a3W) }
      };
      nets = {
        Matematik: parseFloat(Math.max(0, mD - mW/4).toFixed(2)),
        Edebiyat:  parseFloat(Math.max(0, a1D - a1W/4).toFixed(2)),
        Tarih:     parseFloat(Math.max(0, a2D - a2W/4).toFixed(2)),
        Coğrafya:  parseFloat(Math.max(0, a3D - a3W/4).toFixed(2))
      };
      totalNet = Object.values(nets).reduce((a,b)=>a+b, 0);
      scores.EA = parseFloat(document.getElementById('calc-res-ea-raw')?.textContent) || 0;
    }
  }

  const entry = {
    id: generateId(),
    date, type, name,
    nets, details, totalNet: parseFloat(totalNet.toFixed(2)),
    scores
  };

  const data = getStudentData(window.activeStudent);
  data.mockLog.push(entry);
  saveStudentData(window.activeStudent, data);

  if (window.renderExams) window.renderExams();
  if (window.renderDashboard) window.renderDashboard();
  showToast(`${type} Hesaplama sonucu denemelere kaydedildi!`, 'success');
}

// ─── Hedef Sıralama Robotu & Gereken Net Öneri Modülü ────────────────────────

let lastCalculatedRecommendation = null;

function loadStudentGoalRank() {
  const data = getStudentData(window.activeStudent);
  const users = typeof getUsers === 'function' ? getUsers() : {};
  const student = users[window.activeStudent] || {};

  let targetRankVal = 38000;
  let targetBranch = 'SAY';

  if (data.targetRank) {
    targetRankVal = parseInt(data.targetRank) || 38000;
  } else if (data.goalRank) {
    const parsed = parseInt(String(data.goalRank).replace(/[^0-9]/g, ''));
    if (parsed) targetRankVal = parsed;
  }

  if (student.branch === 'EA') targetBranch = 'EA';
  else if (student.branch === 'Sözel') targetBranch = 'SOZ';
  else if (student.branch === 'Dil') targetBranch = 'DIL';
  else targetBranch = 'SAY';

  const rInput = document.getElementById('target-rank-input');
  if (rInput) rInput.value = targetRankVal;

  const bSelect = document.getElementById('target-branch-select');
  if (bSelect) bSelect.value = targetBranch;

  const obpVal = parseFloat(document.getElementById('calc-obp')?.value) || (data.obp || 85);
  const obpInput = document.getElementById('target-obp-input');
  if (obpInput) obpInput.value = obpVal;

  renderTargetNetRecommendations();
  showToast(`Öğrenci hedefi yüklendi: #${formatNumber(targetRankVal)} (${targetBranch})`, 'info');
}

function calculateRequiredNets(targetRank, branch, obp, year, strategy = 'personalized') {
  const rank = Math.max(1, parseInt(targetRank) || 38000);
  const b = branch || 'SAY';
  const y = year || '2026';
  const obpVal = Math.max(50, Math.min(100, parseFloat(obp) || 85));
  const obpContribution = parseFloat((obpVal * 0.6).toFixed(2));

  // 1. Gereken Yerleştirme Puanı
  const requiredYerlestirmeScore = typeof window.rankToScore === 'function' 
    ? window.rankToScore(rank, b, y) 
    : 450;

  // 2. Gereken Ham Puan
  const requiredRawScore = Math.max(100, Math.min(500, requiredYerlestirmeScore - obpContribution));
  const neededNetPoints = Math.max(0, requiredRawScore - 100);

  // 3. Maximum question limits per subject
  const maxQ = {
    TYT: { 'Türkçe': 40, 'Matematik': 40, 'Fen': 20, 'Sosyal': 20 },
    SAY: { 'Matematik': 40, 'Fizik': 14, 'Kimya': 13, 'Biyoloji': 13 },
    EA:  { 'Matematik': 40, 'Edebiyat': 24, 'Tarih': 10, 'Coğrafya': 6 },
    SOZ: { 'Edebiyat': 24, 'Tarih': 10, 'Coğrafya': 6, 'Felsefe': 12 }
  };

  const scoreRatio = Math.min(0.98, Math.max(0.08, neededNetPoints / 400));

  // Student's personal strengths from past mock exams
  let studentStrengths = {};
  let studentData = typeof getStudentData === 'function' ? getStudentData(window.activeStudent) : {};
  let mockLog = studentData.mockLog || [];
  
  if (mockLog.length > 0 && strategy === 'personalized') {
    let counts = {}, sums = {};
    mockLog.forEach(m => {
      if (m.nets) {
        Object.keys(m.nets).forEach(subj => {
          counts[subj] = (counts[subj] || 0) + 1;
          sums[subj] = (sums[subj] || 0) + Number(m.nets[subj] || 0);
        });
      }
    });
    Object.keys(sums).forEach(subj => {
      const avg = sums[subj] / counts[subj];
      const maxSubjQ = maxQ.TYT[subj] || (maxQ[b] && maxQ[b][subj]) || 40;
      studentStrengths[subj] = Math.min(1, Math.max(0.1, avg / maxSubjQ));
    });
  }

  // Helper to compute targeted net per subject based on strategy
  const getSubjectTarget = (subj, maxQuestions, isAyt = false) => {
    let base = maxQuestions * scoreRatio;
    
    if (strategy === 'personalized' && studentStrengths[subj] !== undefined) {
      const perf = studentStrengths[subj]; // e.g. 0.85 (strong) or 0.35 (weak)
      if (perf >= 0.60) {
        // Güçlü olduğu derste hedefi yukarı çek
        const boost = (perf - 0.45) * 0.45 * maxQuestions;
        base = Math.min(maxQuestions * 0.96, base + boost);
      } else if (perf < 0.45) {
        // Zayıf olduğu derste baskıyı azalt
        const reduction = (0.45 - perf) * 0.35 * maxQuestions;
        base = Math.max(maxQuestions * 0.15, base - reduction);
      }
    } else if (strategy === 'math_heavy') {
      if (subj === 'Matematik') base = Math.min(maxQuestions * 0.96, base * 1.25);
      else base = Math.max(maxQuestions * 0.15, base * 0.90);
    } else if (strategy === 'science_verbal') {
      if (subj !== 'Matematik') base = Math.min(maxQuestions * 0.96, base * 1.20);
      else base = Math.max(maxQuestions * 0.15, base * 0.85);
    }

    return parseFloat(Math.min(maxQuestions, Math.max(0, base)).toFixed(1));
  };

  let tytNets = {};
  let aytNets = {};

  Object.keys(maxQ.TYT).forEach(subj => {
    tytNets[subj] = getSubjectTarget(subj, maxQ.TYT[subj], false);
  });

  if (b !== 'TYT' && maxQ[b]) {
    Object.keys(maxQ[b]).forEach(subj => {
      aytNets[subj] = getSubjectTarget(subj, maxQ[b][subj], true);
    });
  }

  const totalTytNet = Object.values(tytNets).reduce((a, b) => a + b, 0);
  const totalAytNet = Object.values(aytNets).reduce((a, b) => a + b, 0);

  return {
    rank,
    branch: b,
    year: y,
    strategy,
    obp: obpVal,
    obpContribution,
    requiredYerlestirmeScore,
    requiredRawScore,
    tytNets,
    aytNets,
    totalTytNet: parseFloat(totalTytNet.toFixed(1)),
    totalAytNet: parseFloat(totalAytNet.toFixed(1)),
    studentStrengths,
    hasPersonalizedData: Object.keys(studentStrengths).length > 0
  };
}

function renderTargetNetRecommendations() {
  const resultContainer = document.getElementById('target-recommendations-result');
  if (!resultContainer) return;

  const targetRank = parseInt(document.getElementById('target-rank-input')?.value) || 38000;
  const branch = document.getElementById('target-branch-select')?.value || 'SAY';
  const strategy = document.getElementById('target-strategy-select')?.value || 'personalized';
  const obp = parseFloat(document.getElementById('target-obp-input')?.value) || 85;

  const rec2026 = calculateRequiredNets(targetRank, branch, obp, "2026", strategy);
  const rec2025 = calculateRequiredNets(targetRank, branch, obp, "2025", strategy);
  lastCalculatedRecommendation = rec2026;

  // Öğrencinin son denemesini çek (Kıyaslama için)
  const studentData = getStudentData(window.activeStudent);
  const users = typeof getUsers === 'function' ? getUsers() : {};
  const studentName = users[window.activeStudent]?.name || 'Öğrenci';
  const mockLog = studentData.mockLog || [];
  const latestMock = mockLog.find(m => branch === 'TYT' ? m.type === 'TYT' : m.type !== 'TYT') || mockLog[0] || null;
  const latestNets = latestMock?.nets || {};

  // Kişiselleştirilmiş Strateji Bildirim Rozeti
  let strategyBanner = '';
  if (strategy === 'personalized' && rec2026.hasPersonalizedData) {
    const sortedStrengths = Object.keys(rec2026.studentStrengths).sort((a,b) => rec2026.studentStrengths[b] - rec2026.studentStrengths[a]);
    const topSubject = sortedStrengths[0];
    const weakSubject = sortedStrengths[sortedStrengths.length - 1];

    strategyBanner = `
      <div style="margin-bottom: 16px; padding: 12px 16px; background: rgba(0, 245, 160, 0.08); border: 1px solid rgba(0, 245, 160, 0.3); border-radius: var(--radius); display: flex; align-items: center; gap: 12px; font-size: 13px;">
        <span style="font-size: 20px;">🌟</span>
        <div>
          <strong style="color: #00F5A0;">Öğrenciye Özel Strateji Devrede:</strong> 
          ${studentName}'ın deneme geçmişi analiz edildi. Başarılı olduğu <span style="color:#00F5A0; font-weight:700;">${topSubject}</span> dersinin hedefi yükseltilerek, zorlandığı <span style="color:#FF0055; font-weight:700;">${weakSubject}</span> dersi üzerindeki net baskısı hafifletildi. Toplam hedef puan korundu.
        </div>
      </div>`;
  } else if (strategy === 'math_heavy') {
    strategyBanner = `
      <div style="margin-bottom: 16px; padding: 12px 16px; background: rgba(0, 240, 255, 0.08); border: 1px solid rgba(0, 240, 255, 0.3); border-radius: var(--radius); display: flex; align-items: center; gap: 12px; font-size: 13px;">
        <span style="font-size: 20px;">📐</span>
        <div>
          <strong style="color: #00F0FF;">Matematik Ağırlıklı Strateji:</strong> 
          Puan yükü TYT & AYT Matematik derslerine aktarıldı, fen/sosyal derslerinin net gereksinimi düşürüldü.
        </div>
      </div>`;
  }

  // Summary Stat Cards
  let summaryHtml = `
    ${strategyBanner}
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px;">
      <div class="stat-card purple" style="border: 1px solid rgba(168,85,247,0.3);">
        <div class="stat-value" style="font-size:22px; color:var(--text);">#${formatNumber(rec2026.rank)}</div>
        <div class="stat-label">Hedef Sıralama (${rec2026.branch})</div>
      </div>
      <div class="stat-card cyan" style="border: 1px solid rgba(0,240,255,0.3);">
        <div class="stat-value" style="font-size:20px; color:#00F0FF;">${rec2026.requiredYerlestirmeScore.toFixed(1)} <span style="font-size:12px; color:var(--text-muted);">/ ${rec2025.requiredYerlestirmeScore.toFixed(1)}</span></div>
        <div class="stat-label">Gereken Puan (2026 / 2025)</div>
      </div>
      <div class="stat-card green" style="border: 1px solid rgba(0,245,160,0.3);">
        <div class="stat-value" style="font-size:20px; color:#00F5A0;">${Math.min(rec2026.totalTytNet, rec2025.totalTytNet)} - ${Math.max(rec2026.totalTytNet, rec2025.totalTytNet)} Net</div>
        <div class="stat-label">Hedef TYT Koridoru (/ 120)</div>
      </div>
      ${branch !== 'TYT' ? `
        <div class="stat-card amber" style="border: 1px solid rgba(255,230,0,0.3);">
          <div class="stat-value" style="font-size:20px; color:#FFE600;">${Math.min(rec2026.totalAytNet, rec2025.totalAytNet)} - ${Math.max(rec2026.totalAytNet, rec2025.totalAytNet)} Net</div>
          <div class="stat-label">Hedef AYT Koridoru (/ 80)</div>
        </div>
      ` : ''}
    </div>
  `;

  // Net Tables
  const renderSubjectRows = (nets26, nets25, isAyt = false) => {
    return Object.keys(nets26).map(subj => {
      const net26 = nets26[subj] || 0;
      const net25 = (nets25 && nets25[subj] !== undefined) ? nets25[subj] : net26;
      const curNet = latestNets[subj] !== undefined ? Number(latestNets[subj]) : null;
      
      const minTarget = Math.min(net26, net25);
      const maxTarget = Math.max(net26, net25);
      const safeTargetStr = minTarget === maxTarget ? `${minTarget.toFixed(1)}` : `${minTarget.toFixed(1)} - ${maxTarget.toFixed(1)}`;

      let diffStr = '—';
      let badgeStyle = 'color:var(--text-muted); background:rgba(255,255,255,0.05);';
      
      if (curNet !== null) {
        const diff = maxTarget - curNet;
        if (diff > 0) {
          diffStr = `+${diff.toFixed(1)} Net Gerekli`;
          badgeStyle = 'color:#FF0055; background:rgba(255,0,85,0.1); border:1px solid rgba(255,0,85,0.25);';
        } else {
          diffStr = `✅ Hedefte (+${Math.abs(diff).toFixed(1)})`;
          badgeStyle = 'color:#00F5A0; background:rgba(0,245,160,0.1); border:1px solid rgba(0,245,160,0.25);';
        }
      }

      const coeffMap = {
        'Türkçe': '×3.30', 'Matematik': isAyt ? '×3.00' : '×3.30',
        'Fen': '×3.40', 'Sosyal': '×3.40',
        'Fizik': '×2.85', 'Kimya': '×3.08', 'Biyoloji': '×3.08',
        'Edebiyat': '×3.00', 'Tarih': '×2.80', 'Coğrafya': '×3.33'
      };
      const coeffBadge = coeffMap[subj] ? `<span style="font-size:10px; font-weight:700; color:#00F0FF; background:rgba(0,240,255,0.08); padding:1px 5px; border-radius:4px; border:1px solid rgba(0,240,255,0.2); white-space:nowrap; width:45px; text-align:center; display:inline-block;">${coeffMap[subj]}</span>` : '';

      return `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
          <td style="padding:10px 14px; font-weight:700; color:var(--text); white-space:nowrap;">
            <div style="display:flex; justify-content:space-between; align-items:center; width:135px;">
              <span>${subj}</span>
              ${coeffBadge}
            </div>
          </td>
          <td style="padding:10px 14px; text-align:center; font-weight:700; color:#00F0FF; white-space:nowrap;">${net26.toFixed(1)}</td>
          <td style="padding:10px 14px; text-align:center; font-weight:700; color:#FFE600; white-space:nowrap;">${net25.toFixed(1)}</td>
          <td style="padding:10px 14px; text-align:center; font-weight:800; color:#00F5A0; white-space:nowrap;">${safeTargetStr}</td>
          <td style="padding:10px 14px; text-align:center; color:var(--text-dim); white-space:nowrap;">${curNet !== null ? curNet.toFixed(1) + ' Net' : '—'}</td>
          <td style="padding:10px 14px; text-align:center; white-space:nowrap;">
            <span style="display:inline-block; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700; ${badgeStyle}">
              ${diffStr}
            </span>
          </td>
        </tr>`;
    }).join('');
  };

  let tablesHtml = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px; margin-bottom: 20px;">
      <!-- TYT Hedef Tablosu -->
      <div style="background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius); overflow-x:auto;">
        <div style="background: rgba(0,240,255,0.06); padding: 10px 16px; font-weight: 800; font-size: 14px; color: #00F0FF; display:flex; justify-content:space-between;">
          <span>📝 TYT Hedef Net Koridoru</span>
          <span>${rec2026.totalTytNet} - ${rec2025.totalTytNet} Net</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: rgba(0,0,0,0.2); color: var(--text-muted); font-size: 11px; text-transform: uppercase;">
              <th style="padding:8px 12px; text-align:left; white-space:nowrap;">Ders</th>
              <th style="padding:8px 10px; text-align:center; white-space:nowrap;" title="Zor / Eleme Sınav Senaryosu">2026 (Zor)</th>
              <th style="padding:8px 10px; text-align:center; white-space:nowrap;" title="Standart YKS Senaryosu">2025 (Std)</th>
              <th style="padding:8px 12px; text-align:center; white-space:nowrap;" title="Riske girmemek için güvenli hedef">🛡️ Hedef Koridoru</th>
              <th style="padding:8px 10px; text-align:center; white-space:nowrap;">Son Deneme</th>
              <th style="padding:8px 10px; text-align:center; white-space:nowrap;">Fark</th>
            </tr>
          </thead>
          <tbody>
            ${renderSubjectRows(rec2026.tytNets, rec2025.tytNets, false)}
          </tbody>
        </table>
      </div>

      <!-- AYT Hedef Tablosu -->
      ${branch !== 'TYT' ? `
        <div style="background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius); overflow-x:auto;">
          <div style="background: rgba(168,85,247,0.06); padding: 10px 16px; font-weight: 800; font-size: 14px; color: var(--primary); display:flex; justify-content:space-between;">
            <span>📐 AYT (${rec2026.branch}) Hedef Net Koridoru</span>
            <span>${rec2026.totalAytNet} - ${rec2025.totalAytNet} Net</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background: rgba(0,0,0,0.2); color: var(--text-muted); font-size: 11px; text-transform: uppercase;">
                <th style="padding:8px 12px; text-align:left; white-space:nowrap;">Ders</th>
                <th style="padding:8px 10px; text-align:center; white-space:nowrap;" title="Zor / Eleme Sınav Senaryosu">2026 (Zor)</th>
                <th style="padding:8px 10px; text-align:center; white-space:nowrap;" title="Standart YKS Senaryosu">2025 (Std)</th>
                <th style="padding:8px 12px; text-align:center; white-space:nowrap;" title="Riske girmemek için güvenli hedef">🛡️ Hedef Koridoru</th>
                <th style="padding:8px 10px; text-align:center; white-space:nowrap;">Son Deneme</th>
                <th style="padding:8px 10px; text-align:center; white-space:nowrap;">Fark</th>
              </tr>
            </thead>
            <tbody>
              ${renderSubjectRows(rec2026.aytNets, rec2025.aytNets, true)}
            </tbody>
          </table>
        </div>
      ` : ''}
    </div>
  `;

  // Action / Koçluk Tavsiyesi Bölümü
  let actionHtml = `
    <div style="background: rgba(0,240,255,0.03); border: 1px dashed rgba(0,240,255,0.25); border-radius: var(--radius); padding: 16px; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:14px;">
      <div style="font-size:13px; color:var(--text-dim); line-height:1.5; max-width:650px;">
        💡 <strong>Koçluk Stratejisi:</strong> <em>#${formatNumber(rec2026.rank)}</em> sıralama hedefi için sınav zor gelirse (2026) <strong>${rec2026.totalTytNet} TYT + ${rec2026.totalAytNet} AYT</strong> yeterliyken; standart sınavda (2025) <strong>${rec2025.totalTytNet} TYT + ${rec2025.totalAytNet} AYT</strong> gerekmektedir. Riske girmemek için <strong>yeşil güvenli koridor</strong> hedeflenmelidir.
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-primary" onclick="applyRecommendedNetsToCalc('safe')" style="box-shadow: 0 4px 14px rgba(0,240,255,0.25);">
          🚀 Güvenli Netleri Aktar
        </button>
      </div>
    </div>
  `;

  resultContainer.innerHTML = summaryHtml + tablesHtml + actionHtml;
}

function applyRecommendedNetsToCalc(mode = 'safe') {
  const targetRank = parseInt(document.getElementById('target-rank-input')?.value) || 38000;
  const branch = document.getElementById('target-branch-select')?.value || 'SAY';
  const strategy = document.getElementById('target-strategy-select')?.value || 'personalized';
  const obp = parseFloat(document.getElementById('target-obp-input')?.value) || 85;

  const rec2026 = calculateRequiredNets(targetRank, branch, obp, "2026", strategy);
  const rec2025 = calculateRequiredNets(targetRank, branch, obp, "2025", strategy);

  // OBP Set
  const obpInput = document.getElementById('calc-obp');
  if (obpInput) obpInput.value = rec2026.obp;

  // Choose net values (safe mode uses max of both years)
  const getNet = (nets26, nets25, subj) => {
    const n26 = nets26[subj] || 0;
    const n25 = (nets25 && nets25[subj] !== undefined) ? nets25[subj] : n26;
    return mode === '2026' ? n26 : (mode === '2025' ? n25 : Math.max(n26, n25));
  };

  // TYT Nets Set
  const tTur = getNet(rec2026.tytNets, rec2025.tytNets, 'Türkçe');
  const tMat = getNet(rec2026.tytNets, rec2025.tytNets, 'Matematik');
  const tFen = getNet(rec2026.tytNets, rec2025.tytNets, 'Fen');
  const tSos = getNet(rec2026.tytNets, rec2025.tytNets, 'Sosyal');

  _setVal('calc-tyt-tur-c', tTur.toFixed(1)); _setVal('calc-tyt-tur-w', 0);
  _setVal('calc-tyt-mat-c', tMat.toFixed(1)); _setVal('calc-tyt-mat-w', 0);
  _setVal('calc-tyt-fen-c', tFen.toFixed(1)); _setVal('calc-tyt-fen-w', 0);
  _setVal('calc-tyt-sos-c', tSos.toFixed(1)); _setVal('calc-tyt-sos-w', 0);

  // AYT Nets Set
  if (branch !== 'TYT') {
    const aytBranchSelect = document.getElementById('calc-ayt-branch-select');
    if (aytBranchSelect) aytBranchSelect.value = branch === 'EA' ? 'EA' : 'SAY';

    if (branch === 'SAY') {
      const aMat = getNet(rec2026.aytNets, rec2025.aytNets, 'Matematik');
      const aFiz = getNet(rec2026.aytNets, rec2025.aytNets, 'Fizik');
      const aKim = getNet(rec2026.aytNets, rec2025.aytNets, 'Kimya');
      const aBio = getNet(rec2026.aytNets, rec2025.aytNets, 'Biyoloji');
      _setVal('calc-ayt-mat-c', aMat.toFixed(1)); _setVal('calc-ayt-mat-w', 0);
      _setVal('calc-ayt-1-c', aFiz.toFixed(1)); _setVal('calc-ayt-1-w', 0);
      _setVal('calc-ayt-2-c', aKim.toFixed(1)); _setVal('calc-ayt-2-w', 0);
      _setVal('calc-ayt-3-c', aBio.toFixed(1)); _setVal('calc-ayt-3-w', 0);
    } else if (branch === 'EA') {
      const aMat = getNet(rec2026.aytNets, rec2025.aytNets, 'Matematik');
      const aEde = getNet(rec2026.aytNets, rec2025.aytNets, 'Edebiyat');
      const aTar = getNet(rec2026.aytNets, rec2025.aytNets, 'Tarih');
      const aCog = getNet(rec2026.aytNets, rec2025.aytNets, 'Coğrafya');
      _setVal('calc-ayt-mat-c', aMat.toFixed(1)); _setVal('calc-ayt-mat-w', 0);
      _setVal('calc-ayt-1-c', aEde.toFixed(1)); _setVal('calc-ayt-1-w', 0);
      _setVal('calc-ayt-2-c', aTar.toFixed(1)); _setVal('calc-ayt-2-w', 0);
      _setVal('calc-ayt-3-c', aCog.toFixed(1)); _setVal('calc-ayt-3-w', 0);
    }
  }

  calculateAllScores();

  // Scroll to top of calculator smoothly
  const calcTop = document.getElementById('tab-calculator');
  if (calcTop) calcTop.scrollIntoView({ behavior: 'smooth' });

  showToast('Güvenli hedef netler hesaplayıcıya aktarıldı ve canlı simüle edildi!', 'success');
}

function _setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

// Auto bind on input change
document.addEventListener('input', (e) => {
  if (e.target && e.target.closest('#tab-calculator')) {
    if (e.target.id === 'calc-obp') {
      const val = parseFloat(e.target.value) || 85;
      const targetObp = document.getElementById('target-obp-input');
      if (targetObp) targetObp.value = val;

      // Persist to active student
      if (window.activeStudent && typeof getStudentData === 'function') {
        const data = getStudentData(window.activeStudent);
        data.obp = val;
        saveStudentData(window.activeStudent, data);
      }
      renderTargetNetRecommendations();
    } else if (e.target.id === 'target-obp-input') {
      const val = parseFloat(e.target.value) || 85;
      const calcObp = document.getElementById('calc-obp');
      if (calcObp) calcObp.value = val;

      // Persist to active student
      if (window.activeStudent && typeof getStudentData === 'function') {
        const data = getStudentData(window.activeStudent);
        data.obp = val;
        saveStudentData(window.activeStudent, data);
      }
      calculateAllScores();
    }

    calculateAllScores();
  }
});

document.addEventListener('change', (e) => {
  if (e.target && e.target.id === 'calc-ayt-branch-select') {
    calculateAllScores();
  }
});

window.renderCalculator             = renderCalculator;
window.calculateAllScores            = calculateAllScores;
window.saveCalcAsExam                = saveCalcAsExam;
window.renderTargetNetRecommendations = renderTargetNetRecommendations;
window.applyRecommendedNetsToCalc    = applyRecommendedNetsToCalc;
window.loadStudentGoalRank           = loadStudentGoalRank;
window.calculateRequiredNets         = calculateRequiredNets;
