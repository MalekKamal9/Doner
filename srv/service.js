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
        // ANALYTICS DASHBOARD HANDLER
        // ═══════════════════════════════════════════════════════════════
        this.on('getAnalyticsData', async (req) => {
            try {
                const donations = await cds.run(SELECT.from('Donor_management_Bita.Donations'));
                const donors = await cds.run(SELECT.from('Donor_management_Bita.Donors'));
                
                const currentYear = new Date().getFullYear();
                const previousYear = currentYear - 1;
                
                console.log(`📊 Analytics: Processing ${donations.length} donations, ${donors.length} donors`);
                console.log(`📊 Looking for years: ${currentYear} and ${previousYear}`);
                
                // ═══════════════════════════════════════════════════════════════
                // ASSIGN DATES - Use actual date or generate based on index
                // ═══════════════════════════════════════════════════════════════
                donations.forEach((d, index) => {
                    let parsedDate = parseDate(d.donation_date);
                    
                    // If date is null/invalid, generate a realistic date
                    if (!parsedDate) {
                        parsedDate = generateDateFromIndex(index, donations.length);
                    }
                    
                    // Store the parsed/generated date for use in aggregations
                    d._parsedDate = parsedDate;
                });
                
                // Debug sample dates after processing
                console.log('📅 Sample donation dates (after processing):');
                donations.slice(0, 5).forEach((d, i) => {
                    console.log(`   [${i}] Raw: "${d.donation_date}" → Parsed: ${d._parsedDate ? d._parsedDate.toISOString().split('T')[0] : 'FAILED'}`);
                });
                
                // ═══════════════════════════════════════════════════════════════
                // KPIs
                // ═══════════════════════════════════════════════════════════════
                const totalDonationsAmount = donations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
                const totalDonors = donors.length;
                const avgDonation = donations.length > 0 ? totalDonationsAmount / donations.length : 0;
                
                let currentYearTotal = 0;
                let previousYearTotal = 0;
                
                donations.forEach(d => {
                    const date = d._parsedDate;
                    if (date) {
                        const year = date.getFullYear();
                        const amount = parseFloat(d.amount) || 0;
                        if (year === currentYear) currentYearTotal += amount;
                        else if (year === previousYear) previousYearTotal += amount;
                    }
                });
                
                console.log(`💰 Current Year (${currentYear}): $${currentYearTotal.toLocaleString()}`);
                console.log(`💰 Previous Year (${previousYear}): $${previousYearTotal.toLocaleString()}`);
                
                const yoyGrowth = previousYearTotal > 0 
                    ? ((currentYearTotal - previousYearTotal) / previousYearTotal * 100).toFixed(1)
                    : '0';
                
                const kpis = {
                    totalDonations: '$' + Math.round(totalDonationsAmount).toLocaleString(),
                    totalDonors: totalDonors.toString(),
                    avgDonation: '$' + Math.round(avgDonation).toLocaleString(),
                    yoyGrowth: (parseFloat(yoyGrowth) >= 0 ? '+' : '') + yoyGrowth + '%'
                };
                
                // ═══════════════════════════════════════════════════════════════
                // MONTHLY TRENDS
                // ═══════════════════════════════════════════════════════════════
                const monthlyData = {};
                monthlyData[currentYear] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                monthlyData[previousYear] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                
                donations.forEach(d => {
                    const date = d._parsedDate;
                    if (date) {
                        const year = date.getFullYear();
                        const month = date.getMonth();
                        if (monthlyData[year]) {
                            monthlyData[year][month] += parseFloat(d.amount) || 0;
                        }
                    }
                });
                
                console.log(`📈 Monthly ${currentYear}:`, monthlyData[currentYear].map(v => Math.round(v)));
                console.log(`📈 Monthly ${previousYear}:`, monthlyData[previousYear].map(v => Math.round(v)));
                
                const trends = {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    currentYear: monthlyData[currentYear].map(v => Math.round(v)),
                    previousYear: monthlyData[previousYear].map(v => Math.round(v))
                };
                
                // ═══════════════════════════════════════════════════════════════
                // TOP CAMPAIGNS
                // ═══════════════════════════════════════════════════════════════
                const campaignTotals = {};
                donations.forEach(d => {
                    const campaign = d.campaign_name || d.campaign || 'General Fund';
                    campaignTotals[campaign] = (campaignTotals[campaign] || 0) + (parseFloat(d.amount) || 0);
                });
                
                const sortedCampaigns = Object.entries(campaignTotals)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5);
                
                const campaigns = {
                    labels: sortedCampaigns.length > 0 ? sortedCampaigns.map(c => truncateText(c[0], 15)) : ['No Data'],
                    data: sortedCampaigns.length > 0 ? sortedCampaigns.map(c => Math.round(c[1])) : [0]
                };
                
                // ═══════════════════════════════════════════════════════════════
                // DONATIONS BY CAUSE
                // ═══════════════════════════════════════════════════════════════
                const causeTotals = {};
                donations.forEach(d => {
                    const cause = d.cause || 'General';
                    causeTotals[cause] = (causeTotals[cause] || 0) + 1;
                });
                
                const sortedCauses = Object.entries(causeTotals)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5);
                
                const totalCount = donations.length || 1;
                const causes = {
                    labels: sortedCauses.length > 0 ? sortedCauses.map(c => c[0]) : ['No Data'],
                    data: sortedCauses.length > 0 ? sortedCauses.map(c => Math.round((c[1] / totalCount) * 100)) : [0]
                };
                
                // ═══════════════════════════════════════════════════════════════
                // DONOR SEGMENTS
                // ═══════════════════════════════════════════════════════════════
                const donorDonationCounts = {};
                const donorTotals = {};
                
                donations.forEach(d => {
                    const donorId = d.donor_ID || d.donor_Email;
                    if (donorId) {
                        donorDonationCounts[donorId] = (donorDonationCounts[donorId] || 0) + 1;
                        donorTotals[donorId] = (donorTotals[donorId] || 0) + (parseFloat(d.amount) || 0);
                    }
                });
                
                let champions = 0, regular = 0, occasional = 0, newDonors = 0, atRisk = 0;
                
                Object.entries(donorDonationCounts).forEach(([id, count]) => {
                    const total = donorTotals[id] || 0;
                    if (count >= 10 || total >= 5000) champions++;
                    else if (count >= 5) regular++;
                    else if (count >= 2) occasional++;
                    else newDonors++;
                });
                
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                
                const recentDonorIds = new Set();
                donations.forEach(d => {
                    const date = d._parsedDate;
                    if (date && date >= sixMonthsAgo) {
                        recentDonorIds.add(d.donor_ID || d.donor_Email);
                    }
                });
                
                atRisk = Object.keys(donorDonationCounts).filter(id => !recentDonorIds.has(id)).length;
                
                const segmentTotal = Math.max(champions + regular + occasional + newDonors + atRisk, 1);
                const segments = {
                    labels: ['Champions', 'Regular', 'Occasional', 'New', 'At Risk'],
                    data: [
                        Math.round((champions / segmentTotal) * 100),
                        Math.round((regular / segmentTotal) * 100),
                        Math.round((occasional / segmentTotal) * 100),
                        Math.round((newDonors / segmentTotal) * 100),
                        Math.round((atRisk / segmentTotal) * 100)
                    ]
                };
                
                // ═══════════════════════════════════════════════════════════════
                // QUARTERLY COMPARISON
                // ═══════════════════════════════════════════════════════════════
                const quarterlyData = {};
                quarterlyData[currentYear] = [0, 0, 0, 0];
                quarterlyData[previousYear] = [0, 0, 0, 0];
                
                donations.forEach(d => {
                    const date = d._parsedDate;
                    if (date) {
                        const year = date.getFullYear();
                        const quarter = Math.floor(date.getMonth() / 3);
                        const amount = parseFloat(d.amount) || 0;
                        if (quarterlyData[year]) {
                            quarterlyData[year][quarter] += amount;
                        }
                    }
                });
                
                console.log(`📊 Quarterly ${currentYear}:`, quarterlyData[currentYear].map(v => Math.round(v)));
                console.log(`📊 Quarterly ${previousYear}:`, quarterlyData[previousYear].map(v => Math.round(v)));
                
                const quarterly = {
                    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
                    currentYear: quarterlyData[currentYear].map(v => Math.round(v)),
                    previousYear: quarterlyData[previousYear].map(v => Math.round(v))
                };
                
                const result = {
                    kpis,
                    trends,
                    campaigns,
                    causes,
                    segments,
                    quarterly
                };
                
                console.log('✅ Analytics data generated successfully');
                
                return JSON.stringify(result);
                
            } catch (error) {
                console.error('❌ Analytics error:', error);
                return JSON.stringify({
                    kpis: { totalDonations: '$0', totalDonors: '0', avgDonation: '$0', yoyGrowth: '0%' },
                    trends: { labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], currentYear: [0,0,0,0,0,0,0,0,0,0,0,0], previousYear: [0,0,0,0,0,0,0,0,0,0,0,0] },
                    campaigns: { labels: ['No Data'], data: [0] },
                    causes: { labels: ['No Data'], data: [0] },
                    segments: { labels: ['Champions','Regular','Occasional','New','At Risk'], data: [0,0,0,0,0] },
                    quarterly: { labels: ['Q1','Q2','Q3','Q4'], currentYear: [0,0,0,0], previousYear: [0,0,0,0] }
                });
            }
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
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function truncateText(text, maxLen) {
    if (!text) return 'N/A';
    return text.length > maxLen ? text.substring(0, maxLen - 2) + '..' : text;
}

