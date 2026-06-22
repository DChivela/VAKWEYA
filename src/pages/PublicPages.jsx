import { CalendarCheck, Clock, Map, Route } from 'lucide-react';
import { AccountPanel } from '../components/AccountPanel';
import { AccountTeaser } from '../components/AccountTeaser';
import { AboutSection } from '../components/AboutSection';
import { AdminPanel } from '../components/AdminPanel';
import { BookingForm } from '../components/BookingForm';
import { ContactSection } from '../components/ContactSection';
import { Destinations } from '../components/Destinations';
import { ExperienceCard } from '../components/ExperienceCard';
import { Hero } from '../components/Hero';
import { HotelRoomsSection } from '../components/HotelRoomsSection';
import { InteractiveMap } from '../components/InteractiveMap';
import { PageHero } from '../components/PageHero';
import { SectionHeader } from '../components/SectionHeader';
import { Services } from '../components/Services';
import { Testimonials } from '../components/Testimonials';
import { TourPlanner } from '../components/TourPlanner';
import { assets } from '../data/catalog';
import { reservationLink } from '../services/reservationLinks';

export function HomePage({ data }) {
  return (
    <>
      <Hero stats={data.stats} />
      <AccountTeaser />
      <Destinations destinations={data.destinations} />
      <Services hotels={data.hotels} restaurants={data.restaurants} tours={data.tours} />
      <InteractiveMap destinations={data.destinations} />
      <Testimonials testimonials={data.testimonials} />
    </>
  );
}

export function DestinationsPage({ data }) {
  return (
    <>
      <PageHero
        eyebrow="Destinos"
        title="Escolhe onde começa a próxima memória"
        text="Províncias, paisagens e experiências organizadas para comparar com clareza."
        image={assets.hero}
      />
      <section className="section shell">
        <SectionHeader
          eyebrow="Explorar"
          title="Destinos em destaque"
          text="Cada destino pode virar uma reserva completa com hotel, restaurante, tour e transporte."
        />
        <div className="destination-grid">
          {data.destinations.map((destination) => (
            <ExperienceCard
              key={destination.id}
              image={destination.image}
              title={destination.name}
              subtitle={destination.province}
              text={destination.summary}
              price={destination.priceFrom}
              rating={destination.rating}
              tags={[destination.duration, destination.vibe]}
              action="Reservar destino"
              actionHref={reservationLink('destino', destination)}
            />
          ))}
        </div>
      </section>
      <InteractiveMap destinations={data.destinations} />
    </>
  );
}

export function HotelsPage({ data, currentSearch = '' }) {
  const selectedHotelId = new URLSearchParams(currentSearch).get('hotel');
  const selectedHotel = data.hotels.find((hotel) => String(hotel.id) === String(selectedHotelId));

  return (
    <>
      <PageHero
        eyebrow="Hotéis"
        title="Dormir bem faz parte da aventura"
        text="Estadias selecionadas para grupos jovens, viagens rápidas e escapadas com conforto."
        image={assets.lodge}
      />
      {selectedHotel && (
        <HotelRoomsSection hotel={selectedHotel} allRooms={data.hotelRooms || []} />
      )}
      <section className="section shell">
        <SectionHeader
          eyebrow="Ficar"
          title="Hotéis reserváveis"
          text="Compara preço, destino e comodidades antes de enviar a reserva."
        />
        <div className="service-grid">
          {data.hotels.map((hotel) => (
            <ExperienceCard
              key={hotel.id}
              image={hotel.image}
              title={hotel.name}
              subtitle={hotel.destination}
              text={hotel.description}
              price={hotel.price}
              rating={hotel.rating}
              tags={hotel.amenities?.slice(0, 3)}
              action="Ver quartos"
              actionHref={`/hoteis?hotel=${hotel.id}`}
            />
          ))}
        </div>
      </section>
    </>
  );
}

export function RestaurantsPage({ data }) {
  return (
    <>
      <PageHero
        eyebrow="Restaurantes"
        title="Sabores locais para fechar o dia em alta"
        text="Mesas, experiências gastronómicas e paragens sociais para encaixar no roteiro."
        image={assets.lodge}
      />
      <section className="section shell">
        <SectionHeader
          eyebrow="Comer"
          title="Restaurantes e experiências à mesa"
          text="Escolhe o ambiente, cozinha e faixa de preço para reservar sem stress."
        />
        <div className="service-grid">
          {data.restaurants.map((restaurant) => (
            <ExperienceCard
              key={restaurant.id}
              image={restaurant.image}
              title={restaurant.name}
              subtitle={`${restaurant.destination} · ${restaurant.cuisine}`}
              text={restaurant.description}
              price={restaurant.price}
              rating={restaurant.rating}
              tags={['Mesa reservável', 'Grupos', 'Confirmação rápida']}
              action="Reservar mesa"
              actionHref={reservationLink('restaurante', restaurant)}
            />
          ))}
        </div>
      </section>
    </>
  );
}

