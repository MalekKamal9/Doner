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
// DONORS - WITH ANALYTICS DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

annotate donor_management_BitaSrv.Donors with @(
  
  UI.HeaderInfo: {
    TypeName       : 'Donor',
    TypeNamePlural : 'Donors',
    Title          : { Value: name },
    Description    : { Value: donorTier },
    ImageUrl       : 'sap-icon://customer',
    TypeImageUrl   : 'sap-icon://person-placeholder'
  },

  // ══════════════════════════════════════════════════════════════════════════
  // HEADER FACETS - KPI Cards
  // ══════════════════════════════════════════════════════════════════════════
  UI.HeaderFacets: [
    {
      $Type  : 'UI.ReferenceFacet',
      ID     : 'TotalDonatedKPI',
      Target : '@UI.DataPoint#TotalDonated'
    },
    {
      $Type  : 'UI.ReferenceFacet',
      ID     : 'DonationCountKPI',
      Target : '@UI.DataPoint#DonationCount'
    },
    {
      $Type  : 'UI.ReferenceFacet',
      ID     : 'EngagementKPI',
      Target : '@UI.DataPoint#EngagementScore'
    },
    {
      $Type  : 'UI.ReferenceFacet',
      ID     : 'LikelihoodKPI',
      Target : '@UI.DataPoint#LikelihoodScore'
    },
    { 
      $Type  : 'UI.ReferenceFacet', 
      ID     : 'StatusHeader', 
      Target : '@UI.FieldGroup#StatusBadges'
    }
  ],

  // ══════════════════════════════════════════════════════════════════════════
  // DATA POINTS FOR KPI CARDS
  // ══════════════════════════════════════════════════════════════════════════
  UI.DataPoint#TotalDonated: {
    $Type       : 'UI.DataPointType',
    Value       : totalDonated,
    Title       : 'Total Donated',
    Criticality : #Positive
  },

  UI.DataPoint#DonationCount: {
    $Type : 'UI.DataPointType',
    Value : donationCount,
    Title : 'Donations'
  },

  UI.DataPoint#EngagementScore: {
    $Type         : 'UI.DataPointType',
    Value         : engagementScore,
    Title         : 'Engagement %',
    TargetValue   : 100,
    Visualization : #Progress
  },

  UI.DataPoint#LikelihoodScore: {
    $Type         : 'UI.DataPointType',
    Value         : likelihoodScore,
    Title         : 'Likelihood %',
    TargetValue   : 100,
    Visualization : #Progress
  },

  UI.FieldGroup #StatusBadges: {
    $Type: 'UI.FieldGroupType',
    Label: 'Status',
    Data : [
      { $Type: 'UI.DataField', Value: status, Label: 'Active', Criticality: status },
      { $Type: 'UI.DataField', Value: isHNI, Label: 'VIP', Criticality: isHNI },
      { $Type: 'UI.DataField', Value: isRecurringDonor, Label: 'Recurring', Criticality: isRecurringDonor }
    ]
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ACTION BUTTONS
  // ══════════════════════════════════════════════════════════════════════════
  UI.Identification: [
    { Value: name },
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
  // TABLE VIEW - With Analytics Columns
  // ══════════════════════════════════════════════════════════════════════════
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: name, Label: 'Name', ![@UI.Importance]: #High },
    { $Type: 'UI.DataField', Value: email, Label: 'Email', ![@UI.Importance]: #High },
    { $Type: 'UI.DataField', Value: donorTier, Label: 'Tier', ![@UI.Importance]: #High },
    { $Type: 'UI.DataField', Value: totalDonated, Label: 'Total', ![@UI.Importance]: #High },
    { $Type: 'UI.DataField', Value: donationCount, Label: '# Donations', ![@UI.Importance]: #Medium },
    { $Type: 'UI.DataField', Value: engagementScore, Label: 'Engagement', ![@UI.Importance]: #Medium },
    { $Type: 'UI.DataField', Value: status, Label: 'Active', Criticality: status, ![@UI.Importance]: #High },
    { $Type: 'UI.DataField', Value: isHNI, Label: 'VIP', Criticality: isHNI, ![@UI.Importance]: #High },
    { $Type: 'UI.DataField', Value: isRecurringDonor, Label: 'Recurring', Criticality: isRecurringDonor, ![@UI.Importance]: #Medium }
  ],

  UI.PresentationVariant: {
    Text           : 'Default View',
    SortOrder      : [{ Property: name, Descending: false }],
    Visualizations : ['@UI.LineItem']
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

  UI.SelectionFields: [
    name,
    email,
    donorType_ID,
    status,
    isHNI,
    isRecurringDonor
  ],

  // ══════════════════════════════════════════════════════════════════════════
  // FIELD GROUPS - Analytics
  // ══════════════════════════════════════════════════════════════════════════
  
  UI.FieldGroup #KPIMetrics: {
    $Type: 'UI.FieldGroupType',
    Label: 'Key Performance Metrics',
    Data : [
      { $Type: 'UI.DataField', Value: totalDonated, Label: '💰 Total Donated' },
      { $Type: 'UI.DataField', Value: donationCount, Label: '📊 Number of Donations' },
      { $Type: 'UI.DataField', Value: averageDonation, Label: '📈 Average Donation' },
      { $Type: 'UI.DataField', Value: largestDonation, Label: '🏆 Largest Gift' },
      { $Type: 'UI.DataField', Value: smallestDonation, Label: '📉 Smallest Gift' },
      { $Type: 'UI.DataField', Value: monthlyAverage, Label: '📅 Monthly Average' }
    ]
  },

  UI.FieldGroup #ScoresAnalysis: {
    $Type: 'UI.FieldGroupType',
    Label: 'Scores & Analysis',
    Data : [
      { $Type: 'UI.DataField', Value: donorTier, Label: '🏅 Donor Tier' },
      { $Type: 'UI.DataField', Value: engagementScore, Label: '📊 Engagement Score (%)' },
      { $Type: 'UI.DataField', Value: likelihoodScore, Label: '🎯 Likelihood Score (%)' },
      { $Type: 'UI.DataField', Value: riskLevel, Label: '⚠️ Donation Risk Level' },
      { $Type: 'UI.DataField', Value: percentOfTotal, Label: '🥧 % of Total Donations' },
      { $Type: 'UI.DataField', Value: topCause, Label: '❤️ Favorite Cause' }
    ]
  },

  UI.FieldGroup #TrendsTimeline: {
    $Type: 'UI.FieldGroupType',
    Label: 'Trends & Timeline',
    Data : [
      { $Type: 'UI.DataField', Value: firstDonationDate, Label: '🟢 First Donation Date' },
      { $Type: 'UI.DataField', Value: lastDonationDate, Label: '🔵 Last Donation Date' },
      { $Type: 'UI.DataField', Value: daysSinceLastDonation, Label: '⏱️ Days Since Last Donation' },
      { $Type: 'UI.DataField', Value: yearOverYearGrowth, Label: '📈 Year-over-Year Growth (%)' }
    ]
  },

  // ══════════════════════════════════════════════════════════════════════════
  // FIELD GROUPS - Profile
  // ══════════════════════════════════════════════════════════════════════════

  UI.FieldGroup #PersonalInfo: {
    $Type: 'UI.FieldGroupType',
    Label: 'Personal Details',
    Data : [
      { $Type: 'UI.DataField', Value: name, Label: 'Full Name' },
      { $Type: 'UI.DataField', Value: email, Label: 'Email Address' },
      { $Type: 'UI.DataField', Value: phone, Label: 'Phone Number' }
    ]
  },

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

  // ══════════════════════════════════════════════════════════════════════════
  // FIELD GROUPS - AI Sections
  // ══════════════════════════════════════════════════════════════════════════

  UI.FieldGroup #AISummary: {
    $Type: 'UI.FieldGroupType',
    Label: 'AI-Generated Donor Analysis',
    Data : [
      { $Type: 'UI.DataField', Value: summary, Label: '' }
    ]
  },

  UI.FieldGroup #PredictionAnalysis: {
    $Type: 'UI.FieldGroupType',
    Label: 'Donation Likelihood Prediction',
    Data : [
      { $Type: 'UI.DataField', Value: predictionResult, Label: '' }
    ]
  },

  UI.FieldGroup #AnomalyDetection: {
    $Type: 'UI.FieldGroupType',
    Label: 'Fraud & Anomaly Detection',
    Data : [
      { $Type: 'UI.DataField', Value: anomalyResult, Label: '' }
    ]
  },

  UI.FieldGroup #DonationHistory: {
    $Type: 'UI.FieldGroupType',
    Label: 'Giving History',
    Data : [
      { $Type: 'UI.DataField', Value: donationHistory, Label: '' }
    ]
  },

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
  // PAGE LAYOUT - TABS
  // ══════════════════════════════════════════════════════════════════════════
  UI.Facets: [
    // Tab 1: Analytics Dashboard
    {
      $Type  : 'UI.CollectionFacet',
      ID     : 'AnalyticsTab',
      Label  : '📊 Analytics',
      Facets : [
        { $Type: 'UI.ReferenceFacet', ID: 'KPIMetrics', Label: 'Key Metrics', Target: '@UI.FieldGroup#KPIMetrics' },
        { $Type: 'UI.ReferenceFacet', ID: 'ScoresAnalysis', Label: 'Scores & Analysis', Target: '@UI.FieldGroup#ScoresAnalysis' },
        { $Type: 'UI.ReferenceFacet', ID: 'TrendsTimeline', Label: 'Trends & Timeline', Target: '@UI.FieldGroup#TrendsTimeline' }
      ]
    },
    // Tab 2: Donor Profile
    {
      $Type  : 'UI.CollectionFacet',
      ID     : 'DonorProfileTab',
      Label  : '👤 Profile',
      Facets : [
        { $Type: 'UI.ReferenceFacet', ID: 'PersonalInfo', Label: 'Personal Information', Target: '@UI.FieldGroup#PersonalInfo' },
        { $Type: 'UI.ReferenceFacet', ID: 'Classification', Label: 'Classification', Target: '@UI.FieldGroup#Classification' }
      ]
    },
    // Tab 3: Donation History
    {
      $Type  : 'UI.ReferenceFacet',
      ID     : 'HistoryTab',
      Label  : '📜 History',
      Target : '@UI.FieldGroup#DonationHistory'
    },
    // Tab 4: AI Summary
    {
      $Type  : 'UI.ReferenceFacet',
      ID     : 'AISummaryTab',
      Label  : '🤖 AI Summary',
      Target : '@UI.FieldGroup#AISummary'
    },
    // Tab 5: Prediction
    {
      $Type  : 'UI.ReferenceFacet',
      ID     : 'PredictionTab',
      Label  : '🎯 Prediction',
      Target : '@UI.FieldGroup#PredictionAnalysis'
    },
    // Tab 6: Anomaly Detection
    {
      $Type  : 'UI.ReferenceFacet',
      ID     : 'AnomalyTab',
      Label  : '🔍 Anomaly',
      Target : '@UI.FieldGroup#AnomalyDetection'
    },
    // Tab 7: Audit Trail
    {
      $Type  : 'UI.ReferenceFacet',
      ID     : 'AuditTab',
      Label  : '🔒 Audit',
      Target : '@UI.FieldGroup#AuditInfo'
    }
  ]
);

