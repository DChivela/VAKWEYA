import { BedDouble, ChefHat, Mountain, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { reservationLink } from '../services/reservationLinks';
import { ExperienceCard } from './ExperienceCard';
import { SectionHeader } from './SectionHeader';

const tabs = [
  { id: 'hotels', label: 'Hotéis', icon: BedDouble },
  { id: 'restaurants', label: 'Restaurantes', icon: ChefHat },
  { id: 'tours', label: 'Tours', icon: Mountain }
];

export function Services({ hotels, restaurants, tours }) {
  const [active, setActive] = useState('hotels');

  const items = useMemo(() => {
    if (active === 'restaurants') {
      return restaurants.map((item) => ({
        ...item,
        subtitle: `${item.destination} · ${item.cuisine}`,
        text: item.description,
        tags: ['Mesa reservável', 'Grupos', 'Confirmação rápida'],
        action: 'Reservar mesa',
        actionHref: reservationLink('restaurante', item)
      }));
    }

    if (active === 'tours') {
      return tours.map((item) => ({
        ...item,
        subtitle: `${item.type} · ${item.duration}`,
        text: item.description,
        tags: ['Guia local', 'Seguro básico', 'Fotos'],
        action: 'Entrar no tour',
        actionHref: reservationLink('tour', item)
      }));
    }

    return hotels.map((item) => ({
      ...item,
      subtitle: item.destination,
      text: item.description,
      tags: item.amenities.slice(0, 3),
      action: 'Reservar quarto',
      actionHref: reservationLink('hotel', item)
    }));
  }, [active, hotels, restaurants, tours]);

  return (
    <section className="section section--tinted" id="servicos">
      <div className="shell">
        <SectionHeader
          eyebrow="Reservas"
          title="Tudo o que precisas para sair do plano para a viagem"
          text="Hotéis, restaurantes e tours organizados para comparar rápido e reservar sem ruído."
        />

        <div className="segmented-control" role="tablist" aria-label="Tipos de serviço">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={active === id ? 'is-active' : ''}
              onClick={() => setActive(id)}
              role="tab"
              aria-selected={active === id}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>

        <div className="service-grid">
          {items.map((item) => (
            <ExperienceCard
              key={`${active}-${item.id}`}
              image={item.image}
              title={item.name}
              subtitle={item.subtitle}
              text={item.text}
              price={item.price}
              rating={item.rating}
              tags={item.tags}
              action={item.action}
              actionHref={item.actionHref}
            />
          ))}
        </div>

        <div className="custom-route" id="tours">
          <SlidersHorizontal size={22} />
          <div>
            <strong>Roteiro personalizado</strong>
            <p>
              Mistura hotel, restaurante, guia, transporte e paragens culturais num
              plano com orçamento ajustado ao teu grupo.
            </p>
          </div>
          <a className="button button--dark" href="/roteiros">
            Montar roteiro
          </a>
        </div>
      </div>
    </section>
  );
}
