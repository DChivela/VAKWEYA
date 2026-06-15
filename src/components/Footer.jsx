import { Instagram, Mail, MapPinned } from 'lucide-react';
import { assets } from '../data/catalog';

export function Footer() {
  return (
    <footer className="footer">
      <div className="shell footer-layout">
        <a className="brand brand--footer" href="/">
          <img src={assets.logo} alt="Vakwetu Weya Angola" />
        </a>
        <div className="footer-links">
          <a href="/destinos">Destinos</a>
          <a href="/reservas">Reservas</a>
          <a href="/admin">Admin</a>
          <a href="/contacto">Contacto</a>
        </div>
        <div className="social-links" aria-label="Canais">
          <a href="/mapa" aria-label="Mapa">
            <MapPinned size={19} />
          </a>
          <a href="mailto:reservas@vakwetuweya.ao" aria-label="Email">
            <Mail size={19} />
          </a>
          <a href="/" aria-label="Instagram">
            <Instagram size={19} />
          </a>
        </div>
      </div>
    </footer>
  );
}
