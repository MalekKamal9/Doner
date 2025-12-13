/**
 * Anomaly Detection for Fraud Prevention
 * Saves to anomalyResult field
 */

async function DetectAnomalies(request) {
    const { Donors, Donations } = cds.entities('Donor_management_Bita');
    const donorId = request.params[0]?.ID || request.params[0];
    
    const donor = await SELECT.one.from(Donors).where({ ID: donorId });
    if (!donor) {
        request.error(404, 'Donor not found');
        return;
    }

    const donorDonations = await SELECT.from(Donations)
        .where({ donor_Email: donor.email })
        .orderBy({ donation_date: 'desc' });

    const allDonations = await SELECT.from(Donations);

    console.log('🔍 Running anomaly detection for:', donor.name);

    // Generate anomaly report
    const analysis = analyzeAnomalies(donor, donorDonations, allDonations);
    
    // Save to anomalyResult field
    await UPDATE(Donors).set({ anomalyResult: analysis.report }).where({ ID: donorId });

    // Show success message
    const statusIcon = analysis.riskLevel === 'HIGH' ? '🔴' : analysis.riskLevel === 'MEDIUM' ? '🟡' : '🟢';
    request.info(`🔍 Anomaly Detection Complete!\n\n${statusIcon} Risk Level: ${analysis.riskLevel}\n⚠️ Anomalies Found: ${analysis.anomalyCount}\n\n✅ Results saved. Page will refresh.`);

    return analysis.report;
}

function analyzeAnomalies(donor, donorDonations, allDonations) {
    if (!donorDonations || donorDonations.length === 0) {
        return {
            report: buildNoDataReport(donor),
            riskLevel: 'LOW',
            anomalyCount: 0
        };
    }

    // Calculate global statistics
    const globalStats = calculateGlobalStats(allDonations);
    
    // Calculate donor statistics
    const donorStats = calculateDonorStats(donorDonations);
    
    // Detect anomalies
    const anomalies = detectAllAnomalies(donorDonations, donorStats, globalStats);
    
    // Calculate risk level
    const riskLevel = calculateRiskLevel(anomalies);
    
    // Build report
    const report = buildAnomalyReport(donor, donorStats, globalStats, anomalies, riskLevel, donorDonations);
    
    return {
        report,
        riskLevel,
        anomalyCount: anomalies.length
    };
}

