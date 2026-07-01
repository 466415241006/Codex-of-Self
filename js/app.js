/* ============================================================
   app.js
   ----------------------------------------------------------
   ตรรกะการทำงานของแบบประเมิน (state, การ์ดคำถาม, การคำนวณผล,
   กราฟเรดาร์) ปกติไม่ต้องแก้ไฟล์นี้ถ้าแค่อยากเปลี่ยนคำถาม/สี/ข้อความ
   — ไปแก้ที่ data.js หรือ style.css แทน
   ============================================================ */

/* flatten question list with stat index */
let FLAT = [];
STATS.forEach((s, si) => s.questions.forEach((q, qi) => FLAT.push({ si, qi, text: q })));
const TOTAL_Q = FLAT.length;

let answers = new Array(TOTAL_Q).fill(0); // 0 = unanswered, else 1..5
let cur = 0;

/* ---------------- HERO preview chips ---------------- */
function renderPreview() {
  const el = document.getElementById('statPreview');
  el.innerHTML = STATS.map(s => `
    <div class="stat-chip">
      <span class="ic">${s.icon}</span>
      <span class="nm">${s.short}</span>
    </div>`).join('');
}

/* ---------------- Navigation between screens ---------------- */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function startQuiz() {
  cur = 0;
  document.getElementById('liveXpMax').textContent = TOTAL_Q * 5;
  updateXpHud(false);
  showScreen('screen-quiz');
  renderQuestion();
}

function updateXpHud(animate) {
  const total = answers.reduce((s, v) => s + v, 0);
  const el = document.getElementById('liveXpVal');
  if (el) el.textContent = total;
  const hud = document.getElementById('xpHud');
  if (hud && animate) {
    hud.classList.remove('pulse');
    void hud.offsetWidth; // restart animation
    hud.classList.add('pulse');
  }
}

/* ---------------- Quiz rendering ---------------- */
function renderQuestion() {
  const item = FLAT[cur];
  const stat = STATS[item.si];

  document.getElementById('qIcon').textContent = stat.icon;
  document.getElementById('qKey').textContent = `STAGE ${item.si + 1} / ${STATS.length}`;
  document.getElementById('qName').textContent = stat.name;
  document.getElementById('qCount').textContent = `คำถาม ${cur + 1} / ${TOTAL_Q}`;
  document.getElementById('progressFill').style.width = `${(cur / TOTAL_Q) * 100}%`;

  const area = document.getElementById('questionArea');
  area.innerHTML = `
    <div class="q-block">
      <span class="q-num">คำถามที่ ${item.qi + 1} ของแขนง ${stat.name}</span>
      <div class="q-text">${item.text}</div>
      <div class="scale" id="scaleBtns">
        ${SCALE_LABELS.map((lbl, i) => `
          <button data-val="${i + 1}" onclick="selectAnswer(${i + 1}, this)" class="${answers[cur] === i + 1 ? 'sel' : ''}">${lbl}</button>
        `).join('')}
      </div>
    </div>
  `;

  document.getElementById('btnBack').disabled = cur === 0;
  document.getElementById('btnNext').disabled = answers[cur] === 0;
  document.getElementById('btnNext').textContent = cur === TOTAL_Q - 1 ? 'ดูผลลัพธ์ ✦' : 'ถัดไป ›';
}

function selectAnswer(val, btnEl) {
  answers[cur] = val;
  document.querySelectorAll('#scaleBtns button').forEach(b => {
    b.classList.toggle('sel', Number(b.dataset.val) === val);
  });
  document.getElementById('btnNext').disabled = false;
  updateXpHud(true);
  if (btnEl) {
    spawnFloatingXp(btnEl, val);
    spawnParticles(btnEl, STATS[FLAT[cur].si].color);
  }
  // auto-advance after brief pause, unless last question
  setTimeout(() => {
    if (cur < TOTAL_Q - 1) { nextQuestion(); }
  }, 320);
}

function nextQuestion() {
  if (answers[cur] === 0) return;
  if (cur < TOTAL_Q - 1) {
    const prevSi = FLAT[cur].si;
    cur++;
    const nextSi = FLAT[cur].si;
    if (nextSi !== prevSi) {
      showStageTransition(STATS[prevSi], STATS[nextSi]);
    } else {
      renderQuestion();
    }
  } else {
    computeAndShowResults();
  }
}

/* ---------------- Game-feel FX ---------------- */
function spawnFloatingXp(btnEl, val) {
  const span = document.createElement('span');
  span.className = 'float-xp';
  span.textContent = `+${val}`;
  btnEl.appendChild(span);
  setTimeout(() => span.remove(), 850);
}

function spawnParticles(btnEl, color) {
  const rect = btnEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const count = 10;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'fx-particle';
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const dist = 30 + Math.random() * 30;
    p.style.left = `${cx}px`;
    p.style.top = `${cy}px`;
    p.style.background = color || 'var(--gold)';
    p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 650);
  }
}

function showStageTransition(prevStat, nextStat) {
  const overlay = document.getElementById('stageTransition');
  document.getElementById('stIcon').textContent = nextStat.icon;
  document.getElementById('stClearName').textContent = prevStat.name;
  document.getElementById('stNextName').textContent = `${nextStat.icon} ${nextStat.name}`;
  overlay.classList.add('show');
  setTimeout(() => {
    overlay.classList.remove('show');
    renderQuestion();
  }, 1100);
}

