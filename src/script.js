/* ──────────────────────────────────────────────────────────────
   nanopulseOS.org: a small fake shell around a real OS
   ────────────────────────────────────────────────────────────── */
(() => {
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = {
  get(k, s = localStorage) { try { return s.getItem(k); } catch { return null; } },
  set(k, v, s = localStorage) { try { s.setItem(k, v); } catch {} },
  del(k, s = localStorage) { try { s.removeItem(k); } catch {} },
};
const ss = (() => { try { return sessionStorage; } catch { return null; } })();
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const T0 = Date.now();

const REPO = 'kryptoish/nanopulseOS';
const ISO = 'nanopulseos.iso';
const HOME = '/home/guest';

const MOLECULE = ["             +B$$$$$$$$$$$$$$r.", "         ^q$$@O+ .+/xcct]` ,nB$$#!", "       ~@$$_ [8$$$$$$$$$$$$$BU ,W$@r", "     ,$$M.<@$$$$$$$$$$$$$$$$$$$$j J$$]", "    C$B;>@$$$$$$$$$$$$$$$$$$$$$$$$c a$*", "   W$*     &&\\   @$$$$$$$$.  ,&&-   .j$$", "  b$m $-  ,$$Q   $$$$$$$$$\"  +$$x   $i_$B", " r$@ 8w @$$$$$$${'$$$$$$$u @$$$$$$$;_$'z$m", " $$\"   '$$$$$$$$x   -j/   '$$$$$$$$?    $$`", "t$k }  j$$$$$$$$W   8$@i  Q$$$$$$$$M  ^~t$q", "0$vI$$@^\\w@$$@Mz *$$$$$$$B fb@$$@*v M$$X`$$", "O$/]$$@    ;;'   o$$$$$$$@    ;;.   o$$O'$$", "J$c:$$$d  0$$8`  $$$$$$$$$\"  d$$#  r$$$z`$$", "1$h $$$$$$$$$$$$Z <Q$$$h-\"[$$$$$$$$$$$$<x$k", " $$\"n$$$$$$$$$$$/          $$$$$$$$$$$# $$^", " {$$ M$$$$$$$$$$b `\\$$$m`.t$$$$$$$$$$$ J$m", "  O$p B$$$$$$8i  $$$$$$$$$\" ^d$$$$$$$;1$B", "   #$& d$$$$$<   h$$$$$$$@   .$$$$$$.U$$", "    v$@i\"B$$$$0{ M$$$$$$$%.]n$$$$$t.8$a", "     ^@$%I;8$$$$W  ^B$@+  Q$$$$@[ d$$~", "       ;B$$u :W@x   '^^    $%{ !$$@[", "         .C$$$h|'  +1)1-   ]Z$$$d`", "             !#$$$$$$$$$$$$$B]."];

/* live facts, filled in by fetchMeta() */
const meta = { size: null, built: null, release: null, released: null, commits: null };
const fmtMB = b => (b / 1048576).toFixed(1) + ' MB';
const fmtDate = d => d ? new Date(d).toISOString().slice(0, 10) : '?';

/* ── pages ─────────────────────────────────────────────────── */

const PAGES = ['home', 'run', 'install', 'man'];
const PAGE_DIR = { home: HOME, run: HOME + '/run', install: HOME + '/install', man: HOME + '/man' };
let page = null;
let cwd = HOME;

const out = $('#out');
const psPath = $('#ps-path');

function go(name, { push = true, keepCwd = false } = {}) {
  if (!PAGES.includes(name)) return;
  if (!keepCwd) cwd = PAGE_DIR[name];
  updatePrompt();
  if (name === page) return;
  page = name;
  $$('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + name));
  $$('.win').forEach(w => {
    const on = w.dataset.page === name;
    w.classList.toggle('active', on);
    on ? w.setAttribute('aria-current', 'page') : w.removeAttribute('aria-current');
  });
  out.scrollTop = 0;
  document.title = name === 'home' ? 'nanopulseOS' : name + ' · nanopulseOS';
  const url = name === 'home' ? location.pathname + location.search : '#' + name;
  if (push && (location.hash.slice(1) || 'home') !== name) history.pushState(null, '', url);
  if (name !== 'run') emu.release();
}
addEventListener('popstate', () => go(pageFromHash(), { push: false }));
const pageFromHash = () => { const h = location.hash.slice(1); return PAGES.includes(h) ? h : 'home'; };

const tildify = p => p === HOME ? '~' : p.startsWith(HOME + '/') ? '~' + p.slice(HOME.length) : p;
function updatePrompt() { psPath.textContent = tildify(cwd); }

$$('.win').forEach(w => w.addEventListener('click', () => go(w.dataset.page)));

/* ── boot sequence (once per session) ──────────────────────── */

async function boot() {
  const log = $('#boot-log');
  const sec = $('#page-boot');
  sec.classList.add('active');
  let skipped = false;
  const skip = () => { skipped = true; };
  addEventListener('keydown', skip, { once: true });
  addEventListener('pointerdown', skip, { once: true });

  const line = (html, cls = '') => {
    const d = document.createElement('div');
    d.className = 'boot-line ' + cls;
    d.innerHTML = html;
    log.appendChild(d);
  };
  const OK = '<span class="ok">[  OK  ]</span> ';
  const seq = [
    [60,  'GRUB loading.'],
    [220, "Booting `nanopulseos'"],
    [140, ''],
    [90,  '=== nanopulseOS Kernel Starting ===', 'hi'],
    [80,  OK + 'Keyboard init success'],
    [80,  OK + 'Timer init (100 Hz)'],
    [80,  OK + 'RAM filesystem init'],
    [80,  OK + 'Interrupts enabled'],
    [120, 'OS initialization successful!', 'hi'],
  ];
  for (const [ms, html, cls] of seq) {
    if (skipped) break;
    await sleep(ms);
    line(html, cls);
  }
  if (!skipped) {
    await sleep(160);
    const art = document.createElement('pre');
    art.className = 'boot-art';
    art.textContent = '           Welcome to nanopulseOS!\n\n' + MOLECULE.join('\n');
    log.appendChild(art);
    for (let i = 0; i < 18 && !skipped; i++) await sleep(50);
  }
  removeEventListener('keydown', skip);
  removeEventListener('pointerdown', skip);
  sec.classList.remove('active');
  log.innerHTML = '';
  if (ss) store.set('npos-booted', '1', ss);
}

/* ── molecule: a heartbeat that sweeps down the logo ───────── */

const mol = $('#molecule');
mol.innerHTML = MOLECULE.map(l => '<span class="r">' + esc(l) + '</span>').join('\n');
const rows = $$('.r', mol);
async function heartbeat() {
  if (reduced) return;
  while (true) {
    await sleep(2600);
    if (page !== 'home' || document.hidden) continue;
    for (const beat of [0, 1]) {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        r.classList.add(beat ? 'near' : 'on');
        setTimeout(() => r.classList.remove('on', 'near'), 110);
        await sleep(22);
      }
      await sleep(120);
    }
  }
}

/* ── emulator ──────────────────────────────────────────────── */

const emu = (() => {
  const screen = $('#emu-screen');
  const idle = $('#emu-idle');
  const vt = $('#emu-vt');
  const canvas = $('canvas', screen);
  const led = $('#emu-led');
  const stateEl = $('#emu-state');
  const kbdEl = $('#emu-kbd');
  const prog = $('#emu-progress');
  const stEmu = $('#st-emu');
  const btn = { boot: $('#emu-boot'), reset: $('#emu-reset'), full: $('#emu-full'), halt: $('#emu-halt') };

  let v86 = null;
  let state = 'halted';   // halted | loading | running
  let captured = false;
  let libPromise = null;

  function setState(s, detail = '') {
    state = s;
    led.className = 'led' + (s === 'loading' ? ' loading' : s === 'running' ? ' on' : '');
    stateEl.textContent = s === 'loading' ? 'loading' + (detail ? ' ' + detail : '') : s;
    stEmu.textContent = (s === 'running' ? '● ' : s === 'loading' ? '◌ ' : '○ ') + s;
    stEmu.classList.toggle('on', s === 'running');
    btn.boot.disabled = s !== 'halted';
    btn.reset.disabled = btn.full.disabled = s !== 'running';
    btn.halt.disabled = s === 'halted';
    idle.classList.toggle('loading', s === 'loading');
    idle.classList.toggle('gone', s === 'running');
    screen.classList.toggle('live', s === 'running');
    if (s !== 'running') release();
  }

  function loadLib() {
    if (window.V86) return Promise.resolve();
    return libPromise ||= new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'emulator/libv86.js';
      s.onload = res;
      s.onerror = () => { libPromise = null; rej(new Error('could not load libv86.js')); };
      document.head.appendChild(s);
    });
  }

  async function start() {
    if (state !== 'halted') return state === 'running' ? 'already running. try <span class="a">reboot</span> or <span class="a">halt</span>' : 'already booting…';
    setState('loading');
    $('#emu-idle-note').textContent = 'fetching emulator…';
    try {
      await loadLib();
    } catch (e) {
      setState('halted');
      $('#emu-idle-note').textContent = 'failed to load the emulator. check your connection';
      return '<span class="e">boot: ' + esc(e.message) + '</span>';
    }
    v86 = new window.V86({
      wasm_path: 'emulator/v86.wasm',
      memory_size: 32 * 1024 * 1024,
      vga_memory_size: 2 * 1024 * 1024,
      screen_container: screen,
      bios: { url: 'emulator/bios/seabios.bin' },
      vga_bios: { url: 'emulator/bios/vgabios.bin' },
      cdrom: { url: ISO },
      disable_mouse: true,
      autostart: true,
    });
    v86.add_listener('download-progress', e => {
      if (!/\.iso$/.test(e.file_name || '')) return;
      const total = e.total || meta.size;
      if (!total) return;
      const pct = Math.min(100, Math.floor(e.loaded / total * 100));
      setState('loading', pct + '%');
      $('#emu-idle-note').textContent = 'downloading image · ' + fmtMB(e.loaded) + ' / ' + fmtMB(total);
      prog.textContent = pct + '%';
    });
    v86.add_listener('download-error', () => {
      $('#emu-idle-note').textContent = 'download failed. try again';
      halt();
    });
    v86.add_listener('emulator-started', () => {
      setState('running');
      prog.textContent = 'i686 · 32 MB';
      capture();
    });
    return null;
  }

  async function halt() {
    if (!v86) return 'nothing to halt';
    const inst = v86; v86 = null;
    try { await inst.destroy(); } catch { try { inst.stop(); } catch {} }
    canvas.style.display = 'none';
    vt.style.display = 'none';
    vt.textContent = '';
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    prog.textContent = '';
    $('#emu-idle-note').textContent = 'downloads a 16 MB image · i686 · 32 MB RAM';
    setState('halted');
    return null;
  }

  function reboot() {
    if (state !== 'running') return 'reboot: emulator is not running';
    v86.restart();
    capture();
    return null;
  }

  function fullscreen() {
    if (state !== 'running') return 'fullscreen: boot first';
    (screen.requestFullscreen?.() || Promise.reject()).then(capture).catch(() => {});
    return null;
  }

  function capture() {
    if (state !== 'running' || captured) return;
    captured = true;
    v86?.keyboard_set_status?.(true);
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    screen.classList.add('captured');
    kbdEl.classList.add('cap');
    kbdEl.innerHTML = 'keyboard: <span>→ nanopulseOS</span> · click outside to release';
  }
  function release() {
    if (v86) v86.keyboard_set_status?.(false);
    if (!captured) return;
    captured = false;
    screen.classList.remove('captured');
    kbdEl.classList.remove('cap');
    kbdEl.innerHTML = state === 'running' ? 'keyboard: <span>site shell</span> · click the screen to type in the guest' : 'keyboard: <span>site shell</span>';
  }

  screen.addEventListener('pointerdown', e => {
    if (state === 'running') { e.preventDefault(); capture(); }
  });
  document.addEventListener('pointerdown', e => {
    if (captured && !screen.contains(e.target)) release();
  });

  /* fit the 80×25 text-mode layer inside the screen */
  const fitVT = () => {
    if (vt.style.display !== 'block' || !vt.offsetWidth) return;
    // offsetWidth ignores transforms, so no reset needed. Only write on change,
    // otherwise the style MutationObserver below would loop forever.
    const s = (Math.min(screen.clientWidth / vt.offsetWidth, screen.clientHeight / vt.offsetHeight, 1.6) * .96).toFixed(3);
    const next = 'scale(' + s + ')';
    if (vt.style.transform !== next) vt.style.transform = next;
  };
  new ResizeObserver(fitVT).observe(screen);
  new MutationObserver(fitVT).observe(vt, { attributes: true, attributeFilter: ['style'], childList: true });

  setState('halted');
  return { start, halt, reboot, fullscreen, release, capture, get state() { return state; }, get captured() { return captured; } };
})();

