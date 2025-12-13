/**
 * Donation Likelihood Prediction
 * Predicts if a donor will donate again in the next 6 months
 * Based on donation history patterns
 */

async function PredictDonationLikelihood(request) {
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

    // Run prediction model
    const prediction = predictLikelihood(donations, donor);
    
    // Update donor summary with prediction
    const updatedSummary = await updateSummaryWithPrediction(donor, prediction);
    
    await UPDATE(request.target).set({ summary: updatedSummary }).where({ ID });

    return `✅ Prediction Complete: ${prediction.score} likelihood (${prediction.probability}%)`;
}

/**
 * Simple ML-like prediction model based on donation patterns
 */
function predictLikelihood(donations, donor) {
    const features = extractFeatures(donations, donor);
    const score = calculatePredictionScore(features);
    
    return {
        score: score.level,
        probability: score.probability,
        confidence: score.confidence,
        features: features,
        factors: score.factors
    };
}

/**
 * Feature extraction from donation history
 */
function extractFeatures(donations, donor) {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - (180 * 24 * 60 * 60 * 1000));
    const oneYearAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
    
    if (!donations || donations.length === 0) {
        return {
            totalDonations: 0,
            totalAmount: 0,
            avgAmount: 0,
            donationFrequency: 0,
            recencyDays: Infinity,
            lastSixMonthsDonations: 0,
            lastYearDonations: 0,
            isRecurring: donor?.isRecurringDonor || false,
            isHNI: donor?.isHNI || false,
            uniqueCampaigns: 0,
            uniqueCauses: 0,
            avgDaysBetweenDonations: Infinity,
            donationTrend: 'none',
            seasonalPattern: false
        };
    }

    // Parse dates and sort
    const sortedDonations = donations
        .map(d => ({
            ...d,
            date: new Date(d.donation_date),
            amount: parseFloat(d.amount) || 0
        }))
        .sort((a, b) => b.date - a.date);

    const totalAmount = sortedDonations.reduce((sum, d) => sum + d.amount, 0);
    const avgAmount = totalAmount / sortedDonations.length;

    // Recency - days since last donation
    const lastDonation = sortedDonations[0];
    const recencyDays = Math.floor((now - lastDonation.date) / (24 * 60 * 60 * 1000));

    // Recent activity
    const lastSixMonthsDonations = sortedDonations.filter(d => d.date >= sixMonthsAgo).length;
    const lastYearDonations = sortedDonations.filter(d => d.date >= oneYearAgo).length;

    // Unique campaigns and causes
    const uniqueCampaigns = new Set(sortedDonations.map(d => d.campaign).filter(Boolean)).size;
    const uniqueCauses = new Set(sortedDonations.map(d => d.cause).filter(Boolean)).size;

    // Average days between donations
    let totalDaysBetween = 0;
    for (let i = 1; i < sortedDonations.length; i++) {
        const daysBetween = (sortedDonations[i-1].date - sortedDonations[i].date) / (24 * 60 * 60 * 1000);
        totalDaysBetween += daysBetween;
    }
    const avgDaysBetweenDonations = sortedDonations.length > 1 
        ? totalDaysBetween / (sortedDonations.length - 1) 
        : Infinity;

    // Donation trend (increasing, decreasing, stable)
    const donationTrend = calculateTrend(sortedDonations);

    // Seasonal pattern detection
    const seasonalPattern = detectSeasonalPattern(sortedDonations);

    // Donation frequency (donations per year)
    const firstDonation = sortedDonations[sortedDonations.length - 1];
    const daysSinceFirst = Math.max(1, (now - firstDonation.date) / (24 * 60 * 60 * 1000));
    const donationFrequency = (sortedDonations.length / daysSinceFirst) * 365;

    return {
        totalDonations: sortedDonations.length,
        totalAmount,
        avgAmount,
        donationFrequency,
        recencyDays,
        lastSixMonthsDonations,
        lastYearDonations,
        isRecurring: donor?.isRecurringDonor || false,
        isHNI: donor?.isHNI || false,
        uniqueCampaigns,
        uniqueCauses,
        avgDaysBetweenDonations,
        donationTrend,
        seasonalPattern
    };
}

/**
 * Calculate donation trend
 */
function calculateTrend(donations) {
    if (donations.length < 3) return 'insufficient_data';
    
    const recent = donations.slice(0, Math.ceil(donations.length / 2));
    const older = donations.slice(Math.ceil(donations.length / 2));
    
    const recentAvg = recent.reduce((sum, d) => sum + d.amount, 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + d.amount, 0) / older.length;
    
    const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (changePercent > 15) return 'increasing';
    if (changePercent < -15) return 'decreasing';
    return 'stable';
}

