-- =====================================================
-- Admin & Doctor Credentials Setup Script
-- Healthcare Management System
-- =====================================================

USE `patient_management`;

-- =====================================================
-- 1️⃣ ADMIN USER (NO clinic_id - Admin manages all clinics)
-- Email    : admin@clinic.com
-- Password : admin123
-- Role     : admin
-- =====================================================

INSERT INTO `users` (
  `email`,
  `password`,
  `role`,
  `name`,
  `phone`,
  `clinic_id`,
  `is_active`,
  `created_at`,
  `updated_at`
) VALUES (
  'admin@clinic.com',
  '$2b$10$lcvSg6dO5u7UbBYmUYZRUOlolUxoImeEEhIGaKxvQHArK15B2ORmC',  -- Password: admin123
  'admin',
  'System Administrator',
  '+91-8530345858',
  NULL,  -- Admin has no clinic_id
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  `password`   = VALUES(`password`),
  `role`       = 'admin',
  `name`       = VALUES(`name`),
  `phone`      = VALUES(`phone`),
  `clinic_id`  = NULL,  -- Ensure admin has no clinic_id
  `is_active`  = 1,
  `updated_at` = NOW();

