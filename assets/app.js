/* =========================================================
   Zeszyt Marki — logika
   Dane żyją wyłącznie w localStorage tej przeglądarki.
   ========================================================= */
(function () {
'use strict';

const KEY = 'zeszyt-marki-v1';
const UNLOCK_KEY = KEY + ':unlocked';

/* Kod dostępu. W pliku leży wyłącznie skrót SHA-256 z posolonego kodu —
   samego kodu nie da się z niego odczytać. To zapora przed przypadkowym
   wejściem, nie zabezpieczenie kryptograficzne: strona jest publiczna,
   więc kod można obejść, edytując skrypt u siebie. Chroni to, że nikt
   postronny nie otworzy zeszytu — nie to, że nikt nie przeczyta kodu strony. */
const PIN_SALT = 'zeszyt-marki::';
const PIN_HASH = '96f2f30449aff4b7ccb92c743e7b76639eddd9f8c258b6af4dee7b7861b1e063';

let S = null;              // { v, created, updated, data }
let current = 0;           // indeks modułu
let dirty = false;
let saveTimer = null;

/* ---------- drobiazgi ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

function el(tag, attrs, kids) {
  const n = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  (kids || []).forEach(c => { if (c) n.appendChild(c); });
  return n;
}

/* Pokazywanie i ukrywanie nie może zależeć wyłącznie od arkusza stylów.
   Ustawiamy i atrybut `hidden`, i `style.display` — wtedy strona zachowuje się
   poprawnie nawet przy niewczytanym albo starym CSS (patrz: cache GitHub Pages). */
function setShown(node, on) {
  if (!node) return;
  node.hidden = !on;
  node.style.display = on ? '' : 'none';
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  setShown(t, true);
  clearTimeout(t._t);
  t._t = setTimeout(() => setShown(t, false), 2600);
}

const today = () => new Date().toISOString().slice(0, 10);
const slug = s => String(s || 'klient').toLowerCase()
  .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e').replace(/ł/g, 'l').replace(/ń/g, 'n')
  .replace(/ó/g, 'o').replace(/ś/g, 's').replace(/[żź]/g, 'z')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'klient';

/* ---------- stan ---------- */
function blank(name) {
  return {
    v: 1, created: new Date().toISOString(), updated: new Date().toISOString(),
    data: { klient: name || '', data_start: today(), problemy: [], legendy: [{}, {}, {}], idee: {} }
  };
}
function load() { try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
function save() {
  if (!S) return;
  S.updated = new Date().toISOString();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* np. tryb prywatny */ }
  dirty = false;
  const ss = $('#savestate');
  if (ss) { ss.dataset.dirty = '0'; ss.textContent = 'zapisano ' + new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }); }
}
function touch() {
  dirty = true;
  const ss = $('#savestate');
  if (ss) { ss.dataset.dirty = '1'; ss.textContent = 'zapisywanie…'; }
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 700);
}
const D = () => S.data;

/* ---------- linter ---------- */
function forbidden() {
  const l = D().jez_nie;
  return Array.isArray(l) ? l.map(x => String(x || '').trim()).filter(x => x.length > 2) : [];
}
function lintHits(text) {
  const t = String(text || '').toLowerCase();
  if (!t.trim()) return [];
  return forbidden().filter(w => t.includes(w.toLowerCase()));
}
function lintNode(getText) {
  const box = el('div', { class: 'lint', hidden: true, style: 'display:none' });
  const upd = () => {
    const hits = lintHits(getText());
    if (hits.length) {
      box.innerHTML = 'Słowa z listy <b>NIE UŻYWAMY</b>: ' + hits.map(h => '„' + h + '”').join(', ');
      setShown(box, true);
    } else setShown(box, false);
  };
  box._upd = upd;
  upd();
  return box;
}

/* ---------- widoczność warunkowa ---------- */
function visible(f) {
  if (!f.showIf) return true;
  const v = D()[f.showIf.k];
  return f.showIf.v.includes(v || '');
}

/* ---------- status modułów ---------- */
function critResults(mod) {
  const d = D();
  return (mod.crit || []).map(c => {
    let ok;
    if (c.lintCheck) ok = c.lintCheck.every(k => lintHits(d[k]).length === 0);
    else { try { ok = !!c.test(d); } catch (e) { ok = false; } }
    return { label: c.label, ok };
  });
}
function modHasData(mod) {
  const d = D();
  let any = false;
  mod.sections.forEach(s => s.fields.forEach(f => {
    const v = d[f.k];
    if (f.t === 'problems') any = any || (Array.isArray(v) && v.some(p => String(p.text || '').trim()));
    else if (f.t === 'legends') any = any || (Array.isArray(v) && v.some(l => Object.values(l || {}).some(x => String(x || '').trim())));
    else if (f.t === 'ideas') any = any || Object.values(v || {}).some(o => Object.values(o || {}).some(x => String(x || '').trim()));
    else if (Array.isArray(v)) any = any || v.some(x => Array.isArray(x) ? x.some(y => String(y || '').trim()) : String(x || '').trim());
    else any = any || String(v || '').trim().length > 0;
  }));
  return any;
}
function lockedFrom() {
  // zwraca indeks pierwszego modułu, od którego dalej jest zablokowane (albo -1)
  for (let i = 0; i < SCHEMA.length; i++) {
    const m = SCHEMA[i];
    if (!m.gateKey) continue;
    const v = D()[m.gateKey] || '';
    if (m.gateBlockValues.includes(v)) return i + 1;
  }
  return -1;
}
function modStatus(i) {
  const lf = lockedFrom();
  if (lf !== -1 && i >= lf) return 'lock';
  const mod = SCHEMA[i];
  const r = critResults(mod);
  if (r.length && r.every(x => x.ok)) return 'done';
  if (modHasData(mod)) return 'part';
  return 'empty';
}

/* =========================================================
   Nawigacja
   ========================================================= */
