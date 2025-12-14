sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"donormanagementbita/dashboard/test/integration/pages/DonorsMain"
], function (JourneyRunner, DonorsMain) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('donormanagementbita/dashboard') + '/test/flpSandbox.html#donormanagementbitadashboard-tile',
        pages: {
			onTheDonorsMain: DonorsMain
        },
        async: true
    });

    return runner;
});

