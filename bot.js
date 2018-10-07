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


const recastRequest = new recastai.request('2d1deebab9ef5a25353533ebbe53242f');
mustache.escape = text => text;

const headerOptions = {
  headers: { Access: 'Allow_Service' },
};

class Bot {
  constructor(threadId, query) {
    this.threadId = threadId;
    this.inbox = new Subject();
    this.query = query;
    this.data = {};
    this.intent = 'NotFound';
    this.thread = [];
    this.REDIS_PORT = appConfig.REDIS_PORT;
    this.REDIS_HOST = appConfig.REDIS_HOST;
  }

  async init() {
    this.connection = await socket.createConnection();
    this.connection.on('message', this.addMessage.bind(this));
    this.assignMeToUser();
    try {
      await this.run();
    } catch (err) {
      this.handover();
    }
  }

  assignMeToUser() {
    this.connection.invoke('AssignMeToUser', this.threadId);
  }

  addMessage(message) {
    this.thread.push(message);
    this.inbox.next(message);
  }

  sendMessage(message) {
    console.log(message);
    const messageWrapper = {
      name: appConfig.BOT_NAME,
      emailId: appConfig.BOT_EMAILID,
      messageText: message,
    };
    this.thread.push(messageWrapper);
    this.connection.invoke('SendMessage', messageWrapper);
  }

  async run() {
    const problem = await this.findProblem();
    const template = await Bot.findTemplate(problem);
    await this.executeTemplate(template);
  }

  handover() {
    this.connection.invoke('Handover', this.threadId);
  }

  enquire(task, callback) {
    const ask = () => {
      this.sendMessage(task.commands[0]);
    };
    const registerDataAndCallback = (subscription, data) => {
      subscription.unsubscribe();
      this.data[task.schema.register] = data;
      callback(null);
    };

    const subscription = this.inbox.subscribe(async (message) => {
      console.log('message is', message);
      const response = await Bot.analyzeText(message.messageText);
      console.log(response);
      const intents = response.all(task.schema.type);
      if (intents && intents[0].raw) {
        registerDataAndCallback(subscription, intents[0].raw);
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

    const exec = shelljs.exec(`ansible-playbook ${this.playbookName} --extra-vars '${JSON.stringify(this.data)}' --tags "${task.tags[0]}"`);
    console.log(exec);
    if (exec.code !== 0) {
      console.log('ANSIBLE_SCRIPT_EXECUTION_FAILED');
      callback(new Error('ANSIBLE_SCRIPT_EXECUTION_FAILED'));
    }
    client.hget(this.threadId, task.register, (err, value) => {
      if (!err) {
        console.log(value);
        this.data[task.register] = JSON.parse(value);
        callback(null);
      } else {
        console.log('REDIS_FETCH_DATA_FAILED');
        callback(new Error('REDIS_FETCH_DATA_FAILED'));
      }
    });
  }

  response(task, callback) {
    console.log(this.data);
    console.log('Template');
    console.log(task.template);
    const response = mustache.render(task.template, this.data);
    this.sendMessage(response);
    callback(null);
  }

  async updateTicket() {
    await axios.put(`${appConfig.TICKET_MANAGEMENT_API}/${this.threadId}?intent=${this.intent.slug}`, null, headerOptions);
  }

  async findProblem() {
    const response = await Bot.analyzeText(this.query);
    const intent = response.intent();
    if (!intent) {
      console.log('Problem not found');
      throw new Error('PROBLEM_NOT_FOUND');
    } else {
      this.intent = intent;
      this.sendMessage(`Seems like you have problem with ${this.intent.description}`);
      await this.updateTicket();
      return intent;
    }
  }

  static async findTemplate(intent) {
    try {
      const response = await axios.get(`${appConfig.SOLUTION_EXPLORER_API}/${intent.slug}`, headerOptions);
      console.log(response.data);
      const template = response.data;
      if (!(template && template[0])) {
        console.log(template.tasks);
        throw new Error('TEMPLATE_NOT_FOUND');
      } else {
        const foundTemplate = template[0];
        return foundTemplate;
      }
    } catch (err) {
      console.log("Error in find template");
      this.handover();
    }
  }

  createPlaybook(threadId, actionables) {
    const playbookName = `playbook-${threadId}.yml`;
    fs.writeFileSync(playbookName, actionables);
    this.playbookName = playbookName;
  }

  async executeTemplate(template) {
    const templateOfActionables = template.Actions;
    const tasks = mustache.render(templateOfActionables, this, null, ['${{', '}}']);
    this.createPlaybook(this.threadId, tasks);
    const executors = template.Tasks.map(task => this[task.stage].bind(this, task));
    await async.series(executors, (err) => {
      if (err) {
        console.log(err);
        this.handover();
      } else {
        this.connection.invoke('SolutionEnd');
      }
    });
  }
}

module.exports = Bot;
