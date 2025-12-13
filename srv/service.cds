using { Donor_management_Bita as my } from '../db/schema.cds';

@path: '/service/donor_management_Bita'
service donor_management_BitaSrv {
    @odata.draft.enabled
    entity Donors as projection on my.Donors {
        *,
        null as donationHistory : LargeString
    } actions {
        action Action1() returns String;
        action SendThankYou() returns String;
        action ShareImpactReport() returns String;
        action InviteToEvent() returns String;
        action PredictLikelihood() returns String;
        action DetectAnomalies() returns String;
    };

    entity DonorTypes as projection on my.DonorTypes;
    entity Donations as projection on my.Donations;
}