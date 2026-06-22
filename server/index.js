import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { catalog } from '../src/data/catalog.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const dbHost = process.env.DB_HOST || process.env.MYSQLHOST || '127.0.0.1';
const dbPort = Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306);
const dbUser = process.env.DB_USER || process.env.MYSQLUSER || 'root';
const dbPassword = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '';
const dbName = process.env.DB_NAME || process.env.MYSQLDATABASE || 'WEYA';
const adminUsername = process.env.ADMIN_USERNAME || 'dchivela';
const adminPassword = process.env.ADMIN_PASSWORD || '#focus2024';
const sessions = new Map();
const demoUsers = [];
const demoReservations = [];
const demoContacts = [];
const demoDriverProfiles = [];
const demoVehicles = [];
const demoCatalog = structuredClone(catalog);
const tourBasePrice = Number(process.env.TOUR_BASE_PRICE || 100000);
const tourIncludedStops = Number(process.env.TOUR_INCLUDED_STOPS || 3);
const tourExtraStopPrice = Number(process.env.TOUR_EXTRA_STOP_PRICE || 25000);
const defaultAssistantFaqs = [
  {
    category: 'Reservas',
    question: 'Como faço uma reserva?',
    answer:
      'Escolhe um hotel, restaurante, tour, destino ou roteiro e clica no botão de reserva. A página de reservas abre com a seleção preparada; depois só precisas confirmar os teus dados, datas, número de pessoas e enviar o pedido.',
    keywords: ['reserva', 'reservar', 'pedido', 'hotel', 'restaurante', 'tour', 'roteiro']
  },
  {
    category: 'Conta',
    question: 'Preciso criar conta para reservar?',
    answer:
      'Podes enviar uma reserva como visitante, mas criar conta deixa tudo mais prático: os teus dados são preenchidos automaticamente e consegues consultar o histórico em Perfil.',
    keywords: ['conta', 'login', 'perfil', 'criar conta', 'visitante']
  },
  {
    category: 'Histórico',
    question: 'Onde vejo as minhas reservas?',
    answer:
      'Depois de iniciar sessão, entra em Perfil. A área Minhas reservas mostra os pedidos ligados à tua conta e também reservas antigas feitas com o mesmo email do perfil.',
    keywords: ['minhas reservas', 'histórico', 'historico', 'perfil', 'consultar reserva']
  },
  {
    category: 'Orçamento',
    question: 'O orçamento é calculado automaticamente?',
    answer:
      'Sim. Quando escolhes um serviço com preço definido, o sistema sugere um valor com base no tipo de reserva, datas e número de pessoas. Ainda assim, podes alterar o orçamento antes de enviar.',
    keywords: ['orçamento', 'orcamento', 'preço', 'preco', 'valor', 'calcular']
  },
  {
    category: 'Mapa',
    question: 'Como funciona o mapa interativo?',
    answer:
      'O mapa mostra Angola com pontos clicáveis para os destinos cadastrados. Quando o admin adiciona um destino com província e coordenadas, ele passa a aparecer no mapa.',
    keywords: ['mapa', 'Angola', 'destinos', 'província', 'provincia', 'coordenadas']
  },
  {
    category: 'Administração',
    question: 'Quem pode alterar hotéis, restaurantes e tours?',
    answer:
      'Apenas utilizadores com privilégio de administrador conseguem criar, editar ou eliminar conteúdos no painel administrativo. A conta raiz dchivela permanece protegida.',
    keywords: ['admin', 'administrador', 'editar', 'eliminar', 'conteúdo', 'conteudo', 'dchivela']
  },
  {
    category: 'Contacto',
    question: 'Como falo com a equipa Vakwetu Weya?',
    answer:
      'Podes usar a página Contacto ou enviar email para reservas@vakwetuweya.ao. Para reservas enviadas pelo site, a equipa confirma os detalhes contigo antes do fecho.',
    keywords: ['contacto', 'contato', 'email', 'equipa', 'suporte', 'ajuda']
  }
];
const demoAssistantFaqs = defaultAssistantFaqs.map((faq, index) => ({
  id: index + 1,
  ...faq,
  active: 1,
  created_at: null,
  updated_at: null
}));
const demoAssistantLogs = [];
const serverDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(serverDir, '..');
const uploadRoot = path.resolve(process.env.UPLOAD_DIR || path.join(projectRoot, 'public', 'uploads'));
const distRoot = path.join(projectRoot, 'dist');
const indexFile = path.join(distRoot, 'index.html');

let pool = null;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5173'
  })
);
app.use(express.json({ limit: '8mb' }));
app.use('/uploads', express.static(uploadRoot));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 160,
    standardHeaders: true,
    legacyHeaders: false
  })
);

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const iterations = 210000;
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
  return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  const [algorithm, iterations, salt, expected] = String(storedHash).split('$');

  if (algorithm !== 'pbkdf2_sha256' || !iterations || !salt || !expected) {
    return false;
  }

  const actual = crypto
    .pbkdf2Sync(password, salt, Number(iterations), 32, 'sha256')
    .toString('hex');

  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    role: user.role
  };
}

function createSession(user) {
  const token = crypto.randomBytes(32).toString('hex');
  const safeUser = sanitizeUser(user);

  sessions.set(token, {
    ...safeUser,
    expiresAt: Date.now() + 1000 * 60 * 60 * 8
  });

  return { token, user: safeUser };
}

function requireAuth(request, response, next) {
  const token = request.headers.authorization?.replace('Bearer ', '');
  const session = token ? sessions.get(token) : null;

  if (!session || session.expiresAt < Date.now()) {
    return response.status(401).json({ message: 'Sessão expirada. Faça login novamente.' });
  }

  request.user = session;
  return next();
}

function readOptionalSession(request) {
  const token = request.headers.authorization?.replace('Bearer ', '');
  const session = token ? sessions.get(token) : null;

  if (!session || session.expiresAt < Date.now()) {
    return null;
  }

  return session;
}

function toPublicUser(row) {
  return sanitizeUser({
    id: row.id,
    username: row.username,
    name: row.name,
    email: row.email,
    phone: row.phone,
    avatar: row.avatar,
    role: row.role
  });
}

function normalizeUploadFolder(value) {
  const folder = String(value || 'general')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');

  return folder || 'general';
}

