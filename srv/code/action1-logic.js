/**
 * Action1 - Generate AI Donor Summary
 * @On(event = { "Action1" }, entity = "donor_management_BitaSrv.Donors")
 * @param {cds.Request} request
 */
async function Action1(request) {
  
  const { Donors, Donations } = cds.entities('Donor_management_Bita');
  
  // ── Get Donor ID from Request ──
  const donorId = request.params[0]?.ID || request.params[0];
  
  if (!donorId) {
    request.error(400, 'Donor ID is required');
    return;
  }

  try {
    // ══════════════════════════════════════════════════════════════════════
    // READ DONOR FROM DATABASE
    // ══════════════════════════════════════════════════════════════════════
    const donor = await SELECT.one.from(Donors).where({ ID: donorId });
    
    if (!donor) {
      return 'Donor not found.';
    }

    // ══════════════════════════════════════════════════════════════════════
    // READ DONATIONS FROM DATABASE
    // ══════════════════════════════════════════════════════════════════════
    const donations = await SELECT.from(Donations)
      .where({ donor_Email: donor.email })
      .orderBy({ donation_date: 'desc' });

    // ══════════════════════════════════════════════════════════════════════
    // BUILD SUMMARY STRING
    // ══════════════════════════════════════════════════════════════════════
    const summaryString = buildSummaryString(donor, donations);

    // ══════════════════════════════════════════════════════════════════════
    // UPDATE DONOR RECORD WITH SUMMARY
    // ══════════════════════════════════════════════════════════════════════
    await UPDATE(Donors).set({ summary: summaryString }).where({ ID: donorId });

    // ══════════════════════════════════════════════════════════════════════
    // RETURN STRING RESULT TO UI
    // ══════════════════════════════════════════════════════════════════════
    return summaryString;

  } catch (error) {
    console.error('Action1 Error:', error);
    request.error(500, 'Failed to generate summary: ' + error.message);
  }
}


// ══════════════════════════════════════════════════════════════════════════════
// HELPER: Build Summary String
// ══════════════════════════════════════════════════════════════════════════════
function buildSummaryString(donor, donations) {
  
  // No donations
  if (!donations || donations.length === 0) {
    return donor.name + ' is a registered donor with no donation history yet.';
  }

  // ── Calculate Total Amount ──
  let totalAmount = 0;
  for (let i = 0; i < donations.length; i++) {
    totalAmount = totalAmount + parseFloat(donations[i].amount || 0);
  }
  
  const donationCount = donations.length;
  const primaryCurrency = donations[0].currency_code || 'USD';

  // ── Calculate Date Range ──
  const dates = [];
  for (let i = 0; i < donations.length; i++) {
    if (donations[i].donation_date) {
      dates.push(new Date(donations[i].donation_date));
    }
  }
  
  let firstDonation = null;
  let lastDonation = null;
  let yearsOfGiving = 1;
  
  if (dates.length > 0) {
    firstDonation = new Date(Math.min.apply(null, dates));
    lastDonation = new Date(Math.max.apply(null, dates));
    const diffMs = lastDonation - firstDonation;
    yearsOfGiving = Math.max(1, Math.ceil(diffMs / (365 * 24 * 60 * 60 * 1000)));
  }

  // ── Get Unique Campaigns and Causes ──
  const campaignSet = {};
  const causeSet = {};
  for (let i = 0; i < donations.length; i++) {
    if (donations[i].campaign) {
      campaignSet[donations[i].campaign] = true;
    }
    if (donations[i].cause) {
      causeSet[donations[i].cause] = true;
    }
  }
  const campaigns = Object.keys(campaignSet);
  const causes = Object.keys(causeSet);

  // ── Format Amounts ──
  const formattedAmount = formatAmount(totalAmount, primaryCurrency);
  const avgAmount = formatAmount(totalAmount / donationCount, primaryCurrency);

  // ── Analyze Pattern ──
  const seasonalPattern = analyzeSeasonalPattern(donations);

  // ── Time Since Last Donation ──
  const timeSinceLast = getTimeSinceLastDonation(lastDonation);

  // ══════════════════════════════════════════════════════════════════════════
  // BUILD THE STRING
  // ══════════════════════════════════════════════════════════════════════════
  
  let summary = '';
  
  // Main line
  summary = summary + donor.name + ' has contributed ' + formattedAmount;
  
  if (donationCount > 1) {
    summary = summary + ' across ' + donationCount + ' donations';
    if (yearsOfGiving > 1) {
      summary = summary + ' over ' + yearsOfGiving + ' years';
    }
  }
  summary = summary + '. ';

  // Campaigns
  if (campaigns.length === 1) {
    summary = summary + 'Primary campaign: "' + campaigns[0] + '". ';
  } else if (campaigns.length > 1) {
    summary = summary + 'Supported campaigns: ' + campaigns.slice(0, 3).join(', ') + '. ';
  }

  // Causes
  if (causes.length > 0 && causes.length <= 3) {
    summary = summary + 'Focused on: ' + causes.join(', ') + '. ';
  }

  // Seasonal pattern
  if (seasonalPattern) {
    summary = summary + seasonalPattern + ' ';
  }

  // Average
  if (donationCount > 2) {
    summary = summary + 'Average donation: ' + avgAmount + '. ';
  }

  // Last donation
  if (timeSinceLast) {
    summary = summary + 'Last donation was ' + timeSinceLast + '. ';
  }

  // Flags
  if (donor.isHNI) {
    summary = summary + 'High Net-worth Individual. ';
  }
  if (donor.isRecurringDonor) {
    summary = summary + 'Recurring donor. ';
  }

  return summary.trim();
}


