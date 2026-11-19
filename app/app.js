// Leonida Trophy Guide: checklist, roadmap and cited guides for GTA VI on PS5.
// Progress and settings live in localStorage; the app fetches nothing but its own
// data file and makes no network request at run time.
const STORE_KEY = 'gta6-trophy-progress-v1';
const SETTINGS_KEY = 'gta6-trophy-settings-v1';
const KINDS = ['all', 'story', 'collectibles', 'activities', 'robbery', 'world', 'platinum', 'missable', 'online'];
const KIND_LABELS = {
  all: 'All kinds', story: 'Story', collectibles: 'Collectibles', activities: 'Activities',
  robbery: 'Robbery', world: 'World', platinum: 'Platinum', missable: 'Missable', online: 'Online',
};
const GRADE_LABELS = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };

const params = new URLSearchParams(location.search);
const demoEarned = new Set(
  (params.get('demo') ?? '').startsWith('earned:')
    ? params.get('demo').slice('earned:'.length).split(',').map(Number).filter((n) => n >= 1 && n <= 55)
    : [],
);

let doc = null;
let earned = new Set();
let settings = { spoiler: false };
let activeKind = KINDS.includes(params.get('kind')) ? params.get('kind') : 'all';
let openTrophy = params.get('trophy') ? Number(params.get('trophy')) : null;

const $ = (id) => document.getElementById(id);

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]');
    earned = new Set((Array.isArray(saved) ? saved : []).filter((n) => Number.isInteger(n) && n >= 1 && n <= 55));
  } catch { earned = new Set(); }
  try {
    settings = { spoiler: false, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') };
  } catch { settings = { spoiler: false }; }
  if (params.get('spoiler') === 'on') settings.spoiler = true;
  if (params.get('spoiler') === 'off') settings.spoiler = false;
  for (const id of demoEarned) earned.add(id);
}

