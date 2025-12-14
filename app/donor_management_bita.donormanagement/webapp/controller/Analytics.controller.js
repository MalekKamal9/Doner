sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("donormanagementbita.donormanagement.controller.Analytics", {
        
        _charts: {},
        _chartJsLoaded: false,

        onInit: function () {
            // Initialize analytics model
            var oAnalyticsModel = new JSONModel({
                totalDonations: "Loading...",
                totalDonors: "Loading...",
                avgDonation: "Loading...",
                yoyGrowth: "Loading...",
                lastUpdated: new Date().toLocaleString()
            });
            this.getView().setModel(oAnalyticsModel, "analytics");

            // Load Chart.js library
            this._loadChartJS();
        },

        _loadChartJS: function () {
            var that = this;
            
            if (window.Chart) {
                that._chartJsLoaded = true;
                return;
            }

            // Load Chart.js from CDN
            var script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
            script.onload = function () {
                that._chartJsLoaded = true;
                console.log("✅ Chart.js loaded successfully");
                that._initializeCharts();
            };
            script.onerror = function () {
                MessageBox.error("Failed to load Chart.js library");
            };
            document.head.appendChild(script);
        },

        onChartsContainerReady: function () {
            // Inject the charts HTML structure
            var container = document.getElementById('analyticsChartsWrapper');
            if (container) {
                container.innerHTML = this._getChartsHTML();
                this._injectStyles();
                
                if (this._chartJsLoaded) {
                    this._initializeCharts();
                }
            }
        },

        _getChartsHTML: function () {
            return '<div class="analytics-dashboard">' +
                '<!-- Row 1: Trend + By Campaign -->' +
                '<div class="chart-row">' +
                    '<div class="chart-card chart-large">' +
                        '<div class="chart-header">' +
                            '<h3>Donation Trends</h3>' +
                            '<span class="chart-subtitle">Monthly donation amounts over time</span>' +
                        '</div>' +
                        '<div class="chart-body">' +
                            '<canvas id="trendChart"></canvas>' +
                        '</div>' +
                    '</div>' +
                    '<div class="chart-card chart-medium">' +
                        '<div class="chart-header">' +
                            '<h3>Top Campaigns</h3>' +
                            '<span class="chart-subtitle">Donations by campaign</span>' +
                        '</div>' +
                        '<div class="chart-body">' +
                            '<canvas id="campaignChart"></canvas>' +
                        '</div>' +
                    '</div>' +
                '</div>' +

                '<!-- Row 2: By Cause + Donor Segments + Monthly -->' +
                '<div class="chart-row">' +
                    '<div class="chart-card chart-small">' +
                        '<div class="chart-header">' +
                            '<h3>By Cause</h3>' +
                            '<span class="chart-subtitle">Distribution</span>' +
                        '</div>' +
                        '<div class="chart-body">' +
                            '<canvas id="causeChart"></canvas>' +
                        '</div>' +
                    '</div>' +
                    '<div class="chart-card chart-small">' +
                        '<div class="chart-header">' +
                            '<h3>Donor Segments</h3>' +
                            '<span class="chart-subtitle">Engagement levels</span>' +
                        '</div>' +
                        '<div class="chart-body">' +
                            '<canvas id="segmentChart"></canvas>' +
                        '</div>' +
                    '</div>' +
                    '<div class="chart-card chart-medium">' +
                        '<div class="chart-header">' +
                            '<h3>Year Comparison</h3>' +
                            '<span class="chart-subtitle">This year vs last year</span>' +
                        '</div>' +
                        '<div class="chart-body">' +
                            '<canvas id="comparisonChart"></canvas>' +
                        '</div>' +
                    '</div>' +
                '</div>' +

                '<!-- Row 3: Donor Retention + Donation Size Distribution -->' +
                '<div class="chart-row">' +
                    '<div class="chart-card chart-medium">' +
                        '<div class="chart-header">' +
                            '<h3>Donor Retention</h3>' +
                            '<span class="chart-subtitle">New vs returning donors</span>' +
                        '</div>' +
                        '<div class="chart-body">' +
                            '<canvas id="retentionChart"></canvas>' +
                        '</div>' +
                    '</div>' +
                    '<div class="chart-card chart-large">' +
                        '<div class="chart-header">' +
                            '<h3>Donation Size Distribution</h3>' +
                            '<span class="chart-subtitle">Amount ranges breakdown</span>' +
                        '</div>' +
                        '<div class="chart-body">' +
                            '<canvas id="distributionChart"></canvas>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
        },

        _injectStyles: function () {
            if (document.getElementById('analytics-chart-styles')) return;

            var styles = document.createElement('style');
            styles.id = 'analytics-chart-styles';
            styles.textContent = 
                '.analytics-dashboard { padding: 1rem; background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%); min-height: 100vh; }' +
                '.chart-row { display: flex; gap: 1.25rem; margin-bottom: 1.25rem; flex-wrap: wrap; }' +
                '.chart-card { background: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04); overflow: hidden; transition: transform 0.3s ease, box-shadow 0.3s ease; display: flex; flex-direction: column; }' +
                '.chart-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06); }' +
                '.chart-small { flex: 1; min-width: 280px; max-width: 320px; }' +
                '.chart-medium { flex: 2; min-width: 380px; }' +
                '.chart-large { flex: 3; min-width: 500px; }' +
                '.chart-header { padding: 1.25rem 1.5rem 0.75rem; border-bottom: 1px solid #f0f2f5; background: linear-gradient(180deg, #fafbfc 0%, #ffffff 100%); }' +
                '.chart-header h3 { margin: 0; font-size: 1.1rem; font-weight: 600; color: #1a2332; letter-spacing: -0.02em; }' +
                '.chart-subtitle { display: block; font-size: 0.8rem; color: #6b7785; margin-top: 0.25rem; }' +
                '.chart-body { padding: 1.25rem; flex: 1; display: flex; align-items: center; justify-content: center; min-height: 280px; }' +
                '.chart-body canvas { max-width: 100%; max-height: 100%; }' +
                '.kpiContainer { gap: 1rem; padding: 0 1rem; }' +
                '.kpiCard { background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); border-radius: 12px; padding: 1.25rem 1.5rem; min-width: 200px; flex: 1; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04); border: 1px solid #e8ecf1; transition: all 0.2s ease; }' +
                '.kpiCard:hover { border-color: #0a6ed1; box-shadow: 0 4px 20px rgba(10, 110, 209, 0.1); }' +
                '.analyticsPage { background: #f5f7fa !important; }' +
                '@media (max-width: 1200px) { .chart-large, .chart-medium { flex: 1 1 100%; max-width: 100%; } }' +
                '@media (max-width: 768px) { .chart-small, .chart-medium, .chart-large { flex: 1 1 100%; min-width: 100%; max-width: 100%; } .chart-row { flex-direction: column; } }';
            document.head.appendChild(styles);
        },

        _initializeCharts: function () {
            var that = this;
            
            // Fetch data from backend
            this._fetchAnalyticsData().then(function (data) {
                that._createTrendChart(data.trends);
                that._createCampaignChart(data.campaigns);
                that._createCauseChart(data.causes);
                that._createSegmentChart(data.segments);
                that._createComparisonChart(data.comparison);
                that._createRetentionChart(data.retention);
                that._createDistributionChart(data.distribution);
                that._updateKPIs(data.kpis);
            }).catch(function (error) {
                console.error("Failed to fetch analytics data:", error);
                MessageToast.show("Using sample data for demonstration");
                that._initializeWithSampleData();
            });
        },

        _fetchAnalyticsData: function () {
            var that = this;
            return new Promise(function (resolve, reject) {
                // Use the service URL from manifest
                var serviceUrl = "/service/donor_management_Bita/";
                
                fetch(serviceUrl + "getAnalyticsData()")
                    .then(function (response) {
                        if (!response.ok) throw new Error("API not available");
                        return response.json();
                    })
                    .then(resolve)
                    .catch(function () {
                        // Fallback to sample data
                        reject(new Error("Using sample data"));
                    });
            });
        },

        _initializeWithSampleData: function () {
            // Sample data for demonstration
            var sampleData = {
                trends: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    datasets: [{
                        label: '2024',
                        data: [12500, 15800, 13200, 18500, 22100, 19800, 24500, 21300, 26800, 28500, 31200, 35000],
                        borderColor: '#0a6ed1',
                        backgroundColor: 'rgba(10, 110, 209, 0.1)',
                        fill: true,
                        tension: 0.4
                    }, {
                        label: '2023',
                        data: [10200, 12500, 11800, 14200, 16800, 15500, 18200, 17100, 20500, 22800, 25100, 28500],
                        borderColor: '#6b7785',
                        backgroundColor: 'rgba(107, 119, 133, 0.05)',
                        fill: true,
                        tension: 0.4,
                        borderDash: [5, 5]
                    }]
                },
                campaigns: {
                    labels: ['Education Fund', 'Medical Relief', 'Food Security', 'Shelter Program', 'Clean Water'],
                    data: [85000, 72000, 58000, 45000, 38000]
                },
                causes: {
                    labels: ['Healthcare', 'Education', 'Environment', 'Community', 'Veterans', 'Children'],
                    data: [28, 24, 18, 14, 10, 6]
                },
                segments: {
                    labels: ['Champions', 'Regular', 'Occasional', 'New', 'At Risk'],
                    data: [15, 35, 25, 18, 7]
                },
                comparison: {
                    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
                    thisYear: [41500, 60400, 72600, 94700],
                    lastYear: [34500, 46500, 55800, 76400]
                },
                retention: {
                    labels: ['Returning Donors', 'New Donors', 'Reactivated'],
                    data: [62, 28, 10]
                },
                distribution: {
                    labels: ['$1-50', '$51-100', '$101-250', '$251-500', '$501-1000', '$1000+'],
                    data: [245, 312, 189, 98, 56, 24]
                },
                kpis: {
                    totalDonations: '$269,200',
                    totalDonors: '924',
                    avgDonation: '$291',
                    yoyGrowth: '+22.8%'
                }
            };

            this._createTrendChart(sampleData.trends);
            this._createCampaignChart(sampleData.campaigns);
            this._createCauseChart(sampleData.causes);
            this._createSegmentChart(sampleData.segments);
            this._createComparisonChart(sampleData.comparison);
            this._createRetentionChart(sampleData.retention);
            this._createDistributionChart(sampleData.distribution);
            this._updateKPIs(sampleData.kpis);
        },

        _updateKPIs: function (kpis) {
            var oModel = this.getView().getModel("analytics");
            oModel.setProperty("/totalDonations", kpis.totalDonations);
            oModel.setProperty("/totalDonors", kpis.totalDonors);
            oModel.setProperty("/avgDonation", kpis.avgDonation);
            oModel.setProperty("/yoyGrowth", kpis.yoyGrowth);
            oModel.setProperty("/lastUpdated", new Date().toLocaleString());
        },

        // ==================== CHART CREATION METHODS ====================

        _createTrendChart: function (data) {
            var ctx = document.getElementById('trendChart');
            if (!ctx) return;

            if (this._charts.trend) this._charts.trend.destroy();

            this._charts.trend = new Chart(ctx, {
                type: 'line',
                data: data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 20,
                                font: { family: "'72', Arial, sans-serif", size: 12 }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(26, 35, 50, 0.95)',
                            titleFont: { size: 14, weight: '600' },
                            bodyFont: { size: 13 },
                            padding: 12,
                            cornerRadius: 8,
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': $' + context.parsed.y.toLocaleString();
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.05)' },
                            ticks: {
                                callback: function(value) {
                                    return '$' + (value / 1000) + 'k';
                                }
                            }
                        },
                        x: {
                            grid: { display: false }
                        }
                    }
                }
            });
        },

        _createCampaignChart: function (data) {
            var ctx = document.getElementById('campaignChart');
            if (!ctx) return;

            if (this._charts.campaign) this._charts.campaign.destroy();

            var colors = ['#0a6ed1', '#1a9a5b', '#e76500', '#bb0000', '#8b47d7'];

            this._charts.campaign = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.labels,
                    datasets: [{
                        data: data.data,
                        backgroundColor: colors,
                        borderRadius: 8,
                        borderSkipped: false
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(26, 35, 50, 0.95)',
                            callbacks: {
                                label: function(context) {
                                    return '$' + context.parsed.x.toLocaleString();
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: 'rgba(0,0,0,0.05)' },
                            ticks: {
                                callback: function(value) {
                                    return '$' + (value / 1000) + 'k';
                                }
                            }
                        },
                        y: {
                            grid: { display: false }
                        }
                    }
                }
            });
        },

        _createCauseChart: function (data) {
            var ctx = document.getElementById('causeChart');
            if (!ctx) return;

            if (this._charts.cause) this._charts.cause.destroy();

            var colors = [
                '#0a6ed1', '#1a9a5b', '#e76500', 
                '#bb0000', '#8b47d7', '#00a2e8'
            ];

            this._charts.cause = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: data.labels,
                    datasets: [{
                        data: data.data,
                        backgroundColor: colors,
                        borderWidth: 0,
                        hoverOffset: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                padding: 12,
                                font: { size: 11 }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(26, 35, 50, 0.95)',
                            callbacks: {
                                label: function(context) {
                                    return context.label + ': ' + context.parsed + '%';
                                }
                            }
                        }
                    }
                }
            });
        },

        _createSegmentChart: function (data) {
            var ctx = document.getElementById('segmentChart');
            if (!ctx) return;

            if (this._charts.segment) this._charts.segment.destroy();

            var colors = ['#1a9a5b', '#0a6ed1', '#e76500', '#00a2e8', '#bb0000'];

            this._charts.segment = new Chart(ctx, {
                type: 'polarArea',
                data: {
                    labels: data.labels,
                    datasets: [{
                        data: data.data,
                        backgroundColor: colors.map(function(c) { return c + 'cc'; }),
                        borderColor: colors,
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                padding: 10,
                                font: { size: 10 }
                            }
                        }
                    },
                    scales: {
                        r: {
                            display: false
                        }
                    }
                }
            });
        },

        _createComparisonChart: function (data) {
            var ctx = document.getElementById('comparisonChart');
            if (!ctx) return;

            if (this._charts.comparison) this._charts.comparison.destroy();

            this._charts.comparison = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: '2024',
                        data: data.thisYear,
                        backgroundColor: '#0a6ed1',
                        borderRadius: 6
                    }, {
                        label: '2023',
                        data: data.lastYear,
                        backgroundColor: '#c2d6eb',
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 20
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': $' + context.parsed.y.toLocaleString();
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.05)' },
                            ticks: {
                                callback: function(value) {
                                    return '$' + (value / 1000) + 'k';
                                }
                            }
                        },
                        x: {
                            grid: { display: false }
                        }
                    }
                }
            });
        },

        _createRetentionChart: function (data) {
            var ctx = document.getElementById('retentionChart');
            if (!ctx) return;

            if (this._charts.retention) this._charts.retention.destroy();

            this._charts.retention = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: data.labels,
                    datasets: [{
                        data: data.data,
                        backgroundColor: ['#0a6ed1', '#1a9a5b', '#e76500'],
                        borderWidth: 0,
                        hoverOffset: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                usePointStyle: true,
                                padding: 15
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.label + ': ' + context.parsed + '%';
                                }
                            }
                        }
                    }
                }
            });
        },

        _createDistributionChart: function (data) {
            var ctx = document.getElementById('distributionChart');
            if (!ctx) return;

            if (this._charts.distribution) this._charts.distribution.destroy();

            // Create gradient
            var gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(10, 110, 209, 0.8)');
            gradient.addColorStop(1, 'rgba(10, 110, 209, 0.2)');

            this._charts.distribution = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: 'Number of Donations',
                        data: data.data,
                        backgroundColor: gradient,
                        borderColor: '#0a6ed1',
                        borderWidth: 1,
                        borderRadius: 8,
                        borderSkipped: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(26, 35, 50, 0.95)',
                            callbacks: {
                                label: function(context) {
                                    return context.parsed.y + ' donations';
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.05)' },
                            title: {
                                display: true,
                                text: 'Number of Donations'
                            }
                        },
                        x: {
                            grid: { display: false },
                            title: {
                                display: true,
                                text: 'Donation Amount Range'
                            }
                        }
                    }
                }
            });
        },

        // ==================== EVENT HANDLERS ====================

        onNavBack: function () {
            var oHistory = sap.ui.core.routing.History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                // Navigate to the list page
                window.location.hash = "";
            }
        },

        onRefreshCharts: function () {
            var that = this;
            MessageToast.show("Refreshing charts...");
            
            // Destroy existing charts
            Object.keys(this._charts).forEach(function(key) {
                if (that._charts[key]) {
                    that._charts[key].destroy();
                }
            });
            this._charts = {};

            // Reinitialize
            this._initializeCharts();
        },

        onExportPDF: function () {
            MessageToast.show("PDF export feature - implement with jsPDF library");
        },

        onExit: function () {
            // Cleanup charts on controller destruction
            var that = this;
            Object.keys(this._charts).forEach(function(key) {
                if (that._charts[key]) {
                    that._charts[key].destroy();
                }
            });
        }
    });
});