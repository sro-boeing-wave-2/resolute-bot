const Bot = require('./bot');
const socket = require('./socket.js');

module.exports = (async () => {
  const connection = await socket.createConnection();
  if (connection) {
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

    connection.onclose((error) => {
      console.log('Socket connection closed', error);
    });

    connection.on('Disconnected', (msg) => {
      console.log('Disconnected', msg);
    });
  }
  return connection;
})();