export function ToursPage({ data }) {
  return (
    <>
      <PageHero
        eyebrow="Tours"
        title="Sai da rotina com experiências guiadas"
        text="Trilhas, cultura urbana, dunas, miradouros e aventuras prontas para reservar."
        image={assets.waterfall}
      />
      <TourPlanner destinations={data.destinations} />
      <section className="section shell">
        <SectionHeader
          eyebrow="Experiências"
          title="Tours para grupos com energia"
          text="Atividades com guia local, ritmo claro e reserva simples."
        />
        <div className="service-grid">
          {data.tours.map((tour) => (
            <ExperienceCard
              key={tour.id}
              image={tour.image}
              title={tour.name}
              subtitle={`${tour.type} · ${tour.duration}`}
              text={tour.description}
              price={tour.price}
              rating={tour.rating}
              tags={['Guia local', 'Seguro básico', 'Fotos']}
              action="Reservar tour"
              actionHref={reservationLink('tour', tour)}
            />
          ))}
        </div>
      </section>
    </>
  );
}

export function ItinerariesPage({ data }) {
  return (
    <>
      <PageHero
        eyebrow="Roteiros"
        title="Mistura destinos, serviços e vibe num plano teu"
        text="Modelos prontos para adaptar por dias, orçamento e intensidade da viagem."
        image={assets.namibe}
      />
      <section className="section shell">
        <SectionHeader
          eyebrow="Personalizar"
          title="Roteiros base"
          text="Escolhe um ponto de partida e envia o pedido para ajustarmos ao teu grupo."
        />
        <div className="itinerary-grid">
          {data.itineraries.map((itinerary) => (
            <article className="itinerary-card" key={itinerary.id}>
              <div className="itinerary-card__icon">
                <Route size={22} />
              </div>
              <span className="card-subtitle">
                <Clock size={14} />
                {itinerary.days} dia(s) · {itinerary.mood}
              </span>
              <h3>{itinerary.name}</h3>
              <p>Orçamento: {itinerary.budget}</p>
              <div className="tag-row">
                {itinerary.stops.map((stop) => (
                  <span key={stop}>{stop}</span>
                ))}
              </div>
              <div className="itinerary-includes">
                {itinerary.includes.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
              <a className="button button--primary" href={reservationLink('roteiro', itinerary)}>
                <CalendarCheck size={18} />
                Pedir este roteiro
              </a>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

export function ReservationsPage({ data, currentSearch }) {
  return (
    <>
      <PageHero
        eyebrow="Reservas"
        title="Transforma curiosidade em viagem marcada"
        text="Envia datas, orçamento e preferências. A equipa confirma contigo antes do fecho."
        image={assets.hero}
      />
      <BookingForm
        destinations={data.destinations}
        hotels={data.hotels}
        hotelRooms={data.hotelRooms || []}
        restaurants={data.restaurants}
        tours={data.tours}
        itineraries={data.itineraries}
        currentSearch={currentSearch}
      />
    </>
  );
}

export function MapPage({ data }) {
  return (
    <>
      <PageHero
        eyebrow="Mapa de Angola"
        title="Vê onde cada experiência acontece"
        text="Pontos clicáveis sobre um contorno real de Angola, com Cabinda incluída."
        image={assets.hero}
      />
      <TourPlanner destinations={data.destinations} />
    </>
  );
}

export function TestimonialsPage({ data }) {
  return (
    <>
      <PageHero
        eyebrow="Depoimentos"
        title="Confiança também se reserva"
        text="Histórias curtas de quem já explorou com a Vakwetu Weya."
        image={assets.waterfall}
      />
      <Testimonials testimonials={data.testimonials} />
    </>
  );
}

export function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Sobre nós"
        title="Uma ponte moderna para explorar Angola"
        text="Juntamos descoberta visual, reservas simples e curadoria local para jovens viajantes."
        image={assets.namibe}
      />
      <AboutSection />
    </>
  );
}

export function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contacto"
        title="Vamos alinhar a tua próxima rota"
        text="Fala connosco para montar uma viagem, parceria ou experiência personalizada."
        image={assets.lodge}
      />
      <ContactSection />
    </>
  );
}

export function AccountPage() {
  return (
    <>
      <PageHero
        eyebrow="Conta"
        title="Entra, guarda o teu perfil e viaja melhor"
        text="Uma área simples para criar conta, usar foto de perfil e preparar futuras reservas."
        image={assets.hero}
      />
      <AccountPanel />
    </>
  );
}

export function AdminPage({ data, onContentChanged }) {
  return (
    <>
      <PageHero
        eyebrow="Administração"
        title="Gerir conteúdos e reservas"
        text="Cria separadores, acompanha pedidos e mantém o catálogo do site vivo."
        image={assets.hero}
      />
      <AdminPanel catalog={data} onContentChanged={onContentChanged} />
    </>
  );
}

export function NotFoundPage() {
  return (
    <section className="section shell not-found">
      <Map size={34} />
      <h1>Esta rota ainda não entrou no roteiro.</h1>
      <p>Volta ao início ou escolhe uma das páginas principais no navegador.</p>
      <a className="button button--primary" href="/">
        Ir para início
      </a>
    </section>
  );
}
