global.XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
global.WebSocket = require('websocket').w3cwebsocket;
const signalR = require('@aspnet/signalr');

const appConfig = require('./app.config');

// Creates a WebSocket Connection to the RTMHub
const createConnection = async () => {
  try {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(appConfig.RTM_HUB_URL)
      .build();
    connection.serverTimeoutInMilliseconds = 1000 * 1000;
    await connection.start();
    return connection;
  } catch (err) {
    console.log("RTM_HUB_CONNECTION_REFUSED: Exiting Couldn't connect to RTM_HUB");
    process.exit(1);
  }
};

module.exports = { createConnection };
