export const assets = {
  logo: '/assets/logonovo-vakwetu.png',
  hero: '/assets/hero-angola.png',
  namibe: '/assets/namibe-dunes.png',
  lodge: '/assets/eco-lodge.png',
  waterfall: '/assets/waterfall-tour.png'
};

export const destinations = [
  {
    id: 1,
    slug: 'huila',
    name: 'Huíla sem filtros',
    province: 'Huíla',
    vibe: 'Montanhas, miradouros e cultura',
    duration: '3 dias',
    priceFrom: 145000,
    rating: 4.9,
    image: assets.hero,
    summary:
      'Trilhas na Tundavala, Serra da Leba ao pôr do sol e noites leves no Lubango.',
    coordinates: { lat: -14.917, lng: 13.492 },
    highlights: ['Tundavala', 'Serra da Leba', 'Cristo Rei']
  },
  {
    id: 2,
    slug: 'namibe',
    name: 'Namibe wild coast',
    province: 'Namibe',
    vibe: 'Dunas, oceano e deserto',
    duration: '4 dias',
    priceFrom: 180000,
    rating: 4.8,
    image: assets.namibe,
    summary:
      'Uma rota para quem quer areia, mar, fotografia e aquela sensação de fim do mapa.',
    coordinates: { lat: -15.195, lng: 12.152 },
    highlights: ['Dunas', 'Praias', 'Deserto do Iona']
  },
  {
    id: 3,
    slug: 'benguela',
    name: 'Benguela azul',
    province: 'Benguela',
    vibe: 'Praias, gastronomia e descanso',
    duration: '2 dias',
    priceFrom: 120000,
    rating: 4.7,
    image: assets.lodge,
    summary:
      'Hotéis com alma, restaurantes costeiros e passeios para renovar a energia.',
    coordinates: { lat: -12.576, lng: 13.405 },
    highlights: ['Baía Azul', 'Lobito', 'Restaurantes locais']
  },
  {
    id: 4,
    slug: 'luanda',
    name: 'Luanda cultural',
    province: 'Luanda',
    vibe: 'História, ilha e vida urbana',
    duration: '1 dia',
    priceFrom: 95000,
    rating: 4.6,
    image: assets.waterfall,
    summary:
      'Museus, Fortaleza de São Miguel, Ilha de Luanda e experiências urbanas guiadas.',
    coordinates: { lat: -8.839, lng: 13.289 },
    highlights: ['Fortaleza', 'Ilha', 'Museu da Escravatura']
  }
];

export const hotels = [
  {
    id: 1,
    name: 'Altitude Eco Stay',
    destination: 'Huíla',
    price: 52000,
    rating: 4.9,
    image: assets.lodge,
    description: 'Lodge jovem, confortável e perto das rotas de montanha.',
    amenities: ['Wi-Fi', 'Pequeno-almoço', 'Transfer', 'Vista panorâmica']
  },
  {
    id: 2,
    name: 'Duna Azul Rooms',
    destination: 'Namibe',
    price: 61000,
    rating: 4.8,
    image: assets.namibe,
    description: 'Base leve para explorar dunas, praias e tours fotográficos.',
    amenities: ['Ar condicionado', 'Restaurante', 'Guia local', 'Estacionamento']
  },
  {
    id: 3,
    name: 'Baía Social Hotel',
    destination: 'Benguela',
    price: 47000,
    rating: 4.7,
    image: assets.lodge,
    description: 'Hotel vibrante, perto da praia e bom para grupos.',
    amenities: ['Piscina', 'Cowork', 'Bar', 'Reserva rápida']
  }
];

export const hotelRooms = [
  {
    id: 1,
    hotelId: 1,
    name: 'Quarto Serra',
    category: 'casal',
    description: 'Quarto luminoso com varanda, cama queen e vista para as montanhas do Lubango.',
    price: 52000,
    capacity: 2,
    stock: 4,
    amenities: ['Cama queen', 'Varanda', 'Wi-Fi', 'Pequeno-almoço'],
    images: [assets.lodge, assets.hero, assets.waterfall]
  },
  {
    id: 2,
    hotelId: 1,
    name: 'Suite Miradouro',
    category: 'suite',
    description: 'Suite ampla para pequenos grupos, com sala, duas camas e transfer incluído.',
    price: 88000,
    capacity: 4,
    stock: 2,
    amenities: ['Sala privada', 'Duas camas', 'Transfer', 'Vista panorâmica'],
    images: [assets.hero, assets.lodge]
  },
  {
    id: 3,
    hotelId: 2,
    name: 'Duna Standard',
    category: 'solteiro',
    description: 'Base confortável para regressar das dunas, com ar condicionado e duche amplo.',
    price: 61000,
    capacity: 2,
    stock: 5,
    amenities: ['Ar condicionado', 'Duche', 'Wi-Fi', 'Estacionamento'],
    images: [assets.namibe, assets.lodge]
  },
  {
    id: 4,
    hotelId: 2,
    name: 'Family Desert',
    category: 'vip',
    description: 'Quarto familiar com camas flexíveis e espaço para equipamento de aventura.',
    price: 96000,
    capacity: 5,
    stock: 2,
    amenities: ['Camas flexíveis', 'Mini-frigorífico', 'Pequeno-almoço', 'Guia local'],
    images: [assets.namibe, assets.hero]
  },
  {
    id: 5,
    hotelId: 3,
    name: 'Baía Twin',
    category: 'solteiro',
    description: 'Duas camas, ambiente jovem e acesso rápido à piscina e à praia.',
    price: 47000,
    capacity: 2,
    stock: 6,
    amenities: ['Duas camas', 'Piscina', 'Cowork', 'Ar condicionado'],
    images: [assets.lodge, assets.namibe]
  },
  {
    id: 6,
    hotelId: 3,
    name: 'Social Group',
    category: 'vip',
    description: 'Quarto pensado para grupos, com quatro camas e zona de convívio.',
    price: 82000,
    capacity: 4,
    stock: 3,
    amenities: ['Quatro camas', 'Zona de convívio', 'Bar', 'Pequeno-almoço'],
    images: [assets.waterfall, assets.lodge]
  }
];

