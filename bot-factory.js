const Bot = require('./bot');
const socket = require('./socket.js');

module.exports = (async () => {
  const connection = await socket.createConnection();
  console.log(connection);
  if (connection) {
    console.log(connection);
    connection.invoke('RegisterBotFactory');
    console.log('invoked registerbotfactoy');
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

    connection.onclose((error) => {
      console.log('Socket connection closed', error);
      process.exit(1);
    });
  }
  return connection;
})();
