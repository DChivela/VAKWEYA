import {
  BadgeCheck,
  CalendarClock,
  CarFront,
  Check,
  MapPin,
  RefreshCw,
  Save,
  UserRoundCheck,
  Users
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  assignReservationDriver,
  getAdminDrivers,
  updateAdminDriver
} from '../services/api';
import { MultiImageUploadField } from './FileUploadField';

const emptyForm = {
  bio: '',
  licenseNumber: '',
  availability: 'offline',
  approved: false,
  latitude: '',
  longitude: '',
  vehicle: {
    make: '',
    model: '',
    year: '',
    licensePlate: '',
    capacity: 4,
    type: '',
    images: ''
  }
};

function formFromDriver(driver) {
  if (!driver) {
    return emptyForm;
  }

  return {
    bio: driver.bio || '',
    licenseNumber: driver.licenseNumber || '',
    availability: driver.availability || 'offline',
    approved: Boolean(driver.approved),
    latitude: driver.location?.lat ?? '',
    longitude: driver.location?.lng ?? '',
    vehicle: {
      make: driver.vehicle?.make || '',
      model: driver.vehicle?.model || '',
      year: driver.vehicle?.year || '',
      licensePlate: driver.vehicle?.licensePlate || '',
      capacity: driver.vehicle?.capacity || 4,
      type: driver.vehicle?.type || '',
      images: driver.vehicle?.images?.join(', ') || ''
    }
  };
}

function formatSchedule(reservation) {
  if (reservation.isImmediate) {
    return 'Imediata';
  }

  if (!reservation.scheduledAt) {
    return 'Horário por confirmar';
  }

  return new Intl.DateTimeFormat('pt-AO', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(reservation.scheduledAt));
}

