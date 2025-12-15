sap.ui.define([
    "sap/ui/core/mvc/ControllerExtension",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function(
    ControllerExtension,
    MessageToast,
    MessageBox
) {
    "use strict";

    return ControllerExtension.extend("donormanagementbita.donormanagement.ext.controller.ObjectPageExt", {
        
        _chartsInitialized: false,
        
        override: {
            onInit: function() {
                console.log("✅ [INIT] Object Page Extension Initialized");
            },
            
            onAfterRendering: function() {
                console.log("✅ [RENDER] Object Page Rendered");
                this._setupTabChangeListener();
            },
            
            routing: {
                onAfterBinding: function(oBindingContext) {
                    console.log("✅ [BINDING] Context bound:", oBindingContext);
                    this._chartsInitialized = false;
                    
                    var that = this;
                    setTimeout(function() {
                        that._tryInitializeCharts();
                    }, 1500);
                }
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // TAB CHANGE LISTENER
        // ═══════════════════════════════════════════════════════════════
        
        _setupTabChangeListener: function() {
            var that = this;
            var oView = this.base.getView();
            var oObjectPage = oView.byId("fe::ObjectPage");
            
            if (oObjectPage) {
                console.log("📌 [TAB] Found ObjectPage, attaching section change listener");
                oObjectPage.attachSectionChange(function(oEvent) {
                    var oSection = oEvent.getParameter("section");
                    console.log("📌 [TAB] Section changed:", oSection ? oSection.getId() : "unknown");
                    
                    setTimeout(function() {
                        that._tryInitializeCharts();
                    }, 800);
                });
            }
            
            this._setupMutationObserver();
        },
        
        _setupMutationObserver: function() {
            var that = this;
            
            var observer = new MutationObserver(function(mutations) {
                if (that._chartsInitialized) return;
                
                var containers = that._findChartContainers();
                if (containers.breakdown && containers.timeline) {
                    console.log("🎯 [OBSERVER] Chart containers detected!");
                    observer.disconnect();
                    that._tryInitializeCharts();
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            this._mutationObserver = observer;
            console.log("👁️ [OBSERVER] MutationObserver active");
        },

        // ═══════════════════════════════════════════════════════════════
        // PUBLIC METHOD - Button press handler
        // ═══════════════════════════════════════════════════════════════
        
        onRefreshCharts: function() {
            console.log("🔄 [MANUAL] Manual refresh triggered");
            this._chartsInitialized = false;
            MessageToast.show("Refreshing charts...");
            this._tryInitializeCharts();
        },

        // ═══════════════════════════════════════════════════════════════
        // FIND CHART CONTAINERS - Using NEW unique IDs
        // ═══════════════════════════════════════════════════════════════
        
        _findChartContainers: function() {
            var result = { breakdown: null, timeline: null };
            
            // NEW IDs: analyticsBreakdownChart and analyticsTimelineChart
            var breakdownIds = ["analyticsBreakdownChart", "donationBreakdownChart"];
            var timelineIds = ["analyticsTimelineChart", "donationTimelineChart"];
            
            // Strategy 1: DOM query with ID contains
            for (var i = 0; i < breakdownIds.length && !result.breakdown; i++) {
                var el = document.querySelector('[id*="' + breakdownIds[i] + '"]');
                if (el) {
                    console.log("✅ [FIND] Found breakdown via:", breakdownIds[i]);
                    result.breakdown = { isDOMElement: true, element: el };
                }
            }
            
            for (var j = 0; j < timelineIds.length && !result.timeline; j++) {
                var el2 = document.querySelector('[id*="' + timelineIds[j] + '"]');
                if (el2) {
                    console.log("✅ [FIND] Found timeline via:", timelineIds[j]);
                    result.timeline = { isDOMElement: true, element: el2 };
                }
            }
            
            // Strategy 2: Try UI5 Core byId
            if (!result.breakdown || !result.timeline) {
                for (var k = 0; k < breakdownIds.length && !result.breakdown; k++) {
                    var ctrl = sap.ui.getCore().byId(breakdownIds[k]);
                    if (ctrl) {
                        console.log("✅ [FIND] Found breakdown control via Core.byId:", breakdownIds[k]);
                        result.breakdown = ctrl;
                    }
                }
                
                for (var l = 0; l < timelineIds.length && !result.timeline; l++) {
                    var ctrl2 = sap.ui.getCore().byId(timelineIds[l]);
                    if (ctrl2) {
                        console.log("✅ [FIND] Found timeline control via Core.byId:", timelineIds[l]);
                        result.timeline = ctrl2;
                    }
                }
            }
            
            // Strategy 3: Find by class
            if (!result.breakdown || !result.timeline) {
                var chartCanvases = document.querySelectorAll('.chartCanvas');
                console.log("📊 [FIND] Found", chartCanvases.length, "chartCanvas elements");
                
                if (chartCanvases.length >= 2) {
                    if (!result.breakdown) {
                        result.breakdown = { isDOMElement: true, element: chartCanvases[0] };
                    }
                    if (!result.timeline) {
                        result.timeline = { isDOMElement: true, element: chartCanvases[1] };
                    }
                }
            }
            
            console.log("📋 [FIND] Results - Breakdown:", !!result.breakdown, ", Timeline:", !!result.timeline);
            return result;
        },

        // ═══════════════════════════════════════════════════════════════
        // SET CHART CONTENT
        // ═══════════════════════════════════════════════════════════════
        
        _setChartContent: function(container, htmlContent) {
            if (!container) return false;
            
            if (container.isDOMElement && container.element) {
                container.element.innerHTML = htmlContent;
                return true;
            }
            
            if (container.setContent) {
                container.setContent(htmlContent);
                return true;
            }
            
            if (container.getDomRef) {
                var domRef = container.getDomRef();
                if (domRef) {
                    domRef.innerHTML = htmlContent;
                    return true;
                }
            }
            
            return false;
        },

        // ═══════════════════════════════════════════════════════════════
        // CHART INITIALIZATION
        // ═══════════════════════════════════════════════════════════════

        _tryInitializeCharts: function() {
            if (this._chartsInitialized) {
                console.log("ℹ️ [INIT] Charts already initialized");
                return;
            }
            
            console.log("🔍 [CHECK] Attempting to initialize charts...");
            
            var containers = this._findChartContainers();
            
            if (!containers.breakdown || !containers.timeline) {
                console.log("⏳ [CHECK] Chart containers not ready yet");
                return;
            }
            
            this._breakdownContainer = containers.breakdown;
            this._timelineContainer = containers.timeline;
            
            var oView = this.base.getView();
            var oContext = oView.getBindingContext();
            
            if (!oContext) {
                console.warn("⚠️ [CHECK] No binding context");
                MessageToast.show("Waiting for donor data...");
                return;
            }

            var sDonorID = oContext.getProperty("donorID");
            console.log("✅ [CHECK] All ready! Donor ID:", sDonorID);
            
            this._chartsInitialized = true;
            this._fetchDonorDonations(sDonorID);
        },

        _fetchDonorDonations: function(sDonorID) {
            console.log("📡 [FETCH] Fetching donations for:", sDonorID);
            
            var oModel = this.base.getView().getModel();
            var that = this;
            
            // OData V4 approach
            var oListBinding = oModel.bindList("/Donations", undefined, undefined, [
                new sap.ui.model.Filter("donorID", sap.ui.model.FilterOperator.EQ, sDonorID)
            ], {
                $orderby: "donation_date desc"
            });
            
            oListBinding.requestContexts(0, 1000).then(function(aContexts) {
                console.log("✅ [FETCH] Got", aContexts.length, "donations");
                
                if (aContexts && aContexts.length > 0) {
                    var aDonations = aContexts.map(function(oCtx) {
                        return oCtx.getObject();
                    });
                    that._processDonationData(aDonations);
                } else {
                    that._renderNoDataMessage();
                }
            }).catch(function(oError) {
                console.error("❌ [FETCH] Error:", oError);
                MessageBox.error("Failed to fetch donations");
                that._renderNoDataMessage();
            });
        },

        _processDonationData: function(aDonations) {
            console.log("🔄 [PROCESS] Processing", aDonations.length, "donations");
            
            var causeTotals = {};
            var monthlyTotals = {};
            
            aDonations.forEach(function(donation) {
                var cause = donation.cause || "Other";
                causeTotals[cause] = (causeTotals[cause] || 0) + parseFloat(donation.amount || 0);
                
                if (donation.donation_date) {
                    var date = new Date(donation.donation_date);
                    var monthKey = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, '0');
                    monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + parseFloat(donation.amount || 0);
                }
            });

            this._renderDonationByCauseChart(causeTotals);
            this._renderMonthlyTrendChart(monthlyTotals);
            
            MessageToast.show("✅ Charts rendered!");
        },

        _renderDonationByCauseChart: function(causeTotals) {
            console.log("🎨 [RENDER] Rendering breakdown chart");
            
            var sortedCauses = Object.entries(causeTotals)
                .sort(function(a, b) { return b[1] - a[1]; })
                .slice(0, 6);

            if (sortedCauses.length === 0) {
                this._setChartContent(this._breakdownContainer, 
                    '<div style="padding: 40px; text-align: center; color: #999;">No data available</div>');
                return;
            }

            var maxAmount = Math.max.apply(null, sortedCauses.map(function(item) { return item[1]; }));
            var colors = ['#0854A0', '#107E3E', '#E9730C', '#6C32A4', '#0A6ED1', '#1a9a5b'];

            var html = '<div style="padding: 24px;">';
            
            sortedCauses.forEach(function(item, index) {
                var cause = item[0];
                var amount = item[1];
                var percentage = (amount / maxAmount) * 100;
                var color = colors[index % colors.length];
                
                html += '<div style="margin-bottom: 24px;">' +
                    '<div style="display: flex; justify-content: space-between; margin-bottom: 8px;">' +
                        '<span style="font-weight: 700; color: #2c3e50; font-size: 1rem;">' + cause + '</span>' +
                        '<span style="font-weight: 800; color: ' + color + '; font-size: 1.1rem;">$' + 
                            amount.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0}) + '</span>' +
                    '</div>' +
                    '<div style="background: #f0f2f5; height: 36px; border-radius: 10px; overflow: hidden;">' +
                        '<div style="background: linear-gradient(90deg, ' + color + ' 0%, ' + color + 'dd 100%); ' +
                            'height: 100%; width: ' + percentage + '%; border-radius: 10px; ' +
                            'box-shadow: 0 2px 8px ' + color + '44;"></div>' +
                    '</div>' +
                '</div>';
            });
            
            html += '</div>';
            this._setChartContent(this._breakdownContainer, html);
            console.log("✅ [RENDER] Breakdown chart done");
        },

        _renderMonthlyTrendChart: function(monthlyTotals) {
            console.log("🎨 [RENDER] Rendering timeline chart");
            
            var sortedMonths = Object.entries(monthlyTotals)
                .sort(function(a, b) { return a[0].localeCompare(b[0]); })
                .slice(-12);

            if (sortedMonths.length === 0) {
                this._setChartContent(this._timelineContainer,
                    '<div style="padding: 40px; text-align: center; color: #999;">No timeline data</div>');
                return;
            }

            var maxAmount = Math.max.apply(null, sortedMonths.map(function(item) { return item[1]; }));
            var chartHeight = 220;
            var chartWidth = 650;
            var barWidth = Math.min(50, (chartWidth - 100) / sortedMonths.length);
            var spacing = (chartWidth - 100) / sortedMonths.length;
            var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            var html = '<div style="padding: 24px;"><svg width="100%" height="' + (chartHeight + 100) + 
                '" viewBox="0 0 ' + chartWidth + ' ' + (chartHeight + 100) + '">';

            sortedMonths.forEach(function(item, index) {
                var month = item[0];
                var amount = item[1];
                var barHeight = Math.max((amount / maxAmount) * chartHeight, 5);
                var x = (index * spacing) + 50;
                var y = chartHeight - barHeight + 20;

                var parts = month.split('-');
                var monthLabel = monthNames[parseInt(parts[1]) - 1] + " " + parts[0].slice(2);

                html += '<defs><linearGradient id="grad' + index + '" x1="0%" y1="0%" x2="0%" y2="100%">' +
                    '<stop offset="0%" style="stop-color:#0854A0;stop-opacity:1" />' +
                    '<stop offset="100%" style="stop-color:#0A6ED1;stop-opacity:1" />' +
                    '</linearGradient></defs>' +
                    '<rect x="' + x + '" y="' + y + '" width="' + barWidth + '" height="' + barHeight + 
                        '" fill="url(#grad' + index + ')" rx="6"/>' +
                    '<text x="' + (x + barWidth/2) + '" y="' + (y - 8) + '" text-anchor="middle" fill="#0854A0" font-size="12" font-weight="800">$' + 
                        amount.toLocaleString('en-US', {maximumFractionDigits: 0}) + '</text>' +
                    '<text x="' + (x + barWidth/2) + '" y="' + (chartHeight + 45) + '" text-anchor="middle" fill="#6c757d" font-size="11" font-weight="600">' + 
                        monthLabel + '</text>';
            });

            html += '</svg></div>';
            this._setChartContent(this._timelineContainer, html);
            console.log("✅ [RENDER] Timeline chart done");
        },

        _renderNoDataMessage: function() {
            var noDataMsg = '<div style="padding: 80px 20px; text-align: center;">' +
                '<div style="font-size: 4rem; color: #e0e3e7; margin-bottom: 20px;">📊</div>' +
                '<div style="font-size: 1.2rem; font-weight: 700; color: #6c757d; margin-bottom: 12px;">No Donation Data</div>' +
                '<div style="font-size: 1rem; color: #999;">Charts will appear once donations are recorded</div>' +
            '</div>';
            
            this._setChartContent(this._breakdownContainer, noDataMsg);
            this._setChartContent(this._timelineContainer, noDataMsg);
        }
    });
});