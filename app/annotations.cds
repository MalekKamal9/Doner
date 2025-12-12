using { donor_management_BitaSrv } from '../srv/service.cds';

// ========== DONOR TYPES ==========
annotate donor_management_BitaSrv.DonorTypes with @UI.HeaderInfo: { 
  TypeName: 'Donor Type', 
  TypeNamePlural: 'Donor Types'
};

annotate donor_management_BitaSrv.DonorTypes with {
  ID @UI.Hidden;
  typeID @UI.Hidden;
};

annotate donor_management_BitaSrv.DonorTypes with {
  typeName @title: 'Type Name';
  description @title: 'Description'
};

annotate donor_management_BitaSrv.DonorTypes with @UI.LineItem: [
  { $Type: 'UI.DataField', Value: typeName },
  { $Type: 'UI.DataField', Value: description }
];

annotate donor_management_BitaSrv.DonorTypes with @UI.FieldGroup #Main: {
  $Type: 'UI.FieldGroupType', Data: [
    { $Type: 'UI.DataField', Value: typeName },
    { $Type: 'UI.DataField', Value: description }
  ]
};

annotate donor_management_BitaSrv.DonorTypes with @UI.Facets: [
  { $Type: 'UI.ReferenceFacet', ID: 'Main', Label: 'General Information', Target: '@UI.FieldGroup#Main' }
];

annotate donor_management_BitaSrv.DonorTypes with @UI.SelectionFields: [
  typeName
];


// ========== DONORS ==========

// ⭐ HEADER - Clean, no title/description
annotate donor_management_BitaSrv.Donors with @UI.HeaderInfo: { 
  TypeName: 'Donor', 
  TypeNamePlural: 'Donors'
};

// ⭐ HIDE FIELDS GLOBALLY
annotate donor_management_BitaSrv.Donors with {
  ID @UI.Hidden;
  donorID @UI.HiddenFilter: true;
};

annotate donor_management_BitaSrv.Donors with @UI.Identification: [{ Value: name }];

// ========== FIELD VALIDATION & INPUT CONTROL ==========

// Name field - mandatory with minimum length
annotate donor_management_BitaSrv.Donors with {
  name @(
    Common.FieldControl: #Mandatory
  );
};

// Email field - mandatory with format validation
annotate donor_management_BitaSrv.Donors with {
  email @(
    Common.FieldControl: #Mandatory
  );
};

// Phone field - numeric input hint
annotate donor_management_BitaSrv.Donors with {
  phone @(
    Common.IsDigitSequence: true
  );
};

// ========== SIDE EFFECTS FOR REAL-TIME VALIDATION ==========
annotate donor_management_BitaSrv.Donors with @(
  Common.SideEffects #NameValidation: {
    SourceProperties: [name],
    TargetProperties: [name]
  },
  Common.SideEffects #EmailValidation: {
    SourceProperties: [email],
    TargetProperties: [email]
  },
  Common.SideEffects #PhoneValidation: {
    SourceProperties: [phone],
    TargetProperties: [phone]
  }
);

// Value Help for Donor Type
annotate donor_management_BitaSrv.Donors with {
  donorType @Common.ValueList: {
    CollectionPath: 'DonorTypes',
    Parameters    : [
      {
        $Type            : 'Common.ValueListParameterInOut',
        LocalDataProperty: donorType_ID, 
        ValueListProperty: 'ID'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'typeName'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'description'
      },
    ],
  }
};

// Field Titles
annotate donor_management_BitaSrv.Donors with {
  donorID @title: 'Donor ID';
  name @title: 'Name';
  email @title: 'Email';
  phone @title: 'Phone';
  status @title: 'Active';
  isRecurringDonor @title: 'Recurring Donor';
  isHNI @title: 'High Net-worth Individual';
  createdAt @title: 'Created At';
  createdBy @title: 'Created By';
  modifiedAt @title: 'Modified At';
  modifiedBy @title: 'Modified By'
};

// ⭐ TABLE VIEW - donorID SHOWN
annotate donor_management_BitaSrv.Donors with @UI.LineItem: [
  { $Type: 'UI.DataField', Value: donorID },
  { $Type: 'UI.DataField', Value: name },
  { $Type: 'UI.DataField', Value: email },
  { $Type: 'UI.DataField', Value: phone },
  { $Type: 'UI.DataField', Value: status, Label: 'Active' },
  { $Type: 'UI.DataField', Value: isRecurringDonor },
  { $Type: 'UI.DataField', Value: isHNI },
  { $Type: 'UI.DataField', Label: 'Donor Type', Value: donorType.typeName }
];

// ⭐ FORM VIEW - NO donorID (completely removed)
annotate donor_management_BitaSrv.Donors with @UI.FieldGroup #Main: {
  $Type: 'UI.FieldGroupType', Data: [
    { $Type: 'UI.DataField', Value: name },
    { $Type: 'UI.DataField', Value: email },
    { $Type: 'UI.DataField', Value: phone },
    { $Type: 'UI.DataField', Value: status, Label: 'Active' },
    { $Type: 'UI.DataField', Value: isRecurringDonor },
    { $Type: 'UI.DataField', Value: isHNI },
    { $Type: 'UI.DataField', Label: 'Donor Type', Value: donorType_ID }
  ]
};

// Audit Info Section
annotate donor_management_BitaSrv.Donors with @UI.FieldGroup #AuditInfo: {
  $Type: 'UI.FieldGroupType', Data: [
    { $Type: 'UI.DataField', Value: createdAt },
    { $Type: 'UI.DataField', Value: createdBy },
    { $Type: 'UI.DataField', Value: modifiedAt },
    { $Type: 'UI.DataField', Value: modifiedBy }
  ]
};

annotate donor_management_BitaSrv.Donors with {
  donorType @Common.Text: { $value: donorType.typeName, ![@UI.TextArrangement]: #TextOnly }
};

annotate donor_management_BitaSrv.Donors with {
  donorType @Common.Label: 'Donor Type'
};

// ⭐ FACETS - Only Main and AuditInfo (no extra sections)
annotate donor_management_BitaSrv.Donors with @UI.Facets: [
  { $Type: 'UI.ReferenceFacet', ID: 'Main', Label: 'General Information', Target: '@UI.FieldGroup#Main' },
  { $Type: 'UI.ReferenceFacet', ID: 'AuditInfo', Label: 'Audit Information', Target: '@UI.FieldGroup#AuditInfo' }
];

// Search/Filter Fields
annotate donor_management_BitaSrv.Donors with @UI.SelectionFields: [
  name,
  email,
  status,
  donorType_ID
];