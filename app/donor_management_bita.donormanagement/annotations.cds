using { donor_management_BitaSrv } from '../../srv/service.cds';

// ══════════════════════════════════════════════════════════════════════════════
// DONOR TYPES
// ══════════════════════════════════════════════════════════════════════════════

annotate donor_management_BitaSrv.DonorTypes with @(
  UI.HeaderInfo: {
    TypeName      : 'Donor Type',
    TypeNamePlural: 'Donor Types',
    Title         : { Value: typeName },
    Description   : { Value: description }
  },

  UI.LineItem: [
    { $Type: 'UI.DataField', Value: typeName },
    { $Type: 'UI.DataField', Value: description }
  ],

  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', ID: 'General', Label: 'General Information', Target: '@UI.FieldGroup#General' }
  ],

  UI.FieldGroup #General: {
    $Type: 'UI.FieldGroupType',
    Data : [
      { $Type: 'UI.DataField', Value: typeName },
      { $Type: 'UI.DataField', Value: description }
    ]
  }
);

annotate donor_management_BitaSrv.DonorTypes with {
  ID @UI.Hidden;
  typeID @UI.Hidden;
};


// ══════════════════════════════════════════════════════════════════════════════
// DONORS
// ══════════════════════════════════════════════════════════════════════════════

annotate donor_management_BitaSrv.Donors with @(
  UI.HeaderInfo: {
    TypeName      : 'Donor',
    TypeNamePlural: 'Donors',
    Title         : { Value: name },
    Description   : { Value: email }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // HEADER FACETS - Quick Info Display
  // ══════════════════════════════════════════════════════════════════════════
  UI.HeaderFacets: [
    { $Type: 'UI.ReferenceFacet', ID: 'StatusHeader', Target: '@UI.FieldGroup#StatusInfo' },
    { $Type: 'UI.ReferenceFacet', ID: 'ContactHeader', Target: '@UI.FieldGroup#QuickContact' }
  ],

  UI.FieldGroup #StatusInfo: {
    $Type: 'UI.FieldGroupType',
    Data : [
      { $Type: 'UI.DataField', Value: status, Label: 'Active' },
      { $Type: 'UI.DataField', Value: isHNI, Label: 'VIP' },
      { $Type: 'UI.DataField', Value: isRecurringDonor, Label: 'Recurring' }
    ]
  },

  UI.FieldGroup #QuickContact: {
    $Type: 'UI.FieldGroupType',
    Data : [
      { $Type: 'UI.DataField', Value: phone, Label: 'Phone' },
      { $Type: 'UI.DataField', Value: email, Label: 'Email' }
    ]
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ACTION BUTTONS
  // ══════════════════════════════════════════════════════════════════════════
  UI.Identification: [
    { Value: name },
    { 
      $Type : 'UI.DataFieldForAction',
      Label : '🎯 Predict Likelihood',
      Action: 'donor_management_BitaSrv.PredictLikelihood',
      ![@UI.Importance]: #High
    },
    { 
      $Type : 'UI.DataFieldForAction',
      Label : '🔍 Detect Anomalies',
      Action: 'donor_management_BitaSrv.DetectAnomalies',
      ![@UI.Importance]: #High
    },
    { 
      $Type : 'UI.DataFieldForAction',
      Label : '🤖 Generate AI Summary',
      Action: 'donor_management_BitaSrv.Action1'
    },
    { 
      $Type : 'UI.DataFieldForAction',
      Label : '📧 Send Thank You',
      Action: 'donor_management_BitaSrv.SendThankYou'
    },
    { 
      $Type : 'UI.DataFieldForAction',
      Label : '📊 Share Impact Report',
      Action: 'donor_management_BitaSrv.ShareImpactReport'
    },
    { 
      $Type : 'UI.DataFieldForAction',
      Label : '🎉 Invite to Event',
      Action: 'donor_management_BitaSrv.InviteToEvent'
    }
  ],

  // ══════════════════════════════════════════════════════════════════════════
  // TABLE VIEW (List Report)
  // ══════════════════════════════════════════════════════════════════════════
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: name, ![@UI.Importance]: #High },
    { $Type: 'UI.DataField', Value: email, ![@UI.Importance]: #High },
    { $Type: 'UI.DataField', Value: phone, ![@UI.Importance]: #Medium },
    { $Type: 'UI.DataField', Value: donorType.typeName, Label: 'Type' },
    { $Type: 'UI.DataField', Value: status, Label: 'Active', ![@UI.Importance]: #High },
    { $Type: 'UI.DataField', Value: isRecurringDonor, Label: 'Recurring', ![@UI.Importance]: #Medium },
    { $Type: 'UI.DataField', Value: isHNI, Label: 'VIP', ![@UI.Importance]: #Medium }
  ],

  UI.PresentationVariant: {
    SortOrder     : [{ Property: name, Descending: false }],
    Visualizations: ['@UI.LineItem']
  },

  // ══════════════════════════════════════════════════════════════════════════
  // FILTER BAR
  // ══════════════════════════════════════════════════════════════════════════
  UI.SelectionFields: [
    name,
    email,
    status,
    isHNI,
    isRecurringDonor
  ],

  // ══════════════════════════════════════════════════════════════════════════
  // FIELD GROUPS
  // ══════════════════════════════════════════════════════════════════════════

  UI.FieldGroup #GeneralInfo: {
    $Type: 'UI.FieldGroupType',
    Data : [
      { $Type: 'UI.DataField', Value: name },
      { $Type: 'UI.DataField', Value: email },
      { $Type: 'UI.DataField', Value: phone },
      { $Type: 'UI.DataField', Value: donorType_ID, Label: 'Donor Type' },
      { $Type: 'UI.DataField', Value: status, Label: 'Active' },
      { $Type: 'UI.DataField', Value: isRecurringDonor },
      { $Type: 'UI.DataField', Value: isHNI, Label: 'VIP Donor' }
    ]
  },

  UI.FieldGroup #AIInsights: {
    $Type: 'UI.FieldGroupType',
    Data : [
      { 
        $Type: 'UI.DataField', 
        Value: summary, 
        Label: 'AI-Generated Summary'
      }
    ]
  },

  UI.FieldGroup #DonationHistory: {
    $Type: 'UI.FieldGroupType',
    Data : [
      { 
        $Type: 'UI.DataField', 
        Value: donationHistory, 
        Label: 'Donation Records'
      }
    ]
  },

  UI.FieldGroup #AuditInfo: {
    $Type: 'UI.FieldGroupType',
    Data : [
      { $Type: 'UI.DataField', Value: createdAt },
      { $Type: 'UI.DataField', Value: createdBy },
      { $Type: 'UI.DataField', Value: modifiedAt },
      { $Type: 'UI.DataField', Value: modifiedBy }
    ]
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE LAYOUT - Facets
  // ══════════════════════════════════════════════════════════════════════════
  UI.Facets: [
    { 
      $Type: 'UI.ReferenceFacet', 
      ID: 'GeneralInfo', 
      Label: 'General Information', 
      Target: '@UI.FieldGroup#GeneralInfo' 
    },
    { 
      $Type: 'UI.ReferenceFacet', 
      ID: 'AIInsights', 
      Label: 'AI Insights', 
      Target: '@UI.FieldGroup#AIInsights' 
    },
    { 
      $Type: 'UI.ReferenceFacet', 
      ID: 'DonationHistory', 
      Label: 'Donation History', 
      Target: '@UI.FieldGroup#DonationHistory' 
    },
    { 
      $Type: 'UI.ReferenceFacet', 
      ID: 'AuditInfo', 
      Label: 'Audit Trail', 
      Target: '@UI.FieldGroup#AuditInfo' 
    }
  ]
);

// ══════════════════════════════════════════════════════════════════════════════
// FIELD-LEVEL ANNOTATIONS FOR DONORS
// ══════════════════════════════════════════════════════════════════════════════
annotate donor_management_BitaSrv.Donors with {
  ID      @UI.Hidden;
  donorID @UI.Hidden  @UI.HiddenFilter;
  
  name    @title: 'Full Name';
  email   @title: 'Email Address';
  phone   @title: 'Phone Number';
  status  @title: 'Active';
  isHNI   @title: 'VIP Donor';
  isRecurringDonor @title: 'Recurring Donor';
  createdAt  @title: 'Created On';
  createdBy  @title: 'Created By';
  modifiedAt @title: 'Last Modified';
  modifiedBy @title: 'Modified By';
  
  summary @(
    title: 'AI Summary',
    UI.MultiLineText: true
  );

  donationHistory @(
    title: 'Donation History',
    UI.MultiLineText: true
  );

  donorType @(
    title: 'Donor Type',
    Common.Text: donorType.typeName,
    Common.TextArrangement: #TextOnly,
    Common.ValueList: {
      CollectionPath: 'DonorTypes',
      Parameters: [
        { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: donorType_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'typeName' }
      ]
    }
  );
};


// ══════════════════════════════════════════════════════════════════════════════
// DONATIONS
// ══════════════════════════════════════════════════════════════════════════════

annotate donor_management_BitaSrv.Donations with @(
  UI.HeaderInfo: {
    TypeName      : 'Donation',
    TypeNamePlural: 'Donations',
    Title         : { Value: donor_Name },
    Description   : { Value: campaign }
  },

  UI.LineItem: [
    { $Type: 'UI.DataField', Value: donor_Name, Label: 'Donor', ![@UI.Importance]: #High },
    { $Type: 'UI.DataField', Value: donor_Email, Label: 'Email', ![@UI.Importance]: #High },
    { $Type: 'UI.DataField', Value: donation_date, Label: 'Date', ![@UI.Importance]: #High },
    { $Type: 'UI.DataField', Value: amount, Label: 'Amount', ![@UI.Importance]: #High },
    { $Type: 'UI.DataField', Value: currency_code, Label: 'Currency', ![@UI.Importance]: #Medium },
    { $Type: 'UI.DataField', Value: campaign, Label: 'Campaign', ![@UI.Importance]: #Medium },
    { $Type: 'UI.DataField', Value: cause, Label: 'Cause', ![@UI.Importance]: #Medium },
    { $Type: 'UI.DataField', Value: city, Label: 'City', ![@UI.Importance]: #Low }
  ],

  UI.PresentationVariant: {
    SortOrder     : [{ Property: donation_date, Descending: true }],
    Visualizations: ['@UI.LineItem']
  },

  UI.SelectionFields: [
    donor_Name,
    donor_Email,
    campaign,
    cause,
    donation_date
  ],

  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', ID: 'Main', Label: 'Donation Details', Target: '@UI.FieldGroup#Main' }
  ],

  UI.FieldGroup #Main: {
    $Type: 'UI.FieldGroupType',
    Data : [
      { $Type: 'UI.DataField', Value: donor_Name },
      { $Type: 'UI.DataField', Value: donor_Email },
      { $Type: 'UI.DataField', Value: donor_Phone },
      { $Type: 'UI.DataField', Value: amount },
      { $Type: 'UI.DataField', Value: currency_code },
      { $Type: 'UI.DataField', Value: donation_date },
      { $Type: 'UI.DataField', Value: campaign },
      { $Type: 'UI.DataField', Value: cause },
      { $Type: 'UI.DataField', Value: city }
    ]
  }
);

annotate donor_management_BitaSrv.Donations with {
  ID @UI.Hidden;
  donor_Name    @title: 'Donor Name';
  donor_Email   @title: 'Email';
  donor_Phone   @title: 'Phone';
  city          @title: 'City';
  amount        @title: 'Amount';
  currency_code @title: 'Currency';
  donation_date @title: 'Date';
  cause         @title: 'Cause';
  campaign      @title: 'Campaign';
};