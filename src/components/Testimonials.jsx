import { Quote, Star } from 'lucide-react';
import { SectionHeader } from './SectionHeader';

export function Testimonials({ testimonials }) {
  return (
    <section className="section section--deep" id="depoimentos">
      <div className="shell">
        <SectionHeader
          eyebrow="Depoimentos"
          title="Quem viajou quer repetir"
          text="Confiança cresce quando a experiência é clara, rápida e memorável."
          align="center"
        />

        <div className="testimonial-grid">
          {testimonials.map((item) => (
            <article key={item.id} className="testimonial">
              <Quote size={24} />
              <p>{item.quote}</p>
              <div>
                <strong>{item.name}</strong>
                <span>{item.location}</span>
              </div>
              <span className="stars" aria-label={`${item.score} estrelas`}>
                {Array.from({ length: item.score }).map((_, index) => (
                  <Star key={index} size={15} fill="currentColor" />
                ))}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
