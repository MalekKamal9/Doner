using { Donor_management_Bita as my } from '../db/schema.cds';

@path: '/service/donor_management_Bita'
service donor_management_BitaSrv {
    @odata.draft.enabled
    entity Donors as projection on my.Donors {
        *,
        // Virtual Fields - Calculated on-the-fly (NOT saved to database)
        null as donationHistory       : LargeString,
        null as totalDonated          : Decimal(15,2),
        null as donationCount         : Integer,
        null as averageDonation       : Decimal(15,2),
        null as largestDonation       : Decimal(15,2),
        null as smallestDonation      : Decimal(15,2),
        null as daysSinceLastDonation : Integer,
        null as donorTier             : String(50),
        null as engagementScore       : Integer,
        null as likelihoodScore       : Integer,
        null as riskLevel             : String(20),
        null as topCause              : String(100),
        null as percentOfTotal        : Decimal(5,2),
        null as yearOverYearGrowth    : Decimal(5,2),
        null as monthlyAverage        : Decimal(15,2),
        null as lastDonationDate      : Date,
        null as firstDonationDate     : Date,
        null as currencyCode          : String(3)
    } actions {
        action Action1() returns String;
        action SendThankYou() returns String;
        action GenerateImpactReport() returns String;
        action InviteToEvent() returns String;
        action PredictLikelihood() returns String;
        action DetectAnomalies() returns String;
    };

    entity DonorTypes as projection on my.DonorTypes;
    entity Donations as projection on my.Donations;
}