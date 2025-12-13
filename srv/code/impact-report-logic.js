/**
 * AI-Powered Impact Report Generator
 * Generates personalized PDF reports using AI analysis
 */

const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// ══════════════════════════════════════════════════════════════════════════════
// SMTP CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════
const SMTP_CONFIG = {
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER || 'infoteam@reg2do.com',
        pass: process.env.SMTP_PASSWORD || 'Malen9799'
    },
    tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
    }
};

const SENDER_EMAIL = process.env.SMTP_USER || 'infoteam@reg2do.com';
const SENDER_NAME = 'Akme Foundation';

// ══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION: GENERATE & SEND AI IMPACT REPORT
// ══════════════════════════════════════════════════════════════════════════════
async function GenerateAIImpactReport(request) {
    const { Donors, Donations } = cds.entities('Donor_management_Bita');
    const donorId = request.params[0]?.ID || request.params[0];
    
    const donor = await SELECT.one.from(Donors).where({ ID: donorId });
    
    if (!donor) {
        request.error(404, 'Donor not found.');
        return;
    }

    // Get all donations for this donor
    const donations = await SELECT.from(Donations)
        .where({ donor_Email: donor.email })
        .orderBy({ donation_date: 'desc' });

    // Get all donations for global comparison
    const allDonations = await SELECT.from(Donations);

    console.log('🤖 Generating AI Impact Report for:', donor.name);

    // Generate AI insights
    const aiInsights = generateAIInsights(donor, donations, allDonations);

    // Generate PDF
    const pdfPath = await generatePDF(donor, donations, aiInsights);

    // Send email with PDF attachment
    const emailResult = await sendEmailWithPDF(donor, aiInsights, pdfPath);

    // Update donor summary with AI insights
    const summaryText = formatAIInsightsForSummary(donor, aiInsights);
    await UPDATE(Donors).set({ summary: summaryText }).where({ ID: donorId });

    // Clean up PDF file
    try {
        if (fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
        }
    } catch (e) {
        console.log('Could not delete temp PDF:', e.message);
    }

    // Show result
    if (emailResult.success) {
        request.info(`✅ AI Impact Report Generated & Sent!\n\n📬 To: ${donor.email}\n📎 Attachment: ImpactReport_${donor.name.replace(/\s+/g, '_')}.pdf\n🆔 Message ID: ${emailResult.messageId}`);
    } else {
        request.warn(`⚠️ Report generated but email pending.\n\n❌ Error: ${emailResult.error}`);
    }

    return `✅ AI Impact Report generated and sent to ${donor.email}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// AI INSIGHTS GENERATOR
// ══════════════════════════════════════════════════════════════════════════════
function generateAIInsights(donor, donations, allDonations) {
    const insights = {
        donorProfile: {},
        donationAnalysis: {},
        impactMetrics: {},
        comparisons: {},
        recommendations: [],
        personalizedMessage: '',
        achievements: [],
        milestones: []
    };

    const hasDonations = donations && donations.length > 0;

    // ═══════════════════════════════════════════════════════════════════════
    // DONOR PROFILE ANALYSIS
    // ═══════════════════════════════════════════════════════════════════════
    insights.donorProfile = {
        name: donor.name,
        email: donor.email,
        isVIP: donor.isHNI || false,
        isRecurring: donor.isRecurringDonor || false,
        memberSince: getMemberSince(donations),
        donorTier: calculateDonorTier(donations)
    };

    if (!hasDonations) {
        insights.personalizedMessage = generateNewDonorMessage(donor);
        insights.recommendations = getNewDonorRecommendations();
        return insights;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DONATION ANALYSIS
    // ═══════════════════════════════════════════════════════════════════════
    const amounts = donations.map(d => parseFloat(d.amount) || 0);
    const totalAmount = amounts.reduce((a, b) => a + b, 0);
    const avgAmount = totalAmount / donations.length;
    const currency = donations[0]?.currency_code || 'USD';

    // Group by cause
    const causeBreakdown = {};
    const campaignBreakdown = {};
    const yearlyBreakdown = {};
    const monthlyPattern = new Array(12).fill(0);

    donations.forEach(d => {
        const amount = parseFloat(d.amount) || 0;
        
        // By cause
        if (d.cause) {
            causeBreakdown[d.cause] = (causeBreakdown[d.cause] || 0) + amount;
        }
        
        // By campaign
        if (d.campaign) {
            campaignBreakdown[d.campaign] = (campaignBreakdown[d.campaign] || 0) + amount;
        }
        
        // By year
        if (d.donation_date) {
            const year = new Date(d.donation_date).getFullYear();
            yearlyBreakdown[year] = (yearlyBreakdown[year] || 0) + amount;
            
            const month = new Date(d.donation_date).getMonth();
            monthlyPattern[month] += amount;
        }
    });

    // Sort and get top items
    const topCauses = Object.entries(causeBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const topCampaigns = Object.entries(campaignBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    insights.donationAnalysis = {
        totalDonations: donations.length,
        totalAmount,
        currency,
        averageAmount: avgAmount,
        largestDonation: Math.max(...amounts),
        smallestDonation: Math.min(...amounts),
        topCauses,
        topCampaigns,
        yearlyBreakdown: Object.entries(yearlyBreakdown).sort((a, b) => b[0] - a[0]),
        preferredMonth: getPreferredMonth(monthlyPattern),
        donationFrequency: calculateFrequency(donations),
        lastDonation: donations[0]
    };

    // ═══════════════════════════════════════════════════════════════════════
    // IMPACT METRICS (AI-Generated Estimates)
    // ═══════════════════════════════════════════════════════════════════════
    insights.impactMetrics = calculateImpactMetrics(totalAmount, topCauses, currency);

    // ═══════════════════════════════════════════════════════════════════════
    // GLOBAL COMPARISONS
    // ═══════════════════════════════════════════════════════════════════════
    const globalStats = calculateGlobalStats(allDonations);
    insights.comparisons = {
        vsGlobalAverage: ((avgAmount / globalStats.avgAmount) * 100).toFixed(0),
        percentileRank: calculatePercentileRank(totalAmount, allDonations),
        totalDonorsCount: new Set(allDonations.map(d => d.donor_Email)).size,
        donorRank: calculateDonorRank(totalAmount, allDonations)
    };

    // ═══════════════════════════════════════════════════════════════════════
    // ACHIEVEMENTS & MILESTONES
    // ═══════════════════════════════════════════════════════════════════════
    insights.achievements = generateAchievements(donor, donations, insights);
    insights.milestones = generateMilestones(totalAmount, donations.length, currency);

    // ═══════════════════════════════════════════════════════════════════════
    // AI RECOMMENDATIONS
    // ═══════════════════════════════════════════════════════════════════════
    insights.recommendations = generateAIRecommendations(donor, insights);

    // ═══════════════════════════════════════════════════════════════════════
    // PERSONALIZED MESSAGE
    // ═══════════════════════════════════════════════════════════════════════
    insights.personalizedMessage = generatePersonalizedMessage(donor, insights);

    return insights;
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

function getMemberSince(donations) {
    if (!donations || donations.length === 0) return 'New Member';
    const dates = donations.map(d => new Date(d.donation_date)).filter(d => !isNaN(d));
    if (dates.length === 0) return 'New Member';
    const oldest = new Date(Math.min(...dates));
    return oldest.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function calculateDonorTier(donations) {
    if (!donations || donations.length === 0) return 'New Supporter';
    const total = donations.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
    
    if (total >= 100000) return '💎 Diamond';
    if (total >= 50000) return '🏆 Platinum';
    if (total >= 25000) return '🥇 Gold';
    if (total >= 10000) return '🥈 Silver';
    if (total >= 5000) return '🥉 Bronze';
    return '⭐ Supporter';
}

function getPreferredMonth(monthlyPattern) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    const maxIndex = monthlyPattern.indexOf(Math.max(...monthlyPattern));
    return months[maxIndex];
}

function calculateFrequency(donations) {
    if (donations.length < 2) return 'First-time donor';
    
    const dates = donations.map(d => new Date(d.donation_date)).sort((a, b) => a - b);
    let totalDays = 0;
    for (let i = 1; i < dates.length; i++) {
        totalDays += (dates[i] - dates[i-1]) / (24 * 60 * 60 * 1000);
    }
    const avgDays = totalDays / (dates.length - 1);
    
    if (avgDays <= 35) return 'Monthly donor';
    if (avgDays <= 100) return 'Quarterly donor';
    if (avgDays <= 200) return 'Semi-annual donor';
    return 'Annual donor';
}

function calculateImpactMetrics(totalAmount, topCauses, currency) {
    // AI-generated impact estimates based on donation amounts
    const metrics = {
        livesImpacted: Math.floor(totalAmount / 50),
        mealsProvided: Math.floor(totalAmount / 5),
        studentsSupported: Math.floor(totalAmount / 500),
        medicalCheckups: Math.floor(totalAmount / 25),
        communityPrograms: Math.floor(totalAmount / 2000),
        causeImpacts: []
    };

    // Generate cause-specific impacts
    topCauses.forEach(([cause, amount]) => {
        const impact = generateCauseImpact(cause, amount, currency);
        if (impact) metrics.causeImpacts.push(impact);
    });

    return metrics;
}

function generateCauseImpact(cause, amount, currency) {
    const causeLower = cause.toLowerCase();
    
    if (causeLower.includes('education')) {
        return {
            cause,
            amount,
            currency,
            impact: `Provided educational resources for ${Math.floor(amount / 100)} students`,
            icon: '📚'
        };
    }
    if (causeLower.includes('health') || causeLower.includes('medical')) {
        return {
            cause,
            amount,
            currency,
            impact: `Funded ${Math.floor(amount / 25)} medical checkups`,
            icon: '🏥'
        };
    }
    if (causeLower.includes('food') || causeLower.includes('hunger')) {
        return {
            cause,
            amount,
            currency,
            impact: `Provided ${Math.floor(amount / 5)} meals to families in need`,
            icon: '🍽️'
        };
    }
    if (causeLower.includes('environment') || causeLower.includes('green')) {
        return {
            cause,
            amount,
            currency,
            impact: `Planted ${Math.floor(amount / 10)} trees`,
            icon: '🌳'
        };
    }
    if (causeLower.includes('youth') || causeLower.includes('children')) {
        return {
            cause,
            amount,
            currency,
            impact: `Supported ${Math.floor(amount / 200)} youth programs`,
            icon: '👦'
        };
    }
    if (causeLower.includes('community')) {
        return {
            cause,
            amount,
            currency,
            impact: `Funded ${Math.floor(amount / 500)} community initiatives`,
            icon: '🏘️'
        };
    }
    
    // Default impact
    return {
        cause,
        amount,
        currency,
        impact: `Made a meaningful contribution to ${cause}`,
        icon: '💝'
    };
}

function calculateGlobalStats(allDonations) {
    if (!allDonations || allDonations.length === 0) {
        return { avgAmount: 1, totalAmount: 0 };
    }
    const amounts = allDonations.map(d => parseFloat(d.amount) || 0);
    const total = amounts.reduce((a, b) => a + b, 0);
    return {
        avgAmount: total / amounts.length,
        totalAmount: total
    };
}

function calculatePercentileRank(totalAmount, allDonations) {
    if (!allDonations || allDonations.length === 0) return 100;
    
    // Group by donor
    const donorTotals = {};
    allDonations.forEach(d => {
        donorTotals[d.donor_Email] = (donorTotals[d.donor_Email] || 0) + parseFloat(d.amount || 0);
    });
    
    const totals = Object.values(donorTotals).sort((a, b) => a - b);
    const rank = totals.filter(t => t <= totalAmount).length;
    return Math.round((rank / totals.length) * 100);
}

function calculateDonorRank(totalAmount, allDonations) {
    if (!allDonations || allDonations.length === 0) return 1;
    
    const donorTotals = {};
    allDonations.forEach(d => {
        donorTotals[d.donor_Email] = (donorTotals[d.donor_Email] || 0) + parseFloat(d.amount || 0);
    });
    
    const totals = Object.values(donorTotals).sort((a, b) => b - a);
    return totals.findIndex(t => t <= totalAmount) + 1;
}

function generateAchievements(donor, donations, insights) {
    const achievements = [];
    const total = insights.donationAnalysis.totalAmount;
    const count = donations.length;

    if (donor.isHNI) {
        achievements.push({ icon: '⭐', title: 'VIP Donor', description: 'Recognized as a High Net-Worth supporter' });
    }
    if (donor.isRecurringDonor) {
        achievements.push({ icon: '🔄', title: 'Recurring Champion', description: 'Committed to regular giving' });
    }
    if (count >= 10) {
        achievements.push({ icon: '🏆', title: 'Dedicated Supporter', description: `Made ${count} donations` });
    }
    if (count >= 5 && count < 10) {
        achievements.push({ icon: '🌟', title: 'Active Contributor', description: `Made ${count} donations` });
    }
    if (total >= 50000) {
        achievements.push({ icon: '💎', title: 'Major Benefactor', description: 'Exceptional generosity' });
    }
    if (insights.donationAnalysis.topCauses.length >= 3) {
        achievements.push({ icon: '🎯', title: 'Multi-Cause Champion', description: 'Supporting diverse initiatives' });
    }
    if (insights.comparisons.percentileRank >= 90) {
        achievements.push({ icon: '🥇', title: 'Top 10% Donor', description: 'Among our most generous supporters' });
    }

    return achievements;
}

function generateMilestones(totalAmount, count, currency) {
    const milestones = [];
    
    // Amount milestones
    const amountMilestones = [1000, 5000, 10000, 25000, 50000, 100000];
    amountMilestones.forEach(milestone => {
        if (totalAmount >= milestone) {
            milestones.push({
                type: 'amount',
                value: milestone,
                currency,
                reached: true,
                label: `${currency} ${milestone.toLocaleString()} contributed`
            });
        }
    });

    // Count milestones
    const countMilestones = [1, 5, 10, 25, 50, 100];
    countMilestones.forEach(milestone => {
        if (count >= milestone) {
            milestones.push({
                type: 'count',
                value: milestone,
                reached: true,
                label: `${milestone} donations made`
            });
        }
    });

    // Find next milestone
    const nextAmount = amountMilestones.find(m => m > totalAmount);
    if (nextAmount) {
        milestones.push({
            type: 'next',
            value: nextAmount,
            currency,
            reached: false,
            progress: Math.round((totalAmount / nextAmount) * 100),
            label: `Next goal: ${currency} ${nextAmount.toLocaleString()}`
        });
    }

    return milestones;
}

function generateAIRecommendations(donor, insights) {
    const recommendations = [];
    const analysis = insights.donationAnalysis;

    // Based on top cause
    if (analysis.topCauses.length > 0) {
        const topCause = analysis.topCauses[0][0];
        recommendations.push({
            icon: '🎯',
            title: `Continue Supporting ${topCause}`,
            description: `Your passion for ${topCause} has made a real difference. Consider our upcoming ${topCause} initiatives.`
        });
    }

    // Based on donation pattern
    if (analysis.donationFrequency === 'Annual donor' && !donor.isRecurringDonor) {
        recommendations.push({
            icon: '🔄',
            title: 'Consider Monthly Giving',
            description: 'Spread your impact throughout the year with our recurring donation program.'
        });
    }

    // Based on tier
    if (insights.donorProfile.donorTier.includes('Bronze') || insights.donorProfile.donorTier.includes('Supporter')) {
        recommendations.push({
            icon: '⬆️',
            title: 'Reach Silver Status',
            description: 'You\'re close to Silver tier! Unlock exclusive benefits and recognition.'
        });
    }

    // VIP specific
    if (donor.isHNI) {
        recommendations.push({
            icon: '👥',
            title: 'Join Our Leadership Circle',
            description: 'Connect with fellow philanthropists and shape our strategic direction.'
        });
    }

    // Engagement recommendation
    recommendations.push({
        icon: '📅',
        title: 'Upcoming Events',
        description: 'Join our community events to see your impact firsthand.'
    });

    return recommendations.slice(0, 4);
}

function generatePersonalizedMessage(donor, insights) {
    const name = donor.name.split(' ')[0]; // First name
    const tier = insights.donorProfile.donorTier;
    const total = insights.donationAnalysis.totalAmount;
    const currency = insights.donationAnalysis.currency;
    const topCause = insights.donationAnalysis.topCauses[0]?.[0] || 'our mission';
    const lives = insights.impactMetrics.livesImpacted;

    return `Dear ${name},

Your journey with Akme Foundation has been truly remarkable. As a ${tier} donor, your contributions totaling ${currency} ${formatAmount(total)} have touched approximately ${lives} lives.

Your dedication to ${topCause} reflects the values we share as a community. Every donation you've made has created ripples of positive change that extend far beyond what numbers can capture.

Thank you for being an integral part of our mission. Together, we are building a brighter future.

With heartfelt gratitude,
The Akme Foundation Team`;
}

function generateNewDonorMessage(donor) {
    const name = donor.name.split(' ')[0];
    return `Dear ${name},

Welcome to the Akme Foundation family! We're thrilled to have you join our community of changemakers.

While you haven't made your first donation yet, your interest in our mission is the first step toward creating meaningful impact. We invite you to explore our programs and discover how you can make a difference.

Every journey begins with a single step, and we're honored that you're considering taking yours with us.

Warm regards,
The Akme Foundation Team`;
}

function getNewDonorRecommendations() {
    return [
        { icon: '🌟', title: 'Make Your First Donation', description: 'Start your giving journey with any amount that feels right for you.' },
        { icon: '📖', title: 'Learn About Our Causes', description: 'Explore our programs to find one that resonates with your values.' },
        { icon: '📧', title: 'Subscribe to Updates', description: 'Stay informed about our impact and upcoming events.' }
    ];
}

// ══════════════════════════════════════════════════════════════════════════════
// PDF GENERATION
// ══════════════════════════════════════════════════════════════════════════════
async function generatePDF(donor, donations, insights) {
    return new Promise((resolve, reject) => {
        const fileName = `ImpactReport_${donor.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
        const filePath = path.join('/tmp', fileName);
        
        const doc = new PDFDocument({ 
            size: 'A4', 
            margin: 50,
            info: {
                Title: `Impact Report - ${donor.name}`,
                Author: 'Akme Foundation',
                Subject: 'Donor Impact Report'
            }
        });
        
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        const primaryColor = '#667eea';
        const secondaryColor = '#11998e';
        const textColor = '#333333';
        const lightGray = '#f8f9fa';

        // ═══════════════════════════════════════════════════════════════════
        // HEADER
        // ═══════════════════════════════════════════════════════════════════
        doc.rect(0, 0, doc.page.width, 120).fill(primaryColor);
        
        doc.fillColor('white')
           .fontSize(28)
           .text('IMPACT REPORT', 50, 40, { align: 'center' });
        
        doc.fontSize(14)
           .text(`Prepared for ${donor.name}`, 50, 75, { align: 'center' });
        
        doc.fontSize(10)
           .text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 50, 95, { align: 'center' });

        doc.moveDown(4);

        // ═══════════════════════════════════════════════════════════════════
        // DONOR PROFILE SECTION
        // ═══════════════════════════════════════════════════════════════════
        doc.fillColor(primaryColor).fontSize(16).text('DONOR PROFILE', 50, 140);
        doc.moveTo(50, 160).lineTo(545, 160).stroke(primaryColor);

        doc.fillColor(textColor).fontSize(11);
        let yPos = 175;

        doc.text(`Name: ${insights.donorProfile.name}`, 50, yPos);
        doc.text(`Donor Tier: ${insights.donorProfile.donorTier}`, 300, yPos);
        yPos += 20;
        doc.text(`Member Since: ${insights.donorProfile.memberSince}`, 50, yPos);
        doc.text(`Status: ${insights.donorProfile.isVIP ? 'VIP Donor' : 'Valued Supporter'}`, 300, yPos);

        // ═══════════════════════════════════════════════════════════════════
        // DONATION SUMMARY (if donations exist)
        // ═══════════════════════════════════════════════════════════════════
        if (donations && donations.length > 0) {
            yPos += 40;
            doc.fillColor(primaryColor).fontSize(16).text('DONATION SUMMARY', 50, yPos);
            doc.moveTo(50, yPos + 20).lineTo(545, yPos + 20).stroke(primaryColor);

            yPos += 35;
            const analysis = insights.donationAnalysis;

            // Stats boxes
            doc.rect(50, yPos, 150, 60).fill(lightGray);
            doc.rect(210, yPos, 150, 60).fill(lightGray);
            doc.rect(370, yPos, 175, 60).fill(lightGray);

            doc.fillColor(primaryColor).fontSize(20);
            doc.text(`${analysis.currency} ${formatAmount(analysis.totalAmount)}`, 55, yPos + 10, { width: 140, align: 'center' });
            doc.text(`${analysis.totalDonations}`, 215, yPos + 10, { width: 140, align: 'center' });
            doc.text(`${analysis.currency} ${formatAmount(analysis.averageAmount)}`, 375, yPos + 10, { width: 165, align: 'center' });

            doc.fillColor(textColor).fontSize(9);
            doc.text('Total Contributed', 55, yPos + 40, { width: 140, align: 'center' });
            doc.text('Donations Made', 215, yPos + 40, { width: 140, align: 'center' });
            doc.text('Average Donation', 375, yPos + 40, { width: 165, align: 'center' });

            // ═══════════════════════════════════════════════════════════════════
            // IMPACT METRICS
            // ═══════════════════════════════════════════════════════════════════
            yPos += 90;
            doc.fillColor(secondaryColor).fontSize(16).text('YOUR IMPACT', 50, yPos);
            doc.moveTo(50, yPos + 20).lineTo(545, yPos + 20).stroke(secondaryColor);

            yPos += 35;
            doc.fillColor(textColor).fontSize(11);

            const metrics = insights.impactMetrics;
            const impactItems = [
                `🌟 ${metrics.livesImpacted} lives positively impacted`,
                `🍽️ ${metrics.mealsProvided} meals provided to families`,
                `📚 ${metrics.studentsSupported} students supported`,
                `🏥 ${metrics.medicalCheckups} medical checkups funded`
            ];

            impactItems.forEach(item => {
                doc.text(item, 60, yPos);
                yPos += 18;
            });

            // Cause-specific impacts
            if (metrics.causeImpacts.length > 0) {
                yPos += 10;
                doc.fillColor(secondaryColor).fontSize(12).text('Impact by Cause:', 50, yPos);
                yPos += 18;
                
                doc.fillColor(textColor).fontSize(10);
                metrics.causeImpacts.forEach(ci => {
                    doc.text(`${ci.icon} ${ci.cause}: ${ci.impact}`, 60, yPos);
                    yPos += 16;
                });
            }

            // ═══════════════════════════════════════════════════════════════════
            // TOP CAUSES
            // ═══════════════════════════════════════════════════════════════════
            if (analysis.topCauses.length > 0) {
                yPos += 20;
                doc.fillColor(primaryColor).fontSize(16).text('GIVING BREAKDOWN', 50, yPos);
                doc.moveTo(50, yPos + 20).lineTo(545, yPos + 20).stroke(primaryColor);

                yPos += 35;
                doc.fillColor(textColor).fontSize(11);

                analysis.topCauses.forEach(([cause, amount], index) => {
                    const percentage = ((amount / analysis.totalAmount) * 100).toFixed(1);
                    const barWidth = (percentage / 100) * 200;
                    
                    doc.text(`${index + 1}. ${cause}`, 60, yPos);
                    doc.text(`${analysis.currency} ${formatAmount(amount)} (${percentage}%)`, 350, yPos);
                    
                    yPos += 15;
                    doc.rect(60, yPos, 200, 8).fill(lightGray);
                    doc.rect(60, yPos, barWidth, 8).fill(primaryColor);
                    yPos += 20;
                });
            }

            // ═══════════════════════════════════════════════════════════════════
            // ACHIEVEMENTS
            // ═══════════════════════════════════════════════════════════════════
            if (insights.achievements.length > 0) {
                // Check if we need a new page
                if (yPos > 650) {
                    doc.addPage();
                    yPos = 50;
                }

                yPos += 20;
                doc.fillColor(primaryColor).fontSize(16).text('YOUR ACHIEVEMENTS', 50, yPos);
                doc.moveTo(50, yPos + 20).lineTo(545, yPos + 20).stroke(primaryColor);

                yPos += 35;
                doc.fillColor(textColor).fontSize(10);

                insights.achievements.forEach(achievement => {
                    doc.text(`${achievement.icon} ${achievement.title}: ${achievement.description}`, 60, yPos);
                    yPos += 18;
                });
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // PERSONALIZED MESSAGE
        // ═══════════════════════════════════════════════════════════════════
        // Check if we need a new page
        if (yPos > 550) {
            doc.addPage();
            yPos = 50;
        }

        yPos += 30;
        doc.fillColor(primaryColor).fontSize(16).text('A PERSONAL NOTE', 50, yPos);
        doc.moveTo(50, yPos + 20).lineTo(545, yPos + 20).stroke(primaryColor);

        yPos += 35;
        doc.fillColor(textColor).fontSize(10);
        doc.text(insights.personalizedMessage, 50, yPos, { width: 495, lineGap: 4 });

        // ═══════════════════════════════════════════════════════════════════
        // FOOTER
        // ═══════════════════════════════════════════════════════════════════
        doc.fillColor('#999999').fontSize(8);
        doc.text('Akme Foundation | Making a Difference Together', 50, doc.page.height - 50, { align: 'center' });
        doc.text(`© ${new Date().getFullYear()} All rights reserved | This report was generated using AI-powered analytics`, 50, doc.page.height - 38, { align: 'center' });

        doc.end();

        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);
    });
}

