// SMS Service - DISABLED
// SMS functionality has been removed as it requires paid services
// Only email notifications are available

/**
 * SMS service is disabled - use email notifications instead
 * To enable SMS in future, integrate with a free SMS gateway or paid service
 */
async function sendSMS(phone, message) {
  // SMS service disabled - log for debugging but don't send
  console.log(`[SMS DISABLED] Would send SMS to ${phone}: ${message.substring(0, 50)}...`);
  
  // Return success to prevent errors, but SMS is not actually sent
  return {
    success: false,
    message: 'SMS service is disabled. Please use email notifications instead.',
    provider: 'disabled'
  };
}

module.exports = {
  sendSMS
};