export function DriverAdminPanel({ token, users, reservations, onReservationsChanged }) {
  const [drivers, setDrivers] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [assignments, setAssignments] = useState({});
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  const driverUsers = useMemo(() => users.filter((user) => user.role === 'motorista'), [users]);
  const tourReservations = useMemo(
    () => reservations.filter((reservation) => reservation.serviceType === 'tour'),
    [reservations]
  );

  const loadDrivers = useCallback(async () => {
    const payload = await getAdminDrivers(token);
    setDrivers(payload.drivers || []);
  }, [token]);

  useEffect(() => {
    loadDrivers().catch((error) => setStatus({ type: 'error', message: error.message }));
  }, [loadDrivers, users]);

  useEffect(() => {
    const user = driverUsers.find((item) => String(item.id) === String(selectedId));
    const driver = drivers.find((item) => String(item.id) === String(selectedId));

    if (!user) {
      setForm(emptyForm);
      return;
    }

    setForm(formFromDriver(driver));
  }, [driverUsers, drivers, selectedId]);

  function updateField(event) {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  }

  function updateVehicle(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      vehicle: { ...current.vehicle, [name]: value }
    }));
  }

  async function saveDriver(event) {
    event.preventDefault();

    if (!selectedId) {
      return;
    }

    setStatus({ type: 'loading', message: 'A guardar motorista e veículo...' });
    try {
      const payload = await updateAdminDriver(token, selectedId, {
        ...form,
        vehicle: {
          ...form.vehicle,
          images: String(form.vehicle.images || '').split(',').map((item) => item.trim()).filter(Boolean)
        }
      });
      await loadDrivers();
      setStatus({ type: 'success', message: payload.message || 'Perfil atualizado.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  async function assignDriver(reservation) {
    const driverId = assignments[reservation.id];

    if (!driverId) {
      setStatus({ type: 'error', message: 'Escolhe um motorista para esta tour.' });
      return;
    }

    setStatus({ type: 'loading', message: 'A atribuir motorista...' });
    try {
      const payload = await assignReservationDriver(token, reservation.id, driverId);
      await Promise.all([loadDrivers(), onReservationsChanged?.()]);
      setStatus({ type: 'success', message: payload.message || 'Motorista atribuído.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  return (
    <div className="admin-driver-sections">
      <section className="admin-driver-panel">
        <div className="admin-section-title">
          <CarFront size={18} />
          <strong>Motoristas e frota</strong>
          <button type="button" className="admin-title-action" onClick={loadDrivers} aria-label="Atualizar motoristas">
            <RefreshCw size={16} />
          </button>
        </div>

        {driverUsers.length === 0 ? (
          <p className="empty-state">Altera o tipo de um utilizador para Motorista e depois completa o perfil aqui.</p>
        ) : (
          <div className="admin-driver-layout">
            <div className="admin-driver-list">
              {driverUsers.map((user) => {
                const driver = drivers.find((item) => Number(item.id) === Number(user.id));
                return (
                  <button
                    type="button"
                    key={user.id}
                    className={String(selectedId) === String(user.id) ? 'is-active' : ''}
                    onClick={() => setSelectedId(user.id)}
                  >
                    <img src={user.avatar || '/assets/logo-vakwetu.png'} alt="" />
                    <span><strong>{user.name}</strong><small>{driver?.vehicle?.model || 'Sem veículo'}</small></span>
                    {driver?.approved && <BadgeCheck size={17} />}
                  </button>
                );
              })}
            </div>

            {selectedId && (
              <form className="admin-driver-form" onSubmit={saveDriver}>
                <div className="form-grid">
                  <label>
                    Carta de condução
                    <input name="licenseNumber" value={form.licenseNumber} onChange={updateField} />
                  </label>
                  <label>
                    Disponibilidade
                    <select name="availability" value={form.availability} onChange={updateField}>
                      <option value="offline">Offline</option>
                      <option value="livre">Livre</option>
                      <option value="ocupado">Ocupado</option>
                    </select>
                  </label>
                  <label>
                    Latitude atual
                    <input type="number" step="0.000001" name="latitude" value={form.latitude} onChange={updateField} />
                  </label>
                  <label>
                    Longitude atual
                    <input type="number" step="0.000001" name="longitude" value={form.longitude} onChange={updateField} />
                  </label>
                  <label className="field-wide">
                    Apresentação
                    <textarea name="bio" value={form.bio} onChange={updateField} rows="3" />
                  </label>
                  <label className="admin-driver-approval field-wide">
                    <input type="checkbox" name="approved" checked={form.approved} onChange={updateField} />
                    <span><UserRoundCheck size={18} /> Motorista aprovado para receber tours</span>
                  </label>
                </div>

                <div className="admin-driver-form__vehicle">
                  <strong>Veículo associado</strong>
                  <div className="form-grid">
                    <label>Marca<input name="make" value={form.vehicle.make} onChange={updateVehicle} /></label>
                    <label>Modelo<input name="model" value={form.vehicle.model} onChange={updateVehicle} /></label>
                    <label>Ano<input type="number" name="year" value={form.vehicle.year} onChange={updateVehicle} /></label>
                    <label>Matrícula<input name="licensePlate" value={form.vehicle.licensePlate} onChange={updateVehicle} /></label>
                    <label>Capacidade<input type="number" min="1" name="capacity" value={form.vehicle.capacity} onChange={updateVehicle} /></label>
                    <label>Tipo<input name="type" value={form.vehicle.type} onChange={updateVehicle} placeholder="SUV, 4x4, Minivan" /></label>
                  </div>
                  <MultiImageUploadField
                    label="Imagens do veículo"
                    value={form.vehicle.images}
                    token={token}
                    folder="vehicles"
                    onChange={(images) => setForm((current) => ({
                      ...current,
                      vehicle: { ...current.vehicle, images }
                    }))}
                  />
                </div>

                <button className="button button--primary" type="submit">
                  <Save size={18} /> Guardar motorista
                </button>
              </form>
            )}
          </div>
        )}
      </section>

      <section className="admin-tour-assignments">
        <div className="admin-section-title">
          <UserRoundCheck size={18} />
          <strong>Atribuição de tours</strong>
        </div>
        <div className="admin-assignment-list">
          {tourReservations.map((reservation) => (
            <article key={reservation.id}>
              <div className="admin-assignment__main">
                <span>Tour #{reservation.id}</span>
                <strong>{reservation.customerName}</strong>
                <div>
                  <span><CalendarClock size={15} /> {formatSchedule(reservation)}</span>
                  <span><Users size={15} /> {reservation.travelers} pessoa(s)</span>
                  <span><MapPin size={15} /> {reservation.tourStops?.length || 0} paragem(ns)</span>
                </div>
                {reservation.tourStops?.length > 0 && (
                  <p>{reservation.tourStops.map((stop) => stop.name).join(' → ')}</p>
                )}
              </div>
              {reservation.driver ? (
                <div className="admin-assignment__assigned">
                  <Check size={18} />
                  <span><strong>{reservation.driver.name}</strong><small>{reservation.driver.vehicle?.model || 'Veículo por confirmar'}</small></span>
                </div>
              ) : (
                <div className="admin-assignment__control">
                  <select
                    value={assignments[reservation.id] || ''}
                    onChange={(event) => setAssignments((current) => ({ ...current, [reservation.id]: event.target.value }))}
                  >
                    <option value="">Escolher motorista aprovado</option>
                    {drivers.filter((driver) => driver.approved).map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name} · {driver.vehicle?.model || 'sem veículo'} · {driver.availability}
                      </option>
                    ))}
                  </select>
                  <button className="button button--primary" type="button" onClick={() => assignDriver(reservation)}>
                    Atribuir
                  </button>
                </div>
              )}
            </article>
          ))}
          {tourReservations.length === 0 && <p className="empty-state">Ainda não há reservas de tour.</p>}
        </div>
      </section>

      {status.message && <p className={`form-status form-status--${status.type}`}>{status.message}</p>}
    </div>
  );
}
