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
const dbName = process.env.DB_NAME || 'WEYA';
const adminUsername = process.env.ADMIN_USERNAME || 'dchivela';
const adminPassword = process.env.ADMIN_PASSWORD || '#focus2024';
const sessions = new Map();
const demoUsers = [];
const demoReservations = [];
const demoContacts = [];
const demoCatalog = structuredClone(catalog);
const serverDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(serverDir, '..');
const uploadRoot = path.resolve(process.env.UPLOAD_DIR || path.join(projectRoot, 'public', 'uploads'));

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

function toPublicReservation(row) {
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
    notes: row.notes || null,
    status: row.status || 'pendente',
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

async function deleteResource(resource, id) {
  const tables = {
    destinations: 'destinations',
    hotels: 'hotels',
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
      avatar VARCHAR(255) NULL,
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
      notes TEXT NULL,
      status ENUM('pendente','confirmada','cancelada','concluida') NOT NULL DEFAULT 'pendente',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY reservations_user_index (user_id),
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

  if (session.role !== 'admin') {
    return response.status(403).json({ message: 'Apenas administradores podem alterar conteúdos.' });
  }

  request.admin = session;
  return next();
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
    budget: payload.budget || null,
    notes: payload.notes || null,
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
     (user_id, service_type, service_id, customer_name, customer_email, customer_phone, travelers, start_date, end_date, budget, notes)
     VALUES (:user_id, :service_type, :service_id, :customer_name, :customer_email, :customer_phone, :travelers, :start_date, :end_date, :budget, :notes)`,
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
    `SELECT id, user_id, service_type, service_id, customer_name, customer_email, customer_phone,
            travelers, start_date, end_date, budget, notes, status, created_at, updated_at
     FROM reservations
     ${whereClause}
     ORDER BY created_at DESC
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
    const role = request.body.role === 'admin' ? 'admin' : 'cliente';
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
  const role = request.body.role === 'admin' ? 'admin' : 'cliente';

  if (!Number.isFinite(id)) {
    return response.status(422).json({ message: 'ID invÃ¡lido.' });
  }

  if (Number(request.user.id) === id && role !== 'admin') {
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

  await pool.query('DELETE FROM users WHERE id = :id', { id });
  return response.json({ ok: true, message: 'Utilizador eliminado.' });
});

app.get('/api/admin/reservations', requireAdmin, async (request, response) => {
  if (!pool) {
    return response.json({
      reservations: demoReservations.map(toPublicReservation),
      source: 'demo'
    });
  }

  const [rows] = await pool.query(
    `SELECT id, user_id, service_type, service_id, customer_name, customer_email, customer_phone,
            travelers, start_date, end_date, budget, notes, status, created_at, updated_at
     FROM reservations
     ORDER BY created_at DESC
     LIMIT 200`
  );

  return response.json({ reservations: rows.map(toPublicReservation), source: 'mysql' });
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
