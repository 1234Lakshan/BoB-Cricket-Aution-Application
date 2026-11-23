const TOTAL = 24; // highest player number
const TEAMS = {
  fire:  { name: 'Fire Blasters', logo: 'assets/fire_blasters.png', glow: 'rgba(255,90,31,.55)' },
  lions: { name: 'Royal Lions',   logo: 'assets/royal_lions.png',   glow: 'rgba(59,109,255,.6)' }
};
const KEY = 'battle-of-brothers-v1';
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, '0');
const NO_PHOTO = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#111"/>' +
  '<text x="200" y="210" fill="#777" font-size="28" font-family="Arial" text-anchor="middle">No photo yet</text></svg>');

let S = load();
let current = null;
let soldTimer = null;

function load() {
  const empty = { fire: [], lions: [], unsold: [], log: [] };
  try { return Object.assign(empty, JSON.parse(localStorage.getItem(KEY) || '{}')); }
  catch (e) { return empty; }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

function owner(n) {
  if (S.fire.includes(n)) return 'fire';
  if (S.lions.includes(n)) return 'lions';
  if (S.unsold.includes(n)) return 'unsold';
  return null;
}

/* Tries 01.jpeg, 1.jpeg, 01.jpg, 01.png, then falls back to a placeholder */
function setPhoto(el, n) {
  const tries = [`images/${pad(n)}.jpeg`, `images/${n}.jpeg`, `images/${pad(n)}.jpg`, `images/${pad(n)}.png`];
  let i = 0;
  el.onerror = () => {
    i++;
    if (i < tries.length) el.src = tries[i];
    else { el.onerror = null; el.src = NO_PHOTO; }
  };
  el.src = tries[0];
}

function show(n) {
  n = Number(n);
  if (!Number.isInteger(n) || n < 1 || n > TOTAL) {
    alert(`Enter a player number from 1 to ${TOTAL}.`);
    return;
  }
  current = n;
  $('num').value = n;
  render();
}

function render() {
  const has = current !== null;
  $('empty').hidden = has;
  $('player').hidden = !has;
  if (has) {
    const own = owner(current);
    setPhoto($('cardImg'), current);
    $('player').className = 'player' + (own === 'fire' || own === 'lions' ? ' sold-' + own : '');
    const st = $('status');
    if (own === 'fire' || own === 'lions') {
      st.className = 'status';
      st.innerHTML = `Player ${current} – ${TEAMS[own].name}<img src="${TEAMS[own].logo}" alt="">`;
    } else if (own === 'unsold') {
      st.className = 'status unsold';
      st.textContent = `Player ${current} – unsold`;
    } else {
      st.className = 'status avail';
      st.textContent = `Player ${current} – available`;
    }
  }
  const taken = has && (owner(current) === 'fire' || owner(current) === 'lions');
  $('sellFire').disabled = !has || taken;
  $('sellLions').disabled = !has || taken;
  $('unsold').disabled = !has || owner(current) !== null;
  $('undo').disabled = S.log.length === 0;
  renderSquad('fire');
  renderSquad('lions');
}

function renderSquad(key) {
  const t = TEAMS[key], list = S[key];
  const box = $(key === 'fire' ? 'squadFire' : 'squadLions');
  box.innerHTML = `<img src="${t.logo}" alt=""><h2>${t.name}</h2><div class="count">${list.length} player${list.length === 1 ? '' : 's'}</div>`;
  if (!list.length) {
    box.insertAdjacentHTML('beforeend', '<p class="none">No players yet</p>');
    return;
  }
  const chips = document.createElement('div');
  chips.className = 'chips';
  list.forEach(n => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.title = `Show player ${n}`;
    const im = document.createElement('img');
    im.alt = '';
    setPhoto(im, n);
    b.append(im);
    b.insertAdjacentHTML('beforeend', `<b>${n}</b>`);
    b.onclick = () => show(n);
    chips.append(b);
  });
  box.append(chips);
}

function sell(key) {
  if (current === null || owner(current) === 'fire' || owner(current) === 'lions') return;
  S.unsold = S.unsold.filter(x => x !== current);
  S[key].push(current);
  S.log.push({ n: current, team: key });
  save();
  render();
  celebrate(key, current);
}

function celebrate(key, n) {
  const t = TEAMS[key], box = $('sold');
  box.style.setProperty('--glow', t.glow);
  box.innerHTML = `<img src="${t.logo}" alt=""><h3>${t.name}</h3><p>Player ${n} joins the squad</p>`;
  box.hidden = false;
  clearTimeout(soldTimer);
  soldTimer = setTimeout(() => { box.hidden = true; }, 3200);
}
$('sold').onclick = () => { $('sold').hidden = true; clearTimeout(soldTimer); };

function markUnsold() {
  if (current === null || owner(current) !== null) return;
  S.unsold.push(current);
  save();
  render();
}

function undo() {
  const last = S.log.pop();
  if (!last) return;
  S[last.team] = S[last.team].filter(x => x !== last.n);
  save();
  if (current === null) current = last.n;
  $('num').value = current;
  render();
}

function download() {
  const rows = ['Team,Player number'];
  ['fire', 'lions'].forEach(k => S[k].forEach(n => rows.push(`${TEAMS[k].name},${n}`)));
  S.unsold.forEach(n => rows.push(`Unsold,${n}`));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }));
  a.download = 'battle-of-brothers-squads.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

function resetAll() {
  if (!confirm('Clear both squads and start again? This cannot be undone.')) return;
  S = { fire: [], lions: [], unsold: [], log: [] };
  save();
  current = null;
  $('num').value = '';
  render();
}

function toggleStage(on) {
  document.body.classList.toggle('staged', on);
}

$('show').onclick = () => show($('num').value);
$('prev').onclick = () => show(Math.max(1, (current || 2) - 1));
$('next').onclick = () => show(Math.min(TOTAL, (current || 0) + 1));
$('sellFire').onclick = () => sell('fire');
$('sellLions').onclick = () => sell('lions');
$('unsold').onclick = markUnsold;
$('undo').onclick = undo;
$('csv').onclick = download;
$('reset').onclick = resetAll;
$('stage').onclick = () => toggleStage();
$('cardImg').onclick = () => { if ($('cardImg').requestFullscreen) $('cardImg').requestFullscreen(); };

$('num').addEventListener('keydown', e => { if (e.key === 'Enter') show($('num').value); });
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'f' || e.key === 'F') toggleStage();
  if (e.key === 'Escape') toggleStage(false);
  if (e.key === 'ArrowRight') $('next').click();
  if (e.key === 'ArrowLeft') $('prev').click();
});

render();