function renderNav() {
  const nav = $('#nav');
  nav.innerHTML = '';
  nav.appendChild(el('p', { class: 'nav__head', text: 'Moduły' }));

  const lf = lockedFrom();
  let doneCount = 0;

  SCHEMA.forEach((m, i) => {
    const st = modStatus(i);
    if (st === 'done') doneCount++;
    const labels = { empty: 'nierozpoczęty', part: 'w toku', done: 'gotowy', lock: 'zablokowany' };
    const btn = el('button', {
      class: 'nav__item', type: 'button',
      'aria-current': i === current ? 'true' : 'false',
      onclick: () => { go(i); closeNav(); }
    }, [
      el('span', { class: 'nav__num', text: m.num }),
      el('span', { class: 'nav__body' }, [
        el('span', { class: 'nav__title', text: m.title }),
        el('span', { class: 'nav__meta' }, [
          el('i', { class: 'dot dot--' + (st === 'done' ? 'done' : st === 'part' ? 'part' : st === 'lock' ? 'lock' : '') }),
          el('span', { text: labels[st] })
        ])
      ])
    ]);
    nav.appendChild(btn);
  });

  nav.appendChild(el('hr', { class: 'nav__rule' }));
  const pct = Math.round(doneCount / SCHEMA.length * 100);
  nav.appendChild(el('div', { class: 'nav__progress' }, [
    el('div', { class: 'nav__bar' }, [el('i', { style: 'width:' + pct + '%' })]),
    el('p', { class: 'nav__pct', text: doneCount + ' z ' + SCHEMA.length + ' modułów gotowych' })
  ]));

  if (lf !== -1) {
    nav.appendChild(el('p', { class: 'nav__pct', style: 'padding:.6rem;color:var(--stop)', text: SCHEMA[lf - 1].gateBlockMsg }));
  }
}

function closeNav() { $('#nav').dataset.open = '0'; setShown($('#nav-scrim'), false); }

/* =========================================================
   Pola
   ========================================================= */
function labelBlock(f) {
  const frag = document.createDocumentFragment();
  if (f.q) frag.appendChild(el('p', { class: 'field__q', text: f.q }));
  if (f.sub) frag.appendChild(el('p', { class: 'field__sub', text: f.sub }));
  return frag;
}

function asideBlock(f) {
  if (!f.hint && !f.ex) return null;
  const box = el('div', { class: 'aside' });
  if (f.hint) box.appendChild(el('details', { class: 'disc' }, [
    el('summary', { text: 'Ściąga prowadzącego' }),
    el('div', { class: 'disc__body' }, [el('p', { text: f.hint })])
  ]));
  if (f.ex) box.appendChild(el('details', { class: 'disc disc--ex' }, [
    el('summary', { text: 'Przykład' }),
    el('div', { class: 'disc__body' }, [el('p', { text: f.ex })])
  ]));
  return box;
}

function bindText(node, key, onInput) {
  node.value = D()[key] || '';
  node.addEventListener('input', () => {
    D()[key] = node.value;
    touch();
    if (onInput) onInput();
    scheduleSoftRefresh();
  });
}

let softTimer = null;
function scheduleSoftRefresh() {
  clearTimeout(softTimer);
  softTimer = setTimeout(() => { renderCrit(); renderNav(); }, 500);
}

function fieldNode(f) {
  const wrap = el('div', { class: 'field' });

  if (f.t === 'preview') {
    const q = el('blockquote', { style: 'font-family:var(--serif);font-size:1.15rem;line-height:1.5;border-left:2px solid var(--accent);padding-left:1rem;margin:1rem 0;color:var(--ink)' });
    const upd = () => {
      const d = D();
      q.textContent = 'Wierzę, że ' + (d.zd_odbiorca || '…') + ' chcący ' + (d.zd_pragnienie || '…') +
        ' powinni ' + (d.zd_przekonanie || '…') + ', a nie ' + (d.zd_zamiast || '…') + '.';
    };
    upd();
    wrap._preview = upd;
    wrap.appendChild(el('p', { class: 'field__label', text: 'Zdanie pozycjonujące' }));
    wrap.appendChild(q);
    return wrap;
  }

  wrap.appendChild(labelBlock(f));

  if (f.t === 'text' || f.t === 'textarea') {
    const n = f.t === 'text'
      ? el('input', { type: 'text', class: 'input', placeholder: f.ph || '' })
      : el('textarea', { class: 'textarea', rows: f.rows || 3, placeholder: f.ph || '' });
    let lint = null;
    bindText(n, f.k, () => {
      if (lint) lint._upd();
      $$('.field').forEach(x => { if (x._preview) x._preview(); });
    });
    wrap.appendChild(n);
    if (f.lint) { lint = lintNode(() => n.value); wrap.appendChild(lint); }
  }

  else if (f.t === 'choice' || f.t === 'gate') {
    const isGate = f.t === 'gate';
    const box = isGate ? el('div', { class: 'gatebox' }) : el('div');
    if (isGate) {
      box.appendChild(el('p', { class: 'gatebox__title', text: 'Punkt decyzyjny' }));
      if (f.note) box.appendChild(el('p', { class: 'gatebox__note', text: f.note }));
    } else if (f.note) {
      box.appendChild(el('details', { class: 'disc', style: 'margin-bottom:.6rem' }, [
        el('summary', { text: 'Ściąga prowadzącego' }),
        el('div', { class: 'disc__body' }, [el('p', { text: f.note })])
      ]));
    }
    const radios = el('div', { class: 'radios' });
    f.options.forEach(o => {
      const id = f.k + '_' + o.v;
      const inp = el('input', { type: 'radio', name: f.k, id: id, value: o.v });
      if (D()[f.k] === o.v) inp.checked = true;
      inp.addEventListener('change', () => { D()[f.k] = o.v; save(); renderModule(); });
      radios.appendChild(el('label', { class: 'radio', for: id }, [inp, el('span', { text: o.label })]));
    });
    box.appendChild(radios);
    wrap.appendChild(box);
  }

  else if (f.t === 'list') wrap.appendChild(listEditor(f));
  else if (f.t === 'pairs') wrap.appendChild(pairsEditor(f));
  else if (f.t === 'problems') wrap.appendChild(problemsEditor(f));
  else if (f.t === 'legends') wrap.appendChild(legendsEditor(f));
  else if (f.t === 'ideas') wrap.appendChild(ideasEditor(f));

  const a = asideBlock(f);
  if (a) wrap.appendChild(a);
  return wrap;
}

