using { Donor_management_Bita as my } from '../db/schema.cds';

@path: '/service/donor_management_Bita'
service donor_management_BitaSrv {
    @odata.draft.enabled
    entity Donors as projection on my.Donors {
        *,
        // Virtual Fields - Calculated on-the-fly
        null as donationHistory       : LargeString,
        null as totalDonated          : Decimal(15,2),
        null as donationCount         : Integer,
        null as averageDonation       : Decimal(15,2),
        null as largestDonation       : Decimal(15,2),
        null as smallestDonation      : Decimal(15,2),
        null as daysSinceLastDonation : Integer,
        null as donorTier             : String(50),
        null as engagementScore       : Integer,
        null as likelihoodScore       : Integer,
        null as riskLevel             : String(20),
        null as topCause              : String(100),
        null as percentOfTotal        : Decimal(5,2),
        null as yearOverYearGrowth    : Decimal(5,2),
        null as monthlyAverage        : Decimal(15,2),
        null as lastDonationDate      : Date,
        null as firstDonationDate     : Date,
        null as currencyCode          : String(3)
    } actions {
        action Action1() returns String;
        action SendThankYou() returns String;
        action GenerateImpactReport() returns String;
        action InviteToEvent() returns String;
        action PredictLikelihood() returns String;
        action DetectAnomalies() returns String;
    };

    entity DonorTypes as projection on my.DonorTypes;
    
    @odata.draft.enabled: false
    entity Donations as projection on my.Donations;

    function getAnalyticsData() returns String;
    
    // ═══════════════════════════════════════════════════════════════
    // UI ANNOTATIONS - OBJECT PAGE LAYOUT
    // ═══════════════════════════════════════════════════════════════
    
    annotate Donors with @(
        UI.SelectionFields: [
            name,
            email,
            status,
            donorType_ID,
            isHNI,
            isRecurringDonor
        ],
        
        UI.LineItem: [
            {
                $Type: 'UI.DataField',
                Value: name,
                Label: 'Name'
            },
            {
                $Type: 'UI.DataField',
                Value: email,
                Label: 'Email'
            },
            {
                $Type: 'UI.DataField',
                Value: phone,
                Label: 'Phone'
            },
            {
                $Type: 'UI.DataField',
                Value: city,
                Label: 'City'
            },
            {
                $Type: 'UI.DataField',
                Value: donorType.name,
                Label: 'Type'
            },
            {
                $Type: 'UI.DataFieldForAnnotation',
                Target: '@UI.DataPoint#Status',
                Label: 'Status'
            },
            {
                $Type: 'UI.DataFieldForAnnotation',
                Target: '@UI.DataPoint#IsHNI',
                Label: 'VIP'
            },
            {
                $Type: 'UI.DataFieldForAction',
                Action: 'donor_management_BitaSrv.Action1',
                Label: 'Generate AI Summary',
                Inline: true
            }
        ],
        
        // ═══════════════════════════════════════════════════════════════
        // OBJECT PAGE HEADER
        // ═══════════════════════════════════════════════════════════════
        
        UI.HeaderInfo: {
            TypeName: 'Donor',
            TypeNamePlural: 'Donors',
            Title: {
                $Type: 'UI.DataField',
                Value: name
            },
            Description: {
                $Type: 'UI.DataField',
                Value: email
            },
            ImageUrl: 'sap-icon://customer',
            TypeImageUrl: 'sap-icon://customer'
        },
        
        // ═══════════════════════════════════════════════════════════════
        // HEADER FACETS (Quick Info Cards)
        // ═══════════════════════════════════════════════════════════════
        
        UI.HeaderFacets: [
            {
                $Type: 'UI.ReferenceFacet',
                Target: '@UI.FieldGroup#ContactInfo',
                Label: 'Contact Information'
            },
            {
                $Type: 'UI.ReferenceFacet',
                Target: '@UI.FieldGroup#DonorStatus',
                Label: 'Donor Status'
            },
            {
                $Type: 'UI.ReferenceFacet',
                Target: '@UI.DataPoint#TotalDonated',
                Label: 'Total Donated'
            },
            {
                $Type: 'UI.ReferenceFacet',
                Target: '@UI.DataPoint#DonationCount',
                Label: 'Total Gifts'
            }
        ],
        
        // ═══════════════════════════════════════════════════════════════
        // DATA POINTS (KPI Cards in Header)
        // ═══════════════════════════════════════════════════════════════
        
        UI.DataPoint #TotalDonated: {
            Value: totalDonated,
            Title: 'Total Donated',
            ValueFormat: {
                NumberOfFractionalDigits: 2
            },
            CriticalityCalculation: {
                ImprovementDirection: #Maximize,
                ToleranceRangeLowValue: 5000,
                DeviationRangeLowValue: 1000
            }
        },
        
        UI.DataPoint #DonationCount: {
            Value: donationCount,
            Title: 'Number of Gifts',
            ValueFormat: {
                NumberOfFractionalDigits: 0
            }
        },
        
        UI.DataPoint #EngagementScore: {
            Value: engagementScore,
            Title: 'Engagement Score',
            ValueFormat: {
                NumberOfFractionalDigits: 0
            },
            Visualization: #Progress,
            TargetValue: 100,
            CriticalityCalculation: {
                ImprovementDirection: #Maximize,
                ToleranceRangeLowValue: 60,
                DeviationRangeLowValue: 30
            }
        },
        
        UI.DataPoint #Status: {
            Value: status,
            Title: 'Status',
            Criticality: statusCriticality
        },
        
        UI.DataPoint #IsHNI: {
            Value: isHNI,
            Title: 'VIP Status'
        },
        
        // ═══════════════════════════════════════════════════════════════
        // FIELD GROUPS (Header Content)
        // ═══════════════════════════════════════════════════════════════
        
        UI.FieldGroup #ContactInfo: {
            Data: [
                {
                    $Type: 'UI.DataField',
                    Label: 'Email',
                    Value: email
                },
                {
                    $Type: 'UI.DataField',
                    Label: 'Phone',
                    Value: phone
                },
                {
                    $Type: 'UI.DataField',
                    Label: 'City',
                    Value: city
                }
            ]
        },
        
        UI.FieldGroup #DonorStatus: {
            Data: [
                {
                    $Type: 'UI.DataFieldForAnnotation',
                    Label: 'Status',
                    Target: '@UI.DataPoint#Status'
                },
                {
                    $Type: 'UI.DataField',
                    Label: 'Donor Type',
                    Value: donorType.name
                },
                {
                    $Type: 'UI.DataFieldForAnnotation',
                    Label: 'VIP',
                    Target: '@UI.DataPoint#IsHNI'
                },
                {
                    $Type: 'UI.DataField',
                    Label: 'Recurring',
                    Value: isRecurringDonor
                }
            ]
        },
        
        // ═══════════════════════════════════════════════════════════════
        // MAIN SECTIONS (Object Page Content)
        // ═══════════════════════════════════════════════════════════════
        
        UI.Facets: [
            // Section 1: AI Summary
            {
                $Type: 'UI.CollectionFacet',
                Label: '🤖 AI Intelligence',
                ID: 'AISummary',
                Facets: [
                    {
                        $Type: 'UI.ReferenceFacet',
                        Label: 'AI-Generated Donor Profile',
                        Target: '@UI.FieldGroup#AISummary'
                    }
                ]
            },
            
            // Section 2: Analytics Dashboard
            {
                $Type: 'UI.CollectionFacet',
                Label: '📊 Analytics',
                ID: 'Analytics',
                Facets: [
                    {
                        $Type: 'UI.ReferenceFacet',
                        Label: 'Key Metrics',
                        Target: '@UI.FieldGroup#KeyMetrics'
                    },
                    {
                        $Type: 'UI.ReferenceFacet',
                        Label: 'Engagement & Risk',
                        Target: '@UI.FieldGroup#Engagement'
                    },
                    {
                        $Type: 'UI.ReferenceFacet',
                        Label: 'Donation Patterns',
                        Target: '@UI.FieldGroup#Patterns'
                    }
                ]
            },
            
            // Section 3: Personal Information
            {
                $Type: 'UI.CollectionFacet',
                Label: '👤 Personal Information',
                ID: 'PersonalInfo',
                Facets: [
                    {
                        $Type: 'UI.ReferenceFacet',
                        Label: 'Basic Details',
                        Target: '@UI.FieldGroup#BasicDetails'
                    },
                    {
                        $Type: 'UI.ReferenceFacet',
                        Label: 'Contact Information',
                        Target: '@UI.FieldGroup#ContactDetails'
                    },
                    {
                        $Type: 'UI.ReferenceFacet',
                        Label: 'Address',
                        Target: '@UI.FieldGroup#AddressDetails'
                    }
                ]
            },
            
            // Section 4: Donation History
            {
                $Type: 'UI.ReferenceFacet',
                Label: '💰 Donation History',
                ID: 'DonationHistory',
                Target: 'donations/@UI.LineItem'
            },
            
            // Section 5: Actions & Engagement
            {
                $Type: 'UI.CollectionFacet',
                Label: '🎯 Engagement',
                ID: 'Actions',
                Facets: [
                    {
                        $Type: 'UI.ReferenceFacet',
                        Label: 'Quick Actions',
                        Target: '@UI.FieldGroup#QuickActions'
                    }
                ]
            }
        ],
        
        // ═══════════════════════════════════════════════════════════════
        // FIELD GROUP DEFINITIONS
        // ═══════════════════════════════════════════════════════════════
        
        UI.FieldGroup #AISummary: {
            Data: [
                {
                    $Type: 'UI.DataField',
                    Value: summary,
                    Label: 'AI Analysis'
                }
            ]
        },
        
        UI.FieldGroup #KeyMetrics: {
            Data: [
                {
                    $Type: 'UI.DataField',
                    Label: 'Total Donated',
                    Value: totalDonated
                },
                {
                    $Type: 'UI.DataField',
                    Label: 'Number of Donations',
                    Value: donationCount
                },
                {
                    $Type: 'UI.DataField',
                    Label: 'Average Donation',
                    Value: averageDonation
                },
                {
                    $Type: 'UI.DataField',
                    Label: 'Largest Donation',
                    Value: largestDonation
                },
                {
                    $Type: 'UI.DataField',
                    Label: 'Smallest Donation',
                    Value: smallestDonation
                },
                {
                    $Type: 'UI.DataField',
                    Label: 'Monthly Average',
                    Value: monthlyAverage
                }
            ]
        },
        
        UI.FieldGroup #Engagement: {
            Data: [
                {
                    $Type: 'UI.DataFieldForAnnotation',
                    Label: 'Engagement Score',
                    Target: '@UI.DataPoint#EngagementScore'
                },
                {
                    $Type: 'UI.DataField',
                    Label: 'Donor Tier',
                    Value: donorTier
                },
                {
                    $Type: 'UI.DataField',
                    Label: 'Risk Level',
                    Value: riskLevel
                },
                {
                    $Type: 'UI.DataField',
                    Label: 'Days Since Last Donation',
                    Value: daysSinceLastDonation
                }
            ]
        },
        
        UI.FieldGroup #Patterns: {
            Data: [
                {
                    $Type: 'UI.DataField',
                    Label: 'Top Cause',
                    Value: topCause
                },
                {
                    $Type: 'UI.DataField',
                    Label: 'First Donation',
                    Value: firstDonationDate
                },
                {
                    $Type: 'UI.DataField',
                    Label: 'Last Donation',
                    Value: lastDonationDate
                },
                {
                    $Type: 'UI.DataField',
                    Label: 'YoY Growth',
                    Value: yearOverYearGrowth
                }
            ]
        },
        
        UI.FieldGroup #BasicDetails: {
            Data: [
                {
                    $Type: 'UI.DataField',
                    Label: 'Full Name',
                    Value: name
                },
                {
                    $Type: 'UI.DataField',
                    Label: 'Donor ID',
                    Value: donorID
                },
                {
                    $Type: 'UI.DataField',
                    Label: 'Donor Type',
                    Value: donorType.name
                },
                {
                    $Type: 'UI.DataField',
                    Label: 'Created On',
                    Value: createdAt
                }
            ]
        },
        
        UI.FieldGroup #ContactDetails: {
            Data: [
                {
                    $Type: 'UI.DataField',
                    Label: 'Email',
                    Value: email
                },
                {
                    $Type: 'UI.DataField',
                    Label: 'Phone',
                    Value: phone
                }
            ]
        },
        
        UI.FieldGroup #AddressDetails: {
            Data: [
                {
                    $Type: 'UI.DataField',
                    Label: 'Street Address',
                    Value: address
                },
                {
                    $Type: 'UI.DataField',
                    Label: 'City',
                    Value: city
                },
                {
                    $Type: 'UI.DataField',
                    Label: 'State',
                    Value: state
                },
                {
                    $Type: 'UI.DataField',
                    Label: 'ZIP Code',
                    Value: zip
                }
            ]
        },
        
        UI.FieldGroup #QuickActions: {
            Data: [
                {
                    $Type: 'UI.DataFieldForAction',
                    Action: 'donor_management_BitaSrv.Action1',
                    Label: '🤖 Generate AI Summary',
                    Inline: false
                },
                {
                    $Type: 'UI.DataFieldForAction',
                    Action: 'donor_management_BitaSrv.SendThankYou',
                    Label: '💌 Send Thank You',
                    Inline: false
                },
                {
                    $Type: 'UI.DataFieldForAction',
                    Action: 'donor_management_BitaSrv.GenerateImpactReport',
                    Label: '📊 Generate Impact Report',
                    Inline: false
                },
                {
                    $Type: 'UI.DataFieldForAction',
                    Action: 'donor_management_BitaSrv.InviteToEvent',
                    Label: '🎫 Invite to Event',
                    Inline: false
                }
            ]
        }
    );
    
    // ═══════════════════════════════════════════════════════════════
    // DONATIONS LINE ITEM (Table in Object Page)
    // ═══════════════════════════════════════════════════════════════
    
    annotate Donations with @(
        UI.LineItem: [
            {
                $Type: 'UI.DataField',
                Label: 'Date',
                Value: donation_date
            },
            {
                $Type: 'UI.DataField',
                Label: 'Amount',
                Value: amount
            },
            {
                $Type: 'UI.DataField',
                Label: 'Campaign',
                Value: campaign
            },
            {
                $Type: 'UI.DataField',
                Label: 'Cause',
                Value: cause
            },
            {
                $Type: 'UI.DataField',
                Label: 'Payment Method',
                Value: payment_method
            },
            {
                $Type: 'UI.DataField',
                Label: 'Currency',
                Value: currency_code
            }
        ]
    );
}