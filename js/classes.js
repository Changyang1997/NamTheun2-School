(function() {
  const NT2 = window.NT2 = window.NT2 || {};
  NT2.Pages = NT2.Pages || {};
  
  NT2.Pages.classes = {
    render(container) {
      container.innerHTML = '';
      const div = document.createElement('div');
      div.className = 'page-container fade-in';
      
      const allClasses = NT2.Data.getAllClasses();
      const kinder = allClasses.filter(c => c.level === 'kindergarten');
      const primary = allClasses.filter(c => c.level === 'primary');
      const secondary = allClasses.filter(c => c.level === 'secondary');

      div.innerHTML = `
        <div class="page-header mb-4">
          <h2 class="page-title">ຊັ້ນຮຽນ</h2>
        </div>
        
        <div class="levels-container">
          <div class="level-section mb-4 slide-up">
            <div class="level-header flex gap-2 flex-center mb-3">
              <span class="material-symbols-rounded text-primary" style="font-size:32px">child_care</span>
              <h3 class="m-0 text-xl">ຊັ້ນອະນຸບານ</h3>
            </div>
            <div class="level-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:16px;">
              ${this._renderClassCards(kinder, 'kindergarten', 'child_care', 'var(--primary)')}
            </div>
          </div>
          
          <div class="level-section mb-4 slide-up" style="animation-delay: 0.1s">
            <div class="level-header flex gap-2 flex-center mb-3">
              <span class="material-symbols-rounded text-success" style="font-size:32px">menu_book</span>
              <h3 class="m-0 text-xl">ຊັ້ນປະຖົມ</h3>
            </div>
            <div class="level-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:16px;">
              ${this._renderClassCards(primary, 'primary', 'menu_book', 'var(--success)')}
            </div>
          </div>
          
          <div class="level-section mb-4 slide-up" style="animation-delay: 0.2s">
            <div class="level-header flex gap-2 flex-center mb-3">
              <span class="material-symbols-rounded text-warning" style="font-size:32px">school</span>
              <h3 class="m-0 text-xl">ຊັ້ນມັດທະຍົມ</h3>
            </div>
            <div class="level-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:16px;">
              ${this._renderClassCards(secondary, 'secondary', 'school', 'var(--warning)')}
            </div>
          </div>
        </div>
      `;
      
      container.appendChild(div);
      
      div.querySelectorAll('.class-card').forEach(card => {
        card.addEventListener('click', () => {
          const className = card.dataset.class;
          this._showClassModal(className);
        });
      });
    },
    
    _renderClassCards(classes, levelClass, iconName, color) {
      if (classes.length === 0) return '<div class="text-muted" style="grid-column:1/-1">ບໍ່ມີຂໍ້ມູນ</div>';
      return classes.map(c => {
        const count = NT2.Data.getStudentsByClass(c.name).length;
        return `
          <div class="class-card card glass-card p-4 flex flex-center flex-col gap-2 cursor-pointer hover-lift" data-class="${c.name}" style="text-align:center;transition:transform 0.2s, box-shadow 0.2s;">
            <div class="class-icon ${levelClass}" style="width:64px;height:64px;border-radius:50%;background:var(--surface-variant);display:flex;align-items:center;justify-content:center;color:${color}">
                <span class="material-symbols-rounded" style="font-size:32px">${iconName}</span>
            </div>
            <div class="class-name font-bold text-2xl mt-2">${c.name}</div>
            <div class="class-count badge" style="background:var(--surface-variant);padding:4px 12px;border-radius:16px;font-size:14px">${count} ຄົນ</div>
          </div>
        `;
      }).join('');
    },
    
    _showClassModal(className) {
      const students = NT2.Data.getStudentsByClass(className);
      
      let bodyHTML = '';
      if (students.length === 0) {
        bodyHTML = '<div class="text-center p-4 text-muted">ບໍ່ມີຂໍ້ມູນ</div>';
      } else {
        bodyHTML = `
          <div class="table-wrapper overflow-x-auto">
            <table class="data-table" style="width:100%; border-collapse:collapse; min-width:500px">
              <thead>
                <tr style="background:var(--surface-variant);border-bottom:2px solid var(--border)">
                  <th style="padding:12px;text-align:left">ລຳດັບ</th>
                  <th style="padding:12px;text-align:left">ຊື່ ແລະ ນາມສະກຸນ (ລາວ)</th>
                  <th style="padding:12px;text-align:left">ຊື່ ແລະ ນາມສະກຸນ (EN)</th>
                  <th style="padding:12px;text-align:left">ເພດ</th>
                </tr>
              </thead>
              <tbody>
                ${students.map((s, i) => `
                  <tr style="border-bottom:1px solid var(--border)">
                    <td style="padding:12px">${i + 1}</td>
                    <td style="padding:12px;font-weight:bold">${s.nameLao} ${s.surnameLao}</td>
                    <td style="padding:12px;color:var(--text-muted)">${s.nameEn} ${s.surnameEn}</td>
                    <td style="padding:12px">${s.gender === 'F' ? '<span style="color:#e91e63">ຍິງ</span>' : '<span style="color:#2196f3">ຊາຍ</span>'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
      
      const footerHTML = `<button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">ປິດ</button>`;
      
      NT2.App.showModal(`ລາຍຊື່ນັກຮຽນຫ້ອງ ${className}`, bodyHTML, footerHTML);
    }
  };
})();