/* --- lista --- */
function listEditor(f) {
  const host = el('div');
  if (!Array.isArray(D()[f.k])) D()[f.k] = [];
  const arr = D()[f.k];
  const want = Math.max(f.min || 1, arr.length || 0, 1);
  while (arr.length < want) arr.push('');

  const draw = () => {
    host.innerHTML = '';
    arr.forEach((val, i) => {
      const inp = el('input', { type: 'text', class: 'input', placeholder: f.ph || '', value: val });
      let lint = f.lint ? lintNode(() => inp.value) : null;
      inp.addEventListener('input', () => { arr[i] = inp.value; touch(); if (lint) lint._upd(); scheduleSoftRefresh(); });
      const col = el('div', { style: 'flex:1' }, [inp]);
      if (lint) col.appendChild(lint);
      host.appendChild(el('div', { class: 'list__row' }, [
        el('span', { class: 'list__idx', text: (i + 1) + '.' }),
        col,
        el('button', {
          class: 'list__del', type: 'button', title: 'Usuń', text: '×',
          onclick: () => { arr.splice(i, 1); save(); draw(); renderCrit(); renderNav(); }
        })
      ]));
    });
    const canAdd = !f.max || arr.length < f.max;
    if (canAdd) host.appendChild(el('button', {
      class: 'addbtn', type: 'button', text: '+ dodaj pozycję',
      onclick: () => {
        arr.push(''); save(); draw();
        const inputs = $$('input', host);
        if (inputs.length) inputs[inputs.length - 1].focus();
      }
    }));
    const cnt = arr.filter(x => String(x || '').trim()).length;
    const need = f.min ? ' / minimum ' + f.min : '';
    host.appendChild(el('p', { class: 'idea__count', text: 'Wypełnionych: ' + cnt + need }));
  };
  draw();
  return host;
}

/* --- pary --- */
function pairsEditor(f) {
  const host = el('div');
  if (!Array.isArray(D()[f.k])) D()[f.k] = [];
  const arr = D()[f.k];
  for (let i = 0; i < arr.length; i++) if (!Array.isArray(arr[i])) arr[i] = ['', ''];
  while (arr.length < (f.rows || 3)) arr.push(['', '']);

  const draw = () => {
    host.innerHTML = '';
    const g = el('div', { class: 'grid2' });
    g.appendChild(el('div', { class: 'gridhead', text: f.cols[0] }));
    g.appendChild(el('div', { class: 'gridhead', text: f.cols[1] }));
    arr.forEach((row, i) => {
      [0, 1].forEach(j => {
        const n = el('textarea', { class: 'textarea', rows: 2, value: row[j] || '' });
        n.value = row[j] || '';
        let lint = f.lint ? lintNode(() => n.value) : null;
        n.addEventListener('input', () => { arr[i][j] = n.value; touch(); if (lint) lint._upd(); scheduleSoftRefresh(); });
        const cell = el('div', {}, [n]);
        if (lint) cell.appendChild(lint);
        g.appendChild(cell);
      });
    });
    host.appendChild(g);
    host.appendChild(el('button', {
      class: 'addbtn', type: 'button', text: '+ dodaj wiersz',
      onclick: () => { arr.push(['', '']); save(); draw(); }
    }));
  };
  draw();
  return host;
}

/* --- bolesne problemy --- */
function problemsEditor() {
  const host = el('div');
  if (!D().idee) D().idee = {};
  if (!Array.isArray(D().problemy)) D().problemy = [];
  const arr = D().problemy;
  let seq = arr.length;

  const draw = () => {
    host.innerHTML = '';
    arr.forEach((p, i) => {
      if (!p.id) p.id = 'p' + (++seq) + '_' + Math.random().toString(36).slice(2, 6);
      const card = el('div', { class: 'prob', 'data-cut': p.cut ? '1' : '0' });

      const ta = el('textarea', { class: 'prob__text', rows: 2, placeholder: 'Zapisz w pierwszej osobie, jego słowami…' });
      ta.value = p.text || '';
      ta.addEventListener('input', () => { p.text = ta.value; touch(); scheduleSoftRefresh(); });

      card.appendChild(el('div', { class: 'prob__top' }, [
        el('span', { class: 'list__idx', text: (i + 1) + '.' }),
        ta,
        el('button', {
          class: 'list__del', type: 'button', title: 'Usuń', text: '×',
          onclick: () => { arr.splice(i, 1); delete D().idee[p.id]; save(); draw(); renderCrit(); renderNav(); }
        })
      ]));

      const tools = el('div', { class: 'prob__tools' }, [
        el('button', {
          class: 'tag tag--cut', type: 'button', 'aria-pressed': p.cut ? 'true' : 'false',
          text: p.cut ? 'wykreślony' : 'wykreśl (filtr bólu)',
          onclick: () => { p.cut = !p.cut; save(); draw(); renderCrit(); renderNav(); }
        }),
        el('button', {
          class: 'tag', type: 'button', 'aria-pressed': p.repeat ? 'true' : 'false',
          text: p.repeat ? 'powtarzalny ✓' : 'powtarzalny?',
          onclick: () => { p.repeat = !p.repeat; save(); draw(); renderCrit(); renderNav(); }
        })
      ]);
      card.appendChild(tools);

      if (!p.cut) {
        const cost = el('input', { type: 'text', class: 'input prob__cost', placeholder: 'Koszt zaniechania: pieniądze, czas, pewność siebie, relacje, szansa, energia…' });
        cost.value = p.cost || '';
        cost.addEventListener('input', () => { p.cost = cost.value; touch(); scheduleSoftRefresh(); });
        card.appendChild(el('div', {}, [el('span', { class: 'prob__costlabel', text: 'Koszt zaniechania' }), cost]));
      }
      host.appendChild(card);
    });

    host.appendChild(el('button', {
      class: 'addbtn', type: 'button', text: '+ dodaj problem',
      onclick: () => {
        arr.push({ id: 'p' + (++seq) + '_' + Math.random().toString(36).slice(2, 6), text: '', cut: false, repeat: false, cost: '' });
        save(); draw();
        const tas = $$('.prob__text', host);
        if (tas.length) tas[tas.length - 1].focus();
      }
    }));

    const kept = arr.filter(p => String(p.text || '').trim() && !p.cut).length;
    const rep = arr.filter(p => String(p.text || '').trim() && !p.cut && p.repeat).length;
    const cst = arr.filter(p => String(p.text || '').trim() && !p.cut && String(p.cost || '').trim()).length;
    host.appendChild(el('p', { class: 'idea__count', text: `Po filtrze: ${kept} (cel 10–15) · powtarzalnych: ${rep} (min. 5) · z kosztem zaniechania: ${cst} (min. 5)` }));
  };
  draw();
  return host;
}