async function saveDataUrlImage({ dataUrl, filename, folder = 'general' }) {
  const match = String(dataUrl || '').match(/^data:(image\/(?:png|jpe?g|webp));base64,([a-zA-Z0-9+/=]+)$/);

  if (!match) {
    throw new Error('Envie uma imagem PNG, JPG ou WebP válida.');
  }

  const [, mimeType, base64] = match;
  const buffer = Buffer.from(base64, 'base64');
  const maxBytes = 5 * 1024 * 1024;

  if (buffer.length > maxBytes) {
    throw new Error('A imagem deve ter no máximo 5 MB.');
  }

  const extensionByMime = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp'
  };
  const extension = extensionByMime[mimeType];
  const safeFolder = normalizeUploadFolder(folder);
  const safeName = slugify(path.parse(filename || 'imagem').name) || 'imagem';
  const storedName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safeName}.${extension}`;
  const uploadDir = path.join(uploadRoot, safeFolder);

  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, storedName), buffer);

  return `/uploads/${safeFolder}/${storedName}`;
}

function normalizeNumber(value) {
  return Number(value || 0);
}

function parseJson(value, fallback = []) {
  if (!value) {
    return fallback;
  }

  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return fallback;
  }
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function splitList(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeRole(value) {
  return ['admin', 'motorista'].includes(value) ? value : 'cliente';
}

function calculateTourPrice(stops) {
  const stopCount = Array.isArray(stops) ? stops.length : 0;
  return tourBasePrice + Math.max(0, stopCount - tourIncludedStops) * tourExtraStopPrice;
}

function normalizeTourStops(value) {
  const stops = Array.isArray(value) ? value : parseJson(value, []);

  return stops
    .slice(0, 8)
    .map((stop, index) => ({
      id: stop.id || `stop-${index + 1}`,
      name: String(stop.name || `Paragem ${index + 1}`).trim(),
      province: String(stop.province || '').trim(),
      lat: Number(stop.lat ?? stop.coordinates?.lat),
      lng: Number(stop.lng ?? stop.coordinates?.lng)
    }))
    .filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng));
}

function toPublicDriver(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.user_id ?? row.userId ?? row.id),
    name: row.name,
    username: row.username,
    phone: row.phone || null,
    avatar: row.avatar || null,
    bio: row.bio || '',
    licenseNumber: row.license_number ?? row.licenseNumber ?? '',
    availability: row.availability || 'offline',
    approved: Boolean(row.approved),
    location: {
      lat: row.current_latitude === null || row.current_latitude === undefined
        ? null
        : Number(row.current_latitude),
      lng: row.current_longitude === null || row.current_longitude === undefined
        ? null
        : Number(row.current_longitude)
    },
    vehicle: row.vehicle_id || row.vehicleId
      ? {
          id: Number(row.vehicle_id ?? row.vehicleId),
          make: row.vehicle_make ?? row.make ?? '',
          model: row.vehicle_model ?? row.model ?? '',
          year: Number(row.vehicle_year ?? row.year ?? 0) || null,
          licensePlate: row.license_plate ?? row.licensePlate ?? '',
          capacity: Number(row.vehicle_capacity ?? row.capacity ?? 1),
          type: row.vehicle_type ?? row.type ?? '',
          images: parseJson(row.vehicle_images_json ?? row.images, [])
        }
      : null
  };
}

function normalizeAssistantText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeAssistantText(value) {
  return normalizeAssistantText(value)
    .split(' ')
    .filter((token) => token.length > 2);
}

function toPublicAssistantFaq(row) {
  return {
    id: row.id,
    category: row.category || 'Geral',
    question: row.question,
    answer: row.answer,
    keywords: parseJson(row.keywords_json ?? row.keywords, []),
    active: Boolean(row.active ?? true),
    createdAt: row.created_at ?? row.createdAt ?? null,
    updatedAt: row.updated_at ?? row.updatedAt ?? null
  };
}

function toPublicAssistantLog(row) {
  return {
    id: row.id,
    question: row.user_question ?? row.question,
    answer: row.assistant_answer ?? row.answer ?? null,
    matchedFaqId: row.matched_faq_id ?? row.matchedFaqId ?? null,
    confidence: Number(row.confidence || 0),
    answered: Boolean(row.answered),
    createdAt: row.created_at ?? row.createdAt ?? null
  };
}

function normalizeAssistantFaqPayload(payload) {
  ensureRequired(payload, ['question', 'answer']);

  return {
    category: String(payload.category || 'Geral').trim(),
    question: String(payload.question).trim(),
    answer: String(payload.answer).trim(),
    keywords: splitList(payload.keywords),
    active: payload.active === false || payload.active === 0 ? 0 : 1
  };
}

function scoreAssistantFaq(message, faq) {
  const normalizedQuestion = normalizeAssistantText(message);
  const tokens = tokenizeAssistantText(message);
  const keywords = Array.isArray(faq.keywords) ? faq.keywords : parseJson(faq.keywords_json, []);
  const searchable = normalizeAssistantText([
    faq.category,
    faq.question,
    faq.answer,
    keywords.join(' ')
  ].join(' '));
  let score = 0;

  if (!normalizedQuestion) {
    return { score: 0, confidence: 0 };
  }

  if (searchable.includes(normalizedQuestion)) {
    score += 4;
  }

  for (const keyword of keywords) {
    const normalizedKeyword = normalizeAssistantText(keyword);

    if (normalizedKeyword && normalizedQuestion.includes(normalizedKeyword)) {
      score += 3;
    }
  }

  for (const token of tokens) {
    if (searchable.includes(token)) {
      score += 1;
    }
  }

  const confidence = Math.min(1, score / Math.max(5, tokens.length + 4));
  return { score, confidence };
}

function findAssistantAnswer(message, faqs) {
  const activeFaqs = faqs.filter((faq) => faq.active !== false && faq.active !== 0);
  const rankedFaqs = activeFaqs
    .map((faq) => ({ faq, ...scoreAssistantFaq(message, faq) }))
    .sort((a, b) => b.score - a.score);
  const best = rankedFaqs[0];
  const minimumScore = Math.max(3, Math.ceil(tokenizeAssistantText(message).length * 0.45));

  if (!best || best.score < minimumScore) {
    return {
      matched: false,
      confidence: 0,
      faq: null,
      answer:
        'Ainda não tenho uma resposta segura para isso. Podes reformular a pergunta ou falar com a equipa pela página de contacto. Vou guardar esta dúvida para a equipa melhorar o assistente.'
    };
  }

  return {
    matched: true,
    confidence: Number(best.confidence.toFixed(2)),
    faq: best.faq,
    answer: best.faq.answer
  };
}

function ensureRequired(payload, fields) {
  const missing = fields.filter((field) => !String(payload[field] || '').trim());

  if (missing.length > 0) {
    throw new Error(`Campos obrigatórios em falta: ${missing.join(', ')}.`);
  }
}

function normalizeResourcePayload(resource, payload) {
  switch (resource) {
    case 'destinations':
      ensureRequired(payload, ['name', 'province', 'summary']);
      return {
        id: Date.now(),
        slug: payload.slug || slugify(payload.name),
        name: payload.name,
        province: payload.province,
        vibe: payload.vibe || 'Experiência personalizada',
        duration: payload.duration || 'A definir',
        priceFrom: Number(payload.priceFrom || payload.price || 0),
        rating: Number(payload.rating || 4.7),
        image: payload.image || '/assets/hero-angola.png',
        summary: payload.summary,
        coordinates: {
          lat: Number(payload.lat || payload.latitude || -8.839),
          lng: Number(payload.lng || payload.longitude || 13.289)
        },
        highlights: splitList(payload.highlights)
      };
    case 'hotels':
      ensureRequired(payload, ['name', 'destination', 'description']);
      return {
        id: Date.now(),
        name: payload.name,
        destination: payload.destination,
        price: Number(payload.price || 0),
        rating: Number(payload.rating || 4.7),
        image: payload.image || '/assets/eco-lodge.png',
        description: payload.description,
        amenities: splitList(payload.amenities)
      };
    case 'hotelRooms':
      ensureRequired(payload, ['hotelId', 'name', 'description']);
      return {
        id: Date.now(),
        hotelId: Number(payload.hotelId),
        name: payload.name,
        category: ['suite', 'solteiro', 'vip', 'casal'].includes(payload.category)
          ? payload.category
          : 'casal',
        description: payload.description,
        price: Number(payload.price || 0),
        capacity: Math.max(1, Number(payload.capacity || 2)),
        stock: Math.max(1, Number(payload.stock || 1)),
        amenities: splitList(payload.amenities),
        images: splitList(payload.images)
      };
    case 'restaurants':
      ensureRequired(payload, ['name', 'destination', 'description']);
      return {
        id: Date.now(),
        name: payload.name,
        destination: payload.destination,
        price: Number(payload.price || 0),
        rating: Number(payload.rating || 4.7),
        image: payload.image || '/assets/eco-lodge.png',
        cuisine: payload.cuisine || 'Local',
        description: payload.description
      };
    case 'tours':
      ensureRequired(payload, ['name', 'description']);
      return {
        id: Date.now(),
        name: payload.name,
        type: payload.type || 'Experiência guiada',
        duration: payload.duration || 'A definir',
        price: Number(payload.price || 0),
        rating: Number(payload.rating || 4.7),
        image: payload.image || '/assets/waterfall-tour.png',
        description: payload.description
      };
    case 'itineraries':
      ensureRequired(payload, ['name']);
      return {
        id: Date.now(),
        name: payload.name,
        days: Number(payload.days || 1),
        mood: payload.mood || 'Personalizado',
        budget: payload.budget || 'Flexível',
        stops: splitList(payload.stops),
        includes: splitList(payload.includes)
      };
    case 'testimonials':
      ensureRequired(payload, ['name', 'quote']);
      return {
        id: Date.now(),
        name: payload.name,
        location: payload.location || 'Angola',
        quote: payload.quote,
        score: Number(payload.score || 5)
      };
    default:
      throw new Error('Tipo de conteúdo inválido.');
  }
}

function toPublicReservation(row) {
  const tourStops = normalizeTourStops(row.tour_stops_json ?? row.tourStops ?? []);
  const calculatedPrice = row.calculated_price ?? row.calculatedPrice;

  return {
    id: row.id,
    userId: row.user_id ?? row.userId ?? null,
    serviceType: row.service_type ?? row.serviceType,
    serviceId: row.service_id ?? row.serviceId ?? null,
    customerName: row.customer_name ?? row.customerName,
    customerEmail: row.customer_email ?? row.customerEmail,
    customerPhone: row.customer_phone ?? row.customerPhone,
    travelers: Number(row.travelers || 1),
    startDate: row.start_date ?? row.startDate ?? null,
    endDate: row.end_date ?? row.endDate ?? null,
    budget: row.budget === null || row.budget === undefined ? null : Number(row.budget),
    calculatedPrice:
      calculatedPrice === null || calculatedPrice === undefined ? null : Number(calculatedPrice),
    notes: row.notes || null,
    status: row.status || 'pendente',
    scheduledAt: row.scheduled_at ?? row.scheduledAt ?? null,
    isImmediate: Boolean(row.is_immediate ?? row.isImmediate),
    tourStops,
    hotelRoomId: row.hotel_room_id ?? row.hotelRoomId ?? null,
    hotelRoomName: row.hotel_room_name ?? row.hotelRoomName ?? null,
    roomQuantity: Number(row.room_quantity ?? row.roomQuantity ?? 0) || null,
    assignedDriverId: row.assigned_driver_id ?? row.assignedDriverId ?? null,
    driver: row.driver_name
      ? {
          id: Number(row.assigned_driver_id),
          name: row.driver_name,
          phone: row.driver_phone || null,
          avatar: row.driver_avatar || null,
          vehicle: row.vehicle_id
            ? {
                id: Number(row.vehicle_id),
                make: row.vehicle_make || '',
                model: row.vehicle_model || '',
                licensePlate: row.license_plate || '',
                capacity: Number(row.vehicle_capacity || 1),
                type: row.vehicle_type || ''
              }
            : null
        }
      : null,
    createdAt: row.created_at ?? row.createdAt ?? null,
    updatedAt: row.updated_at ?? row.updatedAt ?? null
  };
}

async function insertResource(resource, item) {
  switch (resource) {
    case 'destinations': {
      const [result] = await pool.query(
        `INSERT INTO destinations
         (slug, name, province, vibe, duration, price_from, rating, image, summary, latitude, longitude, highlights_json, featured)
         VALUES (:slug, :name, :province, :vibe, :duration, :priceFrom, :rating, :image, :summary, :lat, :lng, :highlights, 0)`,
        {
          ...item,
          lat: item.coordinates.lat,
          lng: item.coordinates.lng,
          highlights: JSON.stringify(item.highlights)
        }
      );
      return { ...item, id: result.insertId };
    }
    case 'hotels': {
      const [result] = await pool.query(
        `INSERT INTO hotels (name, destination, description, image, price_per_night, rating, amenities_json)
         VALUES (:name, :destination, :description, :image, :price, :rating, :amenities)`,
        { ...item, amenities: JSON.stringify(item.amenities) }
      );
      return { ...item, id: result.insertId };
    }
    case 'hotelRooms': {
      const [result] = await pool.query(
        `INSERT INTO hotel_rooms
         (hotel_id, name, category, description, price_per_night, capacity, stock, amenities_json, images_json)
         VALUES (:hotelId, :name, :category, :description, :price, :capacity, :stock, :amenities, :images)`,
        {
          ...item,
          amenities: JSON.stringify(item.amenities),
          images: JSON.stringify(item.images)
        }
      );
      return { ...item, id: result.insertId };
    }
    case 'restaurants': {
      const [result] = await pool.query(
        `INSERT INTO restaurants (name, destination, cuisine, description, image, average_price, rating)
         VALUES (:name, :destination, :cuisine, :description, :image, :price, :rating)`,
        item
      );
      return { ...item, id: result.insertId };
    }
    case 'tours': {
      const [result] = await pool.query(
        `INSERT INTO tours (name, type, duration, description, image, price, rating)
         VALUES (:name, :type, :duration, :description, :image, :price, :rating)`,
        item
      );
      return { ...item, id: result.insertId };
    }
    case 'itineraries': {
      const [result] = await pool.query(
        `INSERT INTO itineraries (name, days, mood, budget, stops_json, includes_json)
         VALUES (:name, :days, :mood, :budget, :stops, :includes)`,
        {
          ...item,
          stops: JSON.stringify(item.stops),
          includes: JSON.stringify(item.includes)
        }
      );
      return { ...item, id: result.insertId };
    }
    case 'testimonials': {
      const [result] = await pool.query(
        `INSERT INTO testimonials (name, location, quote, score)
         VALUES (:name, :location, :quote, :score)`,
        item
      );
      return { ...item, id: result.insertId };
    }
    default:
      throw new Error('Tipo de conteúdo inválido.');
  }
}

async function updateResource(resource, id, item) {
  switch (resource) {
    case 'destinations':
      await pool.query(
        `UPDATE destinations SET
          slug = :slug,
          name = :name,
          province = :province,
          vibe = :vibe,
          duration = :duration,
          price_from = :priceFrom,
          rating = :rating,
          image = :image,
          summary = :summary,
          latitude = :lat,
          longitude = :lng,
          highlights_json = :highlights
         WHERE id = :resourceId`,
        {
          ...item,
          lat: item.coordinates.lat,
          lng: item.coordinates.lng,
          highlights: JSON.stringify(item.highlights),
          resourceId: id
        }
      );
      return { ...item, id };
    case 'hotels':
      await pool.query(
        `UPDATE hotels SET
          name = :name,
          destination = :destination,
          description = :description,
          image = :image,
          price_per_night = :price,
          rating = :rating,
          amenities_json = :amenities
         WHERE id = :resourceId`,
        { ...item, amenities: JSON.stringify(item.amenities), resourceId: id }
      );
      return { ...item, id };
    case 'hotelRooms':
      await pool.query(
        `UPDATE hotel_rooms SET
          hotel_id = :hotelId,
          name = :name,
          category = :category,
          description = :description,
          price_per_night = :price,
          capacity = :capacity,
          stock = :stock,
          amenities_json = :amenities,
          images_json = :images
         WHERE id = :resourceId`,
        {
          ...item,
          amenities: JSON.stringify(item.amenities),
          images: JSON.stringify(item.images),
          resourceId: id
        }
      );
      return { ...item, id };
    case 'restaurants':
      await pool.query(
        `UPDATE restaurants SET
          name = :name,
          destination = :destination,
          cuisine = :cuisine,
          description = :description,
          image = :image,
          average_price = :price,
          rating = :rating
         WHERE id = :resourceId`,
        { ...item, resourceId: id }
      );
      return { ...item, id };
    case 'tours':
      await pool.query(
        `UPDATE tours SET
          name = :name,
          type = :type,
          duration = :duration,
          description = :description,
          image = :image,
          price = :price,
          rating = :rating
         WHERE id = :resourceId`,
        { ...item, resourceId: id }
      );
      return { ...item, id };
    case 'itineraries':
      await pool.query(
        `UPDATE itineraries SET
          name = :name,
          days = :days,
          mood = :mood,
          budget = :budget,
          stops_json = :stops,
          includes_json = :includes
         WHERE id = :resourceId`,
        {
          ...item,
          stops: JSON.stringify(item.stops),
          includes: JSON.stringify(item.includes),
          resourceId: id
        }
      );
      return { ...item, id };
    case 'testimonials':
      await pool.query(
        `UPDATE testimonials SET
          name = :name,
          location = :location,
          quote = :quote,
          score = :score
         WHERE id = :resourceId`,
        { ...item, resourceId: id }
      );
      return { ...item, id };
    default:
      throw new Error('Tipo de conteúdo inválido.');
  }
}

async function deleteResource(resource, id) {
  const tables = {
    destinations: 'destinations',
    hotels: 'hotels',
    hotelRooms: 'hotel_rooms',
    restaurants: 'restaurants',
    tours: 'tours',
    itineraries: 'itineraries',
    testimonials: 'testimonials'
  };
  const table = tables[resource];

  if (!table) {
    throw new Error('Tipo de conteÃºdo invÃ¡lido.');
  }

  await pool.query(`UPDATE ${table} SET active = 0 WHERE id = :resourceId`, { resourceId: id });
}

async function connectDatabase() {
  try {
    const rootConnection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword
    });

    try {
      await rootConnection.query(
        `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
    } catch (error) {
      if (error.code !== 'ER_DBACCESS_DENIED_ERROR') {
        throw error;
      }
    } finally {
      await rootConnection.end();
    }

    pool = mysql.createPool({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: true
    });

    await initializeSchema();
    await seedBaseContent();
    await seedHotelRooms();
    await seedAssistantFaqs();
    console.log(`MySQL ligado em ${dbName}.`);
  } catch (error) {
    pool = null;
    console.warn(`MySQL indisponível. API em modo demonstração: ${error.message}`);
  }
}

