module.exports = {
  RTM_HUB_URL: process.env.RTM_HUB_URL ? process.env.RTM_HUB_URL : 'http://localhost:8081/chathub',
  REDIS_URL: process.env.REDIS_URL ? process.env.REDIS_URL : 'redis://localhost',
};
