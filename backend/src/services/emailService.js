const nodemailer = require('nodemailer');
const env = require('../config/env');

const transporter = nodemailer.createTransport({
  host: env.email.host,
  port: env.email.port,
  secure: env.email.port === 465,
  auth: {
    user: env.email.user,
    pass: env.email.pass
  }
});

async function sendEmail({ to, subject, html, text }) {
  if (!env.email.host || !env.email.user) {
    throw new Error('Email is not configured. Please set SMTP env vars.');
  }

  const info = await transporter.sendMail({
    from: env.email.from,
    to,
    subject,
    text,
    html
  });

  return info;
}

module.exports = { sendEmail };

