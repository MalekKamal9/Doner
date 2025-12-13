using { Donor_management_Bita as my } from '../db/schema.cds';

@path : '/service/donor_management_Bita'
service donor_management_BitaSrv
{
    @odata.draft.enabled
    entity DonorTypes as
        projection on my.DonorTypes;

    @odata.draft.enabled
    entity Donors as
        projection on my.Donors
        actions
        {
            action Action1
            (
            )
            returns String;

            action SendThankYou
            (
            )
            returns String;

            action ShareImpactReport
            (
            )
            returns String;

            action InviteToEvent
            (
            )
            returns String;
        };

    @odata.draft.enabled
    entity Donations as
        projection on my.Donations;
}

annotate donor_management_BitaSrv with @requires :
[
    'authenticated-user'
];
