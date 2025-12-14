sap.ui.define([
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/ui/core/HTML",
    "sap/m/MessageToast",
    "sap/m/BusyDialog"
], function (Dialog, Button, HTML, MessageToast, BusyDialog) {
    "use strict";

    var _oDialog = null;
    var _oBusyDialog = null;
    var _analyticsData = null;

    return {
        onOpenAnalytics: function (oEvent) {
            MessageToast.show("Loading Analytics Dashboard...");
            
            if (!_oBusyDialog) {
                _oBusyDialog = new BusyDialog({
                    title: "Loading",
                    text: "Fetching analytics data..."
                });
            }
            _oBusyDialog.open();
            
            fetchAnalyticsData().then(function(data) {
                _analyticsData = data;
                _oBusyDialog.close();
                openDashboard();
            }).catch(function(error) {
                console.error("Failed to fetch analytics:", error);
                _oBusyDialog.close();
                MessageToast.show("Using sample data");
                _analyticsData = getSampleData();
                openDashboard();
            });
        }
    };

    function fetchAnalyticsData() {
        return new Promise(function(resolve, reject) {
            var serviceUrl = "/service/donor_management_Bita/getAnalyticsData()";
            
            console.log("📊 Fetching from:", serviceUrl);
            
            fetch(serviceUrl, {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            })
            .then(function(response) {
                console.log("📊 Response status:", response.status);
                if (!response.ok) throw new Error("HTTP " + response.status);
                return response.json();
            })
            .then(function(data) {
                console.log("📊 Raw response:", data);
                
                var result = data;
                
                // Handle OData response - the value is returned in "value" property
                if (data && data.value !== undefined) {
                    result = data.value;
                    console.log("📊 Extracted from value:", result);
                }
                
                // If result is a string (JSON.stringify from backend), parse it
                if (typeof result === "string") {
                    try {
                        result = JSON.parse(result);
                        console.log("📊 Parsed JSON string:", result);
                    } catch (e) {
                        console.error("Failed to parse JSON string:", e);
                        reject(e);
                        return;
                    }
                }
                
                // Validate the result has expected structure
                if (!result || !result.kpis || !result.trends) {
                    console.error("📊 Invalid data structure:", result);
                    reject(new Error("Invalid data structure"));
                    return;
                }
                
                console.log("✅ Final analytics data:", result);
                console.log("📊 Trends currentYear:", result.trends.currentYear);
                console.log("📊 Quarterly currentYear:", result.quarterly.currentYear);
                resolve(result);
            })
            .catch(function(error) {
                console.error("Fetch error:", error);
                reject(error);
            });
        });
    }

    function getSampleData() {
        return {
            kpis: {
                totalDonations: "$269,200",
                totalDonors: "924",
                avgDonation: "$291",
                yoyGrowth: "+22.8%"
            },
            trends: {
                labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                currentYear: [12500, 15800, 13200, 18500, 22100, 19800, 24500, 21300, 26800, 28500, 31200, 35000],
                previousYear: [10200, 12500, 11800, 14200, 16800, 15500, 18200, 17100, 20500, 22800, 25100, 28500]
            },
            campaigns: {
                labels: ["Education", "Medical", "Food", "Shelter", "Water"],
                data: [85000, 72000, 58000, 45000, 38000]
            },
            causes: {
                labels: ["Healthcare", "Education", "Environment", "Community", "Veterans"],
                data: [28, 24, 18, 16, 14]
            },
            segments: {
                labels: ["Champions", "Regular", "Occasional", "New", "At Risk"],
                data: [15, 35, 25, 18, 7]
            },
            quarterly: {
                labels: ["Q1", "Q2", "Q3", "Q4"],
                currentYear: [41500, 60400, 72600, 94700],
                previousYear: [34500, 46500, 55800, 76400]
            }
        };
    }

    function openDashboard() {
        if (!_oDialog) {
            _oDialog = new Dialog({
                title: "Donor Analytics Dashboard",
                contentWidth: "95%",
                contentHeight: "90%",
                resizable: true,
                draggable: true,
                verticalScrolling: true,
                content: [
                    new HTML({
                        content: "<div id='analyticsMainContainer' style='width:100%;min-height:700px;padding:20px;background:#f5f7fa;'><p style='text-align:center;padding:40px;'>Loading charts...</p></div>"
                    })
                ],
                buttons: [
                    new Button({
                        text: "Refresh Data",
                        type: "Emphasized",
                        press: function () {
                            MessageToast.show("Refreshing...");
                            fetchAnalyticsData().then(function(data) {
                                _analyticsData = data;
                                loadDashboard();
                                MessageToast.show("Data refreshed!");
                            }).catch(function() {
                                MessageToast.show("Refresh failed");
                            });
                        }
                    }),
                    new Button({
                        text: "Close",
                        press: function () {
                            _oDialog.close();
                        }
                    })
                ],
                afterOpen: function () {
                    loadChartJS();
                }
            });
        }

        _oDialog.open();
    }

    function loadChartJS() {
        if (window.Chart) {
            loadDashboard();
            return;
        }

        var script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js";
        script.onload = function () {
            console.log("✅ Chart.js loaded");
            loadDashboard();
        };
        script.onerror = function () {
            document.getElementById("analyticsMainContainer").innerHTML = "<p style='color:red;text-align:center;padding:20px;'>Failed to load Chart.js</p>";
        };
        document.head.appendChild(script);
    }

    function loadDashboard() {
        var container = document.getElementById("analyticsMainContainer");
        if (!container || !_analyticsData) {
            console.error("Container or data missing");
            return;
        }

        var data = _analyticsData;
        
        // Validate data structure
        if (!data.kpis || !data.trends || !data.quarterly) {
            console.error("Invalid data structure:", data);
            data = getSampleData();
        }

        console.log("📊 Building dashboard with data:", data);

        // Inject styles
        if (!document.getElementById("ad-styles")) {
            var style = document.createElement("style");
            style.id = "ad-styles";
            style.textContent = 
                ".ad-row{display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap}" +
                ".ad-card{flex:1;min-width:280px;background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08);overflow:hidden}" +
                ".ad-card.wide{flex:2;min-width:400px}" +
                ".ad-card.small{max-width:300px}" +
                ".ad-header{padding:14px 18px;font-weight:600;font-size:14px;border-bottom:1px solid #eee;background:linear-gradient(180deg,#fafbfc,#fff)}" +
                ".ad-body{padding:16px;height:260px;position:relative}" +
                ".ad-kpi{text-align:center;padding:24px 16px}" +
                ".ad-kpi-val{font-size:32px;font-weight:700;color:#0a6ed1}" +
                ".ad-kpi-lbl{font-size:12px;color:#666;margin-top:6px;text-transform:uppercase;letter-spacing:0.5px}" +
                ".ad-kpi.success .ad-kpi-val{color:#1a9a5b}" +
                ".ad-kpi.warning .ad-kpi-val{color:#e76500}" +
                ".ad-kpi.purple .ad-kpi-val{color:#8b47d7}" +
                ".ad-debug{font-size:10px;color:#999;position:absolute;bottom:2px;right:5px}" +
                "@media(max-width:900px){.ad-card,.ad-card.wide,.ad-card.small{flex:1 1 100%;max-width:100%;min-width:100%}}";
            document.head.appendChild(style);
        }

        // Check if we have real data or zeros
        var hasTrendData = data.trends.currentYear && data.trends.currentYear.some(function(v) { return v > 0; });
        var hasQuarterlyData = data.quarterly.currentYear && data.quarterly.currentYear.some(function(v) { return v > 0; });
        
        console.log("📊 Has trend data:", hasTrendData, data.trends.currentYear);
        console.log("📊 Has quarterly data:", hasQuarterlyData, data.quarterly.currentYear);

        var currentYear = new Date().getFullYear();
        var previousYear = currentYear - 1;

        // Build HTML with real data
        container.innerHTML = 
            '<div class="ad-row">' +
                '<div class="ad-card"><div class="ad-kpi"><div class="ad-kpi-val">' + data.kpis.totalDonations + '</div><div class="ad-kpi-lbl">Total Donations</div></div></div>' +
                '<div class="ad-card"><div class="ad-kpi"><div class="ad-kpi-val">' + data.kpis.totalDonors + '</div><div class="ad-kpi-lbl">Active Donors</div></div></div>' +
                '<div class="ad-card"><div class="ad-kpi warning"><div class="ad-kpi-val">' + data.kpis.avgDonation + '</div><div class="ad-kpi-lbl">Avg Donation</div></div></div>' +
                '<div class="ad-card"><div class="ad-kpi success"><div class="ad-kpi-val">' + data.kpis.yoyGrowth + '</div><div class="ad-kpi-lbl">YoY Growth</div></div></div>' +
            '</div>' +
            '<div class="ad-row">' +
                '<div class="ad-card wide"><div class="ad-header">📈 Donation Trends (Monthly) - ' + currentYear + ' vs ' + previousYear + '</div><div class="ad-body"><canvas id="chart1"></canvas></div></div>' +
                '<div class="ad-card"><div class="ad-header">🏆 Top Campaigns</div><div class="ad-body"><canvas id="chart2"></canvas></div></div>' +
            '</div>' +
            '<div class="ad-row">' +
                '<div class="ad-card small"><div class="ad-header">🎯 By Cause</div><div class="ad-body"><canvas id="chart3"></canvas></div></div>' +
                '<div class="ad-card small"><div class="ad-header">👥 Donor Segments</div><div class="ad-body"><canvas id="chart4"></canvas></div></div>' +
                '<div class="ad-card"><div class="ad-header">📊 Quarterly Comparison - ' + currentYear + ' vs ' + previousYear + '</div><div class="ad-body"><canvas id="chart5"></canvas></div></div>' +
            '</div>';

        setTimeout(function() {
            createCharts(data);
        }, 150);
    }

    function createCharts(data) {
        var currentYear = new Date().getFullYear();
        var previousYear = currentYear - 1;

        console.log("📊 Creating charts for years:", currentYear, previousYear);
        console.log("📊 Trends data:", data.trends);
        console.log("📊 Quarterly data:", data.quarterly);

        // Destroy existing charts
        if (window._adCharts) {
            window._adCharts.forEach(function(c) { if (c) c.destroy(); });
        }
        window._adCharts = [];

        // Chart 1 - Monthly Trends (Line)
        var c1 = document.getElementById("chart1");
        if (c1 && window.Chart) {
            var chart1 = new Chart(c1, {
                type: "line",
                data: {
                    labels: data.trends.labels || ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                    datasets: [{
                        label: String(currentYear),
                        data: data.trends.currentYear || [0,0,0,0,0,0,0,0,0,0,0,0],
                        borderColor: "#0a6ed1",
                        backgroundColor: "rgba(10,110,209,0.1)",
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3
                    }, {
                        label: String(previousYear),
                        data: data.trends.previousYear || [0,0,0,0,0,0,0,0,0,0,0,0],
                        borderColor: "#999",
                        borderDash: [5, 5],
                        tension: 0.4,
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: "top" },
                        tooltip: {
                            callbacks: {
                                label: function(ctx) {
                                    return ctx.dataset.label + ": $" + (ctx.parsed.y || 0).toLocaleString();
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(v) { return "$" + (v/1000).toFixed(0) + "k"; }
                            }
                        }
                    }
                }
            });
            window._adCharts.push(chart1);
        }

        // Chart 2 - Top Campaigns (Horizontal Bar)
        var c2 = document.getElementById("chart2");
        if (c2 && window.Chart) {
            var chart2 = new Chart(c2, {
                type: "bar",
                data: {
                    labels: data.campaigns.labels || ["No Data"],
                    datasets: [{
                        data: data.campaigns.data || [0],
                        backgroundColor: ["#0a6ed1", "#1a9a5b", "#e76500", "#bb0000", "#8b47d7"],
                        borderRadius: 6
                    }]
                },
                options: {
                    indexAxis: "y",
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(ctx) {
                                    return "$" + (ctx.parsed.x || 0).toLocaleString();
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                callback: function(v) { return "$" + (v/1000).toFixed(0) + "k"; }
                            }
                        }
                    }
                }
            });
            window._adCharts.push(chart2);
        }

        // Chart 3 - By Cause (Doughnut)
        var c3 = document.getElementById("chart3");
        if (c3 && window.Chart) {
            var chart3 = new Chart(c3, {
                type: "doughnut",
                data: {
                    labels: data.causes.labels || ["No Data"],
                    datasets: [{
                        data: data.causes.data || [100],
                        backgroundColor: ["#0a6ed1", "#1a9a5b", "#e76500", "#bb0000", "#8b47d7"]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "60%",
                    plugins: {
                        legend: {
                            position: "bottom",
                            labels: { font: { size: 10 }, padding: 8 }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(ctx) {
                                    return ctx.label + ": " + ctx.parsed + "%";
                                }
                            }
                        }
                    }
                }
            });
            window._adCharts.push(chart3);
        }

        // Chart 4 - Donor Segments (Polar Area)
        var c4 = document.getElementById("chart4");
        if (c4 && window.Chart) {
            var chart4 = new Chart(c4, {
                type: "polarArea",
                data: {
                    labels: data.segments.labels || ["No Data"],
                    datasets: [{
                        data: data.segments.data || [100],
                        backgroundColor: ["#1a9a5b99", "#0a6ed199", "#e7650099", "#00a2e899", "#bb000099"]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: "bottom",
                            labels: { font: { size: 10 }, padding: 8 }
                        }
                    },
                    scales: {
                        r: { display: false }
                    }
                }
            });
            window._adCharts.push(chart4);
        }

        // Chart 5 - Quarterly Comparison (Grouped Bar)
        var c5 = document.getElementById("chart5");
        if (c5 && window.Chart) {
            var chart5 = new Chart(c5, {
                type: "bar",
                data: {
                    labels: data.quarterly.labels || ["Q1", "Q2", "Q3", "Q4"],
                    datasets: [{
                        label: String(currentYear),
                        data: data.quarterly.currentYear || [0, 0, 0, 0],
                        backgroundColor: "#0a6ed1",
                        borderRadius: 4
                    }, {
                        label: String(previousYear),
                        data: data.quarterly.previousYear || [0, 0, 0, 0],
                        backgroundColor: "#c2d6eb",
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: "top" },
                        tooltip: {
                            callbacks: {
                                label: function(ctx) {
                                    return ctx.dataset.label + ": $" + (ctx.parsed.y || 0).toLocaleString();
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(v) { return "$" + (v/1000).toFixed(0) + "k"; }
                            }
                        }
                    }
                }
            });
            window._adCharts.push(chart5);
        }

        console.log("✅ All charts created");
    }
});