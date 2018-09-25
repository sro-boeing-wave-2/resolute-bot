const proxyquire = require('proxyquire');
const EventEmitter = require('events');
const should = require('should');

class SocketEventEmitter extends EventEmitter {}

describe('Bot Factory', () => {
  it('Should invoke RegisterBotFactory', (done) => {
    const socketEventEmitter = new SocketEventEmitter();
    socketEventEmitter.invoke = (fnName) => {
      should.exist(fnName);
      fnName.should.be.exactly('RegisterBotFactory');
      done();
    };
    proxyquire('../bot-factory', {
      './socket.js': {
        createConnection: async () => socketEventEmitter,
      },
    });
  });
});
