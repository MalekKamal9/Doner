namespace Donor_management_Bita;

using {
    cuid,
    managed
} from '@sap/cds/common';

entity DonorTypes : cuid {
    typeID      : String(36);  // Auto-generated in logic
    typeName    : String(50) @mandatory;
    description : String(255);
}

entity Donors : cuid, managed {
    donorID          : String(36);  // Auto-generated in logic
    name             : String(255) @mandatory;
    email            : String(255) @mandatory;
    phone            : String(20);
    status           : Boolean default true;
    isRecurringDonor : Boolean default false;
    isHNI            : Boolean default false;
    donorType        : Association to one DonorTypes;
}

annotate Donors with @assert.unique : {
    donorID : [donorID],
    email   : [email]
};

annotate DonorTypes with @assert.unique : {
    typeID : [typeID]
};