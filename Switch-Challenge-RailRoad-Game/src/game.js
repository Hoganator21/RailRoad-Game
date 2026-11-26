// Switch Challenge — Seaboard A-Line (Richmond Acca Yard -> Rocky Mount, NC)
const state = {
  role: 'engineer',
  speedMph: 0,
  milepost: 0.0,
  reverser: 0,
  throttle: 0,
  indBrake: 100,
  autoBrake: 0,
  wyeRoute: 'ALINE', // 'ALINE' (Bellwood/Rocky Mount) or 'CLIFTON' (Clifton Forge Sub)
  bellwoodSwitch: 'MAIN',
  alerterTimer: 0,
  alerterPenalty: false,
  ptcPenalty: false
};

const landmarks = [
  { mp: 0.0, name: 'Richmond Acca Yard (Track 4)', limit: 15 },
  { mp: 1.4, name: 'Acca South Wye Junction', limit: 25 },
  { mp: 8.5, name: 'Bellwood Yard & Industrial Lead', limit: 45 },
  { mp: 23.0, name: 'Petersburg / Collier Yard', limit: 60 },
  { mp: 118.0, name: 'Rocky Mount, NC Terminal', limit: 30 }
];

// DOM Elements
const btnEngineer = document.getElementById('btn-engineer');
const btnConductor = document.getElementById('btn-conductor');
const engPanel = document.getElementById('engineer-controls');
const condPanel = document.getElementById('conductor-controls');

const reverserEl = document.getElementById('reverser');
const throttleEl = document.getElementById('throttle');
const indBrakeEl = document.getElementById('ind-brake');
const autoBrakeEl = document.getElementById('auto-brake');

const throttleVal = document.getElementById('throttle-val');
const indBrakeVal = document.getElementById('ind-brake-val');
const autoBrakeVal = document.getElementById('auto-brake-val');

const ptcSpeed = document.getElementById('ptc-speed');
const ptcLimit = document.getElementById('ptc-limit');
const ptcSignal = document.getElementById('ptc-signal');
const ptcMp = document.getElementById('ptc-mp');
const ptcStatus = document.getElementById('ptc-status');

const alerterBar = document.getElementById('alerter-bar');
const btnAlerter = document.getElementById('btn-alerter');
const btnSwWye = document.getElementById('btn-sw-wye');
const btnSwBellwood = document.getElementById('btn-sw-bellwood');

// Role Switching
btnEngineer.addEventListener('click', () => {
  state.role = 'engineer';
  btnEngineer.classList.add('active');
  btnConductor.classList.remove('active');
  engPanel.classList.remove('hidden');
  condPanel.classList.add('hidden');
});

btnConductor.addEventListener('click', () => {
  state.role = 'conductor';
  btnConductor.classList.add('active');
  btnEngineer.classList.remove('active');
  condPanel.classList.remove('hidden');
  engPanel.classList.add('hidden');
});

// Controls
reverserEl.addEventListener('change', (e) => {
  state.reverser = parseInt(e.target.value, 10);
  resetAlerter();
});

throttleEl.addEventListener('input', (e) => {
  state.throttle = parseInt(e.target.value, 10);
  throttleVal.textContent = state.throttle === 0 ? 'IDLE' : `NOTCH ${state.throttle}`;
  resetAlerter();
});

indBrakeEl.addEventListener('input', (e) => {
  state.indBrake = parseInt(e.target.value, 10);
  indBrakeVal.textContent = `${state.indBrake}%`;
  resetAlerter();
});

autoBrakeEl.addEventListener('input', (e) => {
  state.autoBrake = parseInt(e.target.value, 10);
  autoBrakeVal.textContent = `${state.autoBrake}%`;
  resetAlerter();
});

btnAlerter.addEventListener('click', resetAlerter);
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    resetAlerter();
  }
});

btnSwWye.addEventListener('click', () => {
  state.wyeRoute = state.wyeRoute === 'ALINE' ? 'CLIFTON' : 'ALINE';
  btnSwWye.textContent = state.wyeRoute === 'ALINE'
    ? 'LINED: A-LINE SOUTH (BELLWOOD / ROCKY MOUNT)'
    : 'LINED: WEST LEG (CLIFTON FORGE SUB)';
});

btnSwBellwood.addEventListener('click', () => {
  state.bellwoodSwitch = state.bellwoodSwitch === 'MAIN' ? 'SIDING' : 'MAIN';
  btnSwBellwood.textContent = `LINED: ${state.bellwoodSwitch}`;
});

function resetAlerter() {
  state.alerterTimer = 0;
  state.alerterPenalty = false;
  alerterBar.className = 'alerter-ok';
  alerterBar.querySelector('span').textContent = 'ALERTER: OK';
}

function getCurrentLandmark() {
  let active = landmarks[0];
  for (const lm of landmarks) {
    if (state.milepost >= lm.mp) active = lm;
  }
  return active;
}

// Simulation Loop
const canvas = document.getElementById('track-canvas');
const ctx = canvas.getContext('2d');
let lastTime = performance.now();

