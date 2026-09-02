(function() {
  const NT2 = window.NT2 = window.NT2 || {};
  
  const VALID_USER = 'admin';
  const VALID_PASS = '123';
  
  NT2.Auth = {
    isLoggedIn: false,
    _callbacks: [],
    
    init() {
      if (sessionStorage.getItem('nt2_auth') === 'true') {
        this.isLoggedIn = true;
        document.body.classList.add('admin-mode');
        this._updateLoginBtn(true);
      } else {
        this._updateLoginBtn(false);
      }
    },
    
    login(username, password) {
      if (username === VALID_USER && password === VALID_PASS) {
        this.isLoggedIn = true;
        sessionStorage.setItem('nt2_auth', 'true');
        document.body.classList.add('admin-mode');
        this._updateLoginBtn(true);
        this._notify();
        if (NT2.App && NT2.App.showToast) {
          NT2.App.showToast('ເຂົ້າສູ່ລະບົບສຳເລັດ', 'success');
        }
        return true;
      }
      return false;
    },

    logout() {
      this.isLoggedIn = false;
      sessionStorage.removeItem('nt2_auth');
      document.body.classList.remove('admin-mode');
      this._updateLoginBtn(false);
      this._notify();
      if (NT2.App && NT2.App.showToast) {
        NT2.App.showToast('ອອກຈາກລະບົບແລ້ວ', 'info');
      }
    },

    _updateLoginBtn(loggedIn) {
      const btn = document.getElementById('loginBtn');
      if (!btn) return;
      if (loggedIn) {
        btn.classList.add('logged-in');
        btn.innerHTML = '<span class="material-symbols-rounded">logout</span><span>ອອກຈາກລະບົບ</span>';
      } else {
        btn.classList.remove('logged-in');
        btn.innerHTML = '<span class="material-symbols-rounded">login</span><span>ເຂົ້າສູ່ລະບົບ</span>';
      }
    },

    onAuthChange(cb) {
      this._callbacks.push(cb);
    },

    _notify() {
      this._callbacks.forEach(cb => cb(this.isLoggedIn));
    }
  };
})();
