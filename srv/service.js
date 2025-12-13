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

        // Generate AI Summary - Returns updated data for auto-refresh
        this.on('Action1', 'Donors', async (request) => {
            const result = await action1_Logic(request);
            // Trigger refresh by returning the result
            return result;
        });

        // Predict Donation Likelihood - Returns updated data
        this.on('PredictLikelihood', 'Donors', async (request) => {
            const result = await PredictDonationLikelihood(request);
            return result;
        });

        // Detect Anomalies - Returns updated data
        this.on('DetectAnomalies', 'Donors', async (request) => {
            const result = await DetectAnomalies(request);
            return result;
        });

        // Generate AI Impact Report with PDF
        this.on('GenerateImpactReport', 'Donors', async (request) => {
            const result = await GenerateAIImpactReport(request);
            return result;
        });

        // Send Thank You Email
        this.on('SendThankYou', 'Donors', async (request) => {
            return SendThankYou(request);
        });

        // Invite to Event
        this.on('InviteToEvent', 'Donors', async (request) => {
            return InviteToEvent(request);
        });

        // Populate donation history virtual field
        this.after('READ', 'Donors', async (data, request) => {
            try {
                const { Donations } = cds.entities('Donor_management_Bita');
                const donors = Array.isArray(data) ? data : [data];
                
                for (const donor of donors) {
                    if (donor && donor.email) {
                        try {
                            const donations = await SELECT.from(Donations)
                                .where({ donor_Email: donor.email })
                                .orderBy({ donation_date: 'desc' });
                            
                            if (donations && donations.length > 0) {
                                donor.donationHistory = generateDonationHistoryTable(donations);
                            } else {
                                donor.donationHistory = null;
                            }
                        } catch (err) {
                            console.log('Error fetching donations:', err.message);
                            donor.donationHistory = null;
                        }
                    } else {
                        if (donor) donor.donationHistory = null;
                    }
                }
            } catch (err) {
                console.log('Error in donation history:', err.message);
            }
        });

        return super.init();
    }
}

// Generate formatted donation history table
function generateDonationHistoryTable(donations) {
    if (!donations || donations.length === 0) return null;

    let table = `
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                           📜 DONATION HISTORY                                            ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝

`;

    let totalAmount = 0;
    donations.forEach(d => totalAmount += parseFloat(d.amount || 0));
    const currency = donations[0]?.currency_code || 'USD';

    table += `    💰 TOTAL CONTRIBUTED: ${currency} ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
    📊 TOTAL DONATIONS: ${donations.length}

    ┌────────────┬───────────────┬──────────┬──────────────────────────────┬────────────────────┐
    │    DATE    │    AMOUNT     │ CURRENCY │          CAMPAIGN            │       CAUSE        │
    ├────────────┼───────────────┼──────────┼──────────────────────────────┼────────────────────┤
`;

    donations.forEach(function(d) {
        const date = d.donation_date || 'N/A';
        const amount = parseFloat(d.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const curr = d.currency_code || 'USD';
        const campaign = truncate(d.campaign || 'N/A', 28);
        const cause = truncate(d.cause || 'N/A', 18);
        
        table += `    │ ${padRight(date, 10)} │ ${padLeft(amount, 13)} │ ${padRight(curr, 8)} │ ${padRight(campaign, 28)} │ ${padRight(cause, 18)} │\n`;
    });

    table += `    └────────────┴───────────────┴──────────┴──────────────────────────────┴────────────────────┘
`;
    return table;
}

function padRight(str, len) {
    str = String(str || '');
    while (str.length < len) str += ' ';
    return str.substring(0, len);
}

function padLeft(str, len) {
    str = String(str || '');
    while (str.length < len) str = ' ' + str;
    return str.substring(0, len);
}

function truncate(str, len) {
    str = String(str || '');
    if (str.length > len) return str.substring(0, len - 3) + '...';
    return str;
}

module.exports = { donor_management_BitaSrv };