/**
 * Detect seasonal donation patterns
 */
function detectSeasonalPattern(donations) {
    if (donations.length < 4) return false;
    
    const monthCounts = new Array(12).fill(0);
    donations.forEach(d => {
        monthCounts[d.date.getMonth()]++;
    });
    
    // Check if donations cluster in certain months (year-end giving, etc.)
    const maxMonth = Math.max(...monthCounts);
    const avgMonth = donations.length / 12;
    
    return maxMonth > avgMonth * 2;
}

/**
 * Calculate prediction score using weighted factors
 */
function calculatePredictionScore(features) {
    let score = 0;
    const factors = [];
    
    // Weight factors for prediction
    const weights = {
        recency: 25,           // Recent donation is strong signal
        frequency: 20,         // Regular donors more likely
        engagement: 15,        // Multiple campaigns/causes
        amount: 10,            // Higher amounts = more committed
        recurring: 15,         // Recurring flag
        hni: 5,                // VIP status
        trend: 10              // Donation trend
    };

    // 1. RECENCY SCORE (0-25 points)
    // More recent = higher score
    if (features.recencyDays <= 30) {
        score += 25;
        factors.push({ factor: 'Very Recent Activity', impact: '+25', description: 'Donated within last 30 days' });
    } else if (features.recencyDays <= 90) {
        score += 20;
        factors.push({ factor: 'Recent Activity', impact: '+20', description: 'Donated within last 3 months' });
    } else if (features.recencyDays <= 180) {
        score += 15;
        factors.push({ factor: 'Moderate Recency', impact: '+15', description: 'Donated within last 6 months' });
    } else if (features.recencyDays <= 365) {
        score += 8;
        factors.push({ factor: 'Past Year Donor', impact: '+8', description: 'Donated within last year' });
    } else if (features.totalDonations > 0) {
        score += 3;
        factors.push({ factor: 'Lapsed Donor', impact: '+3', description: 'No donation in over a year' });
    } else {
        factors.push({ factor: 'No History', impact: '+0', description: 'No previous donations' });
    }

    // 2. FREQUENCY SCORE (0-20 points)
    if (features.donationFrequency >= 12) {
        score += 20;
        factors.push({ factor: 'Monthly Donor', impact: '+20', description: '12+ donations per year' });
    } else if (features.donationFrequency >= 4) {
        score += 15;
        factors.push({ factor: 'Quarterly Donor', impact: '+15', description: '4-11 donations per year' });
    } else if (features.donationFrequency >= 2) {
        score += 10;
        factors.push({ factor: 'Semi-Annual Donor', impact: '+10', description: '2-3 donations per year' });
    } else if (features.donationFrequency >= 1) {
        score += 5;
        factors.push({ factor: 'Annual Donor', impact: '+5', description: '1 donation per year' });
    }

    // 3. ENGAGEMENT SCORE (0-15 points)
    const engagementScore = Math.min(15, (features.uniqueCampaigns * 3) + (features.uniqueCauses * 2));
    if (engagementScore > 0) {
        score += engagementScore;
        factors.push({ 
            factor: 'Multi-Campaign Engagement', 
            impact: `+${engagementScore}`, 
            description: `${features.uniqueCampaigns} campaigns, ${features.uniqueCauses} causes` 
        });
    }

    // 4. AMOUNT SCORE (0-10 points)
    if (features.avgAmount >= 5000) {
        score += 10;
        factors.push({ factor: 'Major Donor', impact: '+10', description: 'Avg donation $5,000+' });
    } else if (features.avgAmount >= 1000) {
        score += 7;
        factors.push({ factor: 'Significant Donor', impact: '+7', description: 'Avg donation $1,000+' });
    } else if (features.avgAmount >= 100) {
        score += 4;
        factors.push({ factor: 'Regular Donor', impact: '+4', description: 'Avg donation $100+' });
    }

    // 5. RECURRING FLAG (0-15 points)
    if (features.isRecurring) {
        score += 15;
        factors.push({ factor: 'Recurring Donor', impact: '+15', description: 'Marked as recurring donor' });
    }

    // 6. VIP STATUS (0-5 points)
    if (features.isHNI) {
        score += 5;
        factors.push({ factor: 'VIP Donor', impact: '+5', description: 'High Net-worth Individual' });
    }

    // 7. TREND SCORE (0-10 points)
    if (features.donationTrend === 'increasing') {
        score += 10;
        factors.push({ factor: 'Increasing Trend', impact: '+10', description: 'Donation amounts increasing' });
    } else if (features.donationTrend === 'stable') {
        score += 6;
        factors.push({ factor: 'Stable Pattern', impact: '+6', description: 'Consistent donation amounts' });
    } else if (features.donationTrend === 'decreasing') {
        score += 2;
        factors.push({ factor: 'Decreasing Trend', impact: '+2', description: 'Donation amounts decreasing' });
    }

    // Calculate final probability (0-100)
    const maxPossibleScore = 100;
    const probability = Math.min(99, Math.round((score / maxPossibleScore) * 100));

    // Determine level
    let level;
    if (probability >= 70) {
        level = '🟢 HIGH';
    } else if (probability >= 40) {
        level = '🟡 MEDIUM';
    } else {
        level = '🔴 LOW';
    }

    // Confidence based on data quality
    let confidence;
    if (features.totalDonations >= 10) {
        confidence = 'High';
    } else if (features.totalDonations >= 5) {
        confidence = 'Medium';
    } else if (features.totalDonations >= 1) {
        confidence = 'Low';
    } else {
        confidence = 'Very Low';
    }

    return {
        level,
        probability,
        confidence,
        rawScore: score,
        factors
    };
}

