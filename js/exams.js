/**
 * exams.js — Deneme Sonuçları Girişi ve Puan Hesaplama
 */

// TYT Puan hesaplama sabitleri (2024 ÖSYM baz)
const TYT_COEFFICIENTS = {
  Türkçe:    1.3 ,
  Matematik: 1.3 ,
  Fen:       1.2 ,
  Sosyal:    1.2
};
const TYT_BASE = 100;

// AYT SAY katsayıları
const AYT_SAY = { Matematik: 3.0, Fizik: 3.0, Kimya: 2.85, Biyoloji: 2.85 };
// AYT EA
const AYT_EA  = { Matematik: 3.0, Edebiyat: 3.0, Tarih: 2.8, Coğrafya: 2.8 };
// AYT SÖZ
const AYT_SOZ = { Edebiyat: 3.0, Tarih1: 2.8, Coğrafya1: 2.8, Felsefe: 2.6, Tarih2: 2.6, Coğrafya2: 2.6, Din: 2.6 };

function renderExams() {
  const data = getStudentData(window.activeStudent);
  _renderExamTable(data.mockLog);
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
          <button class="btn-sm btn-danger" onclick="deleteExam('${m.id}')">🗑️</button>
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
}

function handleAddExam(e) {
  if (e) e.preventDefault();

  const type = document.getElementById('exam-type')?.value || 'TYT';
  const name = document.getElementById('exam-name')?.value.trim() || `${type} Denemesi`;
  const date = document.getElementById('exam-date')?.value || getTodayStr();

  let nets = {};
  let totalNet = 0;
  let scores = {};

  if (type === 'TYT') {
    nets = {
      Türkçe:    _getNet('tyt-turkce-c',    'tyt-turkce-w'),
      Matematik: _getNet('tyt-mat-c',       'tyt-mat-w'),
      Fen:       _getNet('tyt-fen-c',       'tyt-fen-w'),
      Sosyal:    _getNet('tyt-sosyal-c',    'tyt-sosyal-w'),
    };
    totalNet = Object.values(nets).reduce((s,n) => s + n, 0);
    scores.TYT = _calcTYTScore(nets);
  } else {
    const branch = document.getElementById('exam-branch')?.value || 'SAY';
    nets = _getAYTNets(branch);
    totalNet = Object.values(nets).reduce((s,n) => s + n, 0);
    scores[branch] = _calcAYTScore(branch, nets);
  }

  const entry = {
    id: generateId(),
    date, type, name,
    nets, totalNet: parseFloat(totalNet.toFixed(2)),
    scores
  };

  const data = getStudentData(window.activeStudent);
  data.mockLog.push(entry);
  saveStudentData(window.activeStudent, data);

  closeModal('add-exam-modal');
  _clearExamForm();
  renderExams();
  renderDashboard();
  showToast('Deneme kaydedildi!', 'success');
}

function _getNet(correctId, wrongId) {
  const c = parseFloat(document.getElementById(correctId)?.value) || 0;
  const w = parseFloat(document.getElementById(wrongId)?.value)   || 0;
  return parseFloat(Math.max(0, c - w / 4).toFixed(2));
}

function _getAYTNets(branch) {
  const nets = {};
  const ids = {
    SAY: [['ayt-mat-c','ayt-mat-w','Matematik'],['ayt-fiz-c','ayt-fiz-w','Fizik'],['ayt-kim-c','ayt-kim-w','Kimya'],['ayt-bio-c','ayt-bio-w','Biyoloji']],
    EA:  [['ayt-mat-c','ayt-mat-w','Matematik'],['ayt-tur-c','ayt-tur-w','Edebiyat'],['ayt-tar-c','ayt-tar-w','Tarih'],['ayt-cog-c','ayt-cog-w','Coğrafya']],
    SOZ: [['ayt-tur-c','ayt-tur-w','Edebiyat'],['ayt-tar1-c','ayt-tar1-w','Tarih1'],['ayt-cog1-c','ayt-cog1-w','Coğrafya1'],['ayt-fel-c','ayt-fel-w','Felsefe'],['ayt-tar2-c','ayt-tar2-w','Tarih2'],['ayt-cog2-c','ayt-cog2-w','Coğrafya2'],['ayt-din-c','ayt-din-w','Din']]
  };
  (ids[branch] || []).forEach(([cId, wId, label]) => { nets[label] = _getNet(cId, wId); });
  return nets;
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

function _clearExamForm() {
  ['exam-name','exam-date'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  document.querySelectorAll('#add-exam-modal input[type="number"]').forEach(el => el.value = '');
}

window.renderExams          = renderExams;
window.updateMockFormFields = updateMockFormFields;
window.handleAddExam        = handleAddExam;
window.deleteExam           = deleteExam;
