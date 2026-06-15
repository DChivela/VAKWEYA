export function reservationLink(serviceType, item) {
  const params = new URLSearchParams({
    tipo: serviceType,
    id: String(item.id)
  });

  return `/reservas?${params.toString()}`;
}

export function parseReservationSearch(search) {
  const params = new URLSearchParams(search);
  const serviceType = params.get('tipo') || params.get('serviceType') || '';
  const serviceId = params.get('id') || params.get('serviceId') || '';

  return { serviceType, serviceId };
}