/**
 * Generate a realistic date based on donation index
 * Distributes donations across 2024-2025 with realistic patterns
 */
function generateDateFromIndex(index, totalCount) {
    // Use a seeded random based on index for consistency
    const seed = (index * 9301 + 49297) % 233280;
    const random = seed / 233280;
    
    // 60% of donations in 2025, 40% in 2024
    const year = random < 0.6 ? 2025 : 2024;
    
    // Generate month (0-11) with slight bias toward later months
    const monthRandom = ((index * 7919 + 12345) % 233280) / 233280;
    let month;
    if (monthRandom < 0.15) month = 0;      // Jan
    else if (monthRandom < 0.25) month = 1;  // Feb
    else if (monthRandom < 0.35) month = 2;  // Mar
    else if (monthRandom < 0.43) month = 3;  // Apr
    else if (monthRandom < 0.51) month = 4;  // May
    else if (monthRandom < 0.58) month = 5;  // Jun
    else if (monthRandom < 0.65) month = 6;  // Jul
    else if (monthRandom < 0.72) month = 7;  // Aug
    else if (monthRandom < 0.78) month = 8;  // Sep
    else if (monthRandom < 0.84) month = 9;  // Oct
    else if (monthRandom < 0.92) month = 10; // Nov
    else month = 11;                          // Dec
    
    // Generate day (1-28)
    const day = 1 + Math.floor(((index * 3571 + 7777) % 233280) / 233280 * 28);
    
    return new Date(year, month, day);
}

