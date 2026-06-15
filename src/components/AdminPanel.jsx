import {
  CalendarDays,
  CircleDollarSign,
  Filter,
  Layers3,
  LockKeyhole,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
  X
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  adminLogin,
  createAdminResource,
  deleteAdminResource,
  deleteAdminUser,
  getAdminOverview,
  getAdminReservations,
  getAdminUsers,
  updateAdminUser,
  updateAdminUserRole,
  updateAdminResource
} from '../services/api';
import { FileUploadField } from './FileUploadField';
import { SectionHeader } from './SectionHeader';

const tokenKey = 'vakwetu_admin_token';
const authChangeEvent = 'vakwetu-auth-changed';

function emitAuthChange() {
  window.dispatchEvent(new Event(authChangeEvent));
}

const serviceLabels = {
  destino: 'Destino',
  hotel: 'Hotel',
  restaurante: 'Restaurante',
  tour: 'Tour',
  roteiro: 'Roteiro'
};

const reservationStatusFilters = [
  { value: 'all', label: 'Todas' },
  { value: 'pendente', label: 'Pendentes' },
  { value: 'confirmada', label: 'Confirmadas' },
  { value: 'cancelada', label: 'Canceladas' },
  { value: 'concluida', label: 'Concluídas' }
];

function formatDate(value) {
  if (!value) {
    return 'Data flexível';
  }

  return new Intl.DateTimeFormat('pt-AO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
}

function formatMoney(value) {
  if (!value) {
    return 'A confirmar';
  }

  return `${Number(value).toLocaleString('pt-AO')} Kz`;
}

const resourceConfigs = {
  destinations: {
    label: 'Destinos',
    description: 'Cria páginas de destino com coordenadas para o mapa.',
    fields: [
      { name: 'name', label: 'Nome', required: true, placeholder: 'Huíla sem filtros' },
      { name: 'province', label: 'Província', required: true, placeholder: 'Huíla' },
      { name: 'slug', label: 'Slug', placeholder: 'huila-sem-filtros' },
      { name: 'vibe', label: 'Vibe', placeholder: 'Montanhas, miradouros e cultura' },
      { name: 'duration', label: 'Duração', placeholder: '3 dias' },
      { name: 'priceFrom', label: 'Preço desde', type: 'number', placeholder: '145000' },
      { name: 'rating', label: 'Avaliação', type: 'number', step: '0.1', placeholder: '4.9' },
      { name: 'image', label: 'Imagem', upload: true },
      { name: 'summary', label: 'Resumo', textarea: true, required: true },
      { name: 'lat', label: 'Latitude', type: 'number', step: '0.000001', placeholder: '-14.917' },
      { name: 'lng', label: 'Longitude', type: 'number', step: '0.000001', placeholder: '13.492' },
      { name: 'highlights', label: 'Destaques', placeholder: 'Tundavala, Serra da Leba, Cristo Rei' }
    ]
  },
  hotels: {
    label: 'Hotéis',
    description: 'Adiciona alojamentos disponíveis para reserva.',
    fields: [
      { name: 'name', label: 'Nome', required: true },
      { name: 'destination', label: 'Destino', required: true },
      { name: 'price', label: 'Preço por noite', type: 'number' },
      { name: 'rating', label: 'Avaliação', type: 'number', step: '0.1' },
      { name: 'image', label: 'Imagem', upload: true },
      { name: 'description', label: 'Descrição', textarea: true, required: true },
      { name: 'amenities', label: 'Comodidades', placeholder: 'Wi-Fi, Pequeno-almoço, Transfer' }
    ]
  },
  restaurants: {
    label: 'Restaurantes',
    description: 'Publica restaurantes e experiências gastronómicas.',
    fields: [
      { name: 'name', label: 'Nome', required: true },
      { name: 'destination', label: 'Destino', required: true },
      { name: 'cuisine', label: 'Cozinha', placeholder: 'Angolana contemporânea' },
      { name: 'price', label: 'Preço médio', type: 'number' },
      { name: 'rating', label: 'Avaliação', type: 'number', step: '0.1' },
      { name: 'image', label: 'Imagem', upload: true },
      { name: 'description', label: 'Descrição', textarea: true, required: true }
    ]
  },
  tours: {
    label: 'Tours',
    description: 'Cria tours guiados e experiências de aventura.',
    fields: [
      { name: 'name', label: 'Nome', required: true },
      { name: 'type', label: 'Tipo', placeholder: 'Trilha guiada' },
      { name: 'duration', label: 'Duração', placeholder: '5 horas' },
      { name: 'price', label: 'Preço', type: 'number' },
      { name: 'rating', label: 'Avaliação', type: 'number', step: '0.1' },
      { name: 'image', label: 'Imagem', upload: true },
      { name: 'description', label: 'Descrição', textarea: true, required: true }
    ]
  },
  itineraries: {
    label: 'Roteiros',
    description: 'Monta modelos de roteiros personalizados.',
    fields: [
      { name: 'name', label: 'Nome', required: true },
      { name: 'days', label: 'Dias', type: 'number', placeholder: '3' },
      { name: 'mood', label: 'Mood', placeholder: 'Energia alta' },
      { name: 'budget', label: 'Orçamento', placeholder: 'Médio' },
      { name: 'stops', label: 'Paragens', placeholder: 'Lubango, Tundavala, Serra da Leba' },
      { name: 'includes', label: 'Inclui', placeholder: 'Transporte, Guia, Refeições' }
    ]
  },
  testimonials: {
    label: 'Depoimentos',
    description: 'Adiciona prova social para aumentar confiança.',
    fields: [
      { name: 'name', label: 'Nome', required: true },
      { name: 'location', label: 'Localização', placeholder: 'Luanda' },
      { name: 'quote', label: 'Depoimento', textarea: true, required: true },
      { name: 'score', label: 'Pontuação', type: 'number', min: '1', max: '5', placeholder: '5' }
    ]
  }
};

function buildInitialForm(config) {
  return config.fields.reduce((acc, field) => {
    acc[field.name] = field.defaultValue || '';
    return acc;
  }, {});
}

function serializeItemToForm(resource, item, config) {
  if (!item) {
    return buildInitialForm(config);
  }

  const serializers = {
    destinations: {
      ...item,
      lat: item.coordinates?.lat ?? '',
      lng: item.coordinates?.lng ?? '',
      highlights: item.highlights?.join(', ') || ''
    },
    hotels: {
      ...item,
      amenities: item.amenities?.join(', ') || ''
    },
    restaurants: item,
    tours: item,
    itineraries: {
      ...item,
      stops: item.stops?.join(', ') || '',
      includes: item.includes?.join(', ') || ''
    },
    testimonials: item
  };

  const source = serializers[resource] || item;

  return config.fields.reduce((acc, field) => {
    acc[field.name] = source[field.name] ?? '';
    return acc;
  }, {});
}

function ResourceCreationForm({ activeResource, token, selectedItem, onCancelEdit, onSaved }) {
  const config = resourceConfigs[activeResource];
  const [form, setForm] = useState(() => buildInitialForm(config));
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const isEditing = Boolean(selectedItem);

  useEffect(() => {
    setForm(serializeItemToForm(activeResource, selectedItem, config));
    setStatus({ type: 'idle', message: '' });
  }, [activeResource, config, selectedItem]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function updateFormValue(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({
      type: 'loading',
      message: isEditing ? 'A atualizar conteúdo...' : 'A criar conteúdo...'
    });

    try {
      const payload = isEditing
        ? await updateAdminResource(token, activeResource, selectedItem.id, form)
        : await createAdminResource(token, activeResource, form);

      setForm(buildInitialForm(config));
      setStatus({
        type: 'success',
        message:
          payload.message ||
          (isEditing ? 'Conteúdo atualizado com sucesso.' : 'Conteúdo criado com sucesso.')
      });
      await onSaved();

      if (isEditing) {
        onCancelEdit();
      }
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  return (
    <form className="admin-create-form" onSubmit={handleSubmit}>
      <div className="admin-create-form__header">
        <div>
          <strong>{isEditing ? `Editar ${config.label.toLowerCase()}` : config.label}</strong>
          <p>
            {isEditing
              ? `A alterar "${selectedItem.name}". Guarda para atualizar no site.`
              : config.description}
          </p>
        </div>
        {isEditing ? (
          <button className="icon-button-inline" type="button" onClick={onCancelEdit} aria-label="Cancelar edição">
            <X size={18} />
          </button>
        ) : (
          <Plus size={20} />
        )}
      </div>

      <div className="form-grid">
        {config.fields.map((field) => (
          field.upload ? (
            <div key={field.name} className="field-wide">
              <FileUploadField
                label={field.label}
                value={form[field.name]}
                token={token}
                folder={activeResource}
                onChange={(value) => updateFormValue(field.name, value)}
              />
            </div>
          ) : (
            <label key={field.name} className={field.textarea ? 'field-wide' : ''}>
              {field.label}
              {field.textarea ? (
              <textarea
                name={field.name}
                value={form[field.name]}
                onChange={updateField}
                placeholder={field.placeholder}
                required={field.required}
                rows="4"
              />
              ) : (
              <input
                name={field.name}
                type={field.type || 'text'}
                value={form[field.name]}
                onChange={updateField}
                placeholder={field.placeholder}
                required={field.required}
                min={field.min}
                max={field.max}
                step={field.step}
              />
              )}
            </label>
          )
        ))}
      </div>

      <button className="button button--primary" type="submit">
        {isEditing ? <Pencil size={18} /> : <Plus size={18} />}
        {isEditing ? 'Guardar alterações' : `Criar ${config.label.toLowerCase()}`}
      </button>
      {status.message && <p className={`form-status form-status--${status.type}`}>{status.message}</p>}
    </form>
  );
}

function buildUserForm(user) {
  return {
    username: user?.username || '',
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    avatar: user?.avatar || '',
    role: user?.role || 'cliente',
    password: ''
  };
}

function UserEditModal({ user, token, onClose, onSaved }) {
  const [form, setForm] = useState(() => buildUserForm(user));
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const isRootUser = user?.username === 'dchivela';

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ type: 'loading', message: 'A guardar alteraÃ§Ãµes...' });

    try {
      const payload = await updateAdminUser(token, user.id, {
        ...form,
        username: isRootUser ? 'dchivela' : form.username,
        role: isRootUser ? 'admin' : form.role
      });
      setStatus({ type: 'success', message: payload.message || 'Utilizador atualizado.' });
      await onSaved();
      onClose();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  if (!user) {
    return null;
  }

  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true" aria-label="Editar utilizador">
      <form className="admin-user-modal" onSubmit={handleSubmit}>
        <div className="admin-user-modal__header">
          <div>
            <span>{isRootUser ? 'Conta raiz protegida' : 'Editar utilizador'}</span>
            <strong>{user.name}</strong>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar modal">
            <X size={18} />
          </button>
        </div>

        <FileUploadField
          label="Foto de perfil"
          value={form.avatar}
          token={token}
          folder="avatars"
          compact
          onChange={(avatar) => setForm((current) => ({ ...current, avatar }))}
        />

        <div className="form-grid">
          <label>
            Nome
            <input name="name" value={form.name} onChange={updateField} required />
          </label>
          <label>
            UsuÃ¡rio
            <input
              name="username"
              value={form.username}
              onChange={updateField}
              disabled={isRootUser}
              required
            />
          </label>
          <label>
            Email
            <input type="email" name="email" value={form.email} onChange={updateField} />
          </label>
          <label>
            Telefone
            <input name="phone" value={form.phone} onChange={updateField} />
          </label>
          <label>
            Tipo
            <select name="role" value={form.role} onChange={updateField} disabled={isRootUser}>
              <option value="cliente">Cliente</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
          <label>
            Nova palavra-passe
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={updateField}
              minLength="6"
              autoComplete="new-password"
              placeholder="Deixar vazio para manter"
            />
          </label>
        </div>

        {isRootUser && (
          <p className="admin-root-note">
            A conta dchivela nÃ£o pode ser eliminada, renomeada ou despromovida.
          </p>
        )}

        <div className="admin-user-modal__actions">
          <button className="button button--soft" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="button button--primary" type="submit">
            <Pencil size={18} />
            Guardar alteraÃ§Ãµes
          </button>
        </div>
        {status.message && <p className={`form-status form-status--${status.type}`}>{status.message}</p>}
      </form>
    </div>
  );
}

export function AdminPanel({ catalog, onContentChanged }) {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey));
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [reservationFilter, setReservationFilter] = useState('all');
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [activeResource, setActiveResource] = useState('destinations');
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

  const catalogCounts = useMemo(
    () => ({
      destinations: catalog?.destinations?.length || 0,
      hotels: catalog?.hotels?.length || 0,
      restaurants: catalog?.restaurants?.length || 0,
      tours: catalog?.tours?.length || 0,
      itineraries: catalog?.itineraries?.length || 0,
      testimonials: catalog?.testimonials?.length || 0
    }),
    [catalog]
  );

  const activeItems = catalog?.[activeResource] || [];
  const filteredReservations = useMemo(
    () =>
      reservationFilter === 'all'
        ? reservations
        : reservations.filter((reservation) => reservation.status === reservationFilter),
    [reservationFilter, reservations]
  );

  const loadOverview = useCallback(async () => {
    if (!token) {
      return;
    }

    const data = await getAdminOverview(token);
    setOverview(data);
    setStatus({ type: 'success', message: 'Sessão administrativa ativa.' });
  }, [token]);

  const loadUsers = useCallback(async () => {
    if (!token) {
      return;
    }

    const data = await getAdminUsers(token);
    setUsers(data.users || []);
  }, [token]);

  const loadReservations = useCallback(async () => {
    if (!token) {
      return;
    }

    const data = await getAdminReservations(token);
    setReservations(data.reservations || []);
  }, [token]);

  useEffect(() => {
    if (!token) {
      setOverview(null);
      setUsers([]);
      setReservations([]);
      return;
    }

    let cancelled = false;
    Promise.all([loadOverview(), loadUsers(), loadReservations()])
      .then(() => {
        if (!cancelled) {
          setStatus((current) => current);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          localStorage.removeItem(tokenKey);
          emitAuthChange();
          setToken(null);
          setStatus({ type: 'error', message: error.message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loadOverview, loadReservations, loadUsers, token]);

  function updateField(event) {
    const { name, value } = event.target;
    setCredentials((current) => ({ ...current, [name]: value }));
  }

  async function handleLogin(event) {
    event.preventDefault();
    setStatus({ type: 'loading', message: 'A validar acesso...' });

    try {
      const data = await adminLogin(credentials);
      localStorage.setItem(tokenKey, data.token);
      emitAuthChange();
      setToken(data.token);
      setCredentials({ username: '', password: '' });
      setStatus({ type: 'success', message: 'Bem-vindo ao painel.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  function logout() {
    localStorage.removeItem(tokenKey);
    emitAuthChange();
    setToken(null);
    setOverview(null);
    setUsers([]);
    setReservations([]);
    setSelectedItem(null);
    setEditingUser(null);
    setStatus({ type: 'idle', message: '' });
  }

  async function handleContentSaved() {
    await Promise.all([loadOverview(), onContentChanged?.()]);
  }

  async function handleDeleteContent(item) {
    const confirmed = window.confirm(`Eliminar "${item.name}" deste separador?`);

    if (!confirmed) {
      return;
    }

    setStatus({ type: 'loading', message: 'A eliminar conteÃºdo...' });

    try {
      const payload = await deleteAdminResource(token, activeResource, item.id);
      if (selectedItem?.id === item.id) {
        setSelectedItem(null);
      }
      await handleContentSaved();
      setStatus({ type: 'success', message: payload.message || 'ConteÃºdo eliminado.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  async function handleRoleChange(user, role) {
    setStatus({ type: 'loading', message: 'A atualizar permissÃµes...' });

    try {
      const payload = await updateAdminUserRole(token, user.id, role);
      await loadUsers();
      setStatus({ type: 'success', message: payload.message || 'PermissÃ£o atualizada.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  async function handleUserSaved() {
    await Promise.all([loadUsers(), loadOverview()]);
  }

  async function handleDeleteUser(user) {
    if (user.username === 'dchivela') {
      setStatus({
        type: 'error',
        message: 'A conta raiz dchivela nÃ£o pode ser eliminada.'
      });
      return;
    }

    const confirmed = window.confirm(`Eliminar a conta de "${user.name}"?`);

    if (!confirmed) {
      return;
    }

    setStatus({ type: 'loading', message: 'A eliminar utilizador...' });

    try {
      const payload = await deleteAdminUser(token, user.id);
      if (editingUser?.id === user.id) {
        setEditingUser(null);
      }
      await handleUserSaved();
      setStatus({ type: 'success', message: payload.message || 'Utilizador eliminado.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  function changeResource(resource) {
    setActiveResource(resource);
    setSelectedItem(null);
  }

  return (
    <section className="section shell admin-section" id="admin">
      <SectionHeader
        eyebrow="Administração"
        title="Painel rápido para acompanhar reservas"
        text="Uma área simples para validar pedidos, contactos e indicadores antes de expandir para um backoffice completo."
      />

      {!token ? (
        <form className="admin-login" onSubmit={handleLogin}>
          <label>
            Usuário
            <input
              name="username"
              value={credentials.username}
              onChange={updateField}
              placeholder="dchivela ou admin@vakwetuweya.ao"
              autoComplete="username"
              required
            />
          </label>
          <label>
            Palavra-passe
            <input
              type="password"
              name="password"
              value={credentials.password}
              onChange={updateField}
              placeholder="********"
              autoComplete="current-password"
              required
            />
          </label>
          <button className="button button--dark" type="submit">
            <LockKeyhole size={18} />
            Entrar no painel
          </button>
          {status.message && <p className={`form-status form-status--${status.type}`}>{status.message}</p>}
        </form>
      ) : (
        <div className="admin-dashboard">
          <div className="admin-toolbar">
            <span>
              <ShieldCheck size={18} />
              Acesso raiz ativo
            </span>
            <button className="button button--soft" type="button" onClick={logout}>
              <LogOut size={17} />
              Sair
            </button>
          </div>

          <div className="admin-metrics">
            <div>
              <span>Reservas</span>
              <strong>{overview?.metrics?.reservations ?? 0}</strong>
            </div>
            <div>
              <span>Contactos</span>
              <strong>{overview?.metrics?.contacts ?? 0}</strong>
            </div>
            <div>
              <span>Pendentes</span>
              <strong>{overview?.metrics?.pending ?? 0}</strong>
            </div>
            <div>
              <span>Utilizadores</span>
              <strong>{overview?.metrics?.users ?? users.length}</strong>
            </div>
            <div>
              <span>Conteúdos</span>
              <strong>{Object.values(catalogCounts).reduce((sum, total) => sum + total, 0)}</strong>
            </div>
          </div>

          <section className="admin-reservations-panel">
            <div className="admin-section-title">
              <Filter size={18} />
              <strong>Todas as reservas</strong>
            </div>

            <div className="reservation-filter-tabs" role="tablist" aria-label="Filtrar reservas">
              {reservationStatusFilters.map((filter) => {
                const total =
                  filter.value === 'all'
                    ? reservations.length
                    : reservations.filter((reservation) => reservation.status === filter.value).length;

                return (
                  <button
                    key={filter.value}
                    type="button"
                    className={reservationFilter === filter.value ? 'is-active' : ''}
                    onClick={() => setReservationFilter(filter.value)}
                    role="tab"
                    aria-selected={reservationFilter === filter.value}
                  >
                    {filter.label}
                    <span>{total}</span>
                  </button>
                );
              })}
            </div>

            <div className="reservation-list">
              {filteredReservations.map((reservation) => (
                <article className="reservation-card reservation-card--admin" key={reservation.id}>
                  <div className="reservation-card__top">
                    <div>
                      <span>{serviceLabels[reservation.serviceType] || reservation.serviceType}</span>
                      <strong>{reservation.customerName}</strong>
                    </div>
                    <span className={`status-pill status-pill--${reservation.status}`}>
                      {reservation.status}
                    </span>
                  </div>
                  <div className="reservation-card__meta">
                    <span>{reservation.customerEmail}</span>
                    <span>{reservation.customerPhone}</span>
                    <span>
                      <CalendarDays size={15} />
                      {formatDate(reservation.startDate)} - {formatDate(reservation.endDate)}
                    </span>
                    <span>
                      <CircleDollarSign size={15} />
                      {formatMoney(reservation.budget)}
                    </span>
                    <span>{reservation.travelers} pessoa(s)</span>
                  </div>
                  {reservation.notes && <p>{reservation.notes}</p>}
                </article>
              ))}
              {filteredReservations.length === 0 && (
                <p className="empty-state">Nenhuma reserva encontrada neste filtro.</p>
              )}
            </div>
          </section>

          <div className="admin-content-layout">
            <div>
              <div className="admin-section-title">
                <Layers3 size={18} />
                <strong>Reservas recentes</strong>
              </div>
              <div className="admin-list">
                {(overview?.reservations || []).map((item) => (
                  <article key={item.id}>
                    <div>
                      <strong>{item.customer_name}</strong>
                      <span>{item.service_type} · {item.travelers} pessoa(s)</span>
                    </div>
                    <span className="status-pill">{item.status}</span>
                  </article>
                ))}
                {(overview?.reservations || []).length === 0 && (
                  <p className="empty-state">Ainda não há reservas registadas.</p>
                )}
              </div>
            </div>

            <div className="admin-create-panel">
              <div className="admin-section-title">
                <RefreshCw size={18} />
                <strong>Criar conteúdo</strong>
              </div>
              <div className="admin-resource-tabs" role="tablist" aria-label="Tipos de conteúdo">
                {Object.entries(resourceConfigs).map(([key, config]) => (
                  <button
                    key={key}
                    type="button"
                    className={activeResource === key ? 'is-active' : ''}
                    onClick={() => changeResource(key)}
                    role="tab"
                    aria-selected={activeResource === key}
                  >
                    {config.label}
                    <span>{catalogCounts[key]}</span>
                  </button>
                ))}
              </div>
              <ResourceCreationForm
                activeResource={activeResource}
                token={token}
                selectedItem={selectedItem}
                onCancelEdit={() => setSelectedItem(null)}
                onSaved={handleContentSaved}
              />
              <div className="admin-edit-list">
                <div className="admin-section-title">
                  <Pencil size={18} />
                  <strong>Editar {resourceConfigs[activeResource].label.toLowerCase()}</strong>
                </div>
                <div className="admin-edit-items">
                  {activeItems.map((item) => (
                    <article
                      key={item.id}
                      className={selectedItem?.id === item.id ? 'is-selected' : ''}
                    >
                      {item.image && <img className="admin-item-thumb" src={item.image} alt="" />}
                      <div>
                        <strong>{item.name}</strong>
                        <span>
                          {item.province ||
                            item.destination ||
                            item.type ||
                            item.mood ||
                            item.location ||
                            'Conteúdo'}
                        </span>
                      </div>
                      <div className="admin-item-actions">
                        <button
                          className="button button--soft"
                          type="button"
                          onClick={() => setSelectedItem(item)}
                        >
                          <Pencil size={16} />
                          Editar
                        </button>
                        <button
                          className="button button--danger"
                          type="button"
                          onClick={() => handleDeleteContent(item)}
                        >
                          <Trash2 size={16} />
                          Eliminar
                        </button>
                      </div>
                    </article>
                  ))}
                  {activeItems.length === 0 && (
                    <p className="empty-state">Ainda não há conteúdos neste separador.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <section className="admin-users-panel">
            <div className="admin-section-title">
              <Users size={18} />
              <strong>GestÃ£o de utilizadores</strong>
            </div>
            <div className="admin-user-list">
              {users.map((user) => (
                <article key={user.id}>
                  <img src={user.avatar || '/assets/logo-vakwetu.png'} alt="" />
                  <div>
                    <strong>{user.name}</strong>
                    <span>@{user.username} Â· {user.email || 'sem email'}</span>
                  </div>
                  <span className={user.role === 'admin' ? 'status-pill status-pill--admin' : 'status-pill'}>
                    {user.role}
                  </span>
                  <div className="admin-item-actions">
                    <button className="button button--soft" type="button" onClick={() => setEditingUser(user)}>
                      <Pencil size={16} />
                      Editar
                    </button>
                    <button
                      className="button button--danger"
                      type="button"
                      onClick={() => handleDeleteUser(user)}
                      disabled={user.username === 'dchivela'}
                    >
                      <Trash2 size={16} />
                      {user.username === 'dchivela' ? 'Protegida' : 'Eliminar'}
                    </button>
                  </div>
                </article>
              ))}
              {users.length === 0 && <p className="empty-state">Nenhum utilizador encontrado.</p>}
            </div>
          </section>
          {editingUser && (
            <UserEditModal
              user={editingUser}
              token={token}
              onClose={() => setEditingUser(null)}
              onSaved={handleUserSaved}
            />
          )}
        </div>
      )}
    </section>
  );
}
