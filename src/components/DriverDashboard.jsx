import { CalendarClock, CarFront, LocateFixed, MapPin, ShieldCheck, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getDriverDashboard, updateDriverAvailability } from '../services/api';

function formatSchedule(tour) {
  if (tour.isImmediate) {
    return 'Tour imediata';
  }

  if (!tour.scheduledAt) {
    return 'Horário por confirmar';
  }

  return new Intl.DateTimeFormat('pt-AO', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(tour.scheduledAt));
}

export function DriverDashboard({ token }) {
  const [driver, setDriver] = useState(null);
  const [tours, setTours] = useState([]);
  const [status, setStatus] = useState({ type: 'loading', message: 'A carregar perfil de motorista...' });

  async function loadDashboard() {
    try {
      const payload = await getDriverDashboard(token);
      setDriver(payload.driver);
      setTours(payload.tours || []);
      setStatus({ type: 'success', message: '' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [token]);

  async function changeAvailability(availability, coordinates = {}) {
    setStatus({ type: 'loading', message: 'A atualizar disponibilidade...' });
    try {
      await updateDriverAvailability(token, { availability, ...coordinates });
      await loadDashboard();
      setStatus({ type: 'success', message: 'Disponibilidade atualizada.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  function shareLocation() {
    if (!navigator.geolocation) {
      setStatus({ type: 'error', message: 'Este dispositivo não suporta geolocalização.' });
      return;
    }

    setStatus({ type: 'loading', message: 'A obter localização...' });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => changeAvailability(driver?.availability || 'livre', {
        latitude: coords.latitude,
        longitude: coords.longitude
      }),
      () => setStatus({ type: 'error', message: 'Não foi possível obter a localização.' }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }

  return (
    <div className="driver-dashboard">
      <div className="driver-dashboard__header">
        <div>
          <span><CarFront size={17} /> Área do motorista</span>
          <strong>{driver?.approved ? 'Perfil aprovado' : 'A aguardar aprovação administrativa'}</strong>
        </div>
        {driver?.approved && <ShieldCheck size={25} />}
      </div>

      <div className="driver-availability">
        <span>Disponibilidade</span>
        <div className="segmented-control">
          {['offline', 'livre', 'ocupado'].map((value) => (
            <button
              type="button"
              key={value}
              className={driver?.availability === value ? 'is-active' : ''}
              onClick={() => changeAvailability(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <button className="button button--soft" type="button" onClick={shareLocation}>
          <LocateFixed size={17} /> Atualizar localização
        </button>
      </div>

      {driver?.vehicle && (
        <div className="driver-vehicle-summary">
          {(driver.vehicle.images || []).slice(0, 1).map((image) => <img src={image} alt="" key={image} />)}
          <div>
            <span>{driver.vehicle.type || 'Veículo'}</span>
            <strong>{driver.vehicle.make} {driver.vehicle.model}</strong>
            <p>{driver.vehicle.licensePlate} · {driver.vehicle.capacity} passageiro(s)</p>
          </div>
        </div>
      )}

      <div className="driver-tour-history">
        <strong>Tours atribuídas</strong>
        {tours.map((tour) => (
          <article key={tour.id}>
            <div>
              <span>Tour #{tour.id}</span>
              <strong>{tour.customerName}</strong>
            </div>
            <div>
              <span><CalendarClock size={15} /> {formatSchedule(tour)}</span>
              <span><Users size={15} /> {tour.travelers} pessoa(s)</span>
              <span><MapPin size={15} /> {tour.tourStops?.length || 0} paragem(ns)</span>
            </div>
            {tour.tourStops?.length > 0 && <p>{tour.tourStops.map((stop) => stop.name).join(' → ')}</p>}
          </article>
        ))}
        {tours.length === 0 && <p className="empty-state">Ainda não tens tours atribuídas.</p>}
      </div>

      {status.message && <p className={`form-status form-status--${status.type}`}>{status.message}</p>}
    </div>
  );
}
