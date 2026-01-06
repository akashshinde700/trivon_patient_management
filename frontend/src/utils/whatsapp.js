/**
 * WhatsApp Utility Functions
 * Opens WhatsApp Web/App with patient's number
 */

/**
 * Open WhatsApp with a phone number and optional message
 * Works with WhatsApp Web (if logged in) or WhatsApp App
 * @param {string} phone - Phone number (with or without country code)
 * @param {string} message - Optional pre-filled message
 */
export const openWhatsApp = (phone, message = '') => {
  if (!phone) {
    console.error('No phone number provided');
    return;
  }

  // Clean phone number - remove spaces, dashes, brackets
  let cleanPhone = phone.replace(/[^0-9+]/g, '');

  // If no country code, assume India (+91)
  if (!cleanPhone.startsWith('+') && !cleanPhone.startsWith('91')) {
    cleanPhone = '91' + cleanPhone;
  }

  // Remove + if present (WhatsApp API doesn't need it)
  cleanPhone = cleanPhone.replace('+', '');

  // Build WhatsApp URL
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${cleanPhone}${message ? `?text=${encodedMessage}` : ''}`;

  // Open in new tab
  window.open(whatsappUrl, '_blank');
};

/**
 * Generate WhatsApp message for bill/receipt with PDF download instruction
 * @param {object} data - Bill/Receipt data
 * @returns {string} - Formatted message
 */
export const generateBillMessage = (data) => {
  const { patientName, billAmount, billId, clinicName } = data;

  return `Hello ${patientName},

Your bill from *${clinicName || 'Our Clinic'}* is ready.

💳 *Bill ID:* ${billId}
💰 *Amount:* ₹${billAmount}

📄 *Please download your bill PDF from the clinic portal or contact us for a copy.*

Thank you for visiting us!`;
};

/**
 * Generate and download receipt as PDF
 * @param {object} receiptData - Receipt data to generate PDF
 */
export const downloadReceiptPDF = (receiptData) => {
  // Trigger browser's print dialog to save as PDF
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to download the PDF');
    return;
  }

  const {
    patientName,
    billId,
    billAmount,
    items,
    clinicName,
    clinicAddress,
    clinicPhone,
    clinicEmail,
    date,
    doctorName,
    doctorQualification,
    templateHeader,
    templateFooter,
    templateHeaderImage,
    templateFooterImage
  } = receiptData;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt - ${billId}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }
        .custom-header {
          text-align: center;
          margin-bottom: 20px;
        }
        .custom-header img {
          max-width: 100%;
          height: auto;
          max-height: 150px;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .clinic-name {
          font-size: 24px;
          font-weight: bold;
          color: #2563eb;
        }
        .clinic-info {
          font-size: 12px;
          color: #6b7280;
          margin-top: 5px;
        }
        .bill-info {
          margin: 20px 0;
        }
        .bill-info table {
          width: 100%;
        }
        .bill-info td {
          padding: 8px 0;
        }
        .bill-info td:first-child {
          font-weight: bold;
          width: 150px;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 30px 0;
        }
        .items-table th {
          background: #f3f4f6;
          padding: 12px;
          text-align: left;
          border: 1px solid #d1d5db;
        }
        .items-table td {
          padding: 10px 12px;
          border: 1px solid #d1d5db;
        }
        .total {
          margin-top: 20px;
          text-align: right;
          font-size: 20px;
          font-weight: bold;
        }
        .custom-footer {
          text-align: center;
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #d1d5db;
        }
        .custom-footer img {
          max-width: 100%;
          height: auto;
          max-height: 100px;
        }
        @media print {
          body { padding: 20px; }
        }
      </style>
    </head>
    <body>
      ${templateHeaderImage ? `
        <div class="custom-header">
          <img src="${templateHeaderImage}" alt="Header" />
        </div>
      ` : ''}

      ${templateHeader ? `
        <div style="text-align: center; margin-bottom: 20px;">
          ${templateHeader}
        </div>
      ` : ''}

      <div class="header">
        <div class="clinic-name">${clinicName || 'Our Clinic'}</div>
        ${clinicAddress ? `<div class="clinic-info">${clinicAddress}</div>` : ''}
        ${clinicPhone ? `<div class="clinic-info">Phone: ${clinicPhone}</div>` : ''}
        ${clinicEmail ? `<div class="clinic-info">Email: ${clinicEmail}</div>` : ''}
        <p style="margin-top: 15px; font-size: 18px; font-weight: bold;">RECEIPT</p>
      </div>

      <div class="bill-info">
        <table>
          <tr>
            <td>Patient Name:</td>
            <td>${patientName}</td>
          </tr>
          <tr>
            <td>Bill ID:</td>
            <td>${billId}</td>
          </tr>
          <tr>
            <td>Date:</td>
            <td>${date || new Date().toLocaleDateString('en-IN')}</td>
          </tr>
          ${doctorName ? `
            <tr>
              <td>Doctor:</td>
              <td>Dr. ${doctorName}${doctorQualification ? ` (${doctorQualification})` : ''}</td>
            </tr>
          ` : ''}
        </table>
      </div>

      ${items && items.length > 0 ? `
        <table class="items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Quantity</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>${item.description || item.name}</td>
                <td>${item.quantity || 1}</td>
                <td>₹${item.rate || item.amount}</td>
                <td>₹${(item.quantity || 1) * (item.rate || item.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      <div class="total">
        Total Amount: ₹${billAmount}
      </div>

      ${templateFooter ? `
        <div class="custom-footer">
          ${templateFooter}
        </div>
      ` : `
        <div style="margin-top: 50px; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Thank you for visiting us!</p>
          <p>This is a computer-generated receipt.</p>
        </div>
      `}

      ${templateFooterImage ? `
        <div class="custom-footer">
          <img src="${templateFooterImage}" alt="Footer" />
        </div>
      ` : ''}
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Wait for content to load, then trigger print dialog
  setTimeout(() => {
    printWindow.print();
  }, 250);
};

/**
 * Generate WhatsApp message for prescription
 * @param {object} data - Prescription data
 * @returns {string} - Formatted message
 */
export const generatePrescriptionMessage = (data) => {
  const { patientName, doctorName, date } = data;

  return `Hello ${patientName},

Your prescription from Dr. ${doctorName} (${date}) is ready.

Please follow the prescribed medications as advised.

Get well soon!`;
};

/**
 * Format date in Indian format (e.g., "Monday, 15 Dec 2025")
 */
const formatIndianDate = (dateString) => {
  if (!dateString) return 'TBD';

  const date = new Date(dateString);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${dayName}, ${day} ${month} ${year}`;
};

/**
 * Format time in 12-hour format (e.g., "3:30 PM")
 */
const formatIndianTime = (timeString) => {
  if (!timeString) return 'TBD';

  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minutes} ${ampm}`;
};

/**
 * Generate WhatsApp message for appointment reminder
 * @param {object} data - Appointment data
 * @returns {string} - Formatted message
 */
export const generateAppointmentMessage = (data) => {
  const { patientName, appointmentDate, appointmentTime, doctorName } = data;

  const formattedDate = formatIndianDate(appointmentDate);
  const formattedTime = formatIndianTime(appointmentTime);

  return `Hello ${patientName},

This is a reminder for your appointment:

📅 Date: ${formattedDate}
⏰ Time: ${formattedTime}
👨‍⚕️ Doctor: Dr. ${doctorName}

Please arrive 10 minutes early.`;
};
