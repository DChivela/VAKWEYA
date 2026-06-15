import { Compass } from 'lucide-react';
import { reservationLink } from '../services/reservationLinks';
import { ExperienceCard } from './ExperienceCard';
import { SectionHeader } from './SectionHeader';

export function Destinations({ destinations }) {
  return (
    <section className="section shell" id="destinos">
      <SectionHeader
        eyebrow="Destinos"
        title="Roteiros com paisagens fortes e ritmo jovem"
        text="Escolhe uma base, combina experiências e deixa a reserva pronta em poucos passos."
      />
      <div className="destination-grid">
        {destinations.map((destination) => (
          <ExperienceCard
            key={destination.id}
            image={destination.image}
            title={destination.name}
            subtitle={destination.province}
            text={destination.summary}
            price={destination.priceFrom}
            rating={destination.rating}
            tags={[destination.duration, destination.vibe]}
            action="Planear"
            actionHref={reservationLink('destino', destination)}
          />
        ))}
      </div>
      <a className="section-link" href="/mapa">
        <Compass size={18} />
        Ver no mapa interativo
      </a>
    </section>
  );
}
