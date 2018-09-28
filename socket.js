global.XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
global.WebSocket = require('websocket').w3cwebsocket;
const signalR = require('@aspnet/signalr');

const appConfig = require('./app.config');
const { initJaegerTracer } = require('./tracing');

const tracer = initJaegerTracer('Resolute-Ansible-Bot');

// Creates a WebSocket Connection to the RTMHub
const createConnection = async () => {
  const createConnectionTracer = tracer.startSpan('creating-connection');
  try {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(appConfig.RTM_HUB_URL)
      .build();
    connection.serverTimeoutInMilliseconds = 1000 * 1000;
    await connection.start();
    createConnectionTracer.log({ event: 'RTM_HUB_CONNECTION_ESTABLISHED' });
    createConnectionTracer.finish();
    return connection;
  } catch (err) {
    createConnectionTracer.log({ event: 'RTM_HUB_CONNECTION_REFUSED' });
    console.log("RTM_HUB_CONNECTION_REFUSED: Exiting Couldn't connect to RTM_HUB");
    createConnectionTracer.log({ event: 'BOT_FACTORY_EXITING' });
    process.exit(1);
  }
};

module.exports = { createConnection };
