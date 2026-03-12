const nodemailer = require('nodemailer');

const { EMAIL_USER, EMAIL_PASS, EMAIL_FROM } = process.env;

function getTransporter() {
  if (!EMAIL_USER || !EMAIL_PASS) {
    throw new Error('Missing EMAIL_USER or EMAIL_PASS for mail transport');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });
}

async function sendResetEmail(toEmail, otp) {
  const transporter = getTransporter();

  const fromAddress = EMAIL_FROM || EMAIL_USER;

  const mailOptions = {
    from: `"HomeyChef" <${fromAddress}>`,   // ← هذا السر: يظهر "HomeyChef" بشكل فخم
    to: toEmail,
    subject: 'HomeyChef - Your Secure Verification Code',
    text: `Your HomeyChef verification code is: ${otp}\n\n` +
          `This code expires in 15 minutes. For your security, never share this code with anyone.\n\n` +
          `If you did not request this password reset, please contact our global support team or safely ignore this email.`,

    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            .email-container {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              max-width: 480px;
              margin: 0 auto;
              padding: 32px;
              background-color: #ffffff;
              border-radius: 20px;
              box-shadow: 0 8px 25px rgba(0, 0, 0, 0.06);
              border: 1px solid #f0f0f0;
              color: #1f1a17;
              line-height: 1.6;
            }
            .logo {
              text-align: center;
              margin-bottom: 20px;
            }
            .logo span {
              font-size: 32px;
              font-weight: 700;
              letter-spacing: -1px;
              background: linear-gradient(135deg, #e67e22 0%, #d35400 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            }
            .logo-tagline {
              font-size: 13px;
              font-weight: 500;
              letter-spacing: 1.5px;
              color: #777;
              margin-top: 6px;
            }
            .title {
              font-size: 22px;
              font-weight: 600;
              margin: 0 0 12px 0;
              color: #1f1a17;
              text-align: center;
            }
            .message {
              font-size: 16px;
              color: #4a4a4a;
              margin: 0 0 28px 0;
              text-align: center;
            }
            .otp-box {
              background: #fff8ee;
              border-radius: 16px;
              padding: 18px 32px;
              margin: 28px 0;
              text-align: center;
              border: 2px solid #ffe6c7;
            }
            .otp-code {
              font-size: 42px;
              font-weight: 700;
              letter-spacing: 12px;
              color: #e67e22;
              font-family: 'Courier New', monospace;
            }
            .expiry-note {
              font-size: 15px;
              color: #777;
              margin: 20px 0 12px;
              padding-top: 20px;
              border-top: 1px solid #f0f0f0;
              text-align: center;
            }
            .security-tip {
              background: #f8f8f8;
              border-radius: 12px;
              padding: 16px;
              font-size: 14.5px;
              color: #444;
              margin: 24px 0 0;
              border-left: 5px solid #e67e22;
            }
            .footer {
              margin-top: 40px;
              font-size: 12.5px;
              color: #999;
              text-align: center;
              line-height: 1.5;
            }
          </style>
        </head>
        <body style="margin:0; padding:24px; background-color:#f9f7f2;">
          <div class="email-container">
            <!-- Logo + Global Tagline -->
            <div class="logo">
              <span>HomeyChef</span>
              <div class="logo-tagline">LOCAL CHEFS • NEIGHBORHOOD FLAVORS</div>
            </div>

            <h1 class="title">Secure Verification Code</h1>
            <p class="message">
              We received a request to reset your password. Use the code below to proceed securely.
            </p>

            <!-- OTP -->
            <div class="otp-box">
              <span class="otp-code">${otp}</span>
            </div>

            <p class="expiry-note">
              ⏳ This code expires in 15 minutes. For your protection, do not share it.
            </p>

            <!-- Security -->
            <div class="security-tip">
              🔒 Our team will never ask for this code. If you didn't request a reset, please ignore this email.
            </div>

            <!-- Professional Footer -->
            <div class="footer">
              © 2026 HomeyChef Inc. All rights reserved.<br>
              Syria • Damascus • Mazzeh<br>
             Connecting local chefs and home cooks in your community.
            </div>
          </div>
        </body>
      </html>
    `
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendResetEmail };