import { BedDouble, Check, ChevronLeft, ChevronRight, Minus, Plus, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { hotelRoomReservationLink } from '../services/reservationLinks';
import { roomCategories, roomCategoryLabel } from '../data/roomCategories';
import { SectionHeader } from './SectionHeader';

function RoomOption({ hotel, room }) {
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const images = room.images?.length ? room.images : [hotel.image];
  const total = Number(room.price || 0) * quantity;

  function moveImage(direction) {
    setActiveImage((current) => (current + direction + images.length) % images.length);
  }

  return (
    <article className="room-option">
      <div className="room-gallery">
        <img src={images[activeImage]} alt={`${room.name} no ${hotel.name}`} />
        {images.length > 1 && (
          <>
            <button type="button" className="room-gallery__previous" onClick={() => moveImage(-1)} aria-label="Imagem anterior">
              <ChevronLeft size={19} />
            </button>
            <button type="button" className="room-gallery__next" onClick={() => moveImage(1)} aria-label="Imagem seguinte">
              <ChevronRight size={19} />
            </button>
            <span>{activeImage + 1}/{images.length}</span>
          </>
        )}
      </div>

      <div className="room-option__body">
        <div className="room-option__heading">
          <div>
            <span><BedDouble size={15} /> {roomCategoryLabel(room.category)}</span>
            <h3>{room.name}</h3>
          </div>
          <strong>{Number(room.price).toLocaleString('pt-AO')} Kz <small>/ noite</small></strong>
        </div>
        <p>{room.description}</p>
        <div className="room-option__meta">
          <span><Users size={16} /> Até {room.capacity} pessoa(s)</span>
          <span>{room.stock} unidade(s) disponível(is)</span>
        </div>
        <div className="tag-row">
          {(room.amenities || []).map((amenity) => (
            <span key={amenity}><Check size={13} /> {amenity}</span>
          ))}
        </div>
        <div className="room-option__footer">
          <div className="room-quantity">
            <span>Quartos</span>
            <div>
              <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Diminuir quantidade">
                <Minus size={15} />
              </button>
              <strong>{quantity}</strong>
              <button type="button" onClick={() => setQuantity((value) => Math.min(room.stock, value + 1))} aria-label="Aumentar quantidade">
                <Plus size={15} />
              </button>
            </div>
          </div>
          <div className="room-option__total">
            <span>Subtotal por noite</span>
            <strong>{total.toLocaleString('pt-AO')} Kz</strong>
          </div>
          <a className="button button--primary" href={hotelRoomReservationLink(hotel, room, quantity)}>
            Escolher quarto
          </a>
        </div>
      </div>
    </article>
  );
}

export function HotelRoomsSection({ hotel, allRooms = [] }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const rooms = useMemo(
    () => {
      const combined = [
        ...(hotel?.rooms || []),
        ...allRooms.filter((room) => Number(room.hotelId) === Number(hotel?.id))
      ];
      return [...new Map(combined.map((room) => [String(room.id), room])).values()];
    },
    [allRooms, hotel]
  );
  const filteredRooms = useMemo(
    () => activeCategory === 'all'
      ? rooms
      : rooms.filter((room) => (room.category || 'casal') === activeCategory),
    [activeCategory, rooms]
  );

  if (!hotel) {
    return null;
  }

  return (
    <section className="section hotel-room-section" id="quartos">
      <div className="shell">
        <a className="room-back-link" href="/hoteis">
          <ChevronLeft size={17} /> Todos os hotéis
        </a>
        <div className="hotel-room-intro">
          <img src={hotel.image} alt={hotel.name} />
          <div>
            <SectionHeader
              eyebrow={hotel.destination}
              title={`Quartos no ${hotel.name}`}
              text={hotel.description}
            />
            <div className="tag-row">
              {(hotel.amenities || []).map((amenity) => <span key={amenity}>{amenity}</span>)}
            </div>
          </div>
        </div>

        <div className="room-category-filter" role="tablist" aria-label="Filtrar quartos por categoria">
          <button
            type="button"
            className={activeCategory === 'all' ? 'is-active' : ''}
            onClick={() => setActiveCategory('all')}
            role="tab"
            aria-selected={activeCategory === 'all'}
          >
            Todas <span>{rooms.length}</span>
          </button>
          {roomCategories.map((category) => {
            const total = rooms.filter((room) => (room.category || 'casal') === category.value).length;
            return (
              <button
                type="button"
                key={category.value}
                className={activeCategory === category.value ? 'is-active' : ''}
                onClick={() => setActiveCategory(category.value)}
                role="tab"
                aria-selected={activeCategory === category.value}
              >
                {category.label} <span>{total}</span>
              </button>
            );
          })}
        </div>

        <div className="room-option-list">
          {filteredRooms.map((room) => <RoomOption hotel={hotel} room={room} key={room.id} />)}
          {filteredRooms.length === 0 && (
            <p className="empty-state">Não há quartos publicados nesta categoria.</p>
          )}
        </div>
      </div>
    </section>
  );
}
