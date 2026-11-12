/* ============================================================================
   Valorant Notes — main.js
   Panel/tab layout: each topic is a panel, switched via the sideways tab strip.
   Content rendered from data/content.json (loaded via js/data.js).
   ============================================================================ */

/* ---------------------------------------------------------------------------
   0. HELPERS
   --------------------------------------------------------------------------- */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let toastTimer = null;
function showToast(html, timeout = 4200) {
  const t = $('#toast');
  t.innerHTML = html;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), timeout);
}

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); resolve(); }
    catch (e) { reject(e); }
    finally { document.body.removeChild(ta); }
  });
}

/* Minimal inline markup: **bold** → <strong>, *italic* → <em>. Escapes HTML. */
function esc(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function md(str) {
  let s = esc(str);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return s;
}

/* ---------------------------------------------------------------------------
   1. RENDER CONTENT FROM JSON
   --------------------------------------------------------------------------- */
const DATA = window.SITE_DATA;

function renderList(spec) {
  const list = document.createElement(spec.style === 'ol' ? 'ol' : 'ul');
  if (spec.class) list.className = spec.class;
  (spec.items || []).forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = md(item.text);
    if (item.children) li.appendChild(renderList(item.children));
    list.appendChild(li);
  });
  return list;
}

function renderTable(spec) {
  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';
  if (spec.wrapId) wrap.id = spec.wrapId;

  const table = document.createElement('table');
  if (spec.id) table.id = spec.id;

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  spec.headers.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  spec.rows.forEach(row => {
    const tr = document.createElement('tr');
    row.forEach(cell => {
      const td = document.createElement('td');
      td.innerHTML = md(cell);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  wrap.appendChild(table);
  return wrap;
}

function renderBlock(block) {
  switch (block.type) {
    case 'heading': {
      const h3 = document.createElement('h3');
      if (block.id) h3.id = block.id;
      h3.innerHTML = md(block.text);
      return h3;
    }
    case 'list':
      return renderList(block);
    case 'table':
      return renderTable(block);
    case 'callout': {
      const div = document.createElement('div');
      div.className = 'callout' + (block.variant ? ' ' + block.variant : '');
      div.innerHTML = md(block.text);
      return div;
    }
    case 'para': {
      const p = document.createElement('p');
      p.innerHTML = md(block.text);
      return p;
    }
    case 'group': {
      const div = document.createElement('div');
      if (block.class) div.className = block.class;
      block.blocks.forEach(b => div.appendChild(renderBlock(b)));
      return div;
    }
    default: {
      const p = document.createElement('p');
      p.textContent = '[unknown block type: ' + block.type + ']';
      return p;
    }
  }
}

function renderMeta() {
  const m = DATA.meta || {};
  document.title = m.title || document.title;
  if (m.brand) $('#brand').textContent = m.brand;
  if (m.brandSub) $('#brandSub').textContent = m.brandSub;
  if (m.pageHeading) {
    $('#pageHeading').innerHTML = md(m.pageHeading) +
      (m.headingEmphasis ? '<em>' + md(m.headingEmphasis) + '</em>' : '');
  }
  if (m.intro) $('#pageIntro').textContent = m.intro;
  if (m.footer) $('#footerText').textContent = m.footer;
}

function renderPanels() {
  const container = $('#content');
  DATA.sections.forEach((sec, i) => {
    const panel = document.createElement('section');
    panel.id = sec.id;
    panel.className = 'panel';
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', 'tab-' + sec.id);

    const h2 = document.createElement('h2');
    h2.innerHTML = '<span class="num">' + String(i + 1).padStart(2, '0') + '</span>' + md(sec.title);
    panel.appendChild(h2);

    const body = document.createElement('div');
    body.className = 'panel-body';
    (sec.blocks || []).forEach(b => body.appendChild(renderBlock(b)));
    panel.appendChild(body);

    container.appendChild(panel);
  });
}

function renderTabs() {
  const strip = $('#tabs');
  DATA.sections.forEach((sec, i) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'tab';
    tab.id = 'tab-' + sec.id;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', sec.id);
    tab.dataset.panel = sec.id;

    const num = document.createElement('span');
    num.className = 'tab-num';
    num.textContent = String(i + 1).padStart(2, '0');

    const tick = document.createElement('span');
    tick.className = 'tab-tick';
    tick.textContent = '✓';
    tick.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.className = 'tab-label';
    label.textContent = sec.title;

    tab.appendChild(num);
    tab.appendChild(tick);
    tab.appendChild(label);

    tab.addEventListener('click', () => showPanel(sec.id));
    strip.appendChild(tab);
  });
}

if (!DATA || !Array.isArray(DATA.sections)) {
  document.getElementById('content').innerHTML =
    '<p class="callout">Content failed to load. Run <strong>scripts/build.sh</strong> to regenerate js/data.js from data/content.json.</p>';
} else {
  renderMeta();
  renderPanels();
  renderTabs();
}

/* ---------------------------------------------------------------------------
   2. PANEL SWITCHING
   --------------------------------------------------------------------------- */
const PANEL_KEY = 'valorant-notes-panel';
const panels = $$('#content .panel');
const tabs = $$('.tab');
const panelIds = panels.map(p => p.id);

let activeId = null;

function showPanel(id, scroll = true) {
  const panel = document.getElementById(id);
  if (!panel || !panel.classList.contains('panel')) return;

  activeId = id;
  panels.forEach(p => {
    const on = p.id === id;
    p.classList.toggle('active', on);
    p.setAttribute('aria-hidden', String(!on));
  });
  tabs.forEach(t => {
    const on = t.dataset.panel === id;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', String(on));
  });
  updatePanelNav();

  try { localStorage.setItem(PANEL_KEY, id); } catch (e) {}
  try { history.replaceState(null, '', '#' + id); } catch (e) {} // may throw on file://

  if (scroll) {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }

  const tab = document.getElementById('tab-' + id);
  if (tab) tab.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion ? 'auto' : 'smooth' });
}

function stepPanel(dir) {
  if (!activeId) return;
  const i = panelIds.indexOf(activeId);
  const next = panelIds[Math.min(Math.max(i + dir, 0), panelIds.length - 1)];
  if (next && next !== activeId) showPanel(next);
}

/* --- prev / next bar below every panel --- */
const panelNav = document.createElement('nav');
panelNav.className = 'panel-nav';
panelNav.setAttribute('aria-label', 'Topic navigation');

const prevBtn = document.createElement('button');
prevBtn.type = 'button';
prevBtn.className = 'pn-btn pn-prev';
prevBtn.innerHTML = '&larr; <span class="pn-prev-label">Prev</span>';
prevBtn.addEventListener('click', () => stepPanel(-1));

const posEl = document.createElement('span');
posEl.className = 'pn-pos';

const nextBtn = document.createElement('button');
nextBtn.type = 'button';
nextBtn.className = 'pn-btn pn-next';
nextBtn.innerHTML = '<span class="pn-next-label">Next</span> &rarr;';
nextBtn.addEventListener('click', () => stepPanel(1));

panelNav.appendChild(prevBtn);
panelNav.appendChild(posEl);
panelNav.appendChild(nextBtn);
$('#content').after(panelNav);

function updatePanelNav() {
  const i = panelIds.indexOf(activeId);
  const sections = DATA && DATA.sections ? DATA.sections : [];
  prevBtn.disabled = i <= 0;
  nextBtn.disabled = i >= panelIds.length - 1;
  const prevTitle = sections[i - 1] ? sections[i - 1].title : 'Prev';
  const nextTitle = sections[i + 1] ? sections[i + 1].title : 'Next';
  prevBtn.querySelector('.pn-prev-label').textContent = prevTitle;
  nextBtn.querySelector('.pn-next-label').textContent = nextTitle;
  posEl.textContent = String(i + 1).padStart(2, '0') + ' / ' + panelIds.length;
}

/* initial panel: hash > saved > first */
(function initPanel() {
  if (!panels.length) return;
  const hashId = location.hash ? location.hash.slice(1) : null;
  let saved = null;
  try { saved = localStorage.getItem(PANEL_KEY); } catch (e) {}
  const start =
    (hashId && panelIds.includes(hashId)) ? hashId :
    (saved && panelIds.includes(saved)) ? saved :
    panelIds[0];
  showPanel(start, false);
})();

/* ---------------------------------------------------------------------------
   3. TOPIC DONE TRACKER (follow-along checklist)
   --------------------------------------------------------------------------- */
const TOPIC_KEY = 'valorant-notes-topics';
let doneSet;
try { doneSet = new Set(JSON.parse(localStorage.getItem(TOPIC_KEY) || '[]')); }
catch (e) { doneSet = new Set(); }

function saveTopics() {
  try { localStorage.setItem(TOPIC_KEY, JSON.stringify(Array.from(doneSet))); } catch (e) {}
}

function updateTopicStats() {
  const total = panels.length;
  const done = panels.filter(p => p.classList.contains('topic-done')).length;

  const chip = $('#topicsStat');
  if (chip) chip.querySelector('b').textContent = done + '/' + total;

  tabs.forEach(t => t.classList.toggle('done', doneSet.has(t.dataset.panel)));

  if (total && done === total) {
    showToast('<span class="toast-tag">Manual complete</span>Every topic checked off. Now go take an off-angle nobody expects. 🏆', 6500);
  }
}

panels.forEach((panel) => {
  const h2 = panel.querySelector('h2');
  if (!h2) return;

  /* --- "learned & done" checkbox --- */
  const doneWrap = document.createElement('label');
  doneWrap.className = 'done-check';
  doneWrap.title = 'Mark this topic as learned & done';

  const doneCb = document.createElement('input');
  doneCb.type = 'checkbox';
  doneCb.checked = doneSet.has(panel.id);
  doneCb.setAttribute('aria-label', 'Mark "' + panel.id + '" as learned and done');

  const doneText = document.createElement('span');
  doneText.textContent = 'Done';

  doneWrap.appendChild(doneCb);
  doneWrap.appendChild(doneText);
  panel.classList.toggle('topic-done', doneCb.checked);

  doneCb.addEventListener('change', () => {
    if (doneCb.checked) doneSet.add(panel.id);
    else doneSet.delete(panel.id);
    panel.classList.toggle('topic-done', doneCb.checked);
    saveTopics();
    updateTopicStats();
  });

  /* --- copy-link button --- */
  const actions = document.createElement('span');
  actions.className = 'h2-actions';

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'icon-btn copy-link';
  copyBtn.title = 'Copy link to this topic';
  copyBtn.setAttribute('aria-label', 'Copy link to this topic');
  copyBtn.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>' +
    '<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>' +
    '</svg>';
  copyBtn.addEventListener('click', () => {
    const url = location.origin + location.pathname + location.search + '#' + panel.id;
    copyText(url)
      .then(() => showToast('<span class="toast-tag">Link copied</span>#' + panel.id))
      .catch(() => showToast('Could not copy — your browser blocked clipboard access.'));
  });

  actions.appendChild(copyBtn);
  h2.appendChild(doneWrap);
  h2.appendChild(actions);
});

updateTopicStats();

/* ---------------------------------------------------------------------------
   4. THEME
   --------------------------------------------------------------------------- */
const THEME_KEY = 'valorant-notes-theme';
const themeIcon = $('#themeIcon');

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeIcon.textContent = theme === 'light' ? '☀️' : '🌙';
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
}

