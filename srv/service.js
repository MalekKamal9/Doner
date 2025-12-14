const cds = require('@sap/cds');
const LCAPApplicationService = require('@sap/low-code-event-handler');
const donors_Logic = require('./code/donors-logic');
const action1_Logic = require('./code/action1-logic');
const { SendThankYou, InviteToEvent } = require('./code/nextsteps-logic');
const { GenerateAIImpactReport } = require('./code/impact-report-logic');
const { PredictDonationLikelihood } = require('./code/prediction-logic');
const { DetectAnomalies } = require('./code/anomaly-logic');

class donor_management_BitaSrv extends LCAPApplicationService {
    async init() {

        this.on('CREATE', 'Donors', async (request, next) => {
            return donors_Logic(request, next);
        });

        this.on('Action1', 'Donors', async (request) => {
            const result = await action1_Logic(request);
            return result;
        });

        this.on('PredictLikelihood', 'Donors', async (request) => {
            const result = await PredictDonationLikelihood(request);
            return result;
        });

        this.on('DetectAnomalies', 'Donors', async (request) => {
            const result = await DetectAnomalies(request);
            return result;
        });

        this.on('GenerateImpactReport', 'Donors', async (request) => {
            const result = await GenerateAIImpactReport(request);
            return result;
        });

        this.on('SendThankYou', 'Donors', async (request) => {
            return SendThankYou(request);
        });

        this.on('InviteToEvent', 'Donors', async (request) => {
            return InviteToEvent(request);
        });

        // ═══════════════════════════════════════════════════════════════
        // CALCULATE VIRTUAL FIELDS
        // ═══════════════════════════════════════════════════════════════
        this.after('READ', 'Donors', async (results, req) => {
            if (!results) return;
            
            const donors = Array.isArray(results) ? results : [results];
            
            const virtualFields = [
                'donationHistory', 'totalDonated', 'donationCount', 'averageDonation',
                'largestDonation', 'smallestDonation', 'daysSinceLastDonation', 'donorTier',
                'engagementScore', 'likelihoodScore', 'riskLevel', 'topCause',
                'percentOfTotal', 'yearOverYearGrowth', 'monthlyAverage',
                'lastDonationDate', 'firstDonationDate', 'currencyCode'
            ];
            
            let globalTotal = 0;
            try {
                const allDonations = await cds.run(SELECT.from('Donor_management_Bita.Donations'));
                globalTotal = allDonations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
            } catch (err) {
                console.log('Could not fetch global donations');
            }
            
            for (const donor of donors) {
                if (!donor) continue;
                
                const hasVirtualField = virtualFields.some(f => f in donor);
                if (!hasVirtualField) continue;
                
                let donorEmail = donor.email;
                let donorData = donor;
                
                if (!donorEmail && donor.ID) {
                    try {
                        const fullDonor = await cds.run(
                            SELECT.one.from('Donor_management_Bita.Donors').where({ ID: donor.ID })
                        );
                        if (fullDonor) {
                            donorEmail = fullDonor.email;
                            donorData = { ...donor, ...fullDonor };
                        }
                    } catch (err) {
                        console.log('Could not fetch donor email:', err.message);
                    }
                }
                
                if (!donorEmail) {
                    setVirtualDefaults(donor);
                    continue;
                }
                
                try {
                    const donations = await cds.run(
                        SELECT.from('Donor_management_Bita.Donations')
                            .where({ donor_Email: donorEmail })
                            .orderBy('donation_date desc')
                    );
                    
                    console.log(`📊 ${donorEmail} | ${donations.length} donations found`);
                    
                    // Debug: Log sample date formats
                    if (donations.length > 0) {
                        const sample = donations.slice(0, 3);
                        sample.forEach((d, i) => {
                            const raw = d.donation_date;
                            const parsed = parseDate(raw);
                            console.log(`🗓️ [${i}] Raw: "${raw}" → Parsed: ${parsed ? formatDateForDisplay(raw) : 'FAILED'}`);
                        });
                    }
                    
                    if (donations && donations.length > 0) {
                        calculateAndAssignAnalytics(donor, donorData, donations, globalTotal);
                    } else {
                        setVirtualDefaults(donor);
                        if ('donationHistory' in donor) {
                            donor.donationHistory = generateEmptyHistory();
                        }
                    }
                    
                } catch (err) {
                    console.log(`Error processing ${donorEmail}:`, err.message);
                    setVirtualDefaults(donor);
                }
            }
        });

        return super.init();
    }
}

