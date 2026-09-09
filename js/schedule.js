(function() {
  const NT2 = window.NT2 = window.NT2 || {};
  NT2.Pages = NT2.Pages || {};
  
  NT2.Pages.schedule = {
    render(container) {
      container.innerHTML = '';
      const div = document.createElement('div');
      div.className = 'page-container fade-in';
      
      const studySchedule = NT2.Data.getStudySchedule();
      const teachingSchedule = NT2.Data.getTeachingSchedule();
      
      div.innerHTML = `
        <div class="page-header flex-between mb-4">
          <h2 class="page-title">ຕາຕະລາງ</h2>
          <div class="admin-only hidden">
            <button class="btn btn-primary flex flex-center gap-1"><span class="material-symbols-rounded">edit</span> ແກ້ໄຂ</button>
          </div>
        </div>
        
        <div class="schedule-container card glass-card">
          <div class="tabs-container">
            <div class="tabs-header flex gap-2 p-3" style="border-bottom:1px solid var(--border)">
              <button class="tab-btn btn active" data-target="study-tab" style="background:var(--primary);color:white">ຕາຕະລາງຮຽນ</button>
              <button class="tab-btn btn btn-secondary" data-target="teach-tab">ຕາຕະລາງສອນ</button>
            </div>
            <div class="tabs-body p-4 overflow-x-auto">
              <div id="study-tab" class="tab-panel active slide-up">
                <div class="table-wrapper">
                  <table class="schedule-table data-table" style="width:100%; border-collapse:collapse; min-width: 600px;">
                    <tbody>
                      ${this._renderScheduleRows(studySchedule)}
                    </tbody>
                  </table>
                </div>
              </div>
              <div id="teach-tab" class="tab-panel slide-up hidden" style="display:none">
                <div class="table-wrapper">
                  <table class="schedule-table data-table" style="width:100%; border-collapse:collapse; min-width: 600px;">
                    <tbody>
                      ${this._renderScheduleRows(teachingSchedule)}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      container.appendChild(div);
      this._updateAdminVisibility(div);
      
      const tabBtns = div.querySelectorAll('.tab-btn');
      const tabPanels = div.querySelectorAll('.tab-panel');
      
      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          tabBtns.forEach(b => {
            b.classList.remove('active');
            b.style.background = '';
            b.style.color = '';
            b.classList.add('btn-secondary');
          });
          btn.classList.add('active');
          btn.classList.remove('btn-secondary');
          btn.style.background = 'var(--primary)';
          btn.style.color = 'white';
          
          tabPanels.forEach(p => {
            p.classList.remove('active');
            p.classList.add('hidden');
            p.style.display = 'none';
          });
          const target = div.querySelector('#' + btn.dataset.target);
          target.classList.remove('hidden');
          target.classList.add('active');
          target.style.display = 'block';
        });
      });
    },
    
    _renderScheduleRows(scheduleData) {
      const cleanRows = (scheduleData || []).filter(r => {
        if (!r) return false;
        const time = (r.time || '').trim();
        const mon  = (r.mon  || '').trim();
        if (time === 'ເວລາ' || mon === 'ວັນຈັນ') return false;
        return true;
      });

      if (!cleanRows || cleanRows.length === 0) {
        return '<tr><td colspan="6" class="text-center text-muted" style="padding:16px;border:1px solid var(--border)">ບໍ່ມີຂໍ້ມູນ</td></tr>';
      }
      return cleanRows.map(row => {
        if (row.isBreak) {
          return `
            <tr class="break-row" style="background:var(--surface-variant)">
              <td class="time-col font-bold" style="padding:12px;border:1px solid var(--border);text-align:center">${row.time}</td>
              <td colspan="5" class="text-center font-bold text-muted" style="padding:12px;border:1px solid var(--border);background:#fef7e0;color:#b06000;letter-spacing:2px">${row.mon || 'ພັກຜ່ອນ'}</td>
            </tr>
          `;
        }
        return `
          <tr>
            <td class="time-col font-bold" style="padding:12px;border:1px solid var(--border);text-align:center;background:var(--surface)">${row.time}</td>
            <td style="padding:12px;border:1px solid var(--border);text-align:center">${row.mon || '-'}</td>
            <td style="padding:12px;border:1px solid var(--border);text-align:center">${row.tue || '-'}</td>
            <td style="padding:12px;border:1px solid var(--border);text-align:center">${row.wed || '-'}</td>
            <td style="padding:12px;border:1px solid var(--border);text-align:center">${row.thu || '-'}</td>
            <td style="padding:12px;border:1px solid var(--border);text-align:center">${row.fri || '-'}</td>
          </tr>
        `;
      }).join('');
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
    }
  };
})();
