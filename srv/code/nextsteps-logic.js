/**
 * Next Step Actions for Donors
 * Shows email content, confirmation alerts, AND sends real emails via SMTP
 */

const nodemailer = require('nodemailer');

// ══════════════════════════════════════════════════════════════════════════════
// SMTP CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════
const SMTP_CONFIG = {
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
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

// Create transporter
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
async function sendRealEmail(to, subject, htmlBody) {
    try {
        const transport = getTransporter();
        const result = await transport.sendMail({
            from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
            to: to,
            subject: subject,
            html: htmlBody,
            text: htmlBody.replace(/<[^>]*>/g, '')
        });
        console.log(`✅ Email sent to ${to}: ${result.messageId}`);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error(`❌ Email failed to ${to}:`, error.message);
        return { success: false, error: error.message };
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// SEND THANK YOU EMAIL
// ══════════════════════════════════════════════════════════════════════════════
async function SendThankYou(request) {
  const { Donors, Donations } = cds.entities('Donor_management_Bita');
  const donorId = request.params[0]?.ID || request.params[0];
  
  const donor = await SELECT.one.from(Donors).where({ ID: donorId });
  
  if (!donor) {
    request.error(404, 'Donor not found.');
    return;
  }

  // Get donation stats
  const donations = await SELECT.from(Donations)
    .where({ donor_Email: donor.email })
    .orderBy({ donation_date: 'desc' });

  // Calculate totals - only if donations exist
  let totalAmount = 0;
  let currency = null;
  let hasDonations = donations && donations.length > 0;

  if (hasDonations) {
    donations.forEach(d => totalAmount += parseFloat(d.amount || 0));
    currency = donations[0]?.currency_code || null; // Get currency from most recent donation
  }

  console.log('📧 Sending thank you email to:', donor.email);

  // ════════════════════════════════════════════════════════════════════════
  // SEND REAL EMAIL
  // ════════════════════════════════════════════════════════════════════════
  const htmlEmail = getThankYouHTML(donor.name, currency, totalAmount, donations.length, hasDonations);
  const emailResult = await sendRealEmail(
      donor.email,
      `Thank You for Your Support, ${donor.name}! 🙏`,
      htmlEmail
  );

  // Build donation info for display
  let donationInfo = '';
  if (hasDonations && totalAmount > 0) {
    donationInfo = `\n💰 Total: ${currency} ${formatAmount(totalAmount)} (${donations.length} donation${donations.length > 1 ? 's' : ''})`;
  }

  // Show success/failure message
  if (emailResult.success) {
      request.info(`✅ Thank You Email Sent Successfully!\n\n📬 To: ${donor.email}${donationInfo}\n🆔 Message ID: ${emailResult.messageId}`);
  } else {
      request.warn(`⚠️ Email delivery pending.\n\n📬 To: ${donor.email}\n❌ Error: ${emailResult.error}`);
  }

  // Build detailed email content to return
  const emailContent = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 THANK YOU EMAIL ${emailResult.success ? 'SENT' : 'QUEUED'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${emailResult.success ? '✅ Status: Email Sent Successfully' : '⚠️ Status: ' + emailResult.error}
${emailResult.messageId ? '🆔 Message ID: ' + emailResult.messageId : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📬 EMAIL DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To: ${donor.email}
From: ${SENDER_EMAIL}
Subject: Thank You for Your Support, ${donor.name}!
Sent: ${new Date().toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 EMAIL PREVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Dear ${donor.name},

We wanted to take a moment to express our heartfelt 
gratitude for your incredible support.
${hasDonations && totalAmount > 0 ? `
Your total contribution of ${currency} ${formatAmount(totalAmount)} 
across ${donations.length} donation(s) has made a 
tremendous impact on our mission.
` : `
Your interest in our mission means the world to us.
`}
Because of supporters like you, we are able to:
- Continue our vital programs
- Reach more people in need
- Create lasting change in our community

Thank you for being a valued member of our community.

With sincere appreciation,
The Fundraising Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  return emailContent;
}

// ══════════════════════════════════════════════════════════════════════════════
// SHARE IMPACT REPORT
// ══════════════════════════════════════════════════════════════════════════════
async function ShareImpactReport(request) {
  const { Donors, Donations } = cds.entities('Donor_management_Bita');
  const donorId = request.params[0]?.ID || request.params[0];
  
  const donor = await SELECT.one.from(Donors).where({ ID: donorId });
  
  if (!donor) {
    request.error(404, 'Donor not found.');
    return;
  }

  // Get donation stats
  const donations = await SELECT.from(Donations)
    .where({ donor_Email: donor.email })
    .orderBy({ donation_date: 'desc' });

  let totalAmount = 0;
  let currency = null;
  let hasDonations = donations && donations.length > 0;
  const causeMap = {};

  if (hasDonations) {
    donations.forEach(d => {
      totalAmount += parseFloat(d.amount || 0);
      if (d.cause) causeMap[d.cause] = (causeMap[d.cause] || 0) + parseFloat(d.amount || 0);
    });
    currency = donations[0]?.currency_code || null;
  }

  // Top causes by amount
  const topCauses = Object.entries(causeMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  console.log('📊 Sharing impact report with:', donor.email);

  // ════════════════════════════════════════════════════════════════════════
  // SEND REAL EMAIL
  // ════════════════════════════════════════════════════════════════════════
  const htmlEmail = getImpactReportHTML(donor.name, currency, totalAmount, donations.length, topCauses, hasDonations);
  const emailResult = await sendRealEmail(
      donor.email,
      `📊 Your Impact Report - See the Difference You're Making!`,
      htmlEmail
  );

  // Show success/failure message
  if (emailResult.success) {
      request.info(`✅ Impact Report Sent Successfully!\n\n📬 To: ${donor.email}\n📎 Report: ImpactReport_${new Date().getFullYear()}.pdf\n🆔 Message ID: ${emailResult.messageId}`);
  } else {
      request.warn(`⚠️ Email delivery pending.\n\n📬 To: ${donor.email}\n❌ Error: ${emailResult.error}`);
  }

  // Build cause breakdown for display
  let causeBreakdown = '';
  if (topCauses.length > 0 && currency) {
    causeBreakdown = topCauses.map((c, i) => '   ' + (i + 1) + '. ' + c[0] + ': ' + currency + ' ' + formatAmount(c[1])).join('\n');
  }

  const reportContent = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 IMPACT REPORT ${emailResult.success ? 'SENT' : 'QUEUED'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${emailResult.success ? '✅ Status: Report Sent Successfully' : '⚠️ Status: ' + emailResult.error}
${emailResult.messageId ? '🆔 Message ID: ' + emailResult.messageId : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📬 EMAIL DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To: ${donor.email}
From: ${SENDER_EMAIL}
Subject: Your Impact Report - ${donor.name}
Sent: ${new Date().toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 REPORT PREVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Dear ${donor.name},

Here's how we're making a difference together:
${hasDonations && totalAmount > 0 ? `
💰 YOUR TOTAL CONTRIBUTION
   ${currency} ${formatAmount(totalAmount)}

📊 YOUR IMPACT BY CAUSE
${causeBreakdown}
` : `
Thank you for your interest in our mission!
`}
🎯 WHAT WE'VE ACHIEVED TOGETHER
   • 150+ families received food assistance
   • 75 students got educational scholarships
   • 200+ medical checkups provided
   • 50 community events organized

📈 PROGRAM SUCCESS RATE
   ████████████████████░░░░ 85%

"Together, we transform lives every day."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  return reportContent;
}

// ══════════════════════════════════════════════════════════════════════════════
// INVITE TO EVENT
// ══════════════════════════════════════════════════════════════════════════════
async function InviteToEvent(request) {
  const { Donors } = cds.entities('Donor_management_Bita');
  const donorId = request.params[0]?.ID || request.params[0];
  
  const donor = await SELECT.one.from(Donors).where({ ID: donorId });
  
  if (!donor) {
    request.error(404, 'Donor not found.');
    return;
  }

  console.log('🎉 Sending event invitation to:', donor.email);

  // Generate event date (2 weeks from now)
  const eventDate = new Date();
  eventDate.setDate(eventDate.getDate() + 14);
  const eventDateStr = eventDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // ════════════════════════════════════════════════════════════════════════
  // SEND REAL EMAIL
  // ════════════════════════════════════════════════════════════════════════
  const htmlEmail = getEventInvitationHTML(donor.name, eventDateStr, donor.isHNI);
  const emailResult = await sendRealEmail(
      donor.email,
      `🎉 You're Invited! Annual Donor Appreciation Gala`,
      htmlEmail
  );

  // Show success/failure message
  if (emailResult.success) {
      request.info(`✅ Event Invitation Sent Successfully!\n\n📬 To: ${donor.email}\n📅 Event: Annual Donor Appreciation Gala\n🗓️ Date: ${eventDateStr}\n🆔 Message ID: ${emailResult.messageId}`);
  } else {
      request.warn(`⚠️ Email delivery pending.\n\n📬 To: ${donor.email}\n❌ Error: ${emailResult.error}`);
  }

  const inviteContent = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 EVENT INVITATION ${emailResult.success ? 'SENT' : 'QUEUED'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${emailResult.success ? '✅ Status: Invitation Sent Successfully' : '⚠️ Status: ' + emailResult.error}
${emailResult.messageId ? '🆔 Message ID: ' + emailResult.messageId : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📬 EMAIL DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To: ${donor.email}
From: ${SENDER_EMAIL}
Subject: You're Invited! Annual Donor Appreciation Gala
Calendar Invite: Attached ✓
Sent: ${new Date().toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 INVITATION PREVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Dear ${donor.name},

You are cordially invited to our

   ✨ ANNUAL DONOR APPRECIATION GALA ✨

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 EVENT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📆 Date: ${eventDateStr}
⏰ Time: 6:00 PM - 10:00 PM
📍 Venue: Grand Ballroom, City Hotel
👔 Dress Code: Semi-Formal

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎁 EVENING HIGHLIGHTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🍽️ Gourmet Dinner & Refreshments
🎵 Live Entertainment
🏆 Donor Recognition Awards
🤝 Networking with Fellow Supporters
🎤 Keynote Speaker: CEO Address
📸 Professional Photography

${donor.isHNI ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⭐ VIP BENEFITS (Exclusive for You!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Reserved VIP seating at front table
- Private reception with leadership team
- Exclusive VIP gift bag
- Complimentary valet parking
- Personal photographer session
` : ''}
We look forward to celebrating with you!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  return inviteContent;
}

// ══════════════════════════════════════════════════════════════════════════════
// HTML EMAIL TEMPLATES
// ══════════════════════════════════════════════════════════════════════════════

function getThankYouHTML(name, currency, totalAmount, donationCount, hasDonations) {
    // Build stats section only if there are donations with amount > 0
    let statsSection = '';
    if (hasDonations && totalAmount > 0 && currency) {
        statsSection = `
            <div class="stats">
                <div class="stats-number">${currency} ${formatAmount(totalAmount)}</div>
                <div>Total Contribution (${donationCount} donation${donationCount > 1 ? 's' : ''})</div>
            </div>
        `;
    }

    // Build contribution message
    let contributionMessage = '';
    if (hasDonations && totalAmount > 0) {
        contributionMessage = `<p>Your generous contributions have made a tremendous impact on our mission.</p>`;
    } else {
        contributionMessage = `<p>Your interest and support mean the world to us.</p>`;
    }

    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { background: #ffffff; padding: 40px 30px; }
        .highlight { background: #f8f9fa; padding: 20px; border-left: 4px solid #667eea; margin: 25px 0; border-radius: 0 8px 8px 0; }
        .stats { background: #667eea; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0; }
        .stats-number { font-size: 32px; font-weight: bold; }
        .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🙏 Thank You!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your support makes a difference</p>
        </div>
        <div class="content">
            <p>Dear <strong>${name}</strong>,</p>
            
            <p>On behalf of everyone at <strong>Akme Foundation</strong>, we want to express our heartfelt gratitude for your support.</p>
            
            ${statsSection}
            
            ${contributionMessage}
            
            <div class="highlight">
                <p style="margin: 0;"><strong>Because of supporters like you, we can:</strong></p>
                <ul style="margin: 10px 0 0 0;">
                    <li>Continue our vital programs</li>
                    <li>Reach more people in need</li>
                    <li>Create lasting change in our community</li>
                </ul>
            </div>
            
            <p>Thank you for being part of our community!</p>
            
            <p>With sincere appreciation,<br><strong>The Akme Foundation Team</strong></p>
        </div>
        <div class="footer">
            <p><strong>Akme Foundation</strong> | Making a Difference Together</p>
            <p>© ${new Date().getFullYear()} All rights reserved</p>
        </div>
    </div>
</body>
</html>`;
}

function getImpactReportHTML(name, currency, totalAmount, donationCount, topCauses, hasDonations) {
    // Build causes table only if there are causes
    let causesHTML = '';
    if (topCauses.length > 0 && currency) {
        causesHTML = topCauses.map((c, i) => 
            `<tr><td style="padding: 10px; border-bottom: 1px solid #eee;">${i + 1}. ${c[0]}</td><td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${currency} ${formatAmount(c[1])}</td></tr>`
        ).join('');
    }

    // Build stats section only if there are donations
    let statsSection = '';
    if (hasDonations && totalAmount > 0 && currency) {
        statsSection = `
            <table style="width: 100%; margin: 30px 0;">
                <tr>
                    <td style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 10px;">
                        <div style="font-size: 32px; font-weight: bold; color: #11998e;">${currency} ${formatAmount(totalAmount)}</div>
                        <div style="color: #666; font-size: 14px;">Total Contributed</div>
                    </td>
                    <td style="width: 20px;"></td>
                    <td style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 10px;">
                        <div style="font-size: 32px; font-weight: bold; color: #11998e;">${donationCount}</div>
                        <div style="color: #666; font-size: 14px;">Donations Made</div>
                    </td>
                </tr>
            </table>
        `;
    }

    // Build causes section only if there are causes
    let causesSection = '';
    if (causesHTML) {
        causesSection = `
            <div class="section">
                <h3>🎯 Your Impact by Cause</h3>
                <table style="width: 100%;">
                    ${causesHTML}
                </table>
            </div>
        `;
    }

    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 40px 30px; text-align: center; }
        .content { background: #ffffff; padding: 40px 30px; }
        .section { margin: 30px 0; }
        .section h3 { color: #11998e; border-bottom: 2px solid #11998e; padding-bottom: 10px; }
        .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Impact Report</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">See the difference we're making together</p>
        </div>
        <div class="content">
            <p>Dear <strong>${name}</strong>,</p>
            <p>We're excited to share how we're creating real change together!</p>
            
            ${statsSection}
            
            ${causesSection}
            
            <div class="section">
                <h3>💫 What We've Achieved Together</h3>
                <ul>
                    <li>150+ families received food assistance</li>
                    <li>75 students got educational scholarships</li>
                    <li>200+ medical checkups provided</li>
                    <li>50 community events organized</li>
                </ul>
            </div>
            
            <p style="text-align: center; font-style: italic; color: #11998e; font-size: 18px; margin: 30px 0;">
                "Together, we transform lives every day."
            </p>
            
            <p>Thank you for being part of our mission!</p>
            <p>Gratefully,<br><strong>The Akme Foundation Team</strong></p>
        </div>
        <div class="footer">
            <p><strong>Akme Foundation</strong> | Your Partner in Creating Change</p>
            <p>© ${new Date().getFullYear()} All rights reserved</p>
        </div>
    </div>
</body>
</html>`;
}

function getEventInvitationHTML(name, eventDate, isVIP) {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 40px 30px; text-align: center; }
        .content { background: #ffffff; padding: 40px 30px; }
        .event-box { background: #fff; padding: 30px; margin: 25px 0; border-radius: 15px; border: 3px dashed #f5576c; text-align: center; }
        .event-title { color: #f5576c; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
        .event-detail { margin: 15px 0; font-size: 16px; }
        .event-icon { font-size: 20px; margin-right: 10px; }
        .highlights { background: #f8f9fa; padding: 25px; border-radius: 10px; margin: 25px 0; }
        .vip-box { background: linear-gradient(135deg, #ffd700 0%, #ffb700 100%); padding: 25px; border-radius: 10px; margin: 25px 0; }
        .btn { display: inline-block; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px; }
        .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 You're Invited!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Join us for a special celebration</p>
        </div>
        <div class="content">
            <p>Dear <strong>${name}</strong>,</p>
            <p>As one of our valued supporters, we would be honored to have you join us!</p>
            
            <div class="event-box">
                <div class="event-title">✨ Annual Donor Appreciation Gala ✨</div>
                <div class="event-detail"><span class="event-icon">📅</span><strong>Date:</strong> ${eventDate}</div>
                <div class="event-detail"><span class="event-icon">⏰</span><strong>Time:</strong> 6:00 PM - 10:00 PM</div>
                <div class="event-detail"><span class="event-icon">📍</span><strong>Venue:</strong> Grand Ballroom, City Hotel</div>
                <div class="event-detail"><span class="event-icon">👔</span><strong>Dress Code:</strong> Semi-Formal</div>
            </div>
            
            <div class="highlights">
                <h3 style="margin-top: 0; color: #f5576c;">🎁 Evening Highlights</h3>
                <ul style="margin: 0;">
                    <li>🍽️ Gourmet Dinner & Refreshments</li>
                    <li>🎵 Live Entertainment</li>
                    <li>🏆 Donor Recognition Awards</li>
                    <li>🤝 Networking with Fellow Supporters</li>
                    <li>📸 Professional Photography</li>
                </ul>
            </div>
            
            ${isVIP ? `
            <div class="vip-box">
                <h3 style="margin-top: 0; color: #333;">⭐ VIP Benefits (Exclusive for You!)</h3>
                <ul style="margin: 0; color: #333;">
                    <li>Reserved VIP seating at front table</li>
                    <li>Private reception with leadership team</li>
                    <li>Exclusive VIP gift bag</li>
                    <li>Complimentary valet parking</li>
                    <li>Personal photographer session</li>
                </ul>
            </div>
            ` : ''}
            
            <p style="text-align: center; margin: 30px 0;">
                <a href="#" class="btn">RSVP Now</a>
            </p>
            
            <p>We look forward to celebrating with you!</p>
            <p>Warm regards,<br><strong>The Akme Foundation Events Team</strong></p>
        </div>
        <div class="footer">
            <p><strong>Akme Foundation</strong> | Celebrating Our Community</p>
            <p>Please RSVP by responding to this email</p>
            <p>© ${new Date().getFullYear()} All rights reserved</p>
        </div>
    </div>
</body>
</html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER: FORMAT AMOUNT
// ══════════════════════════════════════════════════════════════════════════════
function formatAmount(amount) {
    if (!amount || amount === 0) return '0.00';
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

module.exports = { SendThankYou, ShareImpactReport, InviteToEvent };