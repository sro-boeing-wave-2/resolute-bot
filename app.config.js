module.exports = {
  RTM_HUB_URL: process.env.RTM_HUB_URL ? process.env.RTM_HUB_URL : 'http://localhost:5009/ChatHub',
  REDIS_URL: process.env.REDIS_URL ? process.env.REDIS_URL : 'redis://localhost',
  REDIS_HOST: process.env.REDIS_HOST ? process.env.REDIS_HOST : 'redis://localhost',
  REDIS_PORT: process.env.REDIS_PORT ? process.env.REDIS_PORT : 6379,
  BOT_NAME: 'ResoluteBot',
  BOT_EMAILID: 'bot@resolute.com  ',
  SOLUTION_EXPLORER_API: process.env.SOLUTION_EXPLORER_API ? process.env.SOLUTION_EXPLORER_API : 'http://172.23.238.239:8081/api/solution',
};
