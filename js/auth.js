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
        if (window.NT2 && NT2.Lang) NT2.Lang.applyLogin();
        if (NT2.App && NT2.App.showToast) {
          NT2.App.showToast(NT2.Lang ? NT2.Lang.t('login.success') : 'ເຂົ້າສູ່ລະບົບສຳເລັດ', 'success');
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
      if (window.NT2 && NT2.Lang) NT2.Lang.applyLogin();
      if (NT2.App && NT2.App.showToast) {
        NT2.App.showToast(NT2.Lang ? NT2.Lang.t('login.loggedOut') : 'ອອກຈາກລະບົບແລ້ວ', 'info');
      }
    },

    _updateLoginBtn(loggedIn) {
      const btn = document.getElementById('loginBtn');
      if (!btn) return;
      const logoutLabel = (window.NT2 && NT2.Lang) ? NT2.Lang.t('login.logout') : 'ອອກຈາກລະບົບ';
      const loginLabel  = (window.NT2 && NT2.Lang) ? NT2.Lang.t('login.login')  : 'ເຂົ້າສູ່ລະບົບ';
      if (loggedIn) {
        btn.classList.add('logged-in');
        btn.innerHTML = `<span class="material-symbols-rounded">logout</span><span>${logoutLabel}</span>`;
      } else {
        btn.classList.remove('logged-in');
        btn.innerHTML = `<span class="material-symbols-rounded">login</span><span>${loginLabel}</span>`;
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
