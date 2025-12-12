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
    { $Type: 'UI.DataField', Value: typeName, ![@UI.Importance]: #High },
    { $Type: 'UI.DataField', Value: description, ![@UI.Importance]: #Medium }
  ],

  UI.SelectionFields: [ typeName ],

  UI.FieldGroup #General: {
    $Type: 'UI.FieldGroupType',
    Data : [
      { $Type: 'UI.DataField', Value: typeName },
      { $Type: 'UI.DataField', Value: description }
    ]
  },

  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', ID: 'General', Label: 'General Information', Target: '@UI.FieldGroup#General' }
  ]
);

annotate donor_management_BitaSrv.DonorTypes with {
  ID          @UI.Hidden;
  typeID      @UI.Hidden;
  typeName    @title: 'Type Name';
  description @title: 'Description';
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

  // ── Header Facets (Top of Object Page) ──
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
      { $Type: 'UI.DataField', Value: donorType.typeName, Label: 'Type' }
    ]
  },

  // ── Action Button - FIXED to use Action1 ──
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
    { $Type: 'UI.DataField', Value: name, ![@UI.Importance]: #High },
    { $Type: 'UI.DataField', Value: email, ![@UI.Importance]: #High },
    { $Type: 'UI.DataField', Value: phone, ![@UI.Importance]: #Medium },
    { $Type: 'UI.DataField', Value: donorType.typeName, Label: 'Type', ![@UI.Importance]: #Medium },
    { $Type: 'UI.DataField', Value: status, Label: 'Active', ![@UI.Importance]: #High },
    { $Type: 'UI.DataField', Value: isRecurringDonor, ![@UI.Importance]: #Low },
    { $Type: 'UI.DataField', Value: isHNI, Label: 'VIP', ![@UI.Importance]: #Low }
  ],

  UI.PresentationVariant: {
    SortOrder     : [{ Property: name, Descending: false }],
    Visualizations: ['@UI.LineItem']
  },

  // ── Filter Bar ──
  UI.SelectionFields: [
    name,
    email,
    status,
    isHNI,
    isRecurringDonor,
    donorType_ID
  ],

  // ── Object Page Sections ──
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

  UI.FieldGroup #PersonalInfo: {
    $Type: 'UI.FieldGroupType',
    Data : [
      { $Type: 'UI.DataField', Value: name },
      { $Type: 'UI.DataField', Value: email },
      { $Type: 'UI.DataField', Value: phone }
    ]
  },

  UI.FieldGroup #Classification: {
    $Type: 'UI.FieldGroupType',
    Data : [
      { $Type: 'UI.DataField', Value: donorType_ID, Label: 'Donor Type' },
      { $Type: 'UI.DataField', Value: status, Label: 'Active Status' },
      { $Type: 'UI.DataField', Value: isRecurringDonor },
      { $Type: 'UI.DataField', Value: isHNI, Label: 'High Net-worth Individual' }
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

  // ── Facets with AI Insights first ──
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', ID: 'AIInsights', Label: 'AI Insights', Target: '@UI.FieldGroup#AIInsights' },
    {
      $Type : 'UI.CollectionFacet',
      ID    : 'DonorDetails',
      Label : 'Donor Details',
      Facets: [
        { $Type: 'UI.ReferenceFacet', ID: 'PersonalInfo', Label: 'Contact Information', Target: '@UI.FieldGroup#PersonalInfo' },
        { $Type: 'UI.ReferenceFacet', ID: 'Classification', Label: 'Classification', Target: '@UI.FieldGroup#Classification' }
      ]
    },
    { $Type: 'UI.ReferenceFacet', ID: 'AuditInfo', Label: 'Audit Trail', Target: '@UI.FieldGroup#AuditInfo' }
  ]
);

// ── Field-Level Annotations for Donors ──
annotate donor_management_BitaSrv.Donors with {
  ID               @UI.Hidden;
  donorID          @UI.Hidden  @UI.HiddenFilter;
  
  name             @title: 'Full Name'  @Common.FieldControl: #Mandatory;
  email            @title: 'Email Address'  @Common.FieldControl: #Mandatory;
  phone            @title: 'Phone Number'  @Common.IsDigitSequence;
  status           @title: 'Active';
  isRecurringDonor @title: 'Recurring Donor';
  isHNI            @title: 'VIP Donor';
  createdAt        @title: 'Created On';
  createdBy        @title: 'Created By';
  modifiedAt       @title: 'Last Modified';
  modifiedBy       @title: 'Modified By';

  summary          @(
    title: 'AI Summary',
    UI.MultiLineText: true,
    Common.FieldControl: #ReadOnly
  );

  donorType        @(
    title        : 'Donor Type',
    Common.Text  : donorType.typeName,
    Common.TextArrangement: #TextOnly,
    Common.ValueList: {
      CollectionPath: 'DonorTypes',
      Parameters    : [
        { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: donorType_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'typeName' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'description' }
      ]
    }
  );
};

// ── Side Effects for Real-time Validation ──
annotate donor_management_BitaSrv.Donors with @(
  Common.SideEffects #NameChange : { SourceProperties: [name], TargetProperties: [name] },
  Common.SideEffects #EmailChange: { SourceProperties: [email], TargetProperties: [email] }
);


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

  // ── Header Facets ──
  UI.HeaderFacets: [
    { $Type: 'UI.ReferenceFacet', ID: 'AmountHeader', Target: '@UI.DataPoint#Amount' },
    { $Type: 'UI.ReferenceFacet', ID: 'DateHeader', Target: '@UI.DataPoint#DonationDate' }
  ],

  UI.DataPoint #Amount: {
    Value      : amount,
    Title      : 'Amount',
    Description: currency_code
  },

  UI.DataPoint #DonationDate: {
    Value: donation_date,
    Title: 'Donation Date'
  },

  // ── Table View ──
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: donor_Name, ![@UI.Importance]: #High },
    { $Type: 'UI.DataField', Value: amount, ![@UI.Importance]: #High },
    { $Type: 'UI.DataField', Value: currency_code, ![@UI.Importance]: #High },
    { $Type: 'UI.DataField', Value: donation_date, ![@UI.Importance]: #High },
    { $Type: 'UI.DataField', Value: campaign, ![@UI.Importance]: #Medium },
    { $Type: 'UI.DataField', Value: cause, ![@UI.Importance]: #Medium },
    { $Type: 'UI.DataField', Value: city, ![@UI.Importance]: #Low }
  ],

  UI.PresentationVariant: {
    SortOrder     : [{ Property: donation_date, Descending: true }],
    Visualizations: ['@UI.LineItem']
  },

  // ── Filter Bar ──
  UI.SelectionFields: [
    donor_Name,
    campaign,
    cause,
    donation_date,
    city,
    currency_code
  ],

  // ── Object Page Sections ──
  UI.FieldGroup #DonorInfo: {
    $Type: 'UI.FieldGroupType',
    Data : [
      { $Type: 'UI.DataField', Value: donor_Name },
      { $Type: 'UI.DataField', Value: donor_Email },
      { $Type: 'UI.DataField', Value: donor_Phone },
      { $Type: 'UI.DataField', Value: city }
    ]
  },

  UI.FieldGroup #DonationInfo: {
    $Type: 'UI.FieldGroupType',
    Data : [
      { $Type: 'UI.DataField', Value: amount },
      { $Type: 'UI.DataField', Value: currency_code },
      { $Type: 'UI.DataField', Value: donation_date }
    ]
  },

  UI.FieldGroup #CampaignInfo: {
    $Type: 'UI.FieldGroupType',
    Data : [
      { $Type: 'UI.DataField', Value: campaign },
      { $Type: 'UI.DataField', Value: cause }
    ]
  },

  UI.Facets: [
    {
      $Type : 'UI.CollectionFacet',
      ID    : 'DonationOverview',
      Label : 'Donation Overview',
      Facets: [
        { $Type: 'UI.ReferenceFacet', ID: 'DonationDetails', Label: 'Payment Details', Target: '@UI.FieldGroup#DonationInfo' },
        { $Type: 'UI.ReferenceFacet', ID: 'CampaignDetails', Label: 'Campaign & Cause', Target: '@UI.FieldGroup#CampaignInfo' }
      ]
    },
    { $Type: 'UI.ReferenceFacet', ID: 'DonorDetails', Label: 'Donor Information', Target: '@UI.FieldGroup#DonorInfo' }
  ]
);

// ── Field-Level Annotations for Donations ──
annotate donor_management_BitaSrv.Donations with {
  ID            @UI.Hidden;
  
  donor_Name    @title: 'Donor Name';
  donor_Email   @title: 'Email';
  donor_Phone   @title: 'Phone';
  city          @title: 'City';
  amount        @title: 'Amount'  @Measures.ISOCurrency: currency_code;
  currency_code @title: 'Currency';
  donation_date @title: 'Date';
  cause         @title: 'Cause';
  campaign      @title: 'Campaign';
};