/**
 * Update summary with prediction results
 */
async function updateSummaryWithPrediction(donor, prediction) {
    const f = prediction.features;
    
    let summary = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 DONATION LIKELIHOOD PREDICTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────────────────────────────────────┐
│  PREDICTION: ${prediction.score}                                            
│  PROBABILITY: ${prediction.probability}%                                    
│  CONFIDENCE: ${prediction.confidence} (based on ${f.totalDonations} donations)
└─────────────────────────────────────────────────────────────────────────────┘

📊 PREDICTION FACTORS:
`;

    // Add each factor
    prediction.factors.forEach(factor => {
        summary += `   • ${factor.factor}: ${factor.impact}\n`;
        summary += `     └─ ${factor.description}\n`;
    });

    summary += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 DONOR METRICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   Total Donations:     ${f.totalDonations}
   Total Amount:        $${f.totalAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}
   Average Donation:    $${f.avgAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}
   Last 6 Months:       ${f.lastSixMonthsDonations} donations
   Last Year:           ${f.lastYearDonations} donations
   Days Since Last:     ${f.recencyDays === Infinity ? 'N/A' : f.recencyDays + ' days'}
   Donation Frequency:  ${f.donationFrequency.toFixed(1)} per year
   Campaigns Supported: ${f.uniqueCampaigns}
   Causes Supported:    ${f.uniqueCauses}
   Donation Trend:      ${f.donationTrend}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 RECOMMENDED ACTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    // Add recommendations based on prediction
    const recommendations = getRecommendations(prediction, f);
    recommendations.forEach((rec, i) => {
        summary += `   ${i + 1}. ${rec}\n`;
    });

    summary += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated: ${new Date().toISOString().split('T')[0]}
Model: Donation Likelihood Predictor v1.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    return summary;
}

/**
 * Generate recommendations based on prediction
 */
function getRecommendations(prediction, features) {
    const recommendations = [];
    
    if (prediction.probability >= 70) {
        // High likelihood
        recommendations.push('🌟 Prime candidate for major gift solicitation');
        recommendations.push('📧 Send personalized impact report highlighting their contributions');
        if (!features.isRecurring) {
            recommendations.push('🔄 Invite to join recurring giving program');
        }
        recommendations.push('🎉 Invite to exclusive donor appreciation event');
    } else if (prediction.probability >= 40) {
        // Medium likelihood
        recommendations.push('📞 Schedule personal check-in call');
        recommendations.push('📊 Share specific impact stories from their supported causes');
        if (features.recencyDays > 90) {
            recommendations.push('⏰ Send re-engagement email with recent organization updates');
        }
        recommendations.push('🎯 Suggest new campaigns aligned with their giving history');
    } else {
        // Low likelihood
        if (features.totalDonations === 0) {
            recommendations.push('👋 Send welcome email with organization overview');
            recommendations.push('📖 Share compelling impact stories to inspire first gift');
        } else {
            recommendations.push('🔍 Research potential barriers to giving');
            recommendations.push('📧 Send survey to understand donor preferences');
            recommendations.push('🤝 Offer volunteer opportunities to re-engage');
        }
        recommendations.push('📱 Add to nurture email campaign');
    }

    // Specific recommendations based on features
    if (features.donationTrend === 'decreasing') {
        recommendations.push('⚠️ Address declining engagement with personal outreach');
    }
    
    if (features.isHNI && features.recencyDays > 180) {
        recommendations.push('🏆 Schedule executive-level meeting to discuss major gift opportunity');
    }

    return recommendations.slice(0, 5); // Limit to 5 recommendations
}

module.exports = { PredictDonationLikelihood };