// ═══════════════════════════════════════════════════════════════
// UNIVERSAL DATE PARSER - Handles ANY format automatically
// Supports: DD/MM/YY, D/M/YYYY, YYYY-MM-DD, DD.MM.YYYY, timestamps, etc.
// ═══════════════════════════════════════════════════════════════
function parseDate(dateValue) {
    if (!dateValue) return null;
    if (dateValue === 'null' || dateValue === 'undefined' || dateValue === '') return null;
    
    // If already a Date object
    if (dateValue instanceof Date) {
        return isNaN(dateValue.getTime()) ? null : dateValue;
    }
    
    // If it's a number (timestamp)
    if (typeof dateValue === 'number') {
        const date = new Date(dateValue);
        return isNaN(date.getTime()) ? null : date;
    }
    
    let dateStr = String(dateValue).trim();
    if (!dateStr) return null;
    
    // Remove any time portion (e.g., "26/08/25 10:30:00" -> "26/08/25")
    dateStr = dateStr.split(' ')[0].split('T')[0];
    
    // Detect separator: /, -, or .
    let separator = null;
    if (dateStr.includes('/')) separator = '/';
    else if (dateStr.includes('-')) separator = '-';
    else if (dateStr.includes('.')) separator = '.';
    
    if (separator) {
        const parts = dateStr.split(separator);
        
        if (parts.length === 3) {
            let day, month, year;
            
            const p0 = parseInt(parts[0], 10);
            const p1 = parseInt(parts[1], 10);
            const p2 = parseInt(parts[2], 10);
            
            if (isNaN(p0) || isNaN(p1) || isNaN(p2)) return null;
            
            // Detect format based on values and lengths
            if (parts[0].length === 4) {
                // YYYY-MM-DD or YYYY/MM/DD
                year = p0;
                month = p1;
                day = p2;
            } else if (parts[2].length === 4) {
                // DD/MM/YYYY or MM/DD/YYYY or DD.MM.YYYY
                // Assume DD/MM/YYYY (European) - detect if first value > 12
                if (p0 > 12) {
                    // Must be day (DD/MM/YYYY)
                    day = p0;
                    month = p1;
                } else if (p1 > 12) {
                    // Second must be day (MM/DD/YYYY)
                    month = p0;
                    day = p1;
                } else {
                    // Ambiguous - default to DD/MM/YYYY (European)
                    day = p0;
                    month = p1;
                }
                year = p2;
            } else {
                // Short year: DD/MM/YY or D/M/YY or MM/DD/YY
                // Assume DD/MM/YY (European) - detect if first value > 12
                if (p0 > 12) {
                    // Must be day (DD/MM/YY)
                    day = p0;
                    month = p1;
                } else if (p1 > 12) {
                    // Second must be day (MM/DD/YY)
                    month = p0;
                    day = p1;
                } else {
                    // Ambiguous - default to DD/MM/YY (European)
                    day = p0;
                    month = p1;
                }
                year = p2;
                
                // Convert 2-digit year to 4-digit
                if (year < 100) {
                    year = year > 50 ? 1900 + year : 2000 + year;
                }
            }
            
            // Validate ranges
            if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
                const date = new Date(year, month - 1, day); // JS months are 0-indexed
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
        }
    }
    
    // Try common string formats
    const formats = [
        // ISO formats
        /^(\d{4})(\d{2})(\d{2})$/, // YYYYMMDD
    ];
    
    for (const regex of formats) {
        const match = dateStr.match(regex);
        if (match) {
            const date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
            if (!isNaN(date.getTime())) return date;
        }
    }
    
    // Last resort: try native Date parsing
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
}

