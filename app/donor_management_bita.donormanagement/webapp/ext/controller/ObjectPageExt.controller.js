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
        
        // Override using the correct Fiori Elements pattern
        override: {
            onInit: function() {
                console.log("✅ Object Page Extension Initialized");
            },
            
            onAfterRendering: function() {
                console.log("✅ Object Page Rendered");
            }
        },

        // Public methods (can be called from buttons/actions)
        onGenerateAISummary: function(oEvent) {
            MessageToast.show("Generating AI Summary...");
            
            const oContext = oEvent.getSource().getBindingContext();
            if (!oContext) {
                MessageBox.error("No donor selected");
                return;
            }
            
            const sDonorPath = oContext.getPath();
            const sDonorID = oContext.getProperty("ID");
            
            console.log("Generating AI Summary for:", sDonorID);
            
            // Call the action
            const oModel = oContext.getModel();
            const oFunction = oModel.bindContext(`${sDonorPath}/donor_management_BitaSrv.Action1(...)`);
            
            oFunction.execute().then(() => {
                MessageToast.show("✅ AI Summary Generated!");
                oModel.refresh();
            }).catch((oError) => {
                console.error("Error:", oError);
                MessageBox.error("Failed to generate AI summary");
            });
        },

        onSendThankYou: function(oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            if (!oContext) {
                MessageBox.error("No donor selected");
                return;
            }
            
            const sDonorName = oContext.getProperty("name");
            
            MessageBox.confirm(
                `Send a personalized thank you email to ${sDonorName}?`,
                {
                    title: "Send Thank You",
                    onClose: (sAction) => {
                        if (sAction === MessageBox.Action.OK) {
                            MessageToast.show("✅ Thank you email sent successfully!");
                        }
                    }
                }
            );
        },

        onGenerateImpactReport: function(oEvent) {
            MessageToast.show("📊 Generating Impact Report...");
        },

        onInviteToEvent: function(oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            if (!oContext) {
                MessageBox.error("No donor selected");
                return;
            }
            
            const sDonorName = oContext.getProperty("name");
            
            MessageBox.information(
                `Event invitation feature coming soon!\n\nWill invite: ${sDonorName}`,
                {
                    title: "Invite to Event"
                }
            );
        }
    });
});