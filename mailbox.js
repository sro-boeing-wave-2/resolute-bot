const signalR = require("@aspnet/signalr");
const { BehaviorSubject, Subject } = require('rxjs');

class MailBox {
  constructor(threadId, query) {
    this.threadId = threadId;
    this.thread = [query];
    this.query = query;
    this.inbox = new Subject();
  }

  async initialize() {
    this.connection = new signalR.HubConnectionBuilder()
          .withUrl('http://localhost:8081/chathub')
          .build();
    this.connection.serverTimeoutInMilliseconds = 1000 * 1000;
    await this.connection.start();
    this.connection.on('message', this.addMessage.bind(this));
    this.assignMeToUser();
  }

  assignMeToUser() {
    this.connection.invoke('AssignMeToUser', this.threadId);
  }

  addMessage(message) {
    this.thread.push(message);
    this.inbox.next(message);
  }

  sendMessage(message) {
    this.thread.push(message);
    this.connection.invoke("SendMessage", message);
  }

  handoverToAgent() {

  }
}

module.exports = MailBox;