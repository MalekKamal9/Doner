sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/ColumnListItem",
    "sap/m/Text",
    "sap/m/ObjectStatus",
    "sap/m/ObjectNumber",
    "sap/m/Button",
    "sap/m/HBox",
    "sap/ui/core/Item",
    "sap/ui/core/Icon"
], function (Controller, JSONModel, MessageToast, MessageBox, ColumnListItem, Text, ObjectStatus, ObjectNumber, Button, HBox, Item, Icon) {
    "use strict";

    // Global variables
    let trendsChart, campaignsChart, causesChart, segmentsChart, quarterlyChart, forecastChart, gaugeChart;
    let chartJsLoaded = false, jsPDFLoaded = false, xlsxLoaded = false;
    let autoRefreshInterval = null;
    let rawAnalyticsData = null, rawDonations = [], rawDonors = [];
    let currentReportTitle = '', currentReportType = '';
    
    // Donor List variables
    let donorListData = [];
    let filteredDonorListData = [];
    let currentDonorEdit = null;

    return Controller.extend("donormanagementbita.dashboard.ext.main.Main", {

        onInit: function () {
            console.log("🚀 Professional Dashboard initialized");
            this.getView().setModel(new JSONModel({ kpis: {}, loading: true, goalAmount: 1000000 }), "dashboard");
            this._loadAllLibraries().then(() => {
                this._loadAllData();
                this._loadDonorListData();
            });
        },

        // ═══════════════════════════════════════════════════════════════════════
        // LIBRARY LOADING
        // ═══════════════════════════════════════════════════════════════════════
        _loadAllLibraries: async function () {
            await this._loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js');
            chartJsLoaded = true;
            await this._loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            await this._loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.1/jspdf.plugin.autotable.min.js');
            jsPDFLoaded = true;
            await this._loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
            xlsxLoaded = true;
            console.log("✅ All libraries loaded successfully");
        },

        _loadScript: function (src) {
            return new Promise((resolve) => {
                if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                script.onerror = resolve;
                document.head.appendChild(script);
            });
        },

        // ═══════════════════════════════════════════════════════════════════════
        // DATABASE DATA LOADING
        // ═══════════════════════════════════════════════════════════════════════
        _loadAllData: async function () {
            try {
                console.log("📊 Loading data from database...");
                const analyticsResponse = await fetch("/service/donor_management_Bita/getAnalyticsData()");
                const analyticsResult = await analyticsResponse.json();
                if (analyticsResult.value) {
                    rawAnalyticsData = typeof analyticsResult.value === 'string' ? JSON.parse(analyticsResult.value) : analyticsResult.value;
                } else {
                    rawAnalyticsData = analyticsResult;
                }
                console.log("✅ Analytics data loaded:", rawAnalyticsData);

                const donationsResponse = await fetch("/service/donor_management_Bita/Donations?$top=5000");
                const donationsResult = await donationsResponse.json();
                rawDonations = donationsResult.value || [];
                console.log(`✅ Loaded ${rawDonations.length} donations from database`);

                const donorsResponse = await fetch("/service/donor_management_Bita/Donors?$top=500");
                const donorsResult = await donorsResponse.json();
                rawDonors = donorsResult.value || [];
                console.log(`✅ Loaded ${rawDonors.length} donors from database`);

                this._updateDashboard();
            } catch (error) {
                console.error("❌ Database error:", error);
                MessageToast.show("Error loading data from database");
            }
        },

        _updateDashboard: function () {
            const model = this.getView().getModel("dashboard");
            model.setProperty("/kpis", rawAnalyticsData?.kpis || {});
            model.setProperty("/loading", false);
            this._updateLastUpdated();
            this._renderKPICards();
            this._updateQuickInsights();
            this._populateFilters();
            this._renderAllCharts();
            this._loadTopDonorsTable();
            this._loadAtRiskDonorsTable();
            this._updateAIContextStats();
        },

        // ═══════════════════════════════════════════════════════════════════════
        // DONOR LIST MANAGEMENT
        // ═══════════════════════════════════════════════════════════════════════
        _loadDonorListData: async function () {
            try {
                console.log("📋 Loading donor list data...");
                const donorsResponse = await fetch("/service/donor_management_Bita/Donors?$top=1000");
                const donorsResult = await donorsResponse.json();
                donorListData = donorsResult.value || [];
                
                const donationsResponse = await fetch("/service/donor_management_Bita/Donations?$top=5000");
                const donationsResult = await donationsResponse.json();
                const donations = donationsResult.value || [];
                
                donorListData = donorListData.map(donor => {
                    const donorDonations = donations.filter(d => d.donor_ID === donor.ID || d.donor_Email === donor.email);
                    const totalDonated = donorDonations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
                    const donationCount = donorDonations.length;
                    const avgDonation = donationCount > 0 ? totalDonated / donationCount : 0;
                    const dates = donorDonations.map(d => this._parseDate(d.donation_date)).filter(d => d !== null).sort((a, b) => a - b);
                    const firstDonation = dates.length > 0 ? dates[0] : null;
                    const lastDonation = dates.length > 0 ? dates[dates.length - 1] : null;
                    
                    return {
                        ...donor,
                        totalDonated: totalDonated,
                        donationCount: donationCount,
                        avgDonation: avgDonation,
                        firstDonation: firstDonation,
                        lastDonation: lastDonation,
                        tier: this._calculateDonorTier(totalDonated),
                        isActive: donor.isActive !== false && donor.status !== 'inactive',
                        fullName: `${donor.firstName || ''} ${donor.lastName || ''}`.trim() || donor.email
                    };
                });
                
                filteredDonorListData = [...donorListData];
                console.log(`✅ Loaded ${donorListData.length} donors`);
                this._updateDonorListUI();
            } catch (error) {
                console.error("❌ Error loading donor list:", error);
                MessageToast.show("Error loading donor list");
            }
        },

        _updateDonorListUI: function () {
            const total = donorListData.length;
            const active = donorListData.filter(d => d.isActive).length;
            const inactive = total - active;
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            const newThisMonth = donorListData.filter(d => {
                const created = d.createdAt ? new Date(d.createdAt) : d.firstDonation;
                return created && created >= oneMonthAgo;
            }).length;
            
            this.byId("totalDonorsCount")?.setText(total.toString());
            this.byId("activeDonorsCount")?.setText(active.toString());
            this.byId("inactiveDonorsCount")?.setText(inactive.toString());
            this.byId("newDonorsCount")?.setText(newThisMonth.toString());
            this._populateDonorTable();
        },

        _populateDonorTable: function () {
            const table = this.byId("donorListTable");
            if (!table) return;
            table.removeAllItems();
            
            filteredDonorListData.forEach(donor => {
                const item = new ColumnListItem({
                    cells: [
                        new Icon({
                            src: "sap-icon://circle-task",
                            color: donor.isActive ? "#107E3E" : "#E9730C",
                            size: "0.75rem"
                        }),
                        new Text({ text: donor.fullName || 'N/A', wrapping: false }),
                        new Text({ text: donor.email || 'N/A', wrapping: false }),
                        new Text({ text: donor.phone || 'N/A', wrapping: false }),
                        new Text({ text: donor.city ? `${donor.city}, ${donor.state || ''}` : 'N/A', wrapping: false }),
                        new ObjectNumber({
                            number: Math.round(donor.totalDonated || 0).toString(),
                            unit: "USD",
                            state: donor.totalDonated > 10000 ? "Success" : "None"
                        }),
                        new ObjectStatus({
                            text: donor.tier.icon + ' ' + donor.tier.name,
                            state: donor.tier.level >= 4 ? "Success" : "Information"
                        }),
                        new ObjectStatus({
                            text: donor.isActive ? "Active" : "Inactive",
                            state: donor.isActive ? "Success" : "Warning"
                        }),
                        new HBox({
                            items: [
                                new Button({
                                    icon: "sap-icon://display",
                                    type: "Transparent",
                                    tooltip: "View Details",
                                    press: () => this.onViewDonor(donor)
                                }),
                                new Button({
                                    icon: "sap-icon://edit",
                                    type: "Transparent",
                                    tooltip: "Edit Donor",
                                    press: () => this.onEditDonor(donor)
                                }),
                                new Button({
                                    icon: donor.isActive ? "sap-icon://hide" : "sap-icon://show",
                                    type: "Transparent",
                                    tooltip: donor.isActive ? "Deactivate" : "Activate",
                                    press: () => this.onToggleDonorStatus(donor)
                                }),
                                new Button({
                                    icon: "sap-icon://delete",
                                    type: "Transparent",
                                    tooltip: "Delete Donor",
                                    press: () => this.onDeleteDonor(donor)
                                })
                            ]
                        })
                    ]
                });
                table.addItem(item);
            });
            this.byId("donorTableTitle")?.setText(`Donors (${filteredDonorListData.length})`);
        },

        onDonorSearch: function (oEvent) {
            const searchQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            this._applyDonorFilters(searchQuery);
        },

        onDonorFilterChange: function () {
            const searchField = this.byId("donorSearchField");
            const searchQuery = searchField ? searchField.getValue() : "";
            this._applyDonorFilters(searchQuery);
        },

        _applyDonorFilters: function (searchQuery) {
            const statusFilter = this.byId("donorStatusFilter")?.getSelectedKey() || "all";
            const tierFilter = this.byId("donorTierFilter")?.getSelectedKey() || "all";
            
            filteredDonorListData = donorListData.filter(donor => {
                const searchLower = searchQuery.toLowerCase();
                const matchesSearch = !searchQuery || 
                    (donor.fullName || '').toLowerCase().includes(searchLower) ||
                    (donor.email || '').toLowerCase().includes(searchLower) ||
                    (donor.phone || '').toLowerCase().includes(searchLower);
                const matchesStatus = statusFilter === "all" ||
                    (statusFilter === "active" && donor.isActive) ||
                    (statusFilter === "inactive" && !donor.isActive);
                const matchesTier = tierFilter === "all" || donor.tier.name.toLowerCase() === tierFilter;
                return matchesSearch && matchesStatus && matchesTier;
            });
            this._populateDonorTable();
        },

        onClearDonorFilters: function () {
            this.byId("donorSearchField")?.setValue("");
            this.byId("donorStatusFilter")?.setSelectedKey("all");
            this.byId("donorTierFilter")?.setSelectedKey("all");
            filteredDonorListData = [...donorListData];
            this._populateDonorTable();
            MessageToast.show("Filters cleared");
        },

        onRefreshDonorList: function () {
            MessageToast.show("Refreshing donor list...");
            this._loadDonorListData();
        },

        onCreateDonor: function () {
            currentDonorEdit = null;
            const dialog = this.byId("donorFormDialog");
            dialog.setTitle("Create New Donor");
            this.byId("donorFirstName")?.setValue("");
            this.byId("donorLastName")?.setValue("");
            this.byId("donorEmail")?.setValue("");
            this.byId("donorPhone")?.setValue("");
            this.byId("donorAddress")?.setValue("");
            this.byId("donorCity")?.setValue("");
            this.byId("donorState")?.setValue("");
            this.byId("donorZip")?.setValue("");
            this.byId("donorActiveSwitch")?.setState(true);
            this.byId("donorFormMessage")?.setVisible(false);
            dialog.open();
        },

        onViewDonor: function (donor) {
            this.byId("viewDonorName")?.setText(donor.fullName);
            this.byId("viewDonorEmail")?.setText(donor.email || 'N/A');
            this.byId("viewDonorStatus")?.setText(donor.isActive ? "Active" : "Inactive");
            this.byId("viewDonorStatus")?.setState(donor.isActive ? "Success" : "Warning");
            this.byId("viewDonorPhone")?.setText(donor.phone || 'N/A');
            this.byId("viewDonorAddress")?.setText(donor.address || 'N/A');
            this.byId("viewDonorLocation")?.setText(donor.city ? `${donor.city}, ${donor.state || ''} ${donor.zip || ''}` : 'N/A');
            this.byId("viewDonorTotal")?.setNumber(Math.round(donor.totalDonated || 0).toString());
            this.byId("viewDonorCount")?.setText((donor.donationCount || 0).toString());
            this.byId("viewDonorAvg")?.setText('$' + Math.round(donor.avgDonation || 0).toLocaleString());
            this.byId("viewDonorTier")?.setText(donor.tier.icon + ' ' + donor.tier.name);
            this.byId("viewDonorTier")?.setState(donor.tier.level >= 4 ? "Success" : "Information");
            this.byId("viewDonorFirstDate")?.setText(donor.firstDonation ? donor.firstDonation.toLocaleDateString() : 'N/A');
            this.byId("viewDonorLastDate")?.setText(donor.lastDonation ? donor.lastDonation.toLocaleDateString() : 'N/A');
            this.byId("viewDonorDialog")?.open();
        },

        onCloseViewDonorDialog: function () {
            this.byId("viewDonorDialog")?.close();
        },

        onEditDonor: function (donor) {
            currentDonorEdit = donor;
            const dialog = this.byId("donorFormDialog");
            dialog.setTitle("Edit Donor: " + donor.fullName);
            this.byId("donorFirstName")?.setValue(donor.firstName || "");
            this.byId("donorLastName")?.setValue(donor.lastName || "");
            this.byId("donorEmail")?.setValue(donor.email || "");
            this.byId("donorPhone")?.setValue(donor.phone || "");
            this.byId("donorAddress")?.setValue(donor.address || "");
            this.byId("donorCity")?.setValue(donor.city || "");
            this.byId("donorState")?.setValue(donor.state || "");
            this.byId("donorZip")?.setValue(donor.zip || "");
            this.byId("donorActiveSwitch")?.setState(donor.isActive !== false);
            this.byId("donorFormMessage")?.setVisible(false);
            dialog.open();
        },

        onSaveDonor: async function () {
            const firstName = this.byId("donorFirstName")?.getValue().trim();
            const lastName = this.byId("donorLastName")?.getValue().trim();
            const email = this.byId("donorEmail")?.getValue().trim();
            const phone = this.byId("donorPhone")?.getValue().trim();
            const address = this.byId("donorAddress")?.getValue().trim();
            const city = this.byId("donorCity")?.getValue().trim();
            const state = this.byId("donorState")?.getValue().trim();
            const zip = this.byId("donorZip")?.getValue().trim();
            const isActive = this.byId("donorActiveSwitch")?.getState();
            
            const msgStrip = this.byId("donorFormMessage");
            if (!firstName || !lastName || !email) {
                msgStrip?.setText("Please fill in all required fields (First Name, Last Name, Email)");
                msgStrip?.setVisible(true);
                return;
            }
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                msgStrip?.setText("Please enter a valid email address");
                msgStrip?.setVisible(true);
                return;
            }
            
            try {
                const donorData = {
                    firstName: firstName,
                    lastName: lastName,
                    email: email,
                    phone: phone,
                    address: address,
                    city: city,
                    state: state,
                    zip: zip,
                    isActive: isActive,
                    status: isActive ? 'active' : 'inactive'
                };
                
                let response;
                if (currentDonorEdit) {
                    response = await fetch(`/service/donor_management_Bita/Donors(${currentDonorEdit.ID})`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(donorData)
                    });
                    if (response.ok) {
                        MessageToast.show("Donor updated successfully");
                    } else {
                        throw new Error("Failed to update donor");
                    }
                } else {
                    donorData.createdAt = new Date().toISOString();
                    response = await fetch('/service/donor_management_Bita/Donors', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(donorData)
                    });
                    if (response.ok) {
                        MessageToast.show("Donor created successfully");
                    } else {
                        throw new Error("Failed to create donor");
                    }
                }
                await this._loadDonorListData();
                this.byId("donorFormDialog")?.close();
            } catch (error) {
                console.error("Error saving donor:", error);
                msgStrip?.setText("Error saving donor. Please try again.");
                msgStrip?.setVisible(true);
            }
        },

        onCancelDonorDialog: function () {
            this.byId("donorFormDialog")?.close();
        },

        onToggleDonorStatus: async function (donor) {
            try {
                const newStatus = !donor.isActive;
                const response = await fetch(`/service/donor_management_Bita/Donors(${donor.ID})`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isActive: newStatus, status: newStatus ? 'active' : 'inactive' })
                });
                if (response.ok) {
                    MessageToast.show(`Donor ${newStatus ? 'activated' : 'deactivated'} successfully`);
                    await this._loadDonorListData();
                } else {
                    throw new Error("Failed to update status");
                }
            } catch (error) {
                console.error("Error toggling donor status:", error);
                MessageToast.show("Error updating donor status");
            }
        },

        onDeleteDonor: function (donor) {
            currentDonorEdit = donor;
            this.byId("deleteDonorName")?.setText(donor.fullName);
            this.byId("deleteDonorDialog")?.open();
        },

        onConfirmDeleteDonor: async function () {
            if (!currentDonorEdit) return;
            try {
                const response = await fetch(`/service/donor_management_Bita/Donors(${currentDonorEdit.ID})`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    MessageToast.show("Donor deleted successfully");
                    await this._loadDonorListData();
                    this.byId("deleteDonorDialog")?.close();
                } else {
                    throw new Error("Failed to delete donor");
                }
            } catch (error) {
                console.error("Error deleting donor:", error);
                MessageBox.error("Error deleting donor. Please try again.");
            }
        },

        onCancelDeleteDonor: function () {
            this.byId("deleteDonorDialog")?.close();
        },

        onExportDonorList: function () {
            if (!xlsxLoaded || !window.XLSX) {
                MessageToast.show("Excel library not loaded");
                return;
            }
            const exportData = [
                ['First Name', 'Last Name', 'Email', 'Phone', 'Address', 'City', 'State', 'ZIP', 
                 'Total Donated', 'Donation Count', 'Avg Donation', 'Tier', 'Status', 'First Donation', 'Last Donation']
            ];
            filteredDonorListData.forEach(donor => {
                exportData.push([
                    donor.firstName || '', donor.lastName || '', donor.email || '', donor.phone || '',
                    donor.address || '', donor.city || '', donor.state || '', donor.zip || '',
                    Math.round(donor.totalDonated || 0), donor.donationCount || 0, Math.round(donor.avgDonation || 0),
                    donor.tier.name, donor.isActive ? 'Active' : 'Inactive',
                    donor.firstDonation ? donor.firstDonation.toLocaleDateString() : '',
                    donor.lastDonation ? donor.lastDonation.toLocaleDateString() : ''
                ]);
            });
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(exportData);
            const colWidths = exportData[0].map((_, i) => ({
                wch: Math.max(...exportData.map(row => String(row[i] || '').length)) + 2
            }));
            ws['!cols'] = colWidths;
            XLSX.utils.book_append_sheet(wb, ws, 'Donors');
            XLSX.writeFile(wb, 'Akme_Donor_List_' + new Date().toISOString().split('T')[0] + '.xlsx');
            MessageToast.show("Donor list exported to Excel");
        },


        onInit: function () {
    console.log("🚀 Professional Dashboard initialized");
    this.getView().setModel(new JSONModel({ kpis: {}, loading: true, goalAmount: 1000000 }), "dashboard");
    
    // ========== LISTEN FOR TAB SELECTION ==========
    const tabBar = this.byId("mainTabBar");
    if (tabBar) {
        tabBar.attachSelect(this.onTabSelect.bind(this));
    }
    
    this._loadAllLibraries().then(() => {
        this._loadAllData();
        this._loadDonorListData();
    });
},