async function initializeSchema() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      username VARCHAR(80) NOT NULL,
      name VARCHAR(180) NOT NULL,
      email VARCHAR(180) NULL,
      phone VARCHAR(40) NULL,
      avatar VARCHAR(255) NULL,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin','cliente','motorista') NOT NULL DEFAULT 'cliente',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY users_username_unique (username),
      UNIQUE KEY users_email_unique (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS destinations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      slug VARCHAR(90) NOT NULL,
      name VARCHAR(180) NOT NULL,
      province VARCHAR(120) NOT NULL,
      vibe VARCHAR(180) NULL,
      duration VARCHAR(80) NULL,
      price_from DECIMAL(12,2) NOT NULL DEFAULT 0,
      rating DECIMAL(3,2) NOT NULL DEFAULT 0,
      image VARCHAR(255) NULL,
      summary TEXT NULL,
      latitude DECIMAL(10,6) NULL,
      longitude DECIMAL(10,6) NULL,
      highlights_json JSON NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      featured TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY destinations_slug_unique (slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS hotels (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(180) NOT NULL,
      destination VARCHAR(120) NOT NULL,
      description TEXT NULL,
      image VARCHAR(255) NULL,
      price_per_night DECIMAL(12,2) NOT NULL DEFAULT 0,
      rating DECIMAL(3,2) NOT NULL DEFAULT 0,
      amenities_json JSON NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS hotel_rooms (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      hotel_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(180) NOT NULL,
      category ENUM('suite','solteiro','vip','casal') NOT NULL DEFAULT 'casal',
      description TEXT NULL,
      price_per_night DECIMAL(12,2) NOT NULL DEFAULT 0,
      capacity INT NOT NULL DEFAULT 2,
      stock INT NOT NULL DEFAULT 1,
      amenities_json JSON NULL,
      images_json JSON NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY hotel_rooms_hotel_index (hotel_id),
      KEY hotel_rooms_active_index (active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS driver_profiles (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      bio TEXT NULL,
      license_number VARCHAR(100) NULL,
      availability ENUM('offline','livre','ocupado') NOT NULL DEFAULT 'offline',
      approved TINYINT(1) NOT NULL DEFAULT 0,
      current_latitude DECIMAL(10,6) NULL,
      current_longitude DECIMAL(10,6) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY driver_profiles_user_unique (user_id),
      KEY driver_profiles_availability_index (availability, approved)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS vehicles (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      driver_id BIGINT UNSIGNED NOT NULL,
      make VARCHAR(100) NOT NULL,
      model VARCHAR(120) NOT NULL,
      vehicle_year INT NULL,
      license_plate VARCHAR(40) NOT NULL,
      capacity INT NOT NULL DEFAULT 4,
      vehicle_type VARCHAR(100) NULL,
      images_json JSON NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY vehicles_driver_unique (driver_id),
      UNIQUE KEY vehicles_plate_unique (license_plate)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS restaurants (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(180) NOT NULL,
      destination VARCHAR(120) NOT NULL,
      cuisine VARCHAR(140) NULL,
      description TEXT NULL,
      image VARCHAR(255) NULL,
      average_price DECIMAL(12,2) NOT NULL DEFAULT 0,
      rating DECIMAL(3,2) NOT NULL DEFAULT 0,
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS tours (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(180) NOT NULL,
      type VARCHAR(120) NULL,
      duration VARCHAR(80) NULL,
      description TEXT NULL,
      image VARCHAR(255) NULL,
      price DECIMAL(12,2) NOT NULL DEFAULT 0,
      rating DECIMAL(3,2) NOT NULL DEFAULT 0,
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS itineraries (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(180) NOT NULL,
      days INT NOT NULL DEFAULT 1,
      mood VARCHAR(120) NULL,
      budget VARCHAR(120) NULL,
      stops_json JSON NULL,
      includes_json JSON NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS reservations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NULL,
      service_type ENUM('destino','hotel','restaurante','tour','roteiro') NOT NULL,
      service_id BIGINT UNSIGNED NULL,
      customer_name VARCHAR(180) NOT NULL,
      customer_email VARCHAR(180) NOT NULL,
      customer_phone VARCHAR(60) NOT NULL,
      travelers INT NOT NULL DEFAULT 1,
      start_date DATE NULL,
      end_date DATE NULL,
      budget DECIMAL(12,2) NULL,
      calculated_price DECIMAL(12,2) NULL,
      notes TEXT NULL,
      scheduled_at DATETIME NULL,
      is_immediate TINYINT(1) NOT NULL DEFAULT 0,
      tour_stops_json JSON NULL,
      assigned_driver_id BIGINT UNSIGNED NULL,
      hotel_room_id BIGINT UNSIGNED NULL,
      room_quantity INT NULL,
      status ENUM('pendente','confirmada','cancelada','concluida') NOT NULL DEFAULT 'pendente',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY reservations_user_index (user_id),
      KEY reservations_status_index (status),
      KEY reservations_email_index (customer_email),
      KEY reservations_driver_index (assigned_driver_id),
      KEY reservations_schedule_index (scheduled_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS contacts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(180) NOT NULL,
      email VARCHAR(180) NOT NULL,
      subject VARCHAR(220) NOT NULL,
      message TEXT NOT NULL,
      status ENUM('novo','lido','respondido') NOT NULL DEFAULT 'novo',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS assistant_faqs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      category VARCHAR(120) NOT NULL DEFAULT 'Geral',
      question VARCHAR(260) NOT NULL,
      answer TEXT NOT NULL,
      keywords_json JSON NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY assistant_faqs_active_index (active),
      KEY assistant_faqs_category_index (category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS assistant_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_question TEXT NOT NULL,
      assistant_answer TEXT NULL,
      matched_faq_id BIGINT UNSIGNED NULL,
      confidence DECIMAL(5,2) NOT NULL DEFAULT 0,
      answered TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY assistant_logs_answered_index (answered),
      KEY assistant_logs_created_index (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS testimonials (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(140) NOT NULL,
      location VARCHAR(120) NULL,
      quote TEXT NOT NULL,
      score INT NOT NULL DEFAULT 5,
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  ];

  for (const statement of statements) {
    await pool.query(statement);
  }

  await pool.query(
    "ALTER TABLE users MODIFY COLUMN role ENUM('admin','cliente','motorista') NOT NULL DEFAULT 'cliente'"
  );

  try {
    await pool.query('ALTER TABLE users ADD COLUMN avatar VARCHAR(255) NULL AFTER phone');
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME') {
      throw error;
    }
  }

  try {
    await pool.query('ALTER TABLE reservations ADD COLUMN user_id BIGINT UNSIGNED NULL AFTER id');
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME') {
      throw error;
    }
  }

  try {
    await pool.query('ALTER TABLE reservations ADD KEY reservations_user_index (user_id)');
  } catch (error) {
    if (error.code !== 'ER_DUP_KEYNAME') {
      throw error;
    }
  }

  const reservationMigrations = [
    'ALTER TABLE reservations ADD COLUMN calculated_price DECIMAL(12,2) NULL AFTER budget',
    'ALTER TABLE reservations ADD COLUMN scheduled_at DATETIME NULL AFTER notes',
    'ALTER TABLE reservations ADD COLUMN is_immediate TINYINT(1) NOT NULL DEFAULT 0 AFTER scheduled_at',
    'ALTER TABLE reservations ADD COLUMN tour_stops_json JSON NULL AFTER is_immediate',
    'ALTER TABLE reservations ADD COLUMN assigned_driver_id BIGINT UNSIGNED NULL AFTER tour_stops_json',
    'ALTER TABLE reservations ADD COLUMN hotel_room_id BIGINT UNSIGNED NULL AFTER assigned_driver_id',
    'ALTER TABLE reservations ADD COLUMN room_quantity INT NULL AFTER hotel_room_id'
  ];

  try {
    await pool.query(
      "ALTER TABLE hotel_rooms ADD COLUMN category ENUM('suite','solteiro','vip','casal') NOT NULL DEFAULT 'casal' AFTER name"
    );
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME') {
      throw error;
    }
  }

  for (const statement of reservationMigrations) {
    try {
      await pool.query(statement);
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }
  }

  const reservationIndexes = [
    'ALTER TABLE reservations ADD KEY reservations_driver_index (assigned_driver_id)',
    'ALTER TABLE reservations ADD KEY reservations_schedule_index (scheduled_at)'
  ];

  for (const statement of reservationIndexes) {
    try {
      await pool.query(statement);
    } catch (error) {
      if (error.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }
  }

  await pool.query(
    `INSERT INTO users (username, name, email, avatar, password_hash, role)
     VALUES (:username, 'Administrador Raiz', 'admin@vakwetuweya.ao', NULL, :passwordHash, 'admin')
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'admin'`,
    {
      username: adminUsername,
      passwordHash: hashPassword(adminPassword, 'vakwetu-root-2026')
    }
  );
}

async function seedBaseContent() {
  const [[destinationCount]] = await pool.query('SELECT COUNT(*) AS total FROM destinations');

  if (destinationCount.total > 0) {
    return;
  }

  for (const item of catalog.destinations) {
    await pool.query(
      `INSERT INTO destinations
       (slug, name, province, vibe, duration, price_from, rating, image, summary, latitude, longitude, highlights_json, featured)
       VALUES (:slug, :name, :province, :vibe, :duration, :priceFrom, :rating, :image, :summary, :lat, :lng, :highlights, :featured)`,
      {
        ...item,
        lat: item.coordinates.lat,
        lng: item.coordinates.lng,
        highlights: JSON.stringify(item.highlights),
        featured: item.id === 1 ? 1 : 0
      }
    );
  }

  for (const item of catalog.hotels) {
    await pool.query(
      `INSERT INTO hotels (name, destination, description, image, price_per_night, rating, amenities_json)
       VALUES (:name, :destination, :description, :image, :price, :rating, :amenities)`,
      { ...item, amenities: JSON.stringify(item.amenities) }
    );
  }

  for (const item of catalog.restaurants) {
    await pool.query(
      `INSERT INTO restaurants (name, destination, cuisine, description, image, average_price, rating)
       VALUES (:name, :destination, :cuisine, :description, :image, :price, :rating)`,
      item
    );
  }

  for (const item of catalog.tours) {
    await pool.query(
      `INSERT INTO tours (name, type, duration, description, image, price, rating)
       VALUES (:name, :type, :duration, :description, :image, :price, :rating)`,
      item
    );
  }

  for (const item of catalog.itineraries) {
    await pool.query(
      `INSERT INTO itineraries (name, days, mood, budget, stops_json, includes_json)
       VALUES (:name, :days, :mood, :budget, :stops, :includes)`,
      {
        ...item,
        stops: JSON.stringify(item.stops),
        includes: JSON.stringify(item.includes)
      }
    );
  }

  for (const item of catalog.testimonials) {
    await pool.query(
      `INSERT INTO testimonials (name, location, quote, score)
       VALUES (:name, :location, :quote, :score)`,
      item
    );
  }
}

async function seedHotelRooms() {
  if (!Array.isArray(catalog.hotelRooms) || catalog.hotelRooms.length === 0) {
    return;
  }

  const [[roomCount]] = await pool.query('SELECT COUNT(*) AS total FROM hotel_rooms');

  if (roomCount.total > 0) {
    return;
  }

  const [hotelRows] = await pool.query('SELECT id, name FROM hotels WHERE active = 1');

  for (const room of catalog.hotelRooms) {
    const localHotel = catalog.hotels.find((hotel) => Number(hotel.id) === Number(room.hotelId));
    const databaseHotel = hotelRows.find((hotel) => hotel.name === localHotel?.name);

    if (!databaseHotel) {
      continue;
    }

    await pool.query(
      `INSERT INTO hotel_rooms
       (hotel_id, name, category, description, price_per_night, capacity, stock, amenities_json, images_json)
       VALUES (:hotelId, :name, :category, :description, :price, :capacity, :stock, :amenities, :images)`,
      {
        ...room,
        hotelId: databaseHotel.id,
        amenities: JSON.stringify(room.amenities || []),
        images: JSON.stringify(room.images || [])
      }
    );
  }
}

async function seedAssistantFaqs() {
  const [[faqCount]] = await pool.query('SELECT COUNT(*) AS total FROM assistant_faqs');

  if (faqCount.total > 0) {
    return;
  }

  for (const faq of defaultAssistantFaqs) {
    await pool.query(
      `INSERT INTO assistant_faqs (category, question, answer, keywords_json, active)
       VALUES (:category, :question, :answer, :keywords, 1)`,
      {
        ...faq,
        keywords: JSON.stringify(faq.keywords)
      }
    );
  }
}

async function readCatalogFromDb() {
  const [destinationRows] = await pool.query('SELECT * FROM destinations WHERE active = 1 ORDER BY featured DESC, id ASC');
  const [hotelRows] = await pool.query('SELECT * FROM hotels WHERE active = 1 ORDER BY rating DESC, id ASC');
  const [roomRows] = await pool.query('SELECT * FROM hotel_rooms WHERE active = 1 ORDER BY hotel_id ASC, price_per_night ASC, id ASC');
  const [restaurantRows] = await pool.query('SELECT * FROM restaurants WHERE active = 1 ORDER BY rating DESC, id ASC');
  const [tourRows] = await pool.query('SELECT * FROM tours WHERE active = 1 ORDER BY rating DESC, id ASC');
  const [itineraryRows] = await pool.query('SELECT * FROM itineraries WHERE active = 1 ORDER BY days ASC, id ASC');
  const [testimonialRows] = await pool.query('SELECT * FROM testimonials WHERE active = 1 ORDER BY id ASC');

  const hotelRooms = roomRows.map((item) => ({
    id: item.id,
    hotelId: item.hotel_id,
    name: item.name,
    category: item.category || 'casal',
    description: item.description,
    price: normalizeNumber(item.price_per_night),
    capacity: Number(item.capacity || 1),
    stock: Number(item.stock || 1),
    amenities: parseJson(item.amenities_json),
    images: parseJson(item.images_json)
  }));

  return {
    destinations: destinationRows.map((item) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      province: item.province,
      vibe: item.vibe,
      duration: item.duration,
      priceFrom: normalizeNumber(item.price_from),
      rating: normalizeNumber(item.rating),
      image: item.image,
      summary: item.summary,
      coordinates: { lat: normalizeNumber(item.latitude), lng: normalizeNumber(item.longitude) },
      highlights: parseJson(item.highlights_json)
    })),
    hotels: hotelRows.map((item) => ({
      id: item.id,
      name: item.name,
      destination: item.destination,
      price: normalizeNumber(item.price_per_night),
      rating: normalizeNumber(item.rating),
      image: item.image,
      description: item.description,
      amenities: parseJson(item.amenities_json),
      rooms: hotelRooms.filter((room) => Number(room.hotelId) === Number(item.id))
    })),
    hotelRooms,
    restaurants: restaurantRows.map((item) => ({
      id: item.id,
      name: item.name,
      destination: item.destination,
      price: normalizeNumber(item.average_price),
      rating: normalizeNumber(item.rating),
      image: item.image,
      cuisine: item.cuisine,
      description: item.description
    })),
    tours: tourRows.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      duration: item.duration,
      price: normalizeNumber(item.price),
      rating: normalizeNumber(item.rating),
      image: item.image,
      description: item.description
    })),
    itineraries: itineraryRows.map((item) => ({
      id: item.id,
      name: item.name,
      days: item.days,
      mood: item.mood,
      budget: item.budget,
      stops: parseJson(item.stops_json),
      includes: parseJson(item.includes_json)
    })),
    testimonials: testimonialRows.map((item) => ({
      id: item.id,
      name: item.name,
      location: item.location,
      quote: item.quote,
      score: item.score
    })),
    stats: catalog.stats,
    source: 'mysql'
  };
}

function requireAdmin(request, response, next) {
  const token = request.headers.authorization?.replace('Bearer ', '');
  const session = token ? sessions.get(token) : null;

  if (!session || session.expiresAt < Date.now()) {
    return response.status(401).json({ message: 'Sessão expirada. Faça login novamente.' });
  }

  if (session.role !== 'admin') {
    return response.status(403).json({ message: 'Apenas administradores podem alterar conteúdos.' });
  }

  request.admin = session;
  return next();
}

function requireDriver(request, response, next) {
  return requireAuth(request, response, () => {
    if (request.user.role !== 'motorista') {
      return response.status(403).json({ message: 'Apenas motoristas podem aceder a esta area.' });
    }

    return next();
  });
}

function validateUserPayload(payload, { requirePassword = true } = {}) {
  ensureRequired(payload, ['username', 'name']);

  if (requirePassword && String(payload.password || '').length < 6) {
    throw new Error('A palavra-passe deve ter pelo menos 6 caracteres.');
  }

  return {
    username: String(payload.username).trim().toLowerCase(),
    name: String(payload.name).trim(),
    email: payload.email ? String(payload.email).trim().toLowerCase() : null,
    phone: payload.phone ? String(payload.phone).trim() : null,
    avatar: payload.avatar || null,
    password: payload.password
  };
}

function ensureDemoAdmin() {
  if (demoUsers.some((user) => user.username === adminUsername)) {
    return;
  }

  demoUsers.push({
    id: 1,
    username: adminUsername,
    name: 'Administrador Raiz',
    email: 'admin@vakwetuweya.ao',
    phone: null,
    avatar: null,
    password_hash: hashPassword(adminPassword, 'vakwetu-root-2026'),
    role: 'admin'
  });
}

async function findUserByIdentifier(identifier) {
  const normalizedIdentifier = String(identifier || '').trim().toLowerCase();

  if (!pool) {
    ensureDemoAdmin();
    return demoUsers.find(
      (user) =>
        user.username === normalizedIdentifier ||
        String(user.email || '').toLowerCase() === normalizedIdentifier
    );
  }

  const [rows] = await pool.query(
    `SELECT id, username, name, email, phone, avatar, password_hash, role
     FROM users
     WHERE username = :identifier OR email = :identifier
     LIMIT 1`,
    { identifier: normalizedIdentifier }
  );

  return rows[0];
}

async function authenticateUser(username, password) {
  const user = await findUserByIdentifier(username);

  if (!user || !verifyPassword(password, user.password_hash)) {
    return null;
  }

  return user;
}

app.get('/api/health', (request, response) => {
  response.json({ ok: true, database: Boolean(pool) });
});

app.get('/api/catalog', async (request, response) => {
  try {
    if (!pool) {
      return response.json({ ...demoCatalog, source: 'local' });
    }

    return response.json(await readCatalogFromDb());
  } catch (error) {
    return response.json({ ...demoCatalog, source: 'local', warning: error.message });
  }
});

app.get('/api/assistant/suggestions', async (request, response) => {
  if (!pool) {
    return response.json({
      suggestions: demoAssistantFaqs.filter((faq) => faq.active).slice(0, 6).map(toPublicAssistantFaq),
      source: 'demo'
    });
  }

  const [rows] = await pool.query(
    `SELECT id, category, question, answer, keywords_json, active, created_at, updated_at
     FROM assistant_faqs
     WHERE active = 1
     ORDER BY category ASC, id ASC
     LIMIT 8`
  );

  return response.json({ suggestions: rows.map(toPublicAssistantFaq), source: 'mysql' });
});

app.post('/api/assistant/chat', async (request, response) => {
  const message = String(request.body.message || '').trim();

  if (!message) {
    return response.status(422).json({ message: 'Escreva uma pergunta para o assistente.' });
  }

  if (message.length > 700) {
    return response.status(422).json({ message: 'A pergunta deve ter no máximo 700 caracteres.' });
  }

  let faqs = demoAssistantFaqs.map(toPublicAssistantFaq);

  if (pool) {
    const [rows] = await pool.query(
      `SELECT id, category, question, answer, keywords_json, active, created_at, updated_at
       FROM assistant_faqs
       WHERE active = 1
       ORDER BY id ASC`
    );
    faqs = rows.map(toPublicAssistantFaq);
  }

  const result = findAssistantAnswer(message, faqs);
  const suggestions = faqs
    .filter((faq) => !result.faq || Number(faq.id) !== Number(result.faq.id))
    .slice(0, 4)
    .map(({ id, category, question }) => ({ id, category, question }));

  if (!pool) {
    demoAssistantLogs.unshift({
      id: Date.now(),
      user_question: message,
      assistant_answer: result.answer,
      matched_faq_id: result.faq?.id || null,
      confidence: result.confidence,
      answered: result.matched ? 1 : 0,
      created_at: new Date().toISOString()
    });
  } else {
    await pool.query(
      `INSERT INTO assistant_logs
       (user_question, assistant_answer, matched_faq_id, confidence, answered)
       VALUES (:question, :answer, :matchedFaqId, :confidence, :answered)`,
      {
        question: message,
        answer: result.answer,
        matchedFaqId: result.faq?.id || null,
        confidence: result.confidence,
        answered: result.matched ? 1 : 0
      }
    );
  }

  return response.json({
    answer: result.answer,
    matched: result.matched,
    confidence: result.confidence,
    faq: result.faq ? { id: result.faq.id, category: result.faq.category, question: result.faq.question } : null,
    suggestions
  });
});

app.post('/api/uploads', async (request, response) => {
  try {
    const url = await saveDataUrlImage(request.body);
    return response.status(201).json({ ok: true, url });
  } catch (error) {
    return response.status(422).json({ message: error.message });
  }
});

app.post('/api/auth/register', async (request, response) => {
  try {
    const userData = validateUserPayload(request.body);

    if (!pool) {
      ensureDemoAdmin();

      if (
        demoUsers.some(
          (user) =>
            user.username === userData.username ||
            (userData.email && user.email === userData.email)
        )
      ) {
        return response.status(409).json({ message: 'Este usuário ou email já existe.' });
      }

      const user = {
        id: Date.now(),
        username: userData.username,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        avatar: userData.avatar,
        password_hash: hashPassword(userData.password),
        role: 'cliente'
      };
      demoUsers.push(user);

      return response.status(201).json(createSession(user));
    }

    const [result] = await pool.query(
      `INSERT INTO users (username, name, email, phone, avatar, password_hash, role)
       VALUES (:username, :name, :email, :phone, :avatar, :passwordHash, 'cliente')`,
      {
        ...userData,
        passwordHash: hashPassword(userData.password)
      }
    );
    const user = { ...userData, id: result.insertId, role: 'cliente' };

    return response.status(201).json(createSession(user));
  } catch (error) {
    const status = error.code === 'ER_DUP_ENTRY' ? 409 : 422;
    return response.status(status).json({ message: error.message });
  }
});

app.post('/api/auth/login', async (request, response) => {
  const { username, password } = request.body;
  const user = await authenticateUser(username, password);

  if (!user) {
    return response.status(401).json({ message: 'Credenciais inválidas.' });
  }

  return response.json(createSession(user));
});

app.get('/api/auth/me', requireAuth, (request, response) => {
  return response.json({ user: sanitizeUser(request.user) });
});

app.get('/api/drivers/available', async (request, response) => {
  const scheduledAt = request.query.scheduledAt || null;

  if (!pool) {
    const drivers = demoDriverProfiles
      .filter((profile) => profile.approved && profile.availability === 'livre')
      .map((profile) => {
        const user = demoUsers.find((item) => Number(item.id) === Number(profile.user_id));
        const vehicle = demoVehicles.find((item) => Number(item.driver_id) === Number(profile.user_id));
        return toPublicDriver({ ...profile, ...user, ...vehicle, user_id: profile.user_id });
      })
      .filter(Boolean);

    return response.json({
      drivers,
      pricing: { basePrice: tourBasePrice, includedStops: tourIncludedStops, extraStopPrice: tourExtraStopPrice },
      source: 'demo'
    });
  }

  const [rows] = await pool.query(
    `SELECT u.id AS user_id, u.username, u.name, u.phone, u.avatar,
            dp.bio, dp.license_number, dp.availability, dp.approved,
            dp.current_latitude, dp.current_longitude,
            v.id AS vehicle_id, v.make AS vehicle_make, v.model AS vehicle_model,
            v.vehicle_year, v.license_plate, v.capacity AS vehicle_capacity,
            v.vehicle_type, v.images_json AS vehicle_images_json
     FROM users u
     JOIN driver_profiles dp ON dp.user_id = u.id
     LEFT JOIN vehicles v ON v.driver_id = u.id AND v.active = 1
     WHERE u.role = 'motorista'
       AND dp.approved = 1
       AND dp.availability = 'livre'
       AND (
         :scheduledAt IS NULL OR NOT EXISTS (
           SELECT 1 FROM reservations r
           WHERE r.assigned_driver_id = u.id
             AND r.status IN ('pendente','confirmada')
             AND r.scheduled_at IS NOT NULL
             AND ABS(TIMESTAMPDIFF(MINUTE, r.scheduled_at, :scheduledAt)) < 360
         )
       )
     ORDER BY u.name ASC`,
    { scheduledAt }
  );

  return response.json({
    drivers: rows.map(toPublicDriver),
    pricing: { basePrice: tourBasePrice, includedStops: tourIncludedStops, extraStopPrice: tourExtraStopPrice },
    source: 'mysql'
  });
});

app.get('/api/driver/dashboard', requireDriver, async (request, response) => {
  if (!pool) {
    const profile = demoDriverProfiles.find((item) => Number(item.user_id) === Number(request.user.id));
    const vehicle = demoVehicles.find((item) => Number(item.driver_id) === Number(request.user.id));
    const tours = demoReservations
      .filter((item) => Number(item.assigned_driver_id) === Number(request.user.id))
      .map(toPublicReservation);

    return response.json({
      driver: toPublicDriver({ ...request.user, ...profile, ...vehicle, user_id: request.user.id }),
      tours,
      source: 'demo'
    });
  }

  const [driverRows] = await pool.query(
    `SELECT u.id AS user_id, u.username, u.name, u.phone, u.avatar,
            dp.bio, dp.license_number, dp.availability, dp.approved,
            dp.current_latitude, dp.current_longitude,
            v.id AS vehicle_id, v.make AS vehicle_make, v.model AS vehicle_model,
            v.vehicle_year, v.license_plate, v.capacity AS vehicle_capacity,
            v.vehicle_type, v.images_json AS vehicle_images_json
     FROM users u
     LEFT JOIN driver_profiles dp ON dp.user_id = u.id
     LEFT JOIN vehicles v ON v.driver_id = u.id AND v.active = 1
     WHERE u.id = :userId
     LIMIT 1`,
    { userId: request.user.id }
  );
  const [tourRows] = await pool.query(
    `SELECT r.*, hr.name AS hotel_room_name
     FROM reservations r
     LEFT JOIN hotel_rooms hr ON hr.id = r.hotel_room_id
     WHERE r.assigned_driver_id = :userId
     ORDER BY COALESCE(r.scheduled_at, r.created_at) DESC
     LIMIT 100`,
    { userId: request.user.id }
  );

  return response.json({
    driver: toPublicDriver(driverRows[0]),
    tours: tourRows.map(toPublicReservation),
    source: 'mysql'
  });
});

app.patch('/api/driver/availability', requireDriver, async (request, response) => {
  const availability = ['offline', 'livre', 'ocupado'].includes(request.body.availability)
    ? request.body.availability
    : null;
  const latitude = request.body.latitude === null || request.body.latitude === undefined
    ? null
    : Number(request.body.latitude);
  const longitude = request.body.longitude === null || request.body.longitude === undefined
    ? null
    : Number(request.body.longitude);

  if (!availability) {
    return response.status(422).json({ message: 'Estado de disponibilidade invalido.' });
  }

  if (!pool) {
    let profile = demoDriverProfiles.find((item) => Number(item.user_id) === Number(request.user.id));

    if (!profile) {
      profile = { user_id: request.user.id, approved: false };
      demoDriverProfiles.push(profile);
    }

    Object.assign(profile, {
      availability,
      current_latitude: Number.isFinite(latitude) ? latitude : profile.current_latitude ?? null,
      current_longitude: Number.isFinite(longitude) ? longitude : profile.current_longitude ?? null
    });

    return response.json({ ok: true, driver: toPublicDriver({ ...request.user, ...profile }) });
  }

  await pool.query(
    `INSERT INTO driver_profiles
     (user_id, availability, approved, current_latitude, current_longitude)
     VALUES (:userId, :availability, 0, :latitude, :longitude)
     ON DUPLICATE KEY UPDATE
       availability = VALUES(availability),
       current_latitude = COALESCE(VALUES(current_latitude), current_latitude),
       current_longitude = COALESCE(VALUES(current_longitude), current_longitude)`,
    {
      userId: request.user.id,
      availability,
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null
    }
  );

  return response.json({ ok: true, message: 'Disponibilidade atualizada.' });
});

app.post('/api/reservations', async (request, response) => {
  const payload = request.body;
  const token = request.headers.authorization?.replace('Bearer ', '');
  const session = readOptionalSession(request);

  if (token && !session) {
    return response.status(401).json({ message: 'SessÃ£o expirada. FaÃ§a login novamente.' });
  }

  if (!payload.name || !payload.email || !payload.phone) {
    return response.status(422).json({ message: 'Nome, email e telefone são obrigatórios.' });
  }

  const allowedTypes = ['destino', 'hotel', 'restaurante', 'tour', 'roteiro'];

  if (!allowedTypes.includes(payload.serviceType)) {
    return response.status(422).json({ message: 'Escolha um tipo de servico valido.' });
  }

  const tourStops = payload.serviceType === 'tour' ? normalizeTourStops(payload.tourStops) : [];
  const isImmediate = payload.serviceType === 'tour' && Boolean(payload.isImmediate);
  const scheduledAt = payload.serviceType === 'tour'
    ? isImmediate
      ? new Date().toISOString().slice(0, 19).replace('T', ' ')
      : payload.scheduledAt || null
    : null;
  let calculatedPrice = tourStops.length > 0 ? calculateTourPrice(tourStops) : null;
  const hotelRoomId = payload.serviceType === 'hotel' && payload.hotelRoomId
    ? Number(payload.hotelRoomId)
    : null;
  const roomQuantity = hotelRoomId ? Math.max(1, Number(payload.roomQuantity || 1)) : null;

  if (pool && hotelRoomId) {
    const [roomRows] = await pool.query(
      `SELECT id, hotel_id, price_per_night, capacity, stock
       FROM hotel_rooms
       WHERE id = :roomId AND active = 1
       LIMIT 1`,
      { roomId: hotelRoomId }
    );
    const room = roomRows[0];

    if (!room || (payload.serviceId && Number(room.hotel_id) !== Number(payload.serviceId))) {
      return response.status(422).json({ message: 'O quarto selecionado nao pertence a este hotel.' });
    }

    if (roomQuantity > Number(room.stock || 1)) {
      return response.status(422).json({ message: 'A quantidade de quartos excede a disponibilidade.' });
    }

    if (Number(payload.travelers || 1) > Number(room.capacity || 1) * roomQuantity) {
      return response.status(422).json({ message: 'A quantidade de pessoas excede a capacidade dos quartos.' });
    }

    const start = payload.startDate ? new Date(payload.startDate) : null;
    const end = payload.endDate ? new Date(payload.endDate) : null;
    const nights = start && end
      ? Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000))
      : 1;
    calculatedPrice = Number(room.price_per_night) * nights * roomQuantity;
  }

  const now = new Date().toISOString();
  const reservation = {
    id: Date.now(),
    user_id: session?.id || null,
    service_type: payload.serviceType,
    service_id: payload.serviceId || null,
    customer_name: payload.name,
    customer_email: payload.email,
    customer_phone: payload.phone,
    travelers: Number(payload.travelers || 1),
    start_date: payload.startDate || null,
    end_date: payload.endDate || null,
    budget: payload.budget || calculatedPrice || null,
    calculated_price: calculatedPrice,
    notes: payload.notes || null,
    scheduled_at: scheduledAt,
    is_immediate: isImmediate ? 1 : 0,
    tour_stops_json: tourStops.length > 0 ? JSON.stringify(tourStops) : null,
    assigned_driver_id: null,
    hotel_room_id: hotelRoomId,
    room_quantity: roomQuantity,
    status: 'pendente',
    created_at: now,
    updated_at: now
  };

  if (!pool) {
    demoReservations.unshift(reservation);
    return response.status(201).json({
      ok: true,
      demo: true,
      message: 'Reserva criada em modo demonstração. Ative o MySQL para persistência.'
    });
  }

  await pool.query(
    `INSERT INTO reservations
     (user_id, service_type, service_id, customer_name, customer_email, customer_phone, travelers,
      start_date, end_date, budget, calculated_price, notes, scheduled_at, is_immediate,
      tour_stops_json, assigned_driver_id, hotel_room_id, room_quantity)
     VALUES (:user_id, :service_type, :service_id, :customer_name, :customer_email, :customer_phone, :travelers,
      :start_date, :end_date, :budget, :calculated_price, :notes, :scheduled_at, :is_immediate,
      :tour_stops_json, :assigned_driver_id, :hotel_room_id, :room_quantity)`,
    reservation
  );

  return response.status(201).json({
    ok: true,
    message: 'Reserva enviada com sucesso. A equipa vai confirmar os detalhes contigo.'
  });
});

app.get('/api/reservations/me', requireAuth, async (request, response) => {
  const userEmail = request.user.email ? String(request.user.email).toLowerCase() : null;

  if (!pool) {
    const reservations = demoReservations
      .filter(
        (item) =>
          Number(item.user_id) === Number(request.user.id) ||
          (userEmail && String(item.customer_email || '').toLowerCase() === userEmail)
      )
      .map(toPublicReservation);

    return response.json({ reservations, source: 'demo' });
  }

  const whereClause = userEmail
    ? 'WHERE user_id = :userId OR LOWER(customer_email) = :email'
    : 'WHERE user_id = :userId';
  const [rows] = await pool.query(
    `SELECT r.*, hr.name AS hotel_room_name,
            du.name AS driver_name, du.phone AS driver_phone, du.avatar AS driver_avatar,
            v.id AS vehicle_id, v.make AS vehicle_make, v.model AS vehicle_model,
            v.license_plate, v.capacity AS vehicle_capacity, v.vehicle_type
     FROM reservations r
     LEFT JOIN hotel_rooms hr ON hr.id = r.hotel_room_id
     LEFT JOIN users du ON du.id = r.assigned_driver_id
     LEFT JOIN vehicles v ON v.driver_id = r.assigned_driver_id AND v.active = 1
     ${whereClause}
     ORDER BY r.created_at DESC
     LIMIT 80`,
    { userId: request.user.id, email: userEmail }
  );

  return response.json({ reservations: rows.map(toPublicReservation), source: 'mysql' });
});

app.post('/api/contacts', async (request, response) => {
  const payload = request.body;

  if (!payload.name || !payload.email || !payload.subject || !payload.message) {
    return response.status(422).json({ message: 'Preencha todos os campos de contacto.' });
  }

  if (!pool) {
    demoContacts.unshift({ id: Date.now(), ...payload, status: 'novo' });
    return response.status(201).json({
      ok: true,
      demo: true,
      message: 'Mensagem guardada em modo demonstração.'
    });
  }

  await pool.query(
    `INSERT INTO contacts (name, email, subject, message)
     VALUES (:name, :email, :subject, :message)`,
    payload
  );

  return response.status(201).json({ ok: true, message: 'Mensagem enviada com sucesso.' });
});

app.post('/api/admin/login', async (request, response) => {
  const { username, password } = request.body;
  const user = await authenticateUser(username, password);

  if (!user || user.role !== 'admin') {
    return response.status(401).json({ message: 'Credenciais inválidas.' });
  }

  return response.json(createSession(user));
});

app.post('/api/admin/content/:resource', requireAdmin, async (request, response) => {
  try {
    const { resource } = request.params;
    const item = normalizeResourcePayload(resource, request.body);

    if (!Object.hasOwn(demoCatalog, resource)) {
      return response.status(404).json({ message: 'Separador administrativo inválido.' });
    }

    if (!pool) {
      demoCatalog[resource].unshift(item);
      return response.status(201).json({
        ok: true,
        demo: true,
        item,
        message: 'Conteúdo criado em modo demonstração.'
      });
    }

    const created = await insertResource(resource, item);

    return response.status(201).json({
      ok: true,
      item: created,
      message: 'Conteúdo criado e guardado na base de dados.'
    });
  } catch (error) {
    return response.status(422).json({ message: error.message });
  }
});

app.put('/api/admin/content/:resource/:id', requireAdmin, async (request, response) => {
  try {
    const { resource } = request.params;
    const id = Number(request.params.id);
    const item = normalizeResourcePayload(resource, request.body);

    if (!Object.hasOwn(demoCatalog, resource)) {
      return response.status(404).json({ message: 'Separador administrativo inválido.' });
    }

    if (!Number.isFinite(id)) {
      return response.status(422).json({ message: 'ID inválido.' });
    }

    if (!pool) {
      const index = demoCatalog[resource].findIndex((entry) => Number(entry.id) === id);

      if (index < 0) {
        return response.status(404).json({ message: 'Registo não encontrado.' });
      }

      const updated = { ...item, id };
      demoCatalog[resource][index] = updated;

      return response.json({
        ok: true,
        demo: true,
        item: updated,
        message: 'Conteúdo atualizado em modo demonstração.'
      });
    }

    const updated = await updateResource(resource, id, item);

    return response.json({
      ok: true,
      item: updated,
      message: 'Conteúdo atualizado na base de dados.'
    });
  } catch (error) {
    return response.status(422).json({ message: error.message });
  }
});

app.delete('/api/admin/content/:resource/:id', requireAdmin, async (request, response) => {
  try {
    const { resource } = request.params;
    const id = Number(request.params.id);

    if (!Object.hasOwn(demoCatalog, resource)) {
      return response.status(404).json({ message: 'Separador administrativo invÃ¡lido.' });
    }

    if (!Number.isFinite(id)) {
      return response.status(422).json({ message: 'ID invÃ¡lido.' });
    }

    if (!pool) {
      const index = demoCatalog[resource].findIndex((entry) => Number(entry.id) === id);

      if (index < 0) {
        return response.status(404).json({ message: 'Registo nÃ£o encontrado.' });
      }

      demoCatalog[resource].splice(index, 1);
      return response.json({ ok: true, demo: true, message: 'ConteÃºdo eliminado em modo demonstraÃ§Ã£o.' });
    }

    await deleteResource(resource, id);
    return response.json({ ok: true, message: 'ConteÃºdo eliminado.' });
  } catch (error) {
    return response.status(422).json({ message: error.message });
  }
});

app.get('/api/admin/users', requireAdmin, async (request, response) => {
  if (!pool) {
    ensureDemoAdmin();
    return response.json({ users: demoUsers.map(toPublicUser), source: 'demo' });
  }

  const [rows] = await pool.query(
    'SELECT id, username, name, email, phone, avatar, role, created_at FROM users ORDER BY created_at DESC, id DESC'
  );

  return response.json({ users: rows.map(toPublicUser), source: 'mysql' });
});

app.put('/api/admin/users/:id', requireAdmin, async (request, response) => {
  try {
    const id = Number(request.params.id);
    const role = normalizeRole(request.body.role);
    const userData = validateUserPayload(request.body, { requirePassword: false });

    if (!Number.isFinite(id)) {
      return response.status(422).json({ message: 'ID invÃ¡lido.' });
    }

    if (!pool) {
      ensureDemoAdmin();
      const user = demoUsers.find((item) => Number(item.id) === id);

      if (!user) {
        return response.status(404).json({ message: 'Utilizador nÃ£o encontrado.' });
      }

      const isRootUser = user.username === adminUsername;
      Object.assign(user, {
        username: isRootUser ? adminUsername : userData.username,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        avatar: userData.avatar,
        role: isRootUser ? 'admin' : role
      });

      if (userData.password) {
        if (String(userData.password).length < 6) {
          return response.status(422).json({ message: 'A palavra-passe deve ter pelo menos 6 caracteres.' });
        }

        user.password_hash = hashPassword(userData.password);
      }

      return response.json({ ok: true, user: toPublicUser(user), message: 'Utilizador atualizado.' });
    }

    const [currentRows] = await pool.query(
      'SELECT id, username FROM users WHERE id = :id LIMIT 1',
      { id }
    );
    const currentUser = currentRows[0];

    if (!currentUser) {
      return response.status(404).json({ message: 'Utilizador nÃ£o encontrado.' });
    }

    const isRootUser = currentUser.username === adminUsername;
    const updatePayload = {
      id,
      username: isRootUser ? adminUsername : userData.username,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      avatar: userData.avatar,
      role: isRootUser ? 'admin' : role
    };

    if (userData.password) {
      if (String(userData.password).length < 6) {
        return response.status(422).json({ message: 'A palavra-passe deve ter pelo menos 6 caracteres.' });
      }

      await pool.query(
        `UPDATE users SET
          username = :username,
          name = :name,
          email = :email,
          phone = :phone,
          avatar = :avatar,
          role = :role,
          password_hash = :passwordHash
         WHERE id = :id`,
        { ...updatePayload, passwordHash: hashPassword(userData.password) }
      );
    } else {
      await pool.query(
        `UPDATE users SET
          username = :username,
          name = :name,
          email = :email,
          phone = :phone,
          avatar = :avatar,
          role = :role
         WHERE id = :id`,
        updatePayload
      );
    }

    const [rows] = await pool.query(
      'SELECT id, username, name, email, phone, avatar, role FROM users WHERE id = :id LIMIT 1',
      { id }
    );

    return response.json({ ok: true, user: toPublicUser(rows[0]), message: 'Utilizador atualizado.' });
  } catch (error) {
    const status = error.code === 'ER_DUP_ENTRY' ? 409 : 422;
    return response.status(status).json({ message: error.message });
  }
});

app.patch('/api/admin/users/:id/role', requireAdmin, async (request, response) => {
  const id = Number(request.params.id);
  const role = normalizeRole(request.body.role);

  if (!Number.isFinite(id)) {
    return response.status(422).json({ message: 'ID invÃ¡lido.' });
  }

  if (Number(request.admin.id) === id && role !== 'admin') {
    return response.status(422).json({ message: 'NÃ£o pode remover o privilÃ©gio da prÃ³pria sessÃ£o.' });
  }

  if (!pool) {
    ensureDemoAdmin();
    const user = demoUsers.find((item) => Number(item.id) === id);

    if (!user) {
      return response.status(404).json({ message: 'Utilizador nÃ£o encontrado.' });
    }

    if (user.username === adminUsername && role !== 'admin') {
      return response.status(422).json({ message: 'O administrador raiz dchivela deve permanecer como administrador.' });
    }

    user.role = role;
    return response.json({ ok: true, user: toPublicUser(user), message: 'PermissÃ£o atualizada.' });
  }

  const [rows] = await pool.query(
    'SELECT id, username, name, email, phone, avatar, role FROM users WHERE id = :id LIMIT 1',
    { id }
  );

  if (rows[0]?.username === adminUsername && role !== 'admin') {
    return response.status(422).json({ message: 'O administrador raiz dchivela deve permanecer como administrador.' });
  }

  if (rows[0]) {
    await pool.query('UPDATE users SET role = :role WHERE id = :id', { id, role });
    rows[0].role = role;
  }

  if (!rows[0]) {
    return response.status(404).json({ message: 'Utilizador nÃ£o encontrado.' });
  }

  return response.json({ ok: true, user: toPublicUser(rows[0]), message: 'PermissÃ£o atualizada.' });
});

app.delete('/api/admin/users/:id', requireAdmin, async (request, response) => {
  const id = Number(request.params.id);

  if (!Number.isFinite(id)) {
    return response.status(422).json({ message: 'ID invÃ¡lido.' });
  }

  if (!pool) {
    ensureDemoAdmin();
    const index = demoUsers.findIndex((user) => Number(user.id) === id);
    const user = demoUsers[index];

    if (!user) {
      return response.status(404).json({ message: 'Utilizador nÃ£o encontrado.' });
    }

    if (user.username === adminUsername) {
      return response.status(422).json({ message: 'O administrador raiz dchivela nÃ£o pode ser eliminado.' });
    }

    demoUsers.splice(index, 1);
    const profileIndex = demoDriverProfiles.findIndex((item) => Number(item.user_id) === id);
    const vehicleIndex = demoVehicles.findIndex((item) => Number(item.driver_id) === id);
    if (profileIndex >= 0) demoDriverProfiles.splice(profileIndex, 1);
    if (vehicleIndex >= 0) demoVehicles.splice(vehicleIndex, 1);
    return response.json({ ok: true, message: 'Utilizador eliminado.' });
  }

  const [rows] = await pool.query(
    'SELECT id, username FROM users WHERE id = :id LIMIT 1',
    { id }
  );
  const user = rows[0];

  if (!user) {
    return response.status(404).json({ message: 'Utilizador nÃ£o encontrado.' });
  }

  if (user.username === adminUsername) {
    return response.status(422).json({ message: 'O administrador raiz dchivela nÃ£o pode ser eliminado.' });
  }

  await pool.query('DELETE FROM vehicles WHERE driver_id = :id', { id });
  await pool.query('DELETE FROM driver_profiles WHERE user_id = :id', { id });
  await pool.query('DELETE FROM users WHERE id = :id', { id });
  return response.json({ ok: true, message: 'Utilizador eliminado.' });
});

app.get('/api/admin/drivers', requireAdmin, async (request, response) => {
  if (!pool) {
    const drivers = demoUsers
      .filter((user) => user.role === 'motorista')
      .map((user) => {
        const profile = demoDriverProfiles.find((item) => Number(item.user_id) === Number(user.id));
        const vehicle = demoVehicles.find((item) => Number(item.driver_id) === Number(user.id));
        return toPublicDriver({ ...user, ...profile, ...vehicle, user_id: user.id });
      });
    return response.json({ drivers, source: 'demo' });
  }

  const [rows] = await pool.query(
    `SELECT u.id AS user_id, u.username, u.name, u.phone, u.avatar,
            dp.bio, dp.license_number, dp.availability, dp.approved,
            dp.current_latitude, dp.current_longitude,
            v.id AS vehicle_id, v.make AS vehicle_make, v.model AS vehicle_model,
            v.vehicle_year, v.license_plate, v.capacity AS vehicle_capacity,
            v.vehicle_type, v.images_json AS vehicle_images_json
     FROM users u
     LEFT JOIN driver_profiles dp ON dp.user_id = u.id
     LEFT JOIN vehicles v ON v.driver_id = u.id AND v.active = 1
     WHERE u.role = 'motorista'
     ORDER BY u.name ASC`
  );

  return response.json({ drivers: rows.map(toPublicDriver), source: 'mysql' });
});

app.put('/api/admin/drivers/:userId', requireAdmin, async (request, response) => {
  try {
    const userId = Number(request.params.userId);
    const payload = request.body;
    const availability = ['offline', 'livre', 'ocupado'].includes(payload.availability)
      ? payload.availability
      : 'offline';
    const vehicle = payload.vehicle || {};

    if (!Number.isFinite(userId)) {
      return response.status(422).json({ message: 'Motorista invalido.' });
    }

    if (!pool) {
      const user = demoUsers.find((item) => Number(item.id) === userId && item.role === 'motorista');

      if (!user) {
        return response.status(404).json({ message: 'Motorista nao encontrado.' });
      }

      let profile = demoDriverProfiles.find((item) => Number(item.user_id) === userId);
      if (!profile) {
        profile = { user_id: userId };
        demoDriverProfiles.push(profile);
      }
      Object.assign(profile, {
        bio: payload.bio || '',
        license_number: payload.licenseNumber || '',
        availability,
        approved: Boolean(payload.approved),
        current_latitude: payload.latitude ?? null,
        current_longitude: payload.longitude ?? null
      });

      if (vehicle.make && vehicle.model && vehicle.licensePlate) {
        let storedVehicle = demoVehicles.find((item) => Number(item.driver_id) === userId);
        if (!storedVehicle) {
          storedVehicle = { id: Date.now(), driver_id: userId };
          demoVehicles.push(storedVehicle);
        }
        Object.assign(storedVehicle, {
          vehicle_id: storedVehicle.id,
          vehicle_make: vehicle.make,
          vehicle_model: vehicle.model,
          vehicle_year: Number(vehicle.year || 0) || null,
          license_plate: vehicle.licensePlate,
          vehicle_capacity: Math.max(1, Number(vehicle.capacity || 4)),
          vehicle_type: vehicle.type || '',
          vehicle_images_json: JSON.stringify(vehicle.images || [])
        });
      }

      return response.json({ ok: true, message: 'Perfil de motorista atualizado.' });
    }

    const [userRows] = await pool.query(
      `SELECT id FROM users WHERE id = :userId AND role = 'motorista' LIMIT 1`,
      { userId }
    );

    if (!userRows[0]) {
      return response.status(404).json({ message: 'Promova o utilizador a motorista antes de criar o perfil.' });
    }

    await pool.query(
      `INSERT INTO driver_profiles
       (user_id, bio, license_number, availability, approved, current_latitude, current_longitude)
       VALUES (:userId, :bio, :licenseNumber, :availability, :approved, :latitude, :longitude)
       ON DUPLICATE KEY UPDATE
         bio = VALUES(bio),
         license_number = VALUES(license_number),
         availability = VALUES(availability),
         approved = VALUES(approved),
         current_latitude = VALUES(current_latitude),
         current_longitude = VALUES(current_longitude)`,
      {
        userId,
        bio: payload.bio || '',
        licenseNumber: payload.licenseNumber || null,
        availability,
        approved: payload.approved ? 1 : 0,
        latitude: payload.latitude !== '' && Number.isFinite(Number(payload.latitude)) ? Number(payload.latitude) : null,
        longitude: payload.longitude !== '' && Number.isFinite(Number(payload.longitude)) ? Number(payload.longitude) : null
      }
    );

    if (vehicle.make && vehicle.model && vehicle.licensePlate) {
      const [plateRows] = await pool.query(
        `SELECT id FROM vehicles
         WHERE license_plate = :licensePlate AND driver_id <> :driverId
         LIMIT 1`,
        { licensePlate: vehicle.licensePlate, driverId: userId }
      );

      if (plateRows[0]) {
        return response.status(409).json({ message: 'Esta matricula ja esta associada a outro motorista.' });
      }

      await pool.query(
        `INSERT INTO vehicles
         (driver_id, make, model, vehicle_year, license_plate, capacity, vehicle_type, images_json, active)
         VALUES (:driverId, :make, :model, :year, :licensePlate, :capacity, :type, :images, 1)
         ON DUPLICATE KEY UPDATE
           make = VALUES(make),
           model = VALUES(model),
           vehicle_year = VALUES(vehicle_year),
           license_plate = VALUES(license_plate),
           capacity = VALUES(capacity),
           vehicle_type = VALUES(vehicle_type),
           images_json = VALUES(images_json),
           active = 1`,
        {
          driverId: userId,
          make: vehicle.make,
          model: vehicle.model,
          year: Number(vehicle.year || 0) || null,
          licensePlate: vehicle.licensePlate,
          capacity: Math.max(1, Number(vehicle.capacity || 4)),
          type: vehicle.type || null,
          images: JSON.stringify(vehicle.images || [])
        }
      );
    }

    return response.json({ ok: true, message: 'Perfil de motorista atualizado.' });
  } catch (error) {
    const status = error.code === 'ER_DUP_ENTRY' ? 409 : 422;
    return response.status(status).json({ message: error.message });
  }
});

app.patch('/api/admin/reservations/:id/status', requireAdmin, async (request, response) => {
  const reservationId = Number(request.params.id);
  const nextStatus = request.body.status;
  const allowedStatuses = ['pendente', 'confirmada', 'cancelada', 'concluida'];

  if (!Number.isFinite(reservationId) || !allowedStatuses.includes(nextStatus)) {
    return response.status(422).json({ message: 'Reserva ou estado invalido.' });
  }

  if (!pool) {
    const reservation = demoReservations.find((item) => Number(item.id) === reservationId);

    if (!reservation) {
      return response.status(404).json({ message: 'Reserva nao encontrada.' });
    }

    if (reservation.service_type === 'tour' && nextStatus === 'confirmada' && !reservation.assigned_driver_id) {
      return response.status(422).json({ message: 'Atribua um motorista antes de confirmar a tour.' });
    }

    reservation.status = nextStatus;
    reservation.updated_at = new Date().toISOString();

    if (
      reservation.assigned_driver_id &&
      ['cancelada', 'concluida'].includes(nextStatus)
    ) {
      const driver = demoDriverProfiles.find(
        (item) => Number(item.user_id) === Number(reservation.assigned_driver_id)
      );
      if (driver) driver.availability = 'livre';
    }

    return response.json({
      ok: true,
      reservation: toPublicReservation(reservation),
      message: nextStatus === 'confirmada' ? 'Reserva aprovada.' : 'Estado da reserva atualizado.'
    });
  }

  const [rows] = await pool.query(
    `SELECT id, service_type, status, assigned_driver_id
     FROM reservations
     WHERE id = :reservationId
     LIMIT 1`,
    { reservationId }
  );
  const reservation = rows[0];

  if (!reservation) {
    return response.status(404).json({ message: 'Reserva nao encontrada.' });
  }

  if (reservation.service_type === 'tour' && nextStatus === 'confirmada' && !reservation.assigned_driver_id) {
    return response.status(422).json({ message: 'Atribua um motorista antes de confirmar a tour.' });
  }

  await pool.query(
    `UPDATE reservations SET status = :nextStatus WHERE id = :reservationId`,
    { reservationId, nextStatus }
  );

  if (reservation.assigned_driver_id && ['cancelada', 'concluida'].includes(nextStatus)) {
    await pool.query(
      `UPDATE driver_profiles SET availability = 'livre' WHERE user_id = :driverId`,
      { driverId: reservation.assigned_driver_id }
    );
  }

  return response.json({
    ok: true,
    message: nextStatus === 'confirmada' ? 'Reserva aprovada.' : 'Estado da reserva atualizado.'
  });
});

app.patch('/api/admin/reservations/:id/assign-driver', requireAdmin, async (request, response) => {
  const reservationId = Number(request.params.id);
  const driverId = Number(request.body.driverId);

  if (!Number.isFinite(reservationId) || !Number.isFinite(driverId)) {
    return response.status(422).json({ message: 'Reserva ou motorista invalido.' });
  }

  if (!pool) {
    const reservation = demoReservations.find((item) => Number(item.id) === reservationId);
    const driver = demoDriverProfiles.find(
      (item) => Number(item.user_id) === driverId && item.approved
    );

    if (!reservation || reservation.service_type !== 'tour' || !driver) {
      return response.status(404).json({ message: 'Reserva ou motorista nao encontrado.' });
    }

    reservation.assigned_driver_id = driverId;
    reservation.status = 'confirmada';
    if (reservation.is_immediate) {
      driver.availability = 'ocupado';
    }
    return response.json({ ok: true, reservation: toPublicReservation(reservation) });
  }

  const [driverRows] = await pool.query(
    `SELECT u.id
     FROM users u
     JOIN driver_profiles dp ON dp.user_id = u.id
     WHERE u.id = :driverId AND u.role = 'motorista' AND dp.approved = 1
     LIMIT 1`,
    { driverId }
  );

  if (!driverRows[0]) {
    return response.status(422).json({ message: 'Escolha um motorista aprovado.' });
  }

  const [reservationRows] = await pool.query(
    `SELECT id, service_type, is_immediate FROM reservations WHERE id = :reservationId LIMIT 1`,
    { reservationId }
  );
  const reservation = reservationRows[0];

  if (!reservation || reservation.service_type !== 'tour') {
    return response.status(404).json({ message: 'Reserva de tour nao encontrada.' });
  }

  await pool.query(
    `UPDATE reservations
     SET assigned_driver_id = :driverId, status = 'confirmada'
     WHERE id = :reservationId`,
    { driverId, reservationId }
  );

  if (reservation.is_immediate) {
    await pool.query(
      `UPDATE driver_profiles SET availability = 'ocupado' WHERE user_id = :driverId`,
      { driverId }
    );
  }

  return response.json({ ok: true, message: 'Motorista atribuido e tour confirmado.' });
});

app.get('/api/admin/reservations', requireAdmin, async (request, response) => {
  if (!pool) {
    return response.json({
      reservations: demoReservations.map(toPublicReservation),
      source: 'demo'
    });
  }

  const [rows] = await pool.query(
    `SELECT r.*, hr.name AS hotel_room_name,
            du.name AS driver_name, du.phone AS driver_phone, du.avatar AS driver_avatar,
            v.id AS vehicle_id, v.make AS vehicle_make, v.model AS vehicle_model,
            v.license_plate, v.capacity AS vehicle_capacity, v.vehicle_type
     FROM reservations r
     LEFT JOIN hotel_rooms hr ON hr.id = r.hotel_room_id
     LEFT JOIN users du ON du.id = r.assigned_driver_id
     LEFT JOIN vehicles v ON v.driver_id = r.assigned_driver_id AND v.active = 1
     ORDER BY r.created_at DESC
     LIMIT 200`
  );

  return response.json({ reservations: rows.map(toPublicReservation), source: 'mysql' });
});

app.get('/api/admin/assistant/faqs', requireAdmin, async (request, response) => {
  if (!pool) {
    return response.json({
      faqs: demoAssistantFaqs.filter((faq) => faq.active).map(toPublicAssistantFaq),
      source: 'demo'
    });
  }

  const [rows] = await pool.query(
    `SELECT id, category, question, answer, keywords_json, active, created_at, updated_at
     FROM assistant_faqs
     WHERE active = 1
     ORDER BY category ASC, id DESC`
  );

  return response.json({ faqs: rows.map(toPublicAssistantFaq), source: 'mysql' });
});

app.post('/api/admin/assistant/faqs', requireAdmin, async (request, response) => {
  try {
    const faq = normalizeAssistantFaqPayload(request.body);

    if (!pool) {
      const created = {
        id: Date.now(),
        ...faq,
        active: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      demoAssistantFaqs.unshift(created);
      return response.status(201).json({
        ok: true,
        faq: toPublicAssistantFaq(created),
        message: 'FAQ criada para o assistente.'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO assistant_faqs (category, question, answer, keywords_json, active)
       VALUES (:category, :question, :answer, :keywords, :active)`,
      {
        ...faq,
        keywords: JSON.stringify(faq.keywords)
      }
    );

    return response.status(201).json({
      ok: true,
      faq: { ...faq, id: result.insertId },
      message: 'FAQ criada para o assistente.'
    });
  } catch (error) {
    return response.status(422).json({ message: error.message });
  }
});

app.put('/api/admin/assistant/faqs/:id', requireAdmin, async (request, response) => {
  const id = Number(request.params.id);

  if (!Number.isFinite(id)) {
    return response.status(422).json({ message: 'ID invÃ¡lido.' });
  }

  try {
    const faq = normalizeAssistantFaqPayload(request.body);

    if (!pool) {
      const item = demoAssistantFaqs.find((entry) => Number(entry.id) === id);

      if (!item) {
        return response.status(404).json({ message: 'FAQ nÃ£o encontrada.' });
      }

      Object.assign(item, faq, { updated_at: new Date().toISOString() });
      return response.json({ ok: true, faq: toPublicAssistantFaq(item), message: 'FAQ atualizada.' });
    }

    const [result] = await pool.query(
      `UPDATE assistant_faqs SET
        category = :category,
        question = :question,
        answer = :answer,
        keywords_json = :keywords,
        active = :active
       WHERE id = :id`,
      {
        ...faq,
        id,
        keywords: JSON.stringify(faq.keywords)
      }
    );

    if (result.affectedRows === 0) {
      return response.status(404).json({ message: 'FAQ nÃ£o encontrada.' });
    }

    return response.json({ ok: true, faq: { ...faq, id }, message: 'FAQ atualizada.' });
  } catch (error) {
    return response.status(422).json({ message: error.message });
  }
});

app.delete('/api/admin/assistant/faqs/:id', requireAdmin, async (request, response) => {
  const id = Number(request.params.id);

  if (!Number.isFinite(id)) {
    return response.status(422).json({ message: 'ID invÃ¡lido.' });
  }

  if (!pool) {
    const item = demoAssistantFaqs.find((entry) => Number(entry.id) === id);

    if (!item) {
      return response.status(404).json({ message: 'FAQ nÃ£o encontrada.' });
    }

    item.active = 0;
    return response.json({ ok: true, message: 'FAQ removida do assistente.' });
  }

  const [result] = await pool.query('UPDATE assistant_faqs SET active = 0 WHERE id = :id', { id });

  if (result.affectedRows === 0) {
    return response.status(404).json({ message: 'FAQ nÃ£o encontrada.' });
  }

  return response.json({ ok: true, message: 'FAQ removida do assistente.' });
});

app.get('/api/admin/assistant/logs', requireAdmin, async (request, response) => {
  if (!pool) {
    return response.json({ logs: demoAssistantLogs.slice(0, 80).map(toPublicAssistantLog), source: 'demo' });
  }

  const [rows] = await pool.query(
    `SELECT id, user_question, assistant_answer, matched_faq_id, confidence, answered, created_at
     FROM assistant_logs
     ORDER BY created_at DESC
     LIMIT 100`
  );

  return response.json({ logs: rows.map(toPublicAssistantLog), source: 'mysql' });
});

app.get('/api/admin/overview', requireAdmin, async (request, response) => {
  if (!pool) {
    ensureDemoAdmin();

    return response.json({
      metrics: {
        reservations: demoReservations.length,
        contacts: demoContacts.length,
        pending: demoReservations.filter((item) => item.status === 'pendente').length,
        users: demoUsers.length,
        assistantPending: demoAssistantLogs.filter((item) => !item.answered).length,
        contents:
          demoCatalog.destinations.length +
          demoCatalog.hotels.length +
          demoCatalog.restaurants.length +
          demoCatalog.tours.length +
          demoCatalog.itineraries.length +
          demoCatalog.testimonials.length
      },
      reservations: demoReservations.slice(0, 8),
      contacts: demoContacts.slice(0, 8),
      source: 'demo'
    });
  }

  const [[reservationCount]] = await pool.query('SELECT COUNT(*) AS total FROM reservations');
  const [[contactCount]] = await pool.query('SELECT COUNT(*) AS total FROM contacts');
  const [[userCount]] = await pool.query('SELECT COUNT(*) AS total FROM users');
  const [[pendingCount]] = await pool.query(
    "SELECT COUNT(*) AS total FROM reservations WHERE status = 'pendente'"
  );
  const [[assistantPendingCount]] = await pool.query(
    'SELECT COUNT(*) AS total FROM assistant_logs WHERE answered = 0'
  );
  const [contentCounts] = await pool.query(
    `SELECT
      (SELECT COUNT(*) FROM destinations WHERE active = 1) AS destinations,
      (SELECT COUNT(*) FROM hotels WHERE active = 1) AS hotels,
      (SELECT COUNT(*) FROM restaurants WHERE active = 1) AS restaurants,
      (SELECT COUNT(*) FROM tours WHERE active = 1) AS tours,
      (SELECT COUNT(*) FROM itineraries WHERE active = 1) AS itineraries,
      (SELECT COUNT(*) FROM testimonials WHERE active = 1) AS testimonials`
  );
  const [reservations] = await pool.query(
    `SELECT id, service_type, customer_name, travelers, status, created_at
     FROM reservations
     ORDER BY created_at DESC
     LIMIT 8`
  );
  const [contacts] = await pool.query(
    `SELECT id, name, subject, status, created_at
     FROM contacts
     ORDER BY created_at DESC
     LIMIT 8`
  );

  return response.json({
    metrics: {
      reservations: reservationCount.total,
      contacts: contactCount.total,
      pending: pendingCount.total,
      users: userCount.total,
      assistantPending: assistantPendingCount.total,
      contents: Object.values(contentCounts[0]).reduce((sum, total) => sum + Number(total), 0)
    },
    contentCounts: contentCounts[0],
    reservations,
    contacts,
    source: 'mysql'
  });
});

app.use(express.static(distRoot));

app.get(/^(?!\/api).*/, async (request, response, next) => {
  try {
    await fs.access(indexFile);
    return response.sendFile(indexFile);
  } catch (error) {
    return next();
  }
});

await connectDatabase();

app.listen(port, () => {
  console.log(`API Vakwetu Weya em http://127.0.0.1:${port}`);
});
