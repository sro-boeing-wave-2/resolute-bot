const fs = require('fs');
const async = require('async');
const recastai = require('recastai').default;
const shelljs = require('shelljs');
const redis = require('redis');
const mustache = require('mustache');
const axios = require('axios');
const { Subject } = require('rxjs');
const appConfig = require('./app.config');

const socket = require('./socket.js');

const client = redis.createClient({
  url: appConfig.REDIS_URL,
  port: appConfig.REDIS_PORT,
  retry_strategy: options => Math.min(options.attempt * 100, 3000),
});

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
    try {
      await this.run();
    } catch(err) {
      console.log(err);
      this.handover();
    }
  }

  assignMeToUser() {
    console.log(this.threadId);
    this.connection.invoke('AssignMeToUser', this.threadId);
  }

  addMessage(message) {
    this.thread.push(message);
    this.inbox.next(message);
  }

  sendMessage(message) {
    const messageWrapper = {
      name: appConfig.BOT_NAME,
      emailId: appConfig.BOT_EMAILID,
      messageText: message,
    };
    this.thread.push(messageWrapper);
    this.connection.invoke('SendMessage', messageWrapper);
  }

  async run() {
    try {
      const problem = await this.findProblem();
      const template = await Bot.findTemplate(problem);
      await this.executeTemplate(template);
    } catch (err) {
      console.log(`error inside run ${err}`);
    }
  }

  handover() {
    this.sendMessage("Seems like I don't understand that. Will handover to a Human Agent.");
    this.connection.invoke('Handover', this.threadId, this.data);
  }

  enquire(task, callback) {
    const ask = () => this.sendMessage(task.commands[0]);
    const registerDataAndCallback = (subscription, data) => {
      subscription.unsubscribe();
      this.data[task.schema.register] = data;
      callback(null);
    };

    const subscription = this.inbox.subscribe(async (message) => {
      const response = await Bot.analyzeText(message.messageText);
      const data = response.all(task.schema.type)[0].raw;
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
    this.sendMessage('Checking details');

    shelljs.exec(`ansible-playbook ${this.playbookName} --extra-vars '${JSON.stringify(this.data)}' --tags "${task.tags[0]}"`);

    client.hget(this.threadId, task.register, (err, value) => {
      if (!err) {
        this.data[task.register] = JSON.parse(value);
        callback(null);
      } else {
        throw new Error('FETCH_DATA_REDIS_FAILED');
      }
    });
  }

  response(task, callback) {
    const response = mustache.render(task.template, this.data);
    this.sendMessage(response);
  }

  async findProblem() {
    const response = await Bot.analyzeText(this.query);
    const intent = response.intent();
    if (!intent) {
      console.log('Problem not found');
      throw 'PROBLEM_NOT_FOUND';
    } else {
      this.intent = intent;
      this.sendMessage(`Seems like you have problem with ${this.intent.description}`);
      return intent;
    }
  }

  static async findTemplate(intent) {
    console.log('finding intent');
    const response = await axios.get(`${appConfig.SOLUTION_EXPLORER_API}/${intent}`);
    const template = response.data;
    console.log(template.tasks);
    if (!(template && template[0])) {
      throw new Error('TEMPLATE_NOT_FOUND');
    }
    else {
      return template[0];
    }
  }

  createPlaybook(threadId, actionables) {
    const playbookName = `playbook-${threadId}.yml`;
    fs.writeFileSync(playbookName, actionables);
    this.playbookName = playbookName;
  }

  async executeTemplate(template) {
    try {
      const templateOfActionables = template.Actions;
      const tasks = mustache.render(templateOfActionables, this, null, ['{{{', '}}}']);
      this.createPlaybook(this.threadId, tasks);
      const executors = template.Tasks.map(task => this[task.stage].bind(this, task));
      await async.series(executors);
    } catch (exception) {
      throw new Error('TEMPLATE_EXECUTION_FAILED');
    }
  }
}

module.exports = Bot;