// ═══════════════════════════════════════════════════════════════════════
// TAB SELECTION HANDLER
// ═══════════════════════════════════════════════════════════════════════

onTabSelect: function (oEvent) {
    const selectedKey = oEvent.getParameter("key");
    
    if (selectedKey === "donorList") {
        // Navigate to Donor Management page
        this.onNavigateToDonorManagement();
        
        // Optional: Switch back to previous tab
        setTimeout(() => {
            const tabBar = this.byId("mainTabBar");
            tabBar.setSelectedKey("dashboard");
        }, 100);
    }
},

// ═══════════════════════════════════════════════════════════════════════
// NAVIGATION TO DONOR MANAGEMENT (LIST REPORT PAGE)
// ═══════════════════════════════════════════════════════════════════════

onNavigateToDonorManagement: function () {
    console.log("========== NAVIGATION DEBUG ==========");
    
    const currentUrl = window.location.href;
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    
    console.log("Current URL:", currentUrl);
    console.log("Origin:", origin);
    console.log("Pathname:", pathname);
    
    // Check if in FLP
    const isInFLP = !!(sap.ushell && sap.ushell.Container);
    console.log("In FLP:", isInFLP);
    
    if (isInFLP) {
        // ========== FIORI LAUNCHPAD NAVIGATION ==========
        console.log("Attempting FLP navigation...");
        
        // Use the correct semantic object name
        const targetHash = "#donormanagementbitadonormanagement-display";
        console.log("Target hash:", targetHash);
        
        try {
            window.location.hash = targetHash;
        } catch (error) {
            console.error("FLP navigation error:", error);
            this._openDonorManagementDirectUrl();
        }
        
    } else {
        // ========== STANDALONE NAVIGATION ==========
        console.log("Standalone mode, using direct URL");
        this._openDonorManagementDirectUrl();
    }
    
    console.log("========== END DEBUG ==========");
},

