sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"donormanagementbita/donormanagement/test/integration/pages/DonorsList",
	"donormanagementbita/donormanagement/test/integration/pages/DonorsObjectPage"
], function (JourneyRunner, DonorsList, DonorsObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('donormanagementbita/donormanagement') + '/test/flpSandbox.html#donormanagementbitadonormanage-tile',
        pages: {
			onTheDonorsList: DonorsList,
			onTheDonorsObjectPage: DonorsObjectPage
        },
        async: true
    });

    return runner;
});

