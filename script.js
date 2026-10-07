document.querySelector('#cover .bgblur').src =
  document.querySelector('#cover .main').src;
const cover = document.getElementById('cover'),
  main = document.getElementById('main');
document.getElementById('open').addEventListener('click', () => {
  cover.classList.add('open');
  document.body.classList.add('show');
  document
    .getElementById('bgv')
    .play()
    .catch(() => {});
  burst();
  playMusic();
});

/* trilha africana original: tambores, chocalho, marimba e coro (sintetizados) */
let mc,
  master,
  noiseBuf,
  step = 0,
  next = 0,
  timer,
  playing = false;
const SD = 0.15,
  hz = m => 440 * Math.pow(2, (m - 69) / 12),
  roots = [38, 47, 43, 45];
const mar = [
  [74, 0, 0, 69, 0, 66, 0, 69, 74, 0, 0, 69, 0, 66, 0, 0],
  [71, 0, 0, 66, 0, 62, 0, 66, 71, 0, 0, 66, 0, 62, 0, 0],
  [74, 0, 0, 71, 0, 67, 0, 71, 74, 0, 0, 71, 0, 67, 0, 0],
  [73, 0, 0, 69, 0, 64, 0, 69, 73, 0, 0, 69, 0, 64, 0, 0],
];
const choir = [69, 66, 71, 64];
function tone(f0, f1, t, d, g, type) {
  const o = mc.createOscillator(),
    e = mc.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + d);
  e.gain.setValueAtTime(0, t);
  e.gain.linearRampToValueAtTime(g, t + 0.006);
  e.gain.exponentialRampToValueAtTime(0.0008, t + d);
  o.connect(e).connect(master);
  o.start(t);
  o.stop(t + d + 0.05);
}
function nz(t, d, g, f, type) {
  const n = mc.createBufferSource(),
    fl = mc.createBiquadFilter(),
    e = mc.createGain();
  n.buffer = noiseBuf;
  fl.type = type;
  fl.frequency.value = f;
  e.gain.setValueAtTime(g, t);
  e.gain.exponentialRampToValueAtTime(0.001, t + d);
  n.connect(fl).connect(e).connect(master);
  n.start(t, Math.random());
  n.stop(t + d + 0.02);
}
function marimba(m, t) {
  tone(hz(m), hz(m), t, 0.45, 0.2, 'triangle');
  tone(hz(m + 12), hz(m + 12), t, 0.18, 0.05);
}
function voice(m, t, d, g, from) {
  [-7, 7].forEach(c => {
    const o = mc.createOscillator(),
      f = mc.createBiquadFilter(),
      e = mc.createGain();
    o.type = 'sawtooth';
    o.detune.value = c;
    o.frequency.setValueAtTime(hz(from || m), t);
    o.frequency.exponentialRampToValueAtTime(hz(m), t + 0.25);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(500, t);
    f.frequency.linearRampToValueAtTime(1100, t + d * 0.5);
    f.Q.value = 3;
    e.gain.setValueAtTime(0, t);
    e.gain.linearRampToValueAtTime(g, t + d * 0.35);
    e.gain.linearRampToValueAtTime(0, t + d);
    o.connect(f).connect(e).connect(master);
    o.start(t);
    o.stop(t + d + 0.05);
  });
}
function sched() {
  while (next < mc.currentTime + 0.4) {
    const s = step % 64,
      bar = Math.floor(s / 16),
      k = s % 16,
      t = next;
    /* tambores */
    if ([0, 6, 10].includes(k)) tone(95, 45, t, 0.4, 0.55);
    if ([3, 7, 11, 14].includes(k)) {
      tone(k % 2 ? 210 : 170, 120, t, 0.18, 0.28);
      nz(t, 0.07, 0.18, 1800, 'bandpass');
    }
    if ([2, 5, 9, 13].includes(k)) tone(340, 250, t, 0.1, 0.16, 'triangle');
    if (s % 3 === 0) tone(900, 880, t, 0.05, 0.05, 'square');
    if (k % 2 === 0) nz(t, 0.05, 0.07, 7000, 'highpass');
    else nz(t, 0.04, 0.13, 8000, 'highpass');
    /* base grave */
    if (k === 0) tone(hz(roots[bar]), hz(roots[bar]), t, SD * 15, 0.22);
    /* marimba entra no 2º compasso */
    if (step >= 16) {
      const m = mar[bar][k];
      if (m) marimba(m, t);
    }
    /* coro */
    if (k === 0 && step >= 16)
      voice(choir[bar], t, SD * 15, 0.05, choir[bar] - 2);
    if (k === 0 && step >= 16) voice(choir[bar] - 7, t, SD * 15, 0.035);
    if (k === 12 && (bar === 1 || bar === 3) && step >= 64)
      voice(81, t, 0.35, 0.07, 76);
    step++;
    next += SD;
  }
}
function startMusic() {
  if (playing) return;
  try {
    mc = new (window.AudioContext || window.webkitAudioContext)();
    const cp = mc.createDynamicsCompressor();
    master = mc.createGain();
    master.gain.value = 0.85;
    master.connect(cp);
    cp.connect(mc.destination);
    noiseBuf = mc.createBuffer(1, mc.sampleRate * 2, mc.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    next = mc.currentTime + 0.1;
    timer = setInterval(sched, 100);
    playing = true;
  } catch (e) {}
}
/* música: arquivo assets/music-rei-leao.mp3 (se não existir, toca a trilha sintetizada) */
const MUSIC_SRC = 'assets/music-rei-leao.mp3';
const audio = new Audio();
audio.loop = true;
audio.preload = 'auto';
audio.volume = 0.85;
audio.src = MUSIC_SRC;
let audioOn = false,
  audioFail = false;
audio.addEventListener('error', () => {
  audioFail = true;
  if (audioOn) {
    audioOn = false;
    playing = false;
    roar();
    setTimeout(startMusic, 1400);
  }
});
function fallback() {
  audioFail = true;
  roar();
  setTimeout(startMusic, 1400);
}
function playMusic() {
  if (audioFail) return fallback();
  const p = audio.play();
  if (p && p.then)
    p.then(() => {
      audioOn = true;
      playing = true;
    }).catch(fallback);
}
const mb = document.getElementById('music');
mb.addEventListener('click', () => {
  let on;
  if (audioOn) {
    on = !audio.paused;
    on ? audio.pause() : audio.play();
  } else {
    if (!mc) return;
    on = mc.state === 'running';
    on ? mc.suspend() : mc.resume();
  }
  mb.textContent = on ? '🔇' : '🔊';
  mb.classList.toggle('on', !on);
  mb.setAttribute('aria-label', on ? 'Tocar música' : 'Pausar música');
});
document.addEventListener('visibilitychange', () => {
  const want = mb.classList.contains('on');
  if (audioOn) {
    document.hidden ? audio.pause() : want && audio.play();
  } else if (mc) {
    document.hidden ? mc.suspend() : want && mc.resume();
  }
});
setTimeout(() => {
  document.body.classList.contains('show') || 0;
}, 0);

/* countdown */
let target = new Date(2026, 10, 21, 13, 0, 0);
const ids = ['d', 'h', 'm', 's'].map(i => document.getElementById(i));
function tick() {
  let t = Math.max(0, target - Date.now()),
    s = Math.floor(t / 1000);
  const v = [
    Math.floor(s / 86400),
    Math.floor((s % 86400) / 3600),
    Math.floor((s % 3600) / 60),
    s % 60,
  ];
  ids.forEach(
    (e, i) => (e.textContent = String(v[i]).padStart(i ? 2 : 1, '0'))
  );
}
tick();
setInterval(tick, 1000);

/* soft roar via WebAudio */
function roar() {
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)(),
      o = c.createOscillator(),
      g = c.createGain(),
      f = c.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(90, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(48, c.currentTime + 1.2);
    f.type = 'lowpass';
    f.frequency.value = 420;
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(0.25, c.currentTime + 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.4);
    o.connect(f).connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + 1.5);
  } catch (e) {}
}

