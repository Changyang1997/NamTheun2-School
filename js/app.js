(function () {
  const NT2 = window.NT2 = window.NT2 || {};

  /* ─────────────────────────────────────────
     PAGE TITLES
  ───────────────────────────────────────── */
  const PAGE_TITLES = {
    dashboard:     'page.dashboard',
    academic_year: 'page.academic_year',
    teachers:      'page.teachers',
    students:      'page.students',
    scores:        'page.scores',
    attendance:    'page.attendance',
    schedule:      'page.schedule',
    classes:       'page.classes'
  };

  /* ─────────────────────────────────────────
     UTILS
  ───────────────────────────────────────── */
  function fmtDate(d) {
    if (!d) return '';
    const months = window.NT2 && NT2.Lang ? NT2.Lang.t('months') : ['ມັງກອນ','ກຸມພາ','ມີນາ','ເມສາ','ພຶດສະພາ','ມິຖຸນາ',
                    'ກໍລະກົດ','ສິງຫາ','ກັນຍາ','ຕຸລາ','ພະຈິກ','ທັນວາ'];
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
  }

  function initials(name) { return name ? name.charAt(0) : '?'; }

  /* ─────────────────────────────────────────
     TOAST
  ───────────────────────────────────────── */
  function showToast(msg, type = 'info') {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const icons = { success: 'check_circle', error: 'error', info: 'info' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span class="material-symbols-rounded">${icons[type]||'info'}</span><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; t.style.transform='translateY(10px)'; setTimeout(()=>t.remove(),300); }, 3000);
  }

  const L = (key) => window.NT2 && NT2.Lang ? NT2.Lang.t(key) : key;

  /* ─────────────────────────────────────────
     APP
  ───────────────────────────────────────── */
  NT2.App = {
    currentPage: 'dashboard',

    /* ── INIT ────────────────────────────── */
    async init() {
      // Show loading
      const mc = document.getElementById('mainContent');
      if (mc) mc.innerHTML = `<div class="loading-screen"><div class="loading-spinner"></div><p>${L('loading')}</p></div>`;

      NT2.Lang.init();
      await NT2.Data.init();
      NT2.Auth.init();
      this._bindEvents();
      this._initTheme();
      NT2.Lang.applyLogin();

      // Re-render current page when data refreshes
      NT2.Data.onRefresh(() => {
        showToast(L('toast.refreshed'), 'success');
        this._initYearDropdown(); // refresh dropdown list
        this.loadPage(this.currentPage);
      });

      // Language toggle
      document.getElementById('langToggleBtn')?.addEventListener('click', () => {
        NT2.Lang.toggle();
      });

      this.loadPage('dashboard');
    },

    /* ── EVENTS ──────────────────────────── */
    _bindEvents() {
      // Sidebar nav
      document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', e => {
          e.preventDefault();
          this.loadPage(item.dataset.page);
          this._closeSidebar();
        });
      });

      // Mobile menu
      document.getElementById('menuToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.add('open');
        document.getElementById('sidebarOverlay')?.classList.add('active');
      });
      document.getElementById('sidebarOverlay')?.addEventListener('click', () => this._closeSidebar());

      // Refresh button
      document.getElementById('refreshBtn')?.addEventListener('click', async () => {
        await NT2.Data.refresh();
        this.loadPage(this.currentPage);
      });

      // Year dropdown
      this._initYearDropdown();
      document.getElementById('yearDropdownBtn')?.addEventListener('click', e => {
        e.stopPropagation();
        this._toggleYearDropdown();
      });
      document.addEventListener('click', e => {
        if (!document.getElementById('yearDropdown')?.contains(e.target)) {
          this._closeYearDropdown();
        }
      });

      // Login / logout
      document.getElementById('loginBtn')?.addEventListener('click', () => {
        NT2.Auth.isLoggedIn ? NT2.Auth.logout() : document.getElementById('loginModal')?.classList.add('active');
      });
      document.getElementById('loginModalClose')?.addEventListener('click',  () => document.getElementById('loginModal')?.classList.remove('active'));
      document.getElementById('loginModalClose2')?.addEventListener('click', () => document.getElementById('loginModal')?.classList.remove('active'));
      document.getElementById('loginModal')?.addEventListener('click', e => { if (e.target.id === 'loginModal') e.target.classList.remove('active'); });

      document.getElementById('loginSubmit')?.addEventListener('click', () => {
        const u = document.getElementById('loginUsername').value.trim();
        const p = document.getElementById('loginPassword').value;
        const err = document.getElementById('loginError');
        if (NT2.Auth.login(u, p)) {
          document.getElementById('loginModal').classList.remove('active');
          err.classList.add('hidden');
          document.getElementById('loginUsername').value = '';
          document.getElementById('loginPassword').value = '';
          this.loadPage(this.currentPage);
          showToast(L('login.success') + '!', 'success');
        } else {
          err.innerText = L('login.invalid');
          err.classList.remove('hidden');
        }
      });
      document.getElementById('loginPassword')?.addEventListener('keypress', e => {
        if (e.key === 'Enter') document.getElementById('loginSubmit')?.click();
      });

      // Theme cycle button (auto → light → dark → auto)
      document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
        const order = ['auto', 'light', 'dark'];
        const cur   = localStorage.getItem('nt2_theme') || 'auto';
        const next  = order[(order.indexOf(cur) + 1) % order.length];
        this._setTheme(next);
      });
    },

    _closeSidebar() {
      document.getElementById('sidebar')?.classList.remove('open');
      document.getElementById('sidebarOverlay')?.classList.remove('active');
    },

    /* ── YEAR DROPDOWN ───────────────────── */
    _initYearDropdown() {
      const menu = document.getElementById('yearDropdownMenu');
      if (!menu) return;
      const years = NT2.Data.getAcademicYears();
      const saved = localStorage.getItem('nt2_selected_year') || (years[0] ? years[0].year : '');

      menu.innerHTML = years.map(y => `
        <button class="year-dropdown-item ${y.year === saved ? 'active' : ''}"
                data-year="${y.year}">
          ${y.year}
        </button>`).join('');

      // Set label to saved selection
      const label = document.getElementById('yearDropdownLabel');
      if (label && saved) {
        label.textContent = saved;
        label.dataset.custom = '1';
      }

      // Update school header info (logo, name, subtitle) for initial year
      this.updateHeaderSchoolInfo(saved);

      // Click handlers for each item
      menu.querySelectorAll('.year-dropdown-item').forEach(item => {
        item.addEventListener('click', async e => {
          e.stopPropagation();
          const yr = item.dataset.year;
          localStorage.setItem('nt2_selected_year', yr);
          const lbl = document.getElementById('yearDropdownLabel');
          if (lbl) {
            lbl.textContent = yr;
            lbl.dataset.custom = '1';
          }
          menu.querySelectorAll('.year-dropdown-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          this._closeYearDropdown();
          
          // Update header info dynamically & reload page content
          await this.updateHeaderSchoolInfo(yr);
          this.loadPage(this.currentPage);
          showToast(`${L('toast.year_selected')} ${yr}`, 'success');
        });
      });
    },

    async updateHeaderSchoolInfo(year) {
      if (!year) {
        const years = NT2.Data.getAcademicYears();
        year = localStorage.getItem('nt2_selected_year') || (years[0] ? years[0].year : '');
      }
      if (!year) return;

      const info = await NT2.Data.fetchSchoolInfoForYear(year);
      
      const logoContainer = document.getElementById('school-logo');
      const nameEl = document.getElementById('schoolName');
      const subEl  = document.getElementById('schoolSubtitle');

      if (nameEl && info.schoolName) {
        nameEl.textContent = info.schoolName;
      }
      if (subEl && info.subtitle) {
        subEl.textContent = info.subtitle;
      }
      if (logoContainer) {
        if (info.logo && info.logo.trim().startsWith('http')) {
          logoContainer.innerHTML = `<img src="${info.logo.trim()}" alt="School Logo" onerror="this.outerHTML='<svg viewBox=\\'0 0 24 24\\'><path d=\\'M12 3L1 9L4 10.63V17.5C4 18.88 7.58 20 12 20C16.42 20 20 18.88 20 17.5V10.63L23 9L12 3M12 5.18L18.66 8.84L12 12.5L5.34 8.84L12 5.18Z\\'/></svg>'">`;
        } else {
          logoContainer.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 3L1 9L4 10.63V17.5C4 18.88 7.58 20 12 20C16.42 20 20 18.88 20 17.5V10.63L23 9L12 3M12 5.18L18.66 8.84L12 12.5L5.34 8.84L12 5.18Z"/></svg>`;
        }
      }
    },

    _toggleYearDropdown() {
      const menu    = document.getElementById('yearDropdownMenu');
      const btn     = document.getElementById('yearDropdownBtn');
      const chevron = document.getElementById('yearChevron');
      if (!menu) return;
      const isOpen = menu.classList.contains('open');
      if (isOpen) {
        this._closeYearDropdown();
      } else {
        menu.classList.add('open');
        btn?.classList.add('open');
        chevron?.classList.add('rotated');
      }
    },

    _closeYearDropdown() {
      document.getElementById('yearDropdownMenu')?.classList.remove('open');
      document.getElementById('yearDropdownBtn')?.classList.remove('open');
      document.getElementById('yearChevron')?.classList.remove('rotated');
    },

    /* ── THEME ───────────────────────────── */
    _initTheme() { this._setTheme(localStorage.getItem('nt2_theme') || 'auto'); },
    _setTheme(theme) {
      const icons = { auto: 'brightness_auto', light: 'light_mode', dark: 'dark_mode' };
      const titles = { auto: L('theme.auto'), light: L('theme.light'), dark: L('theme.dark') };

      // Apply class to body
      const body = document.body;
      body.className = body.className.replace(/theme-\S+/g, '').trim();
      body.classList.add(`theme-${theme}`);
      if (NT2.Auth.isLoggedIn) body.classList.add('admin-mode');
      localStorage.setItem('nt2_theme', theme);

      // Update single cycle button icon & tooltip
      const btn  = document.getElementById('themeToggleBtn');
      const icon = document.getElementById('themeIcon');
      if (icon) icon.textContent = icons[theme] || 'brightness_auto';
      if (btn)  btn.title        = titles[theme] || '';

      // Add a quick spin animation on click
      if (icon) {
        icon.classList.remove('theme-spin');
        void icon.offsetWidth; // force reflow
        icon.classList.add('theme-spin');
      }
    },

    /* ── IMAGE ZOOM / LIGHTBOX ───────────── */
    zoomImage(photoUrl, title, subtitle) {
      if (!photoUrl || !photoUrl.trim() || !photoUrl.trim().startsWith('http')) {
        showToast(L('zoom.no_image'), 'info');
        return;
      }
      const existing = document.querySelector('.image-zoom-overlay');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.className = 'image-zoom-overlay active';
      overlay.innerHTML = `
        <div class="zoom-image-container">
          <button class="zoom-close-btn" title="${L('zoom.close')}"><span class="material-symbols-rounded">close</span></button>
          <div class="zoom-image-wrapper">
            <img src="${photoUrl.trim()}" alt="${title || L('zoom.image')}" onerror="this.onerror=null;showToast('${L('zoom.load_error')}','error');this.closest('.image-zoom-overlay').remove()">
          </div>
          ${(title || subtitle) ? `
          <div class="zoom-info">
            ${title ? `<div class="zoom-title">${title}</div>` : ''}
            ${subtitle ? `<div class="zoom-subtitle">${subtitle}</div>` : ''}
            <div class="zoom-tip">${L('zoom.tip')}</div>
          </div>` : ''}
        </div>
      `;

      const closeZoom = () => {
        document.removeEventListener('keydown', onEsc);
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 250);
      };

      const onEsc = e => { if (e.key === 'Escape') closeZoom(); };
      document.addEventListener('keydown', onEsc);

      overlay.querySelector('.zoom-close-btn')?.addEventListener('click', e => {
        e.stopPropagation();
        closeZoom();
      });
      overlay.addEventListener('click', e => {
        if (e.target === overlay || e.target.classList.contains('zoom-image-container')) {
          closeZoom();
        }
      });

      document.body.appendChild(overlay);
    },

    /* ── ROUTER ──────────────────────────── */
    loadPage(pageId) {
      if (!PAGE_TITLES[pageId]) pageId = 'dashboard';
      this.currentPage = pageId;

      // Nav active state
      document.querySelectorAll('.nav-item').forEach(item =>
        item.classList.toggle('active', item.dataset.page === pageId)
      );

      // Header title
      const titleEl = document.getElementById('headerTitle');
      if (titleEl) titleEl.innerText = L(PAGE_TITLES[pageId] || 'page.dashboard');

      // Render
      const content = document.getElementById('mainContent');
      if (!content) return;
      content.innerHTML = '';

      const renderers = {
        dashboard:     () => this.renderDashboard(content),
        academic_year: () => this.renderAcademicYear(content),
        teachers:      () => this.renderTeachers(content),
        students:      () => this.renderStudents(content),
        scores:        () => this.renderScores(content),
        attendance:    () => this.renderAttendance(content),
        schedule:      () => this.renderSchedule(content),
        classes:       () => this.renderClasses(content)
      };
      (renderers[pageId] || renderers.dashboard)();
    },

    /* Re-apply translations + re-render current page (called on language switch) */
    applyLang() {
      const dt = window.NT2 && NT2.Data;
      if (dt && typeof dt.refreshSyncLabel === 'function') dt.refreshSyncLabel();
      this.loadPage(this.currentPage);
    },

    /* ═══════════════════════════════════════
       RENDERERS
    ═══════════════════════════════════════ */

    /* ── DASHBOARD ───────────────────────── */
    async renderDashboard(container) {
      const selectedYear  = localStorage.getItem('nt2_selected_year') || '';
      const dashData      = await NT2.Data.fetchDashboardDataForYear(selectedYear);
      const students      = dashData.students || [];
      const teachers      = dashData.teachers || [];
      const classCount    = dashData.classCount || 0;
      const announcements = dashData.announcements || [];

      const todayStr = new Date().toISOString().split('T')[0];

      const isPassed = dateVal => {
        if (!dateVal) return false;
        const cleaned = String(dateVal).trim().split('T')[0];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return false;
        return cleaned < todayStr;
      };

      const activeAnnouncements = announcements.filter(a => !isPassed(a.date));
      const urgent = activeAnnouncements.filter(a => a.type === 'urgent' || a.type === 'ດ່ວນ');
      const normal = activeAnnouncements.filter(a => a.type === 'normal' || a.type === 'ທົ່ວໄປ' || !a.type);

      let pastActivities = announcements.filter(a => isPassed(a.date));
      if (!pastActivities || pastActivities.length === 0) {
        pastActivities = NT2.Data.getActivities().map(a => ({
          date: a.date,
          title: a.activity,
          content: a.detail
        }));
      }
      pastActivities = pastActivities
        .filter(a => a && a.date && a.title)
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));
      pastActivities.forEach((a, i) => { a._num = i + 1; });

