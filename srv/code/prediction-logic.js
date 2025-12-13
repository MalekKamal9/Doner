/**
 * Donation Likelihood Prediction - ML-Style Analysis
 * Saves to predictionResult field
 */

async function PredictDonationLikelihood(request) {
    const { Donors, Donations } = cds.entities('Donor_management_Bita');
    const donorId = request.params[0]?.ID || request.params[0];
    
    const donor = await SELECT.one.from(Donors).where({ ID: donorId });
    if (!donor) {
        request.error(404, 'Donor not found');
        return;
    }

    const donations = await SELECT.from(Donations)
        .where({ donor_Email: donor.email })
        .orderBy({ donation_date: 'desc' });

    console.log('🎯 Running prediction for:', donor.name);

    // Generate prediction
    const prediction = generatePrediction(donor, donations);
    
    // Save to predictionResult field
    await UPDATE(Donors).set({ predictionResult: prediction.report }).where({ ID: donorId });

    // Show success message with key metrics
    request.info(`🎯 Prediction Complete!\n\n📊 Likelihood Score: ${prediction.score}%\n📈 Risk Level: ${prediction.riskLevel}\n🎪 Confidence: ${prediction.confidence}%\n\n✅ Results saved. Page will refresh.`);

    return prediction.report;
}

function generatePrediction(donor, donations) {
    const hasDonations = donations && donations.length > 0;
    
    // Calculate features
    const features = calculateFeatures(donor, donations);
    
    // Calculate weighted score
    const score = calculateScore(features);
    const riskLevel = score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW';
    const confidence = calculateConfidence(features, donations);
    
    // Generate recommendations
    const recommendations = generateRecommendations(score, riskLevel, features, donor);
    
    // Build report
    const report = buildPredictionReport(donor, features, score, riskLevel, confidence, recommendations, donations);
    
    return { report, score, riskLevel, confidence };
}

function calculateFeatures(donor, donations) {
    const features = {
        totalDonations: 0,
        totalAmount: 0,
        avgAmount: 0,
        maxAmount: 0,
        recencyDays: 999,
        frequency: 0,
        isRecurring: donor.isRecurringDonor || false,
        isVIP: donor.isHNI || false,
        trend: 'none',
        consistency: 0,
        causes: 0,
        campaigns: 0
    };
    
    if (!donations || donations.length === 0) return features;
    
    const now = new Date();
    const amounts = [];
    const causes = new Set();
    const campaigns = new Set();
    let totalAmount = 0;
    
    donations.forEach(d => {
        const amt = parseFloat(d.amount) || 0;
        totalAmount += amt;
        amounts.push(amt);
        if (d.cause) causes.add(d.cause);
        if (d.campaign) campaigns.add(d.campaign);
    });
    
    features.totalDonations = donations.length;
    features.totalAmount = totalAmount;
    features.avgAmount = totalAmount / donations.length;
    features.maxAmount = Math.max(...amounts);
    features.causes = causes.size;
    features.campaigns = campaigns.size;
    
    // Recency
    if (donations[0]?.donation_date) {
        const lastDate = new Date(donations[0].donation_date);
        features.recencyDays = Math.floor((now - lastDate) / (24 * 60 * 60 * 1000));
    }
    
    // Frequency (donations per year)
    if (donations.length >= 2) {
        const dates = donations.map(d => new Date(d.donation_date)).sort((a, b) => a - b);
        const daySpan = (dates[dates.length - 1] - dates[0]) / (24 * 60 * 60 * 1000);
        features.frequency = daySpan > 0 ? (donations.length / daySpan) * 365 : donations.length;
    }
    
    // Trend analysis
    if (donations.length >= 3) {
        const recent = amounts.slice(0, Math.ceil(amounts.length / 2));
        const older = amounts.slice(Math.ceil(amounts.length / 2));
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        
        if (recentAvg > olderAvg * 1.1) features.trend = 'increasing';
        else if (recentAvg < olderAvg * 0.9) features.trend = 'decreasing';
        else features.trend = 'stable';
    }
    
    // Consistency (coefficient of variation)
    if (amounts.length > 1) {
        const mean = totalAmount / amounts.length;
        const variance = amounts.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / amounts.length;
        const stdDev = Math.sqrt(variance);
        features.consistency = mean > 0 ? Math.max(0, 100 - (stdDev / mean * 100)) : 0;
    }
    
    return features;
}

function calculateScore(features) {
    let score = 0;
    
    // Recency (25 points)
    if (features.recencyDays <= 30) score += 25;
    else if (features.recencyDays <= 90) score += 20;
    else if (features.recencyDays <= 180) score += 15;
    else if (features.recencyDays <= 365) score += 8;
    else score += 2;
    
    // Frequency (20 points)
    if (features.frequency >= 12) score += 20;
    else if (features.frequency >= 4) score += 15;
    else if (features.frequency >= 2) score += 10;
    else if (features.frequency >= 1) score += 5;
    
    // Engagement (15 points)
    score += Math.min(15, features.causes * 3 + features.campaigns * 2);
    
    // Recurring status (15 points)
    if (features.isRecurring) score += 15;
    
    // Amount level (10 points)
    if (features.avgAmount >= 5000) score += 10;
    else if (features.avgAmount >= 1000) score += 7;
    else if (features.avgAmount >= 100) score += 4;
    else score += 2;
    
    // Trend (10 points)
    if (features.trend === 'increasing') score += 10;
    else if (features.trend === 'stable') score += 6;
    else score += 2;
    
    // VIP status (5 points)
    if (features.isVIP) score += 5;
    
    return Math.min(100, Math.round(score));
}