/* fireflies + confetti */
const cv = document.getElementById('fx'),
  x = cv.getContext('2d');
let W,
  H,
  P = [];
function size() {
  W = cv.width = innerWidth * devicePixelRatio;
  H = cv.height = innerHeight * devicePixelRatio;
}
addEventListener('resize', size);
size();
const dpr = () => devicePixelRatio;
for (let i = 0; i < 36; i++)
  P.push({
    t: 'f',
    x: Math.random() * W,
    y: Math.random() * H,
    r: (1 + Math.random() * 2.2) * dpr(),
    a: Math.random() * 6.28,
    s: 0.2 + Math.random() * 0.5,
  });
function burst() {
  const cols = ['#ffd776', '#ffb02e', '#e8641b', '#fff4d6', '#7bb661'];
  for (let i = 0; i < 110; i++)
    P.push({
      t: 'c',
      x: W / 2,
      y: H * 0.45,
      vx: (Math.random() - 0.5) * 16 * dpr(),
      vy: (-6 - Math.random() * 12) * dpr(),
      r: (3 + Math.random() * 4) * dpr(),
      c: cols[i % 5],
      rot: Math.random() * 6,
      life: 1,
    });
}
function loop() {
  x.clearRect(0, 0, W, H);
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    if (p.t === 'f') {
      p.a += 0.02;
      p.x += Math.cos(p.a) * p.s * dpr();
      p.y += Math.sin(p.a * 0.8) * p.s * dpr() - 0.12 * dpr();
      if (p.y < -10) p.y = H + 10;
      x.globalAlpha = 0.4 + 0.5 * Math.sin(p.a * 2);
      x.fillStyle = '#ffe38a';
      x.shadowColor = '#ffd05a';
      x.shadowBlur = 14 * dpr();
      x.beginPath();
      x.arc(p.x, p.y, p.r, 0, 6.28);
      x.fill();
      x.shadowBlur = 0;
    } else {
      p.vy += 0.35 * dpr();
      p.x += p.vx;
      p.y += p.vy;
      p.rot += 0.2;
      p.life -= 0.007;
      if (p.life <= 0) {
        P.splice(i, 1);
        continue;
      }
      x.globalAlpha = p.life;
      x.fillStyle = p.c;
      x.save();
      x.translate(p.x, p.y);
      x.rotate(p.rot);
      x.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      x.restore();
    }
  }
  x.globalAlpha = 1;
  requestAnimationFrame(loop);
}
loop();
