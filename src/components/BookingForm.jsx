import { Calculator, CalendarCheck, CheckCircle2, RotateCcw, Send, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createReservation, getCurrentUser } from '../services/api';
import { parseReservationSearch } from '../services/reservationLinks';
import { SectionHeader } from './SectionHeader';

const authTokenKey = 'vakwetu_user_token';
const authChangeEvent = 'vakwetu-auth-changed';

const initialForm = {
  serviceType: 'tour',
  serviceId: '',
  name: '',
  email: '',
  phone: '',
  travelers: 2,
  startDate: '',
  endDate: '',
  budget: '',
  notes: ''
};

const serviceLabels = {
  destino: 'Destino',
  hotel: 'Hotel',
  restaurante: 'Restaurante',
  tour: 'Tour',
  roteiro: 'Roteiro personalizado'
};

const allowedServiceTypes = Object.keys(serviceLabels);

function getTravelerCount(value) {
  const travelers = Number(value);
  return Number.isFinite(travelers) && travelers > 0 ? travelers : 1;
}

function getNightCount(startDate, endDate) {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 1;
  }

  const difference = end.getTime() - start.getTime();
  const nights = Math.ceil(difference / 86400000);
  return nights > 0 ? nights : 1;
}

function formatMoney(value) {
  return Number(value).toLocaleString('pt-AO');
}

function getSuggestedBudget(serviceType, selectedService, form) {
  if (!selectedService) {
    return null;
  }

  const travelers = getTravelerCount(form.travelers);

  if (serviceType === 'hotel') {
    const price = Number(selectedService.price || 0);

    if (!price) {
      return null;
    }

    const nights = getNightCount(form.startDate, form.endDate);
    const rooms = Math.max(1, Math.ceil(travelers / 2));

    return {
      value: price * nights * rooms,
      description: `${rooms} quarto(s) x ${nights} noite(s), com base no preço por noite.`
    };
  }

  if (serviceType === 'restaurante' || serviceType === 'tour') {
    const price = Number(selectedService.price || 0);

    if (!price) {
      return null;
    }

    return {
      value: price * travelers,
      description: `${travelers} pessoa(s) x ${formatMoney(price)} Kz por pessoa.`
    };
  }

  if (serviceType === 'destino') {
    const price = Number(selectedService.priceFrom || 0);

    if (!price) {
      return null;
    }

    return {
      value: price * travelers,
      description: `${travelers} pessoa(s) x valor desde ${formatMoney(price)} Kz.`
    };
  }

  return null;
}

