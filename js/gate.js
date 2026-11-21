/* Nam Theun 2 School — entry gate.
   Keeps the school portal behind a username/password before any page data is loaded.

   The unlock is intentionally a ONE-SHOT token: it allows only the single
   navigation from login.html to index.html. index.html consumes it immediately,
   so refreshing / reopening the site always shows the login page again. */
(function () {
  const NT2 = window.NT2 = window.NT2 || {};

  const KEY = 'nt2_gate_entry';
  const VALID_USER = 'NT2';
  const VALID_PASS = 'NT2@2026';

  // In-memory only. Resets to false on every fresh page load.
  let unlocked = false;

  function consumeEntry() {
    let ok = false;
    try {
      ok = sessionStorage.getItem(KEY) === 'true';
      sessionStorage.removeItem(KEY);
    } catch (e) {}
    return ok;
  }

  NT2.Gate = {
    isUnlocked() {
      return unlocked;
    },

    login(username, password) {
      const ok = String(username == null ? '' : username).trim() === VALID_USER &&
                 String(password == null ? '' : password) === VALID_PASS;
      if (ok) {
        unlocked = true;
        try { sessionStorage.setItem(KEY, 'true'); } catch (e) {}
      }
      return ok;
    },

    lock() {
      unlocked = false;
      try { sessionStorage.removeItem(KEY); } catch (e) {}
    },

    /* Called once from index.html <head>. */
    require() {
      if (!consumeEntry()) {
        location.replace('./login.html');
        return false;
      }
      unlocked = true;
      return true;
    },

    /* Password visibility eye buttons: <button data-password-toggle="#gatePassword"> */
    syncPasswordToggles() {
      document.querySelectorAll('[data-password-toggle]').forEach(btn => {
        const input = document.querySelector(btn.getAttribute('data-password-toggle'));
        if (!input) return;
        const showing = input.type === 'text';
        const icon = btn.querySelector('.material-symbols-rounded');
        if (icon) icon.textContent = showing ? 'visibility_off' : 'visibility';
        btn.setAttribute('aria-pressed', showing ? 'true' : 'false');
        const label = (window.NT2 && NT2.Lang)
          ? NT2.Lang.t(showing ? 'gate.hidePassword' : 'gate.showPassword')
          : (showing ? 'Hide password' : 'Show password');
        btn.setAttribute('title', label);
        btn.setAttribute('aria-label', label);
      });
    },

    initPasswordToggles() {
      // Keep eye labels correct after a language switch anywhere in the app.
      if (window.NT2 && NT2.Lang && !NT2.Lang._gateSyncPatched) {
        const applyStatic = NT2.Lang.applyStatic.bind(NT2.Lang);
        NT2.Lang.applyStatic = function () {
          applyStatic();
          if (NT2.Gate) NT2.Gate.syncPasswordToggles();
        };
        NT2.Lang._gateSyncPatched = true;
      }

      document.querySelectorAll('[data-password-toggle]').forEach(btn => {
        if (btn.dataset.toggleBound === '1') return;
        const input = document.querySelector(btn.getAttribute('data-password-toggle'));
        if (!input) return;
        btn.dataset.toggleBound = '1';
        btn.addEventListener('click', () => {
          input.type = input.type === 'password' ? 'text' : 'password';
          this.syncPasswordToggles();
          input.focus();
          try { input.setSelectionRange(input.value.length, input.value.length); } catch (e) {}
        });
      });
      this.syncPasswordToggles();
    },

    initLoginPage() {
      // index.html also loads this file for the guard; only initialise on the gate page.
      if (!document.getElementById('gateForm')) return;

      // Always show the gate on a fresh load — no "skip if unlocked".
      if (window.NT2 && NT2.Lang) NT2.Lang.init();

      const setTitle = () => {
        if (window.NT2 && NT2.Lang) {
          document.title = NT2.Lang.t('gate.title');
          const langLabel = document.getElementById('gateLangLabel');
          if (langLabel) langLabel.textContent = NT2.Lang.t('lang.label');
          this.syncPasswordToggles();
        }
      };
      setTitle();

      document.getElementById('gateLangBtn')?.addEventListener('click', () => {
        if (window.NT2 && NT2.Lang) NT2.Lang.toggle();
        setTitle();
      });

      const form = document.getElementById('gateForm');
      const userInput = document.getElementById('gateUsername');
      const passInput = document.getElementById('gatePassword');
      const errorBox = document.getElementById('gateError');

      form?.addEventListener('submit', e => {
        e.preventDefault();
        const user = userInput ? userInput.value : '';
        const pass = passInput ? passInput.value : '';

        if (this.login(user, pass)) {
          location.replace('./index.html');
          return;
        }

        if (errorBox) {
          if (window.NT2 && NT2.Lang) errorBox.textContent = NT2.Lang.t('gate.invalid');
          errorBox.classList.remove('hidden');
        }
        if (passInput) {
          passInput.value = '';
          passInput.focus();
        }
      });

      userInput?.focus();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      NT2.Gate.initLoginPage();
      NT2.Gate.initPasswordToggles();
    });
  } else {
    NT2.Gate.initLoginPage();
    NT2.Gate.initPasswordToggles();
  }
})();
