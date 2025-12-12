using { Donor_management_Bita as my } from '../db/schema.cds';

@path: '/service/donor_management_Bita'
@requires: 'authenticated-user'
service donor_management_BitaSrv {
  @odata.draft.enabled
  entity DonorTypes as projection on my.DonorTypes;
  @odata.draft.enabled
  entity Donors as projection on my.Donors;
}