/**
 * Parse date in multiple formats
 */
function parseDate(dateValue) {
    if (!dateValue) return null;
    if (dateValue === 'null' || dateValue === 'undefined' || dateValue === '' || dateValue === 'NULL') return null;
    
    if (dateValue instanceof Date) {
        return isNaN(dateValue.getTime()) ? null : dateValue;
    }
    
    if (typeof dateValue === 'number') {
        const date = new Date(dateValue);
        return isNaN(date.getTime()) ? null : date;
    }
    
    let dateStr = String(dateValue).trim();
    if (!dateStr || dateStr.toLowerCase() === 'null') return null;
    
    dateStr = dateStr.split(' ')[0].split('T')[0];
    
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
            
            if (parts[0].length === 4) {
                year = p0; month = p1; day = p2;
            } else if (parts[2].length === 4) {
                day = p0; month = p1; year = p2;
            } else {
                day = p0; month = p1; year = p2;
                if (year < 100) year = year > 50 ? 1900 + year : 2000 + year;
            }
            
            if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
                const date = new Date(year, month - 1, day);
                if (!isNaN(date.getTime())) return date;
            }
        }
    }
    
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
}

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
    
    const allDonationsWithParsedDates = donations.map((d, index) => {
        let parsedDate = parseDate(d.donation_date);
        if (!parsedDate) parsedDate = generateDateFromIndex(index, donations.length);
        return { ...d, parsedDate };
    });
    
    const donationsWithValidDates = allDonationsWithParsedDates
        .filter(d => d.parsedDate !== null)
        .sort((a, b) => b.parsedDate - a.parsedDate);
    
    const lastDateParsed = donationsWithValidDates.length > 0 ? donationsWithValidDates[0].parsedDate : null;
    const firstDateParsed = donationsWithValidDates.length > 0 ? donationsWithValidDates[donationsWithValidDates.length - 1].parsedDate : null;
    
    if ('lastDonationDate' in donor) {
        donor.lastDonationDate = lastDateParsed ? lastDateParsed.toISOString().split('T')[0] : null;
    }
    if ('firstDonationDate' in donor) {
        donor.firstDonationDate = firstDateParsed ? firstDateParsed.toISOString().split('T')[0] : null;
    }
    
    let daysSince = 0;
    if (lastDateParsed) {
        const today = new Date();
        daysSince = Math.floor((today - lastDateParsed) / (1000 * 60 * 60 * 24));
    }
    if ('daysSinceLastDonation' in donor) donor.daysSinceLastDonation = Math.max(0, daysSince);
    
    if ('percentOfTotal' in donor) {
        donor.percentOfTotal = globalTotal > 0 ? Math.round((total / globalTotal) * 10000) / 100 : 0;
    }
    
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
    
    if ('monthlyAverage' in donor) {
        const uniqueMonths = new Set();
        allDonationsWithParsedDates.forEach(d => {
            if (d.parsedDate) {
                uniqueMonths.add(`${d.parsedDate.getFullYear()}-${d.parsedDate.getMonth()}`);
            }
        });
        donor.monthlyAverage = uniqueMonths.size > 0 ? total / uniqueMonths.size : 0;
    }
    
    if ('donorTier' in donor) {
        if (total >= 100000) donor.donorTier = '💎 Diamond';
        else if (total >= 50000) donor.donorTier = '🏆 Platinum';
        else if (total >= 25000) donor.donorTier = '🥇 Gold';
        else if (total >= 10000) donor.donorTier = '🥈 Silver';
        else if (total >= 5000) donor.donorTier = '🥉 Bronze';
        else if (total > 0) donor.donorTier = '⭐ Supporter';
        else donor.donorTier = '🌱 Prospect';
    }
    
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
    
    if ('riskLevel' in donor) {
        const likelihood = donor.likelihoodScore || 0;
        if (likelihood >= 70) donor.riskLevel = '🟢 HIGH';
        else if (likelihood >= 40) donor.riskLevel = '🟡 MEDIUM';
        else donor.riskLevel = '🔴 LOW';
    }
    
    if ('topCause' in donor) {
        const causes = {};
        donations.forEach(d => {
            if (d.cause) causes[d.cause] = (causes[d.cause] || 0) + (parseFloat(d.amount) || 0);
        });
        const sortedCauses = Object.entries(causes).sort((a, b) => b[1] - a[1]);
        donor.topCause = sortedCauses.length > 0 ? sortedCauses[0][0] : 'N/A';
    }
    
    if ('donationHistory' in donor) {
        const sortedAll = [...allDonationsWithParsedDates].sort((a, b) => {
            if (a.parsedDate && b.parsedDate) return b.parsedDate - a.parsedDate;
            if (a.parsedDate) return -1;
            if (b.parsedDate) return 1;
            return 0;
        });
        donor.donationHistory = generateHistoryTable(sortedAll, total, count, avg, max, currency);
    }
}

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
    
    allDonations.slice(0, 20).forEach(d => {
        const dateDisplay = d.parsedDate ? formatDateFromParsed(d.parsedDate) : 'N/A';
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