import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';
import { catalog } from '../src/data/catalog.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const dbName = process.env.DB_NAME || 'WEYA';
const adminUsername = process.env.ADMIN_USERNAME || 'dchivela';
const adminPassword = process.env.ADMIN_PASSWORD || '#focus2024';
const sessions = new Map();
const demoReservations = [];
const demoContacts = [];
const demoCatalog = structuredClone(catalog);

let pool = null;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5173'
  })
);
app.use(express.json({ limit: '1mb' }));
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

async function connectDatabase() {
  try {
    const rootConnection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    await rootConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await rootConnection.end();

    pool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: true
    });

    await initializeSchema();
    await seedBaseContent();
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
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin','cliente') NOT NULL DEFAULT 'cliente',
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
      service_type ENUM('destino','hotel','restaurante','tour','roteiro') NOT NULL,
      service_id BIGINT UNSIGNED NULL,
      customer_name VARCHAR(180) NOT NULL,
      customer_email VARCHAR(180) NOT NULL,
      customer_phone VARCHAR(60) NOT NULL,
      travelers INT NOT NULL DEFAULT 1,
      start_date DATE NULL,
      end_date DATE NULL,
      budget DECIMAL(12,2) NULL,
      notes TEXT NULL,
      status ENUM('pendente','confirmada','cancelada','concluida') NOT NULL DEFAULT 'pendente',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY reservations_status_index (status),
      KEY reservations_email_index (customer_email)
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
    `INSERT INTO users (username, name, email, password_hash, role)
     VALUES (:username, 'Administrador Raiz', 'admin@vakwetuweya.ao', :passwordHash, 'admin')
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

async function readCatalogFromDb() {
  const [destinationRows] = await pool.query('SELECT * FROM destinations WHERE active = 1 ORDER BY featured DESC, id ASC');
  const [hotelRows] = await pool.query('SELECT * FROM hotels WHERE active = 1 ORDER BY rating DESC, id ASC');
  const [restaurantRows] = await pool.query('SELECT * FROM restaurants WHERE active = 1 ORDER BY rating DESC, id ASC');
  const [tourRows] = await pool.query('SELECT * FROM tours WHERE active = 1 ORDER BY rating DESC, id ASC');
  const [itineraryRows] = await pool.query('SELECT * FROM itineraries WHERE active = 1 ORDER BY days ASC, id ASC');
  const [testimonialRows] = await pool.query('SELECT * FROM testimonials WHERE active = 1 ORDER BY id ASC');

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
      amenities: parseJson(item.amenities_json)
    })),
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

  request.admin = session;
  return next();
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

app.post('/api/reservations', async (request, response) => {
  const payload = request.body;

  if (!payload.name || !payload.email || !payload.phone) {
    return response.status(422).json({ message: 'Nome, email e telefone são obrigatórios.' });
  }

  const reservation = {
    id: Date.now(),
    service_type: payload.serviceType,
    service_id: payload.serviceId || null,
    customer_name: payload.name,
    customer_email: payload.email,
    customer_phone: payload.phone,
    travelers: Number(payload.travelers || 1),
    start_date: payload.startDate || null,
    end_date: payload.endDate || null,
    budget: payload.budget || null,
    notes: payload.notes || null,
    status: 'pendente'
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
     (service_type, service_id, customer_name, customer_email, customer_phone, travelers, start_date, end_date, budget, notes)
     VALUES (:service_type, :service_id, :customer_name, :customer_email, :customer_phone, :travelers, :start_date, :end_date, :budget, :notes)`,
    reservation
  );

  return response.status(201).json({
    ok: true,
    message: 'Reserva enviada com sucesso. A equipa vai confirmar os detalhes contigo.'
  });
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
  let allowed = username === adminUsername && password === adminPassword;

  if (pool) {
    const [rows] = await pool.query(
      'SELECT username, password_hash, role FROM users WHERE username = :username LIMIT 1',
      { username }
    );
    const user = rows[0];
    allowed = Boolean(user && user.role === 'admin' && verifyPassword(password, user.password_hash));
  }

  if (!allowed) {
    return response.status(401).json({ message: 'Credenciais inválidas.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    username,
    expiresAt: Date.now() + 1000 * 60 * 60 * 8
  });

  return response.json({ token, username });
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

app.get('/api/admin/overview', requireAdmin, async (request, response) => {
  if (!pool) {
    return response.json({
      metrics: {
        reservations: demoReservations.length,
        contacts: demoContacts.length,
        pending: demoReservations.filter((item) => item.status === 'pendente').length,
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
  const [[pendingCount]] = await pool.query(
    "SELECT COUNT(*) AS total FROM reservations WHERE status = 'pendente'"
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
      contents: Object.values(contentCounts[0]).reduce((sum, total) => sum + Number(total), 0)
    },
    contentCounts: contentCounts[0],
    reservations,
    contacts,
    source: 'mysql'
  });
});

await connectDatabase();

app.listen(port, () => {
  console.log(`API Vakwetu Weya em http://127.0.0.1:${port}`);
});
