(function() {
  const NT2 = window.NT2 = window.NT2 || {};
  NT2.Pages = NT2.Pages || {};
  
  NT2.Pages.dashboard = {
    render(container) {
      container.innerHTML = '';
      const div = document.createElement('div');
      div.className = 'page-container fade-in';
      
      const students = NT2.Data.getStudents();
      const teachers = NT2.Data.getTeachers();
      const classCount = NT2.Data.getClassCount();
      const announcements = NT2.Data.getAnnouncements();
      const activities = NT2.Data.getActivities();
      
      const urgentAnnouncements = announcements.filter(a => a.type === 'urgent');
      const normalAnnouncements = announcements.filter(a => a.type === 'normal');

      div.innerHTML = `
        <div class="page-header">
          <h2 class="page-title">ພາບລວມ</h2>
        </div>
        
        <div class="stats-grid mb-4">
          <div class="stat-card blue">
            <div class="stat-icon blue"><span class="material-symbols-rounded">groups</span></div>
            <div class="stat-info">
              <div class="stat-value" data-target="${students.length}">0</div>
              <div class="stat-label">ຈຳນວນນັກຮຽນ</div>
            </div>
          </div>
          <div class="stat-card gold">
            <div class="stat-icon gold"><span class="material-symbols-rounded">school</span></div>
            <div class="stat-info">
              <div class="stat-value" data-target="${teachers.length}">0</div>
              <div class="stat-label">ຈຳນວນຄູອາຈານ</div>
            </div>
          </div>
          <div class="stat-card green">
            <div class="stat-icon green"><span class="material-symbols-rounded">class</span></div>
            <div class="stat-info">
              <div class="stat-value" data-target="${classCount}">0</div>
              <div class="stat-label">ຈຳນວນຊັ້ນຮຽນ</div>
            </div>
          </div>
          <div class="stat-card red">
            <div class="stat-icon red"><span class="material-symbols-rounded">campaign</span></div>
            <div class="stat-info">
              <div class="stat-value" data-target="${announcements.length}">0</div>
              <div class="stat-label">ແຈ້ງການ</div>
            </div>
          </div>
        </div>
        
        <div class="announcements-section grid-2 mb-4 gap-2">
          <div class="card glass-card">
            <div class="card-header">
              <h3>ແຈ້ງການດ່ວນ</h3>
            </div>
            <div class="card-body">
              <div class="announcement-list">
                ${urgentAnnouncements.map(a => `
                  <div class="announcement-item urgent slide-up">
                    <div class="flex-between mb-1">
                      <div class="flex gap-1 flex-center">
                        <span class="announcement-badge" style="background:var(--error, red);color:white;padding:2px 6px;border-radius:4px;font-size:0.8em">ດ່ວນ</span>
                        <h4 class="announcement-title m-0">${a.title}</h4>
                      </div>
                      <div class="flex gap-1 flex-center">
                        <span class="announcement-date text-muted" style="font-size:0.8em">${NT2.App.formatDate(a.date)}</span>
                        <div class="admin-only hidden">
                          <button class="btn btn-icon btn-sm edit-btn"><span class="material-symbols-rounded" style="font-size:18px">edit</span></button>
                          <button class="btn btn-icon btn-sm delete-btn btn-danger"><span class="material-symbols-rounded" style="font-size:18px">delete</span></button>
                        </div>
                      </div>
                    </div>
                    <div class="announcement-content text-muted" style="font-size:0.9em">${a.content}</div>
                  </div>
                `).join('')}
                ${urgentAnnouncements.length === 0 ? '<div class="text-center text-muted py-2">ບໍ່ມີແຈ້ງການດ່ວນ</div>' : ''}
              </div>
            </div>
          </div>
          
          <div class="card glass-card">
            <div class="card-header">
              <h3>ແຈ້ງການທຳມະດາ</h3>
            </div>
            <div class="card-body">
              <div class="announcement-list">
                ${normalAnnouncements.map(a => `
                  <div class="announcement-item normal slide-up">
                    <div class="flex-between mb-1">
                      <div class="flex gap-1 flex-center">
                        <span class="announcement-badge" style="background:var(--primary, blue);color:white;padding:2px 6px;border-radius:4px;font-size:0.8em">ທົ່ວໄປ</span>
                        <h4 class="announcement-title m-0">${a.title}</h4>
                      </div>
                      <div class="flex gap-1 flex-center">
                        <span class="announcement-date text-muted" style="font-size:0.8em">${NT2.App.formatDate(a.date)}</span>
                        <div class="admin-only hidden">
                          <button class="btn btn-icon btn-sm edit-btn"><span class="material-symbols-rounded" style="font-size:18px">edit</span></button>
                          <button class="btn btn-icon btn-sm delete-btn btn-danger"><span class="material-symbols-rounded" style="font-size:18px">delete</span></button>
                        </div>
                      </div>
                    </div>
                    <div class="announcement-content text-muted" style="font-size:0.9em">${a.content}</div>
                  </div>
                `).join('')}
                ${normalAnnouncements.length === 0 ? '<div class="text-center text-muted py-2">ບໍ່ມີແຈ້ງການທຳມະດາ</div>' : ''}
              </div>
            </div>
          </div>
        </div>
        
        <div class="card glass-card">
          <div class="card-header">
            <h3>ການເຄື່ອນໄຫວ 1 ເດືອນຜ່ານມາ</h3>
          </div>
          <div class="card-body">
            <div class="timeline">
              ${activities.map((act, index) => `
                <div class="timeline-item slide-up flex gap-2 mb-2" style="animation-delay: ${index * 0.1}s">
                  <div class="timeline-dot" style="width:12px;height:12px;background:var(--primary);border-radius:50%;margin-top:6px"></div>
                  <div class="timeline-content flex-1">
                    <div class="flex-between">
                      <span class="timeline-date text-muted" style="font-size:0.8em">${NT2.App.formatDate(act.date)}</span>
                      <div class="admin-only hidden">
                          <button class="btn btn-icon btn-sm edit-btn"><span class="material-symbols-rounded" style="font-size:18px">edit</span></button>
                          <button class="btn btn-icon btn-sm delete-btn btn-danger"><span class="material-symbols-rounded" style="font-size:18px">delete</span></button>
                        </div>
                    </div>
                    <h4 class="timeline-title m-0">${act.activity}</h4>
                    <p class="timeline-detail text-muted m-0" style="font-size:0.9em">${act.detail || ''}</p>
                  </div>
                </div>
              `).join('')}
              ${activities.length === 0 ? '<div class="text-center text-muted py-2">ບໍ່ມີການເຄື່ອນໄຫວ</div>' : ''}
            </div>
          </div>
        </div>
      `;
      
      container.appendChild(div);
      this._updateAdminVisibility(div);
      this._animateCounters(div);
    },
    
    _updateAdminVisibility(container) {
      const isAdmin = NT2.Auth && NT2.Auth.isLoggedIn();
      container.querySelectorAll('.admin-only').forEach(el => {
        if (isAdmin) {
          el.classList.remove('hidden');
        } else {
          el.classList.add('hidden');
        }
      });
    },

    _animateCounters(container) {
      container.querySelectorAll('.stat-value[data-target]').forEach(el => {
        const target = parseInt(el.dataset.target);
        if (isNaN(target)) return;
        let current = 0;
        const step = Math.max(1, Math.floor(target / 30));
        const timer = setInterval(() => {
          current += step;
          if (current >= target) { 
            current = target; 
            clearInterval(timer); 
          }
          el.textContent = current;
        }, 30);
      });
    }
  };
})();