(function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(saved || (prefersLight ? 'light' : 'dark'));
})();

$('#themeToggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'light' ? 'dark' : 'light');
});

/* ---------------------------------------------------------------------------
   5. READING PROGRESS + BACK TO TOP + FAB
   --------------------------------------------------------------------------- */
const progressFill = $('#progressFill');
const backToTop = $('#backToTop');

function onScroll() {
  const doc = document.documentElement;
  const max = doc.scrollHeight - doc.clientHeight;
  const pct = max > 0 ? Math.min(100, (doc.scrollTop / max) * 100) : 0;
  progressFill.style.width = pct + '%';
  backToTop.classList.toggle('show', doc.scrollTop > 500);
}
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);
onScroll();

backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
});

/* ---------------------------------------------------------------------------
   6. SEARCH WITH HIGHLIGHT (searches all panels, jumps to first match)
   --------------------------------------------------------------------------- */
const searchInput = $('#search');
const searchCount = $('#searchCount');
const contentRoot = $('main');
const MIN_QUERY = 2;
let searchDebounce = null;

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function clearHighlights() {
  $$('mark.search-hit', contentRoot).forEach(mark => {
    const textNode = document.createTextNode(mark.textContent);
    mark.parentNode.replaceChild(textNode, mark);
    textNode.parentNode.normalize();
  });
  tabs.forEach(t => t.classList.remove('search-dim'));
}