/* ---------------- Keyboard shortcuts ---------------- */
document.addEventListener('keydown', (e) => {
  const quizActive = document.getElementById('screen-quiz').classList.contains('active');
  if (!quizActive) return;
  if (['1', '2', '3', '4', '5'].includes(e.key)) {
    const btn = document.querySelector(`#scaleBtns button[data-val="${e.key}"]`);
    if (btn) btn.click();
  } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
    if (!document.getElementById('btnNext').disabled) nextQuestion();
  } else if (e.key === 'ArrowLeft') {
    if (!document.getElementById('btnBack').disabled) prevQuestion();
  }
});

function prevQuestion() {
  if (cur > 0) {
    cur--;
    renderQuestion();
  }
}

/* ---------------- Results ---------------- */
function getRank(pct) {
  return RANKS.find(r => pct < r.max) || RANKS[RANKS.length - 1];
}

function computeAndShowResults() {
  const perStat = STATS.map((s, si) => {
    const qs = FLAT.map((f, idx) => ({ ...f, idx })).filter(f => f.si === si);
    const raw = qs.reduce((sum, f) => sum + answers[f.idx], 0);
    const max = qs.length * 5;
    return { ...s, raw, max, pct: Math.round((raw / max) * 100) };
  });

  const totalRaw = perStat.reduce((s, x) => s + x.raw, 0);
  const totalMax = perStat.reduce((s, x) => x.max + s, 0);
  const overallPct = Math.round((totalRaw / totalMax) * 100);

  // Level: 1 to 50 based on overall pct, plus fractional xp within level
  const levelFloat = (overallPct / 100) * 50;
  const level = Math.max(1, Math.min(50, Math.floor(levelFloat) + 1));
  const xpWithinLevel = levelFloat - Math.floor(levelFloat);

  const rank = getRank(overallPct);

  document.getElementById('rankTitle').textContent = rank.title;
  document.getElementById('rankSub').textContent = `${rank.sub} · คะแนนรวม ${overallPct}%`;
  document.getElementById('lvValue').textContent = level;
  document.getElementById('xpText').textContent = `${totalRaw} / ${totalMax} XP`;

  const sorted = [...perStat].sort((a, b) => b.pct - a.pct);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];
  document.getElementById('strengthName').textContent = `${strongest.icon} ${strongest.name} (${strongest.pct}%)`;
  document.getElementById('strengthDesc').textContent = strongest.desc_high;
  document.getElementById('growthName').textContent = `${weakest.icon} ${weakest.name} (${weakest.pct}%)`;
  document.getElementById('growthDesc').textContent = weakest.desc_low;

  // stat list
  document.getElementById('statList').innerHTML = perStat.map(s => `
    <div class="stat-row">
      <div class="stat-row-top">
        <span class="name">${s.icon} ${s.name} <span style="color:var(--ink-soft); font-weight:400; font-size:11px;">(${s.short})</span></span>
        <span class="pct" style="color:${s.color}">${s.pct}%</span>
      </div>
      <div class="mini-track"><div class="mini-fill" style="width:0%; background:${s.color};" data-w="${s.pct}"></div></div>
    </div>
  `).join('');

  renderRadar(perStat);
  showScreen('screen-result');

  // animate fills after paint
  requestAnimationFrame(() => {
    setTimeout(() => {
      document.getElementById('xpFill').style.width = `${xpWithinLevel * 100}%`;
      document.querySelectorAll('.mini-fill').forEach(el => {
        el.style.width = el.dataset.w + '%';
      });
    }, 80);
  });
}

/* ---------------- Radar chart (SVG hexagon) ---------------- */
function renderRadar(perStat) {
  const size = 300;
  const cx = size / 2, cy = size / 2;
  const R = 110;
  const n = perStat.length;
  const angle = (i) => (Math.PI * 2 * i / n) - Math.PI / 2;

  const pointAt = (i, r) => {
    const a = angle(i);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };

  // grid rings
  let gridRings = '';
  [0.25, 0.5, 0.75, 1].forEach(f => {
    const pts = perStat.map((_, i) => pointAt(i, R * f).join(',')).join(' ');
    gridRings += `<polygon points="${pts}" fill="none" stroke="rgba(46,36,24,0.25)" stroke-width="1"/>`;
  });

  // axis lines + labels
  let axes = '';
  let labels = '';
  perStat.forEach((s, i) => {
    const [x, y] = pointAt(i, R);
    axes += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(46,36,24,0.25)" stroke-width="1"/>`;
    const [lx, ly] = pointAt(i, R + 28);
    labels += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-size="12" font-family="JetBrains Mono, monospace" fill="#5A4A34" font-weight="700">${s.short}</text>`;
    labels += `<text x="${lx}" y="${ly + 14}" text-anchor="middle" dominant-baseline="middle" font-size="15">${s.icon}</text>`;
  });

  // data polygon
  const dataPts = perStat.map((s, i) => pointAt(i, R * (s.pct / 100)).join(',')).join(' ');

  const dots = perStat.map((s, i) => {
    const [x, y] = pointAt(i, R * (s.pct / 100));
    return `<circle cx="${x}" cy="${y}" r="4" fill="${s.color}" stroke="#EDE3CC" stroke-width="1.5"/>`;
  }).join('');

  const svg = `
  <svg width="${size}" height="${size + 20}" viewBox="0 0 ${size} ${size + 20}">
    <g transform="translate(0,10)">
      ${gridRings}
      ${axes}
      <polygon points="${dataPts}" fill="rgba(184,135,58,0.35)" stroke="#B8873A" stroke-width="2"/>
      ${dots}
      ${labels}
    </g>
  </svg>`;
  document.getElementById('radarWrap').innerHTML = svg;
}

/* ---------------- Restart ---------------- */
function restart() {
  answers = new Array(TOTAL_Q).fill(0);
  cur = 0;
  showScreen('screen-hero');
}

/* ---------------- Init ---------------- */
renderPreview();