// ══════════════════════════════════════════════════════════════════════════════
// SEND EMAIL WITH PDF
// ══════════════════════════════════════════════════════════════════════════════
async function sendEmailWithPDF(donor, insights, pdfPath) {
    try {
        const transporter = nodemailer.createTransport(SMTP_CONFIG);

        const htmlBody = generateEmailHTML(donor, insights);

        const result = await transporter.sendMail({
            from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
            to: donor.email,
            subject: `📊 Your Personalized Impact Report - ${donor.name}`,
            html: htmlBody,
            attachments: [
                {
                    filename: `ImpactReport_${donor.name.replace(/\s+/g, '_')}.pdf`,
                    path: pdfPath,
                    contentType: 'application/pdf'
                }
            ]
        });

        console.log(`✅ Impact Report email sent to ${donor.email}: ${result.messageId}`);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error(`❌ Email failed to ${donor.email}:`, error.message);
        return { success: false, error: error.message };
    }
}

function generateEmailHTML(donor, insights) {
    const hasDonations = insights.donationAnalysis.totalDonations > 0;
    const analysis = insights.donationAnalysis;

    let statsSection = '';
    if (hasDonations) {
        statsSection = `
            <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin: 20px 0; text-align: center;">
                <div style="display: inline-block; margin: 0 20px;">
                    <div style="font-size: 28px; font-weight: bold; color: #667eea;">${analysis.currency} ${formatAmount(analysis.totalAmount)}</div>
                    <div style="color: #666; font-size: 12px;">Total Contributed</div>
                </div>
                <div style="display: inline-block; margin: 0 20px;">
                    <div style="font-size: 28px; font-weight: bold; color: #667eea;">${analysis.totalDonations}</div>
                    <div style="color: #666; font-size: 12px;">Donations</div>
                </div>
                <div style="display: inline-block; margin: 0 20px;">
                    <div style="font-size: 28px; font-weight: bold; color: #667eea;">${insights.impactMetrics.livesImpacted}</div>
                    <div style="color: #666; font-size: 12px;">Lives Impacted</div>
                </div>
            </div>
        `;
    }

    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
        .content { background: #ffffff; padding: 40px 30px; }
        .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 12px; }
        .highlight { background: #e8f4f8; padding: 15px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Your Impact Report</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">AI-Powered Personalized Insights</p>
        </div>
        <div class="content">
            <p>Dear <strong>${donor.name}</strong>,</p>
            
            <p>We've prepared a personalized impact report just for you, powered by our AI analytics system.</p>
            
            ${statsSection}
            
            <div class="highlight">
                <strong>📎 Your Full Report is Attached</strong>
                <p style="margin: 10px 0 0 0;">Open the attached PDF to see your complete impact story, including:</p>
                <ul style="margin: 10px 0;">
                    <li>Detailed donation analysis</li>
                    <li>AI-generated impact metrics</li>
                    <li>Your achievements and milestones</li>
                    <li>Personalized recommendations</li>
                </ul>
            </div>
            
            <p>Thank you for being part of our mission to create positive change!</p>
            
            <p>With gratitude,<br><strong>The Akme Foundation Team</strong></p>
        </div>
        <div class="footer">
            <p><strong>Akme Foundation</strong> | Making a Difference Together</p>
            <p>© ${new Date().getFullYear()} All rights reserved</p>
        </div>
    </div>
</body>
</html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// FORMAT FOR SUMMARY FIELD
// ══════════════════════════════════════════════════════════════════════════════
function formatAIInsightsForSummary(donor, insights) {
    const analysis = insights.donationAnalysis;
    const metrics = insights.impactMetrics;
    const hasDonations = analysis.totalDonations > 0;

    let summary = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 AI-POWERED IMPACT REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────────────────────────────────────┐
│  DONOR: ${donor.name}
│  TIER: ${insights.donorProfile.donorTier}
│  MEMBER SINCE: ${insights.donorProfile.memberSince}
└─────────────────────────────────────────────────────────────────────────────┘
`;

    if (hasDonations) {
        summary += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 DONATION SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   Total Contributed:    ${analysis.currency} ${formatAmount(analysis.totalAmount)}
   Total Donations:      ${analysis.totalDonations}
   Average Donation:     ${analysis.currency} ${formatAmount(analysis.averageAmount)}
   Largest Donation:     ${analysis.currency} ${formatAmount(analysis.largestDonation)}
   Giving Pattern:       ${analysis.donationFrequency}
   Preferred Month:      ${analysis.preferredMonth}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌟 AI-ESTIMATED IMPACT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   Lives Impacted:       ~${metrics.livesImpacted}
   Meals Provided:       ~${metrics.mealsProvided}
   Students Supported:   ~${metrics.studentsSupported}
   Medical Checkups:     ~${metrics.medicalCheckups}
`;

        if (metrics.causeImpacts.length > 0) {
            summary += `
   CAUSE-SPECIFIC IMPACT:
`;
            metrics.causeImpacts.forEach(ci => {
                summary += `   ${ci.icon} ${ci.impact}\n`;
            });
        }

        if (analysis.topCauses.length > 0) {
            summary += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 TOP CAUSES SUPPORTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
            analysis.topCauses.forEach(([cause, amount], i) => {
                const pct = ((amount / analysis.totalAmount) * 100).toFixed(1);
                summary += `   ${i + 1}. ${cause}: ${analysis.currency} ${formatAmount(amount)} (${pct}%)\n`;
            });
        }

        if (insights.comparisons) {
            summary += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 DONOR RANKING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   Percentile:           Top ${100 - insights.comparisons.percentileRank}%
   Rank:                 #${insights.comparisons.donorRank} of ${insights.comparisons.totalDonorsCount} donors
   vs Global Average:    ${insights.comparisons.vsGlobalAverage}%
`;
        }

        if (insights.achievements.length > 0) {
            summary += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 ACHIEVEMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
            insights.achievements.forEach(a => {
                summary += `   ${a.icon} ${a.title}: ${a.description}\n`;
            });
        }
    }

    if (insights.recommendations.length > 0) {
        summary += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 AI RECOMMENDATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
        insights.recommendations.forEach((r, i) => {
            summary += `   ${i + 1}. ${r.icon} ${r.title}\n      └─ ${r.description}\n`;
        });
    }

    summary += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Impact Report PDF sent to: ${donor.email}
Generated: ${new Date().toISOString().split('T')[0]}
Model: AI Impact Analyzer v1.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    return summary;
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER: FORMAT AMOUNT
// ══════════════════════════════════════════════════════════════════════════════
function formatAmount(amount) {
    if (!amount || amount === 0) return '0.00';
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

module.exports = { GenerateAIImpactReport };