/**
 * @On(event = { "Action1" }, entity = "donor_management_BitaSrv.Donors")
 * @param {cds.Request} request
 */
async function Action1(request) {
  
  const { Donors, Donations } = cds.entities('Donor_management_Bita');
  
  const donorId = request.params[0]?.ID || request.params[0];
  
  if (!donorId) {
    request.error(400, 'Donor ID is required.');
    return;
  }

  const donor = await SELECT.one.from(Donors).where({ ID: donorId });
  
  if (!donor) {
    request.error(404, 'Donor not found.');
    return;
  }

  const donations = await SELECT.from(Donations)
    .where({ donor_Email: donor.email })
    .orderBy({ donation_date: 'desc' });

  console.log('Donor:', donor.name);
  console.log('Donations count:', donations.length);

  const generatedSummary = generateProfessionalSummary(donor, donations);

  await UPDATE(Donors).set({ summary: generatedSummary }).where({ ID: donorId });
  
  console.log('Summary saved to database');

  request.info(`✅ AI Summary Generated Successfully!\n\n👤 Donor: ${donor.name}\n📧 Email: ${donor.email}\n📊 Donations Analyzed: ${donations.length}\n\nRefresh the page to see the full summary.`);

  return generatedSummary;
}

function generateProfessionalSummary(donor, donations) {
  
  if (!donations || donations.length === 0) {
    return '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
           '📋 DONOR PROFILE SUMMARY\n' +
           '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
           '👤 Donor: ' + donor.name + '\n' +
           '📧 Email: ' + donor.email + '\n' +
           '📱 Phone: ' + (donor.phone || 'Not provided') + '\n\n' +
           '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
           '📊 DONATION STATISTICS\n' +
           '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
           'No donation history yet.\n\n' +
           '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
           '📌 RECOMMENDED ACTIONS\n' +
           '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
           '1. Send welcome email\n' +
           '2. Share organization brochure\n' +
           '3. Invite to upcoming events';
  }

  // Calculate statistics
  let totalAmount = 0;
  let minAmount = Infinity;
  let maxAmount = 0;
  const campaignMap = {};
  const causeMap = {};
  const yearMap = {};
  const monthMap = {};
  
  donations.forEach(function(d) {
    const amt = parseFloat(d.amount || 0);
    totalAmount += amt;
    if (amt < minAmount) minAmount = amt;
    if (amt > maxAmount) maxAmount = amt;
    
    if (d.campaign) {
      campaignMap[d.campaign] = (campaignMap[d.campaign] || 0) + 1;
    }
    if (d.cause) {
      causeMap[d.cause] = (causeMap[d.cause] || 0) + 1;
    }
    if (d.donation_date) {
      const year = new Date(d.donation_date).getFullYear();
      const month = new Date(d.donation_date).getMonth();
      yearMap[year] = (yearMap[year] || 0) + amt;
      monthMap[month] = (monthMap[month] || 0) + 1;
    }
  });
  
  const currency = donations[0].currency_code || 'USD';
  const avgAmount = totalAmount / donations.length;
  
  // Top campaigns
  const topCampaigns = Object.entries(campaignMap)
    .sort(function(a, b) { return b[1] - a[1]; })
    .slice(0, 5);
  
  // Top causes
  const topCauses = Object.entries(causeMap)
    .sort(function(a, b) { return b[1] - a[1]; })
    .slice(0, 5);

  // Peak month
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const peakMonthEntry = Object.entries(monthMap).sort(function(a, b) { return b[1] - a[1]; })[0];
  const peakMonth = peakMonthEntry ? monthNames[parseInt(peakMonthEntry[0])] : 'N/A';

  // Years active
  const years = Object.keys(yearMap).sort();
  const yearsActive = years.length > 0 ? years[0] + ' - ' + years[years.length - 1] : 'N/A';

  // First and last donation
  const firstDonation = donations[donations.length - 1];
  const lastDonation = donations[0];

  // Build summary (without donation history table - it's now separate)
  let summary = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  summary += '📋 DONOR PROFILE SUMMARY\n';
  summary += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
  
  summary += '👤 Donor: ' + donor.name + '\n';
  summary += '📧 Email: ' + donor.email + '\n';
  summary += '📱 Phone: ' + (donor.phone || 'Not provided') + '\n';
  summary += '🏷️ Status: ' + (donor.status ? '✅ Active' : '❌ Inactive') + '\n';
  if (donor.isHNI) summary += '⭐ VIP / High Net-worth Individual\n';
  if (donor.isRecurringDonor) summary += '🔄 Recurring Donor\n';
  
  summary += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  summary += '📊 DONATION STATISTICS\n';
  summary += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
  
  summary += '💰 Total Contributed: ' + currency + ' ' + formatAmount(totalAmount) + '\n';
  summary += '📝 Total Donations: ' + donations.length + '\n';
  summary += '📈 Average Donation: ' + currency + ' ' + formatAmount(avgAmount) + '\n';
  summary += '⬆️ Largest Gift: ' + currency + ' ' + formatAmount(maxAmount) + '\n';
  summary += '⬇️ Smallest Gift: ' + currency + ' ' + formatAmount(minAmount) + '\n';
  summary += '📅 Giving Period: ' + yearsActive + '\n';
  summary += '🗓️ Peak Giving Month: ' + peakMonth + '\n';
  
  summary += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  summary += '🎯 TOP CAMPAIGNS (' + topCampaigns.length + ')\n';
  summary += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
  
  topCampaigns.forEach(function(c, i) {
    summary += (i + 1) + '. ' + c[0] + ' (' + c[1] + ' donations)\n';
  });

  summary += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  summary += '❤️ TOP CAUSES (' + topCauses.length + ')\n';
  summary += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  topCauses.forEach(function(c, i) {
    summary += (i + 1) + '. ' + c[0] + ' (' + c[1] + ' donations)\n';
  });

  summary += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  summary += '📆 DONATION TIMELINE\n';
  summary += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
  
  summary += '🟢 First Donation: ' + firstDonation.donation_date + ' - ' + currency + ' ' + formatAmount(parseFloat(firstDonation.amount)) + '\n';
  summary += '🔵 Last Donation: ' + lastDonation.donation_date + ' - ' + currency + ' ' + formatAmount(parseFloat(lastDonation.amount)) + '\n';

  summary += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  summary += '📈 YEARLY BREAKDOWN\n';
  summary += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  Object.entries(yearMap)
    .sort(function(a, b) { return b[0] - a[0]; })
    .forEach(function(entry) {
      summary += entry[0] + ': ' + currency + ' ' + formatAmount(entry[1]) + '\n';
    });

  summary += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  summary += '📌 RECOMMENDED NEXT STEPS\n';
  summary += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
  
  summary += '1️⃣ Send personalized thank you message\n';
  summary += '2️⃣ Share impact report with donation results\n';
  summary += '3️⃣ Invite to donor appreciation event\n';

  if (donor.isHNI) {
    summary += '4️⃣ Schedule personal meeting for major gift\n';
    summary += '5️⃣ Consider naming opportunity recognition\n';
  }

  if (donor.isRecurringDonor) {
    summary += '4️⃣ Send loyalty appreciation gift\n';
    summary += '5️⃣ Offer upgrade to higher giving level\n';
  }

  // Days since last donation alert
  const daysSinceLast = Math.floor((new Date() - new Date(lastDonation.donation_date)) / (1000 * 60 * 60 * 24));
  if (daysSinceLast > 180) {
    summary += '\n⚠️ ALERT: ' + daysSinceLast + ' days since last donation - Consider re-engagement campaign';
  }

  summary += '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  summary += '🤖 Generated on: ' + new Date().toLocaleString() + '\n';
  summary += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  return summary;
}

function formatAmount(amount) {
  if (amount >= 1000000) {
    return (amount / 1000000).toFixed(2) + 'M';
  } else if (amount >= 1000) {
    return (amount / 1000).toFixed(2) + 'K';
  } else {
    return amount.toFixed(2);
  }
}

module.exports = Action1;