// ═══════════════════════════════════════════════════════════════
// FORMAT DATE FOR DISPLAY - Returns DD/MM/YYYY
// ═══════════════════════════════════════════════════════════════
function formatDateForDisplay(dateValue) {
    if (!dateValue) return 'N/A';
    
    const date = parseDate(dateValue);
    if (!date) return 'N/A';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
}

// ═══════════════════════════════════════════════════════════════
// SET VIRTUAL FIELD DEFAULTS
// ═══════════════════════════════════════════════════════════════
function setVirtualDefaults(donor) {
    if ('donationHistory' in donor) donor.donationHistory = null;
    if ('totalDonated' in donor) donor.totalDonated = 0;
    if ('donationCount' in donor) donor.donationCount = 0;
    if ('averageDonation' in donor) donor.averageDonation = 0;
    if ('largestDonation' in donor) donor.largestDonation = 0;
    if ('smallestDonation' in donor) donor.smallestDonation = 0;
    if ('daysSinceLastDonation' in donor) donor.daysSinceLastDonation = 0;
    if ('donorTier' in donor) donor.donorTier = '🌱 Prospect';
    if ('engagementScore' in donor) donor.engagementScore = 0;
    if ('likelihoodScore' in donor) donor.likelihoodScore = 0;
    if ('riskLevel' in donor) donor.riskLevel = '🔴 LOW';
    if ('topCause' in donor) donor.topCause = 'N/A';
    if ('percentOfTotal' in donor) donor.percentOfTotal = 0;
    if ('yearOverYearGrowth' in donor) donor.yearOverYearGrowth = 0;
    if ('monthlyAverage' in donor) donor.monthlyAverage = 0;
    if ('lastDonationDate' in donor) donor.lastDonationDate = null;
    if ('firstDonationDate' in donor) donor.firstDonationDate = null;
    if ('currencyCode' in donor) donor.currencyCode = 'USD';
}

