(function() {
  const NT2 = window.NT2 = window.NT2 || {};
  NT2.Pages = NT2.Pages || {};
  
  NT2.Pages.teachers = {
    render(container) {
      container.innerHTML = '';
      const div = document.createElement('div');
      div.className = 'page-container fade-in';
      
      const teachers = NT2.Data.getTeachers();
      const subjects = [...new Set(teachers.map(t => t.subject).filter(Boolean))];
      
      div.innerHTML = `
        <div class="page-header flex-between mb-4">
          <h2 class="page-title">ຄູອາຈານ</h2>
          <div class="page-actions admin-only hidden">
            <button class="btn btn-primary flex flex-center gap-1"><span class="material-symbols-rounded">add</span> ເພີ່ມຄູ</button>
          </div>
        </div>
        
        <div class="search-filter-bar mb-4 flex gap-2">
          <div class="search-box flex flex-center gap-1 flex-1" style="background:var(--surface);padding:8px 12px;border-radius:8px">
            <span class="material-symbols-rounded text-muted">search</span>
            <input type="text" id="teacher-search" class="form-input flex-1" style="border:none;background:transparent;outline:none" placeholder="ຄົ້ນຫາຄູອາຈານ...">
          </div>
          <div class="filter-chips flex gap-1 flex-wrap">
            <button class="chip active btn btn-sm btn-secondary" data-subject="all">ທັງໝົດ</button>
            ${subjects.map(s => `<button class="chip btn btn-sm btn-secondary" data-subject="${s}">${s}</button>`).join('')}
          </div>
        </div>
        
        <div class="data-grid grid-2" id="teachers-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(250px, 1fr));gap:16px;">
          <!-- Cards injected here -->
        </div>
      `;
      
      container.appendChild(div);
      this._updateAdminVisibility(div);
      
      const grid = div.querySelector('#teachers-grid');
      const searchInput = div.querySelector('#teacher-search');
      const chips = div.querySelectorAll('.chip');
      
      let currentSearch = '';
      let currentSubject = 'all';
      
      const renderCards = () => {
        const filtered = teachers.filter(t => {
          const matchSearch = (t.nameLao + ' ' + t.surnameLao + ' ' + t.nameEn + ' ' + t.surnameEn).toLowerCase().includes(currentSearch.toLowerCase());
          const matchSubject = currentSubject === 'all' || t.subject === currentSubject;
          return matchSearch && matchSubject;
        });
        
        grid.innerHTML = filtered.map((t, i) => `
          <div class="person-card card glass-card slide-up p-3 flex flex-center flex-col" style="animation-delay: ${Math.min(i * 0.05, 0.5)}s;text-align:center;">
            <div class="person-avatar ${t.gender === 'F' ? 'female' : ''}" style="width:80px;height:80px;border-radius:50%;background:var(--surface-variant);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:bold;margin-bottom:12px;overflow:hidden;">
              ${t.photoUrl ? `<img src="${t.photoUrl}" alt="${t.nameLao}" style="width:100%;height:100%;object-fit:cover">` : (t.nameLao ? NT2.App.getInitials(t.nameLao) : '?')}
            </div>
            <div class="person-info w-100">
              <div class="person-name font-bold text-lg">${t.nameLao} ${t.surnameLao}</div>
              <div class="person-name-en text-muted text-sm mb-2">${t.nameEn} ${t.surnameEn}</div>
              <div class="person-detail mt-2 flex flex-center gap-1 justify-center text-sm">
                <span class="material-symbols-rounded" style="font-size:16px">book</span> ${t.subject || '-'}
              </div>
              <div class="person-detail flex flex-center gap-1 justify-center text-sm">
                <span class="material-symbols-rounded" style="font-size:16px">phone</span> ${t.phone || '-'}
              </div>
            </div>
            <div class="person-actions admin-only hidden mt-3 flex flex-center gap-2">
              <button class="btn btn-icon btn-sm edit-btn"><span class="material-symbols-rounded" style="font-size:18px">edit</span></button>
              <button class="btn btn-icon btn-sm btn-danger delete-btn"><span class="material-symbols-rounded" style="font-size:18px">delete</span></button>
            </div>
          </div>
        `).join('');
        
        if (filtered.length === 0) {
          grid.innerHTML = `<div class="text-center text-muted" style="grid-column: 1/-1;padding:2rem;">ບໍ່ພົບຂໍ້ມູນຄູອາຈານ</div>`;
        }
        
        this._updateAdminVisibility(div);
      };
      
      searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        renderCards();
      });
      
      chips.forEach(chip => {
        chip.addEventListener('click', () => {
          chips.forEach(c => {
            c.classList.remove('active');
            c.style.background = 'var(--surface)';
            c.style.color = 'inherit';
          });
          chip.classList.add('active');
          chip.style.background = 'var(--primary)';
          chip.style.color = 'white';
          currentSubject = chip.dataset.subject;
          renderCards();
        });
      });
      
      // Initial chip styling
      chips[0].style.background = 'var(--primary)';
      chips[0].style.color = 'white';
      
      renderCards();
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