function performSearch(rawQuery) {
  clearHighlights();

  const query = rawQuery.trim();
  if (query.length < MIN_QUERY) {
    searchCount.textContent = '';
    return;
  }

  const regex = new RegExp(escapeRegExp(query), 'gi');
  let firstHitPanel = null;
  let hitCount = 0;

  panels.forEach(panel => {
    /* collect matching text nodes first (mutating while walking is unsafe) */
    const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (node.parentElement && node.parentElement.closest('mark.search-hit, script, style, .done-check, .h2-actions')) {
          return NodeFilter.FILTER_REJECT;
        }
        regex.lastIndex = 0;
        return regex.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });

    const matches = [];
    let n;
    while ((n = walker.nextNode())) matches.push(n);

    matches.forEach(textNode => {
      const text = textNode.nodeValue;
      const frag = document.createDocumentFragment();
      let lastIndex = 0;
      let m;
      regex.lastIndex = 0;

      while ((m = regex.exec(text)) !== null) {
        if (m.index > lastIndex) {
          frag.appendChild(document.createTextNode(text.slice(lastIndex, m.index)));
        }
        const mark = document.createElement('mark');
        mark.className = 'search-hit';
        mark.textContent = m[0];
        frag.appendChild(mark);
        lastIndex = m.index + m[0].length;
        if (m[0].length === 0) regex.lastIndex++;
      }

      if (lastIndex < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex)));
      }

      textNode.parentNode.replaceChild(frag, textNode);
    });

    const hits = panel.querySelectorAll('mark.search-hit').length;
    hitCount += hits;
    if (hits && !firstHitPanel) firstHitPanel = panel.id;
  });

  /* dim tabs with no hits */
  tabs.forEach(t => t.classList.toggle('search-dim', !panelHasHits(t.dataset.panel)));

  if (firstHitPanel && firstHitPanel !== activeId) {
    showPanel(firstHitPanel);
  }

  searchCount.textContent = hitCount ? hitCount + (hitCount === 1 ? ' hit' : ' hits') : 'no hits';
}

