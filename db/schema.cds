namespace Donor_management_Bita;

using
{
    cuid,
    managed
}
from '@sap/cds/common';

entity DonorTypes : cuid
{
    typeID : String(36);
    typeName : String(50)
        @mandatory;
    description : String(255);
}

annotate DonorTypes with @assert.unique :
{
    typeID : [ typeID ],
};

entity Donors : cuid, managed
{
    donorID : String(36);
    name : String(255)
        @mandatory;
    email : String(255)
        @mandatory;
    phone : String(20);
    status : Boolean default true;
    isRecurringDonor : Boolean default false;
    isHNI : Boolean default false;
    donorType : Association to one DonorTypes;
    summary : String;
    donation : Association to one Donations;
}

annotate Donors with @assert.unique :
{
    donorID : [ donorID ],
    email : [ email ],
};

entity Donations : cuid
{
    donor_Name : String(100);
    donor_Email : String(255);
    donor_Phone : String(20);
    city : String(100);
    amount : Decimal(15,2);
    currency_code : String(3);
    donation_date : Date;
    cause : String(200);
    campaign : String(150);
}
