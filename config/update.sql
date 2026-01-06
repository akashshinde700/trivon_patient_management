USE `patient_management`;

-- =========================================================
-- 🛡️ STEP 0: SAFETY SETTINGS
-- =========================================================
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_SAFE_UPDATES = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- =========================================================
-- STEP 0.1: Fix imported_table collation
-- =========================================================
ALTER TABLE imported_table
CONVERT TO CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

-- =========================================================
-- STEP 1: Clinics ✅
-- =========================================================
INSERT IGNORE INTO clinics (name, is_active, created_at)
SELECT DISTINCT
    TRIM(i.`Clinic Name`) AS name,
    1 AS is_active,
    NOW() AS created_at
FROM imported_table i
WHERE i.`Clinic Name` IS NOT NULL
  AND TRIM(i.`Clinic Name`) <> ''
  AND NOT EXISTS (
        SELECT 1 FROM clinics c
        WHERE c.name = TRIM(i.`Clinic Name`)
    );

-- =========================================================
-- STEP 2: Users (Doctors) ✅
-- =========================================================
INSERT IGNORE INTO users (email, `password`, `role`, `name`, phone, is_active, clinic_id, created_at)
SELECT
    CONCAT('doc', c.id, '_', LEFT(MD5(t.doctor_name), 8), '@import.local') AS email,
    '__imported_doctor__' AS `password`,
    'doctor' AS `role`,
    t.doctor_name AS `name`,
    NULL AS phone,
    1 AS is_active,
    c.id AS clinic_id,
    NOW() AS created_at
FROM (
    SELECT DISTINCT
        TRIM(`Doctors_Name`) AS doctor_name,
        TRIM(MIN(`Clinic Name`)) AS clinic_name
    FROM imported_table
    WHERE `Doctors_Name` IS NOT NULL AND TRIM(`Doctors_Name`) <> ''
    GROUP BY TRIM(`Doctors_Name`)
) AS t
JOIN clinics c ON c.name = t.clinic_name
LEFT JOIN users u ON u.name = t.doctor_name AND u.role = 'doctor'
WHERE u.id IS NULL;

-- =========================================================
-- STEP 3: Doctors ✅
-- =========================================================
INSERT IGNORE INTO doctors (user_id, clinic_id, specialization, status, created_at)
SELECT u.id AS user_id, u.clinic_id, 'General' AS specialization, 'active' AS status, NOW() AS created_at
FROM users u
LEFT JOIN doctors d ON d.user_id = u.id
WHERE u.role = 'doctor' AND d.id IS NULL;

-- =========================================================
-- STEP 4: Patients ✅
-- =========================================================
INSERT IGNORE INTO patients (patient_id, name, phone, dob, gender, created_at)
SELECT
    TRIM(t.Patient_UHID) AS patient_id,
    MAX(TRIM(t.Patient_Name)) AS name,
    MAX(CAST(t.Patient_Phone AS CHAR)) AS phone,
    MAX(STR_TO_DATE(t.Patient_DOB, '%Y-%m-%d')) AS dob,
    MAX(CASE WHEN UPPER(LEFT(TRIM(t.Patient_Gender), 1)) = 'M' THEN 'M'
             WHEN UPPER(LEFT(TRIM(t.Patient_Gender), 1)) = 'F' THEN 'F'
             ELSE 'Other' END) AS gender,
    NOW() AS created_at
FROM imported_table t
LEFT JOIN patients p ON p.patient_id = TRIM(t.Patient_UHID)
WHERE t.Patient_UHID IS NOT NULL AND TRIM(t.Patient_UHID) <> '' AND p.id IS NULL
GROUP BY TRIM(t.Patient_UHID);

-- =========================================================
-- STEP 5: Patient Tags ✅
-- =========================================================
INSERT IGNORE INTO patient_tags (patient_id, tag_name, tag_category, color_code, created_at)
SELECT DISTINCT p.id AS patient_id, TRIM(i.Patient_Tag) AS tag_name, NULL, NULL, NOW()
FROM imported_table i
JOIN patients p ON p.patient_id = TRIM(i.Patient_UHID)
LEFT JOIN patient_tags pt ON pt.patient_id = p.id AND pt.tag_name = TRIM(i.Patient_Tag)
WHERE i.Patient_Tag IS NOT NULL AND TRIM(i.Patient_Tag) <> '' AND pt.id IS NULL;

