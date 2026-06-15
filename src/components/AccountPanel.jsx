import { CalendarDays, CircleDollarSign, History, LogIn, LogOut, ShieldCheck, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCurrentUser, getMyReservations, loginUser, registerUser } from '../services/api';
import { FileUploadField } from './FileUploadField';
import { SectionHeader } from './SectionHeader';

const authTokenKey = 'vakwetu_user_token';
const authChangeEvent = 'vakwetu-auth-changed';

const emptyLogin = {
  username: '',
  password: ''
};

const emptyRegister = {
  username: '',
  name: '',
  email: '',
  phone: '',
  password: '',
  avatar: ''
};

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

function ReservationHistory({ token }) {
  const [reservations, setReservations] = useState([]);
  const [status, setStatus] = useState({ type: 'loading', message: 'A carregar reservas...' });

  useEffect(() => {
    if (!token) {
      setReservations([]);
      setStatus({ type: 'idle', message: '' });
      return;
    }

    let cancelled = false;
    setStatus({ type: 'loading', message: 'A carregar reservas...' });

    getMyReservations(token)
      .then((payload) => {
        if (cancelled) {
          return;
        }

        setReservations(payload.reservations || []);
        setStatus({ type: 'success', message: '' });
      })
      .catch((error) => {
        if (!cancelled) {
          setStatus({ type: 'error', message: error.message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="reservation-history">
      <div className="reservation-history__header">
        <div>
          <span>
            <History size={16} />
            Histórico
          </span>
          <strong>Minhas reservas</strong>
        </div>
        <a className="button button--soft" href="/reservas">
          Nova reserva
        </a>
      </div>

      {status.type === 'loading' && <p className="empty-state">{status.message}</p>}
      {status.type === 'error' && <p className="form-status form-status--error">{status.message}</p>}

      {status.type !== 'loading' && status.type !== 'error' && reservations.length === 0 && (
        <p className="empty-state">
          Ainda não há reservas ligadas à tua conta. Quando criares uma reserva com sessão iniciada,
          ela aparece aqui.
        </p>
      )}

      {reservations.length > 0 && (
        <div className="reservation-list reservation-list--compact">
          {reservations.map((reservation) => (
            <article className="reservation-card" key={reservation.id}>
              <div className="reservation-card__top">
                <div>
                  <span>{serviceLabels[reservation.serviceType] || reservation.serviceType}</span>
                  <strong>Pedido #{reservation.id}</strong>
                </div>
                <span className={`status-pill status-pill--${reservation.status}`}>
                  {reservation.status}
                </span>
              </div>
              <div className="reservation-card__meta">
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
        </div>
      )}
    </div>
  );
}

export function AccountPanel() {
  const [mode, setMode] = useState('login');
  const [token, setToken] = useState(() => localStorage.getItem(authTokenKey));
  const [user, setUser] = useState(null);
  const [loginForm, setLoginForm] = useState(emptyLogin);
  const [registerForm, setRegisterForm] = useState(emptyRegister);
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    let cancelled = false;
    getCurrentUser(token)
      .then((payload) => {
        if (!cancelled) {
          setUser(payload.user);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          localStorage.removeItem(authTokenKey);
          emitAuthChange();
          setToken(null);
          setStatus({ type: 'error', message: error.message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  function updateLoginField(event) {
    const { name, value } = event.target;
    setLoginForm((current) => ({ ...current, [name]: value }));
  }

  function updateRegisterField(event) {
    const { name, value } = event.target;
    setRegisterForm((current) => ({ ...current, [name]: value }));
  }

  async function handleLogin(event) {
    event.preventDefault();
    setStatus({ type: 'loading', message: 'A entrar...' });

    try {
      const payload = await loginUser(loginForm);
      localStorage.setItem(authTokenKey, payload.token);
      emitAuthChange();
      setToken(payload.token);
      setUser(payload.user);
      setLoginForm(emptyLogin);
      setStatus({ type: 'success', message: 'Sessão iniciada.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setStatus({ type: 'loading', message: 'A criar conta...' });

    try {
      const payload = await registerUser(registerForm);
      localStorage.setItem(authTokenKey, payload.token);
      emitAuthChange();
      setToken(payload.token);
      setUser(payload.user);
      setRegisterForm(emptyRegister);
      setStatus({ type: 'success', message: 'Conta criada com sucesso.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  function logout() {
    localStorage.removeItem(authTokenKey);
    emitAuthChange();
    setToken(null);
    setUser(null);
    setStatus({ type: 'idle', message: '' });
  }

  return (
    <section className="section shell account-section" id="conta">
      <SectionHeader
        eyebrow="Conta"
        title="O teu perfil Vakwetu Weya"
        text="Cria uma conta, guarda a tua identidade de viagem e mantém o acesso pronto para futuras reservas."
      />

      {user ? (
        <div className="account-profile">
          <div className="account-profile__hero">
            <img src={user.avatar || '/assets/logo-vakwetu.png'} alt="" />
            <div>
              <span>{user.role === 'admin' ? 'Administrador' : 'Viajante'}</span>
              <h3>{user.name}</h3>
              <p>@{user.username}</p>
            </div>
          </div>
          <div className="account-profile__details">
            <span>{user.email || 'Email não definido'}</span>
            <span>{user.phone || 'Telefone não definido'}</span>
          </div>
          <div className="account-profile__actions">
            {user.role === 'admin' && (
              <a className="button button--primary" href="/admin">
                <ShieldCheck size={18} />
                Abrir painel admin
              </a>
            )}
            <button className="button button--soft" type="button" onClick={logout}>
              <LogOut size={17} />
              Sair
            </button>
          </div>
          <ReservationHistory token={token} />
        </div>
      ) : (
        <div className="account-auth">
          <div className="account-tabs" role="tablist" aria-label="Acesso de utilizador">
            <button
              type="button"
              className={mode === 'login' ? 'is-active' : ''}
              onClick={() => setMode('login')}
              role="tab"
              aria-selected={mode === 'login'}
            >
              Entrar
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'is-active' : ''}
              onClick={() => setMode('register')}
              role="tab"
              aria-selected={mode === 'register'}
            >
              Criar conta
            </button>
          </div>

          {mode === 'login' ? (
            <form className="account-form" onSubmit={handleLogin}>
              <label>
                Usuário
                <input
                  name="username"
                  value={loginForm.username}
                  onChange={updateLoginField}
                  placeholder="Usuario ou email"
                  autoComplete="username"
                  required
                />
              </label>
              <label>
                Palavra-passe
                <input
                  type="password"
                  name="password"
                  value={loginForm.password}
                  onChange={updateLoginField}
                  autoComplete="current-password"
                  required
                />
              </label>
              <button className="button button--primary" type="submit">
                <LogIn size={18} />
                Entrar
              </button>
            </form>
          ) : (
            <form className="account-form" onSubmit={handleRegister}>
              <FileUploadField
                label="Foto de perfil"
                value={registerForm.avatar}
                folder="avatars"
                onChange={(avatar) => setRegisterForm((current) => ({ ...current, avatar }))}
              />
              <div className="form-grid">
                <label>
                  Nome
                  <input name="name" value={registerForm.name} onChange={updateRegisterField} required />
                </label>
                <label>
                  Usuário
                  <input
                    name="username"
                    value={registerForm.username}
                    onChange={updateRegisterField}
                    autoComplete="username"
                    required
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    name="email"
                    value={registerForm.email}
                    onChange={updateRegisterField}
                    autoComplete="email"
                  />
                </label>
                <label>
                  Telefone
                  <input name="phone" value={registerForm.phone} onChange={updateRegisterField} />
                </label>
                <label className="field-wide">
                  Palavra-passe
                  <input
                    type="password"
                    name="password"
                    value={registerForm.password}
                    onChange={updateRegisterField}
                    autoComplete="new-password"
                    minLength="6"
                    required
                  />
                </label>
              </div>
              <button className="button button--primary" type="submit">
                <UserPlus size={18} />
                Criar conta
              </button>
            </form>
          )}

          {status.message && <p className={`form-status form-status--${status.type}`}>{status.message}</p>}
        </div>
      )}
    </section>
  );
}
