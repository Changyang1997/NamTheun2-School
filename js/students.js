(function() {
  const NT2 = window.NT2 = window.NT2 || {};
  NT2.Pages = NT2.Pages || {};
  
  NT2.Pages.students = {
    render(container) {
      container.innerHTML = '';
      const div = document.createElement('div');
      div.className = 'page-container fade-in';
      
      const students = NT2.Data.getStudents();
      const classLevels = ['ອະນຸບານ', 'ປະຖົມ', 'ມັດທະຍົມ'];
      const classNames = [...new Set(students.map(s => s.className).filter(Boolean))].sort();
      
      div.innerHTML = `
        <div class="page-header flex-between mb-4">
          <h2 class="page-title">ນັກຮຽນ <span id="student-count" class="text-muted" style="font-size:1rem;font-weight:normal">(ທັງໝົດ ${students.length} ຄົນ)</span></h2>
          <div class="page-actions admin-only hidden">
            <button class="btn btn-primary flex flex-center gap-1"><span class="material-symbols-rounded">add</span> ເພີ່ມນັກຮຽນ</button>
          </div>
        </div>
        
        <div class="search-filter-bar mb-4 flex gap-2 flex-col">
          <div class="search-box flex flex-center gap-1" style="background:var(--surface);padding:8px 12px;border-radius:8px">
            <span class="material-symbols-rounded text-muted">search</span>
            <input type="text" id="student-search" class="form-input flex-1" style="border:none;background:transparent;outline:none" placeholder="ຄົ້ນຫານັກຮຽນ...">
          </div>
          <div class="filter-chips flex gap-1 flex-wrap">
            <button class="chip active btn btn-sm btn-secondary" data-filter="all">ທັງໝົດ</button>
            <button class="chip btn btn-sm btn-secondary" data-filter="level:ອະນຸບານ">ອະນຸບານ</button>
            <button class="chip btn btn-sm btn-secondary" data-filter="level:ປະຖົມ">ປະຖົມ</button>
            <button class="chip btn btn-sm btn-secondary" data-filter="level:ມັດທະຍົມ">ມັດທະຍົມ</button>
            ${classNames.map(c => `<button class="chip btn btn-sm btn-secondary" data-filter="class:${c}">${c}</button>`).join('')}
          </div>
        </div>
        
        <div class="data-grid grid-2" id="students-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(250px, 1fr));gap:16px;">
          <!-- Cards injected here -->
        </div>
      `;
      
      container.appendChild(div);
      this._updateAdminVisibility(div);
      
      const grid = div.querySelector('#students-grid');
      const searchInput = div.querySelector('#student-search');
      const chips = div.querySelectorAll('.chip');
      const countLabel = div.querySelector('#student-count');
      
      let currentSearch = '';
      let currentFilterType = 'all'; // all, level, class
      let currentFilterValue = '';
      
      const getLevelFromClassName = (name) => {
        if (!name) return '';
        if (name.startsWith('ອ')) return 'ອະນຸບານ';
        if (name.startsWith('ປ')) return 'ປະຖົມ';
        if (name.startsWith('ມ')) return 'ມັດທະຍົມ';
        return '';
      };
      
      const renderCards = () => {
        const filtered = students.filter(s => {
          const matchSearch = (s.nameLao + ' ' + s.surnameLao + ' ' + s.nameEn + ' ' + s.surnameEn).toLowerCase().includes(currentSearch.toLowerCase());
          let matchFilter = true;
          if (currentFilterType === 'class') {
            matchFilter = s.className === currentFilterValue;
          } else if (currentFilterType === 'level') {
            matchFilter = getLevelFromClassName(s.className) === currentFilterValue;
          }
          return matchSearch && matchFilter;
        });
        
        countLabel.textContent = `(ທັງໝົດ ${filtered.length} ຄົນ)`;
        
        grid.innerHTML = filtered.map((s, i) => `
          <div class="person-card card glass-card slide-up p-3 flex flex-center flex-col" style="animation-delay: ${Math.min(i * 0.05, 0.5)}s;text-align:center;">
            <div class="person-avatar ${s.gender === 'F' ? 'female' : ''}" style="width:80px;height:80px;border-radius:50%;background:var(--surface-variant);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:bold;margin-bottom:12px;overflow:hidden;">
              ${s.photoUrl ? `<img src="${s.photoUrl}" alt="${s.nameLao}" style="width:100%;height:100%;object-fit:cover">` : (s.nameLao ? NT2.App.getInitials(s.nameLao) : '?')}
            </div>
            <div class="person-info w-100">
              <div class="person-name font-bold text-lg">${s.nameLao} ${s.surnameLao}</div>
              <div class="person-name-en text-muted text-sm mb-2">${s.nameEn} ${s.surnameEn}</div>
              <div class="person-detail mt-2 flex flex-center gap-1 justify-center text-sm">
                <span class="material-symbols-rounded class-icon ${getLevelFromClassName(s.className) === 'ອະນຸບານ' ? 'kindergarten text-primary' : (getLevelFromClassName(s.className) === 'ປະຖົມ' ? 'primary text-success' : 'secondary text-warning')}" style="font-size:16px">class</span> ຫ້ອງ ${s.className || '-'}
              </div>
            </div>
            <div class="person-actions admin-only hidden mt-3 flex flex-center gap-2">
              <button class="btn btn-icon btn-sm edit-btn"><span class="material-symbols-rounded" style="font-size:18px">edit</span></button>
              <button class="btn btn-icon btn-sm btn-danger delete-btn"><span class="material-symbols-rounded" style="font-size:18px">delete</span></button>
            </div>
          </div>
        `).join('');
        
        if (filtered.length === 0) {
          grid.innerHTML = `<div class="text-center text-muted" style="grid-column: 1/-1;padding:2rem;">ບໍ່ພົບຂໍ້ມູນນັກຮຽນ</div>`;
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
          const filterData = chip.dataset.filter.split(':');
          currentFilterType = filterData[0];
          currentFilterValue = filterData[1] || '';
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
