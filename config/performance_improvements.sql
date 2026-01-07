-- =====================================================
-- PERFORMANCE IMPROVEMENTS SQL
-- Database Indexes & Optimizations
-- Run this file to improve query performance
-- =====================================================

USE patient_management;

-- =====================================================
-- 1. PATIENT TABLE INDEXES
-- =====================================================

-- Speed up patient name searches
CREATE INDEX IF NOT EXISTS idx_patient_name ON patients(name);

-- Speed up phone number searches
CREATE INDEX IF NOT EXISTS idx_patient_phone ON patients(phone);

-- Speed up email searches
CREATE INDEX IF NOT EXISTS idx_patient_email ON patients(email);

-- Composite index for clinic-specific queries with sorting
CREATE INDEX IF NOT EXISTS idx_patient_clinic_created ON patients(clinic_id, created_at DESC);

-- Full-text search index for better performance on name and email
ALTER TABLE patients ADD FULLTEXT INDEX IF NOT EXISTS idx_fulltext_patient_search (name, email);

-- =====================================================
-- 2. APPOINTMENT TABLE INDEXES
-- =====================================================

-- Speed up appointment date queries
CREATE INDEX IF NOT EXISTS idx_appointment_date ON appointments(appointment_date);

-- Speed up status filtering
CREATE INDEX IF NOT EXISTS idx_appointment_status ON appointments(status);

-- Composite index for doctor's appointments by date
CREATE INDEX IF NOT EXISTS idx_appointment_doctor_date ON appointments(doctor_id, appointment_date DESC);

-- Composite index for patient's appointments
CREATE INDEX IF NOT EXISTS idx_appointment_patient_date ON appointments(patient_id, appointment_date DESC);

-- Speed up today's queue queries
CREATE INDEX IF NOT EXISTS idx_appointment_checkin ON appointments(status, checked_in_at);

-- =====================================================
-- 3. PATIENT ADMISSIONS INDEXES
-- =====================================================

-- Speed up admission number lookups
CREATE INDEX IF NOT EXISTS idx_admission_number ON patient_admissions(admission_number);

-- Speed up status filtering
CREATE INDEX IF NOT EXISTS idx_admission_status ON patient_admissions(status);

-- Composite index for admission date filtering
CREATE INDEX IF NOT EXISTS idx_admission_date_status ON patient_admissions(admission_date DESC, status);

-- Speed up doctor's admissions
CREATE INDEX IF NOT EXISTS idx_admission_doctor ON patient_admissions(doctor_id, status);

-- Speed up room lookups
CREATE INDEX IF NOT EXISTS idx_admission_room ON patient_admissions(room_id, status);

-- =====================================================
-- 4. IPD SERVICE TABLES INDEXES
-- =====================================================

-- Speed up daily services by admission
CREATE INDEX IF NOT EXISTS idx_ipd_services_admission ON ipd_daily_services(admission_id, service_date DESC);

-- Speed up medicines by admission
CREATE INDEX IF NOT EXISTS idx_ipd_medicines_admission ON ipd_medicines_consumables(admission_id, administered_date DESC);

-- Speed up room charges by admission
CREATE INDEX IF NOT EXISTS idx_ipd_room_charges_admission ON ipd_room_charges(admission_id);

-- =====================================================
-- 5. BILLING TABLE INDEXES
-- =====================================================

-- Speed up bill patient lookups
CREATE INDEX IF NOT EXISTS idx_bill_patient ON bills(patient_id, created_at DESC);

-- Speed up payment status filtering
CREATE INDEX IF NOT EXISTS idx_bill_payment_status ON bills(payment_status);

-- Speed up bill date range queries
CREATE INDEX IF NOT EXISTS idx_bill_date_status ON bills(created_at DESC, payment_status);

-- Speed up appointment bill lookups
CREATE INDEX IF NOT EXISTS idx_bill_appointment ON bills(appointment_id);

-- =====================================================
-- 6. PRESCRIPTION TABLE INDEXES
-- =====================================================

-- Speed up patient prescription history
CREATE INDEX IF NOT EXISTS idx_prescription_patient ON prescriptions(patient_id, created_at DESC);

-- Speed up doctor's prescriptions
CREATE INDEX IF NOT EXISTS idx_prescription_doctor ON prescriptions(doctor_id, created_at DESC);

-- Speed up prescription items lookup
CREATE INDEX IF NOT EXISTS idx_prescription_items ON prescription_items(prescription_id);

-- =====================================================
-- 7. LAB INVESTIGATIONS INDEXES
-- =====================================================

-- Speed up patient lab history
CREATE INDEX IF NOT EXISTS idx_lab_patient ON lab_investigations(patient_id, investigation_date DESC);

-- Speed up lab status filtering
CREATE INDEX IF NOT EXISTS idx_lab_status ON lab_investigations(status, investigation_date DESC);

-- =====================================================
-- 8. AUDIT LOGS INDEXES
-- =====================================================

-- Speed up audit log date queries
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_logs(created_at DESC);

-- Speed up user action filtering
CREATE INDEX IF NOT EXISTS idx_audit_user_action ON audit_logs(user_id, action, created_at DESC);

-- Speed up entity lookups
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity, entity_id, created_at DESC);

-- =====================================================
-- 9. ROOMS TABLE INDEXES
-- =====================================================

-- Speed up room status filtering
CREATE INDEX IF NOT EXISTS idx_room_status ON rooms(status);

-- Speed up room type filtering
CREATE INDEX IF NOT EXISTS idx_room_type ON rooms(room_type_id, status);

-- Speed up current patient lookup
CREATE INDEX IF NOT EXISTS idx_room_patient ON rooms(current_patient_id);

-- =====================================================
-- 10. USERS TABLE INDEXES
-- =====================================================

-- Speed up user email lookups (for login)
CREATE INDEX IF NOT EXISTS idx_user_email ON users(email);

-- Speed up role filtering
CREATE INDEX IF NOT EXISTS idx_user_role ON users(role, is_active);

-- Speed up clinic user lookups
CREATE INDEX IF NOT EXISTS idx_user_clinic ON users(clinic_id, role);

-- =====================================================
-- 11. DOCTORS TABLE INDEXES
-- =====================================================

-- Speed up doctor specialization filtering
CREATE INDEX IF NOT EXISTS idx_doctor_specialization ON doctors(specialization);

-- Speed up doctor status filtering
CREATE INDEX IF NOT EXISTS idx_doctor_status ON doctors(is_active);

-- =====================================================
-- 12. MEDICINE & TEMPLATES INDEXES
-- =====================================================

-- Speed up medicine name searches
CREATE INDEX IF NOT EXISTS idx_medicine_name ON medicines(name);

-- Full-text search for medicine names
ALTER TABLE medicines ADD FULLTEXT INDEX IF NOT EXISTS idx_fulltext_medicine_name (name);

-- Speed up template lookups
CREATE INDEX IF NOT EXISTS idx_prescription_template_doctor ON prescription_templates(doctor_id);

-- =====================================================
-- OPTIMIZATION QUERIES TO TEST PERFORMANCE
-- =====================================================

-- Test 1: Patient Search (should use idx_fulltext_patient_search)
-- SELECT * FROM patients WHERE MATCH(name, email) AGAINST('John' IN BOOLEAN MODE);

-- Test 2: Today's Queue (should use idx_appointment_date and idx_appointment_status)
-- SELECT * FROM appointments
-- WHERE appointment_date = CURDATE() AND status = 'checked-in'
-- ORDER BY checked_in_at;

-- Test 3: Active Admissions (should use idx_admission_status)
-- SELECT * FROM patient_admissions WHERE status = 'admitted' ORDER BY admission_date DESC;

-- Test 4: Patient Prescription History (should use idx_prescription_patient)
-- SELECT * FROM prescriptions WHERE patient_id = 1 ORDER BY created_at DESC LIMIT 10;

-- Test 5: Audit Logs by Date (should use idx_audit_date)
-- SELECT * FROM audit_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) ORDER BY created_at DESC;

-- =====================================================
-- ANALYZE TABLES AFTER INDEX CREATION
-- =====================================================

ANALYZE TABLE patients;
ANALYZE TABLE appointments;
ANALYZE TABLE patient_admissions;
ANALYZE TABLE ipd_daily_services;
ANALYZE TABLE ipd_medicines_consumables;
ANALYZE TABLE bills;
ANALYZE TABLE prescriptions;
ANALYZE TABLE lab_investigations;
ANALYZE TABLE audit_logs;
ANALYZE TABLE rooms;
ANALYZE TABLE users;
ANALYZE TABLE doctors;
ANALYZE TABLE medicines;

-- =====================================================
-- VERIFICATION: Check Created Indexes
-- =====================================================

-- Run this to see all indexes:
-- SHOW INDEX FROM patients;
-- SHOW INDEX FROM appointments;
-- SHOW INDEX FROM patient_admissions;

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. These indexes will improve SELECT query performance
-- 2. They may slightly slow down INSERT/UPDATE/DELETE operations
-- 3. Full-text indexes require InnoDB engine (MySQL 5.6+)
-- 4. Monitor query performance using EXPLAIN before and after
-- 5. Consider removing unused indexes if they don't improve performance
-- =====================================================

SELECT 'Performance indexes created successfully!' as Status;
