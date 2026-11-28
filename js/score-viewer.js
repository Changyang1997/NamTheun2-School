/* Nam Theun 2 School — in-app score viewer.
   Clicking a class score button opens a modal:
     - Apps Script URL / other http link  -> embedded in an iframe
     - Spreadsheet ID or docs.google link -> score table rendered from CSV,
       with only month selector, theme toggle and close button in front:
       row 6 header and row 7+ data from CSV export (gviz drops text cells), blank rows/columns removed,
       empty-header columns removed by Index.html, numbers rounded, count cell shows only the number. */
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

  const _sheetMeta = {};

  // Index.html calls getSpreadsheetName(). The public /edit page also carries
  // every tab's gid in its topsnapshot, which the CSV export endpoint needs.
  async function fetchSheetMeta(id, fallback) {
    if (_sheetMeta[id]) return _sheetMeta[id];
    const meta = { name: fallback || '', gids: {} };
    try {
      const res = await fetch(`https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/edit`,
        { cache: 'no-store' });
      const raw = await res.text();
      const m = raw.match(/<title>([^<]*)<\/title>/i);
      if (m) {
        const name = m[1].replace(/\s*-\s*Google\s+[^-]+$/i, '').trim();
        if (name) meta.name = name;
      }
      const clean = raw.replace(/\\"/g, '"');
      const re = /\[\d+,\d+,"(\d+)",\[\{"1":\[\[0,0,"([^"]+)"\]/g;
      let tab;
      while ((tab = re.exec(clean))) {
        const name = normalizeTabName(tab[2]);
        if (name) meta.gids[name] = tab[1];
      }
    } catch (e) {}
    _sheetMeta[id] = meta;
    return meta;
  }

  /* Google Sheets CSV export returns the same display strings as
     getDisplayValues() in Code.gs, including text like "1d", "3d",
     "ຄົນ" and "ເທົ່າກັບ". gviz silently drops those cells, so scores
     must use this endpoint instead. Only the count cell is trimmed to the
     number; ຄົນ / ເທົ່າກັບ / percent stay in their own Sheet columns. */
  function parseCsv(text) {
    const rows = [];
    let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else quoted = false;
        } else field += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (ch !== '\r') field += ch;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  async function fetchCsvGrid(spreadsheetId, sheetName, gids) {
    const gid = gids[normalizeTabName(sheetName)];
    if (!gid) return null;
    const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}`
      + `/export?format=csv&gid=${encodeURIComponent(gid)}`
      + `&_t=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = parseCsv(await res.text());
    if (data.length < 6) return { headers: [], rows: [] };
    // Exactly Code.gs: row 6 = header, row 7+ = data.
    return { headers: data[5] || [], rows: data.slice(6) };
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

  /* ── raw gviz reader for a spreadsheet ID ──
     Code.gs.txt reads Sheet row 6 as the header and row 7+ as data via
     getDisplayValues(). gviz does not return row 6 as a data row, but
     headers=N builds each column label from rows 1..N. Requesting 5 and 6
     header rows and subtracting the 5-row prefix gives exactly the row-6
     header Apps Script sees. Attendance keeps the whole grid because its
     ວັນທີ/ວັນ/ຊົ່ວໂມງ/ວິຊາ block starts higher up. */
  const SCORE_HEADER_ROWS = 6;

  async function fetchGviz(spreadsheetId, sheetName, headers) {
    const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}`
      + `/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`
      + `&headers=${headers}`
      + `&_t=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    const text = await res.text();
    const m = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/);
    if (!m) return null;
    const json = JSON.parse(m[1]);
    if (!json.table || !json.table.rows || json.status !== 'ok') return null;
    return json;
  }

  function gvizRows(json) {
    const width = json.table.cols ? json.table.cols.length : 0;
    return json.table.rows.map(row => Array.from({ length: width }, (_, i) => {
      const cell = row.c && row.c[i];
      if (!cell) return '';
      // f keeps Sheet's own display formatting (e.g. "9 ຄົນ", "52.94%").
      const display = cell.f;
      const value = (display !== undefined && display !== null && String(display) !== '')
        ? display : cell.v;
      return (value === null || value === undefined) ? '' : value;
    }));
  }

  async function fetchGrid(spreadsheetId, sheetName, raw, gids) {
    if (!raw) {
      // Scores need the exact display values from the Sheet. CSV export is
      // used here because gviz drops text-only cells such as "1d"/"3d".
      const csv = await fetchCsvGrid(spreadsheetId, sheetName, gids || {});
      if (csv) return csv;
    }

    if (raw) {
      // Attendance: labels only define the width; the attendance builder creates
      // its own headers from the 4-row ວັນທີ/ວັນ/ຊົ່ວໂມງ/ວິຊາ block.
      const json = await fetchGviz(spreadsheetId, sheetName, 0);
      if (!json) return null;
      const width = json.table.cols ? json.table.cols.length : 0;
      const headers = Array.from({ length: width }, (_, i) => {
        const label = (json.table.cols[i] && json.table.cols[i].label)
          ? String(json.table.cols[i].label) : '';
        // Column A often contains the whole school banner ending in "ລຳດັບ".
        if (i === 0 && label.indexOf('ລຳດັບ') !== -1) return 'ລຳດັບ';
        return label;
      });
      return { headers, rows: gvizRows(json) };
    }

    // Scores: headers=6 makes the first data row Sheet row 7, matching
    // data.slice(6) in getSheetData(). The extra label text is row 6.
    const [prefixJson, dataJson] = await Promise.all([
      fetchGviz(spreadsheetId, sheetName, SCORE_HEADER_ROWS - 1),
      fetchGviz(spreadsheetId, sheetName, SCORE_HEADER_ROWS)
    ]);
    if (!dataJson) return null;
    const width = dataJson.table.cols ? dataJson.table.cols.length : 0;
    const prefixLabels = (prefixJson && prefixJson.table.cols)
      ? prefixJson.table.cols.map(c => String(c.label || '').trim()) : [];
    const headers = Array.from({ length: width }, (_, i) => {
      const col = dataJson.table.cols[i];
      const full = String((col && col.label) || '').trim();
      const prefix = prefixLabels[i] || '';
      if (prefix && full.indexOf(prefix) === 0) return full.slice(prefix.length).trim();
      return full;
    });
    return { headers, rows: gvizRows(dataJson) };
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

  /* Index.html renderTable() applies a SECOND column pass: it keeps only
     columns whose header is non-empty, even if Code.gs kept them because they
     had data. It skips this pass when every header is empty. */
  function applyIndexColumnFilter(table) {
    const headers = table.headers || [];
    if (!headers.length) return table;
    const validIndices = [];
    for (let i = 0; i < headers.length; i++) {
      if (String(headers[i] == null ? '' : headers[i]).trim() !== '') validIndices.push(i);
    }
    if (!validIndices.length || validIndices.length === headers.length) return table;
    return {
      headers: validIndices.map(i => headers[i]),
      rows: (table.rows || []).map(row => validIndices.map(i => row[i]))
    };
  }

  /* CSV gives each Sheet cell in its own column:
     label | 9 | ຄົນ | ເທົ່າກັບ | 52.94%.
     Keep them all where the Sheet has them; only trim the count cell so it
     shows the number without a trailing ຄົນ. */
  const SCORE_SUMMARY_RE = /^ເປີເຊັນນັກຮຽນ(ເກັ່ງ|ກາງ|ອ່ອນ)ມີ$/;

  function applyScoreSummaryLabels(table) {
    (table.rows || []).forEach(row => {
      const labelIdx = row.findIndex(v => SCORE_SUMMARY_RE.test(String(v == null ? '' : v).trim()));
      if (labelIdx < 0) return;

      let countIdx = -1;
      for (let c = labelIdx + 1; c < row.length; c++) {
        const s = String(row[c] == null ? '' : row[c]).trim();
        if (/^[-+]?\d+(?:\.\d+)?(?:\s*ຄົນ)?$/.test(s)) { countIdx = c; break; }
      }
      if (countIdx < 0) return;

      const raw = String(row[countIdx] == null ? '' : row[countIdx]).trim();
      const num = raw.match(/^([-+]?\d+(?:\.\d+)?)/);
      row[countIdx] = num ? num[1] : raw.replace(/ຄົນ/g, '').trim();
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
            <select class="sv-header-select" id="svSheetSelect" aria-label="${esc(t('score.viewer.selectMonth', 'Select month...'))}">
              <option value="" disabled selected>${esc(t('score.viewer.selectMonth', 'Select month...'))}</option>
            </select>
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

      // The month selector lives in the modal header from now on. Hidden for
      // iframe links and cleared so a previous file's options never flash.
      const sheetSelect = document.getElementById('svSheetSelect');
      sheetSelect.style.display = 'none';
      sheetSelect.innerHTML = `<option value="" disabled selected>${esc(t('score.viewer.selectMonth', 'Select month...'))}</option>`;

      const newTab = document.getElementById('svNewTab');
      newTab.style.display = '';
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
        themeBtn.style.display = '';
        themeBtn.onclick = () => {
          const dark = overlay.classList.toggle('sv-dark');
          themeBtn.textContent = dark ? '🌙' : '☀️';
        };
        const frame = document.createElement('iframe');
        frame.className = 'sv-iframe';
        frame.src = target.url;
        frame.title = label;
        frame.setAttribute('allow', 'fullscreen');
        body.appendChild(frame);
        this._state = { type: 'iframe' };
        return;
      }

      // Spreadsheet ID → table view. Month select + theme sit next to close;
      // no control bar remains above the table.
      sheetSelect.style.display = '';
      themeBtn.style.display = '';
      themeBtn.onclick = () => {
        const modes = ['auto', 'light', 'dark'];
        const i = modes.indexOf(this._state.themeMode);
        this._state.themeMode = modes[(i + 1) % modes.length];
        this._applyTheme();
      };
      newTab.style.display = 'none';   // no "open in new tab" in table view
      const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
      this._state = {
        type: 'id', id: target.id, mode, sheets: [], current: null, term: '', label,
        themeMode: 'auto', systemDark: media ? media.matches : false
      };
      const onSystemTheme = () => {
        if (!media || !this._state || this._state.type !== 'id' || this._state.themeMode !== 'auto') return;
        this._state.systemDark = media.matches;
        this._applyTheme();
      };
      this._themeMedia = media;
      this._themeListener = onSystemTheme;
      if (media) {
        if (media.addEventListener) media.addEventListener('change', onSystemTheme);
        else if (media.addListener) media.addListener(onSystemTheme);
      }

      body.innerHTML = `
        <div class="sv-table-view">
          <div class="sv-loader" id="svLoader"></div>
          <div class="sv-table-container">
            <table class="sv-table">
              <thead><tr id="svHead"></tr></thead>
              <tbody id="svRows"></tbody>
            </table>
          </div>
        </div>`;

      sheetSelect.onchange = e => {
        this._state.current = e.target.value;
        this._renderRows();
      };
      this._applyTheme();

      this._loadSpreadsheet(target.id, mode);
    },

    _applyTheme() {
      const st = this._state;
      if (!st || st.type !== 'id') return;
      const overlay = document.getElementById('scoreViewerOverlay');
      const btn = document.getElementById('svTheme');
      if (!overlay || !btn) return;
      const mode = st.themeMode || 'auto';
      const dark = mode === 'dark' || (mode === 'auto' && st.systemDark);
      overlay.classList.toggle('sv-dark', dark);
      if (mode === 'auto') {
        btn.textContent = '⚙️';
        btn.title = t('score.viewer.theme.auto', 'Mode: Auto');
      } else if (mode === 'light') {
        btn.textContent = '☀️';
        btn.title = t('score.viewer.theme.light', 'Mode: Light');
      } else {
        btn.textContent = '🌙';
        btn.title = t('score.viewer.theme.dark', 'Mode: Dark');
      }
    },

    async _loadSpreadsheet(id, mode) {
      if (!this._state || this._state.id !== id) return;
      const token = ++this._loadToken;
      const isCurrent = () => token === this._loadToken && this._state && this._state.id === id;
      const loader = document.getElementById('svLoader');
      if (loader) loader.style.display = 'block';

      // One /edit fetch gives the tab gids used by the score CSV export.
      // The spreadsheet name is no longer shown in the table header.
      const metaPromise = fetchSheetMeta(id, '');

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

      let gids = {};
      try { gids = ((await metaPromise).gids) || {}; } catch (e) {}

      const results = await Promise.all(sheetNames.map(async name => {
        try {
          const grid = await fetchGrid(id, name, attendance, gids);
          if (!grid) return null;
          const table = attendance
            ? buildAttendanceTable(grid)
            : applyIndexColumnFilter(applyScoreSummaryLabels(buildTable(grid)));
          return (table.headers.length && table.rows.length) ? { name, table } : null;
        } catch (e) { return null; }
      }));

      if (!isCurrent()) return;
      const sheets = results.filter(Boolean);
      this._state.sheets = sheets;
      if (loader) loader.style.display = 'none';

      const select = document.getElementById('svSheetSelect');
      if (!select) return;
      select.innerHTML = '';
      if (!sheets.length) {
        const noTablesOption = t('score.viewer.noTablesOption', 'No data tables');
        const noTables = t('score.viewer.noTables', 'No sheets with data were found');
        select.innerHTML = `<option value="" disabled selected>${esc(noTablesOption)}</option>`;
        const rowsEl = document.getElementById('svRows');
        if (rowsEl) rowsEl.innerHTML = `<tr><td class="sv-empty">${esc(noTables)}</td></tr>`;
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
      if (this._themeMedia && this._themeListener) {
        if (this._themeMedia.removeEventListener) this._themeMedia.removeEventListener('change', this._themeListener);
        else if (this._themeMedia.removeListener) this._themeMedia.removeListener(this._themeListener);
      }
      this._themeMedia = null;
      this._themeListener = null;
      overlay.classList.remove('active');
      const body = document.getElementById('svBody');
      if (body) body.innerHTML = ''; // stop iframe loading
      this._state = null;
    }
  };
})();
