import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, LocateFixed, Navigation } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { reservationLink } from '../services/reservationLinks';
import { SectionHeader } from './SectionHeader';

const angolaCenter = [-12.5, 17.5];

export function InteractiveMap({ destinations }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const destinationLayerRef = useRef(null);
  const locationLayerRef = useRef(null);
  const [activeSlug, setActiveSlug] = useState(destinations[0]?.slug);
  const [locationStatus, setLocationStatus] = useState('idle');

  const activeDestination = useMemo(
    () => destinations.find((destination) => destination.slug === activeSlug) || destinations[0],
    [activeSlug, destinations]
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return undefined;
    }

    const map = L.map(containerRef.current, {
      zoomControl: false,
      minZoom: 5
    }).setView(angolaCenter, 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    destinationLayerRef.current = L.layerGroup().addTo(map);
    locationLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = destinationLayerRef.current;

    if (!map || !layer) {
      return;
    }

    layer.clearLayers();
    destinations.forEach((destination) => {
      const isActive = destination.slug === activeSlug;
      const marker = L.circleMarker(
        [destination.coordinates.lat, destination.coordinates.lng],
        {
          radius: isActive ? 11 : 8,
          color: '#ffffff',
          weight: 3,
          fillColor: isActive ? '#f2b705' : '#1677ff',
          fillOpacity: 1
        }
      )
        .bindTooltip(`${destination.name} · ${destination.province}`, {
          direction: 'top',
          offset: [0, -8]
        })
        .on('click', () => {
          setActiveSlug(destination.slug);
          map.flyTo([destination.coordinates.lat, destination.coordinates.lng], 9, {
            duration: 0.8
          });
        });
      marker.addTo(layer);
    });
  }, [activeSlug, destinations]);

  useEffect(() => {
    if (!destinations.some((destination) => destination.slug === activeSlug)) {
      setActiveSlug(destinations[0]?.slug);
    }
  }, [activeSlug, destinations]);

  function locateUser() {
    if (!navigator.geolocation) {
      setLocationStatus('unsupported');
      return;
    }

    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const map = mapRef.current;
        const layer = locationLayerRef.current;

        if (!map || !layer) {
          return;
        }

        layer.clearLayers();
        L.circleMarker([coords.latitude, coords.longitude], {
          radius: 9,
          color: '#ffffff',
          weight: 3,
          fillColor: '#16a34a',
          fillOpacity: 1
        })
          .bindTooltip('A tua localização', { permanent: true, direction: 'top' })
          .addTo(layer);
        map.flyTo([coords.latitude, coords.longitude], 12, { duration: 0.8 });
        setLocationStatus('success');
      },
      () => setLocationStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  if (!activeDestination) {
    return null;
  }

  return (
    <section className="section shell map-section" id="mapa">
      <SectionHeader
        eyebrow="Mapa real"
        title="Explora Angola no mapa"
        text="Consulta os destinos publicados e usa a tua localização para perceber melhor cada rota."
      />

      <div className="map-layout">
        <div className="map-canvas map-canvas--leaflet">
          <div ref={containerRef} className="leaflet-map" aria-label="Mapa interativo de Angola" />
          <button className="map-locate-button" type="button" onClick={locateUser}>
            <LocateFixed size={18} />
            {locationStatus === 'loading' ? 'A localizar...' : 'Minha localização'}
          </button>
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
              <dd>{activeDestination.coordinates.lat}, {activeDestination.coordinates.lng}</dd>
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
            <a className="button button--soft" href="/tours">
              <Crosshair size={18} />
              Montar tour
            </a>
          </div>
        </article>
      </div>
    </section>
  );
}