-- =========================================================
-- STEP 6: Appointments ✅
-- =========================================================
INSERT IGNORE INTO appointments (
    patient_id, doctor_id, clinic_id, appointment_date, appointment_time,
    status, reason_for_visit, notes, created_at
)
SELECT
    p.id AS patient_id, d.id AS doctor_id, c.id AS clinic_id,
    STR_TO_DATE(i.`date`, '%Y-%m-%d') AS appointment_date,
    COALESCE(TIME(STR_TO_DATE(i.Prescription_Start_Time, '%Y-%m-%d %H:%i')), '09:00:00') AS appointment_time,
    CASE WHEN i.Appt_Deleted IS NULL OR TRIM(i.Appt_Deleted) = '' 
              OR i.Appt_Deleted IN ('0','false','False','no','No','NO') 
         THEN 'completed' ELSE 'cancelled' END AS status,
    i.Referred_By AS reason_for_visit,
    i.Follow_Up_Notes AS notes,
    NOW() AS created_at
FROM (
    SELECT DISTINCT TRIM(Patient_UHID) AS Patient_UHID, TRIM(Doctors_Name) AS Doctors_Name,
           TRIM(`Clinic Name`) AS Clinic_Name, `date`, Appt_Deleted, Referred_By, Follow_Up_Notes, Prescription_Start_Time
    FROM imported_table
    WHERE Patient_UHID IS NOT NULL AND TRIM(Patient_UHID) <> ''
      AND Doctors_Name IS NOT NULL AND TRIM(Doctors_Name) <> ''
      AND `date` IS NOT NULL AND TRIM(`date`) <> ''
) AS i
JOIN patients p ON p.patient_id = i.Patient_UHID
JOIN users u ON u.name = i.Doctors_Name AND u.role = 'doctor'
JOIN doctors d ON d.user_id = u.id
LEFT JOIN clinics c ON c.name = i.Clinic_Name
LEFT JOIN appointments a ON a.patient_id = p.id AND a.doctor_id = d.id
  AND ((a.clinic_id IS NULL AND c.id IS NULL) OR (a.clinic_id = c.id))
  AND a.appointment_date = STR_TO_DATE(i.`date`, '%Y-%m-%d')
WHERE a.id IS NULL;

-- =========================================================
-- STEP 7: Appointment Followups ✅
-- =========================================================
INSERT IGNORE INTO appointment_followups (appointment_id, followup_date, reason, status, created_at)
SELECT a.id AS appointment_id, STR_TO_DATE(i.Follow_Up_Date, '%Y-%m-%d') AS followup_date,
       i.Follow_Up_Notes AS reason, 'pending' AS status, NOW() AS created_at
FROM imported_table i
JOIN patients p ON p.patient_id = TRIM(i.Patient_UHID)
JOIN users u ON u.name = TRIM(i.Doctors_Name) AND u.role = 'doctor'
JOIN doctors d ON d.user_id = u.id
LEFT JOIN clinics c ON c.name = TRIM(i.`Clinic Name`)
JOIN appointments a ON a.patient_id = p.id AND a.doctor_id = d.id
  AND ((a.clinic_id IS NULL AND c.id IS NULL) OR (a.clinic_id = c.id))
  AND a.appointment_date = STR_TO_DATE(i.`date`, '%Y-%m-%d')
LEFT JOIN appointment_followups af ON af.appointment_id = a.id AND af.followup_date = STR_TO_DATE(i.Follow_Up_Date, '%Y-%m-%d')
WHERE i.Follow_Up_Date IS NOT NULL AND TRIM(i.Follow_Up_Date) <> '' AND af.id IS NULL;

-- =========================================================
-- STEP 8: Medicines ✅ (CORRECTED Type Filter)
-- =========================================================
INSERT IGNORE INTO medicines (name, generic_name, dosage_form, strength, created_at)
SELECT DISTINCT
    TRIM(i.Name) AS name,
    NULLIF(TRIM(i.Generic_Name), '') AS generic_name,
    NULLIF(TRIM(i.Dosage_Form), '') AS dosage_form,
    NULLIF(CONCAT(TRIM(COALESCE(i.Custom_Dose, '')), ' ', TRIM(COALESCE(i.Dose_Unit, ''))), ' ') AS strength,
    NOW() AS created_at