function saveState() {
  const real = [...earned].filter((id) => !demoEarned.has(id));
  localStorage.setItem(STORE_KEY, JSON.stringify(real.sort((a, b) => a - b)));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function isEarned(trophy) {
  return earned.has(trophy.id);
}

function isSpoilerHidden(trophy) {
  return settings.spoiler && trophy.hidden && !isEarned(trophy);
}

function trophyMatches(trophy) {
  const q = $('search').value.trim().toLowerCase();
  if (q) {
    const hay = `${trophy.name} ${trophy.description} ${trophy.guide}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  const grade = $('grade').value;
  if (grade !== 'all' && trophy.grade !== grade) return false;
  if (activeKind === 'online') return false;
  if (activeKind === 'missable' && !trophy.missable) return false;
  if (activeKind !== 'all' && activeKind !== 'missable' && trophy.kind !== activeKind) return false;
  if ($('missableOnly').checked && !trophy.missable) return false;
  if ($('earnedOnly').checked && !isEarned(trophy)) return false;
  return true;
}

function renderProgress() {
  const total = doc.trophies.length;
  const done = doc.trophies.filter(isEarned).length;
  $('earnedCount').textContent = String(done);
  $('progressFill').style.width = `${(done / total) * 100}%`;
  $('progressBar').setAttribute('aria-valuenow', String(done));
  $('progressLine').textContent = done === total
    ? '100% — platinum earned. You are a Leonida Legend.'
    : `${Math.round((done / total) * 100)}% — the platinum is ${total - done} trophies away.`;
  $('gradeCounts').replaceChildren(...['platinum', 'gold', 'silver', 'bronze'].map((grade) => {
    const li = document.createElement('li');
    const have = doc.trophies.filter((t) => t.grade === grade && isEarned(t)).length;
    const all = doc.trophies.filter((t) => t.grade === grade).length;
    li.textContent = `${GRADE_LABELS[grade]} ${have}/${all}`;
    return li;
  }));
}

function tag(text, cls) {
  const span = document.createElement('span');
  span.className = `tag ${cls}`;
  span.textContent = text;
  return span;
}

function renderList() {
  const list = $('trophyList');
  list.replaceChildren();
  const shown = doc.trophies.filter(trophyMatches);
  $('countLine').textContent = activeKind === 'online'
    ? 'Online: 0 trophies. There are no online trophies at launch — everything here unlocks in single player.'
    : `Showing ${shown.length} of ${doc.trophies.length} trophies.`;
  $('emptyNote').hidden = shown.length > 0;
  for (const trophy of shown) {
    const item = document.createElement('li');
    item.className = `card${isEarned(trophy) ? ' earned' : ''}`;
    item.id = `trophy-${trophy.id}`;

    const top = document.createElement('div');
    top.className = 'card-top';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = isEarned(trophy);
    box.setAttribute('aria-label', `Mark ${trophy.name} earned`);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(trophy.id);
      else earned.delete(trophy.id);
      saveState();
      renderProgress();
      renderList();
      renderRoadmap();
    });
    top.append(box);

    const body = document.createElement('div');
    const name = document.createElement('p');
    name.className = 'card-name';
    const desc = document.createElement('p');
    desc.className = 'card-desc';
    if (isSpoilerHidden(trophy)) {
      name.textContent = 'Hidden story trophy';
      name.classList.add('spoiler-hidden');
      desc.textContent = 'Hidden until earned — tick it off to reveal it.';
    } else {
      name.textContent = trophy.name;
      desc.textContent = trophy.description;
    }
    body.append(name, desc);

    const tags = document.createElement('div');
    tags.className = 'card-tags';
    tags.append(tag(GRADE_LABELS[trophy.grade], `grade-${trophy.grade}`));
    // The platinum kind duplicates the grade tag on those two trophies, so skip it there.
    if (trophy.kind !== 'platinum') tags.append(tag(KIND_LABELS[trophy.kind] ?? trophy.kind, ''));
    if (trophy.hidden) tags.append(tag('Hidden on PSN', 'hidden-tag'));
    if (trophy.missable) tags.append(tag('Possibly missable', 'missable'));
    if (trophy.count != null) tags.append(tag(`Count: ${trophy.count.toLocaleString()}`, ''));
    body.append(tags);

    const details = document.createElement('details');
    details.open = openTrophy === trophy.id;
    const summary = document.createElement('summary');
    summary.textContent = 'Guide';
    details.append(summary);
    if (isSpoilerHidden(trophy)) {
      const hidden = document.createElement('p');
      hidden.className = 'spoiler-hidden';
      hidden.textContent = 'Guide hidden until earned (spoiler-free mode is on).';
      details.append(hidden);
    } else {
      const guide = document.createElement('p');
      guide.className = 'guide';
      guide.textContent = trophy.guide;
      details.append(guide);
      if (trophy.missable && trophy.missableNote) {
        const note = document.createElement('p');
        note.className = 'missable-note';
        note.textContent = trophy.missableNote;
        details.append(note);
      }
      const sourceTitle = document.createElement('p');
      sourceTitle.textContent = 'Sources:';
      const sources = document.createElement('ul');
      sources.className = 'source-links';
      for (const source of trophy.sources) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = source.url;
        a.textContent = source.name;
        a.rel = 'noopener';
        li.append(a);
        sources.append(li);
      }
      details.append(sourceTitle, sources);
    }
    body.append(details);
    top.append(body);
    item.append(top);
    list.append(item);
  }
}

function renderRoadmap() {
  const host = $('roadmapStages');
  host.replaceChildren();
  for (const stage of doc.roadmap) {
    const article = document.createElement('article');
    article.className = 'stage';
    const heading = document.createElement('h3');
    heading.textContent = `Stage ${stage.stage} — ${stage.title}`;
    const text = document.createElement('p');
    text.textContent = stage.text;
    const list = document.createElement('ul');
    for (const id of stage.trophies) {
      const trophy = doc.trophies.find((t) => t.id === id);
      const li = document.createElement('li');
      li.textContent = isSpoilerHidden(trophy) ? 'Hidden story trophy' : trophy.name;
      if (isEarned(trophy)) li.className = 'done';
      list.append(li);
    }
    article.append(heading, text, list);
    host.append(article);
  }
}

function renderSources() {
  const host = $('sourceList');
  host.replaceChildren();
  for (const source of doc.sources) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = source.url;
    a.textContent = source.name;
    a.rel = 'noopener';
    li.append(a, document.createTextNode(` — ${source.supports}`));
    host.append(li);
  }
}

function renderKindChips() {
  const host = $('kindChips');
  host.replaceChildren();
  for (const kind of KINDS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `chip${kind === activeKind ? ' active' : ''}`;
    button.textContent = KIND_LABELS[kind];
    button.setAttribute('aria-pressed', String(kind === activeKind));
    button.addEventListener('click', () => {
      activeKind = kind;
      renderKindChips();
      renderList();
    });
    host.append(button);
  }
}

function setView(view) {
  for (const button of document.querySelectorAll('.tab')) {
    const on = button.dataset.view === view;
    button.classList.toggle('active', on);
    if (on) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  }
  $('view-checklist').hidden = view !== 'checklist';
  $('view-roadmap').hidden = view !== 'roadmap';
  $('view-sources').hidden = view !== 'sources';
}

function exportProgress() {
  const payload = {
    game: 'Grand Theft Auto VI',
    platform: 'PlayStation 5',
    exportedAt: new Date().toISOString(),
    earned: [...earned].filter((id) => !demoEarned.has(id)).sort((a, b) => a - b),
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importProgress(file) {
  try {
    const data = JSON.parse(await file.text());
    const ids = Array.isArray(data) ? data : data.earned;
    if (!Array.isArray(ids)) throw new Error('no earned list');
    const next = new Set(ids.filter((n) => Number.isInteger(n) && n >= 1 && n <= 55));
    for (const id of demoEarned) next.add(id);
    earned = next;
    saveState();
    renderProgress();
    renderList();
    renderRoadmap();
  } catch {
    alert('That file is not a trophy-progress export from this guide.');
  }
}

async function boot() {
  const response = await fetch('data/trophies.json');
  doc = await response.json();
  loadState();
  $('spoiler').checked = settings.spoiler;
  renderKindChips();
  renderProgress();
  renderList();
  renderRoadmap();
  renderSources();

  $('search').addEventListener('input', renderList);
  $('grade').addEventListener('change', renderList);
  $('missableOnly').addEventListener('change', renderList);
  $('earnedOnly').addEventListener('change', renderList);
  $('spoiler').addEventListener('change', (event) => {
    settings.spoiler = event.target.checked;
    saveState();
    renderList();
    renderRoadmap();
  });
  $('export').addEventListener('click', exportProgress);
  $('import').addEventListener('change', (event) => {
    if (event.target.files[0]) importProgress(event.target.files[0]);
    event.target.value = '';
  });
  for (const button of document.querySelectorAll('.tab')) {
    button.addEventListener('click', () => setView(button.dataset.view));
  }

  const initialView = params.get('view');
  if (initialView === 'roadmap' || initialView === 'sources') setView(initialView);
  if (openTrophy) {
    const card = document.getElementById(`trophy-${openTrophy}`);
    if (card) card.scrollIntoView({ block: 'start' });
  }
  window.__shotReady = true;
}

boot();
