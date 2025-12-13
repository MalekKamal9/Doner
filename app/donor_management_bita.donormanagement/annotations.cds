using donor_management_BitaSrv as service from '../../srv/service';
using from '../annotations';

annotate service.Donors with @(
    // ══════════════════════════════════════════════════════════════════════════
    // HEADER INFO
    // ══════════════════════════════════════════════════════════════════════════
    UI.HeaderInfo : {
        TypeName       : 'Donor',
        TypeNamePlural : 'Donors',
        Title          : { Value : name },
        Description    : { Value : email }
    },

    // ══════════════════════════════════════════════════════════════════════════
    // HEADER FACETS (shown at top of object page)
    // ══════════════════════════════════════════════════════════════════════════
    UI.HeaderFacets : [
        { $Type : 'UI.ReferenceFacet', ID : 'StatusHeader', Target : '@UI.FieldGroup#StatusInfo' },
        { $Type : 'UI.ReferenceFacet', ID : 'ContactHeader', Target : '@UI.FieldGroup#QuickContact' }
    ],

    UI.FieldGroup #StatusInfo : {
        $Type : 'UI.FieldGroupType',
        Data  : [
            { $Type : 'UI.DataField', Value : status, Label : 'Active' },
            { $Type : 'UI.DataField', Value : isHNI, Label : 'VIP' },
            { $Type : 'UI.DataField', Value : isRecurringDonor, Label : 'Recurring' }
        ]
    },

    UI.FieldGroup #QuickContact : {
        $Type : 'UI.FieldGroupType',
        Data  : [
            { $Type : 'UI.DataField', Value : phone, Label : 'Phone' },
            { $Type : 'UI.DataField', Value : email, Label : 'Email' }
        ]
    },

    // ══════════════════════════════════════════════════════════════════════════
    // ACTION BUTTONS
    // ══════════════════════════════════════════════════════════════════════════
    UI.Identification : [
        { Value : name },
        { 
            $Type  : 'UI.DataFieldForAction',
            Label  : '🤖 Generate AI Summary',
            Action : 'donor_management_BitaSrv.Action1',
            ![@UI.Importance] : #High
        },
        { 
            $Type  : 'UI.DataFieldForAction',
            Label  : '📧 Send Thank You',
            Action : 'donor_management_BitaSrv.SendThankYou'
        },
        { 
            $Type  : 'UI.DataFieldForAction',
            Label  : '📊 Share Impact Report',
            Action : 'donor_management_BitaSrv.ShareImpactReport'
        },
        { 
            $Type  : 'UI.DataFieldForAction',
            Label  : '🎉 Invite to Event',
            Action : 'donor_management_BitaSrv.InviteToEvent'
        }
    ],

    // ══════════════════════════════════════════════════════════════════════════
    // TABLE VIEW (List Report)
    // ══════════════════════════════════════════════════════════════════════════
    UI.LineItem : [
        { $Type : 'UI.DataField', Value : name, ![@UI.Importance] : #High },
        { $Type : 'UI.DataField', Value : email, ![@UI.Importance] : #High },
        { $Type : 'UI.DataField', Value : phone, ![@UI.Importance] : #Medium },
        { $Type : 'UI.DataField', Value : status, Label : 'Active', ![@UI.Importance] : #High },
        { $Type : 'UI.DataField', Value : isRecurringDonor, Label : 'Recurring', ![@UI.Importance] : #Medium },
        { $Type : 'UI.DataField', Value : isHNI, Label : 'VIP', ![@UI.Importance] : #Medium }
    ],

    UI.PresentationVariant : {
        SortOrder      : [{ Property : name, Descending : false }],
        Visualizations : ['@UI.LineItem']
    },

    // ══════════════════════════════════════════════════════════════════════════
    // FILTER BAR
    // ══════════════════════════════════════════════════════════════════════════
    UI.SelectionFields : [
        name,
        email,
        status,
        isHNI,
        isRecurringDonor
    ],

    // ══════════════════════════════════════════════════════════════════════════
    // FIELD GROUPS
    // ══════════════════════════════════════════════════════════════════════════
    
    UI.FieldGroup #Main : {
        $Type : 'UI.FieldGroupType',
        Data  : [
            { $Type : 'UI.DataField', Value : name },
            { $Type : 'UI.DataField', Value : email },
            { $Type : 'UI.DataField', Value : phone },
            { $Type : 'UI.DataField', Value : status, Label : 'Active' },
            { $Type : 'UI.DataField', Value : isRecurringDonor },
            { $Type : 'UI.DataField', Value : isHNI, Label : 'VIP' }
        ]
    },

    UI.FieldGroup #AIInsights : {
        $Type : 'UI.FieldGroupType',
        Data  : [
            { 
                $Type : 'UI.DataField', 
                Value : summary, 
                Label : 'AI-Generated Summary'
            }
        ]
    },

    UI.FieldGroup #AuditInfo : {
        $Type : 'UI.FieldGroupType',
        Data  : [
            { $Type : 'UI.DataField', Value : createdAt },
            { $Type : 'UI.DataField', Value : createdBy },
            { $Type : 'UI.DataField', Value : modifiedAt },
            { $Type : 'UI.DataField', Value : modifiedBy }
        ]
    },

    // ══════════════════════════════════════════════════════════════════════════
    // PAGE LAYOUT - FACETS (with Donation History Table)
    // ══════════════════════════════════════════════════════════════════════════
    UI.Facets : [
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'Main',
            Label  : 'General Information',
            Target : '@UI.FieldGroup#Main'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'AIInsights',
            Label  : 'AI Insights',
            Target : '@UI.FieldGroup#AIInsights'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'DonationHistory',
            Label  : 'Donation History',
            Target : 'donations/@UI.LineItem'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'AuditInfo',
            Label  : 'Audit Information',
            Target : '@UI.FieldGroup#AuditInfo'
        }
    ]
);

// ══════════════════════════════════════════════════════════════════════════════
// FIELD-LEVEL ANNOTATIONS FOR DONORS
// ══════════════════════════════════════════════════════════════════════════════
annotate service.Donors with {
    ID               @UI.Hidden;
    donorID          @UI.Hidden  @UI.HiddenFilter;
    
    name             @title : 'Full Name';
    email            @title : 'Email Address';
    phone            @title : 'Phone Number';
    status           @title : 'Active';
    isRecurringDonor @title : 'Recurring Donor';
    isHNI            @title : 'VIP Donor';
    createdAt        @title : 'Created On';
    createdBy        @title : 'Created By';
    modifiedAt       @title : 'Last Modified';
    modifiedBy       @title : 'Modified By';

    summary          @(
        title            : 'AI Summary',
        UI.MultiLineText : true
    );
};


// ══════════════════════════════════════════════════════════════════════════════
// DONATIONS TABLE (shown inside Donor page - matched by email)
// ══════════════════════════════════════════════════════════════════════════════
annotate service.Donations with @(
    UI.HeaderInfo : {
        TypeName       : 'Donation',
        TypeNamePlural : 'Donations',
        Title          : { Value : donor_Name },
        Description    : { Value : campaign }
    },

    UI.HeaderFacets : [
        { $Type : 'UI.ReferenceFacet', ID : 'AmountHeader', Target : '@UI.DataPoint#Amount' },
        { $Type : 'UI.ReferenceFacet', ID : 'DateHeader', Target : '@UI.DataPoint#DonationDate' }
    ],

    UI.DataPoint #Amount : {
        Value       : amount,
        Title       : 'Amount',
        Description : currency_code
    },

    UI.DataPoint #DonationDate : {
        Value : donation_date,
        Title : 'Donation Date'
    },

    UI.LineItem : [
        { $Type : 'UI.DataField', Value : donation_date, Label : 'Date', ![@UI.Importance] : #High },
        { $Type : 'UI.DataField', Value : amount, Label : 'Amount', ![@UI.Importance] : #High },
        { $Type : 'UI.DataField', Value : currency_code, Label : 'Currency', ![@UI.Importance] : #High },
        { $Type : 'UI.DataField', Value : campaign, Label : 'Campaign', ![@UI.Importance] : #Medium },
        { $Type : 'UI.DataField', Value : cause, Label : 'Cause', ![@UI.Importance] : #Medium },
        { $Type : 'UI.DataField', Value : city, Label : 'City', ![@UI.Importance] : #Low }
    ],

    UI.PresentationVariant : {
        SortOrder      : [{ Property : donation_date, Descending : true }],
        Visualizations : ['@UI.LineItem']
    },

    UI.SelectionFields : [
        donor_Name,
        donor_Email,
        campaign,
        cause,
        donation_date,
        city,
        currency_code
    ],

    UI.FieldGroup #DonorInfo : {
        $Type : 'UI.FieldGroupType',
        Data  : [
            { $Type : 'UI.DataField', Value : donor_Name },
            { $Type : 'UI.DataField', Value : donor_Email },
            { $Type : 'UI.DataField', Value : donor_Phone },
            { $Type : 'UI.DataField', Value : city }
        ]
    },

    UI.FieldGroup #DonationInfo : {
        $Type : 'UI.FieldGroupType',
        Data  : [
            { $Type : 'UI.DataField', Value : amount },
            { $Type : 'UI.DataField', Value : currency_code },
            { $Type : 'UI.DataField', Value : donation_date }
        ]
    },

    UI.FieldGroup #CampaignInfo : {
        $Type : 'UI.FieldGroupType',
        Data  : [
            { $Type : 'UI.DataField', Value : campaign },
            { $Type : 'UI.DataField', Value : cause }
        ]
    },

    UI.Facets : [
        {
            $Type  : 'UI.CollectionFacet',
            ID     : 'DonationOverview',
            Label  : 'Donation Overview',
            Facets : [
                { $Type : 'UI.ReferenceFacet', ID : 'DonationDetails', Label : 'Payment Details', Target : '@UI.FieldGroup#DonationInfo' },
                { $Type : 'UI.ReferenceFacet', ID : 'CampaignDetails', Label : 'Campaign & Cause', Target : '@UI.FieldGroup#CampaignInfo' }
            ]
        },
        { $Type : 'UI.ReferenceFacet', ID : 'DonorDetails', Label : 'Donor Information', Target : '@UI.FieldGroup#DonorInfo' }
    ]
);

annotate service.Donations with {
    ID            @UI.Hidden;
    
    donor_Name    @title : 'Donor Name';
    donor_Email   @title : 'Email';
    donor_Phone   @title : 'Phone';
    city          @title : 'City';
    amount        @title : 'Amount'  @Measures.ISOCurrency : currency_code;
    currency_code @title : 'Currency';
    donation_date @title : 'Date';
    cause         @title : 'Cause';
    campaign      @title : 'Campaign';
};


// ══════════════════════════════════════════════════════════════════════════════
// DONOR TYPES ANNOTATIONS
// ══════════════════════════════════════════════════════════════════════════════
annotate service.DonorTypes with @(
    UI.HeaderInfo : {
        TypeName       : 'Donor Type',
        TypeNamePlural : 'Donor Types',
        Title          : { Value : typeName },
        Description    : { Value : description }
    },

    UI.LineItem : [
        { $Type : 'UI.DataField', Value : typeName, ![@UI.Importance] : #High },
        { $Type : 'UI.DataField', Value : description, ![@UI.Importance] : #Medium }
    ],

    UI.SelectionFields : [ typeName ],

    UI.FieldGroup #General : {
        $Type : 'UI.FieldGroupType',
        Data  : [
            { $Type : 'UI.DataField', Value : typeName },
            { $Type : 'UI.DataField', Value : description }
        ]
    },

    UI.Facets : [
        { $Type : 'UI.ReferenceFacet', ID : 'General', Label : 'General Information', Target : '@UI.FieldGroup#General' }
    ]
);

annotate service.DonorTypes with {
    ID          @UI.Hidden;
    typeID      @UI.Hidden;
    typeName    @title : 'Type Name';
    description @title : 'Description';
};