/* ── virtual filesystem ────────────────────────────────────── */

const dir = (children, page) => ({ type: 'dir', children, page });
const file = (body, extra = {}) => ({ type: 'file', body, ...extra });
const guestBin = name => file(() => `<span class="d">${name}: ELF 32-bit i386 executable, runs inside nanopulseOS.</span>\ntype <span class="a">boot</span>, then run <span class="a">${name}</span> at the guest prompt.`, { exec: name, size: 0 });

const LICENSE = `MIT License

Copyright (c) 2022 Crimson Drake

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

const FS = dir({
  bin: dir({ art: guestBin('art'), tetris: guestBin('tetris'), portal: guestBin('portal'), gamble: guestBin('gamble'), inventory: guestBin('inventory') }),
  boot: dir({
    'nanopulseos.kernel': file('<span class="d">ELF 32-bit LSB executable, Intel 80386, multiboot2</span>'),
    grub: dir({ 'grub.cfg': file('set timeout=3\nset default=0\n\ninsmod all_video\nset gfxmode=auto\n\nmenuentry "nanopulseos" {\n\tmultiboot2 /boot/nanopulseos.kernel\n}') }),
  }),
  etc: dir({
    motd: file(() => '<span class="art">' + esc($('.wordmark').textContent) + '</span>'),
    'os-release': file(() => `NAME="nanopulseOS"\nID=npos\nVERSION="${meta.release || 'latest'}"\nARCH=i686\nHOME_URL="https://nanopulseos.org"\nBUG_REPORT_URL="https://github.com/${REPO}/issues"`),
    hostname: file('nanopulse'),
  }),
  home: dir({
    guest: dir({
      run: dir({}, 'run'),
      install: dir({}, 'install'),
      man: dir({}, 'man'),
      'README.md': file(`<span class="a"># nanopulseOS</span>
