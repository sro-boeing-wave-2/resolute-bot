global.XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
global.WebSocket = require('websocket').w3cwebsocket;
const signalR = require('@aspnet/signalr');
const winston = require('winston');

const appConfig = require('./app.config');

// Creates a WebSocket Connection to the RTMHub
const createConnection = async () => {
  try {
    const serverTimeoutInMilliseconds = 10000000;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(appConfig.RTM_HUB_URL, { serverTimeoutInMilliseconds })
      .build();
    await connection.start();
    winston.info('RTM_HUB_CONNECTION_ESTABLISHED');
    return connection;
  } catch (err) {
    winston.error(err);
    winston.error("RTM_HUB_CONNECTION_REFUSED: Exiting Couldn't connect to RTM_HUB");
    process.exit(1);
  }
};

module.exports = { createConnection };
