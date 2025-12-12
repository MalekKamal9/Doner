using donor_management_BitaSrv as service from '../../srv/service';
using from '../annotations';

annotate service.Donors with @(
    UI.FieldGroup #Main : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : donorID,
                @UI.Hidden,
            },
            {
                $Type : 'UI.DataField',
                Value : name,
            },
            {
                $Type : 'UI.DataField',
                Value : email,
            },
            {
                $Type : 'UI.DataField',
                Value : phone,
            },
            {
                $Type : 'UI.DataField',
                Value : status,
            },
            {
                $Type : 'UI.DataField',
                Value : isRecurringDonor,
            },
            {
                $Type : 'UI.DataField',
                Value : isHNI,
            },
            {
                $Type : 'UI.DataField',
                Value : createdAt,
            },
            {
                $Type : 'UI.DataField',
                Value : createdBy,
            },
            {
                $Type : 'UI.DataField',
                Value : modifiedAt,
            },
            {
                $Type : 'UI.DataField',
                Value : modifiedBy,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Donor Type',
                Value : donorType_ID,
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'Main',
            Target : '@UI.FieldGroup#Main',
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'AuditInfo',
            Label : 'Audit Information',
            Target : '@UI.FieldGroup#AuditInfo',
        },
    ],
);