// ═══════════════════════════════════════════════════════════════
// CALCULATE AND ASSIGN ANALYTICS
// ═══════════════════════════════════════════════════════════════
function calculateAndAssignAnalytics(donor, donorData, donations, globalTotal) {
    const amounts = donations.map(d => parseFloat(d.amount) || 0);
    const total = amounts.reduce((a, b) => a + b, 0);
    const count = donations.length;
    const avg = count > 0 ? total / count : 0;
    const max = amounts.length > 0 ? Math.max(...amounts) : 0;
    const min = amounts.length > 0 ? Math.min(...amounts) : 0;
    const currency = donations[0]?.currency_code || 'USD';
    
    if ('totalDonated' in donor) donor.totalDonated = total;
    if ('donationCount' in donor) donor.donationCount = count;
    if ('averageDonation' in donor) donor.averageDonation = avg;
    if ('largestDonation' in donor) donor.largestDonation = max;
    if ('smallestDonation' in donor) donor.smallestDonation = min;
    if ('currencyCode' in donor) donor.currencyCode = currency;
    
    // Parse all dates - keep ALL donations, even those without valid dates
    const allDonationsWithParsedDates = donations.map(d => ({ 
        ...d, 
        parsedDate: parseDate(d.donation_date) 
    }));
    
    // Separate donations with valid dates for sorting/finding first/last
    const donationsWithValidDates = allDonationsWithParsedDates
        .filter(d => d.parsedDate !== null)
        .sort((a, b) => b.parsedDate - a.parsedDate); // Newest first
    
    const lastDateParsed = donationsWithValidDates.length > 0 ? donationsWithValidDates[0].parsedDate : null;
    const firstDateParsed = donationsWithValidDates.length > 0 ? donationsWithValidDates[donationsWithValidDates.length - 1].parsedDate : null;
    
    if ('lastDonationDate' in donor) {
        donor.lastDonationDate = lastDateParsed ? lastDateParsed.toISOString().split('T')[0] : null;
    }
    if ('firstDonationDate' in donor) {
        donor.firstDonationDate = firstDateParsed ? firstDateParsed.toISOString().split('T')[0] : null;
    }
    
    // Days Since Last Donation
    let daysSince = 0;
    if (lastDateParsed) {
        const today = new Date();
        daysSince = Math.floor((today - lastDateParsed) / (1000 * 60 * 60 * 24));
    }
    if ('daysSinceLastDonation' in donor) donor.daysSinceLastDonation = Math.max(0, daysSince);
    
    // Percentage of Total
    if ('percentOfTotal' in donor) {
        donor.percentOfTotal = globalTotal > 0 ? Math.round((total / globalTotal) * 10000) / 100 : 0;
    }
    
    // Year over Year Growth - use donations with valid dates
    if ('yearOverYearGrowth' in donor) {
        const yearlyAmounts = {};
        allDonationsWithParsedDates.forEach(d => {
            if (d.parsedDate) {
                const year = d.parsedDate.getFullYear();
                yearlyAmounts[year] = (yearlyAmounts[year] || 0) + (parseFloat(d.amount) || 0);
            }
        });
        const years = Object.keys(yearlyAmounts).sort((a, b) => b - a);
        if (years.length >= 2) {
            const current = yearlyAmounts[years[0]];
            const previous = yearlyAmounts[years[1]];
            donor.yearOverYearGrowth = previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;
        } else {
            donor.yearOverYearGrowth = 0;
        }
    }
    
    // Monthly Average - use donations with valid dates
    if ('monthlyAverage' in donor) {
        const uniqueMonths = new Set();
        allDonationsWithParsedDates.forEach(d => {
            if (d.parsedDate) {
                uniqueMonths.add(`${d.parsedDate.getFullYear()}-${d.parsedDate.getMonth()}`);
            }
        });
        donor.monthlyAverage = uniqueMonths.size > 0 ? total / uniqueMonths.size : 0;
    }
    
    // Donor Tier
    if ('donorTier' in donor) {
        if (total >= 100000) donor.donorTier = '💎 Diamond';
        else if (total >= 50000) donor.donorTier = '🏆 Platinum';
        else if (total >= 25000) donor.donorTier = '🥇 Gold';
        else if (total >= 10000) donor.donorTier = '🥈 Silver';
        else if (total >= 5000) donor.donorTier = '🥉 Bronze';
        else if (total > 0) donor.donorTier = '⭐ Supporter';
        else donor.donorTier = '🌱 Prospect';
    }
    
    // Engagement Score
    if ('engagementScore' in donor) {
        let engagement = 0;
        if (donorData.isHNI) engagement += 30;
        if (donorData.isRecurringDonor) engagement += 25;
        if (donorData.status) engagement += 15;
        if (count >= 10) engagement += 15;
        else if (count >= 5) engagement += 10;
        else if (count >= 2) engagement += 5;
        if (daysSince < 90) engagement += 15;
        else if (daysSince < 180) engagement += 10;
        else if (daysSince < 365) engagement += 5;
        donor.engagementScore = Math.min(100, engagement);
    }
    
    // Likelihood Score
    if ('likelihoodScore' in donor) {
        let likelihood = 0;
        if (daysSince <= 30) likelihood += 25;
        else if (daysSince <= 90) likelihood += 20;
        else if (daysSince <= 180) likelihood += 15;
        else if (daysSince <= 365) likelihood += 8;
        if (count >= 10) likelihood += 20;
        else if (count >= 5) likelihood += 15;
        else if (count >= 2) likelihood += 10;
        if (donorData.isRecurringDonor) likelihood += 15;
        if (donorData.isHNI) likelihood += 10;
        if (avg >= 1000) likelihood += 10;
        else if (avg >= 500) likelihood += 5;
        donor.likelihoodScore = Math.min(100, likelihood);
    }
    
    // Risk Level
    if ('riskLevel' in donor) {
        const likelihood = donor.likelihoodScore || 0;
        if (likelihood >= 70) donor.riskLevel = '🟢 HIGH';
        else if (likelihood >= 40) donor.riskLevel = '🟡 MEDIUM';
        else donor.riskLevel = '🔴 LOW';
    }
    
    // Top Cause
    if ('topCause' in donor) {
        const causes = {};
        donations.forEach(d => {
            if (d.cause) causes[d.cause] = (causes[d.cause] || 0) + (parseFloat(d.amount) || 0);
        });
        const sortedCauses = Object.entries(causes).sort((a, b) => b[1] - a[1]);
        donor.topCause = sortedCauses.length > 0 ? sortedCauses[0][0] : 'N/A';
    }
    
    // History Table - pass ALL donations
    if ('donationHistory' in donor) {
        // Sort all donations: those with dates first (newest), then those without dates
        const sortedAll = [...allDonationsWithParsedDates].sort((a, b) => {
            if (a.parsedDate && b.parsedDate) return b.parsedDate - a.parsedDate;
            if (a.parsedDate) return -1;
            if (b.parsedDate) return 1;
            return 0;
        });
        donor.donationHistory = generateHistoryTable(sortedAll, total, count, avg, max, currency);
    }
    
    console.log(`✅ Total=${total}, Count=${count}, Tier=${donor.donorTier || 'N/A'}, LastDate=${donor.lastDonationDate || 'N/A'}`);
}

