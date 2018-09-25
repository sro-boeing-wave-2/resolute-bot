global.XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
global.WebSocket = require('websocket').w3cwebsocket;
const signalR = require('@aspnet/signalr');

const appConfig = require('./app.config');

// Creates a WebSocket Connection to the RTMHub
const createConnection = async () => {
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(appConfig.RTM_HUB_URL)
    .build();

  connection.serverTimeoutInMilliseconds = 1000 * 1000;

  await connection.start();

  return connection;
};

module.exports = { createConnection };
