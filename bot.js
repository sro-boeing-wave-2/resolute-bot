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
const { initJaegerTracer } = require('./tracing');

const tracer = initJaegerTracer('Resolute-Ansible-Bot');

const client = redis.createClient({
  url: appConfig.REDIS_URL,
  port: appConfig.REDIS_PORT,
  retry_strategy: options => Math.min(options.attempt * 100, 3000),
});


const recastRequest = new recastai.request('2d1deebab9ef5a25353533ebbe53242f');
mustache.escape = text => text;

class Bot {
  constructor(threadId, query) {
    const span = tracer.startSpan('constructing-bot');
    this.threadId = threadId;
    this.inbox = new Subject();
    this.query = query;
    this.data = {};
    this.intent = 'NotFound';
    this.thread = [];
    span.finish();
  }

  async init() {
    const span = tracer.startSpan('initializing-bot');
    this.connection = await socket.createConnection();
    this.connection.on('message', this.addMessage.bind(this));
    this.assignMeToUser();
    span.finish();
    try {
      await this.run();
    } catch (err) {
      const catchSpan = tracer.startSpan('handing-over');
      this.handover();
      catchSpan.finish();
    }
  }

  assignMeToUser() {
    const span = tracer.startSpan('attaching-to-user');
    this.connection.invoke('AssignMeToUser', this.threadId);
    span.finish();
  }

  addMessage(message) {
    const span = tracer.startSpan('push-msg-to-inbox');
    this.thread.push(message);
    this.inbox.next(message);
    span.finish();
  }

  sendMessage(message) {
    const sendMessageSpan = tracer.startSpan('sending-message');
    const messageWrapper = {
      name: appConfig.BOT_NAME,
      emailId: appConfig.BOT_EMAILID,
      messageText: message,
    };
    this.thread.push(messageWrapper);
    this.connection.invoke('SendMessage', messageWrapper);
    sendMessageSpan.finish();
  }

  async run() {
    const runStages = tracer.startSpan('running-stages');
    const problem = await this.findProblem();
    const template = await Bot.findTemplate(problem);
    await this.executeTemplate(template);
    runStages.finish();
  }

  handover() {
    this.sendMessage("Seems like I don't understand that. Will handover to a Human Agent.");
    this.connection.invoke('Handover', this.threadId, this.data);
  }

  enquire(task, callback) {
    const enquireTracer = tracer.startSpan('enquiring');
    const ask = () => {
      this.sendMessage(task.commands[0]);
    };
    const registerDataAndCallback = (subscription, data) => {
      subscription.unsubscribe();
      this.data[task.schema.register] = data;
      enquireTracer.finish();
      callback(null);
    };

    const subscription = this.inbox.subscribe(async (message) => {
      console.log('message is', message);
      const response = await Bot.analyzeText(message);
      console.log(response);
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
    const analyzeTextTracer = tracer.startSpan('analyzing-text');
    const response = await recastRequest.analyseText(text);
    analyzeTextTracer.finish();
    return response;
  }

  action(task, callback) {
    this.sendMessage('Checking details');

    shelljs.exec(`ansible-playbook ${this.playbookName} --extra-vars '${JSON.stringify(this.data)}' --tags "${task.tags[0]}"`);

    client.hget(this.threadId, task.register, (err, value) => {
      if (!err) {
        console.log(value);
        this.data[task.register] = JSON.parse(value);
        callback(null);
      } else {
        throw new Error('FETCH_DATA_REDIS_FAILED');
      }
    });
  }

  response(task, callback) {
    const responseTracer = tracer.startSpan('responding');
    const response = mustache.render(task.template, this.data);
    this.sendMessage(response);
    responseTracer.finish();
    callback(null);
  }

  async findProblem() {
    const problemTracer = tracer.startSpan('finding-problem');
    const response = await Bot.analyzeText(this.query);
    const intent = response.intent();
    if (!intent) {
      problemTracer.log({ event: 'PROBLEM_NOT_FOUND' });
      console.log('Problem not found');
      throw new Error('PROBLEM_NOT_FOUND');
    } else {
      problemTracer.log({ event: 'PROBLEM_FOUND' });
      this.intent = intent;
      this.sendMessage(`Seems like you have problem with ${this.intent.description}`);
      problemTracer.finish();
      return intent;
    }
  }

  static async findTemplate(intent) {
    const findTemplateTracer = tracer.startSpan('finding-template');
    console.log('finding template');
    console.log(intent);
    try {
      const solutionExplorerTracer = tracer.startSpan('making-restcall-to-solution-explorer');
      console.log(`${appConfig.SOLUTION_EXPLORER_API}/${intent.slug}`);
      const response = await axios.get(`${appConfig.SOLUTION_EXPLORER_API}/${intent.slug}`);
      solutionExplorerTracer.finish();
      console.log(response.data);
      const template = response.data;
      if (!(template && template[0])) {
        findTemplateTracer.log({ event: 'TEMPLATE_NOT_FOUND' });
        console.log(template.tasks);
        throw new Error('TEMPLATE_NOT_FOUND');
      }
      else {
        findTemplateTracer.log({ event: 'TEMPLATE_FOUND' });
        const foundTemplate = template[0];
        findTemplateTracer.finish();
        return foundTemplate;
      }
    } catch (err) {
      console.log(err);
      console.log("Error in Find Template");
    }
  }

  createPlaybook(threadId, actionables) {
    const createPlaybookTracer = tracer.startSpan('creating-playbook');
    const playbookName = `playbook-${threadId}.yml`;
    fs.writeFileSync(playbookName, actionables);
    createPlaybookTracer.log({ event: 'PLAYBOOK_CREATED' });
    this.playbookName = playbookName;
    createPlaybookTracer.finish();
  }

  async executeTemplate(template) {
    try {
      const executeTemplateTracer = tracer.startSpan('executing-template');
      const templateOfActionables = template.Actions;
      const renderTemplateTracer = tracer.startSpan('rendering-template');
      const tasks = mustache.render(templateOfActionables, this, null, ['${{', '}}']);
      renderTemplateTracer.log({ event: 'TEMPLATE_RENDERED' });
      renderTemplateTracer.finish();
      this.createPlaybook(this.threadId, tasks);
      const executors = template.Tasks.map(task => this[task.stage].bind(this, task));
      await async.series(executors);
      executeTemplateTracer.finish();
    } catch (exception) {
      throw new Error('TEMPLATE_EXECUTION_FAILED');
    }
  }
}

module.exports = Bot;
