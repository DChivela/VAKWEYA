import { BadgeCheck, Globe2, HeartHandshake } from 'lucide-react';
import { assets } from '../data/catalog';
import { SectionHeader } from './SectionHeader';

export function AboutSection() {
  return (
    <section className="section shell about-section" id="sobre">
      <div className="about-media">
        <img src={assets.logo} alt="Logotipo Vakwetu Weya Angola" loading="lazy" />
      </div>
      <div className="about-copy">
        <SectionHeader
          eyebrow="Sobre nós"
          title="Vakwetu Weya é convite, guia e ponte para Angola"
          text="Criamos uma experiência digital mais visual, rápida e confiável para transformar curiosidade em viagem marcada."
        />
        <div className="about-values">
          <div>
            <Globe2 size={21} />
            <span>Turismo local com alcance moderno</span>
          </div>
          <div>
            <HeartHandshake size={21} />
            <span>Reservas acompanhadas por pessoas reais</span>
          </div>
          <div>
            <BadgeCheck size={21} />
            <span>Base preparada para conteúdos e gestão segura</span>
          </div>
        </div>
      </div>
    </section>
  );
}
