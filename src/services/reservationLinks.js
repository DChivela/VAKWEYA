export function reservationLink(serviceType, item) {
  const params = new URLSearchParams({
    tipo: serviceType,
    id: String(item.id)
  });

  return `/reservas?${params.toString()}`;
}

export function hotelRoomReservationLink(hotel, room, quantity = 1) {
  const params = new URLSearchParams({
    tipo: 'hotel',
    id: String(hotel.id),
    quarto: String(room.id),
    quantidade: String(quantity)
  });

  return `/reservas?${params.toString()}`;
}

export function tourPlannerReservationLink({ stops, isImmediate, scheduledAt, price }) {
  const params = new URLSearchParams({
    tipo: 'tour',
    paragens: JSON.stringify(stops || []),
    imediata: isImmediate ? '1' : '0',
    orcamento: String(price || 0)
  });

  if (scheduledAt) {
    params.set('dataHora', scheduledAt);
  }

  return `/reservas?${params.toString()}`;
}

export function parseReservationSearch(search) {
  const params = new URLSearchParams(search);
  const serviceType = params.get('tipo') || params.get('serviceType') || '';
  const serviceId = params.get('id') || params.get('serviceId') || '';

  let tourStops = [];
  try {
    tourStops = JSON.parse(params.get('paragens') || '[]');
  } catch {
    tourStops = [];
  }

  return {
    serviceType,
    serviceId,
    hotelRoomId: params.get('quarto') || '',
    roomQuantity: params.get('quantidade') || '1',
    tourStops,
    isImmediate: params.get('imediata') === '1',
    scheduledAt: params.get('dataHora') || '',
    budget: params.get('orcamento') || ''
  };
}