_openDonorManagementDirectUrl: function() {
    const currentUrl = window.location.href;
    const origin = window.location.origin;
    
    // Construct target URL - FIXED: Use correct app name
    let targetUrl;
    
    // Method 1: If current URL contains the dashboard app name
    if (currentUrl.includes('donor_management_bita.dashboard')) {
        targetUrl = currentUrl
            .split('#')[0]  // Remove hash
            .split('?')[0]  // Remove query params
            .replace('donor_management_bita.dashboard', 'donor_management_bita.donormanagement');
    } 
    // Method 2: Standard path construction with CORRECT app name
    else {
        // FIXED: Correct app name is donor_management_bita.donormanagement
        targetUrl = `${origin}/donor_management_bita.donormanagement/webapp/index.html`;
    }
    
    console.log("Opening Donor Management at:", targetUrl);
    
    MessageToast.show("Opening Donor Management...");
    
    // Open in new tab
    const newWindow = window.open(targetUrl, "_blank");
    
    // Check if popup was blocked
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        MessageBox.warning(
            "Pop-up blocked! Please allow pop-ups for this site.\n\nClick OK to open in same window.\n\nURL: " + targetUrl, {
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.OK,
                onClose: function(sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        window.location.href = targetUrl;
                    }
                }
            }
        );
    }
},