function calculateConfidence(features, donations) {
    let confidence = 50;
    
    if (donations.length >= 10) confidence += 25;
    else if (donations.length >= 5) confidence += 15;
    else if (donations.length >= 2) confidence += 5;
    
    if (features.consistency > 80) confidence += 15;
    else if (features.consistency > 50) confidence += 10;
    
    if (features.recencyDays < 180) confidence += 10;
    
    return Math.min(95, Math.round(confidence));
}

function generateRecommendations(score, riskLevel, features, donor) {
    const recommendations = [];
    
    if (riskLevel === 'HIGH') {
        recommendations.push('🎯 Prime candidate for major gift solicitation');
        recommendations.push('📊 Share personalized impact report');
        if (!donor.isRecurringDonor) recommendations.push('🔄 Invite to recurring giving program');
        recommendations.push('🎉 Priority invite to exclusive events');
    } else if (riskLevel === 'MEDIUM') {
        recommendations.push('📞 Schedule personal check-in call');
        recommendations.push('📖 Share compelling impact stories');
        recommendations.push('📧 Send re-engagement email campaign');
        recommendations.push('🆕 Present new campaign opportunities');
    } else {
        recommendations.push('👋 Send warm welcome/re-welcome email');
        recommendations.push('📚 Share organization success stories');
        recommendations.push('📝 Send donor satisfaction survey');
        recommendations.push('🤝 Invite to volunteer opportunities');
    }
    
    return recommendations.slice(0, 5);
}

function buildPredictionReport(donor, features, score, riskLevel, confidence, recommendations, donations) {
    const c = donations[0]?.currency_code || 'USD';
    const scoreBar = generateBar(score);
    const confidenceBar = generateBar(confidence);
    
    const riskColor = riskLevel === 'HIGH' ? '🟢' : riskLevel === 'MEDIUM' ? '🟡' : '🔴';
    
    let report = `
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                          ║
║           🎯 DONATION LIKELIHOOD PREDICTION                                              ║
║                                                                                          ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  📊  PREDICTION RESULTS                                                                  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

    ╭─────────────────────────────────────────────────────────────────────────────────╮
    │                                                                                 │
    │   LIKELIHOOD SCORE                                                              │
    │   ${scoreBar}  ${score}%                                        │
    │                                                                                 │
    │   RISK LEVEL: ${riskColor} ${riskLevel}                                                          │
    │                                                                                 │
    │   CONFIDENCE                                                                    │
    │   ${confidenceBar}  ${confidence}%                                      │
    │                                                                                 │
    ╰─────────────────────────────────────────────────────────────────────────────────╯

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  🔬  FEATURE ANALYSIS                                                                    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

    ┌───────────────────────────┬───────────────────────────┬───────────────────────────┐
    │      RECENCY              │      FREQUENCY            │      AMOUNT               │
    ├───────────────────────────┼───────────────────────────┼───────────────────────────┤
    │  ${padCenter(features.recencyDays + ' days ago', 23)}  │  ${padCenter(features.frequency.toFixed(1) + '/year', 23)}  │  ${padCenter(c + ' ' + formatNum(features.avgAmount) + ' avg', 23)}  │
    └───────────────────────────┴───────────────────────────┴───────────────────────────┘

    ┌───────────────────────────┬───────────────────────────┬───────────────────────────┐
    │      TREND                │      CONSISTENCY          │      ENGAGEMENT           │
    ├───────────────────────────┼───────────────────────────┼───────────────────────────┤
    │  ${padCenter(features.trend.toUpperCase(), 23)}  │  ${padCenter(features.consistency.toFixed(0) + '%', 23)}  │  ${padCenter(features.causes + ' causes, ' + features.campaigns + ' campaigns', 23)}  │
    └───────────────────────────┴───────────────────────────┴───────────────────────────┘

    STATUS FLAGS:
    ├── VIP Status:       ${features.isVIP ? '✅ Yes' : '❌ No'}
    ├── Recurring:        ${features.isRecurring ? '✅ Yes' : '❌ No'}
    └── Total Donations:  ${features.totalDonations}

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  💡  AI RECOMMENDATIONS                                                                  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

`;
    
    recommendations.forEach((rec, i) => {
        report += `    ${i + 1}.  ${rec}\n`;
    });
    
    report += `
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║  Generated: ${new Date().toLocaleString().padEnd(30)} Model: ML Predictor v2.0          ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝
`;
    
    return report;
}

function generateBar(percentage, width = 40) {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, empty));
}

function formatNum(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toFixed(2);
}

function padCenter(str, len) {
    str = String(str || '');
    if (str.length >= len) return str.slice(0, len);
    const left = Math.floor((len - str.length) / 2);
    const right = len - str.length - left;
    return ' '.repeat(left) + str + ' '.repeat(right);
}

module.exports = { PredictDonationLikelihood };