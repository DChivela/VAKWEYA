import { ArrowRight, CalendarCheck, MapPinned, PlayCircle } from 'lucide-react';
import { assets } from '../data/catalog';

export function Hero({ stats }) {
  return (
    <section className="hero" id="inicio">
      <img className="hero__image" src={assets.hero} alt="Viajantes a explorar paisagens de Angola" />
      <div className="hero__overlay" />
      <div className="hero__content shell">
        <div className="hero__copy">
          <span className="hero__kicker">Turismo jovem em Angola</span>
          <h1>Explora Angola com energia, confiança e reservas simples.</h1>
          <p>
            Hotéis, restaurantes, tours e roteiros personalizados para quem quer viver
            mais, planear melhor e partir sem complicações.
          </p>
          <div className="hero__actions">
            <a className="button button--primary" href="/reservas">
              <CalendarCheck size={19} />
              Criar reserva
            </a>
            <a className="button button--ghost" href="/destinos">
              <MapPinned size={19} />
              Ver destinos
            </a>
          </div>
        </div>

        <div className="hero__panel" aria-label="Experiência em destaque">
          <div className="pulse-dot" />
          <span>Roteiro em alta</span>
          <strong>Huíla Sunrise + Serra da Leba</strong>
          <p>3 dias com trilha, cultura, jantar ao pôr do sol e guia local.</p>
          <a href="/tours">
            <PlayCircle size={18} />
            Explorar experiência
            <ArrowRight size={16} />
          </a>
        </div>
      </div>

      <div className="hero__stats shell" aria-label="Indicadores">
        {stats.map((item) => (
          <div key={item.label}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
