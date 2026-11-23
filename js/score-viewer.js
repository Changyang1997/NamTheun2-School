/* Nam Theun 2 School — in-app score viewer.
   Clicking a class score button opens a modal:
     - Apps Script URL / other http link  -> embedded in an iframe
     - Spreadsheet ID or docs.google link -> score table rendered from gviz,
       using the same layout as the supplied Index.html / Code.gs. */
(function () {
  const NT2 = window.NT2 = window.NT2 || {};

  // Fallback tab names, used only when Apps Script cannot supply the real list
  // (e.g. an older Code.gs deployment still running on the host).
  const ALLOWED_SHEETS = [
    'ເດືອນ 09', 'ເດືອນ 10', 'ເດືອນ 11', 'ເດືອນ 12', 'ພາກຮຽນ I',
    'ເດືອນ 02', 'ເດືອນ 03', 'ເດືອນ 04', 'ເດືອນ 05', 'ພາກຮຽນ II', 'ຄະແນນໝົດປີ'
  ];

  // ໜ້າຄະແນນ: ບໍ່ສະແດງ tab ເຫຼົ່ານີ້ໃນ dropdown (ເປັນໜ້າຕັ້ງຄ່າ/ສະຫຼຸບ ຫຼືໜ້າລາຍບຸກຄົນ).
  const EXCLUDED_SCORE_TABS = [
    'ຕັ້ງຄ່າ',
    'ສະເລ່ຍພາກຮຽນ I',
    'ເສັງພາກຮຽນ I',
    'ສະເລ່ຍພາກຮຽນ II',
    'ເສັງພາກຮຽນ II'
  ];

  function normalizeTabName(v) {
    return String(v == null ? '' : v).trim()
      .replace(/Ⅰ/g, 'I').replace(/Ⅱ/g, 'II')
      .replace(/\s+/g, ' ');
  }

  function isExcludedScoreTab(name) {
    const s = normalizeTabName(name);
    if (EXCLUDED_SCORE_TABS.indexOf(s) !== -1) return true;
    // ນຮ 01 … ນຮ 30 (ຮັບທັງແບບມີ 0 ນຳໜ້າ ແລະບໍ່ມີ)
    const m = s.match(/^ນຮ\s*(\d{1,2})$/);
    if (m) {
      const n = Number(m[1]);
      return n >= 1 && n <= 30;
    }
    return false;
  }

  const t = (key, fallback) => (window.NT2 && NT2.Lang) ? NT2.Lang.t(key, fallback) : fallback;

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function nonEmpty(v) {
    return v !== '' && v !== null && v !== undefined && String(v).trim() !== '';
  }

  function formatCell(v) {
    if (!nonEmpty(v)) return '';
    // Keep fractions between 0 and 1 intact: gviz may expose a percentage as
    // 0.5294, and rounding here to 0.53 would turn it into a wrong 53.00%.
    const tidy = n => (Number.isInteger(n) || (n > 0 && n < 1)) ? n : Math.round(n * 100) / 100;
    if (typeof v === 'number') return tidy(v);
    const s = String(v);
    if (s.trim() !== '' && !isNaN(s)) return tidy(Number(s));
    return v;
  }

  /* ── recognise what the Sheet cell contains ── */
  function normalize(value) {
    const s = String(value == null ? '' : value).trim();
    if (!s || s === '#') return { type: 'none' };

    if (/script\.google\.com\/macros\/s\//i.test(s)) return { type: 'iframe', url: s };

    if (/docs\.google\.com\/spreadsheets/i.test(s)) {
      const m = s.match(/\/d\/([A-Za-z0-9_-]{10,})/);
      if (m) return { type: 'id', id: m[1] };
    }

    if (/^https?:\/\//i.test(s)) return { type: 'iframe', url: s };

    // Bare spreadsheet ID (letters, digits, - and _).
    if (/^[A-Za-z0-9_-]{10,}$/.test(s)) return { type: 'id', id: s };

    return { type: 'iframe', url: s };
  }

  /* ── gviz reader for a spreadsheet ID ── */
  async function fetchGrid(spreadsheetId, sheetName, raw) {
    // Without headers=0, gviz uses the sheet's first row as column labels —
    // that row holds the real subject headers (ຊື່, ພາສາລາວ, ຄະນິດສາດ, ...).
    // Attendance month sheets need headers=0: their first 4 rows are the
    // ວັນທີ / ວັນ / ຊົ່ວໂມງ / ວິຊາ header block, not column labels.
    const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}`
      + `/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`
      + (raw ? '&headers=0' : '')
      + `&_t=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    const text = await res.text();
    const m = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/);
    if (!m) return null;
    const json = JSON.parse(m[1]);
    if (!json.table || !json.table.rows || json.status !== 'ok') return null;

    const width = json.table.cols ? json.table.cols.length : 0;
    const headers = Array.from({ length: width }, (_, i) => {
      const label = (json.table.cols[i] && json.table.cols[i].label)
        ? String(json.table.cols[i].label) : '';
      // Column A often contains the whole school banner ending in "ລຳດັບ".
      if (i === 0 && label.indexOf('ລຳດັບ') !== -1) return 'ລຳດັບ';
      return label;
    });
    const rows = json.table.rows.map(row => Array.from({ length: width }, (_, i) => {
      const cell = row.c && row.c[i];
      if (!cell || cell.v === null || cell.v === undefined) return '';
      // f keeps Sheet's own formatting (e.g. 2 decimal places).
      return (typeof cell.f === 'string' && cell.f !== '') ? cell.f : cell.v;
    }));
    return { headers, rows };
  }

  function buildTable(grid) {
    const rawHeaders = grid.headers || [];
    let dataRows = (grid.rows || []).filter(row => row.some(nonEmpty));
    dataRows = dataRows.filter(row => {
      const col0 = String(row[0] == null ? '' : row[0]).trim();
      const col1 = String(row[1] == null ? '' : row[1]).trim();
      if (col0 !== '' || col1 !== '') return true;
      return row.some(cell => {
        if (!nonEmpty(cell)) return false;
        const s = String(cell).trim();
        return s !== '0' && s !== '-';
      });
    });

    // Keep columns that have a header or real data, matching the supplied
    // Code.gs / Index.html filtering behaviour.
    const validCols = [];
    for (let c = 0; c < rawHeaders.length; c++) {
      const header = String(rawHeaders[c] == null ? '' : rawHeaders[c]).trim();
      const hasData = dataRows.some(r => nonEmpty(r[c]));
      if (header !== '' || hasData) validCols.push(c);
    }

    const headers = validCols.map(c => rawHeaders[c] == null ? '' : String(rawHeaders[c]));
    const body = dataRows.map(r => validCols.map(c => formatCell(r[c])));
    return { headers, rows: body };
  }

  /* ແຖວສະຫຼຸບຈຳນວນ/ເປີເຊັນນັກຮຽນ: gviz ສົ່ງແຕ່ຕົວເລກ (9, 52.94%)
     ໂດຍບໍ່ມີຄຳວ່າ ຄົນ / ເທົ່າກັບ ທີ່ເຫັນໃນ Google Sheet → ເຕີມໃຫ້ຕອນສະແດງ. */
  const SCORE_SUMMARY_RE = /^ເປີເຊັນນັກຮຽນ(ເກັ່ງ|ກາງ|ອ່ອນ)ມີ$/;

  function applyScoreSummaryLabels(table) {
    (table.rows || []).forEach(row => {
      const labelIdx = row.findIndex(v => SCORE_SUMMARY_RE.test(String(v == null ? '' : v).trim()));
      if (labelIdx < 0) return;

      let countIdx = -1, percentIdx = -1;
      for (let c = labelIdx + 1; c < row.length; c++) {
        const s = String(row[c] == null ? '' : row[c]).trim();
        if (!s) continue;
        if (percentIdx < 0 && s.indexOf('%') !== -1) { percentIdx = c; continue; }
        // gviz may expose a percentage as a number (0.5294) instead of '52.94%'.
        if (percentIdx < 0 && /^[-+]?\d+(?:\.\d+)?$/.test(s)) {
          const n = Number(s);
          if (n > 0 && n < 1) { percentIdx = c; continue; }
        }
        if (countIdx < 0 && /^[-+]?\d+(?:\.\d+)?(?:\s*ຄົນ)?$/.test(s)) countIdx = c;
      }
      if (countIdx < 0) return;

      // ເອົາທັງໝົດໃສ່ເຊລດຽວ (ເຊລທີ່ມີຈຳນວນຄົນ) ແລ້ວລ້າງເຊລເປີເຊັນທີ່ຊ້ຳກັນອອກ.
      const countText = String(formatCell(row[countIdx])).trim();
      let text = countText.indexOf('ຄົນ') !== -1 ? countText : `${countText} ຄົນ`;
      if (percentIdx >= 0) {
        let pctText = String(formatCell(row[percentIdx])).trim();
        if (pctText.indexOf('%') === -1) {
          const n = Number(pctText);
          pctText = (Number.isFinite(n) && n >= 0 && n <= 1 ? (n * 100).toFixed(2) : pctText) + '%';
        }
        text += pctText.indexOf('ເທົ່າກັບ') !== -1 ? `, ${pctText}` : `, ເທົ່າກັບ ${pctText}`;
        row[percentIdx] = '';
      }
      row[countIdx] = text;
    });
    return table;
  }

  /* ── attendance table: month tabs keep their own 4-row header block ──
     ວັນທີ/ເດືອນ/ປີ · ວັນ · ຊົ່ວໂມງ · ວິຊາ  →  ຫົວຕາຕະລາງ
     ແຖວນັກຮຽນເລີ່ມຫຼັງຈາກນັ້ນ (ຫຼັກທີ 1 ຢູ່ຖັນ A). */
  function buildAttendanceTable(grid) {
    const rows = (grid.rows || []).map(row => (row || []).slice());
    if (!rows.length) return buildTable(grid);

    const firstStudent = rows.findIndex(row =>
      /^\d+$/.test(String(row[0] == null ? '' : row[0]).trim()) && nonEmpty(row[1]));
    if (firstStudent < 0) return buildTable(grid); // ໜ້າສະຫຼຸບ / ຕັ້ງຄ່າ

    const meta = rows.slice(0, firstStudent);
    const findMeta = needle => meta.find(row =>
      String(row[1] == null ? '' : row[1]).indexOf(needle) !== -1) || null;
    const dateRow    = findMeta('ວັນທີ') || findMeta('date');
    const dayRow     = findMeta('ວັນ(') || findMeta('day');
    const hourRow    = findMeta('ຊົ່ວໂມງ') || findMeta('hours');
    const subjectRow = findMeta('ວິຊາ(') || findMeta('subjects');
    if (!dateRow && !dayRow && !hourRow && !subjectRow) return buildTable(grid);

    const width = rows.reduce((w, row) => Math.max(w, row.length), (grid.headers || []).length);
    // ວັນທີ/ວັນຖືກ merge ຂ້າມຫຼາຍຖັນຊົ່ວໂມງ → ກະຈາຍຄ່າໄປທາງຂວາ.
    const spread = row => {
      const out = new Array(width).fill('');
      let last = '';
      // ຖັນ 0/1 ແມ່ນຖັນລໍາດັບ ແລະຖັນປ້າຍ (ວັນທີ, ວັນ, ...) — ຢ່າເອົາມາເປັນຄ່າເລີ່ມຕົ້ນ.
      for (let c = 2; c < width; c++) {
        if (nonEmpty(row && row[c])) last = row[c];
        out[c] = last;
      }
      return out;
    };
    const dates = spread(dateRow), days = spread(dayRow),
          hours = spread(hourRow), subjects = spread(subjectRow);

    const rawHeaders = new Array(width);
    rawHeaders[0] = 'ລຳດັບ';
    rawHeaders[1] = 'ຊື່ ແລະ ນາມສະກຸນ';
    for (let c = 2; c < width; c++) {
      const parts = [];
      [dates[c], days[c], hours[c], subjects[c]].forEach(v => {
        const s = nonEmpty(v) ? String(v).trim() : '';
        if (s && parts[parts.length - 1] !== s) parts.push(s);
      });
      rawHeaders[c] = parts.join(' · ');
    }

    const dataRows = rows.slice(firstStudent).filter(row => row.some(nonEmpty));

    // ຖັນສະຫຼຸບ 4 ຖັນສຸດທ້າຍຂອງແຕ່ລະເດືອນ ກົງກັບກະແຈໃນໜ້າຕັ້ງຄ່າ:
    // P = ມາຮຽນ, L = ມາຮຽນຊ້າ, E = ຂາດມີເຫດຜົນ, U = ຂາດບໍ່ມີເຫດຜົນ.
    // ກຳນົດຊື່ໃຫ້ຖັນເຫຼົ່ານີ້ເພາະໃນ Sheet ບໍ່ມີແຖວຫົວກຳກັບ.
    const isNumericCell = v => nonEmpty(v) && /^[-+]?\d+(?:\.\d+)?$/.test(String(v).trim());
    const hasNumericCol = c => dataRows.some(row => isNumericCell(row[c]));
    let summaryStart = -1;
    // ຊອກກຸ່ມຖັນຕົວເລກ 4 ຖັນຕິດກັນຈາກດ້ານຂວາ (ກັນກໍລະນີມີຖັນໝາຍເຫດຕໍ່ທ້າຍ).
    for (let c = width - 4; c >= 2; c--) {
      if (hasNumericCol(c) && hasNumericCol(c + 1) && hasNumericCol(c + 2) && hasNumericCol(c + 3)) {
        summaryStart = c;
        break;
      }
    }
    if (summaryStart < 0) {
      // ສຳຮອງ: ໃຊ້ 4 ຖັນສຸດທ້າຍທີ່ມີຂໍ້ມູນ ຕາມໂຄງສ້າງເດີມ.
      let lastDataCol = -1;
      dataRows.forEach(row => {
        for (let c = 0; c < width; c++) if (nonEmpty(row[c])) lastDataCol = c;
      });
      const candidate = lastDataCol - 3;
      if (candidate >= 2 && hasNumericCol(candidate)) summaryStart = candidate;
    }
    const summaryCodes = ['P', 'L', 'E', 'U'];
    if (summaryStart >= 2) {
      // ບັງຄັບໃຊ້ລະຫັດສະຫຼຸບ ເພາະ spread() ດ້ານເທິງເຕີມວັນທີ່ຖືກດຶງມາໃສ່ຫົວຖັນເຫຼົ່ານີ້ແລ້ວ.
      summaryCodes.forEach((code, i) => { rawHeaders[summaryStart + i] = code; });
    }

    const validCols = [];
    for (let c = 0; c < width; c++) {
      if (c < 2 || rawHeaders[c] !== '' || dataRows.some(r => nonEmpty(r[c]))) validCols.push(c);
    }
    return {
      headers: validCols.map(c => rawHeaders[c] || ''),
      rows: dataRows.map(r => validCols.map(c => formatCell(r[c])))
    };
  }

  /* ── modal shell ── */
  function ensureOverlay() {
    let overlay = document.getElementById('scoreViewerOverlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'scoreViewerOverlay';
    overlay.className = 'score-viewer-overlay';
    overlay.innerHTML = `
      <div class="score-viewer-modal" role="dialog" aria-modal="true">
        <div class="sv-header">
          <div class="sv-title">
            <span class="material-symbols-rounded">bar_chart</span>
            <span id="svTitle"></span>
          </div>
          <div class="sv-actions">
            <button class="sv-icon-btn admin-only" id="svNewTab" title="${esc(t('score.viewer.newTab', 'Open in new tab'))}" aria-label="${esc(t('score.viewer.newTab', 'Open in new tab'))}">
              <span class="material-symbols-rounded">open_in_new</span>
            </button>
            <button class="sv-icon-btn" id="svTheme" title="${esc(t('score.viewer.theme', 'Theme'))}" aria-label="${esc(t('score.viewer.theme', 'Theme'))}">⚙️</button>
            <button class="sv-icon-btn" id="svClose" title="${esc(t('score.viewer.close', 'Close'))}" aria-label="${esc(t('score.viewer.close', 'Close'))}">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
        </div>
        <div class="sv-body" id="svBody"></div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => { if (e.target === overlay) NT2.ScoreViewer.close(); });
    document.getElementById('svClose').addEventListener('click', () => NT2.ScoreViewer.close());
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overlay.classList.contains('active')) NT2.ScoreViewer.close();
    });
    return overlay;
  }

  NT2.ScoreViewer = {
    _state: null,
    _loadToken: 0, // prevents an older tab-list request from overwriting a newer file

    open(opts) {
      const o = opts || {};
      const label = o.label || t('score.title_full', 'Scores');
      const source = o.value || '';
      const mode = o.mode === 'attendance' ? 'attendance' : 'score';
      const target = normalize(source);

      if (target.type === 'none') {
        if (NT2.App && NT2.App._noLink) NT2.App._noLink();
        return;
      }

      const overlay = ensureOverlay();
      const body = document.getElementById('svBody');
      document.getElementById('svTitle').textContent = label;
      overlay.classList.remove('sv-dark');
      body.innerHTML = '';

      const themeBtn = document.getElementById('svTheme');
      themeBtn.textContent = '⚙️';
      themeBtn.title = t('score.viewer.theme', 'Theme');

      const newTab = document.getElementById('svNewTab');
      newTab.title = t('score.viewer.newTab', 'Open in new tab');
      document.getElementById('svClose').title = t('score.viewer.close', 'Close');
      newTab.onclick = () => {
        const url = target.type === 'id'
          ? `https://docs.google.com/spreadsheets/d/${target.id}/edit`
          : target.url;
        window.open(url, '_blank', 'noopener');
      };

      overlay.classList.add('active');

      if (target.type === 'iframe') {
        const frame = document.createElement('iframe');
        frame.className = 'sv-iframe';
        frame.src = target.url;
        frame.title = label;
        frame.setAttribute('allow', 'fullscreen');
        body.appendChild(frame);
        this._state = { type: 'iframe' };
        return;
      }

      // Spreadsheet ID → in-app table viewer (same shell for scores & attendance).
      this._state = { type: 'id', id: target.id, mode, sheets: [], current: null, term: '' };
      body.innerHTML = `
        <div class="sv-table-view">
          <div class="sv-toolbar">
            <input type="text" class="sv-search" id="svSearch"
                   placeholder="${esc(t('score.viewer.search', 'Search names...'))}">
            <select class="sv-select" id="svSheetSelect">
              <option value="">${esc(t('score.viewer.selectMonth', 'Select month...'))}</option>
            </select>
          </div>
          <div class="sv-banner" id="svBanner">${esc(mode === 'attendance'
            ? t('score.viewer.att.loadingSheets', 'Loading attendance sheets...')
            : t('score.viewer.loadingSheets', 'Loading score sheets...'))}</div>
          <div class="sv-loader" id="svLoader"></div>
          <div class="sv-table-container">
            <table class="sv-table">
              <thead><tr id="svHead"></tr></thead>
              <tbody id="svRows"></tbody>
            </table>
          </div>
        </div>`;

      document.getElementById('svSearch').addEventListener('input', e => {
        this._state.term = e.target.value.toLowerCase().trim();
        this._renderRows();
      });
      document.getElementById('svSheetSelect').addEventListener('change', e => {
        this._state.current = e.target.value;
        this._renderRows();
      });
      themeBtn.onclick = () => {
        const dark = overlay.classList.toggle('sv-dark');
        themeBtn.textContent = dark ? '🌙' : '☀️';
      };

      this._loadSpreadsheet(target.id, mode);
    },

    async _loadSpreadsheet(id, mode) {
      if (!this._state || this._state.id !== id) return;
      const token = ++this._loadToken;
      const isCurrent = () => token === this._loadToken && this._state && this._state.id === id;
      const loader = document.getElementById('svLoader');
      const banner = document.getElementById('svBanner');
      if (loader) loader.style.display = 'block';

      const attendance = mode === 'attendance';

      // ຖາມ Apps Script ເອົາລາຍຊື່ tab ຈິງຂອງໄຟລ໌ນີ້ → ຮອງຮັບການປ່ຽນຊື່ tab.
      // ຖ້າ Code.gs ເທິງ host ຍັງເປັນເວີຊັນເກົ່າ ຈະໄດ້ [] ແລ້ວໃຊ້ຊື່ເກົ່າຕໍ່ໄປ.
      // ໜ້າຄະແນນຕ້ອງບໍ່ສະແດງ tab ຕັ້ງຄ່າ/ສະຫຼຸບ ແລະ ນຮ 01–30;
      // ໜ້າເຂົ້າຮ່ວມຍັງໃຊ້ລາຍຊື່ເດີມທຸກ tab.
      let sheetNames = ALLOWED_SHEETS.filter(n => attendance || !isExcludedScoreTab(n));
      try {
        if (NT2.Data && typeof NT2.Data.fetchSpreadsheetTabs === 'function') {
          const dynamic = await NT2.Data.fetchSpreadsheetTabs(
            `https://docs.google.com/spreadsheets/d/${id}/edit`);
          if (!isCurrent()) return;
          if (dynamic.length) {
            const usable = (attendance ? dynamic : dynamic.filter(n => !isExcludedScoreTab(n)))
              .map(normalizeTabName).filter(Boolean);
            const known = ALLOWED_SHEETS.filter(n => usable.indexOf(normalizeTabName(n)) !== -1);
            const extra = usable.filter(n => known.indexOf(normalizeTabName(n)) === -1 &&
              ALLOWED_SHEETS.indexOf(normalizeTabName(n)) === -1);
            // Dynamic names are authoritative: gviz silently returns the default tab
            // for a name that no longer exists, so do not re-add stale fallbacks.
            sheetNames = Array.from(new Set(known.concat(extra)));
          }
        }
      } catch (e) {}

      const results = await Promise.all(sheetNames.map(async name => {
        try {
          const grid = await fetchGrid(id, name, attendance);
          if (!grid) return null;
          const table = attendance ? buildAttendanceTable(grid) : applyScoreSummaryLabels(buildTable(grid));
          return (table.headers.length && table.rows.length) ? { name, table } : null;
        } catch (e) { return null; }
      }));

      if (!isCurrent()) return;
      const sheets = results.filter(Boolean);
      this._state.sheets = sheets;
      if (loader) loader.style.display = 'none';

      const select = document.getElementById('svSheetSelect');
      const bannerEl = document.getElementById('svBanner');
      if (bannerEl) bannerEl.textContent = attendance
        ? t('score.viewer.att.dataTitle', 'Attendance data')
        : t('score.viewer.dataTitle', 'Score data');

      if (!select) return;
      select.innerHTML = '';
      if (!sheets.length) {
        const noSheets = attendance
          ? t('score.viewer.att.noSheets', 'No attendance sheets found')
          : t('score.viewer.noSheets', 'No score sheets found');
        select.innerHTML = `<option value="">${esc(noSheets)}</option>`;
        this._setTable({ headers: [], rows: [] });
        return;
      }
      sheets.forEach((s, i) => {
        const opt = document.createElement('option');
        opt.value = s.name;
        opt.textContent = s.name;
        select.appendChild(opt);
        if (i === 0) select.value = s.name;
      });
      this._state.current = select.value;
      this._renderRows();
    },

    _renderRows() {
      const st = this._state;
      if (!st || st.type !== 'id') return;
      const sheet = st.sheets.find(s => s.name === st.current);
      this._setTable(sheet ? sheet.table : { headers: [], rows: [] });
    },

    _setTable(table) {
      const head = document.getElementById('svHead');
      const rowsEl = document.getElementById('svRows');
      if (!head || !rowsEl) return;
      head.innerHTML = '';
      rowsEl.innerHTML = '';

      const headers = table.headers || [];
      if (!headers.length || !table.rows || !table.rows.length) {
        rowsEl.innerHTML = `<tr><td class="sv-empty">${esc(t('score.viewer.noRows', 'No data in this sheet'))}</td></tr>`;
        return;
      }
      headers.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        head.appendChild(th);
      });

      const term = (this._state && this._state.term) || '';
      const rows = table.rows.filter(row => !term || row.some(c => String(formatCell(c)).toLowerCase().indexOf(term) !== -1));
      if (!rows.length) {
        rowsEl.innerHTML = `<tr><td class="sv-empty">${esc(t('score.viewer.noMatch', 'No matching results'))}</td></tr>`;
        return;
      }
      rows.forEach(row => {
        const tr = document.createElement('tr');
        row.forEach(cell => {
          const td = document.createElement('td');
          td.textContent = formatCell(cell);
          tr.appendChild(td);
        });
        rowsEl.appendChild(tr);
      });
    },

    close() {
      const overlay = document.getElementById('scoreViewerOverlay');
      if (!overlay) return;
      this._loadToken++; // cancel in-flight tab/grid loads
      overlay.classList.remove('active');
      const body = document.getElementById('svBody');
      if (body) body.innerHTML = ''; // stop iframe loading
      this._state = null;
    }
  };
})();
