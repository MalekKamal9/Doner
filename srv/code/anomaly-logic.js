/**
 * Anomaly Detection for Donations
 * Detects unusual patterns like:
 * - Unusually large donations
 * - High frequency spikes
 * - Unusual timing patterns
 * - Suspicious donor behavior
 */

async function DetectAnomalies(request) {
    const { ID } = request.params[0];
    const { Donations } = cds.entities('Donor_management_Bita');
    
    // Get donor info
    const donor = await SELECT.one.from(request.target).where({ ID });
    if (!donor) {
        return '❌ Donor not found';
    }

    // Get donation history
    const donations = await SELECT.from(Donations)
        .where({ donor_Email: donor.email })
        .orderBy({ donation_date: 'desc' });

    // Get all donations for global comparison
    const allDonations = await SELECT.from(Donations);

    // Run anomaly detection
    const anomalyReport = detectAnomalies(donations, allDonations, donor);
    
    // Update donor summary with anomaly report
    await UPDATE(request.target).set({ summary: anomalyReport.report }).where({ ID });

    const alertEmoji = anomalyReport.riskLevel === 'HIGH' ? '🚨' : 
                       anomalyReport.riskLevel === 'MEDIUM' ? '⚠️' : '✅';

    return `${alertEmoji} Anomaly Scan Complete: ${anomalyReport.riskLevel} Risk (${anomalyReport.anomalyCount} anomalies detected)`;
}

/**
 * Main anomaly detection function
 */
function detectAnomalies(donorDonations, allDonations, donor) {
    const anomalies = [];
    
    if (!donorDonations || donorDonations.length === 0) {
        return {
            anomalyCount: 0,
            riskLevel: 'LOW',
            report: generateNoHistoryReport(donor)
        };
    }

    // Calculate global statistics for comparison
    const globalStats = calculateGlobalStats(allDonations);
    
    // Calculate donor-specific statistics
    const donorStats = calculateDonorStats(donorDonations);

    // ═══════════════════════════════════════════════════════════════════════
    // ANOMALY DETECTION CHECKS
    // ═══════════════════════════════════════════════════════════════════════

    // 1. AMOUNT ANOMALIES - Unusually large donations
    const amountAnomalies = detectAmountAnomalies(donorDonations, donorStats, globalStats);
    anomalies.push(...amountAnomalies);

    // 2. FREQUENCY ANOMALIES - Sudden spikes in donation frequency
    const frequencyAnomalies = detectFrequencyAnomalies(donorDonations, donorStats);
    anomalies.push(...frequencyAnomalies);

    // 3. TIMING ANOMALIES - Unusual timing patterns
    const timingAnomalies = detectTimingAnomalies(donorDonations);
    anomalies.push(...timingAnomalies);

    // 4. PATTERN ANOMALIES - Suspicious patterns
    const patternAnomalies = detectPatternAnomalies(donorDonations, donorStats, globalStats);
    anomalies.push(...patternAnomalies);

    // 5. VELOCITY ANOMALIES - Rapid changes
    const velocityAnomalies = detectVelocityAnomalies(donorDonations);
    anomalies.push(...velocityAnomalies);

    // Calculate overall risk level
    const riskLevel = calculateRiskLevel(anomalies);

    // Generate report
    const report = generateAnomalyReport(donor, donorDonations, anomalies, donorStats, globalStats, riskLevel);

    return {
        anomalyCount: anomalies.length,
        riskLevel,
        anomalies,
        report
    };
}

/**
 * Calculate global statistics from all donations
 */
