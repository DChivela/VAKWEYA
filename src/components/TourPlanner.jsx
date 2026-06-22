import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  CalendarClock,
  CarFront,
  Check,
  LocateFixed,
  MapPin,
  Navigation,
  Plus,
  RefreshCw,
  Route,
  Trash2,
  Users
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getAvailableDrivers } from '../services/api';
import { tourPlannerReservationLink } from '../services/reservationLinks';
import { SectionHeader } from './SectionHeader';

const DEFAULT_CENTER = [-12.5, 17.5];
const MAX_STOPS = 8;
const DEFAULT_PRICING = {
  basePrice: 100000,
  includedStops: 3,
  extraStopPrice: 25000
};

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString('pt-AO')} Kz`;
}

function minimumSchedule() {
  const now = new Date(Date.now() + 30 * 60 * 1000);
  now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function TourPlanner({ destinations }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const destinationLayerRef = useRef(null);
  const selectionLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const locationLayerRef = useRef(null);
  const driverLayerRef = useRef(null);
  const addMapPointRef = useRef(() => {});
  const [stops, setStops] = useState([]);
  const [isImmediate, setIsImmediate] = useState(true);
  const [scheduledAt, setScheduledAt] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [pricing, setPricing] = useState(DEFAULT_PRICING);
  const [driverStatus, setDriverStatus] = useState({ type: 'loading', message: 'A procurar motoristas...' });
  const [locationStatus, setLocationStatus] = useState('idle');

  const price = useMemo(
    () =>
      pricing.basePrice +
      Math.max(0, stops.length - pricing.includedStops) * pricing.extraStopPrice,
    [pricing, stops.length]
  );
  const canContinue = stops.length > 0 && (isImmediate || Boolean(scheduledAt));
  const continueHref = tourPlannerReservationLink({
    stops,
    isImmediate,
    scheduledAt: isImmediate ? '' : scheduledAt,
    price
  });

  function addStop(stop) {
    setStops((current) => {
      if (current.some((item) => item.id === stop.id) || current.length >= MAX_STOPS) {
        return current;
      }
      return [...current, stop];
    });
  }

  addMapPointRef.current = ({ lat, lng }) => {
    addStop({
      id: `custom-${lat.toFixed(5)}-${lng.toFixed(5)}`,
      name: `Ponto ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      province: 'Ponto personalizado',
      lat,
      lng
    });
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return undefined;
    }

    const map = L.map(containerRef.current, {
      zoomControl: false,
      minZoom: 5
    }).setView(DEFAULT_CENTER, 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    destinationLayerRef.current = L.layerGroup().addTo(map);
    selectionLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    locationLayerRef.current = L.layerGroup().addTo(map);
    driverLayerRef.current = L.layerGroup().addTo(map);
    map.on('click', ({ latlng }) => addMapPointRef.current(latlng));
    mapRef.current = map;
    window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = destinationLayerRef.current;

    if (!layer) {
      return;
    }

    layer.clearLayers();
    destinations.forEach((destination) => {
      L.circleMarker([destination.coordinates.lat, destination.coordinates.lng], {
        radius: 8,
        color: '#ffffff',
        weight: 3,
        fillColor: '#1677ff',
        fillOpacity: 1
      })
        .bindTooltip(`${destination.name} · clicar para adicionar`, {
          direction: 'top',
          offset: [0, -8]
        })
        .on('click', (event) => {
          L.DomEvent.stopPropagation(event.originalEvent);
          addStop({
            id: `destination-${destination.id}`,
            name: destination.name,
            province: destination.province,
            lat: destination.coordinates.lat,
            lng: destination.coordinates.lng
          });
        })
        .addTo(layer);
    });
  }, [destinations]);

  useEffect(() => {
    const selectionLayer = selectionLayerRef.current;
    const routeLayer = routeLayerRef.current;

    if (!selectionLayer || !routeLayer) {
      return;
    }

    selectionLayer.clearLayers();
    routeLayer.clearLayers();
    stops.forEach((stop, index) => {
      L.circleMarker([stop.lat, stop.lng], {
        radius: 11,
        color: '#ffffff',
        weight: 3,
        fillColor: '#f2b705',
        fillOpacity: 1
      })
        .bindTooltip(`${index + 1}. ${stop.name}`, { permanent: true, direction: 'top' })
        .addTo(selectionLayer);
    });

    if (stops.length > 1) {
      L.polyline(stops.map((stop) => [stop.lat, stop.lng]), {
        color: '#473018',
        weight: 5,
        opacity: 0.78,
        dashArray: '10 8'
      }).addTo(routeLayer);
    }
  }, [stops]);

  useEffect(() => {
    const layer = driverLayerRef.current;

    if (!layer) {
      return;
    }

    layer.clearLayers();
    drivers.forEach((driver) => {
      if (!Number.isFinite(driver.location?.lat) || !Number.isFinite(driver.location?.lng)) {
        return;
      }

      L.circleMarker([driver.location.lat, driver.location.lng], {
        radius: 8,
        color: '#ffffff',
        weight: 3,
        fillColor: '#16a34a',
        fillOpacity: 1
      })
        .bindTooltip(`${driver.name} · ${driver.vehicle?.model || 'Motorista'}`)
        .addTo(layer);
    });
  }, [drivers]);

  async function loadDrivers() {
    if (!isImmediate && !scheduledAt) {
      setDrivers([]);
      setDriverStatus({ type: 'idle', message: 'Escolhe a data e hora para consultar disponibilidade.' });
      return;
    }

    setDriverStatus({ type: 'loading', message: 'A consultar disponibilidade...' });
    try {
      const payload = await getAvailableDrivers(isImmediate ? '' : scheduledAt);
      setDrivers(payload.drivers || []);
      setPricing(payload.pricing || DEFAULT_PRICING);
      setDriverStatus({
        type: 'success',
        message: payload.drivers?.length
          ? `${payload.drivers.length} motorista(s) disponível(is). A atribuição final será feita pelo administrador.`
          : 'Nenhum motorista livre neste momento. A equipa pode confirmar outra opção depois do pedido.'
      });
    } catch (error) {
      setDrivers([]);
      setDriverStatus({ type: 'error', message: error.message });
    }
  }

  useEffect(() => {
    loadDrivers();
    const interval = window.setInterval(loadDrivers, 30000);
    return () => window.clearInterval(interval);
  }, [isImmediate, scheduledAt]);

  function locateUser() {
    if (!navigator.geolocation) {
      setLocationStatus('unsupported');
      return;
    }

    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const layer = locationLayerRef.current;
        const map = mapRef.current;

        if (!layer || !map) {
          return;
        }

        layer.clearLayers();
        L.circleMarker([coords.latitude, coords.longitude], {
          radius: 10,
          color: '#ffffff',
          weight: 3,
          fillColor: '#16a34a',
          fillOpacity: 1
        })
          .bindTooltip('Ponto de partida', { permanent: true, direction: 'top' })
          .addTo(layer);
        map.flyTo([coords.latitude, coords.longitude], 12, { duration: 0.8 });
        setLocationStatus('success');
      },
      () => setLocationStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }

  useEffect(() => {
    const timer = window.setTimeout(locateUser, 450);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="section tour-planner" id="planeador-tour">
      <div className="shell">
        <SectionHeader
          eyebrow="Tour à tua medida"
          title="Marca os pontos e vê o preço na hora"
          text="Clica nos destinos ou em qualquer ponto do mapa. Os três primeiros destinos ficam incluídos no preço base."
        />

        <div className="tour-planner__layout">
          <div className="tour-planner__map-wrap">
            <div ref={containerRef} className="leaflet-map leaflet-map--planner" aria-label="Planeador de tour em Angola" />
            <button className="map-locate-button" type="button" onClick={locateUser}>
              <LocateFixed size={18} />
              {locationStatus === 'loading' ? 'A localizar...' : 'Usar a minha localização'}
            </button>
            <span className="tour-planner__map-hint">
              <Plus size={15} /> Clica no mapa para adicionar uma paragem
            </span>
          </div>

          <aside className="tour-planner__panel">
            <div className="tour-price">
              <span>Estimativa da tour</span>
              <strong>{formatMoney(price)}</strong>
              <small>
                Até {pricing.includedStops} destinos: {formatMoney(pricing.basePrice)} · cada extra: +{formatMoney(pricing.extraStopPrice)}
              </small>
            </div>

            <div className="tour-stop-list">
              <div className="tour-panel-title">
                <Route size={18} />
                <strong>Paragens ({stops.length}/{MAX_STOPS})</strong>
                {stops.length > 0 && (
                  <button type="button" onClick={() => setStops([])} aria-label="Limpar todas as paragens">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              {stops.map((stop, index) => (
                <div className="tour-stop" key={stop.id}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{stop.name}</strong>
                    <small>{stop.province}</small>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStops((current) => current.filter((item) => item.id !== stop.id))}
                    aria-label={`Remover ${stop.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              {stops.length === 0 && (
                <p className="empty-state">Seleciona pelo menos um destino no mapa.</p>
              )}
            </div>

            <div className="tour-schedule">
              <div className="tour-panel-title">
                <CalendarClock size={18} />
                <strong>Quando?</strong>
              </div>
              <div className="segmented-control tour-schedule__modes">
                <button type="button" className={isImmediate ? 'is-active' : ''} onClick={() => setIsImmediate(true)}>
                  Agora
                </button>
                <button type="button" className={!isImmediate ? 'is-active' : ''} onClick={() => setIsImmediate(false)}>
                  Agendar
                </button>
              </div>
              {!isImmediate && (
                <label>
                  Data e hora
                  <input
                    type="datetime-local"
                    min={minimumSchedule()}
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                  />
                </label>
              )}
            </div>

            <div className="tour-driver-preview">
              <div className="tour-panel-title">
                <CarFront size={18} />
                <strong>Motoristas disponíveis</strong>
                <button type="button" onClick={loadDrivers} aria-label="Atualizar motoristas">
                  <RefreshCw size={16} />
                </button>
              </div>
              {drivers.slice(0, 4).map((driver) => (
                <article className="driver-option" key={driver.id}>
                  <img src={driver.avatar || '/assets/logo-vakwetu.png'} alt="" />
                  <div>
                    <strong>{driver.name}</strong>
                    <span>{driver.vehicle ? `${driver.vehicle.make} ${driver.vehicle.model}` : 'Veículo por confirmar'}</span>
                  </div>
                  <span><Users size={14} /> {driver.vehicle?.capacity || '—'}</span>
                </article>
              ))}
              <p className={`tour-driver-status tour-driver-status--${driverStatus.type}`}>
                {driverStatus.message}
              </p>
            </div>

            <a
              className={canContinue ? 'button button--primary tour-continue' : 'button button--primary tour-continue is-disabled'}
              href={canContinue ? continueHref : '#planeador-tour'}
              aria-disabled={!canContinue}
              onClick={(event) => {
                if (!canContinue) {
                  event.preventDefault();
                }
              }}
            >
              {canContinue ? <Check size={18} /> : <MapPin size={18} />}
              {canContinue ? 'Continuar para confirmação' : 'Seleciona a rota'}
              {canContinue && <Navigation size={17} />}
            </a>
          </aside>
        </div>
      </div>
    </section>
  );
}