A NANO programmed OS that has Pulse.

A lightweight live OS for x86 (i686) that runs from a USB stick and
leaves no trace. It ships with generative art, retro games, a tiny
shell and a ramfs. An esoteric language and IDE are on the way.

<span class="d">try:</span>  boot · cd install · man nanopulseos · neofetch`),
      'INSTALL.md': file(`<span class="a"># install</span>
1. wget nanopulseos.iso
2. sudo dd if=nanopulseos.iso of=/dev/sdX bs=4M status=progress
   (windows: Rufus → MBR → "DD image mode")
3. reboot → legacy/CSM on, secure boot off → pick the usb

<span class="d">full guide:</span> cd install`),
      LICENSE: file(LICENSE),
      [ISO]: file(() => '<span class="e">cat: ' + ISO + ': binary file</span>. try <span class="a">wget</span>, <span class="a">file</span> or <span class="a">boot</span>', { iso: true }),
      '.plan': file(`<span class="d">project: artifact</span>

an old OS on a cheap usb stick,
left on a bench, in a library, under a desk.
no label. just a pulse.

if you find one, boot it.`, { hidden: true }),
      '.history': file(() => hist.length ? hist.map((h, i) => String(i + 1).padStart(4) + '  ' + esc(h)).join('\n') : '', { hidden: true }),
    }),
  }),
  usr: dir({ share: dir({ doc: dir({ 'build-instructions.md': file(`<span class="a"># build</span>
needs an i686-elf gcc cross-compiler, nasm, grub, xorriso, mtools

./build.sh    <span class="d"># kernel → ./sysroot</span>
./iso.sh      <span class="d"># → nanopulseos.iso</span>
qemu-system-i386 -cdrom nanopulseos.iso

