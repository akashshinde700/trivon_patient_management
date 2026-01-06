-- =====================================================
-- Full Patient Management DB Schema (Updated)
-- Fully compatible with MariaDB 10.4.32
-- Charset: utf8mb4 / Collation: utf8mb4_unicode_ci
-- =====================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET FOREIGN_KEY_CHECKS = 0;
START TRANSACTION;

-- Use database
USE `patient_management`;

-- =====================================================
-- TABLE: users
-- =====================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin','doctor','staff','sub_admin') NOT NULL DEFAULT 'staff',
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `clinic_id` INT(11) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`),
  KEY `idx_users_phone` (`phone`),
  KEY `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: clinics
-- =====================================================
CREATE TABLE IF NOT EXISTS `clinics` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `address` TEXT DEFAULT NULL,
  `city` VARCHAR(100) DEFAULT NULL,
  `state` VARCHAR(100) DEFAULT NULL,
  `pincode` VARCHAR(20) DEFAULT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `logo_url` VARCHAR(500) DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_clinics_email` (`email`),
  KEY `idx_clinics_city` (`city`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: doctors
-- =====================================================
CREATE TABLE IF NOT EXISTS `doctors` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `clinic_id` INT(11) DEFAULT NULL,
  `specialization` VARCHAR(100) DEFAULT NULL,
  `license_number` VARCHAR(100) DEFAULT NULL,
  `consultation_fee` DECIMAL(10,2) DEFAULT NULL,
  `available_from` TIME DEFAULT NULL,
  `available_to` TIME DEFAULT NULL,
  `qualification` VARCHAR(255) DEFAULT NULL,
  `experience_years` INT DEFAULT 0,
  `available_days` JSON DEFAULT NULL,
  `available_time_slots` JSON DEFAULT NULL,
  `eka_credits` DECIMAL(10,2) DEFAULT 0.00,
  `status` ENUM('active','inactive','on_leave') DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_doctors_user_id` (`user_id`),
  KEY `idx_doctors_specialization` (`specialization`),
  KEY `idx_doctors_clinic` (`clinic_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: clinic_staff
-- =====================================================
CREATE TABLE IF NOT EXISTS `clinic_staff` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `clinic_id` INT(11) NOT NULL,
  `user_id` INT(11) NOT NULL,
  `role` ENUM('receptionist','nurse','admin','doctor') DEFAULT 'receptionist',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_clinic_staff_clinic` (`clinic_id`),
  KEY `idx_clinic_staff_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: doctor_staff
-- Links staff members to specific doctors
-- Each doctor can have up to 5 staff members
-- =====================================================
CREATE TABLE IF NOT EXISTS `doctor_staff` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `doctor_id` INT(11) NOT NULL,
  `staff_user_id` INT(11) NOT NULL,
  `role` ENUM('nurse','assistant','technician','receptionist','other') DEFAULT 'assistant',
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_doctor_staff` (`doctor_id`, `staff_user_id`),
  KEY `idx_doctor_staff_doctor` (`doctor_id`),
  KEY `idx_doctor_staff_user` (`staff_user_id`),
  KEY `idx_doctor_staff_active` (`is_active`),
  FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`staff_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: patients
-- =====================================================
CREATE TABLE IF NOT EXISTS `patients` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `patient_id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `abha_number` VARCHAR(17) DEFAULT NULL COMMENT 'ABHA Number (14 digits formatted as XX-XXXX-XXXX-XXXX)',
  `abha_address` VARCHAR(255) DEFAULT NULL COMMENT 'ABHA Address (e.g., username@abdm)',
  `health_id` VARCHAR(255) DEFAULT NULL COMMENT 'Legacy Health ID field',
  `phone` VARCHAR(20) DEFAULT NULL,
  `dob` DATE DEFAULT NULL,
  `gender` ENUM('M','F','Other') DEFAULT NULL,
  `blood_group` VARCHAR(5) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `city` VARCHAR(100) DEFAULT NULL,
  `state` VARCHAR(100) DEFAULT NULL,
  `pincode` VARCHAR(20) DEFAULT NULL,
  `emergency_contact` VARCHAR(255) DEFAULT NULL,
  `emergency_phone` VARCHAR(20) DEFAULT NULL,
  `medical_conditions` TEXT DEFAULT NULL,
  `allergies` TEXT DEFAULT NULL,
  `current_medications` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_patients_patient_id` (`patient_id`),
  UNIQUE KEY `idx_patients_abha_number` (`abha_number`),
  UNIQUE KEY `idx_patients_abha_address` (`abha_address`),
  KEY `idx_patients_phone` (`phone`),
  KEY `idx_patients_city` (`city`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: abha_records
-- =====================================================
CREATE TABLE IF NOT EXISTS `abha_records` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `patient_id` INT(11) NOT NULL,
  `abha_number` VARCHAR(100) DEFAULT NULL,
  `enrollment_status` ENUM('pending','enrolled','rejected') DEFAULT 'pending',
  `blood_group` VARCHAR(5) DEFAULT NULL,
  `disability_status` VARCHAR(100) DEFAULT NULL,
  `enrolled_date` DATE DEFAULT NULL,
  `last_accessed` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `qr_code_url` VARCHAR(500) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_abha_abha_number` (`abha_number`),
  KEY `idx_abha_patient` (`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: appointments
-- =====================================================
CREATE TABLE IF NOT EXISTS `appointments` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `patient_id` INT(11) NOT NULL,
  `doctor_id` INT(11) NOT NULL,
  `clinic_id` INT(11) DEFAULT NULL,
  `appointment_date` DATE NOT NULL,
  `appointment_slot_id` INT(11) DEFAULT NULL COMMENT 'Reference to appointment_slots table',
  `slot_time` TIME DEFAULT NULL COMMENT 'Booked time slot',
  `arrival_type` ENUM('online', 'walk-in', 'referral', 'emergency') DEFAULT 'online' COMMENT 'How patient arrived',
  `checked_in_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'When patient checked in',
  `visit_started_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'When doctor started consultation',
  `visit_ended_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'When consultation ended',
  `actual_duration_minutes` INT(11) DEFAULT NULL COMMENT 'Actual visit duration',
  `waiting_time_minutes` INT(11) DEFAULT NULL COMMENT 'Patient waiting time',
  `appointment_time` TIME NOT NULL,
  `status` ENUM('scheduled','completed','cancelled','no-show') DEFAULT 'scheduled',
  `reason_for_visit` TEXT DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_appointments_patient` (`patient_id`),
  KEY `idx_appointments_doctor` (`doctor_id`),
  KEY `idx_appointments_clinic` (`clinic_id`),
  KEY `idx_appointments_date` (`appointment_date`),
  KEY `idx_appointments_slot` (`appointment_slot_id`),
  KEY `idx_appointments_slot_time` (`slot_time`),
  KEY `idx_appointments_arrival_type` (`arrival_type`),
  KEY `idx_appointments_visit_started` (`visit_started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: appointment_intents
-- =====================================================
CREATE TABLE IF NOT EXISTS `appointment_intents` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `full_name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `speciality` VARCHAR(100) DEFAULT NULL,
  `preferred_date` DATE DEFAULT NULL,
  `message` TEXT DEFAULT NULL,
  `status` ENUM('new','contacted','scheduled','cancelled') DEFAULT 'new',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: appointment_followups
-- =====================================================
CREATE TABLE IF NOT EXISTS `appointment_followups` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `appointment_id` INT(11) NOT NULL,
  `followup_date` DATE NOT NULL,
  `reason` TEXT DEFAULT NULL,
  `status` ENUM('pending','completed','cancelled') DEFAULT 'pending',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_af_appointment` (`appointment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: medical_records
-- =====================================================
CREATE TABLE IF NOT EXISTS `medical_records` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `patient_id` INT(11) NOT NULL,
  `doctor_id` INT(11) DEFAULT NULL,
  `appointment_id` INT(11) DEFAULT NULL,
  `record_type` VARCHAR(100) DEFAULT NULL,
  `record_title` VARCHAR(255) DEFAULT NULL,
  `file_path` VARCHAR(500) DEFAULT NULL,
  `file_type` VARCHAR(50) DEFAULT NULL,
  `file_size` INT(11) DEFAULT NULL,
  `uploaded_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `description` TEXT DEFAULT NULL,
  `is_public` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_medical_patient` (`patient_id`),
  KEY `idx_medical_appointment` (`appointment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: lab_templates
-- =====================================================
CREATE TABLE IF NOT EXISTS `lab_templates` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `test_name` VARCHAR(255) NOT NULL,
  `test_code` VARCHAR(100) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `sample_type` VARCHAR(100) DEFAULT NULL,
  `category` VARCHAR(100) DEFAULT NULL,
  `unit` VARCHAR(50) DEFAULT NULL,
  `reference_range` VARCHAR(255) DEFAULT NULL,
  `special_instructions` TEXT DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_lab_test_name` (`test_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: lab_investigations
-- =====================================================
CREATE TABLE IF NOT EXISTS `lab_investigations` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `patient_id` INT(11) NOT NULL,
  `doctor_id` INT(11) DEFAULT NULL,
  `appointment_id` INT(11) DEFAULT NULL,
  `test_name` VARCHAR(255) DEFAULT NULL,
  `test_type` VARCHAR(100) DEFAULT NULL,
  `sample_type` VARCHAR(100) DEFAULT NULL,
  `ordered_date` DATE DEFAULT CURRENT_DATE,
  `sample_collection_date` DATE DEFAULT NULL,
  `result_date` DATE DEFAULT NULL,
  `status` ENUM('pending','in-progress','completed','cancelled') DEFAULT 'pending',
  `result_value` VARCHAR(255) DEFAULT NULL,
  `result_unit` VARCHAR(50) DEFAULT NULL,
  `reference_range` VARCHAR(255) DEFAULT NULL,
  `interpretation` TEXT DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_lab_patient` (`patient_id`),
  KEY `idx_lab_status` (`status`),
  KEY `idx_lab_appointment` (`appointment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: test_reports
-- =====================================================
CREATE TABLE IF NOT EXISTS `test_reports` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `emr_id` INT(11) NOT NULL,
  `patient_id` INT(11) NOT NULL,
  `doctor_id` INT(11) DEFAULT NULL,
  `test_name` VARCHAR(255) NOT NULL,
  `test_type` VARCHAR(100) DEFAULT NULL,
  `result` TEXT DEFAULT NULL,
  `file_path` VARCHAR(500) DEFAULT NULL,
  `test_date` DATE DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_testreport_emr` (`emr_id`),
  KEY `idx_testreport_patient` (`patient_id`),
  KEY `idx_testreport_doctor` (`doctor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: test_report_items
-- =====================================================
CREATE TABLE IF NOT EXISTS `test_report_items` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `report_id` INT(11) NOT NULL,
  `parameter_name` VARCHAR(255) DEFAULT NULL,
  `value` VARCHAR(100) DEFAULT NULL,
  `unit` VARCHAR(50) DEFAULT NULL,
  `normal_range` VARCHAR(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_tri_report` (`report_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: prescriptions
-- =====================================================
CREATE TABLE IF NOT EXISTS `prescriptions` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `patient_id` INT(11) NOT NULL,
  `doctor_id` INT(11) NOT NULL,
  `appointment_id` INT(11) DEFAULT NULL,
  `template_id` INT(11) DEFAULT NULL COMMENT 'Receipt template for prescription letterhead',
  `medication_name` VARCHAR(255) DEFAULT NULL,
  `dosage` VARCHAR(100) DEFAULT NULL,
  `frequency` VARCHAR(100) DEFAULT NULL,
  `duration` VARCHAR(100) DEFAULT NULL,
  `instructions` TEXT DEFAULT NULL,
  `prescribed_date` DATE DEFAULT CURRENT_DATE,
  `expiry_date` DATE DEFAULT NULL,
  `status` ENUM('active','completed','cancelled') DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_presc_patient` (`patient_id`),
  KEY `idx_presc_appointment` (`appointment_id`),
  KEY `fk_prescription_template` (`template_id`),
  CONSTRAINT `fk_prescription_template` FOREIGN KEY (`template_id`) REFERENCES `receipt_templates`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: prescription_items
-- =====================================================
CREATE TABLE IF NOT EXISTS `prescription_items` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `prescription_id` INT(11) NOT NULL,
  `medicine_id` INT(11) DEFAULT NULL,
  `dosage` VARCHAR(255) DEFAULT NULL,
  `frequency` VARCHAR(255) DEFAULT NULL,
  `duration` VARCHAR(255) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_pi_prescription` (`prescription_id`),
  KEY `idx_pi_medicine` (`medicine_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: medicines
-- =====================================================
CREATE TABLE IF NOT EXISTS `medicines` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `generic_name` VARCHAR(255) DEFAULT NULL,
  `brand` VARCHAR(255) DEFAULT NULL,
  `dosage_form` VARCHAR(100) DEFAULT NULL,
  `strength` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_medicines_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: procedures (CPT)
-- =====================================================
CREATE TABLE IF NOT EXISTS `procedures` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `cpt_code` VARCHAR(20) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `cost` DECIMAL(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_procedures_cpt` (`cpt_code`),
  KEY `idx_procedures_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: services
-- =====================================================
CREATE TABLE IF NOT EXISTS `services` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `category` VARCHAR(100) DEFAULT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `clinic_id` INT(11) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_services_category` (`category`),
  KEY `idx_services_clinic` (`clinic_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: bills
-- =====================================================
CREATE TABLE IF NOT EXISTS `bills` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `patient_id` INT(11) NOT NULL,
  `appointment_id` INT(11) DEFAULT NULL,
  `clinic_id` INT(11) DEFAULT NULL,
  `template_id` INT(11) DEFAULT NULL,
  `amount` DECIMAL(10,2) DEFAULT NULL,
  `tax` DECIMAL(10,2) DEFAULT 0.00,
  `discount` DECIMAL(10,2) DEFAULT 0.00,
  `total_amount` DECIMAL(10,2) DEFAULT NULL,
  `payment_method` VARCHAR(50) DEFAULT NULL,
  `payment_id` VARCHAR(100) DEFAULT NULL,
  `payment_status` ENUM('pending','completed','failed') DEFAULT 'pending',
  `bill_date` DATE DEFAULT CURRENT_DATE,
  `due_date` DATE DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `remarks` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bills_patient` (`patient_id`),
  KEY `idx_bills_appointment` (`appointment_id`),
  KEY `idx_bills_template` (`template_id`),
  KEY `idx_bills_payment_id` (`payment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: bill_items
-- =====================================================
CREATE TABLE IF NOT EXISTS `bill_items` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `bill_id` INT(11) NOT NULL,
  `service_name` VARCHAR(255) NOT NULL,
  `quantity` INT(11) DEFAULT 1,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `discount` DECIMAL(10,2) DEFAULT 0.00,
  `total_price` DECIMAL(10,2) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bill_items_bill` (`bill_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: queue
-- =====================================================
CREATE TABLE IF NOT EXISTS `queue` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `patient_id` INT(11) NOT NULL,
  `doctor_id` INT(11) NOT NULL,
  `queue_number` INT(11) DEFAULT NULL,
  `status` ENUM('waiting','in-progress','completed','cancelled') DEFAULT 'waiting',
  `check_in_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `start_time` TIMESTAMP NULL DEFAULT NULL,
  `end_time` TIMESTAMP NULL DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_queue_patient` (`patient_id`),
  KEY `idx_queue_doctor` (`doctor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: patient_tags
-- =====================================================
CREATE TABLE IF NOT EXISTS `patient_tags` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `patient_id` INT(11) NOT NULL,
  `tag_name` VARCHAR(100) DEFAULT NULL,
  `tag_category` VARCHAR(100) DEFAULT NULL,
  `color_code` VARCHAR(10) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_patient_tag` (`patient_id`,`tag_name`),
  KEY `idx_patient_tags_patient` (`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: frequently_used
-- =====================================================
CREATE TABLE IF NOT EXISTS `frequently_used` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `item_type` VARCHAR(100) DEFAULT NULL,
  `item_id` INT(11) DEFAULT NULL,
  `item_name` VARCHAR(255) DEFAULT NULL,
  `item_data` LONGTEXT DEFAULT NULL,
  `usage_count` INT(11) DEFAULT 1,
  `last_used` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_frequently_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: notifications
-- =====================================================
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `title` VARCHAR(255) DEFAULT NULL,
  `message` TEXT DEFAULT NULL,
  `type` ENUM('info','success','warning','error') DEFAULT 'info',
  `is_read` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: pad_configurations
-- =====================================================
CREATE TABLE IF NOT EXISTS `pad_configurations` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `doctor_id` INT(11) NOT NULL,
  `pad_template_id` INT(11) DEFAULT NULL,
  `default_font_size` INT(11) DEFAULT 12,
  `default_font_family` VARCHAR(50) DEFAULT 'Arial',
  `signature_image_url` VARCHAR(500) DEFAULT NULL,
  `clinic_name` VARCHAR(255) DEFAULT NULL,
  `clinic_details` TEXT DEFAULT NULL,
  `header_content` TEXT DEFAULT NULL,
  `footer_content` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pad_doctor` (`doctor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: reports
-- =====================================================
CREATE TABLE IF NOT EXISTS `reports` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `patient_id` INT(11) NOT NULL,
  `doctor_id` INT(11) DEFAULT NULL,
  `report_type` VARCHAR(100) DEFAULT NULL,
  `report_title` VARCHAR(255) DEFAULT NULL,
  `report_content` LONGTEXT DEFAULT NULL,
  `generated_date` DATE DEFAULT CURRENT_DATE,
  `status` ENUM('draft','finalized','archived') DEFAULT 'draft',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reports_patient` (`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: rx_template_config
-- =====================================================
CREATE TABLE IF NOT EXISTS `rx_template_config` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `doctor_id` INT(11) NOT NULL,
  `template_name` VARCHAR(255) DEFAULT NULL,
  `template_type` VARCHAR(100) DEFAULT NULL,
  `content` LONGTEXT DEFAULT NULL,
  `is_default` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rx_doctor` (`doctor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: sub_admin_permissions
-- =====================================================
CREATE TABLE IF NOT EXISTS `sub_admin_permissions` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `can_manage_patients` TINYINT(1) DEFAULT 0,
  `can_manage_appointments` TINYINT(1) DEFAULT 0,
  `can_manage_billing` TINYINT(1) DEFAULT 0,
  `can_view_reports` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_subadmin_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: import_history
-- =====================================================
CREATE TABLE IF NOT EXISTS `import_history` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `file_name` VARCHAR(255) NOT NULL,
  `file_type` VARCHAR(50) DEFAULT NULL,
  `total_records` INT(11) DEFAULT 0,
  `imported_count` INT(11) DEFAULT 0,
  `failed_count` INT(11) DEFAULT 0,
  `status` ENUM('pending','processing','completed','failed') DEFAULT 'pending',
  `error_details` TEXT DEFAULT NULL,
  `imported_by` INT(11) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_import_history_by` (`imported_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: backup_logs
-- =====================================================
CREATE TABLE IF NOT EXISTS `backup_logs` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `backup_type` VARCHAR(50) DEFAULT NULL,
  `backup_date` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `file_path` VARCHAR(500) DEFAULT NULL,
  `status` ENUM('success','failed','in_progress') DEFAULT 'in_progress',
  `notes` TEXT DEFAULT NULL,
  `created_by` INT(11) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_backup_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: patient_vitals
-- =====================================================
CREATE TABLE IF NOT EXISTS `patient_vitals` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `patient_id` INT(11) NOT NULL,
  `appointment_id` INT(11) DEFAULT NULL,
  `height_cm` FLOAT DEFAULT NULL,
  `weight_kg` FLOAT DEFAULT NULL,
  `blood_pressure` VARCHAR(20) DEFAULT NULL,
  `pulse` INT DEFAULT NULL,
  `temperature` FLOAT DEFAULT NULL,
  `spo2` INT DEFAULT NULL,
  `recorded_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_vitals_patient` (`patient_id`),
  KEY `idx_vitals_appointment` (`appointment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: family_history
-- =====================================================
CREATE TABLE IF NOT EXISTS `family_history` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `patient_id` INT(11) NOT NULL,
  `relation` ENUM('father','mother','brother','sister','grandparent','other') DEFAULT 'other',
  `condition` VARCHAR(255) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_family_patient` (`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: insurance_policies
-- =====================================================
CREATE TABLE IF NOT EXISTS `insurance_policies` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `patient_id` INT(11) NOT NULL,
  `provider` VARCHAR(255) DEFAULT NULL,
  `policy_number` VARCHAR(255) DEFAULT NULL,
  `coverage_details` TEXT DEFAULT NULL,
  `valid_till` DATE DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_insurance_patient` (`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: icd10_codes
-- =====================================================
CREATE TABLE IF NOT EXISTS `icd10_codes` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(20) NOT NULL,
  `description` VARCHAR(500) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_icd10_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: audit_logs (basic audit)
-- =====================================================
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) DEFAULT NULL,
  `action` VARCHAR(255) DEFAULT NULL,
  `entity` VARCHAR(255) DEFAULT NULL,
  `entity_id` VARCHAR(255) DEFAULT NULL,
  `details` LONGTEXT DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_user` (`user_id`),
  KEY `idx_audit_action` (`action`),
  KEY `idx_audit_entity` (`entity`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: receipt_templates
-- =====================================================
CREATE TABLE IF NOT EXISTS `receipt_templates` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `clinic_id` INT(11) DEFAULT NULL,
  `template_name` VARCHAR(255) NOT NULL,
  `header_content` TEXT DEFAULT NULL,
  `header_image` TEXT DEFAULT NULL COMMENT 'URL or base64 encoded header image',
  `footer_content` TEXT DEFAULT NULL,
  `footer_image` TEXT DEFAULT NULL COMMENT 'URL or base64 encoded footer image',
  `is_default` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_receipt_templates_clinic` (`clinic_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: medical_certificates
-- =====================================================
CREATE TABLE IF NOT EXISTS `medical_certificates` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `patient_id` INT(11) NOT NULL,
  `doctor_name` VARCHAR(255) NOT NULL,
  `doctor_registration_no` VARCHAR(100) DEFAULT NULL,
  `doctor_qualification` VARCHAR(255) DEFAULT NULL,
  `certificate_type` ENUM(
    'sick_leave',
    'fitness',
    'discharge',
    'pre_op_fitness',
    '2d_echo',
    'travel',
    'disability',
    'medical_report',
    'other'
  ) NOT NULL DEFAULT 'sick_leave',
  `certificate_title` VARCHAR(255) NOT NULL,
  `diagnosis` TEXT DEFAULT NULL,
  `certificate_content` TEXT NOT NULL,
  `issued_date` DATE NOT NULL,
  `valid_from` DATE DEFAULT NULL,
  `valid_until` DATE DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_by` INT(11) DEFAULT NULL,
  `clinic_id` INT(11) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_medical_certificates_patient` (`patient_id`),
  KEY `idx_medical_certificates_created_by` (`created_by`),
  KEY `idx_medical_certificates_clinic` (`clinic_id`),
  KEY `idx_medical_certificates_issued_date` (`issued_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: medical_certificate_templates
-- =====================================================
CREATE TABLE IF NOT EXISTS `medical_certificate_templates` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `template_name` VARCHAR(255) NOT NULL,
  `certificate_type` ENUM(
    'sick_leave',
    'fitness',
    'discharge',
    'pre_op_fitness',
    '2d_echo',
    'travel',
    'disability',
    'medical_report',
    'other'
  ) NOT NULL,
  `template_content` TEXT NOT NULL,
  `clinic_id` INT(11) DEFAULT NULL,
  `is_default` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_medical_cert_templates_clinic` (`clinic_id`),
  KEY `idx_medical_cert_templates_type` (`certificate_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: abha_accounts
-- =====================================================
CREATE TABLE IF NOT EXISTS `abha_accounts` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `patient_id` INT(11) NOT NULL,
  `abha_number` VARCHAR(17) NOT NULL,
  `abha_address` VARCHAR(255) DEFAULT NULL,
  `health_id` VARCHAR(255) DEFAULT NULL,
  `name` VARCHAR(255) DEFAULT NULL,
  `first_name` VARCHAR(100) DEFAULT NULL,
  `middle_name` VARCHAR(100) DEFAULT NULL,
  `last_name` VARCHAR(100) DEFAULT NULL,
  `gender` ENUM('male', 'female', 'other') DEFAULT NULL,
  `date_of_birth` DATE DEFAULT NULL,
  `mobile` VARCHAR(15) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `district` VARCHAR(100) DEFAULT NULL,
  `state` VARCHAR(100) DEFAULT NULL,
  `pincode` VARCHAR(10) DEFAULT NULL,
  `profile_photo` TEXT DEFAULT NULL,
  `kycverified` TINYINT(1) DEFAULT 0,
  `status` ENUM('active', 'inactive', 'deactivated') DEFAULT 'active',
  `verification_status` ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
  `aadhaar_verified` TINYINT(1) DEFAULT 0,
  `mobile_verified` TINYINT(1) DEFAULT 0,
  `email_verified` TINYINT(1) DEFAULT 0,
  `abdm_token` TEXT DEFAULT NULL,
  `refresh_token` TEXT DEFAULT NULL,
  `token_expires_at` TIMESTAMP NULL DEFAULT NULL,
  `registered_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_abha_accounts_abha_number` (`abha_number`),
  UNIQUE KEY `idx_abha_accounts_patient` (`patient_id`),
  KEY `idx_abha_accounts_health_id` (`health_id`),
  KEY `idx_abha_accounts_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: abha_registration_sessions
-- =====================================================
CREATE TABLE IF NOT EXISTS `abha_registration_sessions` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `patient_id` INT(11) DEFAULT NULL,
  `session_id` VARCHAR(255) NOT NULL,
  `txn_id` VARCHAR(255) DEFAULT NULL,
  `aadhaar_number` VARCHAR(12) DEFAULT NULL,
  `mobile_number` VARCHAR(15) DEFAULT NULL,
  `otp_sent_at` TIMESTAMP NULL DEFAULT NULL,
  `otp_verified_at` TIMESTAMP NULL DEFAULT NULL,
  `registration_type` ENUM('aadhaar', 'mobile', 'email') DEFAULT 'aadhaar',
  `status` ENUM('initiated', 'otp_sent', 'otp_verified', 'completed', 'failed', 'expired') DEFAULT 'initiated',
  `request_data` JSON DEFAULT NULL,
  `response_data` JSON DEFAULT NULL,
  `error_message` TEXT DEFAULT NULL,
  `expires_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_abha_sessions_session_id` (`session_id`),
  KEY `idx_abha_sessions_patient` (`patient_id`),
  KEY `idx_abha_sessions_status` (`status`),
  KEY `idx_abha_sessions_txn_id` (`txn_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: abha_login_sessions
-- =====================================================
CREATE TABLE IF NOT EXISTS `abha_login_sessions` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `patient_id` INT(11) DEFAULT NULL,
  `abha_number` VARCHAR(17) DEFAULT NULL,
  `abha_address` VARCHAR(255) DEFAULT NULL,
  `session_id` VARCHAR(255) NOT NULL,
  `txn_id` VARCHAR(255) DEFAULT NULL,
  `auth_method` ENUM('aadhaar_otp', 'mobile_otp', 'password', 'demographics') DEFAULT 'aadhaar_otp',
  `otp_sent_at` TIMESTAMP NULL DEFAULT NULL,
  `otp_verified_at` TIMESTAMP NULL DEFAULT NULL,
  `status` ENUM('initiated', 'otp_sent', 'authenticated', 'failed', 'expired') DEFAULT 'initiated',
  `request_data` JSON DEFAULT NULL,
  `response_data` JSON DEFAULT NULL,
  `error_message` TEXT DEFAULT NULL,
  `expires_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_abha_login_session_id` (`session_id`),
  KEY `idx_abha_login_patient` (`patient_id`),
  KEY `idx_abha_login_status` (`status`),
  KEY `idx_abha_login_abha_number` (`abha_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: abha_api_logs
-- =====================================================
CREATE TABLE IF NOT EXISTS `abha_api_logs` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `patient_id` INT(11) DEFAULT NULL,
  `session_id` VARCHAR(255) DEFAULT NULL,
  `api_endpoint` VARCHAR(500) NOT NULL,
  `http_method` VARCHAR(10) NOT NULL,
  `request_headers` JSON DEFAULT NULL,
  `request_body` JSON DEFAULT NULL,
  `response_status` INT(11) DEFAULT NULL,
  `response_body` JSON DEFAULT NULL,
  `response_time_ms` INT(11) DEFAULT NULL,
  `error_message` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_abha_logs_patient` (`patient_id`),
  KEY `idx_abha_logs_session` (`session_id`),
  KEY `idx_abha_logs_endpoint` (`api_endpoint`(255)),
  KEY `idx_abha_logs_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: doctor_schedules
-- =====================================================
CREATE TABLE IF NOT EXISTS `doctor_schedules` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `doctor_id` INT(11) NOT NULL,
  `clinic_id` INT(11) DEFAULT NULL,
  `day_of_week` ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `slot_duration` INT(11) NOT NULL DEFAULT 15 COMMENT 'Duration in minutes',
  `max_patients_per_slot` INT(11) NOT NULL DEFAULT 1,
  `is_active` TINYINT(1) DEFAULT 1,
  `break_start_time` TIME DEFAULT NULL,
  `break_end_time` TIME DEFAULT NULL,
  `effective_from` DATE DEFAULT NULL,
  `effective_until` DATE DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_doctor_schedules_doctor` (`doctor_id`),
  KEY `idx_doctor_schedules_clinic` (`clinic_id`),
  KEY `idx_doctor_schedules_day` (`day_of_week`),
  KEY `idx_doctor_schedules_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: appointment_slots
-- =====================================================
CREATE TABLE IF NOT EXISTS `appointment_slots` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `doctor_id` INT(11) NOT NULL,
  `clinic_id` INT(11) DEFAULT NULL,
  `slot_date` DATE NOT NULL,
  `slot_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `status` ENUM('available', 'booked', 'blocked', 'completed', 'cancelled') DEFAULT 'available',
  `max_bookings` INT(11) NOT NULL DEFAULT 1,
  `current_bookings` INT(11) NOT NULL DEFAULT 0,
  `is_emergency_slot` TINYINT(1) DEFAULT 0,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_appointment_slots_unique` (`doctor_id`, `slot_date`, `slot_time`),
  KEY `idx_appointment_slots_clinic` (`clinic_id`),
  KEY `idx_appointment_slots_date` (`slot_date`),
  KEY `idx_appointment_slots_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: blocked_slots
-- =====================================================
CREATE TABLE IF NOT EXISTS `blocked_slots` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `doctor_id` INT(11) NOT NULL,
  `clinic_id` INT(11) DEFAULT NULL,
  `block_date` DATE NOT NULL,
  `start_time` TIME DEFAULT NULL,
  `end_time` TIME DEFAULT NULL,
  `is_full_day` TINYINT(1) DEFAULT 0,
  `reason` VARCHAR(255) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_by` INT(11) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_blocked_slots_doctor` (`doctor_id`),
  KEY `idx_blocked_slots_clinic` (`clinic_id`),
  KEY `idx_blocked_slots_date` (`block_date`),
  KEY `idx_blocked_slots_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: appointment_status_history
-- =====================================================
CREATE TABLE IF NOT EXISTS `appointment_status_history` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `appointment_id` INT(11) NOT NULL,
  `old_status` VARCHAR(50) DEFAULT NULL,
  `new_status` VARCHAR(50) NOT NULL,
  `changed_by` INT(11) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_appointment_history_appointment` (`appointment_id`),
  KEY `idx_appointment_history_changed_by` (`changed_by`),
  KEY `idx_appointment_history_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: patient_surgical_history (NEW)
-- =====================================================
CREATE TABLE IF NOT EXISTS `patient_surgical_history` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `patient_id` INT(11) NOT NULL,
  `surgery_name` VARCHAR(255) NOT NULL,
  `surgery_date` DATE DEFAULT NULL,
  `hospital` VARCHAR(255) DEFAULT NULL,
  `surgeon` VARCHAR(255) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `complications` TEXT DEFAULT NULL,
  `outcome` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_surgical_patient` (`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: medications (NEW)
-- =====================================================
CREATE TABLE IF NOT EXISTS `medications` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `patient_id` INT(11) NOT NULL,
  `medication_name` VARCHAR(255) NOT NULL,
  `dosage` VARCHAR(100) DEFAULT NULL,
  `frequency` VARCHAR(100) DEFAULT NULL,
  `start_date` DATE DEFAULT NULL,
  `end_date` DATE DEFAULT NULL,
  `is_current` TINYINT(1) DEFAULT 1,
  `prescribed_by` VARCHAR(255) DEFAULT NULL,
  `reason` TEXT DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_medications_patient` (`patient_id`),
  KEY `idx_medications_current` (`is_current`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Note: appointment_slots table is already defined above (lines 933-949)
-- Duplicate table definition removed to avoid conflicts

-- =====================================================
-- FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Users table
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Doctors table
ALTER TABLE `doctors`
  ADD CONSTRAINT `fk_doctors_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_doctors_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Clinic staff table
ALTER TABLE `clinic_staff`
  ADD CONSTRAINT `fk_clinicstaff_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_clinicstaff_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ABHA records table
ALTER TABLE `abha_records`
  ADD CONSTRAINT `fk_abha_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Appointments table
ALTER TABLE `appointments`
  ADD CONSTRAINT `fk_appointments_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_appointments_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_appointments_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_appointments_slot` FOREIGN KEY (`appointment_slot_id`) REFERENCES `appointment_slots`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Appointment followups table
ALTER TABLE `appointment_followups`
  ADD CONSTRAINT `fk_af_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Medical records table
ALTER TABLE `medical_records`
  ADD CONSTRAINT `fk_medical_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_medical_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_medical_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Lab investigations table
ALTER TABLE `lab_investigations`
  ADD CONSTRAINT `fk_lab_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_lab_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_lab_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Test reports table
ALTER TABLE `test_reports`
  ADD CONSTRAINT `fk_testreports_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_testreports_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Test report items table
ALTER TABLE `test_report_items`
  ADD CONSTRAINT `fk_tri_report` FOREIGN KEY (`report_id`) REFERENCES `test_reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Prescriptions table
ALTER TABLE `prescriptions`
  ADD CONSTRAINT `fk_presc_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_presc_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_presc_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Prescription items table
ALTER TABLE `prescription_items`
  ADD CONSTRAINT `fk_pi_prescription` FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pi_medicine` FOREIGN KEY (`medicine_id`) REFERENCES `medicines`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Bills table
ALTER TABLE `bills`
  ADD CONSTRAINT `fk_bills_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_bills_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_bills_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_bills_template` FOREIGN KEY (`template_id`) REFERENCES `receipt_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Bill items table
ALTER TABLE `bill_items`
  ADD CONSTRAINT `fk_bill_items_bill` FOREIGN KEY (`bill_id`) REFERENCES `bills`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Queue table
ALTER TABLE `queue`
  ADD CONSTRAINT `fk_queue_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_queue_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Patient tags table
ALTER TABLE `patient_tags`
  ADD CONSTRAINT `fk_patient_tags_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Frequently used table
ALTER TABLE `frequently_used`
  ADD CONSTRAINT `fk_frequent_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Notifications table
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Pad configurations table
ALTER TABLE `pad_configurations`
  ADD CONSTRAINT `fk_pad_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Reports table
ALTER TABLE `reports`
  ADD CONSTRAINT `fk_reports_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_reports_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Import history table
ALTER TABLE `import_history`
  ADD CONSTRAINT `fk_import_history_by` FOREIGN KEY (`imported_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Backup logs table
ALTER TABLE `backup_logs`
  ADD CONSTRAINT `fk_backup_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Patient vitals table
ALTER TABLE `patient_vitals`
  ADD CONSTRAINT `fk_vitals_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_vitals_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Family history table
ALTER TABLE `family_history`
  ADD CONSTRAINT `fk_family_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Insurance policies table
ALTER TABLE `insurance_policies`
  ADD CONSTRAINT `fk_insurance_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Audit logs table
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Receipt templates table
ALTER TABLE `receipt_templates`
  ADD CONSTRAINT `fk_receipt_templates_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Medical certificates table
ALTER TABLE `medical_certificates`
  ADD CONSTRAINT `fk_medical_certificates_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_medical_certificates_user` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_medical_certificates_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Medical certificate templates table
ALTER TABLE `medical_certificate_templates`
  ADD CONSTRAINT `fk_medical_cert_templates_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ABHA accounts table
ALTER TABLE `abha_accounts`
  ADD CONSTRAINT `fk_abha_accounts_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ABHA registration sessions table
ALTER TABLE `abha_registration_sessions`
  ADD CONSTRAINT `fk_abha_sessions_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- ABHA login sessions table
ALTER TABLE `abha_login_sessions`
  ADD CONSTRAINT `fk_abha_login_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- ABHA API logs table
ALTER TABLE `abha_api_logs`
  ADD CONSTRAINT `fk_abha_logs_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Doctor schedules table - Note: Changed to reference user_id directly
ALTER TABLE `doctor_schedules`
  ADD CONSTRAINT `fk_doctor_schedules_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_doctor_schedules_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Appointment slots table
ALTER TABLE `appointment_slots`
  ADD CONSTRAINT `fk_appointment_slots_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_appointment_slots_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Blocked slots table - Note: Changed to reference user_id directly
ALTER TABLE `blocked_slots`
  ADD CONSTRAINT `fk_blocked_slots_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_blocked_slots_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_blocked_slots_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Appointment status history table
ALTER TABLE `appointment_status_history`
  ADD CONSTRAINT `fk_appointment_history_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_appointment_history_changed_by` FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Patient surgical history table (NEW with different constraint name)
ALTER TABLE `patient_surgical_history`
  ADD CONSTRAINT `fk_surgical_history_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Medications table (NEW)
ALTER TABLE `medications`
  ADD CONSTRAINT `fk_medications_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================
-- INDEXES (Additional ones not already defined)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_lab_ordered_date ON lab_investigations(ordered_date);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at);
CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON appointments(appointment_date, status);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(doctor_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date ON appointments(patient_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_bills_payment_status ON bills(payment_status);
CREATE INDEX IF NOT EXISTS idx_bills_bill_date ON bills(bill_date);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_created_at ON prescriptions(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_entity_id ON audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at_desc ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointment_intents_status ON appointment_intents(status);
CREATE INDEX IF NOT EXISTS idx_appointment_intents_created_at ON appointment_intents(created_at);
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(appointment_date, slot_time);
CREATE INDEX IF NOT EXISTS idx_appointments_visit_tracking ON appointments(visit_started_at, visit_ended_at);
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_time_range ON doctor_schedules(start_time, end_time);

-- Additional indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
CREATE INDEX IF NOT EXISTS idx_users_clinic_id ON users(clinic_id);
CREATE INDEX IF NOT EXISTS idx_doctors_clinic_id ON doctors(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_bills_clinic_id ON bills(clinic_id);
CREATE INDEX IF NOT EXISTS idx_queue_status ON queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_doctor_id ON queue(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_investigations_patient_id ON lab_investigations(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_investigations_status ON lab_investigations(status);

ALTER TABLE medical_certificate_templates
ADD COLUMN header_image LONGTEXT NULL AFTER template_content;

ALTER TABLE medical_certificate_templates
ADD COLUMN footer_image LONGTEXT NULL AFTER header_image;


-- =====================================================
-- DEFAULT DATA
-- =====================================================
INSERT INTO `medical_certificate_templates` (`template_name`, `certificate_type`, `template_content`, `is_default`) VALUES
('Sick Leave Certificate', 'sick_leave', 'This is to certify that [PATIENT_NAME], [AGE] years, has been under my medical care and is advised to take rest for [DURATION] days from [START_DATE] to [END_DATE] due to [DIAGNOSIS].', 1),
('Fitness Certificate', 'fitness', 'This is to certify that [PATIENT_NAME], [AGE] years, has been medically examined and is found to be physically and mentally fit for [PURPOSE].', 1),
('Discharge Summary', 'discharge', 'This is to certify that [PATIENT_NAME], [AGE] years, was admitted on [ADMISSION_DATE] and discharged on [DISCHARGE_DATE]. Diagnosis: [DIAGNOSIS]. Treatment provided: [TREATMENT]. Advised for follow-up on [FOLLOWUP_DATE].', 1),
('Pre-Operative Fitness', 'pre_op_fitness', 'This is to certify that [PATIENT_NAME], [AGE] years, has been examined and is found fit for surgery under [ANESTHESIA_TYPE] anesthesia.', 1),
('Travel Fitness Certificate', 'travel', 'This is to certify that [PATIENT_NAME], [AGE] years, is medically fit to travel by [TRAVEL_MODE] to [DESTINATION].', 1)
ON DUPLICATE KEY UPDATE template_content = template_content;

-- =====================================================
-- MIGRATIONS - All Template Systems & Data
-- =====================================================

-- =====================================================
-- 1. DOCTOR AVAILABILITY & TIME SLOTS
-- =====================================================

CREATE TABLE IF NOT EXISTS `doctor_availability` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `doctor_id` INT(11) NOT NULL,
  `day_of_week` TINYINT(1) NOT NULL COMMENT '0=Sunday, 1=Monday, ..., 6=Saturday',
  `is_available` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_doctor_day` (`doctor_id`, `day_of_week`),
  CONSTRAINT `fk_doctor_availability_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `doctor_time_slots` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `doctor_id` INT(11) NOT NULL,
  `slot_time` TIME NOT NULL COMMENT 'Time slot in HH:MM format',
  `is_active` BOOLEAN DEFAULT TRUE,
  `display_order` INT(11) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_doctor_slot` (`doctor_id`, `slot_time`),
  CONSTRAINT `fk_doctor_time_slots_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default availability for Doctor ID 1 (Monday to Saturday)
INSERT INTO `doctor_availability` (`doctor_id`, `day_of_week`, `is_available`) VALUES
  (1, 0, FALSE),  -- Sunday - OFF
  (1, 1, TRUE),   -- Monday
  (1, 2, TRUE),   -- Tuesday
  (1, 3, TRUE),   -- Wednesday
  (1, 4, TRUE),   -- Thursday
  (1, 5, TRUE),   -- Friday
  (1, 6, TRUE)    -- Saturday
ON DUPLICATE KEY UPDATE `is_available` = VALUES(`is_available`), `updated_at` = NOW();

-- Default time slots for Doctor ID 1
INSERT INTO `doctor_time_slots` (`doctor_id`, `slot_time`, `is_active`, `display_order`) VALUES
  (1, '12:15:00', TRUE, 1),
  (1, '12:30:00', TRUE, 2),
  (1, '12:45:00', TRUE, 3),
  (1, '13:00:00', TRUE, 4),
  (1, '13:15:00', TRUE, 5),
  (1, '13:30:00', TRUE, 6),
  (1, '13:45:00', TRUE, 7),
  (1, '18:00:00', TRUE, 8),
  (1, '18:15:00', TRUE, 9),
  (1, '18:30:00', TRUE, 10),
  (1, '18:45:00', TRUE, 11),
  (1, '19:00:00', TRUE, 12),
  (1, '19:15:00', TRUE, 13),
  (1, '19:30:00', TRUE, 14),
  (1, '19:45:00', TRUE, 15),
  (1, '20:00:00', TRUE, 16),
  (1, '20:15:00', TRUE, 17),
  (1, '20:30:00', TRUE, 18),
  (1, '20:45:00', TRUE, 19)
ON DUPLICATE KEY UPDATE `is_active` = VALUES(`is_active`), `display_order` = VALUES(`display_order`), `updated_at` = NOW();

-- =====================================================
-- 2. SYMPTOMS TEMPLATES
-- =====================================================

CREATE TABLE IF NOT EXISTS `symptoms_templates` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `symptoms` JSON NOT NULL,
  `description` TEXT DEFAULT NULL,
  `category` VARCHAR(100) DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_by` INT(11) DEFAULT NULL,
  `clinic_id` INT(11) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_symptoms_templates_clinic` (`clinic_id`),
  KEY `idx_symptoms_templates_created_by` (`created_by`),
  KEY `idx_symptoms_templates_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `symptoms_templates` (`name`, `symptoms`, `description`, `category`) VALUES
('Common Cold', '["Runny nose", "Sneezing", "Sore throat", "Mild fever", "Cough"]', 'Common cold symptom package', 'Respiratory'),
('Seasonal Flu', '["High fever", "Body ache", "Headache", "Fatigue", "Dry cough", "Sore throat"]', 'Seasonal influenza symptoms', 'Respiratory'),
('Gastroenteritis', '["Nausea", "Vomiting", "Diarrhea", "Abdominal pain", "Loss of appetite", "Mild fever"]', 'Stomach flu symptoms', 'Gastrointestinal'),
('Migraine', '["Severe headache", "Sensitivity to light", "Nausea", "Visual disturbances", "Dizziness"]', 'Migraine headache symptoms', 'Neurological'),
('Urinary Tract Infection', '["Burning urination", "Frequent urination", "Lower abdominal pain", "Cloudy urine", "Urgency"]', 'UTI symptoms', 'Urological'),
('Hypertension', '["Headache", "Dizziness", "Blurred vision", "Chest discomfort", "Fatigue"]', 'High blood pressure symptoms', 'Cardiovascular'),
('Diabetes Symptoms', '["Frequent urination", "Increased thirst", "Increased hunger", "Fatigue", "Blurred vision", "Slow healing wounds"]', 'Common diabetes presentation', 'Endocrine'),
('Asthma Attack', '["Shortness of breath", "Wheezing", "Chest tightness", "Cough", "Difficulty breathing"]', 'Asthma exacerbation symptoms', 'Respiratory'),
('Allergic Reaction', '["Skin rash", "Itching", "Sneezing", "Watery eyes", "Runny nose", "Swelling"]', 'Allergic reaction symptoms', 'Immunological'),
('Acid Reflux/GERD', '["Heartburn", "Chest pain", "Difficulty swallowing", "Regurgitation", "Sour taste"]', 'Gastroesophageal reflux symptoms', 'Gastrointestinal'),
('Anxiety', '["Restlessness", "Rapid heartbeat", "Sweating", "Difficulty concentrating", "Sleep disturbances"]', 'Anxiety disorder symptoms', 'Psychiatric'),
('Depression', '["Persistent sadness", "Loss of interest", "Fatigue", "Sleep changes", "Appetite changes"]', 'Depression symptoms', 'Psychiatric'),
('Arthritis', '["Joint pain", "Stiffness", "Swelling", "Reduced range of motion", "Morning stiffness"]', 'Arthritis symptoms', 'Musculoskeletal'),
('Insomnia', '["Difficulty falling asleep", "Frequent waking", "Early morning awakening", "Daytime fatigue"]', 'Sleep disorder symptoms', 'Neurological'),
('Sinusitis', '["Facial pain", "Nasal congestion", "Thick nasal discharge", "Headache", "Post-nasal drip"]', 'Sinus infection symptoms', 'Respiratory'),
('Bronchitis', '["Persistent cough", "Chest discomfort", "Fatigue", "Shortness of breath", "Mucus production"]', 'Bronchitis symptoms', 'Respiratory'),
('Vertigo', '["Spinning sensation", "Nausea", "Balance problems", "Headache", "Sweating"]', 'Vertigo symptoms', 'Neurological'),
('Eczema', '["Itchy skin", "Red patches", "Dry skin", "Skin inflammation", "Thickened skin"]', 'Eczema symptoms', 'Dermatological'),
('Conjunctivitis', '["Red eyes", "Itching", "Watery discharge", "Sensitivity to light", "Gritty feeling"]', 'Pink eye symptoms', 'Ophthalmological'),
('Back Pain', '["Lower back pain", "Stiffness", "Limited mobility", "Muscle spasms", "Radiating pain"]', 'Back pain symptoms', 'Musculoskeletal')
ON DUPLICATE KEY UPDATE symptoms = VALUES(symptoms);

-- =====================================================
-- 3. SYMPTOM-MEDICATION MAPPING
-- =====================================================

CREATE TABLE IF NOT EXISTS `symptom_medication_mapping` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `symptom_name` VARCHAR(255) NOT NULL,
  `medication_name` VARCHAR(255) NOT NULL,
  `brand_name` VARCHAR(255) DEFAULT NULL,
  `composition` VARCHAR(255) DEFAULT NULL,
  `dosage` VARCHAR(100) DEFAULT NULL,
  `frequency` VARCHAR(100) DEFAULT NULL,
  `timing` VARCHAR(100) DEFAULT NULL,
  `duration` VARCHAR(100) DEFAULT NULL,
  `priority` INT DEFAULT 1,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_symptom_name` (`symptom_name`),
  KEY `idx_medication_name` (`medication_name`),
  KEY `idx_priority` (`priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `symptom_medication_mapping` (`symptom_name`, `medication_name`, `brand_name`, `composition`, `dosage`, `frequency`, `timing`, `duration`, `priority`) VALUES
-- Fever medications
('Fever', 'Paracetamol 500mg', 'Crocin', 'Paracetamol', '500mg', '1-1-1', 'After Meal', '3 days', 1),
('Fever', 'Ibuprofen 400mg', 'Brufen', 'Ibuprofen', '400mg', '1-0-1', 'After Meal', '3 days', 2),

-- Cough medications
('Cough', 'Cetirizine 10mg', 'Cetriz', 'Cetirizine', '10mg', '0-0-1', 'After Meal', '5 days', 1),
('Cough', 'Dextromethorphan Syrup', 'Benadryl DR', 'Dextromethorphan', '10ml', '1-0-1', 'After Meal', '5 days', 2),

-- Headache medications
('Headache', 'Paracetamol 500mg', 'Crocin', 'Paracetamol', '500mg', '1-1-1', 'After Meal', '3 days', 1),
('Headache', 'Aspirin 325mg', 'Disprin', 'Aspirin', '325mg', '1-0-1', 'After Meal', '3 days', 2),

-- Nausea medications
('Nausea', 'Ondansetron 4mg', 'Emeset', 'Ondansetron', '4mg', '1-0-1', 'Before Meal', '3 days', 1),
('Nausea', 'Domperidone 10mg', 'Domstal', 'Domperidone', '10mg', '1-1-1', 'Before Meal', '5 days', 2),

-- Fatigue medications
('Fatigue', 'Multivitamin', 'Becosules', 'B-Complex + Vit C', '1 cap', '1-0-0', 'After Meal', '30 days', 1),
('Fatigue', 'Iron + Folic Acid', 'Folvite', 'Iron + Folic Acid', '1 tab', '1-0-0', 'After Meal', '30 days', 2),

-- Dizziness medication
('Dizziness', 'Betahistine 16mg', 'Vertin', 'Betahistine', '16mg', '1-0-1', 'After Meal', '7 days', 1),
('Dizziness', 'Cinnarizine 25mg', 'Stugeron', 'Cinnarizine', '25mg', '1-0-1', 'After Meal', '7 days', 2),

-- Pain medications
('Pain', 'Diclofenac 50mg', 'Voveran', 'Diclofenac', '50mg', '1-0-1', 'After Meal', '5 days', 1),
('Pain', 'Paracetamol 500mg', 'Crocin', 'Paracetamol', '500mg', '1-1-1', 'After Meal', '3 days', 2),

-- Weakness medications
('Weakness', 'Multivitamin', 'Revital', 'Multivitamin + Minerals', '1 cap', '1-0-0', 'After Meal', '30 days', 1),
('Weakness', 'Protein Powder', 'Protinex', 'Protein supplement', '2 scoops', '1-0-1', 'With Milk', '30 days', 2),

-- Cold medications
('Cold', 'Cetirizine 10mg', 'Cetriz', 'Cetirizine', '10mg', '0-0-1', 'After Meal', '5 days', 1),
('Cold', 'Phenylephrine + Paracetamol', 'Sinarest', 'Combination', '1 tab', '1-0-1', 'After Meal', '3 days', 2),

-- Sore Throat medications
('Sore Throat', 'Amoxicillin 500mg', 'Novamox', 'Amoxicillin', '500mg', '1-1-1', 'After Meal', '5 days', 1),
('Sore Throat', 'Betadine Gargle', 'Betadine', 'Povidone Iodine', '15ml', '3-4 times', 'Gargle', '5 days', 2),

-- Acidity medications
('Acidity', 'Omeprazole 20mg', 'Omez', 'Omeprazole', '20mg', '1-0-0', 'Before Meal', '7 days', 1),
('Acidity', 'Ranitidine 150mg', 'Rantac', 'Ranitidine', '150mg', '1-0-1', 'After Meal', '7 days', 2),

-- Gastric medications
('Gastric', 'Omeprazole 20mg', 'Omez', 'Omeprazole', '20mg', '1-0-0', 'Before Meal', '7 days', 1),
('Gastric', 'Pantoprazole 40mg', 'Pan', 'Pantoprazole', '40mg', '1-0-0', 'Before Meal', '7 days', 2),

-- Allergy medications
('Allergy', 'Levocetirizine 5mg', 'Levocet', 'Levocetirizine', '5mg', '0-0-1', 'After Meal', '7 days', 1),
('Allergy', 'Montelukast 10mg', 'Montek', 'Montelukast', '10mg', '0-0-1', 'After Meal', '10 days', 2),

-- Constipation medications
('Constipation', 'Isabgol', 'Sat Isabgol', 'Psyllium Husk', '1 tsp', '1-0-1', 'With Water', '7 days', 1),
('Constipation', 'Lactulose Syrup', 'Duphalac', 'Lactulose', '15ml', '0-0-1', 'Before Sleep', '7 days', 2),

-- Diarrhea medications
('Diarrhea', 'Loperamide 2mg', 'Eldoper', 'Loperamide', '2mg', '1-0-1', 'After Meal', '2 days', 1),
('Diarrhea', 'ORS (Electral)', 'Electral', 'Electrolytes', '1 sachet', '4-6 times', 'With Water', '3 days', 2),

-- Insomnia medications
('Insomnia', 'Melatonin 3mg', 'Melatonin', 'Melatonin', '3mg', '0-0-1', 'Before Sleep', '7 days', 1),
('Insomnia', 'Zolpidem 5mg', 'Zolfresh', 'Zolpidem', '5mg', '0-0-1', 'Before Sleep', '5 days', 2),

-- Anxiety medications
('Anxiety', 'Alprazolam 0.25mg', 'Alprax', 'Alprazolam', '0.25mg', '1-0-1', 'After Meal', '7 days', 1),
('Anxiety', 'Propranolol 10mg', 'Inderal', 'Propranolol', '10mg', '1-0-1', 'After Meal', '7 days', 2),

-- High BP medications
('High BP', 'Amlodipine 5mg', 'Amlodac', 'Amlodipine', '5mg', '1-0-0', 'After Meal', '30 days', 1),
('High BP', 'Telmisartan 40mg', 'Telma', 'Telmisartan', '40mg', '1-0-0', 'After Meal', '30 days', 2),

-- High Sugar medications
('High Sugar', 'Metformin 500mg', 'Glycomet', 'Metformin', '500mg', '1-0-1', 'After Meal', '30 days', 1),
('High Sugar', 'Glimepiride 1mg', 'Amaryl', 'Glimepiride', '1mg', '1-0-0', 'Before Breakfast', '30 days', 2)
ON DUPLICATE KEY UPDATE medication_name = VALUES(medication_name);

-- =====================================================
-- 4. PRESCRIPTION TEMPLATES
-- =====================================================

CREATE TABLE IF NOT EXISTS `prescription_templates` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `template_name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `category` VARCHAR(100) DEFAULT NULL,
  `symptoms` JSON DEFAULT NULL,
  `diagnosis` VARCHAR(255) DEFAULT NULL,
  `medications` JSON DEFAULT NULL,
  `duration_days` INT DEFAULT 7,
  `advice` TEXT DEFAULT NULL,
  `follow_up_days` INT DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_by` INT(11) DEFAULT NULL,
  `clinic_id` INT(11) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_prescription_templates_category` (`category`),
  KEY `idx_prescription_templates_clinic` (`clinic_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `prescription_templates` (`template_name`, `category`, `symptoms`, `diagnosis`, `medications`, `duration_days`, `advice`, `follow_up_days`) VALUES
('Common Cold Treatment', 'Respiratory', '["Runny nose", "Sneezing", "Sore throat", "Mild fever"]', 'Upper Respiratory Tract Infection', '[{"name":"Paracetamol 500mg","frequency":"1-1-1","timing":"After Meal","duration":"3 days"},{"name":"Cetirizine 10mg","frequency":"0-0-1","timing":"After Meal","duration":"5 days"}]', 5, 'Rest, warm fluids, steam inhalation 2-3 times daily', 5),
('Fever & Body Ache', 'General', '["Fever", "Body ache", "Headache"]', 'Viral Fever', '[{"name":"Paracetamol 650mg","frequency":"1-1-1","timing":"After Meal","duration":"5 days"},{"name":"Multivitamin","frequency":"1-0-0","timing":"After Meal","duration":"7 days"}]', 5, 'Rest, adequate fluid intake, avoid cold foods', 3),
('Acidity Management', 'Gastrointestinal', '["Heartburn", "Chest pain", "Sour taste"]', 'GERD', '[{"name":"Omeprazole 20mg","frequency":"1-0-0","timing":"Before Meal","duration":"14 days"},{"name":"Antacid Syrup","frequency":"2-0-2","timing":"After Meal","duration":"7 days"}]', 14, 'Avoid spicy food, late-night meals, sleep with head elevated', 14),
('Hypertension Management', 'Cardiovascular', '["Headache", "Dizziness"]', 'Essential Hypertension', '[{"name":"Amlodipine 5mg","frequency":"1-0-0","timing":"After Meal","duration":"30 days"},{"name":"Telmisartan 40mg","frequency":"1-0-0","timing":"After Meal","duration":"30 days"}]', 30, 'Low salt diet, regular exercise, monitor BP daily', 15),
('Diabetes Control', 'Endocrine', '["Increased thirst", "Frequent urination"]', 'Type 2 Diabetes Mellitus', '[{"name":"Metformin 500mg","frequency":"1-0-1","timing":"After Meal","duration":"30 days"},{"name":"Glimepiride 1mg","frequency":"1-0-0","timing":"Before Breakfast","duration":"30 days"}]', 30, 'Sugar-free diet, regular exercise, monitor blood sugar', 15),
('Gastroenteritis', 'Gastrointestinal', '["Nausea", "Vomiting", "Diarrhea"]', 'Acute Gastroenteritis', '[{"name":"Ondansetron 4mg","frequency":"1-0-1","timing":"Before Meal","duration":"3 days"},{"name":"ORS Electral","frequency":"After each loose stool","timing":"With Water","duration":"3 days"}]', 3, 'Light diet, avoid dairy, plenty of fluids', 3),
('Migraine Relief', 'Neurological', '["Severe headache", "Sensitivity to light"]', 'Migraine', '[{"name":"Sumatriptan 50mg","frequency":"SOS","timing":"At onset","duration":"As needed"},{"name":"Paracetamol 500mg","frequency":"1-1-1","timing":"After Meal","duration":"3 days"}]', 7, 'Avoid triggers, rest in dark room, adequate sleep', 7),
('UTI Treatment', 'Urological', '["Burning urination", "Frequent urination"]', 'Urinary Tract Infection', '[{"name":"Nitrofurantoin 100mg","frequency":"1-0-1","timing":"After Meal","duration":"5 days"},{"name":"Cranberry Extract","frequency":"1-0-1","timing":"After Meal","duration":"7 days"}]', 5, 'Plenty of water, complete antibiotic course', 5),
('Asthma Control', 'Respiratory', '["Wheezing", "Shortness of breath"]', 'Bronchial Asthma', '[{"name":"Salbutamol Inhaler","frequency":"2 puffs SOS","timing":"When needed","duration":"As needed"},{"name":"Montelukast 10mg","frequency":"0-0-1","timing":"After Meal","duration":"30 days"}]', 30, 'Avoid allergens, use inhaler correctly', 15),
('Allergic Rhinitis', 'Immunological', '["Sneezing", "Runny nose", "Watery eyes"]', 'Allergic Rhinitis', '[{"name":"Levocetirizine 5mg","frequency":"0-0-1","timing":"After Meal","duration":"10 days"},{"name":"Nasal Spray","frequency":"2 puffs BD","timing":"Morning & Evening","duration":"7 days"}]', 10, 'Avoid allergens, keep environment clean', 10),
('Anxiety Disorder', 'Psychiatric', '["Restlessness", "Rapid heartbeat"]', 'Generalized Anxiety Disorder', '[{"name":"Alprazolam 0.25mg","frequency":"1-0-1","timing":"After Meal","duration":"7 days"},{"name":"Propranolol 10mg","frequency":"1-0-1","timing":"After Meal","duration":"7 days"}]', 7, 'Relaxation techniques, avoid caffeine, counseling', 7),
('Depression Management', 'Psychiatric', '["Persistent sadness", "Loss of interest"]', 'Depression', '[{"name":"Escitalopram 10mg","frequency":"0-0-1","timing":"After Meal","duration":"30 days"},{"name":"Multivitamin","frequency":"1-0-0","timing":"After Meal","duration":"30 days"}]', 30, 'Counseling, regular routine, social interaction', 15),
('Arthritis Pain', 'Musculoskeletal', '["Joint pain", "Stiffness"]', 'Osteoarthritis', '[{"name":"Diclofenac 50mg","frequency":"1-0-1","timing":"After Meal","duration":"7 days"},{"name":"Calcium + Vit D3","frequency":"1-0-0","timing":"After Meal","duration":"30 days"}]', 30, 'Gentle exercise, hot/cold therapy, maintain healthy weight', 15),
('Insomnia Treatment', 'Neurological', '["Difficulty falling asleep", "Frequent waking"]', 'Insomnia', '[{"name":"Melatonin 3mg","frequency":"0-0-1","timing":"Before Sleep","duration":"7 days"},{"name":"Zolpidem 5mg","frequency":"0-0-1 SOS","timing":"Before Sleep","duration":"5 days"}]', 7, 'Sleep hygiene, avoid screens before bed, regular schedule', 7),
('Sinusitis', 'Respiratory', '["Facial pain", "Nasal congestion"]', 'Acute Sinusitis', '[{"name":"Amoxicillin 500mg","frequency":"1-1-1","timing":"After Meal","duration":"7 days"},{"name":"Steam Inhalation","frequency":"2-3 times","timing":"Daily","duration":"7 days"}]', 7, 'Steam inhalation, avoid cold air, complete antibiotic course', 7),
('Bronchitis', 'Respiratory', '["Persistent cough", "Chest discomfort"]', 'Acute Bronchitis', '[{"name":"Azithromycin 500mg","frequency":"1-0-0","timing":"After Meal","duration":"3 days"},{"name":"Cough Syrup","frequency":"10ml TDS","timing":"After Meal","duration":"5 days"}]', 5, 'Rest, warm fluids, avoid smoking', 5),
('Vertigo', 'Neurological', '["Spinning sensation", "Nausea"]', 'Benign Paroxysmal Positional Vertigo', '[{"name":"Betahistine 16mg","frequency":"1-0-1","timing":"After Meal","duration":"7 days"},{"name":"Cinnarizine 25mg","frequency":"1-0-1","timing":"After Meal","duration":"7 days"}]', 7, 'Avoid sudden head movements, Epley maneuver', 7),
('Eczema', 'Dermatological', '["Itchy skin", "Red patches"]', 'Atopic Dermatitis', '[{"name":"Cetirizine 10mg","frequency":"0-0-1","timing":"After Meal","duration":"10 days"},{"name":"Moisturizing Cream","frequency":"Apply BD","timing":"Morning & Night","duration":"30 days"}]', 10, 'Avoid irritants, keep skin moisturized, wear soft fabrics', 10),
('Conjunctivitis', 'Ophthalmological', '["Red eyes", "Watery discharge"]', 'Bacterial Conjunctivitis', '[{"name":"Eye Drops (Moxifloxacin)","frequency":"1 drop QID","timing":"4 times daily","duration":"5 days"},{"name":"Cold Compress","frequency":"3-4 times","timing":"Daily","duration":"5 days"}]', 5, 'Avoid touching eyes, maintain hygiene, cold compress', 5),
('Back Pain', 'Musculoskeletal', '["Lower back pain", "Stiffness"]', 'Acute Low Back Pain', '[{"name":"Diclofenac 50mg","frequency":"1-0-1","timing":"After Meal","duration":"7 days"},{"name":"Muscle Relaxant","frequency":"0-0-1","timing":"After Meal","duration":"5 days"}]', 7, 'Rest, hot/cold therapy, physiotherapy exercises', 7)
ON DUPLICATE KEY UPDATE medications = VALUES(medications);

-- =====================================================
-- 5. LAB TEMPLATES (47 Common Tests)
-- =====================================================

INSERT INTO `lab_templates` (`test_name`, `test_code`, `description`, `sample_type`, `category`, `unit`, `reference_range`, `special_instructions`, `is_active`) VALUES
('Complete Blood Count (CBC)', 'CBC', 'Complete blood count with differential', 'Whole Blood (EDTA)', 'Hematology', 'cells/µL', 'WBC: 4000-11000, RBC: M:4.5-5.5, F:4.0-5.0', 'Fasting not required', 1),
('Hemoglobin (Hb)', 'HB', 'Hemoglobin level measurement', 'Whole Blood (EDTA)', 'Hematology', 'g/dL', 'M: 13.5-17.5, F: 12.0-15.5', 'Fasting not required', 1),
('Platelet Count', 'PLT', 'Platelet count', 'Whole Blood (EDTA)', 'Hematology', 'lakhs/µL', '1.5-4.5', 'Fasting not required', 1),
('ESR (Erythrocyte Sedimentation Rate)', 'ESR', 'ESR Westergren method', 'Whole Blood (EDTA)', 'Hematology', 'mm/hr', 'M: 0-15, F: 0-20', 'Fasting not required', 1),
('Total WBC Count', 'TLC', 'Total leucocyte count', 'Whole Blood (EDTA)', 'Hematology', 'cells/µL', '4000-11000', 'Fasting not required', 1),
('Fasting Blood Sugar (FBS)', 'FBS', 'Fasting blood glucose', 'Serum (Fluoride)', 'Biochemistry', 'mg/dL', '70-100 (Normal), 100-125 (Pre-diabetic), >125 (Diabetic)', '8-12 hours fasting required', 1),
('Post Prandial Blood Sugar (PPBS)', 'PPBS', 'Post meal blood glucose (2 hrs after meal)', 'Serum (Fluoride)', 'Biochemistry', 'mg/dL', '<140 (Normal), 140-199 (Pre-diabetic), >200 (Diabetic)', 'Test 2 hours after meal', 1),
('Random Blood Sugar (RBS)', 'RBS', 'Random blood glucose', 'Serum (Fluoride)', 'Biochemistry', 'mg/dL', '<140 (Normal), >200 (Diabetic)', 'Fasting not required', 1),
('HbA1c (Glycosylated Hemoglobin)', 'HBA1C', '3-month average blood sugar', 'Whole Blood (EDTA)', 'Biochemistry', '%', '<5.7 (Normal), 5.7-6.4 (Pre-diabetic), >6.5 (Diabetic)', 'Fasting not required', 1),
('Liver Function Test (LFT)', 'LFT', 'Complete liver profile', 'Serum', 'Biochemistry', 'Multiple', 'See individual parameters', '8-12 hours fasting required', 1),
('SGOT (AST)', 'SGOT', 'Serum Glutamic Oxaloacetic Transaminase', 'Serum', 'Biochemistry', 'U/L', '0-40', 'Fasting preferred', 1),
('SGPT (ALT)', 'SGPT', 'Serum Glutamic Pyruvic Transaminase', 'Serum', 'Biochemistry', 'U/L', '0-41', 'Fasting preferred', 1),
('Total Bilirubin', 'TBIL', 'Total bilirubin level', 'Serum', 'Biochemistry', 'mg/dL', '0.3-1.2', 'Fasting preferred', 1),
('Direct Bilirubin', 'DBIL', 'Conjugated bilirubin', 'Serum', 'Biochemistry', 'mg/dL', '0-0.3', 'Fasting preferred', 1),
('Alkaline Phosphatase (ALP)', 'ALP', 'Alkaline phosphatase enzyme', 'Serum', 'Biochemistry', 'U/L', '30-120', 'Fasting preferred', 1),
('Total Protein', 'TP', 'Total protein in blood', 'Serum', 'Biochemistry', 'g/dL', '6.0-8.3', 'Fasting preferred', 1),
('Albumin', 'ALB', 'Serum albumin', 'Serum', 'Biochemistry', 'g/dL', '3.5-5.5', 'Fasting preferred', 1),
('Globulin', 'GLOB', 'Serum globulin', 'Serum', 'Biochemistry', 'g/dL', '2.0-3.5', 'Fasting preferred', 1),
('Kidney Function Test (KFT)', 'KFT', 'Complete kidney profile', 'Serum', 'Biochemistry', 'Multiple', 'See individual parameters', '8-12 hours fasting required', 1),
('Blood Urea', 'UREA', 'Blood urea nitrogen', 'Serum', 'Biochemistry', 'mg/dL', '15-40', 'Fasting preferred', 1),
('Serum Creatinine', 'CREAT', 'Creatinine level', 'Serum', 'Biochemistry', 'mg/dL', 'M: 0.7-1.3, F: 0.6-1.1', 'Fasting preferred', 1),
('Uric Acid', 'UA', 'Serum uric acid', 'Serum', 'Biochemistry', 'mg/dL', 'M: 3.5-7.2, F: 2.6-6.0', 'Fasting preferred', 1),
('eGFR (Estimated GFR)', 'EGFR', 'Estimated glomerular filtration rate', 'Calculated', 'Biochemistry', 'mL/min/1.73m²', '>60 (Normal)', 'Based on creatinine', 1),
('Lipid Profile', 'LIPID', 'Complete cholesterol profile', 'Serum', 'Biochemistry', 'Multiple', 'See individual parameters', '12-14 hours fasting required', 1),
('Total Cholesterol', 'CHOL', 'Total cholesterol level', 'Serum', 'Biochemistry', 'mg/dL', '<200 (Desirable), 200-239 (Borderline), >240 (High)', '12-14 hours fasting required', 1),
('HDL Cholesterol (Good)', 'HDL', 'High-density lipoprotein', 'Serum', 'Biochemistry', 'mg/dL', 'M: >40, F: >50 (Desirable)', '12-14 hours fasting required', 1),
('LDL Cholesterol (Bad)', 'LDL', 'Low-density lipoprotein', 'Serum', 'Biochemistry', 'mg/dL', '<100 (Optimal), 100-129 (Near optimal), >130 (High)', '12-14 hours fasting required', 1),
('VLDL Cholesterol', 'VLDL', 'Very low-density lipoprotein', 'Serum', 'Biochemistry', 'mg/dL', '5-40', '12-14 hours fasting required', 1),
('Triglycerides', 'TRIG', 'Serum triglycerides', 'Serum', 'Biochemistry', 'mg/dL', '<150 (Normal), 150-199 (Borderline), >200 (High)', '12-14 hours fasting required', 1),
('Thyroid Profile (T3, T4, TSH)', 'THYROID', 'Complete thyroid function test', 'Serum', 'Endocrinology', 'Multiple', 'See individual parameters', 'Fasting not required', 1),
('T3 (Triiodothyronine)', 'T3', 'Total T3 hormone', 'Serum', 'Endocrinology', 'ng/dL', '60-200', 'Fasting not required', 1),
('T4 (Thyroxine)', 'T4', 'Total T4 hormone', 'Serum', 'Endocrinology', 'µg/dL', '4.5-12.0', 'Fasting not required', 1),
('TSH (Thyroid Stimulating Hormone)', 'TSH', 'Thyroid stimulating hormone', 'Serum', 'Endocrinology', 'µIU/mL', '0.4-4.0', 'Fasting not required', 1),
('Urine Routine & Microscopy', 'URINE-R', 'Complete urine analysis', 'Urine', 'Urine Analysis', 'Multiple', 'See individual parameters', 'Early morning sample preferred', 1),
('Urine Culture & Sensitivity', 'URINE-CS', 'Bacterial culture and antibiotic sensitivity', 'Urine (Sterile)', 'Microbiology', 'Multiple', 'See report', 'Midstream clean catch sample', 1),
('Vitamin D (25-OH)', 'VIT-D', '25-hydroxyvitamin D', 'Serum', 'Biochemistry', 'ng/mL', '30-100 (Sufficient), 20-29 (Insufficient), <20 (Deficient)', 'Fasting not required', 1),
('Vitamin B12', 'VIT-B12', 'Serum vitamin B12', 'Serum', 'Biochemistry', 'pg/mL', '200-900', 'Fasting not required', 1),
('Troponin I (High Sensitivity)', 'TROP-I', 'Cardiac troponin I', 'Serum', 'Cardiology', 'ng/mL', '<0.04 (Normal)', 'Stat test for heart attack', 1),
('CK-MB (Creatine Kinase-MB)', 'CKMB', 'Cardiac enzyme', 'Serum', 'Cardiology', 'U/L', '0-25', 'Fasting not required', 1),
('C-Reactive Protein (CRP)', 'CRP', 'Inflammation marker', 'Serum', 'Biochemistry', 'mg/L', '<6 (Normal), 6-10 (Moderate), >10 (High)', 'Fasting not required', 1),
('Serum Electrolytes (Na, K, Cl)', 'ELECTRO', 'Sodium, Potassium, Chloride', 'Serum', 'Biochemistry', 'mmol/L', 'Na: 135-145, K: 3.5-5.0, Cl: 98-107', 'Fasting not required', 1),
('Serum Calcium', 'CA', 'Total calcium', 'Serum', 'Biochemistry', 'mg/dL', '8.5-10.5', 'Fasting not required', 1),
('Dengue NS1 Antigen', 'DENGUE-NS1', 'Early dengue detection', 'Serum', 'Serology', 'Qualitative', 'Negative', 'Day 1-5 of fever', 1),
('Dengue IgG/IgM', 'DENGUE-AB', 'Dengue antibodies', 'Serum', 'Serology', 'Qualitative', 'Negative', 'Day 5+ of fever', 1),
('Malaria (Antigen)', 'MALARIA', 'Malaria rapid test', 'Whole Blood', 'Serology', 'Qualitative', 'Negative', 'During fever', 1),
('Widal Test (Typhoid)', 'WIDAL', 'Typhoid fever antibodies', 'Serum', 'Serology', 'Titres', '<1:80 (Negative)', 'After 1 week of fever', 1),
('Blood Group & Rh Type', 'BGRH', 'ABO and Rh typing', 'Whole Blood (EDTA)', 'Serology', 'Type', 'A/B/AB/O, Rh+/-', 'Fasting not required', 1)
ON DUPLICATE KEY UPDATE test_name = VALUES(test_name);

-- =====================================================
-- 6. RECEIPT TEMPLATES (3 Designs)
-- =====================================================

INSERT INTO `receipt_templates` (`clinic_id`, `template_name`, `header_content`, `footer_content`, `is_default`) VALUES
(1, 'Standard Receipt Template', '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
    .receipt-header { text-align: center; border-bottom: 3px solid #0288d1; padding-bottom: 20px; margin-bottom: 20px; }
    .clinic-name { font-size: 28px; font-weight: bold; color: #d32f2f; margin-bottom: 10px; }
    .clinic-tagline { background-color: #0277bd; color: white; padding: 5px 20px; border-radius: 20px; font-size: 12px; display: inline-block; }
    .clinic-details { font-size: 12px; color: #666; margin-top: 10px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="receipt-header">
    <div class="clinic-name">🕉 CLINIC AND DIAGNOSTIC CENTER</div>
    <div class="clinic-tagline">THE ULTIMATE POWER TO HEAL</div>
    <div class="clinic-details">
      <strong>Dr. Gopal Jaju</strong> - M.B.B.S., MD Medicine<br>
      Physician, Intensivist, Echocardiographer<br>
      Reg.No.: 11-39360
    </div>
  </div>
</body>
</html>', '<div style="text-align: center; font-size: 11px; color: #333; padding: 15px; background-color: #fffde7; border-top: 2px solid #ddd;">
    <div style="font-weight: bold; margin-bottom: 5px;">
      Office No. 18, 2nd Floor, Tower A, City Vista, Fountain Road, Near Janak Baba Daraga, Kharadi, Pune - Nagar Road, Pune 411014, MH, INDIA
    </div>
    <div style="margin-top: 5px;">
      Email: omclinic.live@gmail.com | Time: Mon. to Sat. 9 am to 9 pm | For Appointments: 8530345858 | <strong>Sunday by appointment only</strong>
    </div>
  </div>', 1),
(1, 'Professional Receipt Template', '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    .receipt-header-pro {
      background: linear-gradient(90deg, #ffffff 60%, #e3f2fd 100%);
      border-bottom: 4px solid #0288d1;
      padding: 20px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-left { text-align: left; flex: 2; }
    .header-right {
      background-color: #0277bd;
      color: white;
      padding: 15px 25px;
      border-radius: 10px;
      text-align: right;
      flex: 1;
    }
    .clinic-name-pro { font-size: 26px; font-weight: 800; color: #d32f2f; margin-bottom: 5px; }
    .tagline-pro { color: #0277bd; font-size: 11px; font-weight: bold; letter-spacing: 1px; }
    .dr-name-pro { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
    .dr-details-pro { font-size: 10px; line-height: 1.4; }
  </style>
</head>
<body>
  <div class="receipt-header-pro">
    <div class="header-left">
      <div style="display: flex; align-items: center; gap: 15px;">
        <span style="font-size: 50px;">🕉</span>
        <div>
          <div class="clinic-name-pro">CLINIC AND DIAGNOSTIC CENTER</div>
          <div class="tagline-pro">❤️ THE HEALING HANDS - THE ULTIMATE POWER TO HEAL</div>
        </div>
      </div>
    </div>
    <div class="header-right">
      <div class="dr-name-pro">Dr. Gopal Jaju</div>
      <div class="dr-details-pro">
        M.B.B.S., MD Medicine<br>
        Physician, Intensivist<br>
        Echocardiographer<br>
        <strong>Reg.No.:</strong> 11-39360
      </div>
    </div>
  </div>
</body>
</html>', '<div style="background-color: #fffde7; padding: 12px; text-align: center; font-size: 11px; border-top: 2px solid #0288d1;">
    <div style="font-weight: bold; color: #333; margin-bottom: 5px;">
      📍 Office No. 18, 2nd Floor, Tower A, City Vista, Fountain Road, Near Janak Baba Daraga, Kharadi, Pune 411014, MH, INDIA
    </div>
    <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap; margin-top: 5px; color: #555;">
      <span>✉️ omclinic.live@gmail.com</span>
      <span>|</span>
      <span>🕐 Mon. to Sat. 9 am to 9 pm</span>
      <span>|</span>
      <span>📞 8530345858</span>
      <span>|</span>
      <span><strong>Sunday by appointment only</strong></span>
    </div>
  </div>', 0),
(1, 'Simple Receipt Template', '<div style="text-align: center; padding: 15px; border-bottom: 2px solid #333;">
    <h1 style="margin: 0; font-size: 24px; color: #d32f2f;">🕉 CLINIC AND DIAGNOSTIC CENTER</h1>
    <p style="margin: 5px 0; font-size: 12px; color: #666;"><strong>Dr. Gopal Jaju</strong> | M.B.B.S., MD Medicine | Reg.No.: 11-39360</p>
  </div>', '<div style="text-align: center; padding: 10px; border-top: 1px solid #ccc; font-size: 10px; color: #666;">
    Office No. 18, 2nd Floor, Tower A, City Vista, Kharadi, Pune 411014 | 📞 8530345858 | ✉️ omclinic.live@gmail.com
  </div>', 0)
ON DUPLICATE KEY UPDATE header_content = VALUES(header_content);

-- =====================================================
-- Diagnosis Templates Table
-- =====================================================
CREATE TABLE IF NOT EXISTS `diagnosis_templates` (
  `id` INT AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `diagnoses` JSON NOT NULL,
  `doctor_id` INT DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_doctor_id` (`doctor_id`),
  KEY `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample diagnosis templates
INSERT INTO `diagnosis_templates` (`name`, `category`, `description`, `diagnoses`) VALUES
('Hypertension Diagnosis', 'Cardiovascular', 'Common hypertension related diagnoses', '["Essential Hypertension", "Stage 1 Hypertension", "Hypertensive Heart Disease"]'),
('Diabetes Diagnosis', 'Endocrine', 'Diabetes related diagnoses', '["Type 2 Diabetes Mellitus", "Diabetic Neuropathy", "Uncontrolled Diabetes"]'),
('Respiratory Diagnosis', 'Respiratory', 'Common respiratory diagnoses', '["Upper Respiratory Tract Infection", "Acute Bronchitis", "Allergic Rhinitis"]'),
('Gastro Diagnosis', 'Gastrointestinal', 'GI related diagnoses', '["Acute Gastritis", "GERD", "Dyspepsia", "Gastroenteritis"]');

-- =====================================================
-- Medications Templates Table
-- =====================================================
CREATE TABLE IF NOT EXISTS `medications_templates` (
  `id` INT AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `medications` JSON NOT NULL,
  `doctor_id` INT DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_doctor_id` (`doctor_id`),
  KEY `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample medications templates
INSERT INTO `medications_templates` (`name`, `category`, `description`, `medications`) VALUES
('Hypertension Medications', 'Cardiovascular', 'Standard hypertension treatment', '[
  {"name": "Amlodipine 5mg", "brand": "Amlong", "composition": "Amlodipine", "dosage": "5mg", "frequency": "1-0-0", "timing": "After Meal", "duration": "30 days", "qty": 30},
  {"name": "Telmisartan 40mg", "brand": "Telma", "composition": "Telmisartan", "dosage": "40mg", "frequency": "1-0-0", "timing": "After Meal", "duration": "30 days", "qty": 30}
]'),
('Diabetes Medications', 'Endocrine', 'Standard diabetes treatment', '[
  {"name": "Metformin 500mg", "brand": "Glycomet", "composition": "Metformin", "dosage": "500mg", "frequency": "1-0-1", "timing": "After Meal", "duration": "30 days", "qty": 60},
  {"name": "Glimepiride 1mg", "brand": "Amaryl", "composition": "Glimepiride", "dosage": "1mg", "frequency": "1-0-0", "timing": "Before Breakfast", "duration": "30 days", "qty": 30}
]'),
('Common Cold Treatment', 'Respiratory', 'Standard cold and flu medications', '[
  {"name": "Paracetamol 500mg", "brand": "Crocin", "composition": "Paracetamol", "dosage": "500mg", "frequency": "1-1-1", "timing": "After Meal", "duration": "3 days", "qty": 9},
  {"name": "Cetirizine 10mg", "brand": "Cetriz", "composition": "Cetirizine", "dosage": "10mg", "frequency": "0-0-1", "timing": "After Meal", "duration": "5 days", "qty": 5}
]'),
('Gastritis Treatment', 'Gastrointestinal', 'Standard gastritis medications', '[
  {"name": "Pantoprazole 40mg", "brand": "Pan", "composition": "Pantoprazole", "dosage": "40mg", "frequency": "1-0-0", "timing": "Before Breakfast", "duration": "14 days", "qty": 14},
  {"name": "Domperidone 10mg", "brand": "Domstal", "composition": "Domperidone", "dosage": "10mg", "frequency": "1-0-1", "timing": "Before Meal", "duration": "7 days", "qty": 14}
]');

-- =====================================================
-- Database Optimization - Indexes
-- =====================================================

-- APPOINTMENTS TABLE INDEXES
-- Check if index exists before creating
DROP INDEX IF EXISTS idx_appointments_doctor ON appointments;
DROP INDEX IF EXISTS idx_appointments_patient ON appointments;
DROP INDEX IF EXISTS idx_appointments_date ON appointments;
DROP INDEX IF EXISTS idx_appointments_status ON appointments;
DROP INDEX IF EXISTS idx_appointments_clinic ON appointments;

-- Add indexes for faster queries
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_clinic ON appointments(clinic_id);

-- Composite index for common queries
CREATE INDEX idx_appointments_doctor_date ON appointments(doctor_id, appointment_date);
CREATE INDEX idx_appointments_status_date ON appointments(status, appointment_date);

-- PRESCRIPTIONS TABLE INDEXES
DROP INDEX IF EXISTS idx_prescriptions_patient ON prescriptions;
DROP INDEX IF EXISTS idx_prescriptions_doctor ON prescriptions;
DROP INDEX IF EXISTS idx_prescriptions_date ON prescriptions;
DROP INDEX IF EXISTS idx_prescriptions_appointment ON prescriptions;

CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_doctor ON prescriptions(doctor_id);
CREATE INDEX idx_prescriptions_date ON prescriptions(created_at);
CREATE INDEX idx_prescriptions_appointment ON prescriptions(appointment_id);

-- BILLS TABLE INDEXES
DROP INDEX IF EXISTS idx_bills_patient ON bills;
DROP INDEX IF EXISTS idx_bills_status ON bills;
DROP INDEX IF EXISTS idx_bills_date ON bills;
DROP INDEX IF EXISTS idx_bills_clinic ON bills;

CREATE INDEX idx_bills_patient ON bills(patient_id);
CREATE INDEX idx_bills_status ON bills(payment_status);
CREATE INDEX idx_bills_date ON bills(created_at);
CREATE INDEX idx_bills_clinic ON bills(clinic_id);

-- Composite index for financial reports
CREATE INDEX idx_bills_status_date ON bills(payment_status, created_at);
CREATE INDEX idx_bills_clinic_date ON bills(clinic_id, created_at);

-- PATIENTS TABLE INDEXES
DROP INDEX IF EXISTS idx_patients_phone ON patients;
DROP INDEX IF EXISTS idx_patients_email ON patients;
DROP INDEX IF EXISTS idx_patients_name ON patients;
DROP INDEX IF EXISTS idx_patients_clinic ON patients;

CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_patients_email ON patients(email);
CREATE INDEX idx_patients_name ON patients(name);
CREATE INDEX idx_patients_clinic ON patients(clinic_id);

-- Full-text search index for patient search
ALTER TABLE patients ADD FULLTEXT idx_patients_search (name, phone, email);

-- USERS TABLE INDEXES
DROP INDEX IF EXISTS idx_users_email ON users;
DROP INDEX IF EXISTS idx_users_role ON users;
DROP INDEX IF EXISTS idx_users_active ON users;

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- Composite index for authentication
CREATE INDEX idx_users_email_active ON users(email, is_active);

-- DOCTORS TABLE INDEXES
DROP INDEX IF EXISTS idx_doctors_user ON doctors;
DROP INDEX IF EXISTS idx_doctors_clinic ON doctors;
DROP INDEX IF EXISTS idx_doctors_status ON doctors;

CREATE INDEX idx_doctors_user ON doctors(user_id);
CREATE INDEX idx_doctors_clinic ON doctors(clinic_id);
CREATE INDEX idx_doctors_status ON doctors(status);

-- STAFF TABLE INDEXES
DROP INDEX IF EXISTS idx_staff_user ON staff;
DROP INDEX IF EXISTS idx_staff_clinic ON staff;
DROP INDEX IF EXISTS idx_staff_doctor ON staff;

CREATE INDEX idx_staff_user ON staff(user_id);
CREATE INDEX idx_staff_clinic ON staff(clinic_id);
CREATE INDEX idx_staff_doctor ON staff(doctor_id);

-- CLINICS TABLE INDEXES
DROP INDEX IF EXISTS idx_clinics_active ON clinics;
DROP INDEX IF EXISTS idx_clinics_name ON clinics;

CREATE INDEX idx_clinics_active ON clinics(is_active);
CREATE INDEX idx_clinics_name ON clinics(name);

-- LAB TESTS TABLE INDEXES
DROP INDEX IF EXISTS idx_lab_patient ON lab_tests;
DROP INDEX IF EXISTS idx_lab_appointment ON lab_tests;
DROP INDEX IF EXISTS idx_lab_date ON lab_tests;

CREATE INDEX idx_lab_patient ON lab_tests(patient_id);
CREATE INDEX idx_lab_appointment ON lab_tests(appointment_id);
CREATE INDEX idx_lab_date ON lab_tests(test_date);

-- AUDIT LOGS TABLE INDEXES
DROP INDEX IF EXISTS idx_audit_user ON audit_logs;
DROP INDEX IF EXISTS idx_audit_action ON audit_logs;
DROP INDEX IF EXISTS idx_audit_date ON audit_logs;
DROP INDEX IF EXISTS idx_audit_entity ON audit_logs;

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_date ON audit_logs(created_at);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- NOTIFICATIONS TABLE INDEXES
DROP INDEX IF EXISTS idx_notif_user ON notifications;
DROP INDEX IF EXISTS idx_notif_read ON notifications;
DROP INDEX IF EXISTS idx_notif_date ON notifications;

CREATE INDEX idx_notif_user ON notifications(user_id);
CREATE INDEX idx_notif_read ON notifications(is_read);
CREATE INDEX idx_notif_date ON notifications(created_at);

-- Composite index for unread notifications
CREATE INDEX idx_notif_user_unread ON notifications(user_id, is_read);

-- =====================================================
-- Finalize
-- =====================================================
ANALYZE TABLE users, clinics, doctors, patients, appointments, prescriptions, diagnosis_templates, medications_templates;

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;