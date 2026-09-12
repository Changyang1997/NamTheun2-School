(function () {
  const NT2 = window.NT2 = window.NT2 || {};

  const SHEET_ID   = '1ol57RaMofcBIAbWZ0ip3PP2B4FbhoZYXOkvxa6Ju3nc';
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwY5RcFeBzc5HKyEsmEBGby15KT58mSdtx_fZTva7CG8rXOCQtP01KaPJ-i9KDJIWDlPQ/exec';
  const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

  /* ─────────────────────────────────────────
     HELPERS
  ───────────────────────────────────────── */
  function gvizUrl(sheetName) {
    return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  }

  // Parse Google Visualization JSON response into array of plain objects
  async function fetchSheet(sheetName) {
    const res  = await fetch(gvizUrl(sheetName));
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
                    studySchedule: item.studySchedule || [],
                    teachingSchedule: item.teachingSchedule || []
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

    /* ── AUTO-REFRESH ────────────────────── */
    _startAutoRefresh() {
      if (this._refreshTimer) clearInterval(this._refreshTimer);
      this._refreshTimer = setInterval(async () => {
        console.log('🔄 Auto-refreshing data from Google Sheets...');
        this._setSyncStatus('loading');
        await this._fetchAll();
      }, AUTO_REFRESH_MS);
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
    getStudySchedule()          { return Array.isArray(this._cache.studySchedule)    ? this._cache.studySchedule    : []; },
    getTeachingSchedule()       { return Array.isArray(this._cache.teachingSchedule) ? this._cache.teachingSchedule : []; },
    getScoreLinks()             { return Array.isArray(this._cache.scoreLinks)       ? this._cache.scoreLinks       : []; },
    getActivities()             { return Array.isArray(this._cache.activities)       ? this._cache.activities       : []; },
    getGradingRules()           { return this._cache.gradingRules || '';                       },
    getClassCount()             { return 0; },
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
        "rules": "#"
      };
    },

    async fetchScoreLinksForYear(year) {
      if (!year) return this.getScoreLinksForYear(year);

      if (this._scoreLinksByYearCache[year]) {
        return this._scoreLinksByYearCache[year];
      }

      // Try Apps Script endpoint
      try {
        const res = await fetch(`${APPS_SCRIPT_URL}?action=getScoreLinks&sheet=${encodeURIComponent(year)}`);
        if (res.ok) {
          const json = await res.json();
          if (json && json.status === 'success' && json.scoreLinks) {
            this.setScoreLinksForYear(year, json.scoreLinks);
            return json.scoreLinks;
          }
        }
      } catch (e) {}

      // Fallback gviz fetch: Row 2 (index 0 in rows)
      try {
        const rows = await fetchSheet(year);
        if (rows && rows.length > 0) {
          const r = rows[0]; // Row 2
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
            const studySchedule    = (json.studySchedule && json.studySchedule.length > 0)    ? json.studySchedule    : this.getStudySchedule();
            const teachingSchedule = (json.teachingSchedule && json.teachingSchedule.length > 0) ? json.teachingSchedule : this.getTeachingSchedule();
            
            const sched = { studySchedule, teachingSchedule };
            this.setScheduleForYear(year, sched);
            return sched;
          }
        }
      } catch (e) {}

      // Fallback gviz fetch: Row 6+ (index 4 in rows)
      try {
        const rows = await fetchSheet(year);
        if (rows && rows.length >= 5) {
          const schedRows = rows.slice(4); // Row 6 and down
          const studySchedule = [];
          const teachingSchedule = [];

          schedRows.forEach(r => {
            const keys = Object.keys(r);

            // Student Schedule (Col X:AC -> indexes 23..28)
            const stTime = String(r['col23'] || (keys[23] ? r[keys[23]] : '')).trim();
            const stMon  = String(r['col24'] || (keys[24] ? r[keys[24]] : '')).trim();
            const stTue  = String(r['col25'] || (keys[25] ? r[keys[25]] : '')).trim();
            const stWed  = String(r['col26'] || (keys[26] ? r[keys[26]] : '')).trim();
            const stThu  = String(r['col27'] || (keys[27] ? r[keys[27]] : '')).trim();
            const stFri  = String(r['col28'] || (keys[28] ? r[keys[28]] : '')).trim();

            if (stTime || stMon || stTue || stWed || stThu || stFri) {
              studySchedule.push({
                time: stTime,
                mon: stMon,
                tue: stTue,
                wed: stWed,
                thu: stThu,
                fri: stFri,
                isBreak: stMon.includes('ພັກ') || stTime.includes('ພັກ')
              });
            }

            // Teacher Schedule (Col AE:AJ -> indexes 30..35)
            const tcTime = String(r['col30'] || (keys[30] ? r[keys[30]] : '')).trim();
            const tcMon  = String(r['col31'] || (keys[31] ? r[keys[31]] : '')).trim();
            const tcTue  = String(r['col32'] || (keys[32] ? r[keys[32]] : '')).trim();
            const tcWed  = String(r['col33'] || (keys[33] ? r[keys[33]] : '')).trim();
            const tcThu  = String(r['col34'] || (keys[34] ? r[keys[34]] : '')).trim();
            const tcFri  = String(r['col35'] || (keys[35] ? r[keys[35]] : '')).trim();

            if (tcTime || tcMon || tcTue || tcWed || tcThu || tcFri) {
              teachingSchedule.push({
                time: tcTime,
                mon: tcMon,
                tue: tcTue,
                wed: tcWed,
                thu: tcThu,
                fri: tcFri,
                isBreak: tcMon.includes('ພັກ') || tcTime.includes('ພັກ')
              });
            }
          });

          const finalStudy    = studySchedule.length > 0    ? studySchedule    : this.getStudySchedule();
          const finalTeaching = teachingSchedule.length > 0 ? teachingSchedule : this.getTeachingSchedule();
          
          const sched = { studySchedule: finalStudy, teachingSchedule: finalTeaching };
          this.setScheduleForYear(year, sched);
          return sched;
        }
      } catch(e) {}

      return this.getScheduleForYear(year);
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

    async _sendToAppsScript(params) {
      const queryString = new URLSearchParams(params).toString();
      const url = `${APPS_SCRIPT_URL}?${queryString}`;

      // 1. Try standard CORS fetch
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);
        const res = await fetch(url, { method: 'GET', mode: 'cors', signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const json = await res.json().catch(() => null);
          if (json && json.status === 'success') return true;
        }
      } catch (e) {}

      // 2. Try no-cors fetch (dispatches HTTP GET to Google Apps Script without CORS blockage)
      try {
        await fetch(url, { method: 'GET', mode: 'no-cors' });
      } catch (e) {}

      // 3. Fallback to dynamic script injection (JSONP style, always succeeds in all browsers even under file:/// protocol)
      return new Promise((resolve) => {
        const callbackName = 'nt2_cb_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        const script = document.createElement('script');
        let resolved = false;

        const cleanup = () => {
          if (resolved) return;
          resolved = true;
          delete window[callbackName];
          if (script.parentNode) script.remove();
          resolve(true);
        };

        window[callbackName] = function() { cleanup(); };
        script.src = `${url}&callback=${callbackName}&_t=${Date.now()}`;
        script.onload = cleanup;
        script.onerror = cleanup;
        document.head.appendChild(script);

        setTimeout(cleanup, 4500);
      });
    },

    clearYearCache(year) {
      if (!year) return;
      delete this._teachersByYearCache[year];
      delete this._studentsByYearCache[year];
      delete this._dashboardByYearCache[year];
      delete this._scheduleByYearCache[year];
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
        { level:'kindergarten', name:'ອ1', fullName:'ອະນຸບານ 1' },
        { level:'kindergarten', name:'ອ2', fullName:'ອະນຸບານ 2' },
        { level:'kindergarten', name:'ອ3', fullName:'ອະນຸບານ 3' },
        { level:'primary',      name:'ປ1', fullName:'ປະຖົມ 1'    },
        { level:'primary',      name:'ປ2', fullName:'ປະຖົມ 2'    },
        { level:'primary',      name:'ປ3', fullName:'ປະຖົມ 3'    },
        { level:'primary',      name:'ປ4', fullName:'ປະຖົມ 4'    },
        { level:'primary',      name:'ປ5', fullName:'ປະຖົມ 5'    },
        { level:'secondary',    name:'ມ1', fullName:'ມັດທະຍົມ 1' },
        { level:'secondary',    name:'ມ2', fullName:'ມັດທະຍົມ 2' },
        { level:'secondary',    name:'ມ3', fullName:'ມັດທະຍົມ 3' },
        { level:'secondary',    name:'ມ4', fullName:'ມັດທະຍົມ 4' },
        { level:'secondary',    name:'ມ5', fullName:'ມັດທະຍົມ 5' },
        { level:'secondary',    name:'ມ6', fullName:'ມັດທະຍົມ 6' },
        { level:'secondary',    name:'ມ7', fullName:'ມັດທະຍົມ 7' }
      ];
    }
  };
})();
