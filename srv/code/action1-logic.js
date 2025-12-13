/**
 * AI Summary Generator - Professional Clean Format
 * @On(event = { "Action1" }, entity = "donor_management_BitaSrv.Donors")
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

    console.log('🤖 Generating AI Summary for:', donor.name);

    const generatedSummary = generateProfessionalReport(donor, donations);

    await UPDATE(Donors).set({ summary: generatedSummary }).where({ ID: donorId });
    
    request.info(`✅ AI Summary Generated!\n\n👤 ${donor.name}\n📊 ${donations.length} donations analyzed`);

    return generatedSummary;
}

function generateProfessionalReport(donor, donations) {
    const stats = calculateStats(donations);
    const tier = getDonorTier(stats.total);
    const engagement = calculateEngagement(donor, stats);
    const insights = generateInsights(donor, stats);
    const recommendations = generateRecommendations(donor, stats);
    
    let report = '';
    
    // Header
    report += `═══════════════════════════════════════════════════════════════════\n`;
    report += `                    AI DONOR INTELLIGENCE REPORT\n`;
    report += `═══════════════════════════════════════════════════════════════════\n\n`;
    
    // Donor Profile
    report += `DONOR PROFILE\n`;
    report += `───────────────────────────────────────────────────────────────────\n`;
    report += `Name:           ${donor.name}\n`;
    report += `Email:          ${donor.email}\n`;
    report += `Phone:          ${donor.phone || 'Not provided'}\n`;
    report += `Status:         ${donor.status ? '● Active' : '○ Inactive'}\n`;
    report += `VIP Status:     ${donor.isHNI ? '★ Yes' : '○ No'}\n`;
    report += `Recurring:      ${donor.isRecurringDonor ? '● Yes' : '○ No'}\n`;
    report += `Tier:           ${tier.icon} ${tier.name}\n\n`;
    
    // Donation Statistics
    report += `DONATION STATISTICS\n`;
    report += `───────────────────────────────────────────────────────────────────\n`;
    
    if (stats.count === 0) {
        report += `No donation history available.\n\n`;
    } else {
        const c = stats.currency;
        report += `Total Contributed:    ${c} ${formatNum(stats.total)}\n`;
        report += `Number of Donations:  ${stats.count}\n`;
        report += `Average Gift:         ${c} ${formatNum(stats.avg)}\n`;
        report += `Largest Gift:         ${c} ${formatNum(stats.max)}\n`;
        report += `Smallest Gift:        ${c} ${formatNum(stats.min)}\n`;
        report += `Days Since Last:      ${stats.daysSinceLast} days\n\n`;
        
        // Top Causes
        if (stats.topCauses.length > 0) {
            report += `TOP CAUSES\n`;
            report += `───────────────────────────────────────────────────────────────────\n`;
            stats.topCauses.forEach(([cause, amount], i) => {
                const pct = Math.round((amount / stats.total) * 100);
                const bar = createBar(pct, 20);
                report += `${(i + 1)}. ${padRight(cause, 25)} ${bar} ${padLeft(pct + '%', 4)}  ${c} ${formatNum(amount)}\n`;
            });
            report += '\n';
        }
        
        // Top Campaigns
        if (stats.topCampaigns.length > 0) {
            report += `TOP CAMPAIGNS\n`;
            report += `───────────────────────────────────────────────────────────────────\n`;
            stats.topCampaigns.forEach(([campaign, amount], i) => {
                const pct = Math.round((amount / stats.total) * 100);
                const bar = createBar(pct, 20);
                report += `${(i + 1)}. ${padRight(campaign, 25)} ${bar} ${padLeft(pct + '%', 4)}  ${c} ${formatNum(amount)}\n`;
            });
            report += '\n';
        }
        
        // Timeline
        report += `DONATION TIMELINE\n`;
        report += `───────────────────────────────────────────────────────────────────\n`;
        report += `First Donation:   ${stats.firstDonation.donation_date}  →  ${c} ${formatNum(parseFloat(stats.firstDonation.amount))}\n`;
        report += `Last Donation:    ${stats.lastDonation.donation_date}  →  ${c} ${formatNum(parseFloat(stats.lastDonation.amount))}\n\n`;
    }
    
    // Engagement Score
    report += `ENGAGEMENT SCORE\n`;
    report += `───────────────────────────────────────────────────────────────────\n`;
    const engagementBar = createBar(engagement, 30);
    const engagementLevel = engagement >= 70 ? 'HIGH' : engagement >= 40 ? 'MEDIUM' : 'LOW';
    report += `Score: ${engagementBar} ${engagement}% (${engagementLevel})\n\n`;
    
    // AI Insights
    if (insights.length > 0) {
        report += `AI INSIGHTS\n`;
        report += `───────────────────────────────────────────────────────────────────\n`;
        insights.forEach((insight, i) => {
            report += `${insight.icon} ${insight.text}\n`;
        });
        report += '\n';
    }
    
    // Recommended Actions
    report += `RECOMMENDED ACTIONS\n`;
    report += `───────────────────────────────────────────────────────────────────\n`;
    recommendations.forEach((rec, i) => {
        const priority = rec.priority === 'high' ? '[HIGH]' : rec.priority === 'medium' ? '[MED]' : '[LOW]';
        report += `☐ ${priority} ${rec.text}\n`;
    });
    report += '\n';
    
    // Footer
    report += `═══════════════════════════════════════════════════════════════════\n`;
    report += `Generated: ${new Date().toLocaleString()}\n`;
    report += `Model: AI Donor Intelligence v2.0 | Akme Foundation\n`;
    report += `═══════════════════════════════════════════════════════════════════`;
    
    return report;
}

function calculateStats(donations) {
    if (!donations || donations.length === 0) {
        return { total: 0, count: 0, currency: 'USD', avg: 0, max: 0, min: 0, causes: {}, campaigns: {}, topCauses: [], topCampaigns: [], daysSinceLast: 0 };
    }
    
    let stats = {
        total: 0,
        count: donations.length,
        currency: donations[0].currency_code || 'USD',
        min: Infinity,
        max: 0,
        causes: {},
        campaigns: {},
        firstDonation: donations[donations.length - 1],
        lastDonation: donations[0]
    };
    
    donations.forEach(d => {
        const amt = parseFloat(d.amount) || 0;
        stats.total += amt;
        if (amt < stats.min) stats.min = amt;
        if (amt > stats.max) stats.max = amt;
        if (d.cause) stats.causes[d.cause] = (stats.causes[d.cause] || 0) + amt;
        if (d.campaign) stats.campaigns[d.campaign] = (stats.campaigns[d.campaign] || 0) + amt;
    });
    
    stats.avg = stats.total / stats.count;
    stats.topCauses = Object.entries(stats.causes).sort((a, b) => b[1] - a[1]).slice(0, 5);
    stats.topCampaigns = Object.entries(stats.campaigns).sort((a, b) => b[1] - a[1]).slice(0, 5);
    stats.daysSinceLast = Math.floor((new Date() - new Date(stats.lastDonation.donation_date)) / (1000 * 60 * 60 * 24));
    
    return stats;
}

function calculateEngagement(donor, stats) {
    let score = 0;
    if (donor.isHNI) score += 30;
    if (donor.isRecurringDonor) score += 25;
    if (donor.status) score += 15;
    if (stats.count >= 10) score += 15;
    else if (stats.count >= 5) score += 10;
    else if (stats.count >= 2) score += 5;
    if (stats.daysSinceLast < 90) score += 15;
    else if (stats.daysSinceLast < 180) score += 10;
    else if (stats.daysSinceLast < 365) score += 5;
    return Math.min(score, 100);
}

function getDonorTier(total) {
    if (total >= 100000) return { name: 'Diamond Elite', icon: '💎' };
    if (total >= 50000) return { name: 'Platinum', icon: '🏆' };
    if (total >= 25000) return { name: 'Gold', icon: '🥇' };
    if (total >= 10000) return { name: 'Silver', icon: '🥈' };
    if (total >= 5000) return { name: 'Bronze', icon: '🥉' };
    if (total > 0) return { name: 'Supporter', icon: '⭐' };
    return { name: 'Prospect', icon: '🌱' };
}

function generateInsights(donor, stats) {
    const insights = [];
    
    if (donor.isHNI) {
        insights.push({ icon: '⭐', text: 'VIP Status - Prioritize for major gift conversations' });
    }
    if (donor.isRecurringDonor) {
        insights.push({ icon: '🔄', text: 'Recurring donor - High lifetime value, focus on retention' });
    }
    if (stats.avg > 1000) {
        insights.push({ icon: '💎', text: 'High-value donor - Consider wealth screening' });
    }
    if (stats.topCauses && stats.topCauses.length > 0) {
        insights.push({ icon: '🎯', text: `Primary passion: ${stats.topCauses[0][0]}` });
    }
    if (stats.count >= 10) {
        insights.push({ icon: '🏆', text: 'Loyal supporter - Candidate for advisory board' });
    }
    if (stats.daysSinceLast > 365) {
        insights.push({ icon: '⚠️', text: 'Lapsed donor - Urgent re-engagement needed' });
    } else if (stats.daysSinceLast > 180) {
        insights.push({ icon: '🔔', text: 'At-risk - Consider proactive outreach' });
    }
    
    return insights.slice(0, 6);
}

function generateRecommendations(donor, stats) {
    const recommendations = [];
    
    recommendations.push({ text: 'Send personalized thank you message', priority: 'high' });
    recommendations.push({ text: 'Share quarterly impact report', priority: 'medium' });
    
    if (donor.isHNI) {
        recommendations.push({ text: 'Schedule meeting with executive team', priority: 'high' });
    }
    if (donor.isRecurringDonor) {
        recommendations.push({ text: 'Send loyalty appreciation gift', priority: 'medium' });
    }
    if (!donor.isRecurringDonor && stats.count >= 3) {
        recommendations.push({ text: 'Invite to recurring giving program', priority: 'medium' });
    }
    if (stats.daysSinceLast > 180) {
        recommendations.push({ text: 'Launch re-engagement campaign', priority: 'high' });
    }
    
    return recommendations.slice(0, 6);
}

function createBar(percentage, width) {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return '▓'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, empty));
}

function formatNum(num) {
    if (num === undefined || num === null || isNaN(num)) return '0.00';
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toFixed(2);
}

function padRight(str, len) {
    str = String(str || '');
    if (str.length > len) return str.slice(0, len - 2) + '..';
    return str + ' '.repeat(Math.max(0, len - str.length));
}

function padLeft(str, len) {
    str = String(str || '');
    return ' '.repeat(Math.max(0, len - str.length)) + str;
}

module.exports = Action1;