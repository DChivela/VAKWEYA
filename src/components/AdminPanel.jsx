import { Layers3, LockKeyhole, LogOut, Pencil, Plus, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  adminLogin,
  createAdminResource,
  getAdminOverview,
  updateAdminResource
} from '../services/api';
import { SectionHeader } from './SectionHeader';

const tokenKey = 'vakwetu_admin_token';

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
      { name: 'image', label: 'Imagem', placeholder: '/assets/hero-angola.png' },
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
      { name: 'image', label: 'Imagem', placeholder: '/assets/eco-lodge.png' },
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
      { name: 'image', label: 'Imagem', placeholder: '/assets/eco-lodge.png' },
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
      { name: 'image', label: 'Imagem', placeholder: '/assets/waterfall-tour.png' },
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

export function AdminPanel({ catalog, onContentChanged }) {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey));
  const [overview, setOverview] = useState(null);
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [activeResource, setActiveResource] = useState('destinations');
  const [selectedItem, setSelectedItem] = useState(null);

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

  const loadOverview = useCallback(async () => {
    if (!token) {
      return;
    }

    const data = await getAdminOverview(token);
    setOverview(data);
    setStatus({ type: 'success', message: 'Sessão administrativa ativa.' });
  }, [token]);

  useEffect(() => {
    if (!token) {
      setOverview(null);
      return;
    }

    let cancelled = false;
    loadOverview()
      .then(() => {
        if (!cancelled) {
          setStatus((current) => current);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          localStorage.removeItem(tokenKey);
          setToken(null);
          setStatus({ type: 'error', message: error.message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loadOverview, token]);

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
      setToken(data.token);
      setCredentials({ username: '', password: '' });
      setStatus({ type: 'success', message: 'Bem-vindo ao painel.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  function logout() {
    localStorage.removeItem(tokenKey);
    setToken(null);
    setOverview(null);
    setSelectedItem(null);
    setStatus({ type: 'idle', message: '' });
  }

  async function handleContentSaved() {
    await Promise.all([loadOverview(), onContentChanged?.()]);
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
              placeholder="dchivela"
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
              <span>Conteúdos</span>
              <strong>{Object.values(catalogCounts).reduce((sum, total) => sum + total, 0)}</strong>
            </div>
          </div>

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
                      <button
                        className="button button--soft"
                        type="button"
                        onClick={() => setSelectedItem(item)}
                      >
                        <Pencil size={16} />
                        Editar
                      </button>
                    </article>
                  ))}
                  {activeItems.length === 0 && (
                    <p className="empty-state">Ainda não há conteúdos neste separador.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