<span class="d">details:</span> <a href="https://github.com/${REPO}/blob/main/docs/build-instructions.md" target="_blank" rel="noopener">docs/build-instructions.md</a>`) }) }) }),
});

function resolve(p = '') {
  p = p.trim();
  if (p === '' ) return cwd;
  if (p === '~' || p.startsWith('~/')) p = HOME + p.slice(1);
  else if (!p.startsWith('/')) p = cwd + '/' + p;
  const parts = [];
  for (const seg of p.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') parts.pop(); else parts.push(seg);
  }
  return '/' + parts.join('/');
}
function node(abs) {
  let n = FS;
  for (const seg of abs.split('/').filter(Boolean)) {
    if (n.type !== 'dir' || !n.children[seg]) return null;
    n = n.children[seg];
  }
  return n;
}
const body = n => typeof n.body === 'function' ? n.body() : n.body;
/* sections (~/run, ~/install…) are pages, not real folders, so bare names fall back to ~.
   that way `cat README.md` or `sha256sum nanopulseos.iso` work from every section */
const find = a => node(resolve(a)) || (!a.includes('/') ? node(HOME + '/' + a) : null);
const pageForPath = abs => { const n = node(abs); return abs === HOME ? 'home' : n && n.page; };

/* ── commands ──────────────────────────────────────────────── */

const hist = (() => { try { return JSON.parse(store.get('npos-hist')) || []; } catch { return []; } })();
let histIdx = hist.length;

const flags = args => {
  const f = new Set(), rest = [];
  for (const a of args) a.startsWith('-') && a.length > 1 ? [...a.slice(1)].forEach(c => f.add(c)) : rest.push(a);
  return [f, rest];
};

const C = {};
const def = (names, desc, fn, usage = '') => {
  [].concat(names).forEach((n, i) => { C[n] = { fn, desc, usage, alias: i > 0 ? [].concat(names)[0] : null }; });
};

def('help', 'list commands', () => {
  const rows = [
    ['navigate', [['ls [-la] [path]', 'list a directory'], ['cd <dir>', 'go to a section: run install man'], ['pwd', 'print the working directory'], ['cat <file>', 'print a file (try README.md)'], ['tree', 'show the whole site'], ['open <x>', 'open a section or link']]],
    ['nanopulseOS', [['boot', 'start nanopulseOS in the emulator'], ['reboot / halt', 'reset or stop the emulator'], ['fullscreen', 'make the emulator fullscreen'], ['wget', 'download nanopulseos.iso'], ['sha256sum <iso>', 'hash the image in your browser'], ['git log', 'recent kernel commits']]],
    ['system', [['uname -a', 'kernel info'], ['neofetch', 'system summary'], ['theme [light|dark|auto]', 'switch colours'], ['history', 'commands you have run'], ['man <cmd>', 'help for one command'], ['clear', 'clear this output']]],
  ];
  return rows.map(([h, items]) => `<span class="d">// ${h}</span>\n` + items.map(([c, d]) => '  <span class="a">' + esc(c.padEnd(26)) + '</span><span class="d">' + d + '</span>').join('\n')).join('\n\n')
    + '\n\n<span class="d">keys: tab completes · ↑↓ history · ←→ or 1–4 switch sections · esc closes this</span>';
});

def(['ls', 'dir'], 'list directory contents', args => {
  const [f, rest] = flags(args);
  let target = resolve(rest[0]);
  if (!rest[0] && pageForPath(target)) target = HOME;   // sections behave like ~
  const n = node(target);
  if (!n) return `<span class="e">ls: cannot access '${esc(rest[0])}': No such file or directory</span>`;
  if (n.type === 'file') return esc(rest[0]);
  let names = Object.keys(n.children).filter(k => f.has('a') || !n.children[k].hidden);
  if (f.has('a')) names = ['.', '..', ...names];
  if (!names.length) return target.startsWith(HOME + '/') && n.page ? `<span class="d">(a section, not a folder. cd ${esc(tildify(target))} to open it)</span>` : '';
  const fmt = k => {
    const c = k === '.' || k === '..' ? { type: 'dir' } : n.children[k];
    return c.type === 'dir' ? `<span class="dir">${esc(k)}/</span>` : c.exec ? `<span class="a">${esc(k)}*</span>` : esc(k);
  };
  if (f.has('l')) {
    return `<span class="d">total ${names.length}</span>\n` + names.map(k => {
      const c = k === '.' || k === '..' ? { type: 'dir' } : n.children[k];
      const isDir = c.type === 'dir';
      const size = c.iso && meta.size ? fmtMB(meta.size) : isDir ? '4.0K' : c.exec ? '—' : (String(body(c) || '').replace(/<[^>]+>/g, '').length + 'B');
      return `<span class="d">${isDir ? 'drwxr-xr-x' : c.exec ? '-rwxr-xr-x' : '-rw-r--r--'}  guest  ${size.padStart(7)}  ${c.iso && meta.built ? fmtDate(meta.built) : '2026-11-12'}</span>  ${fmt(k)}`;
    }).join('\n');
  }
  return names.map(fmt).join('   ');
}, '[-la] [path]');

def('cd', 'change directory', args => {
  const raw = args[0] || '~';
  if (raw === '-') return 'cd: OLDPWD not set. this shell forgets';
  const abs = resolve(raw);
  const n = node(abs);
  if (!n) {
    if (PAGES.includes(raw)) { go(raw); return null; }
    return `<span class="e">cd: ${esc(raw)}: No such file or directory</span>`;
  }
  if (n.type !== 'dir') return `<span class="e">cd: ${esc(raw)}: Not a directory</span>`;
  const p = pageForPath(abs);
  if (p) go(p); else { cwd = abs; updatePrompt(); }
  return null;
}, '<dir>');

def('pwd', 'print working directory', () => esc(cwd));

def('cat', 'print a file', args => {
  if (!args.length) return '<span class="e">cat: missing file operand</span>';
  return args.map(a => {
    const n = find(a);
    if (!n) return `<span class="e">cat: ${esc(a)}: No such file or directory</span>`;
    if (n.type === 'dir') return `<span class="e">cat: ${esc(a)}: Is a directory</span>`;
    return body(n);
  }).join('\n');
}, '<file>');