/* --- legendy --- */
function legendsEditor() {
  const host = el('div');
  if (!Array.isArray(D().legendy)) D().legendy = [{}, {}, {}];
  const arr = D().legendy;
  while (arr.length < 3) arr.push({});

  const draw = () => {
    host.innerHTML = '';
    arr.forEach((L, i) => {
      const box = el('div', { class: 'legend' });
      const sel = el('select', { class: 'select' });
      [['', 'oznacz ryzyko'], ['zielona', 'zielona — można publikować'], ['zolta', 'żółta — wymaga zgody lub przeróbki'], ['czerwona', 'czerwona — nie publikujemy']]
        .forEach(([v, t]) => sel.appendChild(el('option', { value: v, text: t })));
      sel.value = L.flaga || '';
      sel.addEventListener('change', () => { L.flaga = sel.value; save(); });

      box.appendChild(el('div', { class: 'legend__head' }, [
        el('span', { class: 'legend__n', text: 'Legenda ' + (i + 1) }),
        el('span', { class: 'legend__flag' }, [sel])
      ]));

      LEGEND_FIELDS.forEach(lf => {
        const n = el('textarea', { class: 'textarea', rows: 2 });
        n.value = L[lf.k] || '';
        n.addEventListener('input', () => { L[lf.k] = n.value; touch(); scheduleSoftRefresh(); });
        box.appendChild(el('div', { style: 'margin-bottom:.8rem' }, [
          el('span', { class: 'field__label', text: lf.q }),
          el('p', { class: 'field__sub', text: lf.sub }),
          n
        ]));
      });
      host.appendChild(box);
    });
    host.appendChild(el('button', {
      class: 'addbtn', type: 'button', text: '+ dodaj Legendę',
      onclick: () => { arr.push({}); save(); draw(); }
    }));
  };
  draw();
  return host;
}

/* --- mapa filarów --- */
function ideasEditor(f) {
  const host = el('div');
  if (!D().idee) D().idee = {};
  const I = D().idee;

  const draw = () => {
    host.innerHTML = '';
    const kept = (D().problemy || []).filter(p => String(p.text || '').trim() && !p.cut);

    if (!kept.length) {
      host.appendChild(el('p', { class: 'field__sub', text: 'Brak problemów po filtrze. Wróć do modułu 4 — Mapa Filarów bierze materiał stamtąd.' }));
      return;
    }

    kept.forEach(p => {
      if (!I[p.id]) I[p.id] = { rozwiazanie: '', dowod: '', idea: '', katy: '' };
      const o = I[p.id];
      const box = el('div', { class: 'idea' });
      box.appendChild(el('p', { class: 'idea__prob', text: '„' + p.text.trim() + '”' }));
      if (p.cost) box.appendChild(el('p', { class: 'field__sub', text: 'Koszt zaniechania: ' + p.cost }));

      const cutFlag = el('p', { class: 'idea__cut', text: 'Brak unikalnego rozwiązania — do wycięcia z mapy', hidden: true, style: 'display:none' });
      box.appendChild(cutFlag);

      const mk = (key, q, sub, rows, lint) => {
        const n = el('textarea', { class: 'textarea', rows: rows });
        n.value = o[key] || '';
        let lnode = lint ? lintNode(() => n.value) : null;
        n.addEventListener('input', () => {
          o[key] = n.value; touch();
          if (lnode) lnode._upd();
          setShown(cutFlag, String(o.rozwiazanie || '').trim().length <= 2);
          if (key === 'katy') counter.textContent = 'Kątów w tej Idei: ' + String(n.value).split('\n').filter(s => s.trim().length > 2).length;
          scheduleSoftRefresh();
        });
        const w = el('div', { style: 'margin-bottom:.7rem' }, [
          el('span', { class: 'field__label', text: q }),
          sub ? el('p', { class: 'field__sub', text: sub }) : null,
          n
        ]);
        if (lnode) w.appendChild(lnode);
        return w;
      };

      box.appendChild(mk('rozwiazanie', 'Moje unikalne rozwiązanie', 'Twój sposób, wynikający z realnego doświadczenia.', 2, true));
      box.appendChild(mk('dowod', 'Dowód', 'Ogólny albo kontekstowy.', 2, false));
      box.appendChild(mk('idea', 'IDEA — jedno zdanie', 'Problem i rozwiązanie połączone w jedną myśl.', 2, true));
      box.appendChild(mk('katy', 'Kąty', '4–10 na Ideę, każdy w osobnej linii. Kąt zmienia wejście do tematu, nie słowa.', 6, true));

      const counter = el('p', { class: 'idea__count', text: 'Kątów w tej Idei: ' + String(o.katy || '').split('\n').filter(s => s.trim().length > 2).length });
      box.appendChild(counter);
      setShown(cutFlag, String(o.rozwiazanie || '').trim().length <= 2);
      host.appendChild(box);
    });

    const total = angleCount(D());
    host.appendChild(el('p', {
      class: 'idea__count',
      style: 'font-size:.9rem;color:' + (total >= 30 ? 'var(--ok)' : 'var(--warn)'),
      text: 'Łącznie kątów w zapasie: ' + total + ' / minimum 30'
    }));
  };
  draw();
  return host;
}

/* =========================================================
   Moduł
   ========================================================= */
function go(i) {
  const lf = lockedFrom();
  if (lf !== -1 && i >= lf) { toast(SCHEMA[lf - 1].gateBlockMsg); return; }
  current = i;
  renderModule();
  window.scrollTo(0, 0);
}

let lastRenderedIdx = -1;
function renderModule() {
  const m = SCHEMA[current];
  const main = $('#main');
  main.innerHTML = '';

  // animujemy tylko przy zmianie modułu, nie przy każdym przerysowaniu
  const fresh = lastRenderedIdx !== current;
  lastRenderedIdx = current;
  const art = el('article', { class: 'mod' + (fresh ? ' is-fresh' : '') });

  art.appendChild(el('header', { class: 'mod__head' }, [
    el('p', { class: 'mod__kicker' }, [
      el('span', { text: 'Moduł ' + m.num, style: 'color:var(--accent);letter-spacing:.18em' }),
      el('span', { text: m.step }),
      m.time ? el('span', { text: m.time }) : null
    ]),
    el('h1', { class: 'mod__title', text: m.title }),
    el('p', { class: 'mod__lede', text: m.lede })
  ]));

  m.sections.forEach(sec => {
    if (sec.showIf && !visible(sec)) return;
    const s = el('section', { class: 'sec' });
    s.appendChild(el('h2', { class: 'sec__title' }, [
      el('span', { text: sec.title }),
      sec.small ? el('small', { text: sec.small }) : null
    ]));
    if (sec.note) s.appendChild(el('p', { class: 'sec__note', text: sec.note }));
    sec.fields.forEach(f => { if (visible(f)) s.appendChild(fieldNode(f)); });
    art.appendChild(s);
  });

  // kryteria
  const crit = el('div', { class: 'crit', id: 'crit' });
  art.appendChild(crit);

  // stopka
  const foot = el('div', { class: 'foot' });
  foot.appendChild(current > 0
    ? el('button', { class: 'btn', type: 'button', text: '← ' + SCHEMA[current - 1].title, onclick: () => go(current - 1) })
    : el('span'));
  const lf = lockedFrom();
  if (current < SCHEMA.length - 1) {
    if (lf !== -1 && current + 1 >= lf) foot.appendChild(el('p', { class: 'foot__lock', text: SCHEMA[lf - 1].gateBlockMsg }));
    else foot.appendChild(el('button', { class: 'btn btn--primary', type: 'button', text: SCHEMA[current + 1].title + ' →', onclick: () => go(current + 1) }));
  } else {
    foot.appendChild(el('button', { class: 'btn btn--primary', type: 'button', text: 'Eksportuj kontekst (.md)', onclick: exportMD }));
  }
  art.appendChild(foot);

  main.appendChild(art);
  renderCrit();
  renderNav();
}