container.innerHTML = `
        <div class="page-container fade-in">
          <div class="page-header">
            <h2 class="page-title">${L('dash.title')} ${selectedYear ? `(${selectedYear})` : ''}</h2>
          </div>

          <div class="stats-grid">
            <div class="stat-card blue">
              <div class="stat-icon blue"><span class="material-symbols-rounded">groups</span></div>
              <div class="stat-info">
                <div class="stat-value" data-target="${students.length}">0</div>
                <div class="stat-label">${L('dash.stat.students')}</div>
              </div>
            </div>
            <div class="stat-card gold">
              <div class="stat-icon gold"><span class="material-symbols-rounded">school</span></div>
              <div class="stat-info">
                <div class="stat-value" data-target="${teachers.length}">0</div>
                <div class="stat-label">${L('dash.stat.teachers')}</div>
              </div>
            </div>
            <div class="stat-card green">
              <div class="stat-icon green"><span class="material-symbols-rounded">class</span></div>
              <div class="stat-info">
                <div class="stat-value" data-target="${classCount}">0</div>
                <div class="stat-label">${L('dash.stat.classes')}</div>
              </div>
            </div>
            <div class="stat-card red">
              <div class="stat-icon red"><span class="material-symbols-rounded">campaign</span></div>
              <div class="stat-info">
                <div class="stat-value" data-target="${activeAnnouncements.length}">0</div>
                <div class="stat-label">${L('dash.stat.ann')}</div>
              </div>
            </div>
          </div>

          <div class="announcements-section">
            <div class="card">
              <div class="card-header">
                <span><span class="material-symbols-rounded" style="vertical-align:middle;margin-right:6px;color:#E53935">priority_high</span>${L('dash.urgent')}</span>
                <button class="btn btn-sm btn-danger admin-only" onclick="NT2.App._addAnnouncementModal('urgent')">
                  <span class="material-symbols-rounded" style="font-size:15px">add</span>${L('common.add')}
                </button>
              </div>
              <div class="card-body announcement-list">
                ${urgent.length ? urgent.map(a => `
                  <div class="announcement-item urgent">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start">
                      <span class="announcement-badge">${L('dash.badge.urgent')}</span>
                      <div class="admin-only" style="display:flex;gap:4px">
                        <button class="edit-btn" title="${L('common.edit')}" onclick="NT2.App._editAnnouncementModal('${a.rowNum||''}','${(a.date||'')}','ດ່ວນ','${(a.title||'').replace(/'/g,"\\'")}','${(a.content||'').replace(/'/g,"\\'")}')"><span class="material-symbols-rounded" style="font-size:14px">edit</span></button>
                        <button class="delete-btn" title="${L('common.delete')}" onclick="NT2.App._deleteAnnouncement('${a.rowNum||''}','${(a.title||'').replace(/'/g,"\\'")}')"><span class="material-symbols-rounded" style="font-size:14px">delete</span></button>
                      </div>
                    </div>
                    <h4 class="announcement-title">${a.title}</h4>
                    <div class="announcement-date"><span class="material-symbols-rounded" style="font-size:13px;vertical-align:middle">calendar_today</span> ${fmtDate(a.date)}</div>
                    <div class="announcement-content">${a.content}</div>
                  </div>`).join('') : '<div style="text-align:center;padding:24px;color:var(--text-muted)">' + L('dash.no_urgent') + '</div>'}
              </div>
            </div>

            <div class="card">
              <div class="card-header">
                <span><span class="material-symbols-rounded" style="vertical-align:middle;margin-right:6px;color:var(--accent-primary)">campaign</span>${L('dash.normal')}</span>
                <button class="btn btn-sm btn-primary admin-only" onclick="NT2.App._addAnnouncementModal('normal')">
                  <span class="material-symbols-rounded" style="font-size:15px">add</span>${L('common.add')}
                </button>
              </div>
              <div class="card-body announcement-list">
                ${normal.length ? normal.map(a => `
                  <div class="announcement-item normal">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start">
                      <span class="announcement-badge">${L('dash.badge.normal')}</span>
                      <div class="admin-only" style="display:flex;gap:4px">
                        <button class="edit-btn" title="${L('common.edit')}" onclick="NT2.App._editAnnouncementModal('${a.rowNum||''}','${(a.date||'')}','ທົ່ວໄປ','${(a.title||'').replace(/'/g,"\\'")}','${(a.content||'').replace(/'/g,"\\'")}')"><span class="material-symbols-rounded" style="font-size:14px">edit</span></button>
                        <button class="delete-btn" title="${L('common.delete')}" onclick="NT2.App._deleteAnnouncement('${a.rowNum||''}','${(a.title||'').replace(/'/g,"\\'")}')"><span class="material-symbols-rounded" style="font-size:14px">delete</span></button>
                      </div>
                    </div>
                    <h4 class="announcement-title">${a.title}</h4>
                    <div class="announcement-date"><span class="material-symbols-rounded" style="font-size:13px;vertical-align:middle">calendar_today</span> ${fmtDate(a.date)}</div>
                    <div class="announcement-content">${a.content}</div>
                  </div>`).join('') : '<div style="text-align:center;padding:24px;color:var(--text-muted)">' + L('dash.no_ann') + '</div>'}
              </div>
            </div>
          </div>

          <div class="card mt-3">
            <div class="card-header">
              <span><span class="material-symbols-rounded" style="vertical-align:middle;margin-right:6px">timeline</span>${L('dash.past')}</span>
              <button class="btn btn-sm btn-primary admin-only" onclick="NT2.App._addAnnouncementModal('past')">
                <span class="material-symbols-rounded" style="font-size:15px">add</span>${L('common.add')}
              </button>
            </div>
            <div class="card-body">
              <div class="timeline">
                ${pastActivities.map(a => `
                  <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                      <div style="display:flex;justify-content:space-between;align-items:center">
                        <div class="timeline-date"><span class="timeline-num">${a._num}</span> ${fmtDate(a.date)}</div>
                        ${a.rowNum ? `<div class="admin-only" style="display:flex;gap:4px">
                          <button class="edit-btn" title="${L('common.edit')}" onclick="NT2.App._editAnnouncementModal('${a.rowNum||''}','${(a.date||'')}','ທົ່ວໄປ','${(a.title||a.activity||'').replace(/'/g,"\\'")}','${(a.content||a.detail||'').replace(/'/g,"\\'")}')"><span class="material-symbols-rounded" style="font-size:14px">edit</span></button>
                          <button class="delete-btn" title="${L('common.delete')}" onclick="NT2.App._deleteAnnouncement('${a.rowNum||''}','${(a.title||a.activity||'').replace(/'/g,"\\'")}')"><span class="material-symbols-rounded" style="font-size:14px">delete</span></button>
                        </div>` : ''}
                      </div>
                      <div class="timeline-title">${a.title || a.activity || L('dash.activity')}</div>
                      <div style="font-size:0.82rem;color:var(--text-secondary);margin-top:4px">${a.content || a.detail || ''}</div>
                    </div>
                  </div>`).join('')}
              </div>
            </div>
          </div>
        </div>`;

      // Animated counters
      container.querySelectorAll('.stat-value[data-target]').forEach(el => {
        const target = parseInt(el.dataset.target) || 0;
        let cur = 0;
        const step = Math.max(1, Math.ceil(target / 25));
        const t = setInterval(() => {
          cur = Math.min(cur + step, target);
          el.textContent = cur;
          if (cur >= target) clearInterval(t);
        }, 40);
      });
    },

    _addAnnouncementModal(defaultType) {
      const todayStr = new Date().toISOString().split('T')[0];
      const isPast = defaultType === 'past';
      const selectedType = isPast ? 'ທົ່ວໄປ' : (defaultType === 'urgent' ? 'ດ່ວນ' : 'ທົ່ວໄປ');

      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay active dynamic-modal';
      overlay.innerHTML = `
        <div class="modal" style="max-width:480px">
          <div class="modal-header">
            <h3 class="modal-title"><span class="material-symbols-rounded">campaign</span> ${L('modal.add_ann')}</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">${L('modal.date')}</label>
              <input type="date" class="form-input" id="annDate" value="${todayStr}">
            </div>
            <div class="form-group">
              <label class="form-label">${L('modal.type')}</label>
              <select class="form-select" id="annType">
                <option value="ດ່ວນ" ${selectedType === 'ດ່ວນ' ? 'selected' : ''}>${L('dash.badge.urgent')}</option>
                <option value="ທົ່ວໄປ" ${selectedType === 'ທົ່ວໄປ' ? 'selected' : ''}>${L('dash.badge.normal')}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">${L('modal.title')}</label>
              <input type="text" class="form-input" id="annTitle" placeholder="${L('modal.title_ph')}">
            </div>
            <div class="form-group">
              <label class="form-label">${L('modal.content')}</label>
              <textarea class="form-textarea" id="annContent" placeholder="${L('modal.content_ph')}"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">${L('common.cancel')}</button>
            <button class="btn btn-primary" id="saveAnnBtn">${L('common.save')}</button>
          </div>
        </div>`;

      overlay.querySelector('#saveAnnBtn').onclick = async () => {
        const date    = overlay.querySelector('#annDate').value;
        const type    = overlay.querySelector('#annType').value;
        const title   = overlay.querySelector('#annTitle').value.trim();
        const content = overlay.querySelector('#annContent').value.trim();

        if (!title) { showToast(L('toast.enter_title'), 'error'); return; }

        showToast(L('toast.saving_sheet'), 'info');
        const selectedYear = localStorage.getItem('nt2_selected_year') || '';
        const ok = await NT2.Data.addAnnouncement(selectedYear, { date, type, title, content });
        if (ok) {
          showToast(L('toast.added_ann'), 'success');
          overlay.remove();
          this.loadPage('dashboard');
        } else {
          showToast(L('toast.save_error'), 'error');
        }
      };

      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
      document.body.appendChild(overlay);
    },

    _editAnnouncementModal(rowNum, date, typeLabel, title, content) {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay active dynamic-modal';
      overlay.innerHTML = `
        <div class="modal" style="max-width:480px">
          <div class="modal-header">
            <h3 class="modal-title"><span class="material-symbols-rounded">edit</span> ${L('modal.edit_ann')}</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">${L('modal.date')}</label>
              <input type="date" class="form-input" id="editAnnDate" value="${date}">
            </div>
            <div class="form-group">
              <label class="form-label">${L('modal.type')}</label>
              <select class="form-select" id="editAnnType">
                <option value="ດ່ວນ" ${typeLabel === 'ດ່ວນ' ? 'selected' : ''}>${L('dash.badge.urgent')}</option>
                <option value="ທົ່ວໄປ" ${typeLabel !== 'ດ່ວນ' ? 'selected' : ''}>${L('dash.badge.normal')}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">${L('modal.title')}</label>
              <input type="text" class="form-input" id="editAnnTitle" value="${title}">
            </div>
            <div class="form-group">
              <label class="form-label">${L('modal.content')}</label>
              <textarea class="form-textarea" id="editAnnContent">${content}</textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">${L('common.cancel')}</button>
            <button class="btn btn-primary" id="updateAnnBtn">${L('common.save_edit')}</button>
          </div>
        </div>`;

      overlay.querySelector('#updateAnnBtn').onclick = async () => {
        const dateVal    = overlay.querySelector('#editAnnDate').value;
        const typeVal    = overlay.querySelector('#editAnnType').value;
        const titleVal   = overlay.querySelector('#editAnnTitle').value.trim();
        const contentVal = overlay.querySelector('#editAnnContent').value.trim();

        if (!titleVal) { showToast(L('toast.enter_title'), 'error'); return; }

        showToast(L('toast.updating'), 'info');
        const selectedYear = localStorage.getItem('nt2_selected_year') || '';
        const ok = await NT2.Data.updateAnnouncement(selectedYear, { rowNum, date: dateVal, type: typeVal, title: titleVal, content: contentVal });
        if (ok) {
          showToast(L('toast.updated_ann'), 'success');
          overlay.remove();
          this.loadPage('dashboard');
        } else {
          showToast(L('toast.save_error'), 'error');
        }
      };

      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
      document.body.appendChild(overlay);
    },

    async _deleteAnnouncement(rowNum, title) {
      if (!confirm(`${L('confirm.delete')} "${title}" ${L('confirm.q')}`)) return;
      showToast(L('toast.deleting'), 'info');
      const selectedYear = localStorage.getItem('nt2_selected_year') || '';
      const ok = await NT2.Data.deleteAnnouncement(selectedYear, { rowNum, title });
      if (ok) {
        showToast(L('toast.deleted_ann'), 'success');
        this.loadPage('dashboard');
      } else {
        showToast(L('toast.save_error'), 'error');
      }
    },

    /* ── ACADEMIC YEAR ───────────────────── */
    renderAcademicYear(container) {
      const years  = NT2.Data.getAcademicYears();
      const active = years.find(y => y.status && (y.status.includes('ດຳເນີນ') || y.status.includes('In Progress')));

      container.innerHTML = `
        <div class="page-container fade-in">
          <div class="page-header">
            <h2 class="page-title">${L('page.academic_year')}</h2>
            <div class="page-actions">
              <a href="https://docs.google.com/spreadsheets/d/1ol57RaMofcBIAbWZ0ip3PP2B4FbhoZYXOkvxa6Ju3nc/edit" target="_blank" class="btn btn-secondary admin-only">
                <span class="material-symbols-rounded">edit_note</span>${L('common.edit')} Google Sheet
              </a>
            </div>
          </div>

          ${active ? `
          <div class="card mb-3" style="border-left:4px solid var(--accent-success)">
            <div class="card-body" style="display:flex;align-items:center;gap:20px;padding:20px">
              <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#2E7D32,#66BB6A);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <span class="material-symbols-rounded" style="color:#fff;font-size:26px">calendar_today</span>
              </div>
              <div>
                <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:2px">${L('year.current')}</div>
                <div style="font-size:1.4rem;font-weight:700">${active.year}</div>
                <div style="font-size:0.85rem;color:var(--text-secondary);margin-top:4px">
                  <span class="material-symbols-rounded" style="font-size:14px;vertical-align:middle">date_range</span>
                  ${fmtDate(active.startDate)} — ${fmtDate(active.endDate)}
                </div>
              </div>
              <div style="margin-left:auto">
                <span style="background:rgba(102,187,106,0.15);color:#43A047;padding:6px 14px;border-radius:20px;font-size:0.8rem;font-weight:600">
                  ● ${L('year.active')}
                </span>
              </div>
            </div>
          </div>` : ''}

          <div class="card">
            <div class="card-header">
              <span><span class="material-symbols-rounded" style="vertical-align:middle;margin-right:6px">history_edu</span>${L('year.history')}</span>
            </div>
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>${L('header.year')}</th>
                    <th>${L('year.start')}</th>
                    <th>${L('year.end')}</th>
                    <th>${L('year.status')}</th>
                    <th>${L('year.note')}</th>
                    <th class="admin-only">${L('common.manage')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${years.length ? years.map((y, i) => `
                    <tr>
                      <td style="color:var(--text-muted)">${i + 1}</td>
                      <td style="font-weight:600">${y.year}</td>
                      <td>${fmtDate(y.startDate) || y.startDate}</td>
                      <td>${fmtDate(y.endDate)   || y.endDate}</td>
                      <td>
                        <span style="padding:3px 10px;border-radius:12px;font-size:0.78rem;font-weight:600;${
                          y.status && y.status.includes('ດຳເນີນ')
                            ? 'background:rgba(102,187,106,0.15);color:#43A047'
                            : 'background:rgba(100,116,139,0.12);color:var(--text-muted)'
                        }">${y.status || '—'}</span>
                      </td>
                      <td style="color:var(--text-secondary);font-size:0.85rem">${y.note || '—'}</td>
                      <td class="admin-only">
                        <button class="edit-btn" title="${L('common.edit')}">
                          <span class="material-symbols-rounded">edit</span>
                        </button>
                      </td>
                    </tr>`).join('') : `
                    <tr><td colspan="7" class="text-center" style="padding:40px;color:var(--text-muted)">
                      ${L('year.empty')}
                    </td></tr>`}
                </tbody>
              </table>
            </div>
          </div>

          <div class="card mt-3">
            <div class="card-header"><span><span class="material-symbols-rounded" style="vertical-align:middle;margin-right:6px">info</span>${L('year.sheet_info')}</span></div>
            <div class="card-body">
              <p style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:12px">
                ${L('year.sheet_desc')} <code style="background:var(--bg-primary);padding:2px 6px;border-radius:4px;font-family:monospace">academic_year</code>
              </p>
              <p style="font-size:0.85rem;color:var(--text-muted)">${L('year.col_required')}</p>
              <div class="table-wrapper mt-1">
                <table class="data-table" style="font-size:0.82rem">
                  <thead><tr><th>Column</th><th>${L('year.col_meaning')}</th><th>${L('year.col_example')}</th></tr></thead>
                  <tbody>
                    <tr><td><code>${L('header.year')}</code></td><td>${L('header.year')}</td><td>2026-2027</td></tr>
                    <tr><td><code>${L('year.start')}</code></td><td>${L('year.start')}</td><td>2026-06-01</td></tr>
                    <tr><td><code>${L('year.end')}</code></td><td>${L('year.end')}</td><td>2027-03-31</td></tr>
                    <tr><td><code>${L('year.status')}</code></td><td>${L('year.status')}</td><td>${L('year.active')} / ${L('year.end')}</td></tr>
                    <tr><td><code>${L('year.note')}</code></td><td>${L('year.note')}</td><td>(${L('common.cancel')})</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>`;
    },

    /* ── TEACHERS ────────────────────────── */
    async renderTeachers(container) {
      const selectedYear = localStorage.getItem('nt2_selected_year') || '';
      const teachers = await NT2.Data.fetchTeachersForYear(selectedYear);

      container.innerHTML = `
        <div class="page-container fade-in">
          <div class="page-header">
            <h2 class="page-title">${L('teach.title_full')} ${selectedYear ? `(${selectedYear})` : ''}</h2>
            <div class="page-actions">
              <div class="search-box">
                <span class="material-symbols-rounded">search</span>
                <input type="text" placeholder="${L('teach.search')}" id="teacherSearch">
              </div>
              <button class="btn btn-primary admin-only" onclick="NT2.App._addTeacherModal()">
                <span class="material-symbols-rounded">person_add</span>${L('teach.add')}
              </button>
              <a href="https://docs.google.com/spreadsheets/d/1ol57RaMofcBIAbWZ0ip3PP2B4FbhoZYXOkvxa6Ju3nc/edit" target="_blank" class="btn btn-secondary admin-only">
                <span class="material-symbols-rounded">edit_note</span>${L('common.edit')} Sheet
              </a>
            </div>
          </div>
          <div class="data-grid" id="teacherGrid">
            ${this._teacherCards(teachers)}
          </div>
        </div>`;

      document.getElementById('teacherSearch')?.addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        const currentList = NT2.Data.getTeachersForYear(selectedYear);
        const filtered = currentList.filter(t =>
          (t.nameLao + ' ' + (t.surnameLao||'') + ' ' + (t.nameEn||'') + ' ' + (t.position||'') + ' ' + (t.subject||'')).toLowerCase().includes(q)
        );
        document.getElementById('teacherGrid').innerHTML = this._teacherCards(filtered);
      });
    },

    _teacherCards(list) {
      if (!list || !list.length) return `<p style="text-align:center;color:var(--text-muted);padding:40px">${L('teach.empty')}</p>`;
      return list.map(t => {
        const displayName = t.nameLao || t.nameEn || '—';
        const displaySubName = (t.nameLao && t.nameEn) ? t.nameEn : '';
        const initialChar = initials(displayName);
        const escapedName = (displayName).replace(/'/g, "\\'");
        const escapedSub  = (t.position || t.subject || '').replace(/'/g, "\\'");

        return `
        <div class="person-card">
          <div class="person-avatar ${t.gender === 'F' ? 'female' : ''}" 
               title="${L('common.see_photo')}" 
               onclick="event.stopPropagation(); NT2.App.zoomImage('${t.photoUrl||''}', '${escapedName}', '${escapedSub}')">
            ${t.photoUrl && t.photoUrl.trim().startsWith('http')
              ? `<img src="${t.photoUrl.trim()}" onerror="this.parentElement.textContent='${initialChar}'" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`
              : initialChar}
          </div>
          <div class="person-info">
            <h3 class="person-name">${displayName}</h3>
            ${displaySubName ? `<div class="person-name-en">${displaySubName}</div>` : ''}
            ${t.position ? `<div class="person-detail" title="${L('common.position')}"><span class="material-symbols-rounded">badge</span>${t.position}</div>` : ''}
            ${t.subject ? `<div class="person-detail" title="${L('common.subject')}"><span class="material-symbols-rounded">menu_book</span>${t.subject}</div>` : ''}
            <div class="person-detail" title="${L('common.phone')}"><span class="material-symbols-rounded">call</span>${t.phone || '—'}</div>
            <div class="person-actions admin-only">
              <button class="edit-btn" title="${L('common.edit')}" onclick="NT2.App._editTeacherModal('${t.rowNum||''}','${(t.photoUrl||'').replace(/'/g,"\\'")}','${(t.nameLao||'').replace(/'/g,"\\'")}','${(t.nameEn||'').replace(/'/g,"\\'")}','${(t.position||'').replace(/'/g,"\\'")}','${(t.subject||'').replace(/'/g,"\\'")}','${(t.phone||'').replace(/'/g,"\\'")}')"><span class="material-symbols-rounded">edit</span> ${L('common.edit')}</button>
              <button class="delete-btn" title="${L('common.delete')}" onclick="NT2.App._deleteTeacher('${t.rowNum||''}','${(t.nameLao||'').replace(/'/g,"\\'")}','${(t.nameEn||'').replace(/'/g,"\\'")}')"><span class="material-symbols-rounded">delete</span> ${L('common.delete')}</button>
            </div>
          </div>
        </div>`;
      }).join('');
    },

    _addTeacherModal() {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay active dynamic-modal';
      overlay.innerHTML = `
        <div class="modal" style="max-width:500px">
          <div class="modal-header">
            <h3 class="modal-title"><span class="material-symbols-rounded">person_add</span> ${L('teach.add_title')}</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group"><label class="form-label">${L('common.photo_link')}</label><input type="text" class="form-input" id="addTPhoto" placeholder="https://..."></div>
            <div class="form-group"><label class="form-label">${L('common.name_lao_long')}</label><input type="text" class="form-input" id="addTNameLao" placeholder="${L('common.name_lao_long')}"></div>
            <div class="form-group"><label class="form-label">${L('common.name_en_long')}</label><input type="text" class="form-input" id="addTNameEn" placeholder="${L('common.name_en_long')}"></div>
            <div class="form-group"><label class="form-label">${L('common.position')}</label><input type="text" class="form-input" id="addTPosition" placeholder="${L('common.position')}"></div>
            <div class="form-group"><label class="form-label">${L('common.subject')}</label><input type="text" class="form-input" id="addTSubject" placeholder="${L('common.subject')}"></div>
            <div class="form-group"><label class="form-label">${L('common.phone')}</label><input type="text" class="form-input" id="addTPhone" placeholder="${L('common.phone')}"></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">${L('common.cancel')}</button>
            <button class="btn btn-primary" id="saveTeacherBtn">${L('common.save_sheet')}</button>
          </div>
        </div>`;

      overlay.querySelector('#saveTeacherBtn').onclick = async () => {
        const photoUrl = overlay.querySelector('#addTPhoto').value.trim();
        const nameLao  = overlay.querySelector('#addTNameLao').value.trim();
        const nameEn   = overlay.querySelector('#addTNameEn').value.trim();
        const position = overlay.querySelector('#addTPosition').value.trim();
        const subject  = overlay.querySelector('#addTSubject').value.trim();
        const phone    = overlay.querySelector('#addTPhone').value.trim();

        if (!nameLao && !nameEn) { showToast(L('toast.enter_teacher_name'), 'error'); return; }

        showToast(L('toast.saving'), 'info');
        const selectedYear = localStorage.getItem('nt2_selected_year') || '';
        const ok = await NT2.Data.addTeacher(selectedYear, { photoUrl, nameLao, nameEn, position, subject, phone });
        if (ok) {
          showToast(L('toast.added_teacher'), 'success');
          overlay.remove();
          this.loadPage('teachers');
        } else {
          showToast(L('toast.save_error'), 'error');
        }
      };

      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
      document.body.appendChild(overlay);
    },

    _editTeacherModal(rowNum, photoUrl, nameLao, nameEn, position, subject, phone) {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay active dynamic-modal';
      overlay.innerHTML = `
        <div class="modal" style="max-width:500px">
          <div class="modal-header">
            <h3 class="modal-title"><span class="material-symbols-rounded">edit</span> ${L('teach.edit_title')}</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group"><label class="form-label">${L('common.photo_link')}</label><input type="text" class="form-input" id="editTPhoto" value="${photoUrl}"></div>
            <div class="form-group"><label class="form-label">${L('common.name_lao_long')}</label><input type="text" class="form-input" id="editTNameLao" value="${nameLao}"></div>
            <div class="form-group"><label class="form-label">${L('common.name_en_long')}</label><input type="text" class="form-input" id="editTNameEn" value="${nameEn}"></div>
            <div class="form-group"><label class="form-label">${L('common.position')}</label><input type="text" class="form-input" id="editTPosition" value="${position}"></div>
            <div class="form-group"><label class="form-label">${L('common.subject')}</label><input type="text" class="form-input" id="editTSubject" value="${subject}"></div>
            <div class="form-group"><label class="form-label">${L('common.phone')}</label><input type="text" class="form-input" id="editTPhone" value="${phone}"></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">${L('common.cancel')}</button>
            <button class="btn btn-primary" id="updateTeacherBtn">${L('common.save_edit')}</button>
          </div>
        </div>`;

      overlay.querySelector('#updateTeacherBtn').onclick = async () => {
        const photoVal    = overlay.querySelector('#editTPhoto').value.trim();
        const nameLaoVal  = overlay.querySelector('#editTNameLao').value.trim();
        const nameEnVal   = overlay.querySelector('#editTNameEn').value.trim();
        const positionVal = overlay.querySelector('#editTPosition').value.trim();
        const subjectVal  = overlay.querySelector('#editTSubject').value.trim();
        const phoneVal    = overlay.querySelector('#editTPhone').value.trim();

        if (!nameLaoVal && !nameEnVal) { showToast(L('toast.enter_teacher_name'), 'error'); return; }

        showToast(L('toast.updating'), 'info');
        const selectedYear = localStorage.getItem('nt2_selected_year') || '';
        const ok = await NT2.Data.updateTeacher(selectedYear, { rowNum, photoUrl: photoVal, nameLao: nameLaoVal, nameEn: nameEnVal, position: positionVal, subject: subjectVal, phone: phoneVal });
        if (ok) {
          showToast(L('toast.updated_teacher'), 'success');
          overlay.remove();
          this.loadPage('teachers');
        } else {
          showToast(L('toast.save_error'), 'error');
        }
      };

      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
      document.body.appendChild(overlay);
    },

    async _deleteTeacher(rowNum, nameLao, nameEn) {
      const name = nameLao || nameEn || '';
      if (!confirm(`${L('confirm.delete')} "${name}" ${L('confirm.q')}`)) return;
      showToast(L('toast.deleting_data'), 'info');
      const selectedYear = localStorage.getItem('nt2_selected_year') || '';
      const ok = await NT2.Data.deleteTeacher(selectedYear, { rowNum, nameLao, nameEn });
      if (ok) {
        showToast(L('toast.deleted_teacher'), 'success');
        this.loadPage('teachers');
      } else {
        showToast(L('toast.save_error'), 'error');
      }
    },

    /* ── STUDENTS ────────────────────────── */
    async renderStudents(container) {
      const selectedYear = localStorage.getItem('nt2_selected_year') || '';
      const students = await NT2.Data.fetchStudentsForYear(selectedYear);
      const classes  = NT2.Data.getAllClasses();

      container.innerHTML = `
        <div class="page-container fade-in">
          <div class="page-header">
            <h2 class="page-title">${L('stu.title_full')} ${selectedYear ? `(${selectedYear})` : ''}</h2>
            <div class="page-actions">
              <div class="search-box">
                <span class="material-symbols-rounded">search</span>
                <input type="text" placeholder="${L('stu.search')}" id="studentSearch">
              </div>
              <select class="form-select" id="classFilter" style="width:150px">
                <option value="all">${L('common.all_class')}</option>
                <optgroup label="${L('score.kinder')}">
                  ${classes.filter(c=>c.level==='kindergarten').map(c=>`<option value="${c.name}">${c.fullName}</option>`).join('')}
                </optgroup>
                <optgroup label="${L('score.primary')}">
                  ${classes.filter(c=>c.level==='primary').map(c=>`<option value="${c.name}">${c.fullName}</option>`).join('')}
                </optgroup>
                <optgroup label="${L('score.secondary')}">
                  ${classes.filter(c=>c.level==='secondary').map(c=>`<option value="${c.name}">${c.fullName}</option>`).join('')}
                </optgroup>
              </select>
              <button class="btn btn-primary admin-only" onclick="NT2.App._addStudentModal()">
                <span class="material-symbols-rounded">person_add</span>${L('stu.add')}
              </button>
              <a href="https://docs.google.com/spreadsheets/d/1ol57RaMofcBIAbWZ0ip3PP2B4FbhoZYXOkvxa6Ju3nc/edit" target="_blank" class="btn btn-secondary admin-only">
                <span class="material-symbols-rounded">edit_note</span>${L('common.edit')} Sheet
              </a>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <span id="studentCount">${L('stu.total_label')}: <strong>${students.length}</strong> ${L('stu.total_unit')}</span>
            </div>
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>${L('common.photo')}</th>
                    <th>${L('common.name_lao_th')}</th>
                    <th>${L('common.name_en_th')}</th>
                    <th>${L('common.class_room')}</th>
                    <th class="admin-only">${L('common.manage')}</th>
                  </tr>
                </thead>
                <tbody id="studentBody">
                  ${this._studentRows(students)}
                </tbody>
              </table>
            </div>
          </div>
        </div>`;

      const filterFn = () => {
        const q   = (document.getElementById('studentSearch')?.value || '').toLowerCase();
        const cls = document.getElementById('classFilter')?.value || 'all';
        const currentList = NT2.Data.getStudentsForYear(selectedYear);
        const filtered = currentList.filter(s =>
          (cls === 'all' || s.className === cls || (s.className && s.className.includes(cls))) &&
          (q === '' || (s.nameLao + ' ' + (s.nameEn||'') + ' ' + (s.className||'')).toLowerCase().includes(q))
        );
        document.getElementById('studentBody').innerHTML   = this._studentRows(filtered);
        document.getElementById('studentCount').innerHTML  = `${L('stu.total_label')}: <strong>${filtered.length}</strong> ${L('stu.total_unit')}`;
      };

      document.getElementById('studentSearch')?.addEventListener('input',  filterFn);
      document.getElementById('classFilter')?.addEventListener('change',   filterFn);
    },

    _studentRows(list) {
      if (!list || !list.length) return `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-muted)">${L('stu.empty')}</td></tr>`;
      return list.map((s, i) => {
        const displayName = s.nameLao || s.nameEn || '—';
        const initialChar = initials(displayName);
        const escapedName = displayName.replace(/'/g, "\\'");
        const escapedSub  = (s.className ? L('common.room') + ' ' + s.className : '').replace(/'/g, "\\'");

        return `
        <tr>
          <td style="color:var(--text-muted)">${i + 1}</td>
          <td>
            <div class="person-avatar" style="width:36px;height:36px;font-size:0.9rem"
                 title="${L('common.see_photo')}"
                 onclick="event.stopPropagation(); NT2.App.zoomImage('${s.photoUrl||''}', '${escapedName}', '${escapedSub}')">
              ${s.photoUrl && s.photoUrl.trim().startsWith('http')
                ? `<img src="${s.photoUrl.trim()}" onerror="this.parentElement.textContent='${initialChar}'" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`
                : initialChar}
            </div>
          </td>
          <td style="font-weight:500">${displayName}</td>
          <td style="color:var(--text-secondary);font-size:0.82rem;font-family:'Inter'">${s.nameEn || '—'}</td>
          <td><span class="chip" style="pointer-events:none">${s.className || '—'}</span></td>
          <td class="admin-only">
            <button class="edit-btn" title="${L('common.edit')}" onclick="NT2.App._editStudentModal('${s.rowNum||''}','${(s.photoUrl||'').replace(/'/g,"\\'")}','${(s.nameLao||'').replace(/'/g,"\\'")}','${(s.nameEn||'').replace(/'/g,"\\'")}','${(s.className||'').replace(/'/g,"\\'")}')"><span class="material-symbols-rounded">edit</span> ${L('common.edit')}</button>
            <button class="delete-btn" title="${L('common.delete')}" onclick="NT2.App._deleteStudent('${s.rowNum||''}','${(s.nameLao||'').replace(/'/g,"\\'")}','${(s.nameEn||'').replace(/'/g,"\\'")}')"><span class="material-symbols-rounded">delete</span> ${L('common.delete')}</button>
          </td>
        </tr>`;
      }).join('');
    },

    _addStudentModal() {
      const classes = NT2.Data.getAllClasses();
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay active dynamic-modal';
      overlay.innerHTML = `
        <div class="modal" style="max-width:500px">
          <div class="modal-header">
            <h3 class="modal-title"><span class="material-symbols-rounded">person_add</span> ${L('stu.add_title')}</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group"><label class="form-label">${L('common.photo_link')}</label><input type="text" class="form-input" id="addSPhoto" placeholder="https://..."></div>
            <div class="form-group"><label class="form-label">${L('common.name_lao_long')}</label><input type="text" class="form-input" id="addSNameLao" placeholder="${L('common.name_lao_long')}"></div>
            <div class="form-group"><label class="form-label">${L('common.name_en_long')}</label><input type="text" class="form-input" id="addSNameEn" placeholder="${L('common.name_en_long')}"></div>
            <div class="form-group">
              <label class="form-label">${L('common.class_room')}</label>
              <select class="form-select" id="addSClass">
                <optgroup label="${L('score.kinder')}">
                  ${classes.filter(c=>c.level==='kindergarten').map(c=>`<option value="${c.name}">${c.fullName}</option>`).join('')}
                </optgroup>
                <optgroup label="${L('score.primary')}">
                  ${classes.filter(c=>c.level==='primary').map(c=>`<option value="${c.name}">${c.fullName}</option>`).join('')}
                </optgroup>
                <optgroup label="${L('score.secondary')}">
                  ${classes.filter(c=>c.level==='secondary').map(c=>`<option value="${c.name}">${c.fullName}</option>`).join('')}
                </optgroup>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">${L('common.cancel')}</button>
            <button class="btn btn-primary" id="saveStudentBtn">${L('common.save_sheet')}</button>
          </div>
        </div>`;

      overlay.querySelector('#saveStudentBtn').onclick = async () => {
        const photoUrl  = overlay.querySelector('#addSPhoto').value.trim();
        const nameLao   = overlay.querySelector('#addSNameLao').value.trim();
        const nameEn    = overlay.querySelector('#addSNameEn').value.trim();
        const className = overlay.querySelector('#addSClass').value;

        if (!nameLao && !nameEn) { showToast(L('toast.enter_student_name'), 'error'); return; }

        showToast(L('toast.saving'), 'info');
        const selectedYear = localStorage.getItem('nt2_selected_year') || '';
        const ok = await NT2.Data.addStudent(selectedYear, { photoUrl, nameLao, nameEn, className });
        if (ok) {
          showToast(L('toast.added_student'), 'success');
          overlay.remove();
          this.loadPage('students');
        } else {
          showToast(L('toast.save_error'), 'error');
        }
      };

      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
      document.body.appendChild(overlay);
    },

    _editStudentModal(rowNum, photoUrl, nameLao, nameEn, className) {
      const classes = NT2.Data.getAllClasses();
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay active dynamic-modal';
      overlay.innerHTML = `
        <div class="modal" style="max-width:500px">
          <div class="modal-header">
            <h3 class="modal-title"><span class="material-symbols-rounded">edit</span> ${L('stu.edit_title')}</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group"><label class="form-label">${L('common.photo_link')}</label><input type="text" class="form-input" id="editSPhoto" value="${photoUrl}"></div>
            <div class="form-group"><label class="form-label">${L('common.name_lao_long')}</label><input type="text" class="form-input" id="editSNameLao" value="${nameLao}"></div>
            <div class="form-group"><label class="form-label">${L('common.name_en_long')}</label><input type="text" class="form-input" id="editSNameEn" value="${nameEn}"></div>
            <div class="form-group">
              <label class="form-label">${L('common.class_room')}</label>
              <select class="form-select" id="editSClass">
                <optgroup label="${L('score.kinder')}">
                  ${classes.filter(c=>c.level==='kindergarten').map(c=>`<option value="${c.name}" ${className === c.name ? 'selected' : ''}>${c.fullName}</option>`).join('')}
                </optgroup>
                <optgroup label="${L('score.primary')}">
                  ${classes.filter(c=>c.level==='primary').map(c=>`<option value="${c.name}" ${className === c.name ? 'selected' : ''}>${c.fullName}</option>`).join('')}
                </optgroup>
                <optgroup label="${L('score.secondary')}">
                  ${classes.filter(c=>c.level==='secondary').map(c=>`<option value="${c.name}" ${className === c.name ? 'selected' : ''}>${c.fullName}</option>`).join('')}
                </optgroup>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">${L('common.cancel')}</button>
            <button class="btn btn-primary" id="updateStudentBtn">${L('common.save_edit')}</button>
          </div>
        </div>`;

      overlay.querySelector('#updateStudentBtn').onclick = async () => {
        const photoVal     = overlay.querySelector('#editSPhoto').value.trim();
        const nameLaoVal   = overlay.querySelector('#editSNameLao').value.trim();
        const nameEnVal    = overlay.querySelector('#editSNameEn').value.trim();
        const classNameVal = overlay.querySelector('#editSClass').value;

        if (!nameLaoVal && !nameEnVal) { showToast(L('toast.enter_student_name'), 'error'); return; }

        showToast(L('toast.updating'), 'info');
        const selectedYear = localStorage.getItem('nt2_selected_year') || '';
        const ok = await NT2.Data.updateStudent(selectedYear, { rowNum, photoUrl: photoVal, nameLao: nameLaoVal, nameEn: nameEnVal, className: classNameVal });
        if (ok) {
          showToast(L('toast.updated_student'), 'success');
          overlay.remove();
          this.loadPage('students');
        } else {
          showToast(L('toast.save_error'), 'error');
        }
      };

      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
      document.body.appendChild(overlay);
    },

    async _deleteStudent(rowNum, nameLao, nameEn) {
      const name = nameLao || nameEn || '';
      if (!confirm(`${L('confirm.delete')} "${name}" ${L('confirm.q')}`)) return;
      showToast(L('toast.deleting_data'), 'info');
      const selectedYear = localStorage.getItem('nt2_selected_year') || '';
      const ok = await NT2.Data.deleteStudent(selectedYear, { rowNum, nameLao, nameEn });
      if (ok) {
        showToast(L('toast.deleted_student'), 'success');
        this.loadPage('students');
      } else {
        showToast(L('toast.save_error'), 'error');
      }
    },

    /* ── SCORES ──────────────────────────── */
    async renderScores(container) {
      const selectedYear = localStorage.getItem('nt2_selected_year') || '';
      const links = await NT2.Data.fetchScoreLinksForYear(selectedYear);

      const classGroups = [
        {
          label: L('score.kinder'),
          icon: 'child_care',
          items: [
            { code: 'ອ1', name: `${L('score.kinder')} 1`, url: links['ອ1'] || '#' },
            { code: 'ອ2', name: `${L('score.kinder')} 2`, url: links['ອ2'] || '#' },
            { code: 'ອ3', name: `${L('score.kinder')} 3`, url: links['ອ3'] || '#' }
          ]
        },
        {
          label: L('score.primary'),
          icon: 'menu_book',
          items: [
            { code: 'ປ1', name: `${L('score.primary')} 1`, url: links['ປ1'] || '#' },
            { code: 'ປ2', name: `${L('score.primary')} 2`, url: links['ປ2'] || '#' },
            { code: 'ປ3', name: `${L('score.primary')} 3`, url: links['ປ3'] || '#' },
            { code: 'ປ4', name: `${L('score.primary')} 4`, url: links['ປ4'] || '#' },
            { code: 'ປ5', name: `${L('score.primary')} 5`, url: links['ປ5'] || '#' }
          ]
        },
        {
          label: L('score.secondary'),
          icon: 'school',
          items: [
            { code: 'ມ1', name: `${L('score.secondary')} 1`, url: links['ມ1'] || '#' },
            { code: 'ມ2', name: `${L('score.secondary')} 2`, url: links['ມ2'] || '#' },
            { code: 'ມ3', name: `${L('score.secondary')} 3`, url: links['ມ3'] || '#' },
            { code: 'ມ4', name: `${L('score.secondary')} 4`, url: links['ມ4'] || '#' },
            { code: 'ມ5', name: `${L('score.secondary')} 5`, url: links['ມ5'] || '#' },
            { code: 'ມ6', name: `${L('score.secondary')} 6`, url: links['ມ6'] || '#' },
            { code: 'ມ7', name: `${L('score.secondary')} 7`, url: links['ມ7'] || '#' }
          ]
        }
      ];

      const renderGroup = group => `
        <div class="scores-section">
          <h3 class="scores-section-title">
            <span class="material-symbols-rounded">${group.icon}</span>${group.label}
          </h3>
          <div class="scores-grid">
            ${group.items.map(item => {
              const hasUrl = item.url && item.url !== '#' && item.url.trim().startsWith('http');
              const finalUrl = hasUrl ? item.url.trim() : '#';
              return `
                <a href="${finalUrl}" target="${hasUrl ? '_blank' : '_self'}" class="score-btn"
                   ${!hasUrl ? 'onclick="event.preventDefault();NT2.App._noLink()"' : ''}>
                  <span class="class-label">${item.name}</span>
                  <span class="view-label">${hasUrl ? L('score.view') : L('score.noLink')}</span>
                </a>`;
            }).join('')}
          </div>
        </div>`;

      const rulesUrl = links['rules'] || '#';
      const hasRulesUrl = rulesUrl && rulesUrl !== '#' && rulesUrl.trim().startsWith('http');

      container.innerHTML = `
        <div class="page-container fade-in">
          <div class="page-header">
            <h2 class="page-title">${L('score.title_full')} ${selectedYear ? `(${selectedYear})` : ''}</h2>
            <div class="page-actions">
              ${hasRulesUrl ? `
                <a href="${rulesUrl.trim()}" target="_blank" class="btn btn-warning">
                  <span class="material-symbols-rounded">rule</span>${L('score.rules')}
                </a>` : `
                <button class="btn btn-warning" onclick="NT2.App._showGradingRules()">
                  <span class="material-symbols-rounded">rule</span>${L('score.rules')}
                </button>`}
              <a href="https://docs.google.com/spreadsheets/d/1ol57RaMofcBIAbWZ0ip3PP2B4FbhoZYXOkvxa6Ju3nc/edit" target="_blank" class="btn btn-secondary admin-only">
                <span class="material-symbols-rounded">edit_note</span>${L('score.edit_links')}
              </a>
            </div>
          </div>
          ${classGroups.map(renderGroup).join('')}
        </div>`;
    },

    /* ── ATTENDANCE ───────────────────────── */
    async renderAttendance(container) {
      const selectedYear = localStorage.getItem('nt2_selected_year') || '';
      const links = await NT2.Data.fetchAttendanceLinksForYear(selectedYear);

      const classGroups = [
        {
          label: L('score.kinder'),
          icon: 'child_care',
          items: [
            { code: 'ອ1', name: `${L('score.kinder')} 1`, url: links['ອ1'] || '#' },
            { code: 'ອ2', name: `${L('score.kinder')} 2`, url: links['ອ2'] || '#' },
            { code: 'ອ3', name: `${L('score.kinder')} 3`, url: links['ອ3'] || '#' }
          ]
        },
        {
          label: L('score.primary'),
          icon: 'menu_book',
          items: [
            { code: 'ປ1', name: `${L('score.primary')} 1`, url: links['ປ1'] || '#' },
            { code: 'ປ2', name: `${L('score.primary')} 2`, url: links['ປ2'] || '#' },
            { code: 'ປ3', name: `${L('score.primary')} 3`, url: links['ປ3'] || '#' },
            { code: 'ປ4', name: `${L('score.primary')} 4`, url: links['ປ4'] || '#' },
            { code: 'ປ5', name: `${L('score.primary')} 5`, url: links['ປ5'] || '#' }
          ]
        },
        {
          label: L('score.secondary'),
          icon: 'school',
          items: [
            { code: 'ມ1', name: `${L('score.secondary')} 1`, url: links['ມ1'] || '#' },
            { code: 'ມ2', name: `${L('score.secondary')} 2`, url: links['ມ2'] || '#' },
            { code: 'ມ3', name: `${L('score.secondary')} 3`, url: links['ມ3'] || '#' },
            { code: 'ມ4', name: `${L('score.secondary')} 4`, url: links['ມ4'] || '#' },
            { code: 'ມ5', name: `${L('score.secondary')} 5`, url: links['ມ5'] || '#' },
            { code: 'ມ6', name: `${L('score.secondary')} 6`, url: links['ມ6'] || '#' },
            { code: 'ມ7', name: `${L('score.secondary')} 7`, url: links['ມ7'] || '#' }
          ]
        }
      ];

      const renderGroup = group => `
        <div class="scores-section">
          <h3 class="scores-section-title">
            <span class="material-symbols-rounded">${group.icon}</span>${group.label}
          </h3>
          <div class="scores-grid">
            ${group.items.map(item => {
              const hasUrl = item.url && item.url !== '#' && item.url.trim().startsWith('http');
              const finalUrl = hasUrl ? item.url.trim() : '#';
              return `
                <a href="${finalUrl}" target="${hasUrl ? '_blank' : '_self'}" class="score-btn"
                   ${!hasUrl ? 'onclick="event.preventDefault();NT2.App._noAttendanceLink()"' : ''}>
                  <span class="class-label">${item.name}</span>
                  <span class="view-label">${hasUrl ? L('att.view') : L('att.noLink')}</span>
                </a>`;
            }).join('')}
          </div>
        </div>`;

      container.innerHTML = `
        <div class="page-container fade-in">
          <div class="page-header">
            <h2 class="page-title">${L('att.title_full')} ${selectedYear ? `(${selectedYear})` : ''}</h2>
            <div class="page-actions">
              <a href="https://docs.google.com/spreadsheets/d/1ol57RaMofcBIAbWZ0ip3PP2B4FbhoZYXOkvxa6Ju3nc/edit" target="_blank" class="btn btn-secondary admin-only">
                <span class="material-symbols-rounded">edit_note</span>${L('att.edit_links')}
              </a>
            </div>
          </div>
          ${classGroups.map(renderGroup).join('')}
        </div>`;
    },

    _noAttendanceLink() { showToast(L('noLink.attendance'), 'info'); },

    _noLink() { showToast(L('noLink.scores'), 'info'); },

    _showGradingRules() {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay active dynamic-modal';
      overlay.innerHTML = `
        <div class="modal" style="max-width:560px">
          <div class="modal-header">
            <h3 class="modal-title"><span class="material-symbols-rounded">rule</span> ${L('rules.title')}</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="grading-rules">
              <table style="width:100%;border-collapse:collapse">
                <thead>
                  <tr>
                    <th style="background:var(--accent-primary);color:#fff;padding:10px;text-align:center">${L('rules.level')}</th>
                    <th style="background:var(--accent-primary);color:#fff;padding:10px;text-align:center">${L('rules.score')}</th>
                    <th style="background:var(--accent-primary);color:#fff;padding:10px;text-align:center">${L('rules.meaning')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${[
                    [L('rules.excellent'), '90-100', '🏆 ' + L('rules.excellent_m')],
                    [L('rules.good'),     '80-89',  '✅ ' + L('rules.good_m')],
                    [L('rules.average'),  '70-79',  '✅ ' + L('rules.average_m')],
                    [L('rules.weak'),     '60-69',  '⚠️ ' + L('rules.weak_m')],
                    [L('rules.fail'),     '0-59',   '❌ ' + L('rules.fail_m')],
                  ].map(([g, s, r], i) => `
                    <tr style="background:${i%2?'var(--bg-primary)':'var(--bg-card)'}">
                      <td style="padding:10px;text-align:center;font-weight:600">${g}</td>
                      <td style="padding:10px;text-align:center">${s}</td>
                      <td style="padding:10px;text-align:center">${r}</td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer"><button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">${L('common.close')}</button></div>
        </div>`;
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
      document.body.appendChild(overlay);
    },

    /* ── SCHEDULE ────────────────────────── */
    async renderSchedule(container) {
      const selectedYear = localStorage.getItem('nt2_selected_year') || '';
      const sched = await NT2.Data.fetchScheduleForYear(selectedYear);
      const study = sched.studySchedule || [];
      const teach = sched.teachingSchedule || [];

      const tableHTML = rows => {
        const cleanRows = (rows || []).filter(r => {
          if (!r) return false;
          const time = (r.time || '').trim();
          const mon  = (r.mon  || '').trim();
          if (time === 'ເວລາ' || mon === 'ວັນຈັນ') return false;
          return true;
        });

        if (!cleanRows.length) {
          return `<div style="text-align:center;padding:30px;color:var(--text-muted)">${L('sched.empty')}</div>`;
        }
        return `
        <div class="table-wrapper">
          <table class="schedule-table">
            <tbody>
              ${cleanRows.map(r => `
                <tr class="${r.isBreak ? 'break-row' : ''}">
                  <td class="time-col">${r.time || '—'}</td>
                  ${r.isBreak
                    ? `<td colspan="5" style="text-align:center">${r.mon || L('sched.break')}</td>`
                    : `<td>${r.mon || '—'}</td><td>${r.tue || '—'}</td><td>${r.wed || '—'}</td><td>${r.thu || '—'}</td><td>${r.fri || '—'}</td>`}
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
      };

      container.innerHTML = `
        <div class="page-container fade-in">
          <div class="page-header">
            <h2 class="page-title">${L('sched.title_full')} ${selectedYear ? `(${selectedYear})` : ''}</h2>
            <a href="https://docs.google.com/spreadsheets/d/1ol57RaMofcBIAbWZ0ip3PP2B4FbhoZYXOkvxa6Ju3nc/edit" target="_blank" class="btn btn-secondary admin-only">
              <span class="material-symbols-rounded">edit_note</span>${L('common.edit')} Sheet
            </a>
          </div>
          <div class="tabs-container">
            <div class="tabs-header">
              <button class="tab-btn active" data-tab="study">${L('sched.study')}</button>
              <button class="tab-btn" data-tab="teach">${L('sched.teach')}</button>
            </div>
            <div class="tab-panel active" id="tab-study">${tableHTML(study)}</div>
            <div class="tab-panel"        id="tab-teach">${tableHTML(teach)}</div>
          </div>
        </div>`;

      container.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          container.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
          btn.classList.add('active');
          document.getElementById(`tab-${btn.dataset.tab}`)?.classList.add('active');
        });
      });
    },

    /* ── CLASSES ─────────────────────────── */
    async renderClasses(container) {
      const selectedYear = localStorage.getItem('nt2_selected_year') || '';
      const students = await NT2.Data.fetchStudentsForYear(selectedYear);
      const all = NT2.Data.getAllClasses();
      const kindergarten = all.filter(c => c.level === 'kindergarten');
      const primary      = all.filter(c => c.level === 'primary');
      const secondary    = all.filter(c => c.level === 'secondary');

      const getClassCount = code => {
        return students.filter(s => s.className === code || (s.className && s.className.includes(code))).length;
      };

      const section = (label, icon, iconClass, items) => `
        <div class="level-section">
          <h3 class="level-header">
            <span class="material-symbols-rounded">${icon}</span>${label}
          </h3>
          <div class="level-grid">
            ${items.map(c => {
              const count = getClassCount(c.name);
              return `
                <div class="class-card" onclick="NT2.App._showClassStudents('${c.name}','${c.fullName}')">
                  <div class="class-icon ${iconClass}">
                    <span class="material-symbols-rounded">${icon}</span>
                  </div>
                  <div class="class-name">${c.fullName}</div>
                  <div class="class-count">${L('class.students')} ${count} ${L('class.unit')}</div>
                </div>`;
            }).join('')}
          </div>
        </div>`;

      container.innerHTML = `
        <div class="page-container fade-in">
          <div class="page-header">
            <h2 class="page-title">${L('class.title_full')} ${selectedYear ? `(${selectedYear})` : ''}</h2>
          </div>
          <div class="levels-container">
            ${section(L('class.kinder'), 'child_care', 'kindergarten', kindergarten)}
            ${section(L('class.primary'),   'menu_book',  'primary',      primary)}
            ${section(L('class.secondary'),'school',     'secondary',    secondary)}
          </div>
        </div>`;
    },

    async _showClassStudents(cls, fullName) {
      const selectedYear = localStorage.getItem('nt2_selected_year') || '';
      const allStudents = await NT2.Data.fetchStudentsForYear(selectedYear);
      const list = allStudents.filter(s => s.className === cls || (s.className && s.className.includes(cls)));

      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay active dynamic-modal';
      overlay.innerHTML = `
        <div class="modal" style="max-width:620px">
          <div class="modal-header">
            <h3 class="modal-title"><span class="material-symbols-rounded">groups</span> ${L('class.modal_title')} ${fullName} ${selectedYear ? `(${selectedYear})` : ''} — (${list.length} ${L('class.unit')})</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <div class="modal-body" style="max-height:70vh;overflow-y:auto">
            ${list.length ? `
              <div class="table-wrapper">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>${L('common.photo')}</th>
                      <th>${L('common.name_lao_th')}</th>
                      <th>${L('common.name_en_th')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${list.map((s, i) => {
                      const displayName = s.nameLao || s.nameEn || '—';
                      const initialChar = initials(displayName);
                      const escapedName = displayName.replace(/'/g, "\\'");
                      const escapedSub  = (fullName || '').replace(/'/g, "\\'");

                      return `
                      <tr>
                        <td style="color:var(--text-muted)">${i + 1}</td>
                        <td>
                          <div class="person-avatar" style="width:32px;height:32px;font-size:0.8rem;cursor:pointer"
                               title="${L('common.see_photo')}"
                               onclick="event.stopPropagation(); NT2.App.zoomImage('${s.photoUrl||''}', '${escapedName}', '${escapedSub}')">
                            ${s.photoUrl && s.photoUrl.trim().startsWith('http')
                              ? `<img src="${s.photoUrl.trim()}" onerror="this.parentElement.textContent='${initialChar}'" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`
                              : initialChar}
                          </div>
                        </td>
                        <td style="font-weight:500">${displayName}</td>
                        <td style="font-size:0.82rem;color:var(--text-secondary);font-family:'Inter'">${s.nameEn || '—'}</td>
                      </tr>`;
                    }).join('')}
                  </tbody>
                </table>
              </div>` : `<p style="text-align:center;padding:40px;color:var(--text-muted)">${L('class.empty')}</p>`}
          </div>
          <div class="modal-footer"><button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">${L('common.close')}</button></div>
        </div>`;
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
      document.body.appendChild(overlay);
    }
  };

  /* ─────────────────────────────────────────
     BOOT
  ───────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => NT2.App.init());
})();