// ══════════════════════════════════════════════════════════════════════════════
// HELPER: Format Amount
// ══════════════════════════════════════════════════════════════════════════════
function formatAmount(amount, currency) {
  const symbols = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'BHD': 'BD ',
    'SAR': 'SAR ',
    'AED': 'AED ',
    'KWD': 'KD ',
    'QAR': 'QAR '
  };
  
  const symbol = symbols[currency] || currency + ' ';
  
  if (amount >= 1000000) {
    return symbol + (amount / 1000000).toFixed(1) + ' Million';
  } else if (amount >= 1000) {
    return symbol + Math.round(amount / 1000) + ' Thousand';
  } else {
    return symbol + amount.toFixed(2);
  }
}


// ══════════════════════════════════════════════════════════════════════════════
// HELPER: Time Since Last Donation
// ══════════════════════════════════════════════════════════════════════════════
function getTimeSinceLastDonation(lastDate) {
  if (!lastDate) {
    return null;
  }
  
  const now = new Date();
  const diffMs = now - lastDate;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 7) {
    return 'this week';
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks + ' week' + (weeks > 1 ? 's' : '') + ' ago';
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return months + ' month' + (months > 1 ? 's' : '') + ' ago';
  } else {
    const years = Math.floor(diffDays / 365);
    return years + ' year' + (years > 1 ? 's' : '') + ' ago';
  }
}


// ══════════════════════════════════════════════════════════════════════════════
// HELPER: Seasonal Pattern
// ══════════════════════════════════════════════════════════════════════════════
function analyzeSeasonalPattern(donations) {
  if (donations.length < 3) {
    return null;
  }
  
  const monthCounts = {};
  
  for (let i = 0; i < donations.length; i++) {
    if (donations[i].donation_date) {
      const month = new Date(donations[i].donation_date).getMonth() + 1;
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    }
  }
  
  // Holiday season check (Nov-Dec)
  const holidayCount = (monthCounts[11] || 0) + (monthCounts[12] || 0);
  const holidayPercent = holidayCount / donations.length;
  
  if (holidayPercent > 0.4) {
    return 'Mainly donates during holiday/festival season.';
  }
  
  // Ramadan check (Mar-Apr)
  const ramadanCount = (monthCounts[3] || 0) + (monthCounts[4] || 0);
  const ramadanPercent = ramadanCount / donations.length;
  
  if (ramadanPercent > 0.4) {
    return 'Primarily donates during Ramadan season.';
  }
  
  // Year-round check
  const monthsActive = Object.keys(monthCounts).length;
  if (monthsActive >= 6) {
    return 'Donates consistently throughout the year.';
  }
  
  return null;
}


// ══════════════════════════════════════════════════════════════════════════════
// EXPORT - This is the key fix!
// ══════════════════════════════════════════════════════════════════════════════
module.exports = Action1;