FROM imported_table i
LEFT JOIN medicines m ON m.name = TRIM(i.Name)
WHERE i.Name IS NOT NULL AND TRIM(i.Name) <> '' AND m.id IS NULL
  AND (i.Type IS NULL OR LOWER(TRIM(i.Type)) NOT IN ('labtests', 'labvitals'));

-- =========================================================
-- STEP 9: Prescriptions ✅
-- =========================================================
INSERT IGNORE INTO prescriptions (
    patient_id, doctor_id, appointment_id, medication_name, dosage,
    frequency, duration, instructions, prescribed_date, status, created_at
)
SELECT DISTINCT
    a.patient_id, a.doctor_id, a.id AS appointment_id,
    NULL, NULL, NULL, NULL, NULL,
    a.appointment_date AS prescribed_date, 'completed' AS status, NOW() AS created_at
FROM imported_table i
JOIN patients p ON p.patient_id = TRIM(i.Patient_UHID)
JOIN users u ON u.name = TRIM(i.Doctors_Name) AND u.role = 'doctor'
JOIN doctors d ON d.user_id = u.id
LEFT JOIN clinics c ON c.name = TRIM(i.`Clinic Name`)
JOIN appointments a ON a.patient_id = p.id AND a.doctor_id = d.id
  AND ((a.clinic_id IS NULL AND c.id IS NULL) OR (a.clinic_id = c.id))
  AND a.appointment_date = STR_TO_DATE(i.`date`, '%Y-%m-%d')
LEFT JOIN prescriptions pr ON pr.patient_id = a.patient_id AND pr.doctor_id = a.doctor_id AND pr.appointment_id = a.id
WHERE i.Name IS NOT NULL AND TRIM(i.Name) <> ''
  AND (i.Type IS NULL OR LOWER(TRIM(i.Type)) NOT IN ('labtests', 'labvitals'))
  AND pr.id IS NULL;

-- =========================================================
-- STEP 10: Prescription Items ✅
-- =========================================================
INSERT IGNORE INTO prescription_items (prescription_id, medicine_id, dosage, frequency, duration, notes)
SELECT
    pr.id AS prescription_id, m.id AS medicine_id,
    NULLIF(TRIM(i.Custom_Dose), '') AS dosage,
    NULLIF(TRIM(i.Custom_Frequency), '') AS frequency,
    NULLIF(TRIM(i.Custom_Duration), '') AS duration,
    NULLIF(TRIM(i.Medication_Instruction), '') AS notes
FROM imported_table i
JOIN patients p ON p.patient_id = TRIM(i.Patient_UHID)
JOIN users u ON u.name = TRIM(i.Doctors_Name) AND u.role = 'doctor'
JOIN doctors d ON d.user_id = u.id
LEFT JOIN clinics c ON c.name = TRIM(i.`Clinic Name`)
JOIN appointments a ON a.patient_id = p.id AND a.doctor_id = d.id
  AND ((a.clinic_id IS NULL AND c.id IS NULL) OR (a.clinic_id = c.id))
  AND a.appointment_date = STR_TO_DATE(i.`date`, '%Y-%m-%d')
JOIN prescriptions pr ON pr.patient_id = a.patient_id AND pr.doctor_id = a.doctor_id AND pr.appointment_id = a.id
LEFT JOIN medicines m ON m.name = TRIM(i.Name)
LEFT JOIN prescription_items pi_existing ON pi_existing.prescription_id = pr.id AND pi_existing.medicine_id = m.id
WHERE i.Name IS NOT NULL AND TRIM(i.Name) <> ''
  AND (i.Type IS NULL OR LOWER(TRIM(i.Type)) NOT IN ('labtests', 'labvitals'))
  AND pi_existing.id IS NULL;

-- =========================================================
-- STEP 11: Bills ✅
-- =========================================================
INSERT IGNORE INTO bills (
    patient_id, appointment_id, clinic_id, amount, tax, discount,
    total_amount, payment_method, payment_status, bill_date, notes, created_at
)
SELECT
    a.patient_id, a.id AS appointment_id, a.clinic_id,
    MAX(i.Billed_Amount) AS amount, 0.00 AS tax, 0.00 AS discount,
    MAX(i.Billed_Amount) AS total_amount, 'cash' AS payment_method,
    'completed' AS payment_status, a.appointment_date AS bill_date, NULL AS notes, NOW() AS created_at