function panelHasHits(id) {
  const panel = document.getElementById(id);
  return panel && panel.querySelector('mark.search-hit');
}

searchInput.addEventListener('input', (e) => {
  clearTimeout(searchDebounce);
  const value = e.target.value;
  searchDebounce = setTimeout(() => performSearch(value), 140);
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    searchInput.value = '';
    performSearch('');
    searchInput.blur();
  }
});

/* ---------------------------------------------------------------------------
   7. KEYBOARD SHORTCUTS
   --------------------------------------------------------------------------- */
document.addEventListener('keydown', (e) => {
  const active = document.activeElement;
  const typing = active && (
    active.tagName === 'INPUT' ||
    active.tagName === 'TEXTAREA' ||
    active.isContentEditable
  );

  if (e.key === '/' && !typing) {
    e.preventDefault();
    searchInput.focus();
    searchInput.select();
    return;
  }

  if (e.key === 'Escape') {
    if (typing && active === searchInput) {
      searchInput.blur();
      return;
    }
    const toast = $('#toast');
    if (toast.classList.contains('show')) toast.classList.remove('show');
    return;
  }

  if ((e.key === 't' || e.key === 'T') && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
    e.preventDefault();
    showRandomTip();
    return;
  }

  if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
    e.preventDefault();
    stepPanel(e.key === 'ArrowRight' ? 1 : -1);
  }
});

/* ---------------------------------------------------------------------------
   8. RANDOM TIP
   --------------------------------------------------------------------------- */
const tipPool = $$('#core li, #movement li, #numbers li, #utility li, #mentality li')
  .map(li => li.textContent.replace(/\s+/g, ' ').trim())
  .filter(text => text.length > 40);

function showRandomTip() {
  if (!tipPool.length) return;
  const tip = tipPool[Math.floor(Math.random() * tipPool.length)];
  showToast('<span class="toast-tag">Random tip</span>' + tip, 7000);
}

$('#randomTip').addEventListener('click', showRandomTip);

/* ---------------------------------------------------------------------------
   9. RANK MASTERY TRACKER
   --------------------------------------------------------------------------- */