function calculateGlobalStats(donations) {
    if (!donations || donations.length === 0) {
        return { avgAmount: 0, stdDev: 0, median: 0, q1: 0, q3: 0, iqr: 0 };
    }
    
    const amounts = donations.map(d => parseFloat(d.amount) || 0).sort((a, b) => a - b);
    const total = amounts.reduce((a, b) => a + b, 0);
    const avg = total / amounts.length;
    
    // Standard deviation
    const variance = amounts.reduce((sum, x) => sum + Math.pow(x - avg, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    
    // Quartiles
    const q1 = amounts[Math.floor(amounts.length * 0.25)];
    const median = amounts[Math.floor(amounts.length * 0.5)];
    const q3 = amounts[Math.floor(amounts.length * 0.75)];
    const iqr = q3 - q1;
    
    return { avgAmount: avg, stdDev, median, q1, q3, iqr, total, count: amounts.length };
}

function calculateDonorStats(donations) {
    const amounts = donations.map(d => parseFloat(d.amount) || 0);
    const total = amounts.reduce((a, b) => a + b, 0);
    const avg = total / amounts.length;
    
    const variance = amounts.reduce((sum, x) => sum + Math.pow(x - avg, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate donation intervals
    const intervals = [];
    for (let i = 1; i < donations.length; i++) {
        const d1 = new Date(donations[i - 1].donation_date);
        const d2 = new Date(donations[i].donation_date);
        intervals.push(Math.abs(d1 - d2) / (24 * 60 * 60 * 1000));
    }
    const avgInterval = intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;
    
    return {
        avgAmount: avg,
        stdDev,
        total,
        count: donations.length,
        minAmount: Math.min(...amounts),
        maxAmount: Math.max(...amounts),
        avgInterval
    };
}

function detectAllAnomalies(donations, donorStats, globalStats) {
    const anomalies = [];
    
    donations.forEach((d, index) => {
        const amount = parseFloat(d.amount) || 0;
        
        // 1. Z-Score anomaly (statistical outlier)
        if (globalStats.stdDev > 0) {
            const zScore = (amount - globalStats.avgAmount) / globalStats.stdDev;
            if (Math.abs(zScore) > 3) {
                anomalies.push({
                    type: 'STATISTICAL_OUTLIER',
                    severity: 'HIGH',
                    donation: d,
                    detail: `Z-score of ${zScore.toFixed(2)} (>${Math.abs(zScore) > 4 ? '4' : '3'} std dev)`,
                    icon: '📊'
                });
            }
        }
        
        // 2. IQR anomaly (box plot outlier)
        if (globalStats.iqr > 0) {
            const upperFence = globalStats.q3 + (3 * globalStats.iqr);
            const lowerFence = globalStats.q1 - (3 * globalStats.iqr);
            if (amount > upperFence || amount < lowerFence) {
                anomalies.push({
                    type: 'IQR_EXTREME_OUTLIER',
                    severity: 'HIGH',
                    donation: d,
                    detail: `Amount ${amount > upperFence ? 'exceeds' : 'below'} IQR fence`,
                    icon: '📈'
                });
            }
        }
        
        // 3. Sudden increase from donor's average
        if (donorStats.avgAmount > 0 && amount > donorStats.avgAmount * 5) {
            anomalies.push({
                type: 'SUDDEN_INCREASE',
                severity: 'MEDIUM',
                donation: d,
                detail: `${(amount / donorStats.avgAmount).toFixed(1)}x donor's average`,
                icon: '⚡'
            });
        }
        
        // 4. Same-day multiple donations
        if (index > 0) {
            const prevDate = donations[index - 1].donation_date;
            if (d.donation_date === prevDate) {
                anomalies.push({
                    type: 'SAME_DAY_MULTIPLE',
                    severity: 'MEDIUM',
                    donation: d,
                    detail: `Multiple donations on ${d.donation_date}`,
                    icon: '📅'
                });
            }
        }
        
        // 5. Round number pattern (potential structuring)
        if (amount >= 1000 && amount % 1000 === 0) {
            anomalies.push({
                type: 'ROUND_NUMBER',
                severity: 'LOW',
                donation: d,
                detail: `Exactly ${amount.toLocaleString()} (round number)`,
                icon: '🔢'
            });
        }
    });
    
    // 6. Velocity check (many donations in short period)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentDonations = donations.filter(d => new Date(d.donation_date) >= thirtyDaysAgo);
    if (recentDonations.length >= 5) {
        anomalies.push({
            type: 'HIGH_VELOCITY',
            severity: 'MEDIUM',
            donation: recentDonations[0],
            detail: `${recentDonations.length} donations in last 30 days`,
            icon: '🚀'
        });
    }
    
    // 7. Currency mixing
    const currencies = [...new Set(donations.map(d => d.currency_code))];
    if (currencies.length > 1) {
        anomalies.push({
            type: 'CURRENCY_MIXING',
            severity: 'LOW',
            donation: donations[0],
            detail: `Multiple currencies used: ${currencies.join(', ')}`,
            icon: '💱'
        });
    }
    
    return anomalies;
}

function calculateRiskLevel(anomalies) {
    const highCount = anomalies.filter(a => a.severity === 'HIGH').length;
    const mediumCount = anomalies.filter(a => a.severity === 'MEDIUM').length;
    
    if (highCount >= 2 || (highCount >= 1 && mediumCount >= 2)) return 'HIGH';
    if (highCount >= 1 || mediumCount >= 2) return 'MEDIUM';
    return 'LOW';
}

function buildNoDataReport(donor) {
    return `
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                          ║
║           🔍 ANOMALY DETECTION REPORT                                                    ║
║                                                                                          ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ℹ️   NO DATA AVAILABLE                                                                  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

    This donor has no donation history to analyze.

    Status: 🟢 NO RISK (No data to evaluate)

╔══════════════════════════════════════════════════════════════════════════════════════════╗
║  Generated: ${new Date().toLocaleString().padEnd(30)} Model: Anomaly Detector v2.0      ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝
`;
}

function buildAnomalyReport(donor, donorStats, globalStats, anomalies, riskLevel, donations) {
    const c = donations[0]?.currency_code || 'USD';
    const riskIcon = riskLevel === 'HIGH' ? '🔴' : riskLevel === 'MEDIUM' ? '🟡' : '🟢';
    const riskBar = generateRiskBar(riskLevel);
    
    let report = `
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                          ║
║           🔍 ANOMALY DETECTION & FRAUD PREVENTION                                        ║
║                                                                                          ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ⚠️   RISK ASSESSMENT                                                                    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

    ╭─────────────────────────────────────────────────────────────────────────────────╮
    │                                                                                 │
    │   OVERALL RISK LEVEL                                                            │
    │   ${riskBar}                                                   │
    │                                                                                 │
    │   ${riskIcon}  ${riskLevel} RISK                                                               │
    │                                                                                 │
    │   Anomalies Detected: ${anomalies.length}                                                      │
    │   ├── 🔴 High:   ${anomalies.filter(a => a.severity === 'HIGH').length}                                                              │
    │   ├── 🟡 Medium: ${anomalies.filter(a => a.severity === 'MEDIUM').length}                                                              │
    │   └── 🟢 Low:    ${anomalies.filter(a => a.severity === 'LOW').length}                                                              │
    │                                                                                 │
    ╰─────────────────────────────────────────────────────────────────────────────────╯

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  📊  STATISTICAL COMPARISON                                                              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

                          DONOR                    GLOBAL
    ─────────────────────────────────────────────────────────────────────────
    Average Amount:       ${padLeft(c + ' ' + formatNum(donorStats.avgAmount), 18)}      ${padLeft(c + ' ' + formatNum(globalStats.avgAmount), 18)}
    Std Deviation:        ${padLeft(c + ' ' + formatNum(donorStats.stdDev), 18)}      ${padLeft(c + ' ' + formatNum(globalStats.stdDev), 18)}
    Total Amount:         ${padLeft(c + ' ' + formatNum(donorStats.total), 18)}      ${padLeft(c + ' ' + formatNum(globalStats.total), 18)}
    # Donations:          ${padLeft(donorStats.count.toString(), 18)}      ${padLeft(globalStats.count.toString(), 18)}
    ─────────────────────────────────────────────────────────────────────────

`;

    if (anomalies.length > 0) {
        report += `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  🚨  DETECTED ANOMALIES                                                                  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

`;
        anomalies.forEach((anomaly, i) => {
            const sevIcon = anomaly.severity === 'HIGH' ? '🔴' : anomaly.severity === 'MEDIUM' ? '🟡' : '🟢';
            report += `    ${i + 1}.  ${sevIcon} [${anomaly.severity}] ${anomaly.icon} ${anomaly.type.replace(/_/g, ' ')}
        └── ${anomaly.detail}
        └── Date: ${anomaly.donation.donation_date} | Amount: ${c} ${formatNum(parseFloat(anomaly.donation.amount))}

`;
        });
    } else {
        report += `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ✅  NO ANOMALIES DETECTED                                                               ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

    All donation patterns appear normal. No suspicious activity detected.

`;
    }

    // Recommendations
    report += `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  💡  RECOMMENDED ACTIONS                                                                 ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

`;
    
    if (riskLevel === 'HIGH') {
        report += `    ☐  Immediately review flagged transactions
    ☐  Contact donor to verify large donations
    ☐  Check for potential money laundering indicators
    ☐  Document findings in compliance log
    ☐  Consider filing SAR if warranted
`;
    } else if (riskLevel === 'MEDIUM') {
        report += `    ☐  Review flagged transactions within 48 hours
    ☐  Verify donor identity if not recently confirmed
    ☐  Monitor for additional unusual activity
    ☐  Update donor profile notes
`;
    } else {
        report += `    ☐  Continue standard monitoring
    ☐  No immediate action required
    ☐  Schedule routine review in 90 days
`;
    }

    report += `
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║  Generated: ${new Date().toLocaleString().padEnd(30)} Model: Anomaly Detector v2.0      ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝
`;
    
    return report;
}

function generateRiskBar(riskLevel) {
    if (riskLevel === 'HIGH') {
        return '█████████████████████████████████████████  HIGH RISK';
    } else if (riskLevel === 'MEDIUM') {
        return '████████████████████░░░░░░░░░░░░░░░░░░░░░  MEDIUM';
    } else {
        return '████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  LOW';
    }
}

function formatNum(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toFixed(2);
}

function padLeft(str, len) {
    str = String(str || '');
    if (str.length > len) return str.slice(0, len);
    return ' '.repeat(Math.max(0, len - str.length)) + str;
}

module.exports = { DetectAnomalies };