def('tree', 'show the filesystem as a tree', args => {
  const start = resolve(args[0] || '~');
  const n = node(start);
  if (!n || n.type !== 'dir') return `<span class="e">tree: ${esc(args[0] || '~')}: not a directory</span>`;
  let dirs = 0, files = 0;
  const walk = (d, pre) => Object.keys(d.children).filter(k => !d.children[k].hidden).map((k, i, a) => {
    const c = d.children[k], last = i === a.length - 1;
    c.type === 'dir' ? dirs++ : files++;
    const label = c.type === 'dir' ? `<span class="dir">${esc(k)}</span>` : c.exec ? `<span class="a">${esc(k)}</span>` : esc(k);
    return `<span class="f">${pre}${last ? '└── ' : '├── '}</span>${label}` + (c.type === 'dir' && Object.keys(c.children).length ? '\n' + walk(c, pre + (last ? '    ' : '│   ')) : '');
  }).join('\n');
  return `<span class="dir">${esc(tildify(start))}</span>\n${walk(n, '')}\n\n<span class="d">${dirs} directories, ${files} files</span>`;
}, '[dir]');

def('echo', 'print text', (args, raw) => esc(raw.replace(/^\s*echo\s?/, '')
  .replace(/\$\{?USER\}?/g, 'guest').replace(/\$\{?HOME\}?/g, HOME).replace(/\$\{?SHELL\}?/g, '/bin/npsh')
  .replace(/\$\{?PWD\}?/g, cwd).replace(/\$\{?PATH\}?/g, '/bin:/usr/bin').replace(/^(["'])(.*)\1$/, '$2')), '<text>');

def('clear', 'clear the output', () => { term.clear(); return null; });
def('whoami', 'print user name', () => 'guest');
def('hostname', 'print host name', () => 'nanopulse');
def('date', 'print the date', () => new Date().toString());
def('uptime', 'how long this tab has been open', () => {
  const m = Math.floor((Date.now() - T0) / 60000);
  return ` ${new Date().toTimeString().slice(0, 8)} up ${m < 60 ? m + ' min' : Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0')},  1 user,  load average: 0.00, 0.00, 0.00`;
});

def('uname', 'print system information', args => {
  const [f] = flags(args);
  const rel = meta.release || 'latest';
  if (f.has('a')) return `nanopulseOS nanopulse ${esc(rel)} #1 ${fmtDate(meta.built)} i686 multiboot2`;
  if (f.has('r')) return esc(rel);
  if (f.has('m')) return 'i686';
  return 'nanopulseOS';
}, '[-a|-r|-m]');

def('neofetch', 'system summary', () => {
  const kv = [
    ['OS', 'nanopulseOS i686'], ['Release', meta.release || 'latest'], ['Kernel', 'C + x86 asm, freestanding'],
    ['Boot', 'GRUB 2 · multiboot2'], ['Display', 'linear framebuffer · 32bpp'], ['Timer', 'PIT 100 Hz'],
    ['Storage', 'ramfs · 256 KB · 64 inodes'], ['Image', meta.size ? fmtMB(meta.size) : ISO], ['Shell', 'npsh (this one)'], ['License', 'MIT'],
  ];
  const right = '<span class="a">guest</span>@<span class="a">nanopulse</span>\n<span class="f">───────────────</span>\n'
    + kv.map(([k, v]) => `<span class="a">${k}</span>: ${esc(v)}`).join('\n')
    + '\n\n<span style="color:var(--bg);background:var(--bg);outline:1px solid var(--line)">███</span><span style="color:var(--fg)">███</span><span style="color:var(--accent)">███</span>';
  return `<div class="nf"><pre>${esc(MOLECULE.join('\n'))}</pre><div>${right}</div></div>`;
});

def('history', 'command history', args => {
  if (args[0] === '-c') { hist.length = 0; histIdx = 0; store.del('npos-hist'); return 'history cleared'; }
  return hist.map((h, i) => `<span class="d">${String(i + 1).padStart(4)}</span>  ${esc(h)}`).join('\n') || '<span class="d">(empty)</span>';
}, '[-c]');

def('man', 'manual pages', args => {
  const q = (args[0] || '').toLowerCase();
  if (!q || q === 'nanopulseos' || q === 'npos') { go('man'); return null; }
  const c = C[q];
  if (c) return `<span class="a">${esc(c.alias || q)}</span> ${esc(c.usage)}\n<span class="d">  ${esc(c.desc)}</span>`;
  if (FS.children.bin.children[q]) return `<span class="a">${esc(q)}</span>: a nanopulseOS program. see <a href="#man" data-run="man nanopulseos">man nanopulseos</a>`;
  return `<span class="e">No manual entry for ${esc(q)}</span>`;
}, '<cmd>');

def('which', 'locate a command', args => args.map(a => C[a] ? '/usr/bin/' + esc(a) : FS.children.bin.children[a] ? '/bin/' + esc(a) + ' <span class="d">(inside nanopulseOS)</span>' : `<span class="e">${esc(a)} not found</span>`).join('\n'), '<cmd>');

def('file', 'identify a file', args => {
  if (!args[0]) return '<span class="e">file: missing operand</span>';
  return args.map(a => {
    const n = find(a);
    if (!n) return `${esc(a)}: cannot open (No such file or directory)`;
    if (n.type === 'dir') return `${esc(a)}: directory`;
    if (n.iso) return `${esc(a)}: ISO 9660 CD-ROM filesystem data (bootable), GRUB 2, x86 BIOS${meta.size ? ', ' + fmtMB(meta.size) : ''}`;
    if (n.exec) return `${esc(a)}: ELF 32-bit LSB executable, Intel 80386 (linked into the kernel)`;
    return `${esc(a)}: ASCII text`;
  }).join('\n');
}, '<file>');

def(['wget', 'curl', 'download'], 'download nanopulseos.iso', () => {
  const a = document.createElement('a');
  a.href = ISO; a.download = ISO;
  document.body.appendChild(a); a.click(); a.remove();
  return `<span class="d">--${new Date().toISOString().replace('T', ' ').slice(0, 19)}--  https://nanopulseos.org/${ISO}</span>\nsaving to: '<span class="a">${ISO}</span>'${meta.size ? ' (' + fmtMB(meta.size) + ')' : ''}\n<span class="d">next:</span> <a href="#install" data-run="cd install">cd install</a> to flash it`;
}, '[url]');

def('sha256sum', 'sha-256 of the image, computed locally', async args => {
  const t = args[0] || ISO;
  const n = find(t);
  if (!n) return `<span class="e">sha256sum: ${esc(t)}: No such file or directory</span>`;
  if (!n.iso) {
    const text = String(body(n) || '').replace(/<[^>]+>/g, '');
    return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))) + '  ' + esc(t);
  }
  if (!crypto.subtle) return '<span class="e">sha256sum: needs a secure (https) context</span>';
  const buf = await (await fetch(ISO)).arrayBuffer();
  return `${hex(await crypto.subtle.digest('SHA-256', buf))}  ${ISO}\n<span class="d">compare with </span>sha256sum ${ISO}<span class="d"> (linux) · shasum -a 256 (macos) · certutil -hashfile ${ISO} SHA256 (windows)</span>`;
}, '<file>');
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');

def(['boot', 'run', 'start', 'qemu', 'qemu-system-i386'], 'boot nanopulseOS in the emulator', () => { go('run'); return emu.start(); });
def(['reboot', 'reset', 'restart'], 'restart the emulator', () => emu.reboot());
def(['halt', 'poweroff', 'shutdown', 'stop'], 'stop the emulator', () => emu.halt());
def('fullscreen', 'emulator fullscreen', () => emu.fullscreen());

def('theme', 'switch colour theme', args => {
  const root = document.documentElement;
  let t = (args[0] || '').toLowerCase();
  const isLight = () => root.dataset.theme ? root.dataset.theme === 'light' : matchMedia('(prefers-color-scheme: light)').matches;
  if (!t) t = isLight() ? 'dark' : 'light';
  if (!['light', 'dark', 'auto'].includes(t)) return '<span class="e">theme: use light, dark or auto</span>';
  if (t === 'auto') { delete root.dataset.theme; store.del('npos-theme'); }
  else { root.dataset.theme = t; store.set('npos-theme', t); }
  return `<span class="d">theme →</span> ${t}`;
}, '[light|dark|auto]');

def('open', 'open a section or link', args => {
  const a = (args[0] || '').toLowerCase();
  if (PAGES.includes(a)) { go(a); return null; }
  const links = { github: 'https://github.com/' + REPO, source: 'https://github.com/' + REPO, src: 'https://github.com/' + REPO, issues: `https://github.com/${REPO}/issues`, releases: `https://github.com/${REPO}/releases`, rufus: 'https://rufus.ie/', etcher: 'https://etcher.balena.io/', osdev: 'https://wiki.osdev.org/' };
  if (links[a]) { window.open(links[a], '_blank', 'noopener'); return `<span class="d">opening</span> ${links[a]}`; }
  if (a === ISO) return C.wget.fn([]);
  return `<span class="e">open: ${esc(args[0] || '')}: try ${[...PAGES, ...Object.keys(links)].join(', ')}</span>`;
}, '<section|github|releases|…>');

def('git', 'git (read-only)', async args => {
  const sub = args[0];
  if (sub === 'clone') return `git clone https://github.com/${REPO}\n<span class="d">(run that in your own terminal. this one can't write to disk)</span>`;
  if (sub === 'log') {
    const cs = await getCommits();
    if (!cs) return '<span class="e">git log: could not reach github</span>';
    return cs.map(c => `<a href="${c.url}" target="_blank" rel="noopener" class="a">${c.sha}</a> <span class="d">${c.date}</span> ${esc(c.msg)}`).join('\n');
  }
  if (sub === 'status') return 'On branch main\nnothing to commit, working tree clean';
  return 'usage: git [log | clone | status]';
}, '[log|clone|status]');

for (const p of PAGES) if (!C[p]) def(p, 'go to ' + p, () => { go(p); return null; });
def(['github', 'source', 'src'], 'open the source on github', () => C.open.fn(['github']));
def('sudo', '', () => 'guest is not in the sudoers file. This incident will be reported.');
def('rm', '', args => args.some(a => a === '/' || a === '/*') ? 'rm: everything here lives in RAM anyway. nothing to destroy.' : `<span class="e">rm: read-only filesystem</span>`);
def(['exit', 'logout'], '', () => 'logout\n<span class="d">there is no escape. (close the tab)</span>');
def(['vim', 'vi', 'emacs', 'nano', 'ed'], '', (a, r) => r.trim().startsWith('nano') ? 'did you mean <span class="a">nanopulse</span>?' : '<span class="d">ed is coming to nanopulseOS (not implemented yet).</span>');
def('nanopulse', '', () => C.neofetch.fn([]));
def('ping', '', args => `PING ${esc(args[0] || 'nanopulse')}: 64 bytes, time=0.042 ms\n<span class="d">it has a pulse.</span>`);

const HIDDEN = new Set(['sudo', 'rm', 'exit', 'logout', 'vim', 'vi', 'emacs', 'nano', 'ed', 'nanopulse', 'ping', 'dir', 'curl', 'download', 'run', 'start', 'qemu', 'qemu-system-i386', 'reset', 'restart', 'poweroff', 'shutdown', 'stop', 'source', 'src']);
const COMPLETABLE = () => Object.keys(C).filter(k => !HIDDEN.has(k)).sort();

/* tokenize with simple quote support */
function tokens(line) {
  const t = []; let m; const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  while ((m = re.exec(line))) t.push(m[1] ?? m[2] ?? m[3]);
  return t;
}

async function exec(line, { echo = true } = {}) {
  line = line.trim();
  if (!line) return;
  if (hist[hist.length - 1] !== line) { hist.push(line); if (hist.length > 200) hist.shift(); store.set('npos-hist', JSON.stringify(hist)); }
  histIdx = hist.length;

  const [cmd, ...args] = tokens(line);
  const name = cmd.toLowerCase();
  let res;
  const promptHtml = `<span class="ps-user">guest@nanopulse</span>:${esc(tildify(cwd))}$ ${esc(line)}`;

  if (C[name]) {
    try {
      res = C[name].fn(args, line);
      if (res && typeof res.then === 'function') {
        // only show a placeholder if the command is actually slow
        let entry = null;
        const slow = setTimeout(() => { entry = term.print(promptHtml, '<span class="d">working…</span>'); }, 180);
        try { res = await res; } catch (e) { res = '<span class="e">' + esc(name) + ': ' + esc(e.message || e) + '</span>'; }
        clearTimeout(slow);
        if (res == null) { if (entry) { entry.remove(); term.hideIfEmpty(); } return; }
        if (entry) entry.querySelector('.entry-out').innerHTML = res;
        else if (echo) term.print(promptHtml, res);
        term.scroll();
        return;
      }
    } catch (e) {
      res = '<span class="e">' + esc(name) + ': ' + esc(e.message || e) + '</span>';
    }
  } else if (FS.children.bin.children[name]) {
    res = body(FS.children.bin.children[name]);
  } else {
    const n = node(resolve(cmd));
    if (n && n.type === 'dir') return exec('cd ' + cmd, { echo });
    const guess = COMPLETABLE().find(k => lev(k, name) <= 1 || k.startsWith(name));
    res = `<span class="e">npsh: command not found: ${esc(cmd)}</span>` + (guess ? `\n<span class="d">did you mean</span> <a href="#" data-run="${esc(guess)}" class="a">${esc(guess)}</a><span class="d">? type help for everything.</span>` : '\n<span class="d">type help to see what works.</span>');
  }
  if (res != null && res !== '' && echo) term.print(promptHtml, res);
  else if (res === '' && echo) term.print(promptHtml, '');
}

function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/* ── terminal output panel ─────────────────────────────────── */

const term = (() => {
  const el = $('#term'), bodyEl = $('#term-body');
  const print = (inHtml, outHtml) => {
    el.hidden = false;
    const e = document.createElement('div');
    e.className = 'entry';
    e.innerHTML = `<div class="entry-in">${inHtml}</div>` + (outHtml !== '' ? `<div class="entry-out">${outHtml}</div>` : '');
    bodyEl.appendChild(e);
    while (bodyEl.children.length > 60) bodyEl.firstChild.remove();
    scroll();
    return e;
  };
  // show the top of the newest entry (long output like `help` stays readable)
  const scroll = () => { const last = bodyEl.lastElementChild; bodyEl.scrollTop = last ? last.offsetTop - 4 : 0; };
  const clear = () => { bodyEl.innerHTML = ''; el.hidden = true; };
  const hide = () => { el.hidden = true; };
  const hideIfEmpty = () => { if (!bodyEl.children.length) el.hidden = true; };
  $('#term-x').addEventListener('click', () => { clear(); input.focus(); });
  return { print, scroll, clear, hide, hideIfEmpty, get open(){ return !el.hidden; } };
})();

/* ── prompt input: history, completion, ghost text ─────────── */

const form = $('#prompt');
const input = $('#cmd');
const ghost = $('#ghost');
input.placeholder = finePointer ? 'type help · tab completes · 1–4 switch sections' : 'type a command (try help)';

function candidates(val) {
  const parts = val.split(/\s+/);
  if (parts.length <= 1) {
    const w = parts[0].toLowerCase();
    return { prefix: '', word: w, list: COMPLETABLE().filter(k => k.startsWith(w)) };
  }
  const cmd = parts[0].toLowerCase();
  const word = parts[parts.length - 1];
  const prefix = val.slice(0, val.length - word.length);
  if (cmd === 'theme') return { prefix, word, list: ['light', 'dark', 'auto'].filter(k => k.startsWith(word)) };
  if (cmd === 'git') return { prefix, word, list: ['log', 'clone', 'status'].filter(k => k.startsWith(word)) };
  if (cmd === 'man' || cmd === 'which') return { prefix, word, list: COMPLETABLE().filter(k => k.startsWith(word)) };
  if (cmd === 'open') return { prefix, word, list: [...PAGES, 'github', 'releases', 'issues', 'rufus', 'etcher'].filter(k => k.startsWith(word)) };
  // path completion
  const slash = word.lastIndexOf('/');
  const dirPart = slash >= 0 ? word.slice(0, slash + 1) : '';
  const base = slash >= 0 ? word.slice(slash + 1) : word;
  let d = node(resolve(dirPart || '.'));
  if (d && d.page && !dirPart) d = node(HOME);
  if (!d || d.type !== 'dir') return { prefix, word, list: [] };
  const onlyDirs = cmd === 'cd';
  const list = Object.keys(d.children)
    .filter(k => k.startsWith(base) && (base.startsWith('.') || !d.children[k].hidden) && (!onlyDirs || d.children[k].type === 'dir'))
    .map(k => dirPart + k + (d.children[k].type === 'dir' ? '/' : ''));
  if (onlyDirs && !dirPart) PAGES.forEach(pg => { if (pg.startsWith(base) && !list.some(l => l.startsWith(pg))) list.push(pg); });
  return { prefix, word, list };
}
const commonPrefix = l => l.reduce((a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i++; return a.slice(0, i); });

function updateGhost() {
  const v = input.value;
  ghost.innerHTML = '';
  if (!v || input.selectionStart !== v.length) return;
  const { word, list } = candidates(v);
  if (list.length && word && list[0] !== word) ghost.innerHTML = '<i>' + esc(v) + '</i>' + esc(list[0].slice(word.length));
}

function complete() {
  const v = input.value;
  const { prefix, word, list } = candidates(v);
  if (!list.length) return;
  if (list.length === 1) {
    input.value = prefix + list[0] + (list[0].endsWith('/') ? '' : ' ');
  } else {
    const cp = commonPrefix(list);
    if (cp.length > word.length) input.value = prefix + cp;
    else term.print(`<span class="ps-user">guest@nanopulse</span>:${esc(tildify(cwd))}$ ${esc(v)}`, list.map(esc).join('   '));
  }
  updateGhost();
}

input.addEventListener('input', updateGhost);
input.addEventListener('keydown', e => {
  if (e.key === 'Tab') { e.preventDefault(); complete(); return; }
  if (e.key === 'ArrowRight' && ghost.textContent && input.selectionStart === input.value.length) {
    e.preventDefault(); complete(); return;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (histIdx > 0) { histIdx--; input.value = hist[histIdx]; }
    requestAnimationFrame(() => input.setSelectionRange(input.value.length, input.value.length));
    updateGhost(); return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (histIdx < hist.length - 1) { histIdx++; input.value = hist[histIdx]; } else { histIdx = hist.length; input.value = ''; }
    updateGhost(); return;
  }
  if (!input.value) {
    const i = PAGES.indexOf(page);
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(PAGES[(i + PAGES.length - 1) % PAGES.length]); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(PAGES[(i + 1) % PAGES.length]); return; }
    if (/^[1-4]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); go(PAGES[+e.key - 1]); return; }
    if (e.key === 'Enter' && page === 'run' && emu.state === 'halted') { e.preventDefault(); exec('boot', { echo: false }); return; }
  }
  if (e.key === 'Escape') { e.preventDefault(); if (input.value) input.value = ''; else term.hide(); updateGhost(); return; }
  if (e.ctrlKey && e.key.toLowerCase() === 'l') { e.preventDefault(); term.clear(); return; }
  if (e.ctrlKey && e.key.toLowerCase() === 'c' && input.selectionStart === input.selectionEnd) {
    e.preventDefault();
    if (input.value) term.print(`<span class="ps-user">guest@nanopulse</span>:${esc(tildify(cwd))}$ ${esc(input.value)}^C`, '');
    input.value = ''; updateGhost();
  }
});
form.addEventListener('submit', e => {
  e.preventDefault();
  const v = input.value;
  input.value = '';
  ghost.innerHTML = '';
  exec(v);
});
$('.ps-label').addEventListener('click', () => input.focus());