(function initRankTracker() {
  const RANK_KEY = 'valorant-notes-ranks';
  const table = $('#ranksTable');
  const wrap = $('#ranksTableWrap');
  if (!table || !wrap) return;

  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));
  if (!rows.length) return;

  const meter = document.createElement('div');
  meter.className = 'rank-meter';
  meter.innerHTML =
    '<div class="rank-meter-track"><div class="rank-meter-fill" id="rankFill"></div></div>' +
    '<span id="rankLabel">0 / ' + rows.length + ' mastered</span>';
  wrap.parentNode.insertBefore(meter, wrap);

  const rankFill = $('#rankFill');
  const rankLabel = $('#rankLabel');

  const headRow = table.querySelector('thead tr');
  const checkTh = document.createElement('th');
  checkTh.textContent = '✓';
  checkTh.style.width = '46px';
  checkTh.style.textAlign = 'center';
  headRow.insertBefore(checkTh, headRow.firstChild);

  let saved = [];
  try { saved = JSON.parse(localStorage.getItem(RANK_KEY) || '[]'); } catch (e) { saved = []; }
  const savedSet = new Set(Array.isArray(saved) ? saved : []);

  const checkboxes = [];

  rows.forEach(row => {
    const rankName = row.cells[0].textContent.trim();

    const cell = document.createElement('td');
    cell.className = 'rank-check';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = savedSet.has(rankName);
    cb.setAttribute('aria-label', 'Mark ' + rankName + ' as mastered');

    if (cb.checked) row.classList.add('rank-done');

    cb.addEventListener('change', () => {
      if (cb.checked) savedSet.add(rankName);
      else savedSet.delete(rankName);

      row.classList.toggle('rank-done', cb.checked);

      try { localStorage.setItem(RANK_KEY, JSON.stringify(Array.from(savedSet))); } catch (e) {}

      updateMeter();

      if (cb.checked && savedSet.size === rows.length) {
        showToast('<span class="toast-tag">All ranks mastered</span>Every rank unlocked. Now go take an off-angle nobody expects. 🏆', 6500);
      }
    });

    cell.appendChild(cb);
    row.insertBefore(cell, row.firstChild);
    checkboxes.push(cb);
  });

  function updateMeter() {
    const total = rows.length;
    const done = checkboxes.filter(cb => cb.checked).length;
    rankFill.style.width = (total ? (done / total) * 100 : 0) + '%';
    rankLabel.textContent = done + ' / ' + total + ' mastered';
  }

  updateMeter();
})();

/* ---------------------------------------------------------------------------
   10. PRINT BUTTON
   --------------------------------------------------------------------------- */
$('#printBtn').addEventListener('click', () => {
  window.print();
});

/* ---------------------------------------------------------------------------
   11. HEADER STATS
   --------------------------------------------------------------------------- */
(function buildStats() {
  const statsEl = $('#stats');
  if (!statsEl || !DATA) return;

  /* count words across ALL panels (from JSON, not the single visible DOM panel) */
  function collectText(node, acc) {
    if (typeof node === 'string') { acc.push(node); return; }
    if (Array.isArray(node)) { node.forEach(n => collectText(n, acc)); return; }
    if (node && typeof node === 'object') {
      Object.keys(node).forEach(k => {
        if (k === 'type' || k === 'id' || k === 'wrapId' || k === 'style' || k === 'class' || k === 'variant') return;
        collectText(node[k], acc);
      });
    }
  }
  const texts = [];
  DATA.sections.forEach(sec => {
    texts.push(sec.title);
    collectText(sec.blocks, texts);
  });
  const wordCount = texts.join(' ').match(/\S+/g).length;
  const readMinutes = Math.max(1, Math.round(wordCount / 220));

  const principleCount = $$('#core ol.rules > li').length;

  const gunTables = $$('#gunplay table');
  const gunsTable = gunTables.length ? gunTables[gunTables.length - 1] : null;
  const gunCount = gunsTable ? gunsTable.querySelectorAll('tbody tr').length : 0;

  const rankCount = $$('#ranksTable tbody tr').length;

  const items = [
    ['principles', principleCount],
    ['guns', gunCount],
    ['ranks', rankCount],
    ['min read', readMinutes]
  ];

  statsEl.innerHTML =
    '<span class="stat" id="topicsStat">topics done <b>0/' + panels.length + '</b></span>' +
    items
      .map(([label, value]) => '<span class="stat">' + label + ' <b>' + value + '</b></span>')
      .join('');
})();