_navigateDirectly: function () {
    // Direct URL navigation
    const currentUrl = window.location.href;
    const baseUrl = window.location.origin;
    
    // Try to construct the correct URL
    let targetUrl;
    
    if (currentUrl.includes('webapp/index.html')) {
        // Running in development/test mode
        targetUrl = currentUrl.replace(
            'donor_management_bita.dashboard/webapp/index.html',
            'donor_management_bita.donormanagement/webapp/index.html'
        );
    } else {
        // Running in production
        targetUrl = `${baseUrl}/donor_management_bita.donormanagement/webapp/index.html`;
    }
    
    console.log("Direct navigation to:", targetUrl);
    
    // Open in new tab
    window.open(targetUrl, "_blank");
},


        // ═══════════════════════════════════════════════════════════════════════
        // COMPREHENSIVE DATA COMPUTATION FROM DATABASE
        // ═══════════════════════════════════════════════════════════════════════
        _computeAllMetrics: function () {
            const metrics = {
                totalRevenue: 0,
                totalDonations: rawDonations.length,
                totalDonors: rawDonors.length,
                avgDonation: 0,
                donorDetails: {},
                repeatDonors: 0,
                oneTimeDonors: 0,
                retentionRate: 0,
                atRiskDonors: [],
                avgLifetimeValue: 0,
                campaigns: {},
                topCampaigns: [],
                causes: {},
                topCauses: [],
                monthlyData: {},
                quarterlyData: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
                yearlyData: {},
                currentYear: new Date().getFullYear(),
                reportDate: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
                reportTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            };

            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            rawDonations.forEach((donation, index) => {
                const amount = parseFloat(donation.amount) || 0;
                const donorId = donation.donor_ID || donation.donor_Email || donation.email || `unknown_${index}`;
                const campaign = donation.campaign || donation.campaign_name || 'General Fund';
                const cause = donation.cause || 'General';
                let donationDate = this._parseDate(donation.donation_date);
                if (!donationDate) {
                    donationDate = this._generateDateFromIndex(index, rawDonations.length);
                }

                metrics.totalRevenue += amount;

                if (!metrics.donorDetails[donorId]) {
                    const donorRecord = rawDonors.find(d => d.ID === donorId || d.email === donorId);
                    metrics.donorDetails[donorId] = {
                        id: donorId,
                        firstName: donorRecord?.firstName || '',
                        lastName: donorRecord?.lastName || '',
                        email: donorRecord?.email || donorId,
                        phone: donorRecord?.phone || 'N/A',
                        address: donorRecord?.address || 'N/A',
                        city: donorRecord?.city || 'N/A',
                        totalDonated: 0,
                        donationCount: 0,
                        donations: [],
                        firstDonation: donationDate,
                        lastDonation: donationDate,
                        avgDonation: 0
                    };
                }
                
                const donor = metrics.donorDetails[donorId];
                donor.totalDonated += amount;
                donor.donationCount += 1;
                donor.donations.push({ date: donationDate, amount: amount, campaign: campaign, cause: cause });
                if (donationDate < donor.firstDonation) donor.firstDonation = donationDate;
                if (donationDate > donor.lastDonation) donor.lastDonation = donationDate;

                if (!metrics.campaigns[campaign]) {
                    metrics.campaigns[campaign] = { 
                        name: campaign, totalRaised: 0, donationCount: 0, donors: new Set(), avgDonation: 0, donations: []
                    };
                }
                metrics.campaigns[campaign].totalRaised += amount;
                metrics.campaigns[campaign].donationCount += 1;
                metrics.campaigns[campaign].donors.add(donorId);
                metrics.campaigns[campaign].donations.push({ date: donationDate, amount: amount });

                if (!metrics.causes[cause]) {
                    metrics.causes[cause] = { name: cause, totalRaised: 0, donationCount: 0, donors: new Set() };
                }
                metrics.causes[cause].totalRaised += amount;
                metrics.causes[cause].donationCount += 1;
                metrics.causes[cause].donors.add(donorId);

                const monthKey = `${donationDate.getFullYear()}-${String(donationDate.getMonth() + 1).padStart(2, '0')}`;
                if (!metrics.monthlyData[monthKey]) {
                    metrics.monthlyData[monthKey] = { revenue: 0, count: 0, donors: new Set() };
                }
                metrics.monthlyData[monthKey].revenue += amount;
                metrics.monthlyData[monthKey].count += 1;
                metrics.monthlyData[monthKey].donors.add(donorId);

                const quarter = Math.floor(donationDate.getMonth() / 3) + 1;
                if (donationDate.getFullYear() === metrics.currentYear) {
                    metrics.quarterlyData[`Q${quarter}`] += amount;
                }

                const year = donationDate.getFullYear();
                if (!metrics.yearlyData[year]) {
                    metrics.yearlyData[year] = { revenue: 0, count: 0, donors: new Set() };
                }
                metrics.yearlyData[year].revenue += amount;
                metrics.yearlyData[year].count += 1;
                metrics.yearlyData[year].donors.add(donorId);
            });

            Object.values(metrics.donorDetails).forEach(donor => {
                donor.avgDonation = donor.donationCount > 0 ? donor.totalDonated / donor.donationCount : 0;
                donor.fullName = `${donor.firstName} ${donor.lastName}`.trim() || donor.email;
                donor.tier = this._calculateDonorTier(donor.totalDonated);
                donor.daysInactive = Math.floor((new Date() - donor.lastDonation) / (1000 * 60 * 60 * 24));
                donor.isAtRisk = donor.lastDonation < sixMonthsAgo;
                if (donor.donationCount > 1) {
                    metrics.repeatDonors++;
                } else {
                    metrics.oneTimeDonors++;
                }
                if (donor.isAtRisk) {
                    metrics.atRiskDonors.push(donor);
                }
            });

            Object.values(metrics.campaigns).forEach(campaign => {
                campaign.uniqueDonors = campaign.donors.size;
                campaign.avgDonation = campaign.donationCount > 0 ? campaign.totalRaised / campaign.donationCount : 0;
                campaign.percentOfTotal = metrics.totalRevenue > 0 ? (campaign.totalRaised / metrics.totalRevenue) * 100 : 0;
            });

            metrics.topCampaigns = Object.values(metrics.campaigns).sort((a, b) => b.totalRaised - a.totalRaised);
            metrics.topCauses = Object.values(metrics.causes).sort((a, b) => b.totalRaised - a.totalRaised);
            metrics.avgDonation = metrics.totalDonations > 0 ? metrics.totalRevenue / metrics.totalDonations : 0;
            metrics.avgLifetimeValue = metrics.totalDonors > 0 ? metrics.totalRevenue / metrics.totalDonors : 0;
            metrics.retentionRate = metrics.totalDonors > 0 ? Math.round((metrics.repeatDonors / metrics.totalDonors) * 100) : 0;
            metrics.topDonors = Object.values(metrics.donorDetails).sort((a, b) => b.totalDonated - a.totalDonated);
            metrics.atRiskDonors.sort((a, b) => b.daysInactive - a.daysInactive);

            return metrics;
        },

        _calculateDonorTier: function (totalDonated) {
            if (totalDonated >= 100000) return { name: 'Diamond', level: 6, color: '#E91E63', icon: '💎' };
            if (totalDonated >= 50000) return { name: 'Platinum', level: 5, color: '#9C27B0', icon: '🏆' };
            if (totalDonated >= 25000) return { name: 'Gold', level: 4, color: '#FF9800', icon: '🥇' };
            if (totalDonated >= 10000) return { name: 'Silver', level: 3, color: '#607D8B', icon: '🥈' };
            if (totalDonated >= 5000) return { name: 'Bronze', level: 2, color: '#795548', icon: '🥉' };
            return { name: 'Supporter', level: 1, color: '#4CAF50', icon: '⭐' };
        },

        // ═══════════════════════════════════════════════════════════════════════
        // PROFESSIONAL PDF GENERATION
        // ═══════════════════════════════════════════════════════════════════════
        _generateProfessionalPDF: function (reportTitle, reportType) {
            if (!jsPDFLoaded || !window.jspdf) {
                MessageToast.show("PDF library not loaded. Please try again.");
                return null;
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            const contentWidth = pageWidth - (2 * margin);
            const metrics = this._computeAllMetrics();

            doc.setFillColor(8, 84, 160);
            doc.rect(0, 0, pageWidth, 50, 'F');
            doc.setFillColor(16, 126, 62);
            doc.rect(0, 50, pageWidth, 3, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(28);
            doc.setFont('helvetica', 'bold');
            doc.text('AKME FOUNDATION', margin, 25);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.text('Empowering Communities Through Generosity', margin, 35);
            doc.setFontSize(10);
            doc.text(reportTitle.toUpperCase(), margin, 45);
            doc.setFontSize(9);
            doc.text(metrics.reportDate, pageWidth - margin, 25, { align: 'right' });
            doc.text(metrics.reportTime, pageWidth - margin, 32, { align: 'right' });
            doc.text('Donor Management System', pageWidth - margin, 39, { align: 'right' });

            let yPos = 65;

            doc.setFillColor(240, 247, 255);
            doc.roundedRect(margin, yPos, contentWidth, 45, 3, 3, 'F');
            doc.setDrawColor(8, 84, 160);
            doc.setLineWidth(0.5);
            doc.roundedRect(margin, yPos, contentWidth, 45, 3, 3, 'S');
            doc.setTextColor(8, 84, 160);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('EXECUTIVE SUMMARY', margin + 5, yPos + 8);

            doc.setTextColor(60, 60, 60);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            const summaryCol1X = margin + 5;
            const summaryCol2X = margin + 95;

            doc.text(`Total Revenue:`, summaryCol1X, yPos + 18);
            doc.setFont('helvetica', 'bold');
            doc.text(`$${Math.round(metrics.totalRevenue).toLocaleString()}`, summaryCol1X + 35, yPos + 18);
            doc.setFont('helvetica', 'normal');
            doc.text(`Total Donors:`, summaryCol2X, yPos + 18);
            doc.setFont('helvetica', 'bold');
            doc.text(`${metrics.totalDonors.toLocaleString()}`, summaryCol2X + 30, yPos + 18);
            doc.setFont('helvetica', 'normal');
            doc.text(`Total Donations:`, summaryCol1X, yPos + 26);
            doc.setFont('helvetica', 'bold');
            doc.text(`${metrics.totalDonations.toLocaleString()}`, summaryCol1X + 35, yPos + 26);
            doc.setFont('helvetica', 'normal');
            doc.text(`Average Donation:`, summaryCol2X, yPos + 26);
            doc.setFont('helvetica', 'bold');
            doc.text(`$${Math.round(metrics.avgDonation).toLocaleString()}`, summaryCol2X + 35, yPos + 26);
            doc.setFont('helvetica', 'normal');
            doc.text(`Retention Rate:`, summaryCol1X, yPos + 34);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(16, 126, 62);
            doc.text(`${metrics.retentionRate}%`, summaryCol1X + 35, yPos + 34);
            doc.setTextColor(60, 60, 60);
            doc.setFont('helvetica', 'normal');
            doc.text(`At-Risk Donors:`, summaryCol2X, yPos + 34);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(187, 0, 0);
            doc.text(`${metrics.atRiskDonors.length}`, summaryCol2X + 30, yPos + 34);
            doc.setTextColor(60, 60, 60);
            doc.setFont('helvetica', 'normal');
            doc.text(`Avg. Lifetime Value:`, summaryCol1X, yPos + 42);
            doc.setFont('helvetica', 'bold');
            doc.text(`$${Math.round(metrics.avgLifetimeValue).toLocaleString()}`, summaryCol1X + 40, yPos + 42);
            doc.setFont('helvetica', 'normal');
            doc.text(`Repeat Donors:`, summaryCol2X, yPos + 42);
            doc.setFont('helvetica', 'bold');
            doc.text(`${metrics.repeatDonors} (${metrics.retentionRate}%)`, summaryCol2X + 30, yPos + 42);

            yPos += 55;

            const boxWidth = (contentWidth - 15) / 4;
            const boxHeight = 22;
            const boxes = [
                { label: 'Total Revenue', value: '$' + Math.round(metrics.totalRevenue).toLocaleString(), color: [8, 84, 160] },
                { label: 'Total Donors', value: metrics.totalDonors.toString(), color: [16, 126, 62] },
                { label: 'Retention', value: metrics.retentionRate + '%', color: [233, 115, 12] },
                { label: 'At Risk', value: metrics.atRiskDonors.length.toString(), color: [187, 0, 0] }
            ];

            boxes.forEach((box, index) => {
                const boxX = margin + (index * (boxWidth + 5));
                doc.setFillColor(...box.color);
                doc.roundedRect(boxX, yPos, boxWidth, boxHeight, 2, 2, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text(box.value, boxX + boxWidth / 2, yPos + 10, { align: 'center' });
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.text(box.label, boxX + boxWidth / 2, yPos + 17, { align: 'center' });
            });

            yPos += boxHeight + 10;
            this._addReportContent(doc, reportType, metrics, margin, yPos, contentWidth);

            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFillColor(245, 245, 245);
                doc.rect(0, pageHeight - 18, pageWidth, 18, 'F');
                doc.setDrawColor(8, 84, 160);
                doc.setLineWidth(0.5);
                doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
                doc.setTextColor(100, 100, 100);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.text('Akme Foundation - Donor Management System', margin, pageHeight - 10);
                doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
                doc.text('CONFIDENTIAL', pageWidth - margin, pageHeight - 10, { align: 'right' });
                doc.setFontSize(7);
                doc.text(`Generated: ${metrics.reportDate} at ${metrics.reportTime}`, margin, pageHeight - 5);
                doc.text(`Data: ${metrics.totalDonations.toLocaleString()} donations from ${metrics.totalDonors.toLocaleString()} donors`, pageWidth - margin, pageHeight - 5, { align: 'right' });
            }

            return doc;
        },

        _addReportContent: function (doc, reportType, metrics, margin, startY, contentWidth) {
            let yPos = startY;
            const addSectionTitle = (title, y) => {
                doc.setTextColor(8, 84, 160);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(title, margin, y);
                return y + 8;
            };

            switch (reportType) {
                case 'donorList':
                case 'topDonors':
                    yPos = addSectionTitle('TOP DONORS BY TOTAL CONTRIBUTION', yPos);
                    const donorLimit = reportType === 'topDonors' ? 25 : 50;
                    const topDonorsData = metrics.topDonors.slice(0, donorLimit).map((donor, i) => [
                        i + 1, donor.fullName.substring(0, 25), donor.email.substring(0, 28),
                        '$' + Math.round(donor.totalDonated).toLocaleString(), donor.donationCount,
                        '$' + Math.round(donor.avgDonation).toLocaleString(), donor.tier.name
                    ]);
                    doc.autoTable({
                        startY: yPos,
                        head: [['#', 'Donor Name', 'Email', 'Total Donated', 'Count', 'Avg', 'Tier']],
                        body: topDonorsData,
                        headStyles: { fillColor: [8, 84, 160], textColor: 255, fontStyle: 'bold', fontSize: 8 },
                        alternateRowStyles: { fillColor: [245, 247, 250] },
                        styles: { fontSize: 7, cellPadding: 2 },
                        columnStyles: {
                            0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 35 }, 2: { cellWidth: 40 },
                            3: { cellWidth: 25, halign: 'right' }, 4: { cellWidth: 12, halign: 'center' },
                            5: { cellWidth: 20, halign: 'right' }, 6: { cellWidth: 18, halign: 'center' }
                        },
                        margin: { left: margin, right: margin }
                    });
                    break;

                case 'donorActivity':
                    yPos = addSectionTitle('DONOR ACTIVITY ANALYSIS', yPos);
                    const activityData = metrics.topDonors.slice(0, 40).map((donor, i) => [
                        i + 1, donor.fullName.substring(0, 22), donor.firstDonation?.toLocaleDateString() || 'N/A',
                        donor.lastDonation?.toLocaleDateString() || 'N/A', donor.donationCount,
                        '$' + Math.round(donor.totalDonated).toLocaleString(), donor.daysInactive + ' days'
                    ]);
                    doc.autoTable({
                        startY: yPos,
                        head: [['#', 'Donor Name', 'First Donation', 'Last Donation', 'Count', 'Total', 'Inactive']],
                        body: activityData,
                        headStyles: { fillColor: [8, 84, 160], textColor: 255, fontStyle: 'bold', fontSize: 8 },
                        alternateRowStyles: { fillColor: [245, 247, 250] },
                        styles: { fontSize: 7, cellPadding: 2 },
                        margin: { left: margin, right: margin }
                    });
                    break;

                case 'retention':
                    yPos = addSectionTitle('DONOR RETENTION ANALYSIS', yPos);
                    const retentionData = [
                        ['Total Donors in Database', metrics.totalDonors.toLocaleString()],
                        ['Repeat Donors (2+ donations)', metrics.repeatDonors.toLocaleString()],
                        ['One-Time Donors', metrics.oneTimeDonors.toLocaleString()],
                        ['Donor Retention Rate', metrics.retentionRate + '%'],
                        ['At-Risk Donors (6+ months inactive)', metrics.atRiskDonors.length.toLocaleString()],
                        ['Churn Risk Rate', Math.round((metrics.atRiskDonors.length / metrics.totalDonors) * 100) + '%'],
                        ['Average Lifetime Value', '$' + Math.round(metrics.avgLifetimeValue).toLocaleString()],
                        ['Average Donations per Donor', (metrics.totalDonations / metrics.totalDonors).toFixed(2)]
                    ];
                    doc.autoTable({
                        startY: yPos, body: retentionData,
                        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 }, 1: { halign: 'right', cellWidth: 60 } },
                        styles: { fontSize: 10, cellPadding: 5 },
                        margin: { left: margin, right: margin }
                    });
                    yPos = doc.lastAutoTable.finalY + 15;
                    yPos = addSectionTitle('AT-RISK DONORS REQUIRING ATTENTION', yPos);
                    const atRiskData = metrics.atRiskDonors.slice(0, 15).map((donor, i) => [
                        i + 1, donor.fullName.substring(0, 25), donor.email.substring(0, 25),
                        donor.lastDonation?.toLocaleDateString() || 'N/A', donor.daysInactive + ' days',
                        '$' + Math.round(donor.totalDonated).toLocaleString()
                    ]);
                    doc.autoTable({
                        startY: yPos,
                        head: [['#', 'Donor Name', 'Email', 'Last Donation', 'Days Inactive', 'Total Given']],
                        body: atRiskData,
                        headStyles: { fillColor: [187, 0, 0], textColor: 255, fontStyle: 'bold', fontSize: 8 },
                        alternateRowStyles: { fillColor: [255, 235, 238] },
                        styles: { fontSize: 8, cellPadding: 2 },
                        margin: { left: margin, right: margin }
                    });
                    break;

                case 'segment':
                    yPos = addSectionTitle('DONOR SEGMENT ANALYSIS', yPos);
                    const tiers = ['Diamond', 'Platinum', 'Gold', 'Silver', 'Bronze', 'Supporter'];
                    const segmentData = tiers.map(tierName => {
                        const donors = metrics.topDonors.filter(d => d.tier.name === tierName);
                        const totalValue = donors.reduce((sum, d) => sum + d.totalDonated, 0);
                        return [
                            tierName, donors.length.toLocaleString(),
                            Math.round((donors.length / metrics.totalDonors) * 100) + '%',
                            '$' + Math.round(totalValue).toLocaleString(),
                            Math.round((totalValue / metrics.totalRevenue) * 100) + '%',
                            donors.length > 0 ? '$' + Math.round(totalValue / donors.length).toLocaleString() : '$0'
                        ];
                    });
                    doc.autoTable({
                        startY: yPos,
                        head: [['Segment', 'Donors', '% of Donors', 'Total Value', '% of Revenue', 'Avg Value']],
                        body: segmentData,
                        headStyles: { fillColor: [8, 84, 160], textColor: 255, fontStyle: 'bold', fontSize: 9 },
                        alternateRowStyles: { fillColor: [245, 247, 250] },
                        styles: { fontSize: 9, cellPadding: 4 },
                        columnStyles: {
                            0: { fontStyle: 'bold' }, 1: { halign: 'right' }, 2: { halign: 'right' },
                            3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }
                        },
                        margin: { left: margin, right: margin }
                    });
                    break;

                case 'campaignSummary':
                case 'campaignPerformance':
                case 'campaignROI':
                    yPos = addSectionTitle('CAMPAIGN PERFORMANCE ANALYSIS', yPos);
                    const campaignData = metrics.topCampaigns.slice(0, 20).map((campaign, i) => [
                        i + 1, campaign.name.substring(0, 30), '$' + Math.round(campaign.totalRaised).toLocaleString(),
                        campaign.donationCount.toLocaleString(), campaign.uniqueDonors.toLocaleString(),
                        '$' + Math.round(campaign.avgDonation).toLocaleString(), campaign.percentOfTotal.toFixed(1) + '%'
                    ]);
                    doc.autoTable({
                        startY: yPos,
                        head: [['#', 'Campaign Name', 'Total Raised', 'Donations', 'Donors', 'Avg Gift', '% of Total']],
                        body: campaignData,
                        headStyles: { fillColor: [8, 84, 160], textColor: 255, fontStyle: 'bold', fontSize: 8 },
                        alternateRowStyles: { fillColor: [245, 247, 250] },
                        styles: { fontSize: 8, cellPadding: 2 },
                        columnStyles: {
                            0: { cellWidth: 8, halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' },
                            4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }
                        },
                        margin: { left: margin, right: margin }
                    });
                    break;

                case 'causeBreakdown':
                    yPos = addSectionTitle('DONATIONS BY CAUSE', yPos);
                    const causeData = metrics.topCauses.map((cause, i) => [
                        i + 1, cause.name, '$' + Math.round(cause.totalRaised).toLocaleString(),
                        cause.donationCount.toLocaleString(), cause.donors.size.toLocaleString(),
                        Math.round((cause.totalRaised / metrics.totalRevenue) * 100) + '%'
                    ]);
                    doc.autoTable({
                        startY: yPos,
                        head: [['#', 'Cause', 'Total Raised', 'Donations', 'Donors', '% of Total']],
                        body: causeData,
                        headStyles: { fillColor: [8, 84, 160], textColor: 255, fontStyle: 'bold', fontSize: 9 },
                        alternateRowStyles: { fillColor: [245, 247, 250] },
                        styles: { fontSize: 9, cellPadding: 3 },
                        columnStyles: {
                            0: { cellWidth: 10, halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' },
                            4: { halign: 'right' }, 5: { halign: 'right' }
                        },
                        margin: { left: margin, right: margin }
                    });
                    break;

                case 'monthlyRevenue':
                case 'quarterly':
                case 'annual':
                case 'yoy':
                    yPos = addSectionTitle('MONTHLY REVENUE ANALYSIS', yPos);
                    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                                   'July', 'August', 'September', 'October', 'November', 'December'];
                    const trends = rawAnalyticsData?.trends || {};
                    const currentYearData = trends.currentYear || new Array(12).fill(0);
                    const prevYearData = trends.previousYear || new Array(12).fill(0);
                    const monthlyTableData = months.map((month, i) => {
                        const current = currentYearData[i] || 0;
                        const previous = prevYearData[i] || 0;
                        const change = previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;
                        return [
                            month, '$' + Math.round(current).toLocaleString(), '$' + Math.round(previous).toLocaleString(),
                            (change >= 0 ? '+' : '') + change + '%', current > 0 ? Math.round((current / metrics.totalRevenue) * 100) + '%' : '0%'
                        ];
                    });
                    const currentTotal = currentYearData.reduce((a, b) => a + b, 0);
                    const prevTotal = prevYearData.reduce((a, b) => a + b, 0);
                    const totalChange = prevTotal > 0 ? Math.round(((currentTotal - prevTotal) / prevTotal) * 100) : 0;
                    doc.autoTable({
                        startY: yPos,
                        head: [['Month', metrics.currentYear.toString(), (metrics.currentYear - 1).toString(), 'YoY Change', '% of Total']],
                        body: monthlyTableData,
                        foot: [['TOTAL', '$' + Math.round(currentTotal).toLocaleString(), '$' + Math.round(prevTotal).toLocaleString(), (totalChange >= 0 ? '+' : '') + totalChange + '%', '100%']],
                        headStyles: { fillColor: [8, 84, 160], textColor: 255, fontStyle: 'bold', fontSize: 9 },
                        footStyles: { fillColor: [8, 84, 160], textColor: 255, fontStyle: 'bold', fontSize: 9 },
                        alternateRowStyles: { fillColor: [245, 247, 250] },
                        styles: { fontSize: 9, cellPadding: 3 },
                        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
                        margin: { left: margin, right: margin }
                    });
                    yPos = doc.lastAutoTable.finalY + 15;
                    yPos = addSectionTitle('QUARTERLY SUMMARY ' + metrics.currentYear, yPos);
                    const quarterlyTableData = [
                        ['Q1 (Jan-Mar)', '$' + Math.round(metrics.quarterlyData.Q1).toLocaleString()],
                        ['Q2 (Apr-Jun)', '$' + Math.round(metrics.quarterlyData.Q2).toLocaleString()],
                        ['Q3 (Jul-Sep)', '$' + Math.round(metrics.quarterlyData.Q3).toLocaleString()],
                        ['Q4 (Oct-Dec)', '$' + Math.round(metrics.quarterlyData.Q4).toLocaleString()]
                    ];
                    doc.autoTable({
                        startY: yPos, body: quarterlyTableData,
                        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 }, 1: { halign: 'right', cellWidth: 50 } },
                        styles: { fontSize: 10, cellPadding: 4 },
                        margin: { left: margin, right: margin }
                    });
                    break;

                case 'tax':
                    yPos = addSectionTitle('TAX DEDUCTIBLE DONATION SUMMARY - ' + metrics.currentYear, yPos);
                    doc.setFillColor(255, 243, 205);
                    doc.roundedRect(margin, yPos, contentWidth, 15, 2, 2, 'F');
                    doc.setTextColor(133, 100, 4);
                    doc.setFontSize(8);
                    doc.text('NOTICE: This summary is provided for informational purposes. Consult a tax professional for official documentation.', margin + 5, yPos + 6);
                    doc.text('Akme Foundation is a registered 501(c)(3) non-profit organization. EIN: XX-XXXXXXX', margin + 5, yPos + 12);
                    yPos += 20;
                    const taxDonors = metrics.topDonors.filter(d => d.totalDonated >= 250);
                    const taxData = taxDonors.slice(0, 40).map((donor, i) => [
                        i + 1, donor.fullName.substring(0, 25), donor.email.substring(0, 28),
                        '$' + Math.round(donor.totalDonated).toLocaleString(), donor.donationCount
                    ]);
                    doc.autoTable({
                        startY: yPos,
                        head: [['#', 'Donor Name', 'Email', 'Total Contributions', 'Number of Gifts']],
                        body: taxData,
                        headStyles: { fillColor: [8, 84, 160], textColor: 255, fontStyle: 'bold', fontSize: 8 },
                        alternateRowStyles: { fillColor: [245, 247, 250] },
                        styles: { fontSize: 8, cellPadding: 2 },
                        columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'center' } },
                        margin: { left: margin, right: margin }
                    });
                    break;

                case 'forecast':
                    yPos = addSectionTitle('DONATION FORECAST & PROJECTIONS', yPos);
                    const avgMonthly = metrics.totalRevenue / 24;
                    const forecastData = [
                        ['Average Monthly Revenue (24 mo)', '$' + Math.round(avgMonthly).toLocaleString()],
                        ['Projected Next Month', '$' + Math.round(avgMonthly * 1.02).toLocaleString() + ' (+2%)'],
                        ['Projected Next Quarter', '$' + Math.round(avgMonthly * 3 * 1.05).toLocaleString() + ' (+5%)'],
                        ['Projected Next 6 Months', '$' + Math.round(avgMonthly * 6 * 1.08).toLocaleString() + ' (+8%)'],
                        ['Projected Annual (if trend continues)', '$' + Math.round(avgMonthly * 12 * 1.10).toLocaleString() + ' (+10%)']
                    ];
                    doc.autoTable({
                        startY: yPos, body: forecastData,
                        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 }, 1: { halign: 'right', cellWidth: 60 } },
                        styles: { fontSize: 10, cellPadding: 5 },
                        margin: { left: margin, right: margin }
                    });
                    yPos = doc.lastAutoTable.finalY + 15;
                    yPos = addSectionTitle('RISK ANALYSIS', yPos);
                    const riskData = [
                        ['At-Risk Donors', metrics.atRiskDonors.length.toString()],
                        ['Potential Revenue at Risk', '$' + Math.round(metrics.avgLifetimeValue * metrics.atRiskDonors.length).toLocaleString()],
                        ['Recommended Recovery Target (30%)', '$' + Math.round(metrics.avgLifetimeValue * metrics.atRiskDonors.length * 0.3).toLocaleString()]
                    ];
                    doc.autoTable({
                        startY: yPos, body: riskData,
                        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 }, 1: { halign: 'right', cellWidth: 60 } },
                        styles: { fontSize: 10, cellPadding: 5 },
                        margin: { left: margin, right: margin }
                    });
                    break;

                default:
                    yPos = addSectionTitle('COMPLETE SUMMARY', yPos);
                    const summaryData = [
                        ['Total Revenue', '$' + Math.round(metrics.totalRevenue).toLocaleString()],
                        ['Total Donors', metrics.totalDonors.toLocaleString()],
                        ['Total Donations', metrics.totalDonations.toLocaleString()],
                        ['Average Donation', '$' + Math.round(metrics.avgDonation).toLocaleString()],
                        ['Average Lifetime Value', '$' + Math.round(metrics.avgLifetimeValue).toLocaleString()],
                        ['Retention Rate', metrics.retentionRate + '%'],
                        ['Repeat Donors', metrics.repeatDonors.toLocaleString()],
                        ['One-Time Donors', metrics.oneTimeDonors.toLocaleString()],
                        ['At-Risk Donors', metrics.atRiskDonors.length.toLocaleString()],
                        ['Active Campaigns', metrics.topCampaigns.length.toLocaleString()],
                        ['Causes Supported', metrics.topCauses.length.toLocaleString()]
                    ];
                    doc.autoTable({
                        startY: yPos, body: summaryData,
                        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 }, 1: { halign: 'right', cellWidth: 60 } },
                        styles: { fontSize: 10, cellPadding: 5 },
                        margin: { left: margin, right: margin }
                    });
            }
        },

        // ═══════════════════════════════════════════════════════════════════════
        // KPI CARDS UI
        // ═══════════════════════════════════════════════════════════════════════
        _renderKPICards: function () {
            const container = document.getElementById('kpiCards');
            if (!container) { setTimeout(() => this._renderKPICards(), 100); return; }
            const kpis = rawAnalyticsData?.kpis || {};
            const cards = [
                { key: 'totalDonations', label: 'Total Donations', icon: '💰', color: '#0854A0' },
                { key: 'totalDonors', label: 'Total Donors', icon: '👥', color: '#107E3E' },
                { key: 'avgDonation', label: 'Average Donation', icon: '📊', color: '#E9730C' },
                { key: 'yoyGrowth', label: 'YoY Growth', icon: '📈', color: '#0A6ED1' }
            ];
            container.innerHTML = cards.map(card => `
                <div style="background:linear-gradient(135deg,${card.color}15 0%,${card.color}05 100%);border-left:4px solid ${card.color};border-radius:8px;padding:20px;min-width:220px;flex:1;box-shadow:0 2px 8px rgba(0,0,0,0.08);transition:transform 0.2s" onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform='translateY(0)'">
                    <div style="font-size:24px;margin-bottom:12px">${card.icon}</div>
                    <div style="font-size:28px;font-weight:700;color:#1D2D3E">${kpis[card.key] || '--'}</div>
                    <div style="font-size:13px;color:#5E6C77">${card.label}</div>
                </div>
            `).join('');
        },

        _updateQuickInsights: function () {
            const metrics = this._computeAllMetrics();
            this.byId("insightRetention")?.setNumber(metrics.retentionRate);
            this.byId("insightLTV")?.setNumber(Math.round(metrics.avgLifetimeValue).toLocaleString());
            this.byId("insightFrequency")?.setNumber((metrics.totalDonations / metrics.totalDonors).toFixed(1));
            this.byId("insightAtRisk")?.setNumber(metrics.atRiskDonors.length);
            this.byId("insightGrowth")?.setNumber('+0');
        },

        _updateLastUpdated: function () {
            this.byId("lastUpdatedLabel")?.setText("Last updated: " + new Date().toLocaleString());
        },

        _updateAIContextStats: function () {
            const metrics = this._computeAllMetrics();
            this.byId("aiStatDonationsNum")?.setNumber('$' + Math.round(metrics.totalRevenue).toLocaleString());
            this.byId("aiStatDonorsNum")?.setNumber(metrics.totalDonors.toString());
            this.byId("aiStatCampaignsNum")?.setNumber(metrics.topCampaigns.length.toString());
            this.byId("aiStatPeriodNum")?.setNumber("24");
        },

        _populateFilters: function () {
            const metrics = this._computeAllMetrics();
            const campaignFilter = this.byId("campaignFilter");
            if (campaignFilter) {
                campaignFilter.removeAllItems();
                metrics.topCampaigns.forEach(c => campaignFilter.addItem(new Item({ key: c.name, text: c.name })));
            }
            const causeFilter = this.byId("causeFilter");
            if (causeFilter) {
                causeFilter.removeAllItems();
                metrics.topCauses.forEach(c => causeFilter.addItem(new Item({ key: c.name, text: c.name })));
            }
        },

        onFilterChange: function () { MessageToast.show("Applying filters..."); },
        
        onResetFilters: function () {
            this.byId("dateFrom")?.setValue("");
            this.byId("dateTo")?.setValue("");
            this.byId("campaignFilter")?.setSelectedKeys([]);
            this.byId("causeFilter")?.setSelectedKeys([]);
            MessageToast.show("Filters reset");
        },
        
        onRefreshData: function () { 
            MessageToast.show("Refreshing..."); 
            this._loadAllData(); 
        },
        
        onAutoRefreshChange: function (e) {
            if (e.getParameter("state")) {
                autoRefreshInterval = setInterval(() => this._loadAllData(), 60000);
                MessageToast.show("Auto-refresh enabled (60s)");
            } else {
                clearInterval(autoRefreshInterval);
                MessageToast.show("Auto-refresh disabled");
            }
        },

        // ═══════════════════════════════════════════════════════════════════════
        // CHARTS
        // ═══════════════════════════════════════════════════════════════════════
        _renderAllCharts: function () {
            if (!chartJsLoaded || !window.Chart || !rawAnalyticsData) return;
            setTimeout(() => {
                this._renderTrendsChart();
                this._renderCampaignsChart();
                this._renderCausesChart();
                this._renderSegmentsChart();
                this._renderQuarterlyChart();
                this._renderForecastChart();
                this._renderGaugeChart();
            }, 200);
        },

        _renderTrendsChart: function () {
            const ctx = document.getElementById('trendsChart');
            if (!ctx) return;
            if (trendsChart) trendsChart.destroy();
            const trends = rawAnalyticsData?.trends || {};
            trendsChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: trends.labels || [],
                    datasets: [
                        { label: '2025', data: trends.currentYear || [], borderColor: '#0854A0', backgroundColor: 'rgba(8,84,160,0.1)', fill: true, tension: 0.4 },
                        { label: '2024', data: trends.previousYear || [], borderColor: '#E9730C', backgroundColor: 'rgba(233,115,12,0.1)', fill: true, tension: 0.4 }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        },

        _renderCampaignsChart: function () {
            const ctx = document.getElementById('campaignsChart');
            if (!ctx) return;
            if (campaignsChart) campaignsChart.destroy();
            const campaigns = rawAnalyticsData?.campaigns || {};
            campaignsChart = new Chart(ctx, {
                type: 'bar',
                data: { labels: campaigns.labels || [], datasets: [{ data: campaigns.data || [], backgroundColor: ['#0854A0', '#107E3E', '#E9730C', '#BB0000', '#6C32A4'] }] },
                options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } }
            });
        },

        _renderCausesChart: function () {
            const ctx = document.getElementById('causesChart');
            if (!ctx) return;
            if (causesChart) causesChart.destroy();
            const causes = rawAnalyticsData?.causes || {};
            causesChart = new Chart(ctx, {
                type: 'doughnut',
                data: { labels: causes.labels || [], datasets: [{ data: causes.data || [], backgroundColor: ['#0854A0', '#107E3E', '#E9730C', '#BB0000', '#6C32A4'] }] },
                options: { responsive: true, maintainAspectRatio: false }
            });
        },

        _renderSegmentsChart: function () {
            const ctx = document.getElementById('segmentsChart');
            if (!ctx) return;
            if (segmentsChart) segmentsChart.destroy();
            const segments = rawAnalyticsData?.segments || {};
            segmentsChart = new Chart(ctx, {
                type: 'polarArea',
                data: { labels: segments.labels || [], datasets: [{ data: segments.data || [], backgroundColor: ['#107E3E99', '#0854A099', '#E9730C99', '#0A6ED199', '#BB000099'] }] },
                options: { responsive: true, maintainAspectRatio: false }
            });
        },

        _renderQuarterlyChart: function () {
            const ctx = document.getElementById('quarterlyChart');
            if (!ctx) return;
            if (quarterlyChart) quarterlyChart.destroy();
            const quarterly = rawAnalyticsData?.quarterly || {};
            quarterlyChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: quarterly.labels || [],
                    datasets: [
                        { label: '2025', data: quarterly.currentYear || [], backgroundColor: '#0854A0' },
                        { label: '2024', data: quarterly.previousYear || [], backgroundColor: '#E9730C' }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        },

        _renderForecastChart: function () {
            const ctx = document.getElementById('forecastChart');
            if (!ctx) return;
            if (forecastChart) forecastChart.destroy();
            const trends = rawAnalyticsData?.trends || {};
            const historical = trends.currentYear || [];
            const avg = historical.reduce((a, b) => a + b, 0) / 12;
            const forecast = Array.from({ length: 6 }, (_, i) => Math.round(avg * (1 + 0.02 * i)));
            const month = new Date().getMonth();
            const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            forecastChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [...labels.slice(0, month + 1), ...Array.from({ length: 6 }, (_, i) => labels[(month + i + 1) % 12])],
                    datasets: [
                        { label: 'Actual', data: [...historical.slice(0, month + 1), ...Array(6).fill(null)], borderColor: '#0854A0', tension: 0.4 },
                        { label: 'Forecast', data: [...Array(month).fill(null), historical[month], ...forecast], borderColor: '#107E3E', borderDash: [5, 5], tension: 0.4 }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        },

        _renderGaugeChart: function () {
            const ctx = document.getElementById('gaugeChart');
            if (!ctx) return;
            if (gaugeChart) gaugeChart.destroy();
            const kpis = rawAnalyticsData?.kpis || {};
            const total = parseInt((kpis.totalDonations || '$0').replace(/[$,]/g, '')) || 0;
            const goal = 1000000;
            const pct = Math.min(100, Math.round((total / goal) * 100));
            gaugeChart = new Chart(ctx, {
                type: 'doughnut',
                data: { datasets: [{ data: [pct, 100 - pct], backgroundColor: ['#0854A0', '#E5E5E5'], circumference: 180, rotation: 270 }] },
                options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { display: false } } },
                plugins: [{
                    id: 'txt', afterDraw: ch => {
                        const { ctx: c, width: w, height: h } = ch;
                        c.save(); c.font = 'bold 32px Arial'; c.fillStyle = '#1D2D3E'; c.textAlign = 'center';
                        c.fillText(pct + '%', w / 2, h - 40);
                        c.font = '14px Arial'; c.fillStyle = '#5E6C77';
                        c.fillText('of $1M goal', w / 2, h - 15); c.restore();
                    }
                }]
            });
        },

        // ═══════════════════════════════════════════════════════════════════════
        // TABLES
        // ═══════════════════════════════════════════════════════════════════════
        _loadTopDonorsTable: function () {
            const table = this.byId("topDonorsTable");
            if (!table) return;
            table.removeAllItems();
            const metrics = this._computeAllMetrics();
            metrics.topDonors.slice(0, 10).forEach((donor, i) => {
                table.addItem(new ColumnListItem({
                    cells: [
                        new Text({ text: (i + 1).toString() }),
                        new Text({ text: donor.fullName.substring(0, 25) }),
                        new Text({ text: '$' + Math.round(donor.totalDonated).toLocaleString() }),
                        new Text({ text: donor.donationCount.toString() }),
                        new ObjectStatus({ text: donor.tier.icon + ' ' + donor.tier.name, state: donor.tier.level >= 4 ? 'Success' : 'Information' })
                    ]
                }));
            });
        },

        _loadAtRiskDonorsTable: function () {
            const table = this.byId("atRiskTable");
            if (!table) return;
            table.removeAllItems();
            const metrics = this._computeAllMetrics();
            metrics.atRiskDonors.slice(0, 10).forEach(donor => {
                table.addItem(new ColumnListItem({
                    cells: [
                        new Text({ text: donor.fullName.substring(0, 25) }),
                        new Text({ text: donor.lastDonation?.toLocaleDateString() || 'N/A' }),
                        new ObjectStatus({ text: donor.daysInactive.toString(), state: 'Error' }),
                        new Button({ text: "Reach Out", type: "Emphasized", press: () => MessageBox.info(`Contact: ${donor.fullName}\nEmail: ${donor.email}\nPhone: ${donor.phone}`) })
                    ]
                }));
            });
        },

        onCloseDrillDown: function () { 
            this.byId("drillDownDialog")?.close(); 
        },

        // ═══════════════════════════════════════════════════════════════════════
        // EXPORT HANDLERS - DASHBOARD
        // ═══════════════════════════════════════════════════════════════════════
        onExportPDF: function () {
            MessageToast.show("Generating professional PDF...");
            const doc = this._generateProfessionalPDF('Dashboard Analytics Report', 'summary');
            if (doc) {
                doc.save('Akme_Dashboard_' + new Date().toISOString().split('T')[0] + '.pdf');
                MessageToast.show("PDF downloaded successfully");
            }
        },

        onExportExcel: function () {
            if (!xlsxLoaded || !window.XLSX) { 
                MessageToast.show("Excel library not loaded"); 
                return; 
            }
            const wb = XLSX.utils.book_new();
            const metrics = this._computeAllMetrics();
            const summaryData = [
                ['AKME FOUNDATION - ANALYTICS EXPORT'],
                ['Generated: ' + new Date().toLocaleString()],
                [],
                ['KEY METRICS'],
                ['Total Revenue', metrics.totalRevenue],
                ['Total Donors', metrics.totalDonors],
                ['Total Donations', metrics.totalDonations],
                ['Average Donation', metrics.avgDonation],
                ['Retention Rate', metrics.retentionRate + '%'],
                ['At-Risk Donors', metrics.atRiskDonors.length]
            ];
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Summary');
            const donorData = [['Name', 'Email', 'Total Donated', 'Count', 'Avg', 'First', 'Last', 'Tier']];
            metrics.topDonors.forEach(d => donorData.push([d.fullName, d.email, d.totalDonated, d.donationCount, d.avgDonation, d.firstDonation?.toLocaleDateString(), d.lastDonation?.toLocaleDateString(), d.tier.name]));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(donorData), 'Donors');
            const campData = [['Campaign', 'Total Raised', 'Donations', 'Donors', 'Avg']];
            metrics.topCampaigns.forEach(c => campData.push([c.name, c.totalRaised, c.donationCount, c.uniqueDonors, c.avgDonation]));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(campData), 'Campaigns');
            XLSX.writeFile(wb, 'Akme_Export_' + new Date().toISOString().split('T')[0] + '.xlsx');
            MessageToast.show("Excel downloaded");
        },

        onExportPNG: function () {
            ['trendsChart', 'campaignsChart', 'causesChart', 'quarterlyChart'].forEach(id => {
                const canvas = document.getElementById(id);
                if (canvas) { 
                    const a = document.createElement('a'); 
                    a.download = 'Akme_' + id + '.png'; 
                    a.href = canvas.toDataURL(); 
                    a.click(); 
                }
            });
            MessageToast.show("Charts exported");
        },

        // ═══════════════════════════════════════════════════════════════════════
        // AI REPORTS
        // ═══════════════════════════════════════════════════════════════════════
        onGenerateAllReports: function () { 
            this.onGenerateExecSummary(); 
        },
        
        onGenerateExecSummary: function () { 
            this._generateAIReport("Executive Summary", "exec"); 
        },
        
        onGenerateDonorInsights: function () { 
            this._generateAIReport("Donor Insights", "donor"); 
        },
        
        onGenerateCampaignAnalysis: function () { 
            this._generateAIReport("Campaign Analysis", "campaign"); 
        },
        
        onGeneratePredictions: function () { 
            this._generateAIReport("Predictions & Trends", "predict"); 
        },
        
        onGenerateRecommendations: function () { 
            this._generateAIReport("Recommendations", "recommend"); 
        },

        _generateAIReport: function (title, type) {
            this.byId("aiLoadingBox")?.setVisible(true);
            currentReportTitle = title;
            currentReportType = type;
            setTimeout(() => {
                document.getElementById('aiReportContent').innerHTML = this._buildAIReportHTML(title, type);
                this.byId("aiLoadingBox")?.setVisible(false);
                MessageToast.show(title + " generated from database");
            }, 800);
        },

        _buildAIReportHTML: function (title, type) {
            const m = this._computeAllMetrics();
            const date = m.reportDate;
            let content = '';
            
            const header = `
                <div style="font-family:'Segoe UI',Arial;max-width:900px;margin:0 auto">
                    <div style="background:linear-gradient(135deg,#0854A0,#0A6ED1);color:white;padding:25px;border-radius:8px 8px 0 0;margin:-20px -20px 20px">
                        <h1 style="margin:0;font-size:26px">📊 ${title}</h1>
                        <p style="margin:8px 0 0;opacity:0.9">Akme Foundation | ${date}</p>
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
                        <div style="background:#e8f5e9;padding:12px;border-radius:8px;text-align:center"><div style="font-size:18px;font-weight:bold;color:#107E3E">$${Math.round(m.totalRevenue).toLocaleString()}</div><div style="color:#666;font-size:10px">Revenue</div></div>
                        <div style="background:#e3f2fd;padding:12px;border-radius:8px;text-align:center"><div style="font-size:18px;font-weight:bold;color:#0854A0">${m.totalDonors}</div><div style="color:#666;font-size:10px">Donors</div></div>
                        <div style="background:#fff3e0;padding:12px;border-radius:8px;text-align:center"><div style="font-size:18px;font-weight:bold;color:#E9730C">${m.retentionRate}%</div><div style="color:#666;font-size:10px">Retention</div></div>
                        <div style="background:#ffebee;padding:12px;border-radius:8px;text-align:center"><div style="font-size:18px;font-weight:bold;color:#BB0000">${m.atRiskDonors.length}</div><div style="color:#666;font-size:10px">At-Risk</div></div>
                    </div>
            `;

            if (type === 'exec') {
                content = `<div style="background:#f8f9fa;padding:20px;border-radius:8px;margin-bottom:20px"><h3 style="color:#0854A0;margin-top:0">🎯 Executive Overview</h3><p>Total revenue of <b>$${Math.round(m.totalRevenue).toLocaleString()}</b> from <b>${m.totalDonors}</b> donors. Average donation: <b>$${Math.round(m.avgDonation).toLocaleString()}</b>. Retention rate: <b>${m.retentionRate}%</b> with <b>${m.atRiskDonors.length}</b> donors at risk.</p></div>
                <h3>🏆 Top 5 Donors</h3>
                <table style="width:100%;border-collapse:collapse;margin-bottom:20px"><tr style="background:#0854A0;color:white"><th style="padding:8px">Name</th><th style="padding:8px;text-align:right">Total</th><th style="padding:8px">Tier</th></tr>${m.topDonors.slice(0, 5).map((d, i) => `<tr style="background:${i % 2 ? 'white' : '#f9f9f9'}"><td style="padding:8px">${d.fullName}</td><td style="padding:8px;text-align:right">$${Math.round(d.totalDonated).toLocaleString()}</td><td style="padding:8px;text-align:center">${d.tier.icon} ${d.tier.name}</td></tr>`).join('')}</table>
                <h3>📈 Top 5 Campaigns</h3>
                <table style="width:100%;border-collapse:collapse"><tr style="background:#0854A0;color:white"><th style="padding:8px">Campaign</th><th style="padding:8px;text-align:right">Amount</th><th style="padding:8px;text-align:right">%</th></tr>${m.topCampaigns.slice(0, 5).map((c, i) => `<tr style="background:${i % 2 ? 'white' : '#f9f9f9'}"><td style="padding:8px">${c.name}</td><td style="padding:8px;text-align:right">$${Math.round(c.totalRaised).toLocaleString()}</td><td style="padding:8px;text-align:right">${c.percentOfTotal.toFixed(1)}%</td></tr>`).join('')}</table>`;
            } else if (type === 'donor') {
                content = `<h3>👥 Donor Analysis</h3><p>Total: <b>${m.totalDonors}</b> | Repeat: <b>${m.repeatDonors}</b> (${m.retentionRate}%) | One-time: <b>${m.oneTimeDonors}</b> | At-Risk: <b>${m.atRiskDonors.length}</b></p>
                <p>Avg LTV: <b>$${Math.round(m.avgLifetimeValue).toLocaleString()}</b> | Avg Donation: <b>$${Math.round(m.avgDonation).toLocaleString()}</b></p>`;
            } else if (type === 'campaign') {
                content = `<h3>🎯 Campaign Performance</h3><table style="width:100%;border-collapse:collapse"><tr style="background:#0854A0;color:white"><th style="padding:8px">Campaign</th><th style="padding:8px;text-align:right">Raised</th><th style="padding:8px;text-align:right">Donors</th><th style="padding:8px;text-align:right">%</th></tr>${m.topCampaigns.map((c, i) => `<tr style="background:${i % 2 ? 'white' : '#f9f9f9'}"><td style="padding:8px">${c.name}</td><td style="padding:8px;text-align:right">$${Math.round(c.totalRaised).toLocaleString()}</td><td style="padding:8px;text-align:right">${c.uniqueDonors}</td><td style="padding:8px;text-align:right">${c.percentOfTotal.toFixed(1)}%</td></tr>`).join('')}</table>`;
            } else if (type === 'predict') {
                const avg = m.totalRevenue / 24;
                content = `<h3>🔮 Forecast</h3><div style="background:#e3f2fd;padding:20px;border-radius:8px"><p>Avg Monthly: <b>$${Math.round(avg).toLocaleString()}</b></p><p>Next Quarter: <b>$${Math.round(avg * 3 * 1.05).toLocaleString()}</b> (+5%)</p><p>Next 6 Months: <b>$${Math.round(avg * 6 * 1.08).toLocaleString()}</b> (+8%)</p></div>
                <h3 style="margin-top:20px">⚠️ Risks</h3><div style="background:#ffebee;padding:20px;border-radius:8px"><p><b>${m.atRiskDonors.length}</b> donors at risk | Potential loss: <b>$${Math.round(m.avgLifetimeValue * m.atRiskDonors.length).toLocaleString()}</b></p></div>`;
            } else {
                content = `<h3>💡 Recommendations</h3>
                <div style="background:#e8f5e9;padding:15px;border-radius:8px;margin-bottom:10px;border-left:4px solid #107E3E"><h4 style="color:#107E3E;margin:0">1. Re-engage At-Risk Donors</h4><p>${m.atRiskDonors.length} donors inactive. Recovery potential: $${Math.round(m.avgDonation * m.atRiskDonors.length * 0.3).toLocaleString()}</p></div>
                <div style="background:#fff3e0;padding:15px;border-radius:8px;margin-bottom:10px;border-left:4px solid #E9730C"><h4 style="color:#E9730C;margin:0">2. Upgrade Mid-Level Donors</h4><p>Focus on $5K-$25K segment for major gift cultivation</p></div>
                <div style="background:#e3f2fd;padding:15px;border-radius:8px;border-left:4px solid #0854A0"><h4 style="color:#0854A0;margin:0">3. Launch Monthly Giving</h4><p>Convert one-time donors to recurring</p></div>`;
            }

            return header + content + `<div style="margin-top:25px;padding-top:15px;border-top:1px solid #ddd;color:#888;font-size:10px;text-align:center">Data: ${m.totalDonations.toLocaleString()} donations from ${m.totalDonors.toLocaleString()} donors</div></div>`;
        },

        onCopyReport: function () { 
            navigator.clipboard.writeText(document.getElementById('aiReportContent')?.innerText || ''); 
            MessageToast.show("Copied"); 
        },
        
        onExportReportPDF: function () { 
            const doc = this._generateProfessionalPDF(currentReportTitle || 'AI Report', 'summary'); 
            if (doc) doc.save('Akme_AI_Report.pdf'); 
        },
        
        onExportReportWord: function () { 
            const blob = new Blob(['<html><body>' + (document.getElementById('aiReportContent')?.innerHTML || '') + '</body></html>'], { type: 'application/msword' }); 
            const a = document.createElement('a'); 
            a.href = URL.createObjectURL(blob); 
            a.download = 'Akme_Report.doc'; 
            a.click(); 
        },

        // ═══════════════════════════════════════════════════════════════════════
        // FUNCTIONAL REPORTS
        // ═══════════════════════════════════════════════════════════════════════
        onGenerateDonorListReport: function () { 
            this._generateFunctionalReport("Donor List Report", "donorList"); 
        },
        
        onGenerateDonorActivityReport: function () { 
            this._generateFunctionalReport("Donor Activity Report", "donorActivity"); 
        },
        
        onGenerateRetentionReport: function () { 
            this._generateFunctionalReport("Retention Analysis", "retention"); 
        },
        
        onGenerateSegmentReport: function () { 
            this._generateFunctionalReport("Segment Analysis", "segment"); 
        },
        
        onGenerateTopDonorsReport: function () { 
            this._generateFunctionalReport("Top Donors Report", "topDonors"); 
        },
        
        onGenerateCampaignSummaryReport: function () { 
            this._generateFunctionalReport("Campaign Summary", "campaignSummary"); 
        },
        
        onGenerateCampaignPerformanceReport: function () { 
            this._generateFunctionalReport("Campaign Performance", "campaignPerformance"); 
        },
        
        onGenerateCampaignROIReport: function () { 
            this._generateFunctionalReport("Campaign ROI", "campaignROI"); 
        },
        
        onGenerateCauseReport: function () { 
            this._generateFunctionalReport("Cause Breakdown", "causeBreakdown"); 
        },
        
        onGenerateYoYReport: function () { 
            this._generateFunctionalReport("Year-over-Year", "yoy"); 
        },
        
        onGenerateMonthlyRevenueReport: function () { 
            this._generateFunctionalReport("Monthly Revenue", "monthlyRevenue"); 
        },
        
        onGenerateQuarterlyReport: function () { 
            this._generateFunctionalReport("Quarterly Report", "quarterly"); 
        },
        
        onGenerateAnnualReport: function () { 
            this._generateFunctionalReport("Annual Summary", "annual"); 
        },
        
        onGenerateForecastReport: function () { 
            this._generateFunctionalReport("Forecast Report", "forecast"); 
        },
        
        onGenerateTaxReport: function () { 
            this._generateFunctionalReport("Tax Summary", "tax"); 
        },

        _generateFunctionalReport: function (title, type) {
            this.byId("reportLoadingBox")?.setVisible(true);
            currentReportTitle = title;
            currentReportType = type;
            setTimeout(() => {
                document.getElementById('reportOutputContent').innerHTML = this._buildFunctionalReportHTML(title, type);
                this.byId("reportLoadingBox")?.setVisible(false);
                MessageToast.show(title + " generated from database");
            }, 500);
        },

        _buildFunctionalReportHTML: function (title, type) {
            const m = this._computeAllMetrics();
            let table = '';
            if (type === 'donorList' || type === 'topDonors') {
                const list = m.topDonors.slice(0, type === 'topDonors' ? 20 : 50);
                table = `<table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="background:#0854A0;color:white"><th style="padding:8px">#</th><th style="padding:8px">Name</th><th style="padding:8px">Email</th><th style="padding:8px;text-align:right">Total</th><th style="padding:8px">Count</th><th style="padding:8px">Tier</th></tr>${list.map((d, i) => `<tr style="background:${i % 2 ? 'white' : '#f9f9f9'}"><td style="padding:6px;text-align:center">${i + 1}</td><td style="padding:6px">${d.fullName}</td><td style="padding:6px">${d.email}</td><td style="padding:6px;text-align:right">$${Math.round(d.totalDonated).toLocaleString()}</td><td style="padding:6px;text-align:center">${d.donationCount}</td><td style="padding:6px;text-align:center">${d.tier.icon} ${d.tier.name}</td></tr>`).join('')}</table>`;
            } else if (type.includes('campaign')) {
                table = `<table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="background:#0854A0;color:white"><th style="padding:8px">Campaign</th><th style="padding:8px;text-align:right">Raised</th><th style="padding:8px;text-align:right">Donations</th><th style="padding:8px;text-align:right">Donors</th><th style="padding:8px;text-align:right">%</th></tr>${m.topCampaigns.map((c, i) => `<tr style="background:${i % 2 ? 'white' : '#f9f9f9'}"><td style="padding:6px">${c.name}</td><td style="padding:6px;text-align:right">$${Math.round(c.totalRaised).toLocaleString()}</td><td style="padding:6px;text-align:right">${c.donationCount}</td><td style="padding:6px;text-align:right">${c.uniqueDonors}</td><td style="padding:6px;text-align:right">${c.percentOfTotal.toFixed(1)}%</td></tr>`).join('')}</table>`;
            } else {
                table = `<table style="width:100%;font-size:12px"><tr style="background:#f5f5f5"><td style="padding:10px"><b>Total Revenue</b></td><td style="padding:10px;text-align:right">$${Math.round(m.totalRevenue).toLocaleString()}</td></tr><tr><td style="padding:10px"><b>Total Donors</b></td><td style="padding:10px;text-align:right">${m.totalDonors}</td></tr><tr style="background:#f5f5f5"><td style="padding:10px"><b>Total Donations</b></td><td style="padding:10px;text-align:right">${m.totalDonations}</td></tr><tr><td style="padding:10px"><b>Retention Rate</b></td><td style="padding:10px;text-align:right">${m.retentionRate}%</td></tr></table>`;
            }

            return `<div style="font-family:'Segoe UI',Arial">
                <div style="display:flex;justify-content:space-between;border-bottom:3px solid #0854A0;padding-bottom:15px;margin-bottom:15px">
                    <div><h2 style="color:#0854A0;margin:0">${title}</h2><p style="color:#666;margin:5px 0 0">${m.reportDate}</p></div>
                    <div style="text-align:right"><div style="font-size:18px;font-weight:bold;color:#0854A0">AKME FOUNDATION</div></div>
                </div>
                <div style="background:#f0f7ff;padding:12px;border-radius:8px;margin-bottom:15px;display:flex;justify-content:space-around;text-align:center">
                    <div><div style="font-size:16px;font-weight:bold;color:#0854A0">$${Math.round(m.totalRevenue).toLocaleString()}</div><div style="color:#666;font-size:10px">Revenue</div></div>
                    <div><div style="font-size:16px;font-weight:bold;color:#107E3E">${m.totalDonors}</div><div style="color:#666;font-size:10px">Donors</div></div>
                    <div><div style="font-size:16px;font-weight:bold;color:#E9730C">${m.totalDonations}</div><div style="color:#666;font-size:10px">Donations</div></div>
                    <div><div style="font-size:16px;font-weight:bold;color:#6C32A4">${m.retentionRate}%</div><div style="color:#666;font-size:10px">Retention</div></div>
                </div>
                ${table}
            </div>`;
        },

        onPrintReport: function () { 
            const w = window.open('', '', 'width=900,height=700'); 
            w.document.write('<html><head><title>' + currentReportTitle + '</title></head><body>' + (document.getElementById('reportOutputContent')?.innerHTML || '') + '</body></html>'); 
            w.document.close(); 
            w.print(); 
        },
        
        onExportReportExcel: function () {
            if (!xlsxLoaded) { 
                MessageToast.show("Excel not loaded"); 
                return; 
            }
            const wb = XLSX.utils.book_new();
            const m = this._computeAllMetrics();
            const data = [['Name', 'Email', 'Total', 'Count', 'Tier']];
            m.topDonors.forEach(d => data.push([d.fullName, d.email, d.totalDonated, d.donationCount, d.tier.name]));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'Report');
            XLSX.writeFile(wb, 'Akme_Report.xlsx');
        },
        
        onExportReportPDF2: function () {
            MessageToast.show("Generating professional PDF...");
            const doc = this._generateProfessionalPDF(currentReportTitle || 'Report', currentReportType || 'summary');
            if (doc) {
                doc.save('Akme_' + (currentReportTitle || 'Report').replace(/\s+/g, '_') + '.pdf');
                MessageToast.show("PDF downloaded");
            }
        },
        
        onCreateSchedule: function () { 
            MessageBox.info("Scheduled Reports feature coming soon!"); 
        },

        // ═══════════════════════════════════════════════════════════════════════
        // UTILITIES
        // ═══════════════════════════════════════════════════════════════════════
        _parseDate: function (value) {
            if (!value || value === 'null') return null;
            if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
            const str = String(value).trim().split(' ')[0].split('T')[0];
            const sep = str.includes('/') ? '/' : str.includes('-') ? '-' : null;
            if (sep) {
                const parts = str.split(sep).map(x => parseInt(x, 10));
                if (parts.length === 3 && parts.every(x => !isNaN(x))) {
                    let [d, m, y] = parts[0] > 31 ? [parts[2], parts[1], parts[0]] : [parts[0], parts[1], parts[2]];
                    if (y < 100) y += y > 50 ? 1900 : 2000;
                    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) return new Date(y, m - 1, d);
                }
            }
            return null;
        },

        _generateDateFromIndex: function (index, total) {
            const seed = (index * 9301 + 49297) % 233280;
            const year = (seed / 233280) < 0.6 ? 2025 : 2024;
            const month = Math.floor(((index * 7919 + 12345) % 233280) / 233280 * 12);
            const day = 1 + Math.floor(((index * 3571 + 7777) % 233280) / 233280 * 28);
            return new Date(year, month, day);
        },

        onExit: function () {
            if (autoRefreshInterval) clearInterval(autoRefreshInterval);
            [trendsChart, campaignsChart, causesChart, segmentsChart, quarterlyChart, forecastChart, gaugeChart].forEach(c => c?.destroy());
        }
    });
});
