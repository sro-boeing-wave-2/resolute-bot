require('should');
const appConfig = require('../app.config');

describe('Needs app.config', () => {
  it('Should have app.config with property RTM_HUB_URL', () => {
    appConfig.should.have.property('RTM_HUB_URL');
    appConfig.RTM_HUB_URL.should.not.be.empty();
    appConfig.RTM_HUB_URL.should.be.an.instanceOf(String);
  });
});
