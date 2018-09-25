const Bot = require('./bot');
const socket = require('./socket.js');

module.exports = (async () => {
  const connection = await socket.createConnection();

  connection.invoke('RegisterBotFactory');

  connection.on('Acknowledgement', (message) => {
    console.log(`Registered as Factory, ${message}`);
  });

  connection.on('AllocateMeABot', async (threadId, problem) => {
    try {
      await new Bot(threadId, problem).init();
    } catch (err) {
      console.log('error', err);
      console.log('Catching the Bot');
    }
  });

  return connection;
})();
