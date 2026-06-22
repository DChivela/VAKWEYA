CREATE DATABASE IF NOT EXISTS weya
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE weya;

CREATE TABLE IF NOT EXISTS users (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS destinations (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hotels (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hotel_rooms (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  hotel_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(180) NOT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS driver_profiles (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vehicles (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS restaurants (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tours (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS itineraries (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reservations (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contacts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(180) NOT NULL,
  email VARCHAR(180) NOT NULL,
  subject VARCHAR(220) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('novo','lido','respondido') NOT NULL DEFAULT 'novo',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assistant_faqs (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assistant_logs (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS testimonials (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(140) NOT NULL,
  location VARCHAR(120) NULL,
  quote TEXT NOT NULL,
  score INT NOT NULL DEFAULT 5,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO users (username, name, email, password_hash, role)
VALUES (
  'dchivela',
  'Administrador Raiz',
  'admin@vakwetuweya.ao',
  'pbkdf2_sha256$210000$vakwetu-root-2026$4b2c98a84f66f93c0a30d821b641fc8ca481b323a1074c00132ea89c934df416',
  'admin'
)
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  role = 'admin';

INSERT INTO assistant_faqs (category, question, answer, keywords_json, active)
SELECT category, question, answer, keywords_json, 1
FROM (
  SELECT
    'Reservas' AS category,
    'Como faco uma reserva?' AS question,
    'Escolhe um hotel, restaurante, tour, destino ou roteiro e clica no botao de reserva. A pagina de reservas abre com a selecao preparada; depois so precisas confirmar os teus dados, datas, numero de pessoas e enviar o pedido.' AS answer,
    JSON_ARRAY('reserva', 'reservar', 'pedido', 'hotel', 'restaurante', 'tour', 'roteiro') AS keywords_json
  UNION ALL
  SELECT
    'Conta',
    'Preciso criar conta para reservar?',
    'Podes enviar uma reserva como visitante, mas criar conta deixa tudo mais pratico: os teus dados sao preenchidos automaticamente e consegues consultar o historico em Perfil.',
    JSON_ARRAY('conta', 'login', 'perfil', 'criar conta', 'visitante')
  UNION ALL
  SELECT
    'Historico',
    'Onde vejo as minhas reservas?',
    'Depois de iniciar sessao, entra em Perfil. A area Minhas reservas mostra os pedidos ligados a tua conta e tambem reservas antigas feitas com o mesmo email do perfil.',
    JSON_ARRAY('minhas reservas', 'historico', 'perfil', 'consultar reserva')
  UNION ALL
  SELECT
    'Orcamento',
    'O orcamento e calculado automaticamente?',
    'Sim. Quando escolhes um servico com preco definido, o sistema sugere um valor com base no tipo de reserva, datas e numero de pessoas. Ainda assim, podes alterar o orcamento antes de enviar.',
    JSON_ARRAY('orcamento', 'preco', 'valor', 'calcular')
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM assistant_faqs);
