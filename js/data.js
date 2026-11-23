(function () {
  const NT2 = window.NT2 = window.NT2 || {};

  const SHEET_ID   = '1ol57RaMofcBIAbWZ0ip3PP2B4FbhoZYXOkvxa6Ju3nc';
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwY5RcFeBzc5HKyEsmEBGby15KT58mSdtx_fZTva7CG8rXOCQtP01KaPJ-i9KDJIWDlPQ/exec';
  const AUTO_REFRESH_MS = 10 * 60 * 1000; // 10 minutes

  /* ─────────────────────────────────────────
     HELPERS
  ───────────────────────────────────────── */
  function gvizUrl(sheetName, range) {
    const base = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
    return range ? `${base}&range=${encodeURIComponent(range)}` : base;
  }

  // Parse Google Visualization JSON response into array of plain objects
  async function fetchSheet(sheetName, range) {
    const res  = await fetch(gvizUrl(sheetName, range));
    const text = await res.text();
    // gviz wraps JSON in:  google.visualization.Query.setResponse({...})
    const m = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/);
    if (!m) return null;
    const json = JSON.parse(m[1]);
    if (!json.table || !json.table.rows || json.table.rows.length === 0) return null;

    const cols = json.table.cols.map(c => (c.label || '').trim());
    return json.table.rows
      .filter(row => row.c && row.c.some(cell => cell && cell.v !== null && cell.v !== ''))
      .map(row => {
        const obj = {};
        row.c.forEach((cell, i) => {
          obj[cols[i] || `col${i}`] = (cell && cell.v !== null) ? cell.v : '';
        });
        return obj;
      });
  }

  // Raw 2D grid from gviz. Unlike fetchSheet() this keeps empty rows and does not
  // use column labels, so row index 0 is exactly the first row of the requested
  // range (e.g. X4). Needed to map edited cells back to absolute Sheet rows.
  async function fetchSheetRaw(sheetName, range, numCols) {
    const res  = await fetch(gvizUrl(sheetName, range), { cache: 'no-store' });
    const text = await res.text();
    const m = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/);
    if (!m) return null;
    const json = JSON.parse(m[1]);
    if (!json.table || !json.table.rows) return null;
    const width = numCols || (json.table.cols ? json.table.cols.length : 6);
    return json.table.rows.map(row => Array.from({ length: width }, (_, i) => {
      const cell = row.c && row.c[i];
      return (cell && cell.v !== null && cell.v !== undefined) ? String(cell.v) : '';
    }));
  }

  /* ─────────────────────────────────────────
     PARSERS  (map raw sheet rows → app objects)
  ───────────────────────────────────────── */
  function parseAcademicYears(rows) {
    return rows.map((r, i) => ({
      id:        i + 1,
      year:      String(r['ສົກຮຽນ']       || r['year']       || '').trim(),
      startDate: String(r['ເລີ່ມຕົ້ນ']    || r['startDate']  || '').trim(),
      endDate:   String(r['ສິ້ນສຸດ']       || r['endDate']    || '').trim(),
      status:    String(r['ສະຖານະ']        || r['status']     || '').trim(),
      note:      String(r['ໝາຍເຫດ']        || r['note']       || '').trim()
    })).filter(r => r.year);
  }

  function parseTeachers(rows) {
    return rows.map((r, i) => ({
      id:         i + 1,
      nameLao:    String(r['ຊື່ລາວ']        || r['ຊື່']        || '').trim(),
      surnameLao: String(r['ນາມສະກຸນລາວ']  || r['ນາມສະກຸນ']  || '').trim(),
      nameEn:     String(r['ຊື່EN']          || r['NameEn']     || '').trim(),
      surnameEn:  String(r['ນາມສະກຸນEN']    || r['SurnameEn']  || '').trim(),
      phone:      String(r['ເບີໂທ']          || r['Phone']      || '').trim(),
      subject:    String(r['ວິຊາ']           || r['Subject']    || '').trim(),
      gender:     String(r['ເພດ']            || r['Gender']     || 'M').trim(),
      photoUrl:   String(r['ຮູບURL']         || r['PhotoURL']   || '').trim()
    })).filter(r => r.nameLao || r.nameEn);
  }

  function parseStudents(rows) {
    return rows.map((r, i) => ({
      id:         i + 1,
      nameLao:    String(r['ຊື່ລາວ']        || r['ຊື່']        || '').trim(),
      surnameLao: String(r['ນາມສະກຸນລາວ']  || r['ນາມສະກຸນ']  || '').trim(),
      nameEn:     String(r['ຊື່EN']          || r['NameEn']     || '').trim(),
      surnameEn:  String(r['ນາມສະກຸນEN']    || r['SurnameEn']  || '').trim(),
      className:  String(r['ຫ້ອງ']           || r['Class']      || '').trim(),
      gender:     String(r['ເພດ']            || r['Gender']     || 'M').trim(),
      photoUrl:   String(r['ຮູບURL']         || r['PhotoURL']   || '').trim()
    })).filter(r => r.nameLao || r.nameEn);
  }

  function parseAnnouncements(rows) {
    return rows.map((r, i) => ({
      id:      i + 1,
      title:   String(r['ຫົວຂໍ້']   || r['Title']   || '').trim(),
      content: String(r['ເນື້ອໃນ']  || r['Content'] || '').trim(),
      type:    String(r['ປະເພດ']    || r['Type']    || 'normal').includes('ດ່ວນ') ? 'urgent' : 'normal',
      date:    String(r['ວັນທີ']     || r['Date']    || '').trim()
    })).filter(r => r.title);
  }

  function parseSchedule(rows) {
    return rows.map(r => ({
      time:    String(r['ເວລາ']    || r['Time']    || '').trim(),
      mon:     String(r['ຈັນ']     || r['Mon']     || '').trim(),
      tue:     String(r['ອັງຄານ']  || r['Tue']     || '').trim(),
      wed:     String(r['ພຸດ']     || r['Wed']     || '').trim(),
      thu:     String(r['ພະຫັດ']   || r['Thu']     || '').trim(),
      fri:     String(r['ສຸກ']     || r['Fri']     || '').trim(),
      isBreak: String(r['ຈັນ']     || r['Mon']     || '').toLowerCase().includes('ພັກ')
    })).filter(r => r.time);
  }

  function parseScoreLinks(rows) {
    return rows.map(r => ({
      className:   String(r['ຊັ້ນຮຽນ']   || r['Class']       || '').trim(),
      displayName: String(r['ຊື່ສະແດງ']  || r['DisplayName'] || r['ຊັ້ນຮຽນ'] || '').trim(),
      url:         String(r['ລິ້ງ']        || r['URL']         || r['Link'] || '#').trim() || '#'
    })).filter(r => r.className);
  }

  function parseActivities(rows) {
    return rows.map((r, i) => ({
      id:       i + 1,
      activity: String(r['ກິດຈະກຳ']   || r['Activity']  || '').trim(),
      date:     String(r['ວັນທີ']       || r['Date']      || '').trim(),
      detail:   String(r['ລາຍລະອຽດ']  || r['Detail']    || '').trim()
    })).filter(r => r.activity);
  }

  /* ─────────────────────────────────────────
     SCHEDULE PARSER (shared shape with Code.gs)
     Returns { layout:'block'|'time', blocks:[...], rows:[...] }
  ───────────────────────────────────────── */
  const SCHED_DAYS = ['ຈັນ','ອັງຄານ','ພຸດ','ພະຫັດ','ສຸກ','ເສາ','ອາທິດ',
                      'monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  function isDayName(s) {
    const t = String(s == null ? '' : s).trim().toLowerCase();
    if (!t) return false;
    return SCHED_DAYS.some(d => t.indexOf(d) === 0);
  }
  function emptySchedule() { return { layout: 'block', blocks: [], rows: [] }; }

  // Accepts a 6-column 2D array: [label, c1..c5]
  function parseScheduleGrid(values) {
    const grid = (values || []).map(r => [0,1,2,3,4,5].map(i =>
      (r[i] == null) ? '' : String(r[i]).trim()));
    const allEmpty = cells => cells.every(c => c === '');
    const dayRows = grid.filter(r => !allEmpty(r.slice(1)) && isDayName(r[0])).length;

    if (dayRows === 0) {
      const flat = [];
      grid.forEach(r => {
        if (r[0] === '' && allEmpty(r.slice(1))) return;
        flat.push({
          time: r[0], mon: r[1], tue: r[2], wed: r[3], thu: r[4], fri: r[5],
          isBreak: r[0].includes('ພັກ') || r[1].includes('ພັກ')
        });
      });
      return { layout: 'time', blocks: [], rows: flat };
    }

    const blocks = [];
    let cur = null;
    grid.forEach(r => {
      const label = r[0];
      const cells = r.slice(1);
      const hasCells = !allEmpty(cells);
      if (label === '' && !hasCells) return;
      if (!hasCells) { cur = { title: label, periods: [], days: [] }; blocks.push(cur); return; }
      if (!cur) { cur = { title: '', periods: [], days: [] }; blocks.push(cur); }
      if (isDayName(label)) cur.days.push({ label, cells });
      else if (cur.periods.length === 0) {
        cur.periodLabel = label;
        cur.periods = cells;
      }
      else cur.days.push({ label, cells });
    });
    return { layout: 'block', blocks: blocks.filter(b => b.days.length > 0), rows: [] };
  }

  // Normalise any cached/incoming schedule value into the canonical shape
  function normalizeSchedule(s) {
    if (!s) return emptySchedule();
    if (Array.isArray(s)) {          // legacy: plain array of {time, mon..fri}
      return { layout: 'time', blocks: [], rows: s };
    }
    if (typeof s === 'object') {
      if (Array.isArray(s.blocks) || Array.isArray(s.rows)) {
        return {
          layout: s.layout === 'time' ? 'time' : 'block',
          blocks: Array.isArray(s.blocks) ? s.blocks : [],
          rows: Array.isArray(s.rows) ? s.rows : []
        };
      }
    }
    return emptySchedule();
  }

  /* ─────────────────────────────────────────
     MAIN DATA OBJECT
  ───────────────────────────────────────── */
  NT2.Data = {
    _cache:       {}, // empty until live data loads from Google Sheets
    _usingLive:   false,
    _lastFetch:   null,
    _refreshTimer: null,
    _listeners:   [],

    /* Notify all registered listeners (pages re-render on live update) */
    _notify(source) {
      this._listeners.forEach(fn => { try { fn(source); } catch(e){} });
    },

    onRefresh(fn) { this._listeners.push(fn); },

    /* ── INIT ────────────────────────────── */
    async init() {
      this._setSyncStatus('loading');
      await this._fetchAll();
      this._startAutoRefresh();
    },

    /* ── FETCH ALL SHEETS ────────────────── */
    async _fetchAll() {
      let anyLive = false;

      // 1. Fetch dynamic Sheet Tab Names from Google Apps Script
      try {
        const res = await fetch(APPS_SCRIPT_URL + '?action=getSheets');
        if (res.ok) {
          const json = await res.json();
          const list = json.sheets || json.sheetNames || (Array.isArray(json) ? json : null);
          if (list && Array.isArray(list) && list.length > 0) {
            this._cache.academic_years = list.map((name, i) => ({
              id: i + 1,
              year: String(name).trim()
            }));
            anyLive = true;
            console.log(`✅ Loaded ${list.length} Sheet Tab Names from Apps Script:`, list);
          }

          if (json.sheetsData && Array.isArray(json.sheetsData)) {
            json.sheetsData.forEach(item => {
              if (item.name) {
                this.setSchoolInfo(item.name, {
                  logo: item.logo,
                  schoolName: item.schoolName,
                  subtitle: item.subtitle
                });
                if (item.teachers && Array.isArray(item.teachers) && item.teachers.length > 0) {
                  this.setTeachersForYear(item.name, item.teachers);
                }
                if (item.students && Array.isArray(item.students) && item.students.length > 0) {
                  this.setStudentsForYear(item.name, item.students);
                }
                if (item.scoreLinks) {
                  this.setScoreLinksForYear(item.name, item.scoreLinks);
                }
                if (item.attendanceLinks) {
                  this.setAttendanceLinksForYear(item.name, item.attendanceLinks);
                }
                if (item.studySchedule || item.teachingSchedule) {
                  this.setScheduleForYear(item.name, {
                    studySchedule: normalizeSchedule(item.studySchedule),
                    teachingSchedule: normalizeSchedule(item.teachingSchedule)
                  });
                }
                if (item.classCount || item.announcements) {
                  this.setDashboardForYear(item.name, {
                    classCount: item.classCount || 0,
                    announcements: item.announcements || []
                  });
                }
              }
            });
          }
        }
      } catch (e) {
        console.warn('⚠️ Could not fetch sheet names from Apps Script:', e.message);
      }

      // 2. Fetch sheet tab data tables via gviz API
      const sheetMap = [
        { key: 'academic_years',    tab: 'academic_year',    parser: parseAcademicYears    },
        { key: 'teachers',          tab: 'teachers',          parser: parseTeachers          },
        { key: 'students',          tab: 'students',          parser: parseStudents          },
        { key: 'announcements',     tab: 'announcements',     parser: parseAnnouncements     },
        { key: 'studySchedule',     tab: 'schedule',          parser: parseSchedule          },
        { key: 'teachingSchedule',  tab: 'teaching_schedule', parser: parseSchedule          },
        { key: 'scoreLinks',        tab: 'scores_links',      parser: parseScoreLinks        },
        { key: 'activities',        tab: 'activities',        parser: parseActivities        }
      ];

      for (const cfg of sheetMap) {
        // Skip academic_years if already loaded from Apps Script sheet tab names
        if (cfg.key === 'academic_years' && this._cache.academic_years && this._cache.academic_years.length > 0 && anyLive) {
          continue;
        }
        try {
          const rows = await fetchSheet(cfg.tab);
          if (rows && rows.length > 0) {
            const parsed = cfg.parser(rows);
            if (parsed && parsed.length > 0) {
              this._cache[cfg.key] = parsed;
              anyLive = true;
              console.log(`✅ Loaded sheet table: ${cfg.tab} (${parsed.length} rows)`);
            }
          }
        } catch (e) {
          console.warn(`⚠️ Sheet "${cfg.tab}" not accessible:`, e.message);
        }
      }

      this._usingLive  = anyLive;
      this._lastFetch  = new Date();
      this._setSyncStatus(anyLive ? 'live' : 'empty');
      if (anyLive) this._notify('refresh');
    },

    /* ── AUTO-REFRESH (every 10 minutes) ─── */
    async _autoRefresh() {
      console.log('🔄 Auto-refreshing data from Google Sheets...');
      this._setSyncStatus('loading');
      await this._fetchAll();
    },

    _startAutoRefresh() {
      if (this._refreshTimer) clearInterval(this._refreshTimer);
      this._refreshTimer = setInterval(() => this._autoRefresh(), AUTO_REFRESH_MS);

      // Browsers throttle timers in background tabs; catch up when the tab is visible again.
      if (!this._visibilityBound) {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState !== 'visible') return;
          if (!this._lastFetch) return;
          if (Date.now() - this._lastFetch.getTime() < AUTO_REFRESH_MS) return;
          this._autoRefresh();
        });
        this._visibilityBound = true;
      }
    },

    /* Manual refresh (triggered by refresh button) */
    async refresh() {
      this._setSyncStatus('loading');
      await this._fetchAll();
    },

    /* ── SYNC STATUS UI ──────────────────── */
    _setSyncStatus(state) {
      this._syncState = state;
      const iconEl = document.getElementById('syncIcon');
      const timeEl = document.getElementById('lastUpdateTime');
      if (!timeEl) return;

      if (state === 'loading') {
        if (iconEl) { iconEl.textContent = 'sync'; iconEl.style.animation = 'spin 1s linear infinite'; }
        timeEl.textContent = (window.NT2 && NT2.Lang) ? NT2.Lang.t('sync.loading') : 'ກຳລັງໂຫຼດ...';
      } else if (state === 'live') {
        if (iconEl) { iconEl.textContent = 'cloud_done'; iconEl.style.animation = 'none'; iconEl.style.color = '#66BB6A'; }
        const t = this._lastFetch;
        timeEl.textContent = `${(window.NT2 && NT2.Lang) ? NT2.Lang.t('sync.prefix') : 'Google Sheet •'} ${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}`;
      } else {
        if (iconEl) { iconEl.textContent = 'cloud_off'; iconEl.style.animation = 'none'; iconEl.style.color = '#FFB300'; }
        timeEl.textContent = (window.NT2 && NT2.Lang) ? NT2.Lang.t('sync.empty') : 'ບໍ່ມີຂໍ້ມູນ';
      }

      // Spin the header refresh button when loading (if present)
      const btn = document.getElementById('refreshBtn');
      if (btn) btn.classList.toggle('spinning', state === 'loading');
    },

    /* Re-apply sync-status text on language change without refetching */
    refreshSyncLabel() {
      if (this._syncState === 'live') {
        this._setSyncStatus('live');
      } else if (this._syncState === 'empty') {
        this._setSyncStatus('empty');
      } else {
        this._setSyncStatus('loading');
      }
    },

    /* ─────────────────────────────────────────
       PUBLIC GETTERS
    ───────────────────────────────────────── */
    getAcademicYears()          { return Array.isArray(this._cache.academic_years) ? this._cache.academic_years : []; },
    getTeachers()               { return Array.isArray(this._cache.teachers)       ? this._cache.teachers       : []; },
    getStudents()               { return Array.isArray(this._cache.students)       ? this._cache.students       : []; },
    getStudentsByClass(cls)     { return this.getStudents().filter(s => s.className === cls);     },
    getStudentsByClassForYear(cls, year) {
      const list = this.getStudentsForYear(year);
      return list.filter(s => s.className === cls || (s.className && s.className.includes(cls)));
    },
    getAnnouncements()          { return Array.isArray(this._cache.announcements)    ? this._cache.announcements    : []; },
    getStudySchedule()          { return normalizeSchedule(this._cache.studySchedule);    },
    getTeachingSchedule()       { return normalizeSchedule(this._cache.teachingSchedule); },
    getScoreLinks()             { return Array.isArray(this._cache.scoreLinks)       ? this._cache.scoreLinks       : []; },
    getActivities()             { return Array.isArray(this._cache.activities)       ? this._cache.activities       : []; },
    getGradingRules()           { return this._cache.gradingRules || '';                       },
    getClassCount()             { return this.getAllClasses().length; },
    isLive()                    { return this._usingLive; },

    _schoolInfoCache: {},

    setSchoolInfo(year, info) {
      if (!year) return;
      this._schoolInfoCache[year] = {
        logo: (info && (info.logo || info['Logo'])) || '',
        schoolName: (info && (info.schoolName || info['School Name(LAO)'] || info['School Name'] || info['ຊື່ໂຮງຮຽນ'])) || 'ໂຮງຮຽນ ນ້ຳເທີນ2',
        subtitle: (info && (info.subtitle || info['Subtitle'] || info['ລະບົບຈັດການໂຮງຮຽນ'])) || 'ລະບົບຈັດການໂຮງຮຽນ'
      };
    },

    getSchoolInfoForYear(year) {
      if (year && this._schoolInfoCache[year]) {
        return this._schoolInfoCache[year];
      }
      return {
        logo: '',
        schoolName: 'ໂຮງຮຽນ ນ້ຳເທີນ2',
        subtitle: 'ລະບົບຈັດການໂຮງຮຽນ'
      };
    },

    async fetchSchoolInfoForYear(year) {
      if (!year) return this.getSchoolInfoForYear(year);

      if (this._schoolInfoCache[year] && (this._schoolInfoCache[year].logo || this._schoolInfoCache[year].schoolName !== 'ໂຮງຮຽນ ນ້ຳເທີນ2')) {
        return this._schoolInfoCache[year];
      }

      // Try Apps Script endpoint
      try {
        const res = await fetch(`${APPS_SCRIPT_URL}?action=getSchoolInfo&sheet=${encodeURIComponent(year)}`);
        if (res.ok) {
          const json = await res.json();
          if (json && json.status === 'success') {
            this.setSchoolInfo(year, {
              logo: json.logo,
              schoolName: json.schoolName,
              subtitle: json.subtitle
            });
            return this.getSchoolInfoForYear(year);
          }
        }
      } catch (e) {}

      // Fallback gviz fetch
      try {
        const rows = await fetchSheet(year);
        if (rows && rows.length > 0) {
          const r = rows[0];
          const keys = Object.keys(r);
          const logo = r['Logo'] || r['col0'] || (keys[0] ? r[keys[0]] : '');
          const name = r['School Name(LAO)'] || r['School Name'] || r['col1'] || (keys[1] ? r[keys[1]] : '');
          const sub  = r['Subtitle'] || r['col2'] || (keys[2] ? r[keys[2]] : '');
          
          this.setSchoolInfo(year, { logo: logo, schoolName: name, subtitle: sub });
          return this.getSchoolInfoForYear(year);
        }
      } catch(e) {}

      return this.getSchoolInfoForYear(year);
    },

    _teachersByYearCache: {},

    setTeachersForYear(year, teachers) {
      if (!year || !Array.isArray(teachers)) return;
      this._teachersByYearCache[year] = teachers;
    },

    getTeachersForYear(year) {
      if (year && this._teachersByYearCache[year] && this._teachersByYearCache[year].length > 0) {
        return this._teachersByYearCache[year];
      }
      return this.getTeachers();
    },

    async fetchTeachersForYear(year) {
      if (!year) return this.getTeachers();

      if (this._teachersByYearCache[year] && this._teachersByYearCache[year].length > 0) {
        return this._teachersByYearCache[year];
      }

      // Try Apps Script endpoint
      try {
        const res = await fetch(`${APPS_SCRIPT_URL}?action=getTeachers&sheet=${encodeURIComponent(year)}`);
        if (res.ok) {
          const json = await res.json();
          if (json && json.status === 'success' && Array.isArray(json.teachers) && json.teachers.length > 0) {
            this.setTeachersForYear(year, json.teachers);
            return json.teachers;
          }
        }
      } catch (e) {}

      // Fallback gviz fetch: row 6+ (B6=Photo, C6=NameLao, D6=NameEn, E6=Position, F6=Subject, G6=Phone)
      try {
        const rows = await fetchSheet(year);
        if (rows && rows.length >= 5) {
          const teacherRows = rows.slice(4); // index 4 = Row 6 in Google Sheet
          const teachers = teacherRows.map((r, i) => {
            const keys = Object.keys(r);
            const photoUrl = r['PhotoURL'] || r['Photo'] || r['col1'] || (keys[1] ? r[keys[1]] : '');
            const nameLao  = r['NameLao']  || r['ຊື່ລາວ']  || r['col2'] || (keys[2] ? r[keys[2]] : '');
            const nameEn   = r['NameEn']   || r['ຊື່EN']   || r['col3'] || (keys[3] ? r[keys[3]] : '');
            const position = r['Position'] || r['ຕຳແໜ່ງ'] || r['col4'] || (keys[4] ? r[keys[4]] : '');
            const subject  = r['Subject']  || r['ວິຊາ']   || r['col5'] || (keys[5] ? r[keys[5]] : '');
            const phone    = r['Phone']    || r['ເບີໂທ']   || r['col6'] || (keys[6] ? r[keys[6]] : '');

            return {
              id: i + 1,
              rowNum: i + 6,
              photoUrl: String(photoUrl).trim(),
              nameLao: String(nameLao).trim(),
              nameEn: String(nameEn).trim(),
              position: String(position).trim(),
              subject: String(subject).trim(),
              phone: String(phone).trim()
            };
          }).filter(t => t.nameLao || t.nameEn || t.position || t.photoUrl);

          if (teachers.length > 0) {
            this.setTeachersForYear(year, teachers);
            return teachers;
          }
        }
      } catch(e) {}

      return this.getTeachersForYear(year);
    },

    _studentsByYearCache: {},

    setStudentsForYear(year, students) {
      if (!year || !Array.isArray(students)) return;
      this._studentsByYearCache[year] = students;
    },

    getStudentsForYear(year) {
      if (year && this._studentsByYearCache[year] && this._studentsByYearCache[year].length > 0) {
        return this._studentsByYearCache[year];
      }
      return this.getStudents();
    },

    async fetchStudentsForYear(year) {
      if (!year) return this.getStudents();

      if (this._studentsByYearCache[year] && this._studentsByYearCache[year].length > 0) {
        return this._studentsByYearCache[year];
      }

      // Try Apps Script endpoint
      try {
        const res = await fetch(`${APPS_SCRIPT_URL}?action=getStudents&sheet=${encodeURIComponent(year)}`);
        if (res.ok) {
          const json = await res.json();
          if (json && json.status === 'success' && Array.isArray(json.students) && json.students.length > 0) {
            this.setStudentsForYear(year, json.students);
            return json.students;
          }
        }
      } catch (e) {}

      // Fallback gviz fetch: row 6+ (J6=Photo, K6=NameLao, L6=NameEn, M6=Class, O6=Kindergarten, P6=Primary, Q6=Secondary)
      try {
        const rows = await fetchSheet(year);
        if (rows && rows.length >= 5) {
          const studentRows = rows.slice(4); // index 4 = Row 6 in Google Sheet
          const students = studentRows.map((r, i) => {
            const keys = Object.keys(r);
            const photoUrl     = r['PhotoURL']     || r['col9']  || (keys[9]  ? r[keys[9]]  : '');
            const nameLao      = r['NameLao']      || r['col10'] || (keys[10] ? r[keys[10]] : '');
            const nameEn       = r['NameEn']       || r['col11'] || (keys[11] ? r[keys[11]] : '');
            const className    = r['Class']        || r['col12'] || (keys[12] ? r[keys[12]] : '');
            const kindergarten = r['Kindergarten'] || r['col14'] || (keys[14] ? r[keys[14]] : '');
            const primary      = r['Primary']      || r['col15'] || (keys[15] ? r[keys[15]] : '');
            const secondary    = r['Secondary']    || r['col16'] || (keys[16] ? r[keys[16]] : '');

            return {
              id: i + 1,
              rowNum: i + 6,
              photoUrl: String(photoUrl).trim(),
              nameLao: String(nameLao).trim(),
              nameEn: String(nameEn).trim(),
              className: String(className || kindergarten || primary || secondary || '—').trim(),
              kindergarten: String(kindergarten).trim(),
              primary: String(primary).trim(),
              secondary: String(secondary).trim()
            };
          }).filter(s => s.nameLao || s.nameEn || s.photoUrl || s.className !== '—' || s.kindergarten || s.primary || s.secondary);

          if (students.length > 0) {
            this.setStudentsForYear(year, students);
            return students;
          }
        }
      } catch(e) {}

      return this.getStudentsForYear(year);
    },

    _scoreLinksByYearCache: {},

    setScoreLinksForYear(year, links) {
      if (!year || !links) return;
      this._scoreLinksByYearCache[year] = links;
    },

    getScoreLinksForYear(year) {
      if (year && this._scoreLinksByYearCache[year]) {
        return this._scoreLinksByYearCache[year];
      }
      return {
        "ອ1": "#", "ອ2": "#", "ອ3": "#",
        "ປ1": "#", "ປ2": "#", "ປ3": "#", "ປ4": "#", "ປ5": "#",
        "ມ1": "#", "ມ2": "#", "ມ3": "#", "ມ4": "#", "ມ5": "#", "ມ6": "#", "ມ7": "#",
        "rules": "#", "other": "#"
      };
    },

    async fetchScoreLinksForYear(year) {
      if (!year) return this.getScoreLinksForYear(year);

      // "ຄະແນນອື່ນໆ" ຢູ່ທີ່ Y2 ຂອງແຕ່ລະ Sheet ສົກຮຽນ.
      // ດຶງກົງຈາກ gviz ເພື່ອໃຫ້ໃຊ້ໄດ້ທັນທີ ເຖິງແມ່ນຍັງບໍ່ໄດ້ Deploy Code.gs ໃໝ່.
      const fetchOtherUrl = async () => {
        try {
          const rows = await fetchSheet(year, 'Y2');
          const v = rows && rows[0] ? (rows[0].col0 || '') : '';
          return v ? String(v).trim() : '';
        } catch (e) { return ''; }
      };

      if (this._scoreLinksByYearCache[year]) {
        const cached = this._scoreLinksByYearCache[year];
        if (!cached.other) cached.other = await fetchOtherUrl() || '#';
        return cached;
      }

      // Try Apps Script endpoint
      try {
        const res = await fetch(`${APPS_SCRIPT_URL}?action=getScoreLinks&sheet=${encodeURIComponent(year)}`);
        if (res.ok) {
          const json = await res.json();
          if (json && json.status === 'success' && json.scoreLinks) {
            const links = json.scoreLinks;
            if (!links.other) links.other = await fetchOtherUrl() || '#';
            this.setScoreLinksForYear(year, links);
            return links;
          }
        }
      } catch (e) {}

      // Fallback gviz fetch: ໃຊ້ range ຊັດເຈນ A2:Y2 ຂອງ Sheet ສົກຮຽນ
      try {
        const rows = await fetchSheet(year, 'A2:Y2');
        if (rows && rows.length > 0) {
          const r = rows[0];
          const keys = Object.keys(r);

          const links = {
            "ອ1": r['col4']  || (keys[4]  ? r[keys[4]]  : '#'),
            "ອ2": r['col5']  || (keys[5]  ? r[keys[5]]  : '#'),
            "ອ3": r['col6']  || (keys[6]  ? r[keys[6]]  : '#'),
            "ປ1": r['col8']  || (keys[8]  ? r[keys[8]]  : '#'),
            "ປ2": r['col9']  || (keys[9]  ? r[keys[9]]  : '#'),
            "ປ3": r['col10'] || (keys[10] ? r[keys[10]] : '#'),
            "ປ4": r['col11'] || (keys[11] ? r[keys[11]] : '#'),
            "ປ5": r['col12'] || (keys[12] ? r[keys[12]] : '#'),
            "ມ1": r['col14'] || (keys[14] ? r[keys[14]] : '#'),
            "ມ2": r['col15'] || (keys[15] ? r[keys[15]] : '#'),
            "ມ3": r['col16'] || (keys[16] ? r[keys[16]] : '#'),
            "ມ4": r['col17'] || (keys[17] ? r[keys[17]] : '#'),
            "ມ5": r['col18'] || (keys[18] ? r[keys[18]] : '#'),
            "ມ6": r['col19'] || (keys[19] ? r[keys[19]] : '#'),
            "ມ7": r['col20'] || (keys[20] ? r[keys[20]] : '#'),
            "rules": r['col23'] || (keys[23] ? r[keys[23]] : '#'),
            "other": r['col24'] || (keys[24] ? r[keys[24]] : '#')
          };

          this.setScoreLinksForYear(year, links);
          return links;
        }
      } catch(e) {}

      return this.getScoreLinksForYear(year);
    },

    /* ── ATTENDANCE LINKS ─────────────────── */
    _attendanceLinksByYearCache: {},

    setAttendanceLinksForYear(year, links) {
      if (!year || !links) return;
      this._attendanceLinksByYearCache[year] = links;
    },

    getAttendanceLinksForYear(year) {
      return this._attendanceLinksByYearCache[year] || {
        "ອ1": "#", "ອ2": "#", "ອ3": "#",
        "ປ1": "#", "ປ2": "#", "ປ3": "#", "ປ4": "#", "ປ5": "#",
        "ມ1": "#", "ມ2": "#", "ມ3": "#", "ມ4": "#", "ມ5": "#", "ມ6": "#", "ມ7": "#",
        "rules": "#"
      };
    },

    async fetchAttendanceLinksForYear(year) {
      if (!year) return this.getAttendanceLinksForYear(year);

      if (this._attendanceLinksByYearCache[year]) {
        return this._attendanceLinksByYearCache[year];
      }

      // Try Apps Script endpoint
      try {
        const res = await fetch(`${APPS_SCRIPT_URL}?action=getAttendanceLinks&sheet=${encodeURIComponent(year)}`);
        if (res.ok) {
          const json = await res.json();
          if (json && json.status === 'success' && json.attendanceLinks) {
            this.setAttendanceLinksForYear(year, json.attendanceLinks);
            return json.attendanceLinks;
          }
        }
      } catch (e) {}

      // Fallback gviz fetch: Row 3 (index 1 in rows, since row 1 = headers)
      try {
        const rows = await fetchSheet(year);
        if (rows && rows.length > 1) {
          const r = rows[1]; // Row 3
          const keys = Object.keys(r);

          const links = {
            "ອ1": r['col4']  || (keys[4]  ? r[keys[4]]  : '#'),
            "ອ2": r['col5']  || (keys[5]  ? r[keys[5]]  : '#'),
            "ອ3": r['col6']  || (keys[6]  ? r[keys[6]]  : '#'),
            "ປ1": r['col8']  || (keys[8]  ? r[keys[8]]  : '#'),
            "ປ2": r['col9']  || (keys[9]  ? r[keys[9]]  : '#'),
            "ປ3": r['col10'] || (keys[10] ? r[keys[10]] : '#'),
            "ປ4": r['col11'] || (keys[11] ? r[keys[11]] : '#'),
            "ປ5": r['col12'] || (keys[12] ? r[keys[12]] : '#'),
            "ມ1": r['col14'] || (keys[14] ? r[keys[14]] : '#'),
            "ມ2": r['col15'] || (keys[15] ? r[keys[15]] : '#'),
            "ມ3": r['col16'] || (keys[16] ? r[keys[16]] : '#'),
            "ມ4": r['col17'] || (keys[17] ? r[keys[17]] : '#'),
            "ມ5": r['col18'] || (keys[18] ? r[keys[18]] : '#'),
            "ມ6": r['col19'] || (keys[19] ? r[keys[19]] : '#'),
            "ມ7": r['col20'] || (keys[20] ? r[keys[20]] : '#'),
            "rules": r['col23'] || (keys[23] ? r[keys[23]] : '#')
          };

          this.setAttendanceLinksForYear(year, links);
          return links;
        }
      } catch(e) {}

      return this.getAttendanceLinksForYear(year);
    },

    /* ── ລາຍຊື່ Sheet tab ຂອງໄຟລ໌ທີ່ເຊື່ອມ (ໃຊ້ໂດຍຕາຕະລາງຄະແນນ/ມາຮຽນ) ── */
    _tabsByUrlCache: {},

    async fetchSpreadsheetTabs(url) {
      const source = String(url || '').trim();
      if (!source) return [];
      if (this._tabsByUrlCache[source]) return this._tabsByUrlCache[source];

      try {
        const endpoint = `${APPS_SCRIPT_URL}?action=getSpreadsheetTabs`
          + `&url=${encodeURIComponent(source)}&_t=${Date.now()}`;
        const res = await fetch(endpoint, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json && json.status === 'success' && Array.isArray(json.tabs)) {
            const tabs = json.tabs.map(v => String(v == null ? '' : v).trim()).filter(Boolean);
            if (tabs.length) {
              this._tabsByUrlCache[source] = tabs;
              return tabs;
            }
          }
        }
      } catch (e) {}

      // Apps Script ຍັງເປັນເວີຊັນເກົ່າ ຫຼືເປີດໄຟລ໌ບໍ່ໄດ້ → ໃຫ້ viewer ໃຊ້ຊື່ເກົ່າຕໍ່ໄປ.
      return [];
    },

    _schedulesByYearCache: {},

    setScheduleForYear(year, sched) {
      if (!year || !sched) return;
      this._schedulesByYearCache[year] = sched;
    },

    getScheduleForYear(year) {
      if (year && this._schedulesByYearCache[year]) {
        return this._schedulesByYearCache[year];
      }
      return {
        studySchedule: this.getStudySchedule(),
        teachingSchedule: this.getTeachingSchedule()
      };
    },

    async fetchScheduleForYear(year) {
      if (!year) return this.getScheduleForYear(year);

      if (this._schedulesByYearCache[year]) {
        return this._schedulesByYearCache[year];
      }

      // Try Apps Script endpoint
      try {
        const res = await fetch(`${APPS_SCRIPT_URL}?action=getSchedule&sheet=${encodeURIComponent(year)}`);
        if (res.ok) {
          const json = await res.json();
          if (json && json.status === 'success') {
            const study    = normalizeSchedule(json.studySchedule);
            const teaching = normalizeSchedule(json.teachingSchedule);
            const hasStudy = (study.blocks && study.blocks.length) || (study.rows && study.rows.length);
            const hasTeach = (teaching.blocks && teaching.blocks.length) || (teaching.rows && teaching.rows.length);

            const sched = {
              studySchedule:    hasStudy ? study    : this.getStudySchedule(),
              teachingSchedule: hasTeach ? teaching : this.getTeachingSchedule()
            };
            this.setScheduleForYear(year, sched);
            return sched;
          }
        }
      } catch (e) {}

      // Fallback gviz fetch: gviz already returns rows starting at the schedule title row (X4 / AE4)
      try {
        const rows = await fetchSheet(year);
        if (rows && rows.length) {
          const schedRows = rows;
          // Student schedule: Col X:AC -> indexes 23..28
          const stGrid = schedRows.map(r => {
            const keys = Object.keys(r);
            const g = i => String(r['col' + i] || (keys[i] ? r[keys[i]] : '')).trim();
            return [g(23), g(24), g(25), g(26), g(27), g(28)];
          });
          // Teacher schedule: Col AE:AJ -> indexes 30..35
          const tcGrid = schedRows.map(r => {
            const keys = Object.keys(r);
            const g = i => String(r['col' + i] || (keys[i] ? r[keys[i]] : '')).trim();
            return [g(30), g(31), g(32), g(33), g(34), g(35)];
          });

          const study    = parseScheduleGrid(stGrid);
          const teaching = parseScheduleGrid(tcGrid);
          const hasStudy = study.blocks.length || study.rows.length;
          const hasTeach = teaching.blocks.length || teaching.rows.length;

          const sched = {
            studySchedule:    hasStudy ? study    : this.getStudySchedule(),
            teachingSchedule: hasTeach ? teaching : this.getTeachingSchedule()
          };
          this.setScheduleForYear(year, sched);
          return sched;
        }
      } catch(e) {}

      return this.getScheduleForYear(year);
    },

    /* ── SCHEDULE GRID (for admin inline editing) ───────────────
       Returns raw 6-column grids with their absolute Sheet origin:
       {
         study: { startRow:4, startCol:24, values:[[v,...],...] },  // X:AC
         teach: { startRow:4, startCol:31, values:[[v,...],...] }   // AE:AJ
       }
       Works with the current (old) Apps Script deployment via gviz fallback. */
    _scheduleGridByYearCache: {},

    async fetchScheduleGridForYear(year) {
      if (!year) return null;
      if (this._scheduleGridByYearCache[year]) return this._scheduleGridByYearCache[year];

      // 1. New Apps Script deployment: exact ranges with absolute origins.
      try {
        const res = await fetch(`${APPS_SCRIPT_URL}?action=getScheduleGrid&sheet=${encodeURIComponent(year)}`);
        if (res.ok) {
          const json = await res.json();
          if (json && json.status === 'success' && json.study && json.teach) {
            const grid = {
              study: {
                startRow: Number(json.study.startRow) || 4,
                startCol: Number(json.study.startCol) || 24,
                values: json.study.values || []
              },
              teach: {
                startRow: Number(json.teach.startRow) || 4,
                startCol: Number(json.teach.startCol) || 31,
                values: json.teach.values || []
              }
            };
            this._scheduleGridByYearCache[year] = grid;
            return grid;
          }
        }
      } catch (e) {}

      // 2. Fallback: gviz ranges start exactly at row 4 (trailing empty rows trimmed).
      try {
        const [stValues, tcValues] = await Promise.all([
          fetchSheetRaw(year, 'X4:AC', 6),
          fetchSheetRaw(year, 'AE4:AJ', 6)
        ]);
        if (stValues && tcValues) {
          const grid = {
            study: { startRow: 4, startCol: 24, values: stValues },
            teach: { startRow: 4, startCol: 31, values: tcValues }
          };
          this._scheduleGridByYearCache[year] = grid;
          return grid;
        }
      } catch (e) {}

      return null;
    },

    // edits: [{ kind:'study'|'teach', row:<absolute sheet row>, col:<0..5>, value:<string> }]
    async saveScheduleCells(year, edits) {
      if (!year || !Array.isArray(edits) || !edits.length) return false;

      const queryString = new URLSearchParams({
        action: 'saveScheduleCells',
        sheet: year,
        cells: JSON.stringify(edits)
      }).toString();
      const url = `${APPS_SCRIPT_URL}?${queryString}`;

      // The OLD deployment falls through to its DEFAULT branch and still replies
      // { status:'success' } without writing anything. Require the explicit
      // action + saved count from the new script before reporting success.
      const isValid = json => !!(
        json && json.status === 'success' &&
        json.action === 'saveScheduleCells' && (json.saved || 0) > 0
      );

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);
        const res = await fetch(url, { method: 'GET', mode: 'cors', signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const json = await res.json().catch(() => null);
          if (json && typeof json.status === 'string') {
            if (isValid(json)) {
              delete this._schedulesByYearCache[year];
              delete this._scheduleGridByYearCache[year];
              return true;
            }
            return false;
          }
        }
      } catch (e) {}

      const json = await this._jsonp(url);
      if (isValid(json)) {
        delete this._schedulesByYearCache[year];
        delete this._scheduleGridByYearCache[year];
        return true;
      }
      return false;
    },

    _dashboardByYearCache: {},

    setDashboardForYear(year, data) {
      if (!year || !data) return;
      this._dashboardByYearCache[year] = data;
    },

    async fetchDashboardDataForYear(year) {
      const teachers = await this.fetchTeachersForYear(year);
      const students = await this.fetchStudentsForYear(year);

      let classCount = 0;
      let announcements = [];

      if (year && this._dashboardByYearCache[year]) {
        const cached = this._dashboardByYearCache[year];
        if (typeof cached.classCount === 'number' && cached.classCount > 0) {
          classCount = cached.classCount;
        }
        if (Array.isArray(cached.announcements) && cached.announcements.length > 0) {
          announcements = cached.announcements;
        }
      }

      if (!classCount) {
        // derive from the students actually loaded for this year
        const classes = new Set();
        students.forEach(s => { if (s.className) classes.add(s.className); });
        classCount = classes.size || this.getScoreLinks().length;
      }

      if (!announcements || announcements.length === 0) {
        announcements = this.getAnnouncements();
      }

      return {
        teachers,
        students,
        classCount,
        announcements
      };
    },

    // JSONP helper: returns the parsed response object, or null on error/timeout.
    _jsonp(url) {
      return new Promise((resolve) => {
        const callbackName = 'nt2_cb_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        const script = document.createElement('script');
        let done = false;

        const finish = (value) => {
          if (done) return;
          done = true;
          try { delete window[callbackName]; } catch (e) { window[callbackName] = undefined; }
          if (script.parentNode) script.remove();
          resolve(value);
        };

        window[callbackName] = function (resp) { finish(resp || null); };
        script.src = `${url}&callback=${callbackName}&_t=${Date.now()}`;
        script.onerror = () => finish(null);
        document.head.appendChild(script);

        setTimeout(() => finish(null), 10000);
      });
    },

    async _sendToAppsScript(params) {
      const queryString = new URLSearchParams(params).toString();
      const url = `${APPS_SCRIPT_URL}?${queryString}`;

      // 1. Standard CORS fetch (fast path — only works if the deployment returns CORS headers)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);
        const res = await fetch(url, { method: 'GET', mode: 'cors', signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const json = await res.json().catch(() => null);
          if (json && typeof json.status === 'string') return json.status === 'success';
        }
      } catch (e) {}

      // 2. JSONP fallback — returns the real { status } from Apps Script, so failures are detected.
      const json = await this._jsonp(url);
      if (json && typeof json.status === 'string') return json.status === 'success';

      // 3. Last resort: no-cors ping (cannot verify the result). Report failure so the
      //    UI does not falsely claim success.
      try {
        await fetch(url, { method: 'GET', mode: 'no-cors' });
      } catch (e) {}
      return false;
    },

    clearYearCache(year) {
      if (!year) return;
      delete this._teachersByYearCache[year];
      delete this._studentsByYearCache[year];
      delete this._dashboardByYearCache[year];
      delete this._schedulesByYearCache[year];
      delete this._scheduleGridByYearCache[year];
      this._tabsByUrlCache = {};
    },

    async addTeacher(year, teacher) {
      if (!year) year = localStorage.getItem('nt2_selected_year') || '';
      const ok = await this._sendToAppsScript({
        action: 'addTeacher',
        sheet: year,
        photoUrl: teacher.photoUrl || '',
        nameLao: teacher.nameLao || '',
        nameEn: teacher.nameEn || '',
        position: teacher.position || '',
        subject: teacher.subject || '',
        phone: teacher.phone || ''
      });
      delete this._teachersByYearCache[year];
      delete this._dashboardByYearCache[year];
      return ok;
    },

    async updateTeacher(year, teacher) {
      if (!year) year = localStorage.getItem('nt2_selected_year') || '';
      const ok = await this._sendToAppsScript({
        action: 'updateTeacher',
        sheet: year,
        rowNum: teacher.rowNum || teacher.row || '',
        photoUrl: teacher.photoUrl || '',
        nameLao: teacher.nameLao || '',
        nameEn: teacher.nameEn || '',
        position: teacher.position || '',
        subject: teacher.subject || '',
        phone: teacher.phone || ''
      });
      delete this._teachersByYearCache[year];
      delete this._dashboardByYearCache[year];
      return ok;
    },

    async deleteTeacher(year, teacher) {
      if (!year) year = localStorage.getItem('nt2_selected_year') || '';
      const ok = await this._sendToAppsScript({
        action: 'deleteTeacher',
        sheet: year,
        rowNum: teacher.rowNum || teacher.row || '',
        nameLao: teacher.nameLao || '',
        nameEn: teacher.nameEn || ''
      });
      delete this._teachersByYearCache[year];
      delete this._dashboardByYearCache[year];
      return ok;
    },

    async addStudent(year, student) {
      if (!year) year = localStorage.getItem('nt2_selected_year') || '';
      const ok = await this._sendToAppsScript({
        action: 'addStudent',
        sheet: year,
        photoUrl: student.photoUrl || '',
        nameLao: student.nameLao || '',
        nameEn: student.nameEn || '',
        className: student.className || ''
      });
      delete this._studentsByYearCache[year];
      delete this._dashboardByYearCache[year];
      return ok;
    },

    async updateStudent(year, student) {
      if (!year) year = localStorage.getItem('nt2_selected_year') || '';
      const ok = await this._sendToAppsScript({
        action: 'updateStudent',
        sheet: year,
        rowNum: student.rowNum || student.row || '',
        photoUrl: student.photoUrl || '',
        nameLao: student.nameLao || '',
        nameEn: student.nameEn || '',
        className: student.className || ''
      });
      delete this._studentsByYearCache[year];
      delete this._dashboardByYearCache[year];
      return ok;
    },

    async deleteStudent(year, student) {
      if (!year) year = localStorage.getItem('nt2_selected_year') || '';
      const ok = await this._sendToAppsScript({
        action: 'deleteStudent',
        sheet: year,
        rowNum: student.rowNum || student.row || '',
        nameLao: student.nameLao || '',
        nameEn: student.nameEn || ''
      });
      delete this._studentsByYearCache[year];
      delete this._dashboardByYearCache[year];
      return ok;
    },

    async addAnnouncement(year, ann) {
      if (!year) year = localStorage.getItem('nt2_selected_year') || '';
      const ok = await this._sendToAppsScript({
        action: 'addAnnouncement',
        sheet: year,
        date: ann.date || '',
        type: ann.type || 'ທົ່ວໄປ',
        title: ann.title || '',
        content: ann.content || ''
      });
      delete this._dashboardByYearCache[year];
      return ok;
    },

    async updateAnnouncement(year, ann) {
      if (!year) year = localStorage.getItem('nt2_selected_year') || '';
      const ok = await this._sendToAppsScript({
        action: 'updateAnnouncement',
        sheet: year,
        rowNum: ann.rowNum || ann.row || '',
        date: ann.date || '',
        type: ann.type || 'ທົ່ວໄປ',
        title: ann.title || '',
        content: ann.content || ''
      });
      delete this._dashboardByYearCache[year];
      return ok;
    },

    async deleteAnnouncement(year, ann) {
      if (!year) year = localStorage.getItem('nt2_selected_year') || '';
      const ok = await this._sendToAppsScript({
        action: 'deleteAnnouncement',
        sheet: year,
        rowNum: ann.rowNum || ann.row || '',
        title: ann.title || ''
      });
      delete this._dashboardByYearCache[year];
      return ok;
    },

    getAllClasses() {
      return [
        { level:'kindergarten', name:'ອ1', fullName:'ອະນຸບານ 1', fullNameEn:'Kindergarten 1' },
        { level:'kindergarten', name:'ອ2', fullName:'ອະນຸບານ 2', fullNameEn:'Kindergarten 2' },
        { level:'kindergarten', name:'ອ3', fullName:'ອະນຸບານ 3', fullNameEn:'Kindergarten 3' },
        { level:'primary',      name:'ປ1', fullName:'ປະຖົມ 1',    fullNameEn:'Primary 1'      },
        { level:'primary',      name:'ປ2', fullName:'ປະຖົມ 2',    fullNameEn:'Primary 2'      },
        { level:'primary',      name:'ປ3', fullName:'ປະຖົມ 3',    fullNameEn:'Primary 3'      },
        { level:'primary',      name:'ປ4', fullName:'ປະຖົມ 4',    fullNameEn:'Primary 4'      },
        { level:'primary',      name:'ປ5', fullName:'ປະຖົມ 5',    fullNameEn:'Primary 5'      },
        { level:'secondary',    name:'ມ1', fullName:'ມັດທະຍົມ 1', fullNameEn:'Secondary 1'    },
        { level:'secondary',    name:'ມ2', fullName:'ມັດທະຍົມ 2', fullNameEn:'Secondary 2'    },
        { level:'secondary',    name:'ມ3', fullName:'ມັດທະຍົມ 3', fullNameEn:'Secondary 3'    },
        { level:'secondary',    name:'ມ4', fullName:'ມັດທະຍົມ 4', fullNameEn:'Secondary 4'    },
        { level:'secondary',    name:'ມ5', fullName:'ມັດທະຍົມ 5', fullNameEn:'Secondary 5'    },
        { level:'secondary',    name:'ມ6', fullName:'ມັດທະຍົມ 6', fullNameEn:'Secondary 6'    },
        { level:'secondary',    name:'ມ7', fullName:'ມັດທະຍົມ 7', fullNameEn:'Secondary 7'    }
      ];
    },

    /* Display label for a class in the current language */
    classLabel(cls) {
      if (!cls) return '';
      const en = window.NT2 && NT2.Lang && NT2.Lang.current === 'en';
      return (en && cls.fullNameEn) ? cls.fullNameEn : cls.fullName;
    },

    /* Localised display label for a class code (e.g. 'ອ1' → 'Kindergarten 1') */
    classLabelByName(code) {
      const c = this.getAllClasses().find(x => x.name === code);
      return c ? this.classLabel(c) : (code || '');
    }
  };
})();