/* type anywhere → the prompt */
document.addEventListener('keydown', e => {
  if (emu.captured) return;
  const t = e.target;
  if (t === input || t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
  if (e.key === 'Escape') { term.hide(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Enter' && page === 'run' && emu.state === 'halted' && (t === document.body || t === out)) { exec('boot', { echo: false }); return; }
  if (e.key.length === 1 && e.key !== ' ' || e.key === 'ArrowUp' || e.key === 'Tab' && t === document.body) {
    if (/^[1-4]$/.test(e.key) && !input.value) { go(PAGES[+e.key - 1]); e.preventDefault(); return; }
    input.focus({ preventScroll: true });
  }
});

/* anything with data-run acts like a typed command */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-run]');
  if (!el) return;
  e.preventDefault();
  exec(el.dataset.run, { echo: true });
});

/* ── install page: copy buttons ─────────────────────────────── */

$$('.copy').forEach(b => b.addEventListener('click', async () => {
  const text = b.previousElementSibling.textContent;
  try { await navigator.clipboard.writeText(text); b.textContent = 'copied'; b.classList.add('done'); }
  catch { b.textContent = 'select it'; }
  setTimeout(() => { b.textContent = 'copy'; b.classList.remove('done'); }, 1400);
}));

/* ── live metadata ─────────────────────────────────────────── */

