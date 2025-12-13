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
    { $Type: 'UI.DataField', Value: typeName, ![@UI.Importance]: #High },
    { $Type: 'UI.DataField', Value: description, ![@UI.Importance]: #High }
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
// DONORS - MODERN UI WITH SEPARATE AI SECTIONS
// ══════════════════════════════════════════════════════════════════════════════

annotate donor_management_BitaSrv.Donors with @(
  
  // ══════════════════════════════════════════════════════════════════════════
  // HEADER INFO WITH ICON
  // ══════════════════════════════════════════════════════════════════════════
  UI.HeaderInfo: {
    TypeName       : 'Donor',
    TypeNamePlural : 'Donors',
    Title          : { Value: name },
    Description    : { Value: email },
    ImageUrl       : 'sap-icon://customer',
    TypeImageUrl   : 'sap-icon://person-placeholder'
  },

  // ══════════════════════════════════════════════════════════════════════════
  // HEADER FACETS - KPI Cards Style
  // ══════════════════════════════════════════════════════════════════════════
  UI.HeaderFacets: [
    { 
      $Type  : 'UI.ReferenceFacet', 
      ID     : 'StatusHeader', 
      Target : '@UI.FieldGroup#StatusBadges',
      ![@UI.Importance]: #High
    },
    { 
      $Type  : 'UI.ReferenceFacet', 
      ID     : 'ContactHeader', 
      Target : '@UI.FieldGroup#QuickContact',
      ![@UI.Importance]: #High
    },
    {
      $Type  : 'UI.ReferenceFacet',
      ID     : 'DonorTypeHeader',
      Target : '@UI.FieldGroup#DonorTypeInfo',
      ![@UI.Importance]: #Medium
    }
  ],

  UI.FieldGroup #StatusBadges: {
    $Type: 'UI.FieldGroupType',
    Label: 'Status',
    Data : [
      { $Type: 'UI.DataField', Value: status, Label: 'Active', Criticality: status },
      { $Type: 'UI.DataField', Value: isHNI, Label: 'VIP', Criticality: isHNI },
      { $Type: 'UI.DataField', Value: isRecurringDonor, Label: 'Recurring', Criticality: isRecurringDonor }
    ]
  },

  UI.FieldGroup #QuickContact: {
    $Type: 'UI.FieldGroupType',
    Label: 'Contact',
    Data : [
      { $Type: 'UI.DataField', Value: phone, Label: 'Phone' },
      { $Type: 'UI.DataField', Value: email, Label: 'Email' }
    ]
  },

  UI.FieldGroup #DonorTypeInfo: {
    $Type: 'UI.FieldGroupType',
    Label: 'Classification',
    Data : [
      { $Type: 'UI.DataField', Value: donorType.typeName, Label: 'Type' }
    ]
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ACTION BUTTONS - Grouped by Function
  // ══════════════════════════════════════════════════════════════════════════
  UI.Identification: [
    { Value: name },
    // AI & Analytics Group
    { 
      $Type  : 'UI.DataFieldForAction',
      Label  : '🤖 AI Summary',
      Action : 'donor_management_BitaSrv.Action1',
      ![@UI.Importance]: #High
    },
    { 
      $Type  : 'UI.DataFieldForAction',
      Label  : '🎯 Predict Likelihood',
      Action : 'donor_management_BitaSrv.PredictLikelihood',
      ![@UI.Importance]: #High
    },
    { 
      $Type  : 'UI.DataFieldForAction',
      Label  : '🔍 Detect Anomalies',
      Action : 'donor_management_BitaSrv.DetectAnomalies',
      ![@UI.Importance]: #High
    },
    // Communication Group
    { 
      $Type  : 'UI.DataFieldForAction',
      Label  : '📊 AI Impact Report',
      Action : 'donor_management_BitaSrv.GenerateImpactReport',
      ![@UI.Importance]: #Medium
    },
    { 
      $Type  : 'UI.DataFieldForAction',
      Label  : '📧 Thank You',
      Action : 'donor_management_BitaSrv.SendThankYou',
      ![@UI.Importance]: #Medium
    },
    { 
      $Type  : 'UI.DataFieldForAction',
      Label  : '🎉 Event Invite',
      Action : 'donor_management_BitaSrv.InviteToEvent',
      ![@UI.Importance]: #Low
    }
  ],

  // ══════════════════════════════════════════════════════════════════════════
  // TABLE VIEW - Enhanced with Criticality & Responsive
  // ══════════════════════════════════════════════════════════════════════════
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: name, Label: 'Donor Name', ![@UI.Importance]: #High, ![@HTML5.CssDefaults]: { width: '20%' } },
    { $Type: 'UI.DataField', Value: email, Label: 'Email', ![@UI.Importance]: #High, ![@HTML5.CssDefaults]: { width: '20%' } },
    { $Type: 'UI.DataField', Value: phone, Label: 'Phone', ![@UI.Importance]: #Medium, ![@HTML5.CssDefaults]: { width: '12%' } },
    { $Type: 'UI.DataField', Value: donorType.typeName, Label: 'Type', ![@UI.Importance]: #Medium, ![@HTML5.CssDefaults]: { width: '10%' } },
    { $Type: 'UI.DataField', Value: status, Label: 'Active', Criticality: status, ![@UI.Importance]: #High, ![@HTML5.CssDefaults]: { width: '8%' } },
    { $Type: 'UI.DataField', Value: isRecurringDonor, Label: 'Recurring', Criticality: isRecurringDonor, ![@UI.Importance]: #Medium, ![@HTML5.CssDefaults]: { width: '8%' } },
    { $Type: 'UI.DataField', Value: isHNI, Label: 'VIP', Criticality: isHNI, ![@UI.Importance]: #High, ![@HTML5.CssDefaults]: { width: '8%' } },
    { $Type: 'UI.DataField', Value: modifiedAt, Label: 'Last Updated', ![@UI.Importance]: #Low, ![@HTML5.CssDefaults]: { width: '14%' } }
  ],

  // ══════════════════════════════════════════════════════════════════════════
  // TABLE CONFIGURATION - Sorting & Variants
  // ══════════════════════════════════════════════════════════════════════════
  UI.PresentationVariant: {
    Text           : 'Default View',
    SortOrder      : [{ Property: name, Descending: false }],
    Visualizations : ['@UI.LineItem'],
    RequestAtLeast : [name, email, status, isHNI, isRecurringDonor]
  },

  UI.SelectionPresentationVariant #DefaultVariant: {
    Text                : 'All Donors',
    SelectionVariant    : { SelectOptions: [] },
    PresentationVariant : { SortOrder: [{ Property: name }], Visualizations: ['@UI.LineItem'] }
  },

  UI.SelectionPresentationVariant #VIPDonors: {
    Text             : 'VIP Donors',
    SelectionVariant : { SelectOptions: [{ PropertyName: isHNI, Ranges: [{ Sign: #I, Option: #EQ, Low: true }] }] },
    PresentationVariant: { SortOrder: [{ Property: name }], Visualizations: ['@UI.LineItem'] }
  },

  UI.SelectionPresentationVariant #RecurringDonors: {
    Text             : 'Recurring Donors',
    SelectionVariant : { SelectOptions: [{ PropertyName: isRecurringDonor, Ranges: [{ Sign: #I, Option: #EQ, Low: true }] }] },
    PresentationVariant: { SortOrder: [{ Property: name }], Visualizations: ['@UI.LineItem'] }
  },

  UI.SelectionPresentationVariant #ActiveDonors: {
    Text             : 'Active Donors',
    SelectionVariant : { SelectOptions: [{ PropertyName: status, Ranges: [{ Sign: #I, Option: #EQ, Low: true }] }] },
    PresentationVariant: { SortOrder: [{ Property: name }], Visualizations: ['@UI.LineItem'] }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // FILTER BAR - Enhanced Search
  // ══════════════════════════════════════════════════════════════════════════
  UI.SelectionFields: [
    name,
    email,
    donorType_ID,
    status,
    isHNI,
    isRecurringDonor
  ],

  // ══════════════════════════════════════════════════════════════════════════
  // FIELD GROUPS FOR ALL SECTIONS
  // ══════════════════════════════════════════════════════════════════════════

  // Personal Information Section
  UI.FieldGroup #PersonalInfo: {
    $Type: 'UI.FieldGroupType',
    Label: 'Personal Details',
    Data : [
      { $Type: 'UI.DataField', Value: name, Label: 'Full Name' },
      { $Type: 'UI.DataField', Value: email, Label: 'Email Address' },
      { $Type: 'UI.DataField', Value: phone, Label: 'Phone Number' }
    ]
  },

  // Classification Section
  UI.FieldGroup #Classification: {
    $Type: 'UI.FieldGroupType',
    Label: 'Donor Classification',
    Data : [
      { $Type: 'UI.DataField', Value: donorType_ID, Label: 'Donor Type' },
      { $Type: 'UI.DataField', Value: status, Label: 'Active Status', Criticality: status },
      { $Type: 'UI.DataField', Value: isRecurringDonor, Label: 'Recurring Donor', Criticality: isRecurringDonor },
      { $Type: 'UI.DataField', Value: isHNI, Label: 'VIP Donor', Criticality: isHNI }
    ]
  },

  // ════════════════════════════════════════════════════════════════════════════
  // AI SUMMARY SECTION - Separate Tab
  // ════════════════════════════════════════════════════════════════════════════
  UI.FieldGroup #AISummary: {
    $Type: 'UI.FieldGroupType',
    Label: 'AI-Generated Donor Analysis',
    Data : [
      { $Type: 'UI.DataField', Value: summary, Label: 'Donor Intelligence Report' }
    ]
  },

  // ════════════════════════════════════════════════════════════════════════════
  // PREDICTION SECTION - Separate Tab
  // ════════════════════════════════════════════════════════════════════════════
  UI.FieldGroup #PredictionAnalysis: {
    $Type: 'UI.FieldGroupType',
    Label: 'Donation Likelihood Prediction',
    Data : [
      { $Type: 'UI.DataField', Value: predictionResult, Label: 'ML Prediction Results' }
    ]
  },

  // ════════════════════════════════════════════════════════════════════════════
  // ANOMALY DETECTION SECTION - Separate Tab
  // ════════════════════════════════════════════════════════════════════════════
  UI.FieldGroup #AnomalyDetection: {
    $Type: 'UI.FieldGroupType',
    Label: 'Fraud & Anomaly Detection',
    Data : [
      { $Type: 'UI.DataField', Value: anomalyResult, Label: 'Anomaly Detection Results' }
    ]
  },

  // Donation History Section
  UI.FieldGroup #DonationHistory: {
    $Type: 'UI.FieldGroupType',
    Label: 'Giving History',
    Data : [
      { $Type: 'UI.DataField', Value: donationHistory, Label: 'Donation Records' }
    ]
  },

  // Audit Information Section
  UI.FieldGroup #AuditInfo: {
    $Type: 'UI.FieldGroupType',
    Label: 'System Information',
    Data : [
      { $Type: 'UI.DataField', Value: createdAt, Label: 'Created' },
      { $Type: 'UI.DataField', Value: createdBy, Label: 'Created By' },
      { $Type: 'UI.DataField', Value: modifiedAt, Label: 'Last Modified' },
      { $Type: 'UI.DataField', Value: modifiedBy, Label: 'Modified By' }
    ]
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE LAYOUT - TABS WITH SEPARATE AI SECTIONS
  // ══════════════════════════════════════════════════════════════════════════
  UI.Facets: [
    // Tab 1: Donor Profile
    {
      $Type  : 'UI.CollectionFacet',
      ID     : 'DonorProfileTab',
      Label  : '👤 Donor Profile',
      Facets : [
        { $Type: 'UI.ReferenceFacet', ID: 'PersonalInfo', Label: 'Personal Information', Target: '@UI.FieldGroup#PersonalInfo' },
        { $Type: 'UI.ReferenceFacet', ID: 'Classification', Label: 'Classification', Target: '@UI.FieldGroup#Classification' }
      ]
    },
    // Tab 2: AI Summary (Separate)
    {
      $Type  : 'UI.ReferenceFacet',
      ID     : 'AISummaryTab',
      Label  : '🤖 AI Summary',
      Target : '@UI.FieldGroup#AISummary'
    },
    // Tab 3: Prediction Analysis (Separate)
    {
      $Type  : 'UI.ReferenceFacet',
      ID     : 'PredictionTab',
      Label  : '🎯 Prediction',
      Target : '@UI.FieldGroup#PredictionAnalysis'
    },
    // Tab 4: Anomaly Detection (Separate)
    {
      $Type  : 'UI.ReferenceFacet',
      ID     : 'AnomalyTab',
      Label  : '🔍 Anomaly Detection',
      Target : '@UI.FieldGroup#AnomalyDetection'
    },
    // Tab 5: Donation History
    {
      $Type  : 'UI.ReferenceFacet',
      ID     : 'HistoryTab',
      Label  : '📊 Donation History',
      Target : '@UI.FieldGroup#DonationHistory'
    },
    // Tab 6: Audit Trail
    {
      $Type  : 'UI.ReferenceFacet',
      ID     : 'AuditTab',
      Label  : '🔒 Audit Trail',
      Target : '@UI.FieldGroup#AuditInfo'
    }
  ]
);

// ══════════════════════════════════════════════════════════════════════════════
// FIELD-LEVEL ANNOTATIONS - Enhanced with New AI Fields
// ══════════════════════════════════════════════════════════════════════════════
annotate donor_management_BitaSrv.Donors with {
  ID      @UI.Hidden;
  donorID @UI.Hidden  @UI.HiddenFilter;
  
  name    @(title: 'Full Name', Common.FieldControl: #Mandatory);
  email   @(title: 'Email Address', Common.FieldControl: #Mandatory);
  phone   @title: 'Phone Number';
  
  status  @(
    title: 'Active',
    Common.Text: { $value: status, ![@UI.TextArrangement]: #TextOnly }
  );
  
  isHNI   @(
    title: 'VIP Donor',
    Common.Text: { $value: isHNI, ![@UI.TextArrangement]: #TextOnly }
  );
  
  isRecurringDonor @(
    title: 'Recurring Donor',
    Common.Text: { $value: isRecurringDonor, ![@UI.TextArrangement]: #TextOnly }
  );
  
  createdAt  @title: 'Created On';
  createdBy  @title: 'Created By';
  modifiedAt @title: 'Last Modified';
  modifiedBy @title: 'Modified By';
  
  // AI Summary Field
  summary @(
    title: 'AI Summary',
    UI.MultiLineText: true,
    UI.HiddenFilter: true
  );

  // Prediction Result Field
  predictionResult @(
    title: 'Prediction Analysis',
    UI.MultiLineText: true,
    UI.HiddenFilter: true
  );

  // Anomaly Detection Result Field
  anomalyResult @(
    title: 'Anomaly Detection',
    UI.MultiLineText: true,
    UI.HiddenFilter: true
  );

  // Donation History Virtual Field
  donationHistory @(
    title: 'Donation History',
    UI.MultiLineText: true,
    UI.HiddenFilter: true
  );

  donorType @(
    title: 'Donor Type',
    Common.Text: donorType.typeName,
    Common.TextArrangement: #TextOnly,
    Common.ValueList: {
      Label: 'Donor Types',
      CollectionPath: 'DonorTypes',
      Parameters: [
        { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: donorType_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'typeName' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'description' }
      ]
    },
    Common.ValueListWithFixedValues: false
  );
};


// ══════════════════════════════════════════════════════════════════════════════
// DONATIONS - Enhanced Modern View
// ══════════════════════════════════════════════════════════════════════════════

annotate donor_management_BitaSrv.Donations with @(
  UI.HeaderInfo: {
    TypeName       : 'Donation',
    TypeNamePlural : 'Donations',
    Title          : { Value: donor_Name },
    Description    : { Value: campaign },
    TypeImageUrl   : 'sap-icon://money-bills'
  },

  UI.LineItem: [
    { $Type: 'UI.DataField', Value: donor_Name, Label: 'Donor', ![@UI.Importance]: #High, ![@HTML5.CssDefaults]: { width: '15%' } },
    { $Type: 'UI.DataField', Value: donor_Email, Label: 'Email', ![@UI.Importance]: #High, ![@HTML5.CssDefaults]: { width: '18%' } },
    { $Type: 'UI.DataField', Value: donation_date, Label: 'Date', ![@UI.Importance]: #High, ![@HTML5.CssDefaults]: { width: '10%' } },
    { $Type: 'UI.DataField', Value: amount, Label: 'Amount', ![@UI.Importance]: #High, ![@HTML5.CssDefaults]: { width: '10%' } },
    { $Type: 'UI.DataField', Value: currency_code, Label: 'Currency', ![@UI.Importance]: #Medium, ![@HTML5.CssDefaults]: { width: '7%' } },
    { $Type: 'UI.DataField', Value: campaign, Label: 'Campaign', ![@UI.Importance]: #High, ![@HTML5.CssDefaults]: { width: '15%' } },
    { $Type: 'UI.DataField', Value: cause, Label: 'Cause', ![@UI.Importance]: #Medium, ![@HTML5.CssDefaults]: { width: '12%' } },
    { $Type: 'UI.DataField', Value: city, Label: 'City', ![@UI.Importance]: #Low, ![@HTML5.CssDefaults]: { width: '13%' } }
  ],

  UI.PresentationVariant: {
    Text           : 'Default View',
    SortOrder      : [{ Property: donation_date, Descending: true }],
    Visualizations : ['@UI.LineItem']
  },

  UI.SelectionFields: [
    donor_Name,
    donor_Email,
    campaign,
    cause,
    donation_date,
    currency_code
  ],

  UI.Facets: [
    {
      $Type  : 'UI.CollectionFacet',
      ID     : 'DonationDetails',
      Label  : '💰 Donation Details',
      Facets : [
        { $Type: 'UI.ReferenceFacet', ID: 'DonorInfo', Label: 'Donor Information', Target: '@UI.FieldGroup#DonorInfo' },
        { $Type: 'UI.ReferenceFacet', ID: 'DonationInfo', Label: 'Donation Information', Target: '@UI.FieldGroup#DonationInfo' }
      ]
    }
  ],

  UI.FieldGroup #DonorInfo: {
    $Type: 'UI.FieldGroupType',
    Label: 'Donor Details',
    Data : [
      { $Type: 'UI.DataField', Value: donor_Name, Label: 'Name' },
      { $Type: 'UI.DataField', Value: donor_Email, Label: 'Email' },
      { $Type: 'UI.DataField', Value: donor_Phone, Label: 'Phone' },
      { $Type: 'UI.DataField', Value: city, Label: 'City' }
    ]
  },

  UI.FieldGroup #DonationInfo: {
    $Type: 'UI.FieldGroupType',
    Label: 'Transaction Details',
    Data : [
      { $Type: 'UI.DataField', Value: amount, Label: 'Amount' },
      { $Type: 'UI.DataField', Value: currency_code, Label: 'Currency' },
      { $Type: 'UI.DataField', Value: donation_date, Label: 'Date' },
      { $Type: 'UI.DataField', Value: campaign, Label: 'Campaign' },
      { $Type: 'UI.DataField', Value: cause, Label: 'Cause' }
    ]
  }
);

annotate donor_management_BitaSrv.Donations with {
  ID            @UI.Hidden;
  donor_Name    @title: 'Donor Name';
  donor_Email   @title: 'Email';
  donor_Phone   @title: 'Phone';
  city          @title: 'City';
  amount        @(title: 'Amount', Measures.Unit: currency_code);
  currency_code @title: 'Currency';
  donation_date @title: 'Date';
  cause         @title: 'Cause';
  campaign      @title: 'Campaign';
};