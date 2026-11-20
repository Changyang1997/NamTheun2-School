(function () {
  const NT2 = window.NT2 = window.NT2 || {};
  const L = key => (window.NT2 && NT2.Lang) ? NT2.Lang.t(key) : key;

  let deferredPrompt = null;
  let installed = false;

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true ||
           document.referrer.indexOf('android-app://') === 0;
  }

  function setVisible(visible) {
    document.body.classList.toggle('pwa-install-ready', visible);
  }

  function toast(msg, type) {
    if (NT2.App && NT2.App.showToast) NT2.App.showToast(msg, type);
  }

  // Browsers without beforeinstallprompt (notably iOS Safari) need a short guide.
  function showHelp() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active dynamic-modal';
    overlay.innerHTML = `
      <div class="modal" style="max-width:480px">
        <div class="modal-header">
          <h3 class="modal-title"><span class="material-symbols-rounded">install_mobile</span> ${L('pwa.help_title')}</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body" style="line-height:1.7">
          <p style="margin:0 0 6px;font-weight:600">${L('pwa.help_ios')}</p>
          <ol style="margin:0 0 14px;padding-left:20px">
            <li>${L('pwa.ios_step1')}</li>
            <li>${L('pwa.ios_step2')}</li>
            <li>${L('pwa.ios_step3')}</li>
          </ol>
          <p style="margin:0 0 6px;font-weight:600">${L('pwa.help_android')}</p>
          <p style="margin:0">${L('pwa.android_step')}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">${L('common.close')}</button>
        </div>
      </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  async function install() {
    if (installed) return;

    if (deferredPrompt) {
      const prompt = deferredPrompt;
      deferredPrompt = null;
      prompt.prompt();
      try {
        const choice = await prompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          toast(L('pwa.installed'), 'success');
          setVisible(false);
        } else {
          toast(L('pwa.cancelled'), 'info');
        }
      } catch (e) {
        toast(L('pwa.cancelled'), 'info');
      }
      return;
    }

    showHelp();
  }

  NT2.PWA = {
    init() {
      // Service workers require https or localhost. Skip silently on file://.
      if ('serviceWorker' in navigator && location.protocol !== 'file:') {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('./sw.js').catch(() => {});
        });
      }

      installed = isStandalone();
      if (installed) { setVisible(false); return; }

      setVisible(true);

      window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        deferredPrompt = e;
        setVisible(true);
      });

      window.addEventListener('appinstalled', () => {
        installed = true;
        deferredPrompt = null;
        setVisible(false);
        toast(L('pwa.installed'), 'success');
      });

      document.getElementById('installBtn')?.addEventListener('click', install);
      document.getElementById('mobileInstallBtn')?.addEventListener('click', install);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => NT2.PWA.init());
  } else {
    NT2.PWA.init();
  }
})();
