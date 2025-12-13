/**
 * AI Summary Generator - Modern Fancy Formatting
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
    console.log('📊 Donations found:', donations.length);

    const generatedSummary = generateModernSummary(donor, donations);

    await UPDATE(Donors).set({ summary: generatedSummary }).where({ ID: donorId });
    
    request.info(`✅ AI Summary Generated!\n\n👤 ${donor.name}\n📊 ${donations.length} donations analyzed\n\n🔄 Refresh to view full report.`);

    return generatedSummary;
}

function generateModernSummary(donor, donations) {
    const hasDonations = donations && donations.length > 0;
    
    // Calculate all statistics
    let stats = calculateStats(donations);
    const tier = getDonorTier(stats.total);
    const engagement = calculateEngagement(donor, stats);
    
    // Build the modern summary
    let summary = buildHeader();
    summary += buildProfileSection(donor, tier);
    
    if (hasDonations) {
        summary += buildStatsSection(stats);
        summary += buildCausesSection(stats);
        summary += buildTimelineSection(stats, donations);
        summary += buildTrendsSection(stats);
        summary += buildInsightsSection(donor, stats, engagement);
    } else {
        summary += buildNoDataSection();
    }
    
    summary += buildRecommendationsSection(donor, stats, hasDonations);
    summary += buildFooter();
    
    return summary;
}

function calculateStats(donations) {
    if (!donations || donations.length === 0) {
        return { total: 0, count: 0, currency: 'USD' };
    }
    
    let stats = {
        total: 0,
        count: donations.length,
        currency: donations[0].currency_code || 'USD',
        min: Infinity,
        max: 0,
        amounts: [],
        causes: {},
        campaigns: {},
        years: {},
        months: new Array(12).fill(0),
        weekdays: new Array(7).fill(0),
        firstDonation: donations[donations.length - 1],
        lastDonation: donations[0]
    };
    
    donations.forEach(d => {
        const amt = parseFloat(d.amount) || 0;
        stats.total += amt;
        stats.amounts.push(amt);
        if (amt < stats.min) stats.min = amt;
        if (amt > stats.max) stats.max = amt;
        
        if (d.cause) stats.causes[d.cause] = (stats.causes[d.cause] || 0) + amt;
        if (d.campaign) stats.campaigns[d.campaign] = (stats.campaigns[d.campaign] || 0) + amt;
        
        if (d.donation_date) {
            const date = new Date(d.donation_date);
            const year = date.getFullYear();
            const month = date.getMonth();
            const weekday = date.getDay();
            
            stats.years[year] = (stats.years[year] || 0) + amt;
            stats.months[month] += amt;
            stats.weekdays[weekday] += 1;
        }
    });
    
    stats.avg = stats.total / stats.count;
    stats.median = calculateMedian(stats.amounts);
    stats.topCauses = Object.entries(stats.causes).sort((a, b) => b[1] - a[1]).slice(0, 5);
    stats.topCampaigns = Object.entries(stats.campaigns).sort((a, b) => b[1] - a[1]).slice(0, 5);
    stats.yearlyData = Object.entries(stats.years).sort((a, b) => b[0] - a[0]);
    
    // Find peak month and day
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    stats.peakMonth = monthNames[stats.months.indexOf(Math.max(...stats.months))];
    stats.peakDay = dayNames[stats.weekdays.indexOf(Math.max(...stats.weekdays))];
    
    // Calculate trend
    if (stats.yearlyData.length >= 2) {
        const recent = stats.yearlyData[0][1];
        const previous = stats.yearlyData[1][1];
        stats.trend = ((recent - previous) / previous * 100).toFixed(1);
    }
    
    // Days since last donation
    stats.daysSinceLast = Math.floor((new Date() - new Date(stats.lastDonation.donation_date)) / (1000 * 60 * 60 * 24));
    
    return stats;
}

function calculateMedian(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
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
    if (total >= 100000) return { name: 'Diamond Elite', icon: '💎', color: '#b9f2ff' };
    if (total >= 50000) return { name: 'Platinum', icon: '🏆', color: '#e5e4e2' };
    if (total >= 25000) return { name: 'Gold', icon: '🥇', color: '#ffd700' };
    if (total >= 10000) return { name: 'Silver', icon: '🥈', color: '#c0c0c0' };
    if (total >= 5000) return { name: 'Bronze', icon: '🥉', color: '#cd7f32' };
    if (total > 0) return { name: 'Supporter', icon: '⭐', color: '#87ceeb' };
    return { name: 'Prospect', icon: '🌱', color: '#98fb98' };
}

function buildHeader() {
    return `
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                          ║
║     █████╗ ██╗    ██████╗  ██████╗ ███╗   ██╗ ██████╗ ██████╗                            ║
║    ██╔══██╗██║    ██╔══██╗██╔═══██╗████╗  ██║██╔═══██╗██╔══██╗                           ║
║    ███████║██║    ██║  ██║██║   ██║██╔██╗ ██║██║   ██║██████╔╝                           ║
║    ██╔══██║██║    ██║  ██║██║   ██║██║╚██╗██║██║   ██║██╔══██╗                           ║
║    ██║  ██║██║    ██████╔╝╚██████╔╝██║ ╚████║╚██████╔╝██║  ██║                           ║
║    ╚═╝  ╚═╝╚═╝    ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═╝                           ║
║                                                                                          ║
║                    🤖 AI-POWERED DONOR INTELLIGENCE REPORT                               ║
║                                                                                          ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝
`;
}

function buildProfileSection(donor, tier) {
    return `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  👤  DONOR PROFILE                                                                       ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

    ┌──────────────────────────────────────────────────────────────────────────────────┐
    │                                                                                  │
    │   ${tier.icon}  ${padRight(donor.name, 50)}                       │
    │   ────────────────────────────────────────────────────────────────               │
    │   📧  ${padRight(donor.email, 50)}                       │
    │   📱  ${padRight(donor.phone || 'Not provided', 50)}                       │
    │                                                                                  │
    │   ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                     │
    │   │  ${donor.status ? '✅ ACTIVE' : '❌ INACTIVE'}     │  │  ${donor.isHNI ? '⭐ VIP' : '○ REGULAR'}       │  │  ${donor.isRecurringDonor ? '🔄 RECURRING' : '○ ONE-TIME'}  │                     │
    │   └────────────────┘  └────────────────┘  └────────────────┘                     │
    │                                                                                  │
    │   🏅 TIER: ${tier.icon} ${tier.name}                                                      │
    │                                                                                  │
    └──────────────────────────────────────────────────────────────────────────────────┘
`;
}

function buildStatsSection(stats) {
    const c = stats.currency;
    return `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  💰  DONATION STATISTICS                                                                 ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

    ╭─────────────────────────╮    ╭─────────────────────────╮    ╭─────────────────────────╮
    │      TOTAL GIVEN        │    │     # DONATIONS         │    │      AVERAGE            │
    │  ━━━━━━━━━━━━━━━━━━━━   │    │  ━━━━━━━━━━━━━━━━━━━━   │    │  ━━━━━━━━━━━━━━━━━━━━   │
    │                         │    │                         │    │                         │
    │   ${padCenter(c + ' ' + formatNum(stats.total), 21)}   │    │   ${padCenter(stats.count.toString(), 21)}   │    │   ${padCenter(c + ' ' + formatNum(stats.avg), 21)}   │
    │                         │    │                         │    │                         │
    ╰─────────────────────────╯    ╰─────────────────────────╯    ╰─────────────────────────╯

    ╭─────────────────────────╮    ╭─────────────────────────╮    ╭─────────────────────────╮
    │      LARGEST GIFT       │    │     SMALLEST GIFT       │    │       MEDIAN            │
    │  ━━━━━━━━━━━━━━━━━━━━   │    │  ━━━━━━━━━━━━━━━━━━━━   │    │  ━━━━━━━━━━━━━━━━━━━━   │
    │                         │    │                         │    │                         │
    │   ${padCenter(c + ' ' + formatNum(stats.max), 21)}   │    │   ${padCenter(c + ' ' + formatNum(stats.min), 21)}   │    │   ${padCenter(c + ' ' + formatNum(stats.median), 21)}   │
    │                         │    │                         │    │                         │
    ╰─────────────────────────╯    ╰─────────────────────────╯    ╰─────────────────────────╯
`;
}

function buildCausesSection(stats) {
    if (stats.topCauses.length === 0) return '';
    
    let section = `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  🎯  TOP CAUSES & CAMPAIGNS                                                              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

    CAUSES BY AMOUNT:
    ─────────────────────────────────────────────────────────────────────────────────────
`;
    
    stats.topCauses.forEach(([cause, amount], i) => {
        const pct = ((amount / stats.total) * 100).toFixed(1);
        const bar = generateProgressBar(parseFloat(pct));
        section += `    ${i + 1}.  ${padRight(cause, 30)} ${bar}  ${padLeft(pct + '%', 6)}  ${padLeft(stats.currency + ' ' + formatNum(amount), 15)}\n`;
    });
    
    if (stats.topCampaigns.length > 0) {
        section += `
    CAMPAIGNS BY AMOUNT:
    ─────────────────────────────────────────────────────────────────────────────────────
`;
        stats.topCampaigns.forEach(([campaign, amount], i) => {
            const pct = ((amount / stats.total) * 100).toFixed(1);
            const bar = generateProgressBar(parseFloat(pct));
            section += `    ${i + 1}.  ${padRight(campaign, 30)} ${bar}  ${padLeft(pct + '%', 6)}  ${padLeft(stats.currency + ' ' + formatNum(amount), 15)}\n`;
        });
    }
    
    return section;
}

function buildTimelineSection(stats, donations) {
    const first = stats.firstDonation;
    const last = stats.lastDonation;
    const c = stats.currency;
    
    return `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  📅  DONATION TIMELINE                                                                   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

    🟢 FIRST DONATION                              🔵 MOST RECENT
    ─────────────────────────                      ─────────────────────────
    📆 ${first.donation_date}                              📆 ${last.donation_date}
    💵 ${c} ${formatNum(parseFloat(first.amount))}                                  💵 ${c} ${formatNum(parseFloat(last.amount))}
    🎯 ${padRight(first.campaign || 'N/A', 20)}                     🎯 ${padRight(last.campaign || 'N/A', 20)}

    ⏱️  Days since last donation: ${stats.daysSinceLast} days
    📊 Peak giving month: ${stats.peakMonth}
    📅 Preferred day: ${stats.peakDay}
`;
}

function buildTrendsSection(stats) {
    if (stats.yearlyData.length === 0) return '';
    
    let section = `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  📈  YEARLY TRENDS                                                                       ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

`;
    
    const maxAmount = Math.max(...stats.yearlyData.map(y => y[1]));
    
    stats.yearlyData.slice(0, 5).forEach(([year, amount]) => {
        const pct = (amount / maxAmount) * 100;
        const bar = generateProgressBar(pct, 30);
        section += `    ${year}  ${bar}  ${padLeft(stats.currency + ' ' + formatNum(amount), 15)}\n`;
    });
    
    if (stats.trend) {
        const trendIcon = parseFloat(stats.trend) >= 0 ? '📈' : '📉';
        const trendText = parseFloat(stats.trend) >= 0 ? 'increase' : 'decrease';
        section += `
    ${trendIcon} Year-over-year ${trendText}: ${Math.abs(parseFloat(stats.trend))}%
`;
    }
    
    return section;
}

function buildInsightsSection(donor, stats, engagement) {
    const insights = generateInsights(donor, stats);
    
    let section = `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  🧠  AI INSIGHTS                                                                         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

    ENGAGEMENT SCORE:
    ${generateProgressBar(engagement, 40)} ${engagement}%

`;
    
    insights.forEach((insight, i) => {
        section += `    ${i + 1}.  ${insight}\n`;
    });
    
    return section;
}

function buildRecommendationsSection(donor, stats, hasDonations) {
    let section = `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  💡  RECOMMENDED ACTIONS                                                                 ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

`;
    
    if (!hasDonations) {
        section += `    ☐  Send welcome email with organization introduction
    ☐  Share impact stories and testimonials
    ☐  Invite to upcoming community events
    ☐  Schedule introductory call
`;
    } else {
        section += `    ☐  Send personalized thank you message
    ☐  Share quarterly impact report
    ☐  Invite to donor appreciation event
`;
        
        if (donor.isHNI) {
            section += `    ☐  Schedule personal meeting with executive team
    ☐  Discuss naming opportunity options
    ☐  Present major gift proposal
`;
        }
        
        if (donor.isRecurringDonor) {
            section += `    ☐  Send loyalty appreciation gift
    ☐  Offer upgrade to higher giving level
`;
        }
        
        if (!donor.isRecurringDonor && stats.count >= 3) {
            section += `    ☐  Pitch recurring giving program
`;
        }
        
        if (stats.daysSinceLast > 180) {
            section += `
    ⚠️  ATTENTION: ${stats.daysSinceLast} days since last donation
    ☐  Launch re-engagement campaign immediately
`;
        }
    }
    
    return section;
}

function buildNoDataSection() {
    return `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ℹ️   NO DONATION HISTORY                                                                ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

    ┌──────────────────────────────────────────────────────────────────────────────────┐
    │                                                                                  │
    │                          This donor has not made any                             │
    │                          donations yet.                                          │
    │                                                                                  │
    │                          Consider launching an engagement                        │
    │                          campaign to convert this prospect.                      │
    │                                                                                  │
    └──────────────────────────────────────────────────────────────────────────────────┘
`;
}

function buildFooter() {
    return `
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                          ║
║   Generated: ${new Date().toLocaleString()}                                                ║
║   Model: AI Donor Intelligence v2.0                                                      ║
║   Powered by: Akme Foundation Analytics Engine                                           ║
║                                                                                          ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝
`;
}

function generateInsights(donor, stats) {
    const insights = [];
    
    if (donor.isHNI) {
        insights.push('⭐ VIP Status - Prioritize for major gift conversations and exclusive events');
    }
    
    if (donor.isRecurringDonor) {
        insights.push('🔄 Recurring donor - High lifetime value, focus on retention');
    }
    
    if (stats.avg > 1000) {
        insights.push('💎 High-value donor - Consider wealth screening for major gift potential');
    }
    
    if (stats.topCauses.length > 0) {
        insights.push(`🎯 Primary passion: ${stats.topCauses[0][0]} - Tailor communications accordingly`);
    }
    
    if (stats.count >= 10) {
        insights.push('🏆 Loyal supporter - Excellent candidate for donor advisory board');
    } else if (stats.count === 1) {
        insights.push('👋 First-time donor - Critical to send warm, personalized welcome');
    }
    
    if (stats.daysSinceLast > 365) {
        insights.push('⚠️ Lapsed donor - Urgent re-engagement needed');
    } else if (stats.daysSinceLast > 180) {
        insights.push('🔔 At-risk - Consider proactive outreach');
    }
    
    if (!donor.isRecurringDonor && stats.count >= 3) {
        insights.push('🔄 Strong candidate for recurring giving program');
    }
    
    return insights.slice(0, 6);
}

function generateProgressBar(percentage, width = 20) {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, empty));
}

function formatNum(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toFixed(2);
}

function padRight(str, len) {
    str = String(str || '');
    if (str.length > len) return str.slice(0, len - 3) + '...';
    return str + ' '.repeat(Math.max(0, len - str.length));
}

function padLeft(str, len) {
    str = String(str || '');
    if (str.length > len) return str.slice(0, len);
    return ' '.repeat(Math.max(0, len - str.length)) + str;
}

function padCenter(str, len) {
    str = String(str || '');
    if (str.length >= len) return str.slice(0, len);
    const left = Math.floor((len - str.length) / 2);
    const right = len - str.length - left;
    return ' '.repeat(left) + str + ' '.repeat(right);
}

module.exports = Action1;