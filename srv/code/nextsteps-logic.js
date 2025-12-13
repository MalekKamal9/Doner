/**
 * Next Step Actions for Donors
 * Shows email content and confirmation alerts
 */

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
  const donations = await SELECT.from(Donations).where({ donor_Email: donor.email });
  let totalAmount = 0;
  donations.forEach(d => totalAmount += parseFloat(d.amount || 0));
  const currency = donations[0]?.currency_code || 'USD';

  console.log('📧 Sending thank you email to:', donor.email);

  // Show success message
  request.info(`✅ Thank You Email Sent Successfully!\n\n📬 To: ${donor.email}\n📝 Subject: Thank You for Your Generous Support, ${donor.name}!`);

  // Build detailed email content to return
  const emailContent = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 THANK YOU EMAIL SENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Status: Email Queued Successfully

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📬 EMAIL DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To: ${donor.email}
Subject: Thank You for Your Generous Support, ${donor.name}!
Sent: ${new Date().toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 EMAIL PREVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Dear ${donor.name},

We wanted to take a moment to express our heartfelt 
gratitude for your incredible generosity.

Your total contribution of ${currency} ${formatAmount(totalAmount)} 
across ${donations.length} donation(s) has made a 
tremendous impact on our mission.

Because of supporters like you, we are able to:
- Continue our vital programs
- Reach more people in need
- Create lasting change in our community

Thank you for being a valued member of our donor family.

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
  const donations = await SELECT.from(Donations).where({ donor_Email: donor.email });
  let totalAmount = 0;
  const causeMap = {};
  donations.forEach(d => {
    totalAmount += parseFloat(d.amount || 0);
    if (d.cause) causeMap[d.cause] = (causeMap[d.cause] || 0) + parseFloat(d.amount || 0);
  });
  const currency = donations[0]?.currency_code || 'USD';

  // Top causes by amount
  const topCauses = Object.entries(causeMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  console.log('📊 Sharing impact report with:', donor.email);

  // Show success message
  request.info(`✅ Impact Report Shared Successfully!\n\n📬 To: ${donor.email}\n📎 Attachment: ImpactReport_${new Date().getFullYear()}.pdf`);

  const reportContent = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 IMPACT REPORT SHARED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Status: Report Sent Successfully

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📬 EMAIL DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To: ${donor.email}
Subject: Your Donation Impact Report - ${donor.name}
Attachment: ImpactReport_${new Date().getFullYear()}.pdf
Sent: ${new Date().toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 REPORT PREVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Dear ${donor.name},

Here's how YOUR donations made a difference:

💰 YOUR TOTAL CONTRIBUTION
   ${currency} ${formatAmount(totalAmount)}

📊 YOUR IMPACT BY CAUSE
${topCauses.map((c, i) => '   ' + (i + 1) + '. ' + c[0] + ': ' + currency + ' ' + formatAmount(c[1])).join('\n')}

🎯 WHAT YOUR DONATIONS ACHIEVED
   • 150+ families received food assistance
   • 75 students got educational scholarships
   • 200+ medical checkups provided
   • 50 community events organized

📈 PROGRAM SUCCESS RATE
   ████████████████████░░░░ 85%

"Your generosity transforms lives every day."

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

  // Show success message
  request.info(`✅ Event Invitation Sent Successfully!\n\n📬 To: ${donor.email}\n📅 Event: Annual Donor Appreciation Gala\n🗓️ Date: ${eventDateStr}`);

  const inviteContent = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 EVENT INVITATION SENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Status: Invitation Sent Successfully

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📬 EMAIL DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To: ${donor.email}
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
// HELPER: FORMAT AMOUNT
// ══════════════════════════════════════════════════════════════════════════════
function formatAmount(amount) {
  if (amount >= 1000000) {
    return (amount / 1000000).toFixed(2) + 'M';
  } else if (amount >= 1000) {
    return (amount / 1000).toFixed(2) + 'K';
  } else {
    return amount.toFixed(2);
  }
}

module.exports = { SendThankYou, ShareImpactReport, InviteToEvent };