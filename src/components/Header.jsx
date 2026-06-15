import { CalendarCheck, Menu, X } from 'lucide-react';
import { assets } from '../data/catalog';
import { navigationItems } from '../data/navigation';

export function Header({ menuOpen, setMenuOpen, currentPath }) {
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
        {navigationItems.map(({ label, path }) => (
          <a
            key={label}
            href={path}
            className={currentPath === path ? 'is-active' : ''}
            onClick={() => setMenuOpen(false)}
          >
            {label}
          </a>
        ))}
        <a
          className={currentPath === '/reservas' ? 'nav-cta is-active' : 'nav-cta'}
          href="/reservas"
          onClick={() => setMenuOpen(false)}
        >
          <CalendarCheck size={18} />
          Reservar
        </a>
      </nav>
    </header>
  );
}