export function BookingForm({ destinations, hotels, restaurants, tours, itineraries, currentSearch = '' }) {
  const [form, setForm] = useState(initialForm);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem(authTokenKey));
  const [budgetEdited, setBudgetEdited] = useState(false);
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  const serviceOptions = useMemo(() => {
    const groups = {
      destino: destinations,
      hotel: hotels,
      restaurante: restaurants,
      tour: tours,
      roteiro: itineraries
    };

    return groups[form.serviceType] || [];
  }, [destinations, form.serviceType, hotels, itineraries, restaurants, tours]);

  const selectedService = useMemo(
    () => serviceOptions.find((option) => String(option.id) === String(form.serviceId)),
    [form.serviceId, serviceOptions]
  );

  const suggestedBudget = useMemo(
    () => getSuggestedBudget(form.serviceType, selectedService, form),
    [form, selectedService]
  );

  useEffect(() => {
    function syncToken() {
      setAuthToken(localStorage.getItem(authTokenKey));
    }

    window.addEventListener('storage', syncToken);
    window.addEventListener(authChangeEvent, syncToken);

    return () => {
      window.removeEventListener('storage', syncToken);
      window.removeEventListener(authChangeEvent, syncToken);
    };
  }, []);

  useEffect(() => {
    if (!authToken) {
      return;
    }

    let cancelled = false;
    getCurrentUser(authToken)
      .then((payload) => {
        if (cancelled || !payload.user) {
          return;
        }

        setForm((current) => ({
          ...current,
          name: current.name || payload.user.name || '',
          email: current.email || payload.user.email || '',
          phone: current.phone || payload.user.phone || ''
        }));
      })
      .catch(() => {
        localStorage.removeItem(authTokenKey);
        setAuthToken(null);
      });

    return () => {
      cancelled = true;
    };
  }, [authToken]);

  useEffect(() => {
    const { serviceType, serviceId } = parseReservationSearch(currentSearch || window.location.search);

    if (!allowedServiceTypes.includes(serviceType)) {
      return;
    }

    setForm((current) => ({
      ...current,
      serviceType,
      serviceId: serviceId || current.serviceId
    }));
    setBudgetEdited(false);
  }, [currentSearch]);

  useEffect(() => {
    if (!suggestedBudget || budgetEdited) {
      return;
    }

    setForm((current) => {
      const budget = String(suggestedBudget.value);

      if (String(current.budget) === budget) {
        return current;
      }

      return { ...current, budget };
    });
  }, [budgetEdited, suggestedBudget]);

  function updateField(event) {
    const { name, value } = event.target;

    if (name === 'budget') {
      setBudgetEdited(true);
    }

    if (name === 'serviceType' || name === 'serviceId') {
      setBudgetEdited(false);
    }

    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'serviceType' ? { serviceId: '', budget: '' } : {})
    }));
  }

  function useSuggestedBudget() {
    if (!suggestedBudget) {
      return;
    }

    setBudgetEdited(false);
    setForm((current) => ({ ...current, budget: String(suggestedBudget.value) }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ type: 'loading', message: 'A preparar a tua reserva...' });

    try {
      const payload = await createReservation({
        ...form,
        travelers: Number(form.travelers),
        budget: form.budget ? Number(form.budget) : null
      }, authToken);

      setForm((current) => ({
        ...initialForm,
        serviceType: current.serviceType,
        serviceId: current.serviceId
      }));
      setBudgetEdited(false);
      setStatus({
        type: 'success',
        message:
          payload.message ||
          'Reserva enviada. A equipa Vakwetu Weya vai confirmar os detalhes contigo.'
      });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  return (
    <section className="section booking-section" id="reservas">
      <div className="shell booking-layout">
        <div>
          <SectionHeader
            eyebrow="Reserva simples"
            title="Conta-nos o plano. Nós alinhamos a experiência."
            text="Recebe feedback imediato, confirma serviços e ajusta o roteiro ao orçamento do teu grupo."
          />
          <div className="booking-benefits">
            <div>
              <Sparkles size={20} />
              <span>Recomendações por perfil de viagem</span>
            </div>
            <div>
              <CalendarCheck size={20} />
              <span>Datas, grupo e orçamento num só pedido</span>
            </div>
            <div>
              <CheckCircle2 size={20} />
              <span>Confirmação clara antes de fechar pagamento</span>
            </div>
          </div>
        </div>

        <form className="booking-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Serviço
              <select name="serviceType" value={form.serviceType} onChange={updateField}>
                {Object.entries(serviceLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Escolha
              <select name="serviceId" value={form.serviceId} onChange={updateField}>
                <option value="">Sugestão aberta</option>
                {serviceOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Nome
              <input
                name="name"
                value={form.name}
                onChange={updateField}
                placeholder="O teu nome"
                required
              />
            </label>

            <label>
              Email
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={updateField}
                placeholder="email@exemplo.com"
                required
              />
            </label>

            <label>
              Telefone
              <input
                name="phone"
                value={form.phone}
                onChange={updateField}
                placeholder="+244 ..."
                required
              />
            </label>

            <label>
              Pessoas
              <input
                type="number"
                min="1"
                max="30"
                name="travelers"
                value={form.travelers}
                onChange={updateField}
              />
            </label>

            <label>
              Chegada
              <input type="date" name="startDate" value={form.startDate} onChange={updateField} />
            </label>

            <label>
              Saída
              <input type="date" name="endDate" value={form.endDate} onChange={updateField} />
            </label>
          </div>

          {selectedService && (
            <div className="booking-context" role="status">
              <span>{serviceLabels[form.serviceType]}</span>
              <strong>{selectedService.name}</strong>
              <p>
                A tua reserva já está preparada para esta seleção. Confirma os teus dados
                e envia o pedido.
              </p>
            </div>
          )}

          <label>
            Orçamento aproximado
            <input
              type="number"
              min="0"
              name="budget"
              value={form.budget}
              onChange={updateField}
              placeholder="Ex.: 250000"
            />
          </label>

          {suggestedBudget && (
            <div className="budget-suggestion" role="status">
              <Calculator size={18} />
              <div>
                <strong>Estimativa: {formatMoney(suggestedBudget.value)} Kz</strong>
                <span>{suggestedBudget.description}</span>
              </div>
              {budgetEdited && (
                <button type="button" className="budget-suggestion__reset" onClick={useSuggestedBudget}>
                  <RotateCcw size={15} />
                  Usar
                </button>
              )}
            </div>
          )}

          <label>
            Detalhes do plano
            <textarea
              name="notes"
              value={form.notes}
              onChange={updateField}
              rows="4"
              placeholder="Quero algo aventureiro, com hotel, almoço local e transporte..."
            />
          </label>

          <button className="button button--primary form-submit" type="submit">
            <Send size={18} />
            {status.type === 'loading' ? 'A enviar...' : 'Enviar reserva'}
          </button>

          {status.message && (
            <p className={`form-status form-status--${status.type}`} role="status">
              {status.message}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
