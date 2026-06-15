-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: turismo_db
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `bonus`
--

DROP TABLE IF EXISTS `bonus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `bonus` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` bigint(20) unsigned NOT NULL,
  `tipo` varchar(255) DEFAULT NULL,
  `valor` decimal(10,2) NOT NULL,
  `descricao` varchar(255) DEFAULT NULL,
  `expira_em` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `bonus_usuario_id_index` (`usuario_id`),
  CONSTRAINT `bonus_usuario_id_foreign` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bonus`
--

LOCK TABLES `bonus` WRITE;
/*!40000 ALTER TABLE `bonus` DISABLE KEYS */;
/*!40000 ALTER TABLE `bonus` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache`
--

DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` int(11) NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache`
--

LOCK TABLES `cache` WRITE;
/*!40000 ALTER TABLE `cache` DISABLE KEYS */;
INSERT INTO `cache` VALUES ('vakwetu-weya-cache-domingos.chivela@dca.com|127.0.0.1','i:1;',1763054367),('vakwetu-weya-cache-domingos.chivela@dca.com|127.0.0.1:timer','i:1763054367;',1763054367),('vakwetu-weya-cache-domingos.chivela@wafcenter.com|127.0.0.1','i:1;',1763054624),('vakwetu-weya-cache-domingos.chivela@wafcenter.com|127.0.0.1:timer','i:1763054624;',1763054624);
/*!40000 ALTER TABLE `cache` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache_locks`
--

DROP TABLE IF EXISTS `cache_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` int(11) NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache_locks`
--

LOCK TABLES `cache_locks` WRITE;
/*!40000 ALTER TABLE `cache_locks` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache_locks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `corridas`
--

DROP TABLE IF EXISTS `corridas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `corridas` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `motorista_id` bigint(20) unsigned DEFAULT NULL,
  `tipo` varchar(30) NOT NULL DEFAULT 'regular',
  `origem_lat` decimal(10,7) NOT NULL,
  `origem_lng` decimal(10,7) NOT NULL,
  `origem_endereco` varchar(255) DEFAULT NULL,
  `destino_lat` decimal(10,7) NOT NULL,
  `destino_lng` decimal(10,7) NOT NULL,
  `destino_endereco` varchar(255) DEFAULT NULL,
  `distancia_km` decimal(8,2) DEFAULT NULL,
  `duracao_segundos` int(11) DEFAULT NULL,
  `preco` decimal(10,2) DEFAULT NULL,
  `tarifa_base` decimal(10,2) NOT NULL DEFAULT 0.00,
  `tarifa_km` decimal(10,2) NOT NULL DEFAULT 0.00,
  `tarifa_minuto` decimal(10,2) NOT NULL DEFAULT 0.00,
  `estado` enum('pendente','aceite','em_andamento','concluida','cancelada') NOT NULL DEFAULT 'pendente',
  `observacoes` text DEFAULT NULL,
  `agendado_para` timestamp NULL DEFAULT NULL,
  `iniciada_em` timestamp NULL DEFAULT NULL,
  `finalizada_em` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `usuario_id` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `corridas_usuario_id_foreign` (`usuario_id`),
  KEY `corridas_motorista_id_index` (`motorista_id`),
  CONSTRAINT `corridas_motorista_id_foreign` FOREIGN KEY (`motorista_id`) REFERENCES `motoristas` (`id`) ON DELETE SET NULL,
  CONSTRAINT `corridas_usuario_id_foreign` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `corridas`
--

LOCK TABLES `corridas` WRITE;
/*!40000 ALTER TABLE `corridas` DISABLE KEYS */;
/*!40000 ALTER TABLE `corridas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `embeddings_documents`
--

DROP TABLE IF EXISTS `embeddings_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `embeddings_documents` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `doc_id` varchar(255) NOT NULL,
  `title` text NOT NULL,
  `content` text NOT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `embedding` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `embeddings_documents`
--

LOCK TABLES `embeddings_documents` WRITE;
/*!40000 ALTER TABLE `embeddings_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `embeddings_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `failed_jobs`
--

DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `failed_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `failed_jobs`
--

LOCK TABLES `failed_jobs` WRITE;
/*!40000 ALTER TABLE `failed_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `failed_jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hoteis`
--

DROP TABLE IF EXISTS `hoteis`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `hoteis` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hoteis`
--

LOCK TABLES `hoteis` WRITE;
/*!40000 ALTER TABLE `hoteis` DISABLE KEYS */;
/*!40000 ALTER TABLE `hoteis` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_batches`
--

DROP TABLE IF EXISTS `job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `job_batches` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `total_jobs` int(11) NOT NULL,
  `pending_jobs` int(11) NOT NULL,
  `failed_jobs` int(11) NOT NULL,
  `failed_job_ids` longtext NOT NULL,
  `options` mediumtext DEFAULT NULL,
  `cancelled_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `finished_at` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_batches`
--

LOCK TABLES `job_batches` WRITE;
/*!40000 ALTER TABLE `job_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` tinyint(3) unsigned NOT NULL,
  `reserved_at` int(10) unsigned DEFAULT NULL,
  `available_at` int(10) unsigned NOT NULL,
  `created_at` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobs`
--

LOCK TABLES `jobs` WRITE;
/*!40000 ALTER TABLE `jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'0001_01_01_000000_create_users_table',1),(2,'0001_01_01_000001_create_cache_table',1),(3,'0001_01_01_000002_create_jobs_table',1),(4,'2025_09_08_170940_create_motoristas_table',1),(5,'2025_09_08_173852_create_corridas_table',1),(6,'2025_09_08_173859_create_pacote_turisticos_table',1),(7,'2025_09_08_173908_create_promocaos_table',1),(8,'2025_09_08_173914_create_bonuses_table',1),(9,'2025_09_08_174346_create_personal_access_tokens_table',1),(10,'2025_09_21_012251_add_campos_motoristas_table',1),(11,'2025_09_21_120321_add_fotos_pacotes_turisticos_table',1),(12,'2025_11_06_201710_create_embeddings_documents',1),(13,'2025_11_13_182432_create_hoteis_table',2),(14,'2025_11_13_182441_create_restaurantes_table',2),(16,'2025_11_23_115228_add_column_pacotes_turisticos',3),(19,'2025_11_23_165606_add_destaque_pacotes_turisticos',4),(20,'2025_11_23_191512_create_passeios_table',5);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `motoristas`
--

DROP TABLE IF EXISTS `motoristas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `motoristas` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` bigint(20) unsigned DEFAULT NULL,
  `nome` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `telefone` varchar(255) DEFAULT NULL,
  `foto` varchar(255) DEFAULT NULL,
  `data_nascimento` date DEFAULT NULL,
  `numero_cnh` varchar(255) DEFAULT NULL,
  `validade_cnh` date DEFAULT NULL,
  `veiculo_marca` varchar(255) DEFAULT NULL,
  `veiculo_modelo` varchar(255) DEFAULT NULL,
  `veiculo_placa` varchar(255) DEFAULT NULL,
  `status` enum('disponivel','indisponivel','em_viagem') NOT NULL DEFAULT 'disponivel',
  `avaliacao_media` decimal(3,2) NOT NULL DEFAULT 0.00,
  `local_atual` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`local_atual`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `motoristas_usuario_id_index` (`usuario_id`),
  KEY `motoristas_email_index` (`email`),
  KEY `motoristas_numero_cnh_index` (`numero_cnh`),
  KEY `motoristas_veiculo_placa_index` (`veiculo_placa`),
  CONSTRAINT `motoristas_usuario_id_foreign` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `motoristas`
--

LOCK TABLES `motoristas` WRITE;
/*!40000 ALTER TABLE `motoristas` DISABLE KEYS */;
INSERT INTO `motoristas` VALUES (1,NULL,'António Mangueira','antonio.mangueira@gmail.com','930333207','motoristas/ytZgB8MZH7K2zuNa4kBiauV3WpqsSq48X6HoL1RA.jpg','1989-11-13','0135HA07',NULL,'HYUNDAI 1012','ELANTRA','19-HA93','disponivel',1.00,NULL,'2025-11-13 19:49:11','2025-12-09 17:00:32',NULL);
/*!40000 ALTER TABLE `motoristas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pacotes_turisticos`
--

DROP TABLE IF EXISTS `pacotes_turisticos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pacotes_turisticos` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `descricao` text DEFAULT NULL,
  `preco` decimal(10,2) NOT NULL DEFAULT 0.00,
  `destaque` tinyint(1) NOT NULL DEFAULT 0,
  `duracao_dias` int(11) NOT NULL DEFAULT 1,
  `local_partida` varchar(255) DEFAULT NULL,
  `destino` varchar(255) NOT NULL DEFAULT 'Indefinido',
  `itinerario` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`itinerario`)),
  `incluido` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`incluido`)),
  `vagas` int(11) DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  `foto` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pacotes_turisticos`
--

LOCK TABLES `pacotes_turisticos` WRITE;
/*!40000 ALTER TABLE `pacotes_turisticos` DISABLE KEYS */;
INSERT INTO `pacotes_turisticos` VALUES (1,'Pacote “Maravilhas da Huíla”','Desfrute de um passeio pela fazenda, jantar ao pôr do sol e atividades culturais.',150000.00,0,3,'Lubango - Praça da Independência','Huíla','[\"Dia 1: Chegada e city tour no Lubango\",\"Dia 2: Chegada e city tour no Lubango\",\"Dia 3: Chegada e city tour no Lubango\"]','[null]',8,1,'pacotes/yODLePkgf4ITeeAI3tSwXxFXQuED0QSfKdCoAgkn.jpg','2025-11-06 22:54:02','2025-11-23 17:34:19',NULL),(2,'Aventura nas Quedas da Tundavala e Serra da Leba','Atividades: Caminhadas guiadas, fotografia panorâmica, visita ao miradouro da Tundavala\r\n\r\nPúblico-alvo: Jovens aventureiros e amantes da natureza',160000.00,1,3,'Lubango - Estátua da Liberdade','Lubango','[\"Trilha ao nascer do sol na Tundavala\"]','[null]',8,1,'pacotes/uRuoGejsZimBuLnOWzhHGhUvXpsVHG4MbBTiyzrf.jpg','2025-11-07 01:28:01','2025-11-23 18:30:17',NULL),(3,'Rota Histórica de Luanda','Atividades: Museu da Escravatura, Fortaleza de São Miguel, passeio pela Ilha de Luanda\r\n\r\nPúblico-alvo: Turistas culturais e estudantes',200000.00,1,2,'Por se definir','Luanda','[\"Passeio guiado pela Marginal com hist\\u00f3ria colonial\"]','[null]',5,1,'pacotes/sRWmxpenT7nQPZHVG0zpLd9eV1E4Cgwy7VlYx07P.jpg','2025-11-07 01:29:09','2025-11-23 18:30:38',NULL),(4,'Expedição ao Deserto do Namibe','Atividades: Visita às dunas, pinturas rupestres, aldeias tradicionais\r\n\r\nPúblico-alvo: Viajantes curiosos e fotógrafos',160000.00,1,3,'Hotel Serra da Chela','Namibe','[\"Explora\\u00e7\\u00e3o das forma\\u00e7\\u00f5es rochosas do Parque do Iona\"]','[null]',8,1,'pacotes/to1HkyQsjlQjf9y6xKNwtFcVP62nPfLDd5qKF37K.jpg','2025-11-07 01:31:44','2025-11-23 18:30:28',NULL),(5,'Pacote “Maravilhas do Namibe”','etdfgfhgjhkjn',18000.00,0,5,'Por se definir','Namibe','[\"Surpresa\"]','[null]',8,1,'pacotes/UPMw2erw56wfdRqkpmxMzFMuvTmtiO4bUnXon6xA.webp','2025-11-13 19:42:59','2025-11-23 17:33:21',NULL),(6,'Pacote “Maravilhas de Benguela”','Aproveitar melhorar a viagem e curtir ao máximo a chegada ao destino.',150000.00,1,3,'Lubango - Praça da Independência','Benguela','[\"Dia 1: Chegada e city tour no Lubango\"]','[\"Transporte Ida e Volta\",\"Refei\\u00e7\\u00f5es Inclu\\u00eddas\"]',5,1,'pacotes/vBlyKyHBg7OAtHyMOcJkOOvmxLAFibVOMSHRWvKC.jpg','2025-11-22 11:16:29','2025-11-23 18:29:59',NULL);
/*!40000 ALTER TABLE `pacotes_turisticos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `passeios`
--

DROP TABLE IF EXISTS `passeios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `passeios` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `descricao` text DEFAULT NULL,
  `historia` longtext DEFAULT NULL,
  `preco` decimal(10,2) DEFAULT 0.00,
  `duracao_horas` double DEFAULT NULL,
  `local_partida` varchar(255) DEFAULT NULL,
  `destino` varchar(255) DEFAULT NULL,
  `itinerario` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`itinerario`)),
  `atividades` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`atividades`)),
  `dicas_user` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`dicas_user`)),
  `destaque` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`destaque`)),
  `vagas` int(11) DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  `foto` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `passeios`
--

LOCK TABLES `passeios` WRITE;
/*!40000 ALTER TABLE `passeios` DISABLE KEYS */;
INSERT INTO `passeios` VALUES (1,'Fenda da Tundavala','Vista panorâmica espetacular de 2.600m de altitude','A Fenda da Tundavala é um dos pontos turísticos mais emblemáticos de Angola. Situada a cerca de 18 km de Lubango, esta formação geológica natural oferece uma vista panorâmica de tirar o fôlego sobre o planalto da Huíla. A fenda foi formada por processos erosivos ao longo de milhões de anos, criando um precipício vertical de mais de 1.000 metros. O local é especialmente popular ao nascer e pôr do sol, quando as cores do céu se misturam com as montanhas criando um espetáculo natural único.',0.00,2,'Lubango','Fenda da Tundavala',NULL,'[\"Fotografia\"]','[\"Levar roupa quente, pois a temperatura pode ser baixa no topo\"]',NULL,2,1,'passeios/jhQKM1MN5XZoKQcOgvNkfqr7jZ5ipfyijAAlYn0m.jpg','2025-11-23 19:44:03','2025-11-23 20:01:11',NULL),(2,'Serra da Leba','Obra-prima da engenharia portuguesa construída nos anos 70, tornou-se símbolo nacional de Angola.','Obra-prima da engenharia portuguesa construída nos anos 70, tornou-se símbolo nacional de Angola.',0.00,1,'Por se definir','Serra da Leba',NULL,'[\"Fotografia\"]','[\"Levar roupa quente, pois a temperatura pode ser baixa no topo\"]',NULL,5,1,'passeios/njtKJpF5MoZ8oUqIru8r0IChqeOnLujbAZQP0XXJ.jpg','2025-11-24 15:57:29','2025-11-24 15:57:29',NULL),(3,'Cristo Rei','Erguido em 1950, o Cristo Rei de Lubango foi inspirado no Cristo Redentor do Rio de Janeiro.','Erguido em 1950, o Cristo Rei de Lubango foi inspirado no Cristo Redentor do Rio de Janeiro.',0.00,1,'Por se definir','Cristo Rei',NULL,'[\"Fotografia\"]','[\"Levar roupa quente, pois a temperatura pode ser baixa no topo\"]',NULL,5,1,'passeios/BabUlPkgPr8BDFWHsYeCLlMZ1IKExuohtnfVGyVt.jpg','2025-11-24 15:58:39','2025-11-24 15:58:39',NULL),(4,'Cascata da Huíla','Quedas de água alimentadas pelos rios da região, criam um oásis natural no planalto.','Quedas de água alimentadas pelos rios da região, criam um oásis natural no planalto.',0.00,2,'Por se definir','Cascata da Huíla',NULL,'[\"Fotografia\"]','[\"Levar roupa quente, pois a temperatura pode ser baixa no topo\"]',NULL,5,1,'passeios/JRe7aSBVILiOp9fSidND88AABQ8pU1qbprDI7Kc0.jpg','2025-11-24 15:59:28','2025-11-24 15:59:28',NULL);
/*!40000 ALTER TABLE `passeios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `personal_access_tokens`
--

DROP TABLE IF EXISTS `personal_access_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint(20) unsigned NOT NULL,
  `name` text NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal_access_tokens`
--

LOCK TABLES `personal_access_tokens` WRITE;
/*!40000 ALTER TABLE `personal_access_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `personal_access_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `promocaos`
--

DROP TABLE IF EXISTS `promocaos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `promocaos` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(255) NOT NULL,
  `descricao` varchar(255) DEFAULT NULL,
  `desconto_percent` decimal(5,2) DEFAULT NULL,
  `desconto_valor` decimal(10,2) DEFAULT NULL,
  `validade_de` date DEFAULT NULL,
  `validade_ate` date DEFAULT NULL,
  `uso_maximo` int(11) DEFAULT NULL,
  `uso_por_usuario` int(11) DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `promocaos_codigo_unique` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `promocaos`
--

LOCK TABLES `promocaos` WRITE;
/*!40000 ALTER TABLE `promocaos` DISABLE KEYS */;
/*!40000 ALTER TABLE `promocaos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `restaurantes`
--

DROP TABLE IF EXISTS `restaurantes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `restaurantes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `restaurantes`
--

LOCK TABLES `restaurantes` WRITE;
/*!40000 ALTER TABLE `restaurantes` DISABLE KEYS */;
/*!40000 ALTER TABLE `restaurantes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
INSERT INTO `sessions` VALUES ('52806EVc83ZfSjrkQueFvLa8cznx0sMGU9WoFGKJ',1,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36','YTo1OntzOjY6Il90b2tlbiI7czo0MDoiSld3VFcwbVpzMTV0dURkQ2FWTmhsWXpaenZXNFJZb1ltUnpFbThqaiI7czozOiJ1cmwiO2E6MDp7fXM6OToiX3ByZXZpb3VzIjthOjE6e3M6MzoidXJsIjtzOjMxOiJodHRwOi8vbG9jYWxob3N0OjgwMDAvZGFzaGJvYXJkIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319czo1MDoibG9naW5fd2ViXzU5YmEzNmFkZGMyYjJmOTQwMTU4MGYwMTRjN2Y1OGVhNGUzMDk4OWQiO2k6MTt9',1764252155),('gR0U4YoL8bUXEdxILQdLxlhwuOIzgQVywyLeyeLo',1,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36','YTo1OntzOjY6Il90b2tlbiI7czo0MDoiaVJmb1ZEYmVka0xNSWRSc1lKUlNHQ2tEOGVkOEFpQXhzMFg5VW9sSCI7czozOiJ1cmwiO2E6MDp7fXM6OToiX3ByZXZpb3VzIjthOjE6e3M6MzoidXJsIjtzOjMyOiJodHRwOi8vbG9jYWxob3N0OjgwMDAvcGFzc2Vpb3MvNCI7fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fXM6NTA6ImxvZ2luX3dlYl81OWJhMzZhZGRjMmIyZjk0MDE1ODBmMDE0YzdmNThlYTRlMzA5ODlkIjtpOjE7fQ==',1764015058),('m3T8PYdtZz9mLigsDVRpi8bDClxXxWbXjKIb2Boy',1,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','YTo0OntzOjY6Il90b2tlbiI7czo0MDoiUHJSN1ZFNE52aVFPV2FWNEZucVdiYnltYnh0YmRSSUxOSW5PRDdqaCI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6MzI6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9tb3RvcmlzdGFzIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319czo1MDoibG9naW5fd2ViXzU5YmEzNmFkZGMyYjJmOTQwMTU4MGYwMTRjN2Y1OGVhNGUzMDk4OWQiO2k6MTt9',1765303233),('PgIO2poS02hAjFsFurEhJTYEz76rU8ffmmnD5Zv0',2,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36','YTo0OntzOjY6Il90b2tlbiI7czo0MDoieXVTUUZHSFZRVjlFNmV5cnkwQ2RpZnRwcEF6TktudmpGRnFvTFI5USI7czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Mjc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC90b3VycyI7fXM6NTA6ImxvZ2luX3dlYl81OWJhMzZhZGRjMmIyZjk0MDE1ODBmMDE0YzdmNThlYTRlMzA5ODlkIjtpOjI7fQ==',1764004942),('xy8U8rChbZrZriCAcHHT2KAyoQ6WjxSScmzZG94G',1,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0','YTo0OntzOjY6Il90b2tlbiI7czo0MDoiUWVzaWJqcXR3VGlNa3dPVmlRT1BFa3R6T1FxN0pWYzJsMUZRb0xkZCI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6MzA6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9wYXNzZWlvcyI7fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fXM6NTA6ImxvZ2luX3dlYl81OWJhMzZhZGRjMmIyZjk0MDE1ODBmMDE0YzdmNThlYTRlMzA5ODlkIjtpOjE7fQ==',1764003990),('ye5Ulr1hclLteN3j8WDunutxvApFPf6XzJ0P7vxS',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36','YTo0OntzOjY6Il90b2tlbiI7czo0MDoiZ0RrM1daRTRCRzg4SUcweHR6cUkyQ3g5M25aOTdDT2h6V3RCUEl5VCI7czozOiJ1cmwiO2E6MTp7czo4OiJpbnRlbmRlZCI7czozMToiaHR0cDovL2xvY2FsaG9zdDo4MDAwL2Rhc2hib2FyZCI7fXM6OToiX3ByZXZpb3VzIjthOjE6e3M6MzoidXJsIjtzOjI3OiJodHRwOi8vbG9jYWxob3N0OjgwMDAvbG9naW4iO31zOjY6Il9mbGFzaCI7YToyOntzOjM6Im9sZCI7YTowOnt9czozOiJuZXciO2E6MDp7fX19',1764328352);
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `cell` varchar(255) DEFAULT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `perfil` enum('turista','motorista','admin') NOT NULL DEFAULT 'turista',
  `credito` decimal(10,2) NOT NULL DEFAULT 0.00,
  `meta` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`meta`)),
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `users_cell_index` (`cell`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Domingos H. Chivela','dca@gmail.com','947449847',NULL,'$2y$12$U9srA74NDynm2HkpqiVSAOGKga1UD5gBfv9/mBA.1AJhvSIsAKhN.','admin',0.00,NULL,'aM7br68lXbRFNGhwhPHFVFHuIZ5bcx8WejkdmnBBjm6D9QNG5PRPr3h1Y0kV','2025-11-06 20:02:09','2025-11-06 20:02:09',NULL),(2,'Armando António','armando.antonio@gmail.com','947449847',NULL,'$2y$12$b5onq//LMq1tukMX7EnN1Om0K540H.2/xKik13bo2XTEzbKFLRuUa','turista',0.00,NULL,NULL,'2025-11-24 16:14:02','2025-11-24 16:14:02',NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-18  2:34:41