function calculateGlobalStats(allDonations) {
    if (!allDonations || allDonations.length === 0) {
        return { avgAmount: 0, stdDev: 0, median: 0, q1: 0, q3: 0, iqr: 0 };
    }

    const amounts = allDonations.map(d => parseFloat(d.amount) || 0).sort((a, b) => a - b);
    const sum = amounts.reduce((a, b) => a + b, 0);
    const avg = sum / amounts.length;
    
    // Standard deviation
    const squaredDiffs = amounts.map(a => Math.pow(a - avg, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(avgSquaredDiff);

    // Quartiles for IQR method
    const median = amounts[Math.floor(amounts.length / 2)];
    const q1 = amounts[Math.floor(amounts.length * 0.25)];
    const q3 = amounts[Math.floor(amounts.length * 0.75)];
    const iqr = q3 - q1;

    return { avgAmount: avg, stdDev, median, q1, q3, iqr, count: amounts.length };
}

/**
 * Calculate donor-specific statistics
 */
function calculateDonorStats(donations) {
    if (!donations || donations.length === 0) {
        return { avgAmount: 0, stdDev: 0, avgFrequency: 0 };
    }

    const amounts = donations.map(d => parseFloat(d.amount) || 0);
    const sum = amounts.reduce((a, b) => a + b, 0);
    const avg = sum / amounts.length;

    // Standard deviation
    const squaredDiffs = amounts.map(a => Math.pow(a - avg, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(avgSquaredDiff);

    // Calculate average days between donations
    const sortedDates = donations
        .map(d => new Date(d.donation_date))
        .sort((a, b) => b - a);
    
    let totalDays = 0;
    for (let i = 1; i < sortedDates.length; i++) {
        totalDays += (sortedDates[i-1] - sortedDates[i]) / (24 * 60 * 60 * 1000);
    }
    const avgDaysBetween = sortedDates.length > 1 ? totalDays / (sortedDates.length - 1) : 0;

    return { 
        avgAmount: avg, 
        stdDev, 
        totalAmount: sum,
        count: donations.length,
        avgDaysBetween,
        minAmount: Math.min(...amounts),
        maxAmount: Math.max(...amounts)
    };
}

/**
 * Detect amount anomalies using Z-score and IQR methods
 */
function detectAmountAnomalies(donations, donorStats, globalStats) {
    const anomalies = [];

    donations.forEach(donation => {
        const amount = parseFloat(donation.amount) || 0;
        const date = donation.donation_date;

        // Z-Score method (compared to donor's history)
        if (donorStats.stdDev > 0) {
            const zScore = (amount - donorStats.avgAmount) / donorStats.stdDev;
            if (zScore > 3) {
                anomalies.push({
                    type: 'AMOUNT_SPIKE',
                    severity: zScore > 4 ? 'HIGH' : 'MEDIUM',
                    date: date,
                    amount: amount,
                    description: `Donation of $${amount.toLocaleString()} is ${zScore.toFixed(1)} standard deviations above donor's average ($${donorStats.avgAmount.toLocaleString()})`,
                    metric: `Z-Score: ${zScore.toFixed(2)}`
                });
            }
        }

        // IQR method (compared to global)
        if (globalStats.iqr > 0) {
            const upperBound = globalStats.q3 + (1.5 * globalStats.iqr);
            const extremeUpperBound = globalStats.q3 + (3 * globalStats.iqr);
            
            if (amount > extremeUpperBound) {
                anomalies.push({
                    type: 'EXTREME_AMOUNT',
                    severity: 'HIGH',
                    date: date,
                    amount: amount,
                    description: `Donation of $${amount.toLocaleString()} is an extreme outlier (>${extremeUpperBound.toLocaleString()} threshold)`,
                    metric: `${((amount / globalStats.avgAmount) * 100).toFixed(0)}% of global average`
                });
            } else if (amount > upperBound) {
                anomalies.push({
                    type: 'LARGE_AMOUNT',
                    severity: 'MEDIUM',
                    date: date,
                    amount: amount,
                    description: `Donation of $${amount.toLocaleString()} exceeds normal range (>${upperBound.toLocaleString()} threshold)`,
                    metric: `${((amount / globalStats.avgAmount) * 100).toFixed(0)}% of global average`
                });
            }
        }

        // Sudden jump from previous donation
        if (donorStats.maxAmount > 0 && amount > donorStats.avgAmount * 5) {
            anomalies.push({
                type: 'SUDDEN_INCREASE',
                severity: 'HIGH',
                date: date,
                amount: amount,
                description: `Donation is ${(amount / donorStats.avgAmount).toFixed(1)}x the donor's average`,
                metric: `Previous avg: $${donorStats.avgAmount.toLocaleString()}`
            });
        }
    });

    return anomalies;
}

/**
 * Detect frequency anomalies - sudden spikes in donation frequency
 */
function detectFrequencyAnomalies(donations, donorStats) {
    const anomalies = [];
    
    if (donations.length < 3) return anomalies;

    // Group donations by week
    const weeklyGroups = {};
    donations.forEach(d => {
        const date = new Date(d.donation_date);
        const weekKey = getWeekKey(date);
        if (!weeklyGroups[weekKey]) weeklyGroups[weekKey] = [];
        weeklyGroups[weekKey].push(d);
    });

    // Check for weeks with unusual activity
    const weeklyCounts = Object.values(weeklyGroups).map(g => g.length);
    const avgWeekly = weeklyCounts.reduce((a, b) => a + b, 0) / weeklyCounts.length;
    
    Object.entries(weeklyGroups).forEach(([week, weekDonations]) => {
        if (weekDonations.length > avgWeekly * 3 && weekDonations.length >= 3) {
            const weekTotal = weekDonations.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
            anomalies.push({
                type: 'FREQUENCY_SPIKE',
                severity: weekDonations.length > avgWeekly * 5 ? 'HIGH' : 'MEDIUM',
                date: week,
                amount: weekTotal,
                description: `${weekDonations.length} donations in one week (normal: ${avgWeekly.toFixed(1)}/week)`,
                metric: `${(weekDonations.length / avgWeekly).toFixed(1)}x normal frequency`
            });
        }
    });

    // Check for rapid successive donations (same day or consecutive days)
    const sortedDonations = [...donations].sort((a, b) => 
        new Date(b.donation_date) - new Date(a.donation_date)
    );

    for (let i = 1; i < sortedDonations.length; i++) {
        const current = new Date(sortedDonations[i-1].donation_date);
        const previous = new Date(sortedDonations[i].donation_date);
        const daysDiff = (current - previous) / (24 * 60 * 60 * 1000);

        if (daysDiff === 0) {
            // Same day multiple donations
            anomalies.push({
                type: 'SAME_DAY_MULTIPLE',
                severity: 'MEDIUM',
                date: sortedDonations[i-1].donation_date,
                amount: parseFloat(sortedDonations[i-1].amount) + parseFloat(sortedDonations[i].amount),
                description: 'Multiple donations on the same day',
                metric: `2+ donations on ${sortedDonations[i-1].donation_date}`
            });
        }
    }

    return anomalies;
}

/**
 * Detect timing anomalies
 */
function detectTimingAnomalies(donations) {
    const anomalies = [];
    
    // Check for unusual patterns like all donations at month end
    const dayOfMonthCounts = new Array(31).fill(0);
    donations.forEach(d => {
        const day = new Date(d.donation_date).getDate();
        dayOfMonthCounts[day - 1]++;
    });

    // Check for suspicious concentration
    const maxDayCount = Math.max(...dayOfMonthCounts);
    const maxDayIndex = dayOfMonthCounts.indexOf(maxDayCount);
    
    if (maxDayCount > donations.length * 0.5 && donations.length >= 5) {
        anomalies.push({
            type: 'DATE_PATTERN',
            severity: 'LOW',
            date: 'Pattern',
            amount: 0,
            description: `${maxDayCount} of ${donations.length} donations on day ${maxDayIndex + 1} of month`,
            metric: `${((maxDayCount / donations.length) * 100).toFixed(0)}% concentration`
        });
    }

    return anomalies;
}

/**
 * Detect pattern anomalies
 */
function detectPatternAnomalies(donations, donorStats, globalStats) {
    const anomalies = [];

    // Check for round number pattern (potential structuring)
    const roundNumbers = donations.filter(d => {
        const amount = parseFloat(d.amount) || 0;
        return amount >= 1000 && amount % 1000 === 0;
    });

    if (roundNumbers.length > donations.length * 0.8 && donations.length >= 5) {
        anomalies.push({
            type: 'ROUND_NUMBER_PATTERN',
            severity: 'MEDIUM',
            date: 'Pattern',
            amount: 0,
            description: `${roundNumbers.length} of ${donations.length} donations are round thousands`,
            metric: 'Potential structuring indicator'
        });
    }

    // Check if donor's average is significantly higher than global
    if (globalStats.avgAmount > 0 && donorStats.avgAmount > globalStats.avgAmount * 10) {
        anomalies.push({
            type: 'ABOVE_AVERAGE_DONOR',
            severity: 'LOW',
            date: 'Overall',
            amount: donorStats.avgAmount,
            description: `Donor's average ($${donorStats.avgAmount.toLocaleString()}) is ${(donorStats.avgAmount / globalStats.avgAmount).toFixed(1)}x global average`,
            metric: `Global avg: $${globalStats.avgAmount.toLocaleString()}`
        });
    }

    // Check for identical amounts (potential automated donations)
    const amountCounts = {};
    donations.forEach(d => {
        const amount = parseFloat(d.amount) || 0;
        amountCounts[amount] = (amountCounts[amount] || 0) + 1;
    });

    Object.entries(amountCounts).forEach(([amount, count]) => {
        if (count >= 5 && count > donations.length * 0.5) {
            anomalies.push({
                type: 'IDENTICAL_AMOUNTS',
                severity: 'LOW',
                date: 'Pattern',
                amount: parseFloat(amount),
                description: `${count} donations of exactly $${parseFloat(amount).toLocaleString()}`,
                metric: 'Consistent recurring pattern'
            });
        }
    });

    return anomalies;
}

/**
 * Detect velocity anomalies - rapid changes in giving behavior
 */
function detectVelocityAnomalies(donations) {
    const anomalies = [];
    
    if (donations.length < 4) return anomalies;

    // Compare recent period to historical
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));

    const last30Days = donations.filter(d => new Date(d.donation_date) >= thirtyDaysAgo);
    const days31to90 = donations.filter(d => {
        const date = new Date(d.donation_date);
        return date >= ninetyDaysAgo && date < thirtyDaysAgo;
    });

    if (last30Days.length > 0 && days31to90.length > 0) {
        const recent30Total = last30Days.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
        const prev60Total = days31to90.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
        
        // Normalize to 30-day period
        const prev60Normalized = (prev60Total / 2);

        if (prev60Normalized > 0 && recent30Total > prev60Normalized * 5) {
            anomalies.push({
                type: 'VELOCITY_SPIKE',
                severity: 'HIGH',
                date: 'Last 30 days',
                amount: recent30Total,
                description: `Recent 30-day total ($${recent30Total.toLocaleString()}) is ${(recent30Total / prev60Normalized).toFixed(1)}x the previous period`,
                metric: `Previous 30-day avg: $${prev60Normalized.toLocaleString()}`
            });
        }
    }

    return anomalies;
}

/**
 * Calculate overall risk level based on anomalies
 */
function calculateRiskLevel(anomalies) {
    if (anomalies.length === 0) return 'LOW';

    const highCount = anomalies.filter(a => a.severity === 'HIGH').length;
    const mediumCount = anomalies.filter(a => a.severity === 'MEDIUM').length;

    if (highCount >= 2 || (highCount >= 1 && mediumCount >= 2)) {
        return 'HIGH';
    } else if (highCount >= 1 || mediumCount >= 2) {
        return 'MEDIUM';
    } else {
        return 'LOW';
    }
}

/**
 * Get week key for grouping
 */
function getWeekKey(date) {
    const year = date.getFullYear();
    const week = Math.ceil((date.getDate() + new Date(year, date.getMonth(), 1).getDay()) / 7);
    return `${year}-${String(date.getMonth() + 1).padStart(2, '0')}-W${week}`;
}

/**
 * Generate anomaly report
 */
function generateAnomalyReport(donor, donations, anomalies, donorStats, globalStats, riskLevel) {
    const riskEmoji = riskLevel === 'HIGH' ? '🚨' : riskLevel === 'MEDIUM' ? '⚠️' : '✅';
    const riskColor = riskLevel === 'HIGH' ? 'RED' : riskLevel === 'MEDIUM' ? 'YELLOW' : 'GREEN';

    let report = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${riskEmoji} ANOMALY DETECTION REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────────────────────────────────────┐
│  RISK LEVEL: ${riskLevel} ${riskEmoji}
│  ANOMALIES DETECTED: ${anomalies.length}
│  DONATIONS ANALYZED: ${donations.length}
└─────────────────────────────────────────────────────────────────────────────┘

`;

    if (anomalies.length === 0) {
        report += `✅ NO ANOMALIES DETECTED

All donation patterns appear normal. No suspicious activity found.

`;
    } else {
        // Group anomalies by severity
        const highAnomalies = anomalies.filter(a => a.severity === 'HIGH');
        const mediumAnomalies = anomalies.filter(a => a.severity === 'MEDIUM');
        const lowAnomalies = anomalies.filter(a => a.severity === 'LOW');

        if (highAnomalies.length > 0) {
            report += `🚨 HIGH SEVERITY ALERTS (${highAnomalies.length})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
            highAnomalies.forEach((a, i) => {
                report += `
   ${i + 1}. ${getAnomalyIcon(a.type)} ${a.type.replace(/_/g, ' ')}
      ├─ ${a.description}
      ├─ Date: ${a.date}
      ├─ Amount: $${a.amount.toLocaleString()}
      └─ ${a.metric}
`;
            });
            report += '\n';
        }

        if (mediumAnomalies.length > 0) {
            report += `⚠️  MEDIUM SEVERITY ALERTS (${mediumAnomalies.length})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
            mediumAnomalies.forEach((a, i) => {
                report += `
   ${i + 1}. ${getAnomalyIcon(a.type)} ${a.type.replace(/_/g, ' ')}
      ├─ ${a.description}
      ├─ Date: ${a.date}
      └─ ${a.metric}
`;
            });
            report += '\n';
        }

        if (lowAnomalies.length > 0) {
            report += `📋 LOW SEVERITY OBSERVATIONS (${lowAnomalies.length})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
            lowAnomalies.forEach((a, i) => {
                report += `
   ${i + 1}. ${getAnomalyIcon(a.type)} ${a.type.replace(/_/g, ' ')}
      └─ ${a.description}
`;
            });
            report += '\n';
        }
    }

    // Statistics section
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 DONOR STATISTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   Total Donations:      ${donorStats.count}
   Total Amount:         $${donorStats.totalAmount.toLocaleString()}
   Average Donation:     $${donorStats.avgAmount.toLocaleString()}
   Min Donation:         $${donorStats.minAmount.toLocaleString()}
   Max Donation:         $${donorStats.maxAmount.toLocaleString()}
   Std Deviation:        $${donorStats.stdDev.toLocaleString()}
   Avg Days Between:     ${donorStats.avgDaysBetween.toFixed(1)} days

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 GLOBAL COMPARISON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   Global Avg Donation:  $${globalStats.avgAmount.toLocaleString()}
   Global Median:        $${globalStats.median.toLocaleString()}
   Global Std Dev:       $${globalStats.stdDev.toLocaleString()}
   Donor vs Global:      ${(donorStats.avgAmount / globalStats.avgAmount * 100).toFixed(0)}% of average

`;

    // Recommendations
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 RECOMMENDED ACTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    const recommendations = getRecommendations(riskLevel, anomalies);
    recommendations.forEach((rec, i) => {
        report += `   ${i + 1}. ${rec}\n`;
    });

    report += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated: ${new Date().toISOString().split('T')[0]}
Model: Anomaly Detection v1.0 (Z-Score + IQR Methods)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    return report;
}

/**
 * Generate report for donors with no history
 */
function generateNoHistoryReport(donor) {
    return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 ANOMALY DETECTION REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────────────────────────────────────┐
│  RISK LEVEL: LOW ✅
│  STATUS: No donation history to analyze
└─────────────────────────────────────────────────────────────────────────────┘

ℹ️  This donor has no recorded donations yet.
    Anomaly detection requires donation history to function.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated: ${new Date().toISOString().split('T')[0]}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

/**
 * Get icon for anomaly type
 */
function getAnomalyIcon(type) {
    const icons = {
        'AMOUNT_SPIKE': '💰',
        'EXTREME_AMOUNT': '💎',
        'LARGE_AMOUNT': '📈',
        'SUDDEN_INCREASE': '⬆️',
        'FREQUENCY_SPIKE': '📊',
        'SAME_DAY_MULTIPLE': '📅',
        'DATE_PATTERN': '🗓️',
        'ROUND_NUMBER_PATTERN': '🔢',
        'ABOVE_AVERAGE_DONOR': '⭐',
        'IDENTICAL_AMOUNTS': '🔁',
        'VELOCITY_SPIKE': '🚀'
    };
    return icons[type] || '⚠️';
}

/**
 * Get recommendations based on risk level and anomalies
 */
function getRecommendations(riskLevel, anomalies) {
    const recommendations = [];

    if (riskLevel === 'HIGH') {
        recommendations.push('🚨 IMMEDIATE REVIEW REQUIRED - Flag for compliance team');
        recommendations.push('📞 Contact donor to verify recent large transactions');
        recommendations.push('📋 Document all unusual activity for audit trail');
        recommendations.push('🔍 Cross-reference with external fraud databases');
    } else if (riskLevel === 'MEDIUM') {
        recommendations.push('👀 Monitor this donor\'s future transactions closely');
        recommendations.push('📧 Send acknowledgment letter for large donations');
        recommendations.push('📝 Add notes to donor profile about patterns observed');
    } else {
        recommendations.push('✅ No immediate action required');
        recommendations.push('📊 Continue routine monitoring');
        recommendations.push('🙏 Send thank you for consistent support');
    }

    // Add specific recommendations based on anomaly types
    const hasAmountAnomaly = anomalies.some(a => a.type.includes('AMOUNT'));
    const hasFrequencyAnomaly = anomalies.some(a => a.type.includes('FREQUENCY'));

    if (hasAmountAnomaly) {
        recommendations.push('💰 Verify source of funds for large donations');
    }

    if (hasFrequencyAnomaly) {
        recommendations.push('📅 Review donation schedule for potential automation');
    }

    return recommendations.slice(0, 5);
}

module.exports = { DetectAnomalies };