async function cachedJSON(key, url) {
  const hit = ss && store.get(key, ss);
  if (hit) { try { return JSON.parse(hit); } catch {} }
  const r = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
  if (!r.ok) throw new Error(r.status);
  const j = await r.json();
  if (ss) store.set(key, JSON.stringify(j), ss);
  return j;
}

async function getCommits() {
  if (meta.commits) return meta.commits;
  try {
    const j = await cachedJSON('npos-commits', `https://api.github.com/repos/${REPO}/commits?per_page=6`);
    meta.commits = j.map(c => ({ sha: c.sha.slice(0, 7), url: c.html_url, date: fmtDate(c.commit.author.date), msg: c.commit.message.split('\n')[0].slice(0, 90) }));
  } catch { return null; }
  return meta.commits;
}

async function fetchMeta() {
  try {
    const r = await fetch(ISO, { method: 'HEAD' });
    const len = +r.headers.get('content-length');
    if (r.ok && len > 1e6) {
      meta.size = len;
      meta.built = r.headers.get('last-modified');
      $('#sys-image').innerHTML = '<span class="hide-sm">' + ISO + ' · </span>' + fmtMB(len);
      $$('[data-iso-size]').forEach(s => { s.textContent = fmtMB(len); });
      $('#emu-idle-note').textContent = 'downloads a ' + fmtMB(len) + ' image · i686 · 32 MB RAM';
    }
  } catch {}
  try {
    const j = await cachedJSON('npos-release', `https://api.github.com/repos/${REPO}/releases/latest`);
    meta.release = j.tag_name;
    meta.released = j.published_at;
    $('#sys-release').innerHTML = esc(j.tag_name) + '<span class="hide-sm"> · ' + fmtDate(j.published_at) + '</span>';
  } catch {}
}

/* ── clock ─────────────────────────────────────────────────── */

const clock = $('#st-clock');
const tick = () => { clock.textContent = new Date().toTimeString().slice(0, 5); };
tick(); setInterval(tick, 10000);

/* ── start ─────────────────────────────────────────────────── */

(async () => {
  fetchMeta();
  const target = pageFromHash();
  const firstVisit = !(ss && store.get('npos-booted', ss));
  if (firstVisit && !location.hash && !reduced) await boot();
  else if (ss) store.set('npos-booted', '1', ss);
  go(target, { push: false });
  if (finePointer) input.focus({ preventScroll: true });
  heartbeat();
})();

})();