// ═══════════════════════════════════════════════════════════════
// GENERATE DONATION HISTORY TABLE - Shows ALL donations
// ═══════════════════════════════════════════════════════════════
function generateHistoryTable(allDonations, total, count, avg, max, currency) {
    const c = currency;
    
    let table = `
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                                    📜 DONATION HISTORY                                   ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝

    ╔═══════════════════════════════════════════════════════════════════════════════════╗
    ║  📊 SUMMARY                                                                       ║
    ╠═══════════════════════════════════════════════════════════════════════════════════╣
    ║  💰 Total Contributed:  ${padR(c + ' ' + fmtNum(total), 55)}║
    ║  📊 Total Donations:    ${padR(count.toString(), 55)}║
    ║  📈 Average Gift:       ${padR(c + ' ' + fmtNum(avg), 55)}║
    ║  🏆 Largest Gift:       ${padR(c + ' ' + fmtNum(max), 55)}║
    ╚═══════════════════════════════════════════════════════════════════════════════════╝

    ┌────────────┬────────────────┬──────────────────────────────┬────────────────────┐
    │    DATE    │     AMOUNT     │          CAMPAIGN            │       CAUSE        │
    ├────────────┼────────────────┼──────────────────────────────┼────────────────────┤
`;
    
    // Show ALL donations (up to 20)
    allDonations.slice(0, 20).forEach(d => {
        const dateDisplay = d.parsedDate ? formatDateFromParsed(d.parsedDate) : (d.donation_date || 'N/A');
        const amount = c + ' ' + fmtNum(parseFloat(d.amount) || 0);
        const campaign = trunc(d.campaign || 'N/A', 28);
        const cause = trunc(d.cause || 'N/A', 18);
        
        table += `    │ ${padR(dateDisplay, 10)} │ ${padL(amount, 14)} │ ${padR(campaign, 28)} │ ${padR(cause, 18)} │\n`;
    });
    
    if (allDonations.length > 20) {
        table += `    ├────────────┴────────────────┴──────────────────────────────┴────────────────────┤\n`;
        table += `    │  ... and ${allDonations.length - 20} more donations                                                    │\n`;
    }
    
    table += `    └───────────────────────────────────────────────────────────────────────────────────┘
`;
    
    return table;
}

// Format date from already-parsed Date object
function formatDateFromParsed(date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return 'N/A';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
}

function generateEmptyHistory() {
    return `
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                                    📜 DONATION HISTORY                                   ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝

    ╔═══════════════════════════════════════════════════════════════════════════════════╗
    ║                         No donation history available.                            ║
    ║                    This donor has not made any donations yet.                     ║
    ╚═══════════════════════════════════════════════════════════════════════════════════╝
`;
}

function fmtNum(num) {
    if (num === null || num === undefined || isNaN(num)) return '0.00';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function padR(str, len) {
    str = String(str || '');
    while (str.length < len) str += ' ';
    return str.substring(0, len);
}

function padL(str, len) {
    str = String(str || '');
    while (str.length < len) str = ' ' + str;
    return str.substring(0, len);
}

function trunc(str, len) {
    str = String(str || '');
    if (str.length > len) return str.substring(0, len - 3) + '...';
    return str;
}

module.exports = { donor_management_BitaSrv };
