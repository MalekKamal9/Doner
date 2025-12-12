const LCAPApplicationService = require('@sap/low-code-event-handler');
const donors_Logic = require('./code/donors-logic');
const action1_Logic = require('./code/action1-logic');

class donor_management_BitaSrv extends LCAPApplicationService {
    async init() {

        this.on('CREATE', 'Donors', async (request, next) => {
            return donors_Logic(request, next);
        });

        this.on('Action1', 'Donors', async (request) => {
            return action1_Logic(request);
        });

        return super.init();
    }
}

module.exports = {
    donor_management_BitaSrv
};
