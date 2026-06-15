import { LogIn, Sparkles, UserPlus } from 'lucide-react';

export function AccountTeaser() {
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
