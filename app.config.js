module.exports = {
  RTM_HUB_URL: process.env.RTM_HUB_URL ? process.env.RTM_HUB_URL : 'http://172.23.239.83:8081/chathub',
  REDIS_URL: process.env.REDIS_URL ? process.env.REDIS_URL : 'redis://localhost',
  REDIS_PORT: process.env.REDIS_PORT ? process.env.REDIS_PORT : 6379,
  BOT_NAME: 'ResoluteBot',
  BOT_EMAILID: 'bot@resolute.com  ',
  SOLUTION_EXPLORER_API: 'http://172.23.239.83:8081/api/solution',
};
