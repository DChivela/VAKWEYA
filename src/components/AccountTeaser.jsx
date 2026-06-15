import { LogIn, Sparkles, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';

const userTokenKey = 'vakwetu_user_token';
const adminTokenKey = 'vakwetu_admin_token';
const authChangeEvent = 'vakwetu-auth-changed';

function hasActiveSession() {
  return Boolean(localStorage.getItem(userTokenKey) || localStorage.getItem(adminTokenKey));
}

export function AccountTeaser() {
  const [isAuthenticated, setIsAuthenticated] = useState(hasActiveSession);

  useEffect(() => {
    function syncSession() {
      setIsAuthenticated(hasActiveSession());
    }

    window.addEventListener('storage', syncSession);
    window.addEventListener(authChangeEvent, syncSession);

    return () => {
      window.removeEventListener('storage', syncSession);
      window.removeEventListener(authChangeEvent, syncSession);
    };
  }, []);

  if (isAuthenticated) {
    return null;
  }

  return (
    <section className="account-teaser shell" aria-label="Acesso rápido à conta">
      <div>
        <span>
          <Sparkles size={16} />
          Perfil de viagem
        </span>
        <strong>Cria a tua conta e deixa as próximas reservas mais rápidas.</strong>
      </div>
      <div className="account-teaser__actions">
        <a className="button button--primary" href="/conta">
          <UserPlus size={18} />
          Criar conta
        </a>
        <a className="button button--soft" href="/conta">
          <LogIn size={18} />
          Entrar
        </a>
      </div>
    </section>
  );
}
