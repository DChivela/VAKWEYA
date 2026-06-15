import { Mail, MapPin, Phone, Send } from 'lucide-react';
import { useState } from 'react';
import { sendContactMessage } from '../services/api';
import { SectionHeader } from './SectionHeader';

const initialContact = {
  name: '',
  email: '',
  subject: '',
  message: ''
};

export function ContactSection() {
  const [form, setForm] = useState(initialContact);
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ type: 'loading', message: 'A enviar mensagem...' });

    try {
      const payload = await sendContactMessage(form);
      setForm(initialContact);
      setStatus({
        type: 'success',
        message: payload.message || 'Mensagem enviada. Vamos responder em breve.'
      });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  return (
    <section className="section contact-section" id="contacto">
      <div className="shell contact-layout">
        <div>
          <SectionHeader
            eyebrow="Contacto"
            title="Tens uma ideia de viagem? Fala connosco."
            text="A equipa ajuda a escolher destino, ajustar datas e montar uma experiência à tua medida."
          />
          <div className="contact-cards">
            <a href="tel:+244900000000">
              <Phone size={20} />
              +244 900 000 000
            </a>
            {/* <a href="mailto:reservas@vakwetuweya.ao"> */}
              <a href="mailto:reservas@vakwetuweya.ao">
              <Mail size={20} />
              reservas@vakwetuweya.ao
            </a>
            <span>
              <MapPin size={20} />
              Angola · Experiências nacionais
            </span>
          </div>
        </div>

        <form className="contact-form" onSubmit={handleSubmit}>
          <label>
            Nome
            <input name="name" value={form.name} onChange={updateField} required />
          </label>
          <label>
            Email
            <input type="email" name="email" value={form.email} onChange={updateField} required />
          </label>
          <label>
            Assunto
            <input name="subject" value={form.subject} onChange={updateField} required />
          </label>
          <label>
            Mensagem
            <textarea name="message" value={form.message} onChange={updateField} rows="5" required />
          </label>
          <button className="button button--primary" type="submit">
            <Send size={18} />
            {status.type === 'loading' ? 'A enviar...' : 'Enviar mensagem'}
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