function renderCrit() {
  const box = $('#crit');
  if (!box) return;
  const res = critResults(SCHEMA[current]);
  box.innerHTML = '';
  if (!res.length) return;
  const okN = res.filter(r => r.ok).length;
  box.appendChild(el('p', { class: 'crit__head', text: 'Kryteria ukończenia — ' + okN + ' z ' + res.length }));
  res.forEach(r => box.appendChild(el('div', { class: 'crit__item', 'data-ok': r.ok ? '1' : '0' }, [
    el('span', { class: 'crit__mark', text: r.ok ? '✓' : '○' }),
    el('span', { text: r.label })
  ])));
}

/* =========================================================
   Eksporty
   ========================================================= */
function dl(name, text, mime) {
  const blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const nz = v => String(v || '').trim();
const bul = arr => (Array.isArray(arr) ? arr : []).map(nz).filter(Boolean).map(x => '- ' + x).join('\n');
const pairBul = (arr, sep) => (Array.isArray(arr) ? arr : [])
  .filter(r => nz(r?.[0]) || nz(r?.[1]))
  .map(r => '- ' + nz(r[0]) + (sep || ' → ') + nz(r[1])).join('\n');

function sectionMD(title, body) {
  const b = nz(body);
  return b ? '\n## ' + title + '\n\n' + b + '\n' : '';
}
function qa(q, v) { const x = nz(v); return x ? '**' + q + '**\n' + x + '\n\n' : ''; }

function buildMD() {
  const d = D();
  const name = nz(d.klient) || 'klient';
  const zdanie = ['zd_odbiorca', 'zd_pragnienie', 'zd_przekonanie', 'zd_zamiast'].every(k => nz(d[k]))
    ? 'Wierzę, że ' + d.zd_odbiorca + ' chcący ' + d.zd_pragnienie + ' powinni ' + d.zd_przekonanie + ', a nie ' + d.zd_zamiast + '.'
    : '';

  let out = '';
  out += '# Kontekst marki — ' + name + '\n\n';
  out += '> Plik wygenerowany przez Zeszyt Marki ' + today() + '. Źródło: proces pozycjonowania (moduły 0–8).\n\n';

  out += '## JAK UŻYWAĆ TEGO PLIKU\n\n';
  out += 'Plik ma dwie części i one działają inaczej.\n\n';
  out += '**Część I — REGUŁY.** To są ograniczenia, nie sugestie. Każdy tekst tworzony dla tego klienta musi je spełniać. Jeśli propozycja łamie regułę, odrzuć ją i napisz od nowa, zamiast tłumaczyć wyjątek.\n\n';
  out += '**Część II — MATERIAŁ.** To jest zasób, z którego czerpiesz treść. Cytaty odbiorcy są zapisane jego słowami — używaj ich dosłownie, nie parafrazuj na język branżowy.\n\n';
  out += 'Jeśli czegoś tu nie ma, nie zmyślaj. Zapytaj.\n\n';
  out += '---\n';

  /* ---------- CZĘŚĆ I — REGUŁY ---------- */
  out += '\n# CZĘŚĆ I — REGUŁY (egzekwuj)\n';

  out += sectionMD('Zdanie pozycjonujące', zdanie ? '> ' + zdanie + '\n\nKażda treść ma dać się streścić tak, żeby nie kłóciła się z tym zdaniem.' : '');
  out += sectionMD('Nienegocjowalne — wzmacnia je każda treść', bul(d.poz_nienegocjowalne));
  out += sectionMD('Słowa, których NIE UŻYWAMY', bul(d.jez_nie) ? bul(d.jez_nie) + '\n\nTo są słowa, które odbiorca rozumie, ale sam ich nie używa. Ich obecność w tekście oznacza, że tekst jest napisany naszym językiem, nie jego.' : '');
  out += sectionMD('Język, którego używamy', bul(d.jez_uzywa));
  out += sectionMD('Granice tematu', [
    bul(d.poz_rdzen) ? '**Temat rdzeniowy**\n' + bul(d.poz_rdzen) : '',
    nz(d.poz_nie_rusza) ? '**Temat, którego NIE ruszamy**\n' + d.poz_nie_rusza : '',
    bul(d.poz_przylegle) ? '**Tematy przyległe (dozwolony zakres)**\n' + bul(d.poz_przylegle) : ''
  ].filter(Boolean).join('\n\n'));
  out += sectionMD('Skojarzenia', [
    bul(d.poz_za) ? '**Jesteśmy ZA**\n' + bul(d.poz_za) : '',
    bul(d.poz_przeciw) ? '**Jesteśmy PRZECIW**\n' + bul(d.poz_przeciw) : ''
  ].filter(Boolean).join('\n\n'));
  out += sectionMD('Anonimizacja i dane wrażliwe', nz(d.anon_zasada) ? d.anon_zasada + '\n\nŻadna treść nie opisuje konkretnego klienta bez zgody. Historia zdrowotna to dane wrażliwe.' : '');
  out += sectionMD('Kadencja i produkcja', [
    nz(d.sys_publikacje) ? '- Publikacji w miesiącu: ' + d.sys_publikacje : '',
    nz(d.sys_sesje) ? '- Sesji nagraniowych w miesiącu: ' + d.sys_sesje : '',
    nz(d.sys_medium) ? '- Medium bazowe: ' + (LABELS.medium[d.sys_medium] || d.sys_medium) : '',
    nz(d.sys_glowna) ? '- Platforma główna: ' + d.sys_glowna : '',
    nz(d.sys_zapas) ? '- Platforma zapasowa (tylko przerób): ' + d.sys_zapas : '',
    nz(d.sys_oko) ? '- Eye of Sauron (punkt skupienia kwartału): ' + d.sys_oko : ''
  ].filter(Boolean).join('\n'));
  out += sectionMD('Formaty sygnaturowe', [
    nz(d.fmt_1) ? '- Powtarzalny #1: ' + d.fmt_1 : '',
    nz(d.fmt_2) ? '- Powtarzalny #2: ' + d.fmt_2 : '',
    nz(d.fmt_lubiany) ? '- Dla przyjemności: ' + d.fmt_lubiany : ''
  ].filter(Boolean).join('\n'));
  out += sectionMD('Estetyka i to, co zatrzymuje odbiorcę', [
    nz(d.jez_estetyka) ? '**Estetyka czytana jako wiarygodna**\n' + d.jez_estetyka : '',
    nz(d.jez_scroll) ? '**Co zatrzymuje w scrollu**\n' + d.jez_scroll : ''
  ].filter(Boolean).join('\n\n'));

  out += '\n---\n';

  /* ---------- CZĘŚĆ II — MATERIAŁ ---------- */
  out += '\n# CZĘŚĆ II — MATERIAŁ (czerp)\n';

  out += sectionMD('Kierunek biznesowy', [
    qa('Pożądany rezultat', d.kier_rezultat),
    qa('Z czym musi być kojarzony', d.kier_kojarzony),
    qa('Co musi robić', d.kier_robic),
    qa('Czego musi się nauczyć', d.kier_nauczyc),
    qa('Uzasadnienie decyzji', d.kier_uzasadnienie)
  ].join('').trim());

  out += sectionMD('Punkt wyjścia', [
    nz(d.tor) ? '- Tor: ' + (LABELS.tor[d.tor] || d.tor) : '',
    nz(d.aud_dystans) ? '- Audyt: ' + (LABELS.dystans[d.aud_dystans] || d.aud_dystans) : '',
    nz(d.reb_sciezka) ? '- Ścieżka rebrandingu: ' + (LABELS.sciezka[d.reb_sciezka] || d.reb_sciezka) : '',
    nz(d.reb_zaleznosc) ? '- Zależność przychodu od marki: ' + (LABELS.zaleznosc[d.reb_zaleznosc] || d.reb_zaleznosc) : '',
    nz(d.aud_dzis) ? '\n**O czym są dzisiejsze publikacje**\n' + d.aud_dzis : '',
    nz(d.aud_pytania) ? '\n**O co ludzie pytają**\n' + d.aud_pytania : ''
  ].filter(Boolean).join('\n'));

  out += sectionMD('Odbiorca — sytuacja', nz(d.odb_sytuacja) ? 'Mój idealny klient to ktoś, kto obecnie ' + d.odb_sytuacja.replace(/^ktoś,? kto obecnie /i, '') : '');

  const kept = (d.problemy || []).filter(p => nz(p.text) && !p.cut);
  out += sectionMD('Bolesne problemy — jego słowami',
    kept.length ? kept.map(p => {
      let s = '- „' + nz(p.text) + '”';
      const meta = [];
      if (p.repeat) meta.push('powtarzalny');
      if (nz(p.cost)) meta.push('koszt zaniechania: ' + nz(p.cost));
      if (meta.length) s += '\n  - ' + meta.join(' · ');
      return s;
    }).join('\n') + '\n\nTe sformułowania są cytatami. Używaj ich dosłownie w hookach i wstępach.' : '');

  out += sectionMD('Rozpozna i zna', bul(d.jez_rozpozna));

  out += sectionMD('Różnicowanie — co robią inni, co robimy my', pairBul(d.poz_roznicowanie, '  →  '));
  out += sectionMD('Tezy kontrariańskie i wspólny wróg',
    (Array.isArray(d.poz_tezy) ? d.poz_tezy : []).filter(r => nz(r?.[0])).map((r, i) =>
      '**Teza ' + (i + 1) + '.** ' + nz(r[0]) + (nz(r[1]) ? '\n**Jako wróg:** ' + nz(r[1]) : '')).join('\n\n') +
    ((Array.isArray(d.poz_tezy) && d.poz_tezy.some(r => nz(r?.[0]))) ? '\n\nZwycięzca nie jest jeszcze wybrany — tezy są w fazie testu.' : ''));

  out += sectionMD('Warstwa ludzka — jak wchodzi w treść', pairBul(d.poz_stacking, '  →  '));

  const L = (d.legendy || []).filter(l => nz(l.kontekst) || nz(l.wglad));
  out += sectionMD('Bank Dowodów — Legendy', L.length ? L.map((l, i) =>
    '### Legenda ' + (i + 1) + (nz(l.flaga) ? ' (' + l.flaga + ')' : '') + '\n' +
    qa('Kontekst', l.kontekst) + qa('Problem pod powierzchnią', l.problem) + qa('Wgląd', l.wglad) +
    qa('Podejście', l.podejscie) + qa('Rezultat', l.rezultat) + qa('Lekcja transferowalna', l.lekcja)
  ).join('\n').trim() : '');

  out += sectionMD('Bank Dowodów — lista skrótowa', [
    bul(d.bank_wygrane) ? '**Wygrane**\n' + bul(d.bank_wygrane) : '',
    bul(d.bank_porazki) ? '**Porażki z lekcją**\n' + bul(d.bank_porazki) : ''
  ].filter(Boolean).join('\n\n'));

  /* mapa filarów */
  const I = d.idee || {};
  const ideasMD = kept.map(p => {
    const o = I[p.id];
    if (!o || !nz(o.idea)) return '';
    const katy = String(o.katy || '').split('\n').map(nz).filter(Boolean);
    return '### ' + nz(o.idea) + '\n' +
      '- **Problem:** „' + nz(p.text) + '”\n' +
      (nz(o.rozwiazanie) ? '- **Unikalne rozwiązanie:** ' + nz(o.rozwiazanie) + '\n' : '') +
      (nz(o.dowod) ? '- **Dowód:** ' + nz(o.dowod) + '\n' : '') +
      (katy.length ? '\n**Kąty:**\n' + katy.map(k => '- ' + k).join('\n') + '\n' : '');
  }).filter(Boolean).join('\n');
  out += sectionMD('Mapa Filarów — Idee i kąty', ideasMD);

  out += sectionMD('Profil', [
    nz(d.pro_nazwa) ? '**Nazwa:** ' + d.pro_nazwa : '',
    [d.pro_bio1, d.pro_bio2, d.pro_bio3, d.pro_bio4].map(nz).filter(Boolean).length
      ? '\n**Bio**\n' + [d.pro_bio1, d.pro_bio2, d.pro_bio3, d.pro_bio4].map(nz).filter(Boolean).map(x => '> ' + x).join('\n')
      : '',
    bul(d.pro_wyroznione) ? '\n**Wyróżnione relacje**\n' + bul(d.pro_wyroznione) : ''
  ].filter(Boolean).join('\n'));

  out += sectionMD('Kontekst biznesowy', [
    qa('Oferta', d.b_oferta), qa('Ceny', d.b_ceny), qa('Aktywni klienci', d.b_klienci),
    qa('Skąd przychodzą klienci', d.b_skad), qa('Zapytania miesięcznie', d.b_zapytania),
    qa('Realne godziny na treść', d.t_godziny)
  ].join('').trim());

  out += '\n---\n\n_Koniec pliku. Wygenerowano z Zeszytu Marki._\n';
  return out;
}

function exportMD() {
  dl(slug(D().klient) + '_KONTEKST.md', buildMD(), 'text/markdown');
  toast('Zapisano plik kontekstu .md');
}
function exportJSON() {
  save();
  dl(slug(D().klient) + '_STAN_' + today() + '.json', JSON.stringify(S, null, 2), 'application/json');
  toast('Zapisano plik stanu .json');
}

/* --- wydruk dla klienta --- */
function buildPrint() {
  const d = D();
  const root = $('#printroot');
  root.innerHTML = '';
  const add = (tag, cls, text) => { const n = el(tag, { class: cls || null, text: text }); root.appendChild(n); return n; };

  add('h1', null, 'Karta marki — ' + (nz(d.klient) || '—'));
  add('p', 'p-sub', 'Opracowano ' + today() + (nz(d.prowadzi) ? ' · prowadzi: ' + d.prowadzi : ''));

  const zd = ['zd_odbiorca', 'zd_pragnienie', 'zd_przekonanie', 'zd_zamiast'].every(k => nz(d[k]));
  if (zd) {
    add('h2', null, 'Zdanie pozycjonujące');
    root.appendChild(el('blockquote', { text: 'Wierzę, że ' + d.zd_odbiorca + ' chcący ' + d.zd_pragnienie + ' powinni ' + d.zd_przekonanie + ', a nie ' + d.zd_zamiast + '.' }));
  }

  const sec = (title, pairsArr) => {
    const body = pairsArr.filter(p => nz(p[1]));
    if (!body.length) return;
    add('h2', null, title);
    body.forEach(([q, v]) => {
      if (q) add('p', 'p-q', q);
      add('p', 'p-a', nz(v));
    });
  };
  const listSec = (title, arr, quote) => {
    const items = (Array.isArray(arr) ? arr : []).map(nz).filter(Boolean);
    if (!items.length) return;
    add('h2', null, title);
    const ul = el('ul');
    items.forEach(x => ul.appendChild(el('li', { text: quote ? '„' + x + '”' : x })));
    root.appendChild(ul);
  };

  sec('Kierunek', [
    ['Pożądany rezultat', d.kier_rezultat],
    ['Z czym musisz być kojarzony', d.kier_kojarzony],
    ['Co musisz robić', d.kier_robic],
    ['Czego musisz się nauczyć', d.kier_nauczyc]
  ]);

  sec('Odbiorca', [['Sytuacja', d.odb_sytuacja]]);
  listSec('Bolesne problemy', (d.problemy || []).filter(p => nz(p.text) && !p.cut).map(p => p.text), true);
  listSec('Słowa, których używa', d.jez_uzywa);
  listSec('Słowa, których nie używamy', d.jez_nie);

  const roz = (Array.isArray(d.poz_roznicowanie) ? d.poz_roznicowanie : []).filter(r => nz(r?.[0]) || nz(r?.[1]));
  if (roz.length) {
    add('h2', null, 'Różnicowanie');
    roz.forEach(r => { add('p', 'p-q', nz(r[0])); add('p', 'p-a', nz(r[1])); });
  }

  listSec('Jesteśmy za', d.poz_za);
  listSec('Jesteśmy przeciw', d.poz_przeciw);
  listSec('Nienegocjowalne', d.poz_nienegocjowalne);

  const tz = (Array.isArray(d.poz_tezy) ? d.poz_tezy : []).filter(r => nz(r?.[0]));
  if (tz.length) {
    add('h2', null, 'Tezy kontrariańskie');
    tz.forEach((r, i) => { add('p', 'p-q', 'Teza ' + (i + 1)); add('p', 'p-a', nz(r[0])); if (nz(r[1])) add('p', 'p-a', 'Jako wróg: ' + nz(r[1])); });
  }

  sec('Granice tematu', [
    ['Temat rdzeniowy', (d.poz_rdzen || []).filter(Boolean).join(' · ')],
    ['Temat, którego nie ruszamy', d.poz_nie_rusza],
    ['Tematy przyległe', (d.poz_przylegle || []).filter(Boolean).join(' · ')]
  ]);

  sec('System', [
    ['Kadencja', [nz(d.sys_publikacje) ? d.sys_publikacje + ' publikacji / mies.' : '', nz(d.sys_sesje) ? d.sys_sesje + ' sesji / mies.' : ''].filter(Boolean).join(' · ')],
    ['Medium bazowe', LABELS.medium[d.sys_medium] || d.sys_medium],
    ['Platformy', [nz(d.sys_glowna) ? 'główna: ' + d.sys_glowna : '', nz(d.sys_zapas) ? 'zapasowa: ' + d.sys_zapas : ''].filter(Boolean).join(' · ')],
    ['Formaty', [d.fmt_1, d.fmt_2, d.fmt_lubiany].map(nz).filter(Boolean).join(' · ')]
  ]);

  const bio = [d.pro_bio1, d.pro_bio2, d.pro_bio3, d.pro_bio4].map(nz).filter(Boolean);
  if (bio.length) { add('h2', null, 'Profil'); if (nz(d.pro_nazwa)) add('p', 'p-a', d.pro_nazwa); bio.forEach(b => add('p', 'p-a', b)); }
}

/* =========================================================
   Start
   ========================================================= */
function openApp() {
  setShown($('#lock'), false);
  setShown($('#gate'), false);
  setShown($('#app'), true);
  $('#topbar-client').textContent = nz(D().klient) || '—';
  current = 0;
  // wejdź w pierwszy niegotowy moduł
  for (let i = 0; i < SCHEMA.length; i++) {
    if (modStatus(i) === 'done') continue;
    if (modStatus(i) === 'lock') break;
    current = i; break;
  }
  renderModule();
}

/* =========================================================
   Blokada kodem
   ========================================================= */
async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function isUnlocked() {
  try {
    return localStorage.getItem(UNLOCK_KEY) === PIN_HASH ||
           sessionStorage.getItem(UNLOCK_KEY) === PIN_HASH;
  } catch (e) { return false; }
}

function showGate() {
  setShown($('#lock'), false);
  setShown($('#gate'), true);
  setShown($('#app'), false);
}

function wireLock() {
  const lock = $('#lock');
  setShown($('#app'), false);

  if (!lock) { setShown($('#gate'), true); return; }
  if (isUnlocked()) { showGate(); return; }

  setShown($('#gate'), false);

  const form = $('#lock-form'), pin = $('#lock-pin'), err = $('#lock-err'), rem = $('#lock-remember');
  setShown(err, false);
  setTimeout(() => pin.focus(), 150);

  pin.addEventListener('input', () => {
    pin.value = pin.value.replace(/\D/g, '').slice(0, 8);
    setShown(err, false);
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    let h;
    try { h = await sha256Hex(PIN_SALT + pin.value); }
    catch (ex) {
      alert('Ta przeglądarka nie udostępnia funkcji skrótu (crypto.subtle). Otwórz stronę przez https lub zaktualizuj przeglądarkę.');
      return;
    }
    if (h !== PIN_HASH) {
      setShown(err, true);
      pin.value = '';
      pin.focus();
      return;
    }
    try { (rem.checked ? localStorage : sessionStorage).setItem(UNLOCK_KEY, PIN_HASH); } catch (ex) { /* tryb prywatny */ }
    lock.classList.add('lock--out');
    setTimeout(showGate, 290);
  });
}

function relock() {
  try { localStorage.removeItem(UNLOCK_KEY); sessionStorage.removeItem(UNLOCK_KEY); } catch (e) { }
  location.reload();
}

function wireGate() {
  const prev = load();
  if (prev && prev.data) {
    const info = $('#gate-resume-info');
    const nm = nz(prev.data.klient) || 'bez nazwy';
    const when = prev.updated ? new Date(prev.updated).toLocaleString('pl-PL') : '';
    info.textContent = 'Zapisana sesja: ' + nm + (when ? ' · ostatnia zmiana ' + when : '');
    const b = $('#gate-resume');
    b.disabled = false;
    b.addEventListener('click', () => { S = prev; openApp(); });
  }

  $('#gate-new').addEventListener('click', () => {
    const nm = $('#gate-name').value.trim();
    if (!nm) { $('#gate-name').focus(); toast('Podaj imię i nazwisko klienta'); return; }
    if (prev && !confirm('W tej przeglądarce jest już zapisana sesja („' + (nz(prev.data.klient) || 'bez nazwy') + '”). Nowy zeszyt ją nadpisze. Czy zapisałeś plik stanu .json?')) return;
    S = blank(nm); save(); openApp();
  });
  $('#gate-name').addEventListener('keydown', e => { if (e.key === 'Enter') $('#gate-new').click(); });

  $('#gate-file').addEventListener('change', e => importFile(e.target, true));
}

function importFile(input, fromGate) {
  const f = input.files && input.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const obj = JSON.parse(r.result);
      if (!obj || !obj.data) throw new Error('zły format');
      if (!fromGate && !confirm('Wczytanie pliku nadpisze bieżący zeszyt. Kontynuować?')) { input.value = ''; return; }
      S = obj;
      if (!Array.isArray(S.data.problemy)) S.data.problemy = [];
      if (!Array.isArray(S.data.legendy)) S.data.legendy = [{}, {}, {}];
      if (!S.data.idee) S.data.idee = {};
      save();
      if (fromGate) openApp(); else { $('#topbar-client').textContent = nz(D().klient) || '—'; renderModule(); }
      toast('Wczytano zeszyt: ' + (nz(S.data.klient) || 'bez nazwy'));
    } catch (err) {
      alert('Nie udało się wczytać pliku. Upewnij się, że to plik stanu .json wygenerowany przez ten zeszyt.');
    }
    input.value = '';
  };
  r.readAsText(f);
}

