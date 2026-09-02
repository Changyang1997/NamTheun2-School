(function() {
  const NT2 = window.NT2 = window.NT2 || {};
  NT2.Pages = NT2.Pages || {};
  
  NT2.Pages.scores = {
    render(container) {
      container.innerHTML = '';
      const div = document.createElement('div');
      div.className = 'page-container fade-in';
      
      const links = NT2.Data.getScoreLinks();
      
      const kinder = links.filter(l => l.className.startsWith('ອ'));
      const primary = links.filter(l => l.className.startsWith('ປ'));
      const secondary = links.filter(l => l.className.startsWith('ມ'));

      div.innerHTML = `
        <div class="page-header flex-between mb-4">
          <h2 class="page-title">ຄະແນນ</h2>
          <div class="page-actions flex gap-2">
            <button class="btn btn-secondary flex flex-center gap-1" id="btn-grading-rules">
              <span class="material-symbols-rounded">rule</span> ກົດລະບຽບການຕັດຄະແນນ
            </button>
            <div class="admin-only hidden">
              <button class="btn btn-primary flex flex-center gap-1"><span class="material-symbols-rounded">edit</span> ແກ້ໄຂລິ້ງ</button>
            </div>
          </div>
        </div>
        
        <div class="scores-container">
          <div class="scores-section mb-4 slide-up">
            <h3 class="scores-section-title mb-2 flex flex-center gap-2"><span class="material-symbols-rounded text-primary">child_care</span> ຊັ້ນອະນຸບານ</h3>
            <div class="scores-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:16px;">
              ${this._renderLinks(kinder)}
            </div>
          </div>
          
          <div class="scores-section mb-4 slide-up" style="animation-delay: 0.1s">
            <h3 class="scores-section-title mb-2 flex flex-center gap-2"><span class="material-symbols-rounded text-success">menu_book</span> ຊັ້ນປະຖົມ</h3>
            <div class="scores-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:16px;">
              ${this._renderLinks(primary)}
            </div>
          </div>
          
          <div class="scores-section mb-4 slide-up" style="animation-delay: 0.2s">
            <h3 class="scores-section-title mb-2 flex flex-center gap-2"><span class="material-symbols-rounded text-warning">school</span> ຊັ້ນມັດທະຍົມ</h3>
            <div class="scores-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:16px;">
              ${this._renderLinks(secondary)}
            </div>
          </div>
        </div>
      `;
      
      container.appendChild(div);
      this._updateAdminVisibility(div);
      
      div.querySelector('#btn-grading-rules').addEventListener('click', () => {
        const modalBody = `
          <div class="grading-rules">
            <table class="data-table" style="width:100%; border-collapse:collapse;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border)">
                  <th style="padding:12px;text-align:left">ລະດັບ</th>
                  <th style="padding:12px;text-align:left">ຄະແນນ</th>
                  <th style="padding:12px;text-align:left">ໝາຍເຫດ</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid var(--border)">
                  <td style="padding:12px;font-weight:bold;color:var(--success)">ດີເລີດ</td>
                  <td style="padding:12px">80-100</td>
                  <td style="padding:12px"><span class="badge" style="background:#e6f4ea;color:#137333;padding:4px 8px;border-radius:12px;font-size:12px">ຜ່ານ</span></td>
                </tr>
                <tr style="border-bottom: 1px solid var(--border)">
                  <td style="padding:12px;font-weight:bold;color:var(--success)">ດີ</td>
                  <td style="padding:12px">70-79</td>
                  <td style="padding:12px"><span class="badge" style="background:#e6f4ea;color:#137333;padding:4px 8px;border-radius:12px;font-size:12px">ຜ່ານ</span></td>
                </tr>
                <tr style="border-bottom: 1px solid var(--border)">
                  <td style="padding:12px;font-weight:bold;color:var(--success)">ປານກາງ</td>
                  <td style="padding:12px">60-69</td>
                  <td style="padding:12px"><span class="badge" style="background:#e6f4ea;color:#137333;padding:4px 8px;border-radius:12px;font-size:12px">ຜ່ານ</span></td>
                </tr>
                <tr style="border-bottom: 1px solid var(--border)">
                  <td style="padding:12px;font-weight:bold;color:var(--warning)">ອ່ອນ</td>
                  <td style="padding:12px">50-59</td>
                  <td style="padding:12px"><span class="badge" style="background:#fef7e0;color:#b06000;padding:4px 8px;border-radius:12px;font-size:12px">ຜ່ານ (ມີເງື່ອນໄຂ)</span></td>
                </tr>
                <tr>
                  <td style="padding:12px;font-weight:bold;color:var(--danger)">ຕົກ</td>
                  <td style="padding:12px">0-49</td>
                  <td style="padding:12px"><span class="badge" style="background:#fce8e6;color:#c5221f;padding:4px 8px;border-radius:12px;font-size:12px">ບໍ່ຜ່ານ</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        `;
        NT2.App.showModal('ກົດລະບຽບການຕັດຄະແນນ', modalBody, '<button class="btn btn-primary" onclick="this.closest(\'.modal-overlay\').remove()">ປິດ</button>');
      });
    },
    
    _renderLinks(links) {
      if (links.length === 0) return '<div class="text-muted" style="grid-column:1/-1">ບໍ່ມີຂໍ້ມູນ</div>';
      return links.map(l => `
        <div class="card p-3 flex-between glass-card score-btn-wrapper hover-lift">
          <a href="${l.url}" target="_blank" class="score-btn flex gap-2 flex-center" style="text-decoration:none; color:inherit; flex:1;">
            <div class="class-label badge" style="background:var(--primary);color:white;padding:4px 12px;border-radius:16px;font-weight:bold">${l.className}</div>
            <div class="view-label font-bold">${l.displayName}</div>
          </a>
          <div class="admin-only hidden ml-2">
            <button class="btn btn-icon btn-sm edit-btn btn-secondary"><span class="material-symbols-rounded" style="font-size:18px">edit</span></button>
          </div>
        </div>
      `).join('');
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
