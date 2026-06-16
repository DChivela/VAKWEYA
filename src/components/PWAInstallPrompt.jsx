import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';

function isStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault();

      if (isStandaloneMode() || sessionStorage.getItem('vakwetu_pwa_install_dismissed') === '1') {
        return;
      }

      setInstallEvent(event);
      setIsVisible(true);
    }

    function handleAppInstalled() {
      setInstallEvent(null);
      setIsVisible(false);
      sessionStorage.setItem('vakwetu_pwa_install_dismissed', '1');
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  async function installApp() {
    if (!installEvent) {
      return;
    }

    installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    setIsVisible(false);
  }

  function dismiss() {
    sessionStorage.setItem('vakwetu_pwa_install_dismissed', '1');
    setIsVisible(false);
  }

  if (!isVisible) {
    return null;
  }

  return (
    <div className="pwa-install">
      <button className="pwa-install__main" type="button" onClick={installApp}>
        <Download size={17} />
        Instalar app
      </button>
      <button className="pwa-install__close" type="button" onClick={dismiss} aria-label="Fechar">
        <X size={16} />
      </button>
    </div>
  );
}
