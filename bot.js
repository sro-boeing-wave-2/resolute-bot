const fs = require('fs');
const async = require('async');
const recastai = require('recastai').default;
const shelljs = require('shelljs');
const redis = require('redis');
const mustache = require('mustache');
const axios = require('axios');
const { Subject } = require('rxjs');

const socket = require('./socket.js');

const client = redis.createClient()

// const MailBox = require('./mailbox');

const recastRequest = new recastai.request('2d1deebab9ef5a25353533ebbe53242f');

class Bot {
  constructor(threadId, query) {
    this.threadId = threadId;
    this.inbox = new Subject();
    this.query = query;
    this.data = {};
    this.intent = 'NotFound';
    this.thread = [];
  }

  async init() {
    this.connection = await socket.createConnection();
    this.connection.on('message', this.addMessage.bind(this));
    this.assignMeToUser();
    this.run();
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
    this.connection.invoke('SendMessage', message);
  }

  run() {
    async.waterfall([
      this.findProblem.bind(this),
      this.findTemplate.bind(this),
      this.executeTemplate.bind(this),
    ], function(err, result) {
      console.log('error', err);
      console.log('result', result);
    });
  }

  handover() {
    this.sendMessage("Seems like I don't understand that. Will handover to a Human Agent.");
    this.connection.invoke('AssignAgentToUser', this.threadId);
  }

  enquire(task, callback) {
    const ask = () => this.sendMessage(task.commands[0]);

    const registerDataAndCallback = (subscription, data) => {
      subscription.unsubscribe();
      this.data[task.register] = data;
      callback(null);
    };

    const subscription = this.inbox.subscribe(async (message) => {
      const response = await this.analyzeText(message);
      const data = response.all(task.type)[0].raw;
      if (data) {
        registerDataAndCallback(subscription, data);
      } else {
        ask();
      }
    });

    ask();
  }

  static async analyzeText(text) {
    const response = await recastRequest.analyseText(text);
    return response;
  }

  action(task, callback) {
    this.sendMessage(`Checking details`);
    shelljs.exec(`ansible-playbook ${this.playbookName} --extra-vars '${JSON.stringify(this.data)}' --tags "${task.tags[0]}"`);
    client.hget(this.threadId, task.register, (err, value) => {
      this.data[task.register] = JSON.parse(value);
      callback(null);
    });
  }

  response(task, callback) {
    const response = mustache.render(task.template, this.data);
    this.sendMessage(response);
  }

  findProblem(callback) {
    const response = await this.analyzeText(this.query);
    const intent = response.intent();
    if (!intent) {
      this.intent = intent;
      this.sendMessage(`Seems like you have problem with ${this.intent.description}`);
      callback(null, intent);
    } else {
      throw 'PROBLEM_NOT_FOUND';
    }
  }

  static async findTemplate(intent) {
    const response = await axios.get(`http://localhost:8081/api/solution/${intent}`);}
    const template = response.data;
    return template[0];
  }

  createPlaybook(threadId, actionables) {
    const playbookName = `playbook-${threadId}.yml`;
    fs.writeFileSync(playbookName, actionables);
    this.playbookName = playbookName;
  }

  async executeTemplate(template, callback) {
    const templateOfActionables = template.Actions;
    const tasks = mustache.render(templateOfActionables, this, null, ['{{{', '}}}']);
    this.createPlaybook(this.threadId, tasks);
    const executors = template.Tasks.map(task => this[task.stage].bind(this, task));
    try {
      await async.series(executors);
    } catch (exception) {
      console.log('exception');
      console.log(exception);
    }
  }
}

module.exports = Bot;
