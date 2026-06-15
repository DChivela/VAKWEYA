import { Crosshair, Navigation } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { angolaMap, projectAngolaPoint } from '../data/angolaMap';
import { reservationLink } from '../services/reservationLinks';
import { SectionHeader } from './SectionHeader';

export function InteractiveMap({ destinations }) {
  const [activeSlug, setActiveSlug] = useState(destinations[0]?.slug);

  const activeDestination = useMemo(
    () => destinations.find((destination) => destination.slug === activeSlug) || destinations[0],
    [activeSlug, destinations]
  );

  const provinceLabels = useMemo(() => {
    const labels = new Map();

    destinations.forEach((destination) => {
      if (!destination.province || labels.has(destination.province)) {
        return;
      }

      const point = projectAngolaPoint(destination.coordinates);
      labels.set(destination.province, {
        ...destination,
        labelLeft: `${12 + (point.x / angolaMap.width) * 76}%`,
        labelTop: `${6 + (point.y / angolaMap.height) * 88}%`
      });
    });

    return [...labels.values()];
  }, [destinations]);

  useEffect(() => {
    if (!destinations.some((destination) => destination.slug === activeSlug)) {
      setActiveSlug(destinations[0]?.slug);
    }
  }, [activeSlug, destinations]);

  if (!activeDestination) {
    return null;
  }

  return (
    <section className="section shell map-section" id="mapa">
      <SectionHeader
        eyebrow="Mapa"
        title="Escolhe o ponto, sente a rota"
        text="Um mapa interativo simples para saltar entre destinos e decidir o próximo plano."
      />

      <div className="map-layout">
        <div className="map-canvas" aria-label="Mapa interativo de destinos em Angola">
          <svg
            className="map-svg"
            viewBox={angolaMap.viewBox}
            role="img"
            aria-label="Contorno geográfico de Angola com Cabinda"
          >
            <defs>
              <linearGradient id="angolaMapFill" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="58%" stopColor="#6e4931" />
                <stop offset="100%" stopColor="#7dd3fc" />
              </linearGradient>
            </defs>
            <path className="angola-outline" d={angolaMap.path} />
            <path className="angola-border" d={angolaMap.path} />
            {destinations.map((destination) => {
              const position = projectAngolaPoint(destination.coordinates);
              const isActive = destination.slug === activeSlug;

              return (
                <g
                  key={destination.slug}
                  className={isActive ? 'map-pin-svg is-active' : 'map-pin-svg'}
                  transform={`translate(${position.x} ${position.y})`}
                  role="button"
                  tabIndex="0"
                  onClick={() => setActiveSlug(destination.slug)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setActiveSlug(destination.slug);
                    }
                  }}
                  aria-label={`Selecionar ${destination.name}`}
                >
                  <title>{destination.name}</title>
                  <circle className="map-pin-svg__pulse" r="18" />
                  <circle className="map-pin-svg__dot" r="9" />
                </g>
              );
            })}
          </svg>
          {provinceLabels.map((destination) => (
            <button
              key={destination.province}
              type="button"
              className={
                destination.slug === activeSlug ? 'map-region is-active' : 'map-region'
              }
              style={{ left: destination.labelLeft, top: destination.labelTop }}
              onClick={() => setActiveSlug(destination.slug)}
              title={destination.name}
            >
              {destination.province}
            </button>
          ))}
        </div>

        <article className="map-details">
          <span className="eyebrow">Destino selecionado</span>
          <h3>{activeDestination.name}</h3>
          <p>{activeDestination.summary}</p>
          <dl>
            <div>
              <dt>Província</dt>
              <dd>{activeDestination.province}</dd>
            </div>
            <div>
              <dt>Duração</dt>
              <dd>{activeDestination.duration}</dd>
            </div>
            <div>
              <dt>Coordenadas</dt>
              <dd>
                {activeDestination.coordinates.lat}, {activeDestination.coordinates.lng}
              </dd>
            </div>
          </dl>
          <div className="tag-row">
            {activeDestination.highlights.map((highlight) => (
              <span key={highlight}>{highlight}</span>
            ))}
          </div>
          <div className="map-actions">
            <a className="button button--primary" href={reservationLink('destino', activeDestination)}>
              <Navigation size={18} />
              Reservar rota
            </a>
            <a className="button button--soft" href="/hoteis">
              <Crosshair size={18} />
              Ver serviços
            </a>
          </div>
        </article>
      </div>
    </section>
  );
}