export const restaurants = [
  {
    id: 1,
    name: 'Mesa da Serra',
    destination: 'Lubango',
    price: 18000,
    rating: 4.8,
    image: assets.lodge,
    cuisine: 'Angolana contemporânea',
    description: 'Pratos locais com apresentação moderna e ambiente descontraído.'
  },
  {
    id: 2,
    name: 'Areia & Sal',
    destination: 'Namibe',
    price: 22000,
    rating: 4.7,
    image: assets.namibe,
    cuisine: 'Marisco e grelhados',
    description: 'Perfeito para fechar um dia de deserto com sabores do Atlântico.'
  },
  {
    id: 3,
    name: 'Ritmo da Ilha',
    destination: 'Luanda',
    price: 26000,
    rating: 4.6,
    image: assets.waterfall,
    cuisine: 'Fusion local',
    description: 'Jantar social, música leve e reservas para pequenos grupos.'
  }
];

export const tours = [
  {
    id: 1,
    name: 'Tundavala Sunrise Hike',
    type: 'Trilha guiada',
    duration: '5 horas',
    price: 38000,
    rating: 4.9,
    image: assets.waterfall,
    description:
      'Saída cedo, caminhada segura, fotos nos miradouros e snack energético.'
  },
  {
    id: 2,
    name: 'Namibe 4x4 & Dunas',
    type: 'Aventura off-road',
    duration: '1 dia',
    price: 65000,
    rating: 4.8,
    image: assets.namibe,
    description:
      'Dunas, praias selvagens, paragens fotográficas e guia com rota otimizada.'
  },
  {
    id: 3,
    name: 'Luanda History Walk',
    type: 'Cultura urbana',
    duration: '4 horas',
    price: 32000,
    rating: 4.7,
    image: assets.hero,
    description:
      'Fortaleza, Marginal, Ilha e histórias contadas num ritmo leve e interativo.'
  }
];

export const itineraries = [
  {
    id: 1,
    name: 'Fim de semana wild',
    days: 2,
    mood: 'Energia alta',
    budget: 'Médio',
    stops: ['Lubango', 'Tundavala', 'Serra da Leba'],
    includes: ['Transporte', 'Guia', 'Fotografia', 'Refeições selecionadas']
  },
  {
    id: 2,
    name: 'Deserto + oceano',
    days: 4,
    mood: 'Aventura premium',
    budget: 'Médio alto',
    stops: ['Namibe', 'Dunas', 'Praia', 'Iona'],
    includes: ['Hotel', '4x4', 'Seguro básico', 'Guia local']
  },
  {
    id: 3,
    name: 'City break cultural',
    days: 1,
    mood: 'Leve e social',
    budget: 'Flexível',
    stops: ['Luanda', 'Fortaleza', 'Museu', 'Ilha'],
    includes: ['Guia', 'Reservas', 'Transporte urbano']
  }
];

export const testimonials = [
  {
    id: 1,
    name: 'Yara M.',
    location: 'Luanda',
    quote:
      'Reservei uma viagem para a Huíla em minutos. O roteiro parecia feito para o meu grupo.',
    score: 5
  },
  {
    id: 2,
    name: 'Kelson T.',
    location: 'Benguela',
    quote:
      'Gostei do mapa e das sugestões rápidas. Deu vontade de explorar Angola sem complicar.',
    score: 5
  },
  {
    id: 3,
    name: 'Nádia C.',
    location: 'Huambo',
    quote:
      'A comunicação foi clara, jovem e confiável. A reserva do hotel correu super bem.',
    score: 5
  }
];

export const stats = [
  { label: 'experiências prontas', value: '48+' },
  { label: 'reservas assistidas', value: '2.4k' },
  { label: 'províncias em destaque', value: '9' },
  { label: 'suporte rápido', value: '24h' }
];

export const catalog = {
  destinations,
  hotels: hotels.map((hotel) => ({
    ...hotel,
    rooms: hotelRooms.filter((room) => room.hotelId === hotel.id)
  })),
  hotelRooms,
  restaurants,
  tours,
  itineraries,
  testimonials,
  stats
};