FROM imported_table i
JOIN patients p ON p.patient_id = TRIM(i.Patient_UHID)
JOIN users u ON u.name = TRIM(i.Doctors_Name) AND u.role = 'doctor'
JOIN doctors d ON d.user_id = u.id
LEFT JOIN clinics c ON c.name = TRIM(i.`Clinic Name`)
JOIN appointments a ON a.patient_id = p.id AND a.doctor_id = d.id
  AND ((a.clinic_id IS NULL AND c.id IS NULL) OR (a.clinic_id = c.id))
  AND a.appointment_date = STR_TO_DATE(i.`date`, '%Y-%m-%d')
LEFT JOIN bills b ON b.patient_id = a.patient_id AND b.appointment_id = a.id
WHERE i.Billed_Amount IS NOT NULL AND i.Billed_Amount > 0 AND b.id IS NULL
GROUP BY a.patient_id, a.id, a.clinic_id, a.appointment_date;

-- =========================================================
-- STEP 12: Lab Investigations ✅ (CORRECTED Type Filter)
-- =========================================================
INSERT IGNORE INTO lab_investigations (
    patient_id, doctor_id, appointment_id, test_name, test_type,
    ordered_date, result_date, status, result_value, result_unit,
    interpretation, notes, created_at
)
SELECT
    a.patient_id, a.doctor_id, a.id AS appointment_id,
    TRIM(i.Name) AS test_name, TRIM(i.Type) AS test_type,
    a.appointment_date AS ordered_date,
    COALESCE(STR_TO_DATE(i.Reading_Date, '%Y-%m-%d'), a.appointment_date) AS result_date,
    'completed' AS status,
    TRIM(i.Value) AS result_value, TRIM(i.Unit) AS result_unit,
    TRIM(i.Interpretation_Value) AS interpretation, TRIM(i.Remarks) AS notes, NOW() AS created_at
FROM imported_table i
JOIN patients p ON p.patient_id = TRIM(i.Patient_UHID)
JOIN users u ON u.name = TRIM(i.Doctors_Name) AND u.role = 'doctor'
JOIN doctors d ON d.user_id = u.id
LEFT JOIN clinics c ON c.name = TRIM(i.`Clinic Name`)
JOIN appointments a ON a.patient_id = p.id AND a.doctor_id = d.id
  AND ((a.clinic_id IS NULL AND c.id IS NULL) OR (a.clinic_id = c.id))
  AND a.appointment_date = STR_TO_DATE(i.`date`, '%Y-%m-%d')
LEFT JOIN lab_investigations li ON li.patient_id = p.id AND li.appointment_id = a.id AND li.test_name = TRIM(i.Name)
WHERE i.Name IS NOT NULL AND TRIM(i.Name) <> ''
  AND LOWER(TRIM(COALESCE(i.Type, ''))) IN ('labtests', 'labvitals')
  AND li.id IS NULL;

-- =========================================================
-- STEP 13: Medical Records (Clinical/Diagnosis) ✅
-- =========================================================
INSERT IGNORE INTO medical_records (
    patient_id, doctor_id, appointment_id, record_type,
    record_title, description, is_public, created_at
)
SELECT DISTINCT
    a.patient_id, a.doctor_id, a.id AS appointment_id,
    'Diagnosis' AS record_type, TRIM(i.Clinical_Name) AS record_title,
    CONCAT_WS(' | ',
        CONCAT('Status: ', TRIM(COALESCE(i.Clinical_Status, 'N/A'))),
        CONCAT('Details: ', TRIM(COALESCE(i.Clinical_Details, 'N/A'))),
        CONCAT('Since: ', COALESCE(i.Clinical_Since_Value, ''), ' ', TRIM(COALESCE(i.Clinical_Since_Unit, ''))),
        CONCAT('Severity: ', TRIM(COALESCE(i.Clinical_Severity, 'N/A')))
    ) AS description, 0 AS is_public, NOW() AS created_at
