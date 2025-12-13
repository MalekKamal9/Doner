/**
 * Email Service - Real Email Sending via SMTP
 * Uses Office 365 SMTP
 */

const nodemailer = require('nodemailer');

// ══════════════════════════════════════════════════════════════════════════════
// SMTP CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════
// NOTE: In production, use environment variables for credentials!
const SMTP_CONFIG = {
    host: 'smtp.office365.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER || 'infoteam@reg2do.com',
        pass: process.env.SMTP_PASSWORD || 'Malen9799'
    },
    tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
    }
};

const SENDER_EMAIL = process.env.SMTP_USER || 'infoteam@reg2do.com';
const SENDER_NAME = 'Akme Foundation';

// Create reusable transporter
let transporter = null;

function getTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport(SMTP_CONFIG);
    }
    return transporter;
}

// ══════════════════════════════════════════════════════════════════════════════
// SEND EMAIL FUNCTION
// ══════════════════════════════════════════════════════════════════════════════
async function sendEmail(to, subject, htmlBody, textBody = null) {
    try {
        const transport = getTransporter();
        
        const mailOptions = {
            from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
            to: to,
            subject: subject,
            html: htmlBody,
            text: textBody || htmlBody.replace(/<[^>]*>/g, '') // Strip HTML for text version
        };

        const result = await transport.sendMail(mailOptions);
        console.log(`✅ Email sent to ${to}: ${result.messageId}`);
        
        return {
            success: true,
            messageId: result.messageId,
            message: `Email sent successfully to ${to}`
        };
    } catch (error) {
        console.error(`❌ Email failed to ${to}:`, error.message);
        return {
            success: false,
            error: error.message,
            message: `Failed to send email: ${error.message}`
        };
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ══════════════════════════════════════════════════════════════════════════════

function getThankYouEmailTemplate(donorName, donationInfo) {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .highlight { background: #fff; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .btn { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🙏 Thank You!</h1>
            <p>Your generosity makes a difference</p>
        </div>
        <div class="content">
            <p>Dear <strong>${donorName}</strong>,</p>
            
            <p>On behalf of everyone at <strong>Akme Foundation</strong>, we want to express our heartfelt gratitude for your generous support.</p>
            
            <div class="highlight">
                <p><strong>Your Contribution:</strong></p>
                ${donationInfo || '<p>Your continued support helps us make a real difference in our community.</p>'}
            </div>
            
            <p>Your donation directly impacts the lives of those we serve. Because of donors like you, we can continue our mission to create positive change.</p>
            
            <p>Thank you for being part of our family of supporters!</p>
            
            <p>With sincere appreciation,<br>
            <strong>The Akme Foundation Team</strong></p>
        </div>
        <div class="footer">
            <p>Akme Foundation | Making a Difference Together</p>
            <p>This email was sent to you because you are a valued donor.</p>
        </div>
    </div>
</body>
</html>
    `;
}

function getImpactReportEmailTemplate(donorName, impactData) {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .stat-box { display: inline-block; background: #fff; padding: 20px; margin: 10px; border-radius: 10px; text-align: center; min-width: 120px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .stat-number { font-size: 28px; font-weight: bold; color: #11998e; }
        .stat-label { font-size: 12px; color: #666; }
        .section { background: #fff; padding: 20px; margin: 20px 0; border-radius: 10px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Your Impact Report</h1>
            <p>See the difference you're making</p>
        </div>
        <div class="content">
            <p>Dear <strong>${donorName}</strong>,</p>
            
            <p>We're excited to share how your generous contributions are creating real change!</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <div class="stat-box">
                    <div class="stat-number">${impactData?.totalDonations || '0'}</div>
                    <div class="stat-label">Total Donations</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">$${impactData?.totalAmount || '0'}</div>
                    <div class="stat-label">Total Contributed</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">${impactData?.livesImpacted || '100+'}</div>
                    <div class="stat-label">Lives Impacted</div>
                </div>
            </div>
            
            <div class="section">
                <h3>🎯 Programs Supported</h3>
                <p>${impactData?.programs || 'Education, Healthcare, Youth Development, Community Support'}</p>
            </div>
            
            <div class="section">
                <h3>💫 Recent Achievements</h3>
                <ul>
                    <li>Provided educational resources to 500+ students</li>
                    <li>Funded healthcare for 200+ families</li>
                    <li>Launched 3 new community programs</li>
                </ul>
            </div>
            
            <p>Thank you for making this possible!</p>
            
            <p>Gratefully,<br>
            <strong>The Akme Foundation Team</strong></p>
        </div>
        <div class="footer">
            <p>Akme Foundation | Your Partner in Creating Change</p>
        </div>
    </div>
</body>
</html>
    `;
}

function getEventInvitationEmailTemplate(donorName, eventInfo) {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .event-box { background: #fff; padding: 25px; margin: 20px 0; border-radius: 10px; border: 2px dashed #f5576c; }
        .event-detail { margin: 10px 0; }
        .event-label { font-weight: bold; color: #f5576c; }
        .btn { display: inline-block; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; margin-top: 20px; font-weight: bold; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 You're Invited!</h1>
            <p>Join us for a special event</p>
        </div>
        <div class="content">
            <p>Dear <strong>${donorName}</strong>,</p>
            
            <p>As one of our valued supporters, we would be honored to have you join us at our upcoming event!</p>
            
            <div class="event-box">
                <h2 style="color: #f5576c; margin-top: 0;">${eventInfo?.name || 'Annual Donor Appreciation Gala'}</h2>
                
                <div class="event-detail">
                    <span class="event-label">📅 Date:</span> ${eventInfo?.date || 'Saturday, March 15, 2025'}
                </div>
                <div class="event-detail">
                    <span class="event-label">⏰ Time:</span> ${eventInfo?.time || '6:00 PM - 9:00 PM'}
                </div>
                <div class="event-detail">
                    <span class="event-label">📍 Location:</span> ${eventInfo?.location || 'Grand Ballroom, City Center Hotel'}
                </div>
                <div class="event-detail">
                    <span class="event-label">👔 Dress Code:</span> ${eventInfo?.dressCode || 'Business Casual'}
                </div>
            </div>
            
            <p><strong>What to expect:</strong></p>
            <ul>
                <li>🍽️ Gourmet dinner and refreshments</li>
                <li>🎤 Inspiring stories from beneficiaries</li>
                <li>🤝 Networking with fellow donors</li>
                <li>🎁 Special recognition for our supporters</li>
            </ul>
            
            <p style="text-align: center;">
                <a href="#" class="btn">RSVP Now</a>
            </p>
            
            <p>We hope to see you there!</p>
            
            <p>Warm regards,<br>
            <strong>The Akme Foundation Events Team</strong></p>
        </div>
        <div class="footer">
            <p>Akme Foundation | Celebrating Our Community</p>
            <p>Please RSVP by March 1, 2025</p>
        </div>
    </div>
</body>
</html>
    `;
}

// ══════════════════════════════════════════════════════════════════════════════
// VERIFY CONNECTION
// ══════════════════════════════════════════════════════════════════════════════
async function verifyConnection() {
    try {
        const transport = getTransporter();
        await transport.verify();
        console.log('✅ SMTP connection verified');
        return true;
    } catch (error) {
        console.error('❌ SMTP connection failed:', error.message);
        return false;
    }
}

module.exports = {
    sendEmail,
    getThankYouEmailTemplate,
    getImpactReportEmailTemplate,
    getEventInvitationEmailTemplate,
    verifyConnection
};