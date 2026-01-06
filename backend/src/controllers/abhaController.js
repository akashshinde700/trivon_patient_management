const { getDb } = require('../config/db');
const axios = require('axios');
const crypto = require('crypto');

// ABDM API Base URLs
const ABDM_BASE_URL = 'https://abha.abdm.gov.in';
const ABHA_REGISTER_URL = `${ABDM_BASE_URL}/abha/v3/register/aadhaar`;
const ABHA_LOGIN_URL = `${ABDM_BASE_URL}/abha/v3/login`;

/**
 * Generate a unique session ID
 */
function generateSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Log ABHA API calls for debugging and audit
 */
async function logAbhaApiCall(db, data) {
  try {
    await db.execute(
      `INSERT INTO abha_api_logs (
        patient_id, session_id, api_endpoint, http_method,
        request_headers, request_body, response_status, response_body,
        response_time_ms, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.patient_id || null,
        data.session_id || null,
        data.api_endpoint,
        data.http_method,
        JSON.stringify(data.request_headers || {}),
        JSON.stringify(data.request_body || {}),
        data.response_status || null,
        JSON.stringify(data.response_body || {}),
        data.response_time_ms || null,
        data.error_message || null
      ]
    );
  } catch (error) {
    console.error('Failed to log ABHA API call:', error);
  }
}

/**
 * Step 1: Initiate ABHA registration with Aadhaar
 * POST /api/abha/register/init
 */
async function initiateRegistration(req, res) {
  const startTime = Date.now();
  const db = getDb();

  try {
    const { patient_id, aadhaar_number, mobile_number } = req.body;

    if (!patient_id || !aadhaar_number) {
      return res.status(400).json({
        error: 'patient_id and aadhaar_number are required'
      });
    }

    // Validate Aadhaar number format (12 digits)
    if (!/^\d{12}$/.test(aadhaar_number)) {
      return res.status(400).json({
        error: 'Invalid Aadhaar number format. Must be 12 digits.'
      });
    }

    // Check if patient exists
    const [patients] = await db.execute(
      'SELECT id, name, abha_number FROM patients WHERE id = ?',
      [patient_id]
    );

    if (patients.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Check if patient already has ABHA
    if (patients[0].abha_number) {
      return res.status(400).json({
        error: 'Patient already has an ABHA number',
        abha_number: patients[0].abha_number
      });
    }

    // Generate session ID
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create registration session
    await db.execute(
      `INSERT INTO abha_registration_sessions (
        patient_id, session_id, aadhaar_number, mobile_number,
        registration_type, status, expires_at
      ) VALUES (?, ?, ?, ?, 'aadhaar', 'initiated', ?)`,
      [patient_id, sessionId, aadhaar_number, mobile_number || null, expiresAt]
    );

    // Call ABDM API to send OTP
    const requestBody = {
      aadhaar: aadhaar_number,
      mobile: mobile_number
    };

    try {
      const apiResponse = await axios.post(
        `${ABHA_REGISTER_URL}/generate-otp`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );

      const responseTime = Date.now() - startTime;

      // Log API call
      await logAbhaApiCall(db, {
        patient_id,
        session_id: sessionId,
        api_endpoint: `${ABHA_REGISTER_URL}/generate-otp`,
        http_method: 'POST',
        request_body: { aadhaar: '****', mobile: mobile_number },
        response_status: apiResponse.status,
        response_body: apiResponse.data,
        response_time_ms: responseTime
      });

      // Update session with transaction ID
      if (apiResponse.data.txnId) {
        await db.execute(
          `UPDATE abha_registration_sessions
           SET txn_id = ?, otp_sent_at = NOW(), status = 'otp_sent',
               response_data = ?
           WHERE session_id = ?`,
          [apiResponse.data.txnId, JSON.stringify(apiResponse.data), sessionId]
        );
      }

      res.json({
        success: true,
        session_id: sessionId,
        txn_id: apiResponse.data.txnId,
        message: 'OTP sent to Aadhaar registered mobile number',
        expires_in: 900 // 15 minutes in seconds
      });

    } catch (apiError) {
      const responseTime = Date.now() - startTime;
      const errorMessage = apiError.response?.data?.message || apiError.message;

      // Log API error
      await logAbhaApiCall(db, {
        patient_id,
        session_id: sessionId,
        api_endpoint: `${ABHA_REGISTER_URL}/generate-otp`,
        http_method: 'POST',
        request_body: { aadhaar: '****', mobile: mobile_number },
        response_status: apiError.response?.status,
        response_body: apiError.response?.data,
        response_time_ms: responseTime,
        error_message: errorMessage
      });

      // Update session with error
      await db.execute(
        `UPDATE abha_registration_sessions
         SET status = 'failed', error_message = ?
         WHERE session_id = ?`,
        [errorMessage, sessionId]
      );

      throw apiError;
    }

  } catch (error) {
    console.error('ABHA registration initiation error:', error);

    if (error.response?.data) {
      return res.status(error.response.status || 500).json({
        error: 'ABDM API error',
        message: error.response.data.message || error.message,
        details: error.response.data
      });
    }

    res.status(500).json({
      error: 'Failed to initiate ABHA registration',
      message: error.message
    });
  }
}

/**
 * Step 2: Verify OTP and complete registration
 * POST /api/abha/register/verify-otp
 */
async function verifyRegistrationOtp(req, res) {
  const startTime = Date.now();
  const db = getDb();

  try {
    const { session_id, otp, txn_id } = req.body;

    if (!session_id || !otp) {
      return res.status(400).json({
        error: 'session_id and otp are required'
      });
    }

    // Get session details
    const [sessions] = await db.execute(
      `SELECT * FROM abha_registration_sessions
       WHERE session_id = ? AND status = 'otp_sent'
       AND expires_at > NOW()`,
      [session_id]
    );

    if (sessions.length === 0) {
      return res.status(400).json({
        error: 'Invalid or expired session'
      });
    }

    const session = sessions[0];

    // Call ABDM API to verify OTP
    const requestBody = {
      otp: otp,
      txnId: txn_id || session.txn_id
    };

    try {
      const apiResponse = await axios.post(
        `${ABHA_REGISTER_URL}/verify-otp`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );

      const responseTime = Date.now() - startTime;

      // Log API call
      await logAbhaApiCall(db, {
        patient_id: session.patient_id,
        session_id: session_id,
        api_endpoint: `${ABHA_REGISTER_URL}/verify-otp`,
        http_method: 'POST',
        request_body: { txnId: requestBody.txnId, otp: '****' },
        response_status: apiResponse.status,
        response_body: apiResponse.data,
        response_time_ms: responseTime
      });

      const abhaData = apiResponse.data;

      // Update session
      await db.execute(
        `UPDATE abha_registration_sessions
         SET otp_verified_at = NOW(), status = 'completed',
             response_data = ?
         WHERE session_id = ?`,
        [JSON.stringify(abhaData), session_id]
      );

      // Create or update ABHA account record
      if (abhaData.ABHANumber || abhaData.healthIdNumber) {
        const abhaNumber = abhaData.ABHANumber || abhaData.healthIdNumber;
        const abhaAddress = abhaData.healthId || abhaData.preferredAbhaAddress;

        // Update patient table
        await db.execute(
          `UPDATE patients
           SET abha_number = ?, abha_address = ?, health_id = ?
           WHERE id = ?`,
          [abhaNumber, abhaAddress, abhaAddress, session.patient_id]
        );

        // Insert into abha_accounts table
        await db.execute(
          `INSERT INTO abha_accounts (
            patient_id, abha_number, abha_address, health_id,
            name, first_name, middle_name, last_name,
            gender, date_of_birth, mobile, email,
            address, district, state, pincode,
            kycverified, status, aadhaar_verified,
            mobile_verified, email_verified,
            abdm_token, registered_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          ON DUPLICATE KEY UPDATE
            abha_address = VALUES(abha_address),
            name = VALUES(name),
            mobile = VALUES(mobile),
            status = 'active',
            updated_at = NOW()`,
          [
            session.patient_id,
            abhaNumber,
            abhaAddress,
            abhaAddress,
            abhaData.name || abhaData.fullName,
            abhaData.firstName,
            abhaData.middleName,
            abhaData.lastName,
            abhaData.gender?.toLowerCase(),
            abhaData.dateOfBirth || abhaData.dob,
            abhaData.mobile,
            abhaData.email,
            abhaData.address,
            abhaData.districtName || abhaData.district,
            abhaData.stateName || abhaData.state,
            abhaData.pincode,
            abhaData.kycVerified ? 1 : 0,
            'active',
            1, // Aadhaar verified through OTP
            abhaData.mobile ? 1 : 0,
            abhaData.email ? 1 : 0,
            abhaData.token || abhaData.xToken
          ]
        );
      }

      res.json({
        success: true,
        message: 'ABHA registration completed successfully',
        abha_number: abhaData.ABHANumber || abhaData.healthIdNumber,
        abha_address: abhaData.healthId || abhaData.preferredAbhaAddress,
        data: abhaData
      });

    } catch (apiError) {
      const responseTime = Date.now() - startTime;
      const errorMessage = apiError.response?.data?.message || apiError.message;

      // Log API error
      await logAbhaApiCall(db, {
        patient_id: session.patient_id,
        session_id: session_id,
        api_endpoint: `${ABHA_REGISTER_URL}/verify-otp`,
        http_method: 'POST',
        request_body: { txnId: requestBody.txnId, otp: '****' },
        response_status: apiError.response?.status,
        response_body: apiError.response?.data,
        response_time_ms: responseTime,
        error_message: errorMessage
      });

      // Update session with error
      await db.execute(
        `UPDATE abha_registration_sessions
         SET status = 'failed', error_message = ?
         WHERE session_id = ?`,
        [errorMessage, session_id]
      );

      throw apiError;
    }

  } catch (error) {
    console.error('ABHA OTP verification error:', error);

    if (error.response?.data) {
      return res.status(error.response.status || 500).json({
        error: 'ABDM API error',
        message: error.response.data.message || error.message,
        details: error.response.data
      });
    }

    res.status(500).json({
      error: 'Failed to verify OTP',
      message: error.message
    });
  }
}

/**
 * Step 1: Initiate ABHA login
 * POST /api/abha/login/init
 */
async function initiateLogin(req, res) {
  const startTime = Date.now();
  const db = getDb();

  try {
    const { patient_id, abha_address, auth_method = 'aadhaar_otp' } = req.body;

    if (!patient_id || !abha_address) {
      return res.status(400).json({
        error: 'patient_id and abha_address are required'
      });
    }

    // Check if patient exists
    const [patients] = await db.execute(
      'SELECT id, name, abha_number FROM patients WHERE id = ?',
      [patient_id]
    );

    if (patients.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Generate session ID
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create login session
    await db.execute(
      `INSERT INTO abha_login_sessions (
        patient_id, abha_address, session_id, auth_method,
        status, expires_at
      ) VALUES (?, ?, ?, ?, 'initiated', ?)`,
      [patient_id, abha_address, sessionId, auth_method, expiresAt]
    );

    // Call ABDM API to send OTP
    const requestBody = {
      healthId: abha_address,
      authMethod: auth_method
    };

    try {
      const apiResponse = await axios.post(
        `${ABHA_LOGIN_URL}/request-otp`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );

      const responseTime = Date.now() - startTime;

      // Log API call
      await logAbhaApiCall(db, {
        patient_id,
        session_id: sessionId,
        api_endpoint: `${ABHA_LOGIN_URL}/request-otp`,
        http_method: 'POST',
        request_body: requestBody,
        response_status: apiResponse.status,
        response_body: apiResponse.data,
        response_time_ms: responseTime
      });

      // Update session with transaction ID
      if (apiResponse.data.txnId) {
        await db.execute(
          `UPDATE abha_login_sessions
           SET txn_id = ?, otp_sent_at = NOW(), status = 'otp_sent',
               response_data = ?
           WHERE session_id = ?`,
          [apiResponse.data.txnId, JSON.stringify(apiResponse.data), sessionId]
        );
      }

      res.json({
        success: true,
        session_id: sessionId,
        txn_id: apiResponse.data.txnId,
        message: 'OTP sent to registered mobile number',
        expires_in: 900 // 15 minutes in seconds
      });

    } catch (apiError) {
      const responseTime = Date.now() - startTime;
      const errorMessage = apiError.response?.data?.message || apiError.message;

      // Log API error
      await logAbhaApiCall(db, {
        patient_id,
        session_id: sessionId,
        api_endpoint: `${ABHA_LOGIN_URL}/request-otp`,
        http_method: 'POST',
        request_body: requestBody,
        response_status: apiError.response?.status,
        response_body: apiError.response?.data,
        response_time_ms: responseTime,
        error_message: errorMessage
      });

      // Update session with error
      await db.execute(
        `UPDATE abha_login_sessions
         SET status = 'failed', error_message = ?
         WHERE session_id = ?`,
        [errorMessage, sessionId]
      );

      throw apiError;
    }

  } catch (error) {
    console.error('ABHA login initiation error:', error);

    if (error.response?.data) {
      return res.status(error.response.status || 500).json({
        error: 'ABDM API error',
        message: error.response.data.message || error.message,
        details: error.response.data
      });
    }

    res.status(500).json({
      error: 'Failed to initiate ABHA login',
      message: error.message
    });
  }
}

/**
 * Step 2: Verify login OTP
 * POST /api/abha/login/verify-otp
 */
async function verifyLoginOtp(req, res) {
  const startTime = Date.now();
  const db = getDb();

  try {
    const { session_id, otp, txn_id } = req.body;

    if (!session_id || !otp) {
      return res.status(400).json({
        error: 'session_id and otp are required'
      });
    }

    // Get session details
    const [sessions] = await db.execute(
      `SELECT * FROM abha_login_sessions
       WHERE session_id = ? AND status = 'otp_sent'
       AND expires_at > NOW()`,
      [session_id]
    );

    if (sessions.length === 0) {
      return res.status(400).json({
        error: 'Invalid or expired session'
      });
    }

    const session = sessions[0];

    // Call ABDM API to verify OTP
    const requestBody = {
      otp: otp,
      txnId: txn_id || session.txn_id
    };

    try {
      const apiResponse = await axios.post(
        `${ABHA_LOGIN_URL}/verify-otp`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );

      const responseTime = Date.now() - startTime;

      // Log API call
      await logAbhaApiCall(db, {
        patient_id: session.patient_id,
        session_id: session_id,
        api_endpoint: `${ABHA_LOGIN_URL}/verify-otp`,
        http_method: 'POST',
        request_body: { txnId: requestBody.txnId, otp: '****' },
        response_status: apiResponse.status,
        response_body: apiResponse.data,
        response_time_ms: responseTime
      });

      const abhaData = apiResponse.data;

      // Update session
      await db.execute(
        `UPDATE abha_login_sessions
         SET otp_verified_at = NOW(), status = 'authenticated',
             response_data = ?
         WHERE session_id = ?`,
        [JSON.stringify(abhaData), session_id]
      );

      // Update ABHA account with latest information
      if (abhaData.healthIdNumber || abhaData.ABHANumber) {
        const abhaNumber = abhaData.healthIdNumber || abhaData.ABHANumber;

        await db.execute(
          `UPDATE abha_accounts
           SET abdm_token = ?,
               refresh_token = ?,
               token_expires_at = DATE_ADD(NOW(), INTERVAL 30 MINUTE),
               status = 'active',
               updated_at = NOW()
           WHERE patient_id = ?`,
          [
            abhaData.token || abhaData.xToken,
            abhaData.refreshToken,
            session.patient_id
          ]
        );
      }

      res.json({
        success: true,
        message: 'ABHA login successful',
        data: abhaData
      });

    } catch (apiError) {
      const responseTime = Date.now() - startTime;
      const errorMessage = apiError.response?.data?.message || apiError.message;

      // Log API error
      await logAbhaApiCall(db, {
        patient_id: session.patient_id,
        session_id: session_id,
        api_endpoint: `${ABHA_LOGIN_URL}/verify-otp`,
        http_method: 'POST',
        request_body: { txnId: requestBody.txnId, otp: '****' },
        response_status: apiError.response?.status,
        response_body: apiError.response?.data,
        response_time_ms: responseTime,
        error_message: errorMessage
      });

      // Update session with error
      await db.execute(
        `UPDATE abha_login_sessions
         SET status = 'failed', error_message = ?
         WHERE session_id = ?`,
        [errorMessage, session_id]
      );

      throw apiError;
    }

  } catch (error) {
    console.error('ABHA login OTP verification error:', error);

    if (error.response?.data) {
      return res.status(error.response.status || 500).json({
        error: 'ABDM API error',
        message: error.response.data.message || error.message,
        details: error.response.data
      });
    }

    res.status(500).json({
      error: 'Failed to verify login OTP',
      message: error.message
    });
  }
}

/**
 * Get ABHA account status for a patient
 * GET /api/abha/status/:patient_id
 */
async function getAbhaStatus(req, res) {
  try {
    const { patient_id } = req.params;
    const db = getDb();

    const [accounts] = await db.execute(
      `SELECT a.*, p.name as patient_name
       FROM abha_accounts a
       LEFT JOIN patients p ON a.patient_id = p.id
       WHERE a.patient_id = ?`,
      [patient_id]
    );

    if (accounts.length === 0) {
      return res.json({
        has_abha: false,
        message: 'No ABHA account linked'
      });
    }

    const account = accounts[0];

    res.json({
      has_abha: true,
      abha_number: account.abha_number,
      abha_address: account.abha_address,
      status: account.status,
      kyc_verified: !!account.kycverified,
      aadhaar_verified: !!account.aadhaar_verified,
      mobile_verified: !!account.mobile_verified,
      registered_at: account.registered_at
    });

  } catch (error) {
    console.error('Get ABHA status error:', error);
    res.status(500).json({
      error: 'Failed to get ABHA status',
      message: error.message
    });
  }
}

/**
 * Unlink ABHA account from patient
 * POST /api/abha/unlink
 */
async function unlinkAbha(req, res) {
  try {
    const { patient_id } = req.body;

    if (!patient_id) {
      return res.status(400).json({ error: 'patient_id is required' });
    }

    const db = getDb();

    // Update patient table
    await db.execute(
      `UPDATE patients
       SET abha_number = NULL, abha_address = NULL, health_id = NULL
       WHERE id = ?`,
      [patient_id]
    );

    // Deactivate ABHA account
    await db.execute(
      `UPDATE abha_accounts
       SET status = 'deactivated', updated_at = NOW()
       WHERE patient_id = ?`,
      [patient_id]
    );

    res.json({
      success: true,
      message: 'ABHA account unlinked successfully'
    });

  } catch (error) {
    console.error('Unlink ABHA error:', error);
    res.status(500).json({
      error: 'Failed to unlink ABHA account',
      message: error.message
    });
  }
}

// Legacy stubs for backward compatibility
async function enroll(req, res) {
  return res.status(400).json({
    error: 'This endpoint is deprecated. Use /api/abha/register/init instead'
  });
}

async function link(req, res) {
  return res.status(400).json({
    error: 'This endpoint is deprecated. Use /api/abha/register/init or /api/abha/login/init instead'
  });
}

async function unlink(req, res) {
  return unlinkAbha(req, res);
}

async function status(req, res) {
  return getAbhaStatus(req, res);
}

module.exports = {
  // New ABHA endpoints
  initiateRegistration,
  verifyRegistrationOtp,
  initiateLogin,
  verifyLoginOtp,
  getAbhaStatus,
  unlinkAbha,

  // Legacy endpoints (for backward compatibility)
  enroll,
  link,
  unlink,
  status
};