FROM imported_table i
JOIN patients p ON p.patient_id = TRIM(i.Patient_UHID)
JOIN users u ON u.name = TRIM(i.Doctors_Name) AND u.role = 'doctor'
JOIN doctors d ON d.user_id = u.id
LEFT JOIN clinics c ON c.name = TRIM(i.`Clinic Name`)
JOIN appointments a ON a.patient_id = p.id AND a.doctor_id = d.id
  AND ((a.clinic_id IS NULL AND c.id IS NULL) OR (a.clinic_id = c.id))
  AND a.appointment_date = STR_TO_DATE(i.`date`, '%Y-%m-%d')
LEFT JOIN medical_records mr ON mr.patient_id = p.id AND mr.appointment_id = a.id AND mr.record_title = TRIM(i.Clinical_Name)
WHERE i.Clinical_Name IS NOT NULL AND TRIM(i.Clinical_Name) <> '' AND mr.id IS NULL;

-- =========================================================
-- 🧹 STEP 14: CLEANUP DUPLICATES
-- =========================================================
DELETE a1 FROM appointments a1 INNER JOIN appointments a2 
WHERE a1.id > a2.id AND a1.patient_id = a2.patient_id AND a1.doctor_id = a2.doctor_id 
  AND a1.appointment_date = a2.appointment_date AND a1.appointment_time = a2.appointment_time;

DELETE af1 FROM appointment_followups af1 INNER JOIN appointment_followups af2 
WHERE af1.id > af2.id AND af1.appointment_id = af2.appointment_id AND af1.followup_date = af2.followup_date;

DELETE m1 FROM medicines m1 INNER JOIN medicines m2 WHERE m1.id > m2.id AND m1.name = m2.name;

UPDATE prescription_items pi LEFT JOIN medicines m ON pi.medicine_id = m.id 
SET pi.medicine_id = NULL WHERE m.id IS NULL AND pi.medicine_id IS NOT NULL;

DELETE pi1 FROM prescription_items pi1 INNER JOIN prescription_items pi2 
WHERE pi1.id > pi2.id AND pi1.prescription_id = pi2.prescription_id 
  AND COALESCE(pi1.medicine_id, 0) = COALESCE(pi2.medicine_id, 0);

DELETE b1 FROM bills b1 INNER JOIN bills b2 
WHERE b1.id > b2.id AND b1.patient_id = b2.patient_id AND b1.appointment_id = b2.appointment_id;

DELETE li1 FROM lab_investigations li1 INNER JOIN lab_investigations li2 
WHERE li1.id > li2.id AND li1.patient_id = li2.patient_id 
  AND li1.appointment_id = li2.appointment_id AND li1.test_name = li2.test_name;

DELETE mr1 FROM medical_records mr1 INNER JOIN medical_records mr2 
WHERE mr1.id > mr2.id AND mr1.patient_id = mr2.patient_id 
  AND mr1.appointment_id = mr2.appointment_id AND mr1.record_title = mr2.record_title;

-- =========================================================
-- ✅ STEP 15: RESET SETTINGS
-- =========================================================
SET SQL_SAFE_UPDATES = 1;
SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- 📊 FINAL VERIFICATION
-- =========================================================
SELECT '✅ MIGRATION COMPLETE!' AS status;

SELECT 'Clinics' AS entity, COUNT(*) AS count FROM clinics
UNION ALL SELECT 'Users', COUNT(*) FROM users
UNION ALL SELECT 'Doctors', COUNT(*) FROM doctors
UNION ALL SELECT 'Patients', COUNT(*) FROM patients
UNION ALL SELECT 'Patient Tags', COUNT(*) FROM patient_tags
UNION ALL SELECT 'Appointments', COUNT(*) FROM appointments
UNION ALL SELECT 'Followups', COUNT(*) FROM appointment_followups
UNION ALL SELECT 'Medicines', COUNT(*) FROM medicines
UNION ALL SELECT 'Prescriptions', COUNT(*) FROM prescriptions
UNION ALL SELECT 'Prescription Items', COUNT(*) FROM prescription_items
UNION ALL SELECT 'Bills', COUNT(*) FROM bills
UNION ALL SELECT 'Lab Investigations', COUNT(*) FROM lab_investigations
UNION ALL SELECT 'Medical Records', COUNT(*) FROM medical_records;