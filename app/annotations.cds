using { donor_management_BitaSrv } from '../srv/service.cds';

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

  // ── Action Button in Header ──
  UI.Identification: [
    { Value: name },
    { 
      $Type : 'UI.DataFieldForAction',
      Label : 'Generate AI Summary',
      Action: 'donor_management_BitaSrv.Action1'
    }
  ],

  // ── Table View ──
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: name },
    { $Type: 'UI.DataField', Value: email },
    { $Type: 'UI.DataField', Value: phone },
    { $Type: 'UI.DataField', Value: donorType.typeName, Label: 'Type' },
    { $Type: 'UI.DataField', Value: status, Label: 'Active' },
    { $Type: 'UI.DataField', Value: isHNI, Label: 'VIP' }
  ],

  // ── Filter Bar ──
  UI.SelectionFields: [ name, email, status ],

  // ══════════════════════════════════════════════════════════════════════════
  // OBJECT PAGE SECTIONS
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
  // FACETS - Page Layout
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
      ID: 'AuditInfo', 
      Label: 'Audit Trail', 
      Target: '@UI.FieldGroup#AuditInfo' 
    }
  ]
);

// ── Field Annotations ──
annotate donor_management_BitaSrv.Donors with {
  ID      @UI.Hidden;
  donorID @UI.Hidden;
  
  name    @title: 'Full Name';
  email   @title: 'Email';
  phone   @title: 'Phone';
  status  @title: 'Active';
  isHNI   @title: 'VIP Donor';
  isRecurringDonor @title: 'Recurring Donor';
  
  summary @(
    title: 'AI Summary',
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
    { $Type: 'UI.DataField', Value: donor_Name },
    { $Type: 'UI.DataField', Value: amount },
    { $Type: 'UI.DataField', Value: currency_code },
    { $Type: 'UI.DataField', Value: donation_date },
    { $Type: 'UI.DataField', Value: campaign },
    { $Type: 'UI.DataField', Value: cause }
  ],

  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', ID: 'Main', Label: 'Donation Details', Target: '@UI.FieldGroup#Main' }
  ],

  UI.FieldGroup #Main: {
    $Type: 'UI.FieldGroupType',
    Data : [
      { $Type: 'UI.DataField', Value: donor_Name },
      { $Type: 'UI.DataField', Value: donor_Email },
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
  donor_Name @title: 'Donor Name';
  donor_Email @title: 'Email';
  amount @title: 'Amount';
  currency_code @title: 'Currency';
  donation_date @title: 'Date';
  campaign @title: 'Campaign';
  cause @title: 'Cause';
  city @title: 'City';
};