function update(dt) {
  const lm = getCurrentLandmark();
  const limit = lm.limit;

  // Physics
  const tractiveForce = state.reverser * state.throttle * 1.4;
  const brakeForce = (state.indBrake * 0.08) + (state.autoBrake * 0.14);

  if (state.ptcPenalty || state.alerterPenalty) {
    state.throttle = 0;
    throttleEl.value = 0;
    throttleVal.textContent = 'IDLE (PENALTY)';
    state.autoBrake = 100;
    autoBrakeEl.value = 100;
    autoBrakeVal.textContent = '100%';
  }

  let accel = tractiveForce;
  if (state.speedMph > 0) {
    accel -= brakeForce + 0.15;
    state.speedMph = Math.max(0, state.speedMph + accel * dt);
  } else if (state.speedMph < 0) {
    accel += brakeForce + 0.15;
    state.speedMph = Math.min(0, state.speedMph + accel * dt);
  } else if (Math.abs(tractiveForce) > brakeForce) {
    state.speedMph += (tractiveForce - Math.sign(tractiveForce) * brakeForce) * dt;
  }

  state.milepost = Math.max(0, state.milepost + (state.speedMph / 3600) * dt);

  // PTC Overspeed Enforcement
  if (Math.abs(state.speedMph) > limit + 3) {
    state.ptcPenalty = true;
    ptcStatus.textContent = 'PTC PENALTY BRAKE!';
    ptcStatus.style.color = '#f85149';
  } else if (Math.abs(state.speedMph) === 0 && state.ptcPenalty) {
    state.ptcPenalty = false;
    ptcStatus.textContent = 'ACTIVE - ENFORCED';
    ptcStatus.style.color = '#3fb950';
  }

  // Alerter Timer when moving
  if (Math.abs(state.speedMph) > 2) {
    state.alerterTimer += dt;
    if (state.alerterTimer > 20) {
      state.alerterPenalty = true;
      alerterBar.querySelector('span').textContent = 'ALERTER PENALTY!';
    } else if (state.alerterTimer > 14) {
      alerterBar.className = 'alerter-warn';
      alerterBar.querySelector('span').textContent = 'ALERTER WARNING! PRESS SPACE';
    }
  }

  // Update HUD
  ptcSpeed.textContent = `${Math.abs(state.speedMph).toFixed(1)} MPH`;
  ptcLimit.textContent = `${limit} MPH`;
  const branchLabel = state.wyeRoute === 'ALINE' ? 'A-LINE SOUTH' : 'CLIFTON FORGE SUB';
  ptcMp.textContent = `MP A-${state.milepost.toFixed(2)} (${lm.name})`;
  ptcSignal.textContent = state.wyeRoute === 'ALINE'
    ? 'CLEAR - A-LINE TO ROCKY MOUNT'
    : 'DIVERGING - CLIFTON FORGE LEG';
  ptcSignal.className = state.wyeRoute === 'ALINE' ? 'ptc-val clear' : 'ptc-val warn';
}

function draw() {
  ctx.fillStyle = '#090d12';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Horizon & Sky
  ctx.fillStyle = '#111927';
  ctx.fillRect(0, 0, canvas.width, 190);

  // Track ballast & perspective rails
  ctx.fillStyle = '#1c2128';
  ctx.beginPath();
  ctx.moveTo(520, 190);
  ctx.lineTo(580, 190);
  ctx.lineTo(820, 420);
  ctx.lineTo(280, 420);
  ctx.closePath();
  ctx.fill();

  // Wye diverging track preview near Acca South Wye (MP 0.5 - 2.0)
  if (state.milepost < 2.2) {
    ctx.strokeStyle = state.wyeRoute === 'CLIFTON' ? '#d29922' : '#484f58';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(535, 220);
    ctx.lineTo(140, 360);
    ctx.stroke();
  }

  // Mainline Rails
  ctx.strokeStyle = '#8b949e';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(535, 190);
  ctx.lineTo(360, 420);
  ctx.moveTo(565, 190);
  ctx.lineTo(740, 420);
  ctx.stroke();

  // Animated Ties
  const offset = (state.milepost * 4000) % 40;
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth = 3;
  for (let y = 200 + offset; y < 420; y += 35) {
    const t = (y - 190) / 230;
    const halfW = 20 + t * 185;
    ctx.beginPath();
    ctx.moveTo(550 - halfW, y);
    ctx.lineTo(550 + halfW, y);
    ctx.stroke();
  }

  // Signal Mast
  ctx.fillStyle = '#30363d';
  ctx.fillRect(670, 110, 8, 120);
  ctx.fillStyle = '#161b22';
  ctx.fillRect(658, 105, 32, 65);
  ctx.fillStyle = state.wyeRoute === 'ALINE' ? '#3fb950' : '#d29922';
  ctx.beginPath();
  ctx.arc(674, 125, 8, 0, Math.PI * 2);
  ctx.fill();

  // Wide-body Cab Window Frame Overlay
  ctx.strokeStyle = '#21262d';
  ctx.lineWidth = 18;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#21262d';
  ctx.fillRect(542, 0, 16, 420);
}

function loop(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