// ══════════════════════════════════════════════════════════════════════════════
// FIELD-LEVEL ANNOTATIONS
// ══════════════════════════════════════════════════════════════════════════════
annotate donor_management_BitaSrv.Donors with {
  ID      @UI.Hidden;
  donorID @UI.Hidden  @UI.HiddenFilter;
  
  name    @(title: 'Full Name', Common.FieldControl: #Mandatory);
  email   @(title: 'Email Address', Common.FieldControl: #Mandatory);
  phone   @title: 'Phone Number';
  
  status           @title: 'Active';
  isHNI            @title: 'VIP Donor';
  isRecurringDonor @title: 'Recurring Donor';
  
  createdAt  @title: 'Created On';
  createdBy  @title: 'Created By';
  modifiedAt @title: 'Last Modified';
  modifiedBy @title: 'Modified By';
  
  // AI Fields
  summary          @(title: 'AI Summary', UI.MultiLineText: true, UI.HiddenFilter: true);
  predictionResult @(title: 'Prediction', UI.MultiLineText: true, UI.HiddenFilter: true);
  anomalyResult    @(title: 'Anomaly', UI.MultiLineText: true, UI.HiddenFilter: true);
  donationHistory  @(title: 'History', UI.MultiLineText: true, UI.HiddenFilter: true);

  // Analytics Fields
  totalDonated          @(title: 'Total Donated', UI.HiddenFilter: true);
  donationCount         @(title: 'Donations', UI.HiddenFilter: true);
  averageDonation       @(title: 'Average', UI.HiddenFilter: true);
  largestDonation       @(title: 'Largest', UI.HiddenFilter: true);
  smallestDonation      @(title: 'Smallest', UI.HiddenFilter: true);
  daysSinceLastDonation @(title: 'Days Since Last', UI.HiddenFilter: true);
  donorTier             @(title: 'Tier', UI.HiddenFilter: true);
  engagementScore       @(title: 'Engagement %', UI.HiddenFilter: true);
  likelihoodScore       @(title: 'Likelihood %', UI.HiddenFilter: true);
  riskLevel             @(title: 'Risk Level', UI.HiddenFilter: true);
  topCause              @(title: 'Top Cause', UI.HiddenFilter: true);
  percentOfTotal        @(title: '% of Total', UI.HiddenFilter: true);
  yearOverYearGrowth    @(title: 'YoY Growth', UI.HiddenFilter: true);
  monthlyAverage        @(title: 'Monthly Avg', UI.HiddenFilter: true);
  lastDonationDate      @(title: 'Last Donation', UI.HiddenFilter: true);
  firstDonationDate     @(title: 'First Donation', UI.HiddenFilter: true);

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
    }
  );
};


// ══════════════════════════════════════════════════════════════════════════════
// DONATIONS
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
    { $Type: 'UI.DataField', Value: donor_Name, Label: 'Donor', ![@UI.Importance]: #High },
    { $Type: 'UI.DataField', Value: donor_Email, Label: 'Email', ![@UI.Importance]: #High },
    { $Type: 'UI.DataField', Value: donation_date, Label: 'Date', ![@UI.Importance]: #High },
    { $Type: 'UI.DataField', Value: amount, Label: 'Amount', ![@UI.Importance]: #High },
    { $Type: 'UI.DataField', Value: currency_code, Label: 'Currency', ![@UI.Importance]: #Medium },
    { $Type: 'UI.DataField', Value: campaign, Label: 'Campaign', ![@UI.Importance]: #High },
    { $Type: 'UI.DataField', Value: cause, Label: 'Cause', ![@UI.Importance]: #Medium },
    { $Type: 'UI.DataField', Value: city, Label: 'City', ![@UI.Importance]: #Low }
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