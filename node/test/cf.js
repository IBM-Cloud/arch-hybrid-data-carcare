// See bin/www.js - this is testing the runningInCloudFoundry() code
describe('cf not expected', function () {
    it('cf load fails', function (done) {
        // cloud foundry initialization
        if (runningInCloudFoundry()) {
            done(Error('Not expecting cfenv to be resolved'));
        } else {
            done();
        }
    });
});

/**
 *
 * @returns {boolean} true if running in cloud foundry
 */
function runningInCloudFoundry() {
    if (process.env['CF_INSTANCE_IP']) {
        return true;
    }
    return false;
}