function wireApp() {
  // menu
  const btn = $('#menu-btn'), list = $('#menu-list');
  const closeMenu = () => { setShown(list, false); btn.setAttribute('aria-expanded', 'false'); };
  const openMenu = () => { setShown(list, true); btn.setAttribute('aria-expanded', 'true'); };
  closeMenu();

  btn.addEventListener('click', e => {
    e.stopPropagation();
    list.hidden ? openMenu() : closeMenu();
  });
  document.addEventListener('click', closeMenu);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !list.hidden) { closeMenu(); btn.focus(); }
  });
  list.addEventListener('click', e => e.stopPropagation());
  list.addEventListener('click', e => {
    const act = e.target.closest('[data-act]') && e.target.closest('[data-act]').dataset.act;
    if (!act) return;
    closeMenu();
    if (act === 'md') exportMD();
    if (act === 'json') exportJSON();
    if (act === 'print') { buildPrint(); setTimeout(() => window.print(), 60); }
    if (act === 'reset') {
      if (confirm('Zamknąć zeszyt i wrócić do ekranu startowego? Dane zostają zapisane w tej przeglądarce — ale zapisz plik stanu .json, zanim to zrobisz.')) {
        save(); location.reload();
      }
    }
    if (act === 'lock') {
      if (confirm('Zablokować zeszyt kodem? Dane zostają zapisane, ale przy następnym wejściu trzeba będzie podać kod.')) {
        save(); relock();
      }
    }
  });
  $('#import-file').addEventListener('change', e => importFile(e.target, false));

  // prezenter
  const p = $('#presenter');
  const savedP = localStorage.getItem(KEY + ':presenter') === '1';
  p.checked = savedP;
  document.body.dataset.presenter = savedP ? '1' : '0';
  p.addEventListener('change', () => {
    document.body.dataset.presenter = p.checked ? '1' : '0';
    localStorage.setItem(KEY + ':presenter', p.checked ? '1' : '0');
  });

  // nawigacja mobilna
  setShown($('#nav-scrim'), false);
  $('#nav-toggle').addEventListener('click', () => {
    const n = $('#nav');
    const open = n.dataset.open !== '1';
    n.dataset.open = open ? '1' : '0';
    setShown($('#nav-scrim'), open);
  });
  $('#nav-scrim').addEventListener('click', closeNav);

  // ostrzeżenie przy wyjściu
  window.addEventListener('beforeunload', e => {
    if (dirty) { save(); }
  });

  // skróty
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); exportJSON(); }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  wireLock();
  wireGate();
  wireApp();
});

})();
