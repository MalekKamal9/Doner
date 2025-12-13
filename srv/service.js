const LCAPApplicationService = require('@sap/low-code-event-handler');
const donors_Logic = require('./code/donors-logic');
const action1_Logic = require('./code/action1-logic');
const { SendThankYou, ShareImpactReport, InviteToEvent } = require('./code/nextsteps-logic');

class donor_management_BitaSrv extends LCAPApplicationService {
    async init() {

        this.on('CREATE', 'Donors', async (request, next) => {
            return donors_Logic(request, next);
        });

        // Generate AI Summary
        this.on('Action1', 'Donors', async (request) => {
            return action1_Logic(request);
        });

        // Next Step Actions
        this.on('SendThankYou', 'Donors', async (request) => {
            return SendThankYou(request);
        });

        this.on('ShareImpactReport', 'Donors', async (request) => {
            return ShareImpactReport(request);
        });

        this.on('InviteToEvent', 'Donors', async (request) => {
            return InviteToEvent(request);
        });

        return super.init();
    }
}

module.exports = {
    donor_management_BitaSrv
};