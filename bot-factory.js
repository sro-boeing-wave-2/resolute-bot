const Bot = require('./bot');
const socket = require('./socket.js');
const { initJaegerTracer } = require('./tracing');

const tracer = initJaegerTracer('Resolute-Ansible-Bot');

module.exports = (async () => {
  const botFactoryTracer = tracer.startSpan('starting-factory');
  const connection = await socket.createConnection();
  if (connection) {
    const registerFactoryTracer = tracer.startSpan('register-factory');

    connection.invoke('RegisterBotFactory');

    connection.on('Acknowledgement', (message) => {
      registerFactoryTracer.log({ event: 'recieved-acknowledgement' });
      console.log(`Registered as Factory, ${message}`);
      registerFactoryTracer.finish();
    });

    connection.on('AllocateMeABot', async (threadId, problem) => {
      try {
        const allocateBotTracer = tracer.startSpan('allocate-bot');
        await new Bot(threadId, problem).init();
        allocateBotTracer.finish();
      } catch (err) {
        console.log('error', err);
        console.log('Catching the Bot');
      }
    });
  }
  return connection;
})();
