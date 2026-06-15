import { CalendarCheck, LogOut, Menu, ShieldCheck, UserCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { assets } from '../data/catalog';
import { navigationItems } from '../data/navigation';

const userTokenKey = 'vakwetu_user_token';
const adminTokenKey = 'vakwetu_admin_token';
const authChangeEvent = 'vakwetu-auth-changed';

function readSessionState() {
  const hasUserSession = Boolean(localStorage.getItem(userTokenKey));
  const hasAdminSession = Boolean(localStorage.getItem(adminTokenKey));

  return {
    hasUserSession,
    hasAdminSession,
    isAuthenticated: hasUserSession || hasAdminSession
  };
}

export function Header({ menuOpen, setMenuOpen, currentPath }) {
  const [session, setSession] = useState(readSessionState);
  const visibleNavigation = navigationItems.filter(
    (item) => !(session.isAuthenticated && item.path === '/conta')
  );

  useEffect(() => {
    function syncSession() {
      setSession(readSessionState());
    }

    window.addEventListener('storage', syncSession);
    window.addEventListener(authChangeEvent, syncSession);

    return () => {
      window.removeEventListener('storage', syncSession);
      window.removeEventListener(authChangeEvent, syncSession);
    };
  }, []);

  function handleLogout() {
    localStorage.removeItem(userTokenKey);
    localStorage.removeItem(adminTokenKey);
    window.dispatchEvent(new Event(authChangeEvent));
    setSession(readSessionState());
    setMenuOpen(false);

    if (currentPath === '/admin' || currentPath === '/conta') {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new Event('popstate'));
    }
  }

  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="Vakwetu Weya">
        <img src={assets.logo} alt="Vakwetu Weya Angola" />
      </a>

      <button
        className="icon-button nav-toggle"
        type="button"
        aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
        onClick={() => setMenuOpen((value) => !value)}
      >
        {menuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <nav className={menuOpen ? 'nav nav--open' : 'nav'} aria-label="Navegação principal">
        {visibleNavigation.map(({ label, path }) => (
          <a
            key={label}
            href={path}
            className={currentPath === path ? 'is-active' : ''}
            onClick={() => setMenuOpen(false)}
          >
            {label}
          </a>
        ))}
        {session.isAuthenticated && (
          <a
            href={session.hasUserSession ? '/conta' : '/admin'}
            className={
              currentPath === (session.hasUserSession ? '/conta' : '/admin')
                ? 'is-active'
                : ''
            }
            onClick={() => setMenuOpen(false)}
          >
            {session.hasUserSession ? <UserCircle size={18} /> : <ShieldCheck size={18} />}
            {session.hasUserSession ? 'Perfil' : 'Admin'}
          </a>
        )}
        <a
          className={currentPath === '/reservas' ? 'nav-cta is-active' : 'nav-cta'}
          href="/reservas"
          onClick={() => setMenuOpen(false)}
        >
          <CalendarCheck size={18} />
          Reservar
        </a>
        {session.isAuthenticated && (
          <button className="nav-logout" type="button" onClick={handleLogout}>
            <LogOut size={18} />
            Sair
          </button>
        )}
      </nav>
    </header>
  );
}
