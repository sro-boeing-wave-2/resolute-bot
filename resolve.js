const stringSimilarity = require('string-similarity');
const { enquire } = require('./enquirer');
const { execute } = require('./solutionExecutor');
const _ = require('lodash');

// Take the query and the department
// Calculate the levenstien's distance
// On Matching a Problem, get the template
// Loop:
  // Get the required data
  // Execute Solution
// End Conversation
// If problem not matched
// Route to a Human Agent

const queryProblemMap = {
  "AirConditioners": {
    "How do I change to Fan Mode": "change-mode",
    "How do I change to Cool Mode": "change-mode",
    "How to change to Fan Mode": "change-mode",
    "How to change mode in my ac": "change-mode",
    "How to change to Cool Mode": "change-mode",
    "How do we change mode to Cool": "change-mode",
  },
  "TV": {
    "How to change the wifi password": "change-wifi-password",
  },
  "Refrigerator": {

  },
};

const problemTemplate = {
  "change-mode": {
    parameters: [
      {
        name: "mode",
        type: 'string',
        required: true,
        values: [
          'Fan',
          'Cool',
          'Auto',
        ],
        enquires: [
          'Hey what mode are you looking to change in?',
        ],
      }
    ],
    solutionTemplate: `---
    - hosts: 127.0.0.1
      gather_facts: false
      tasks:
        - name: Get data from Github.com
          uri:
            url: {{mode}}
            return_content: yes
          register: gitdata
          headers:
            Content-Type: "application/x-www-form-urlencoded"
        - name:  Store current_user_url
          copy:
            content: "{{gitdata.json.current_user_url}}"
            dest: ./test-content
`
  }
};

const findProblem = (query, department) => {
  // There can be multiple ways to find the problem
  // 1. Levenstein Distance
  // 2. MultiClass Classification
  // 3. Using SVM's and many more
  const { bestMatch } = stringSimilarity.findBestMatch(query, _.keys(queryProblemMap[department]));
  console.log(bestMatch);
  const problem = queryProblemMap[department][bestMatch.target];
  return problem;
};

// Get's the template from the document store
const findTemplate = (problem) => problemTemplate[problem];


const executeTemplate = (query, template) => {
  const data = template.parameters.reduce((acc, param) => {
    if (Array.isArray(param.values)) {
      console.log("Is arrayu");
      let paramValue = param.values.filter(value => query.includes(value));
      while (!paramValue || paramValue.length === 0) {
       paramValue = enquire(param.enquires[0]);
      }
      acc[param.name] = paramValue;
      return acc;
    }
  }, {});
  console.log('Data is', data);
  return execute(template.solutionTemplate, data);
};

const reply = (query, department) => {
  const problem = findProblem(query, department);
  console.log(problem);
  const template = findTemplate(problem);
  const solution = executeTemplate(query, template);
  console.log(solution);
};

reply("how to change mode in my super big ac?", "AirConditioners");

// reply("how to change tv ka wifi of LG-101", "TV");

module.exports = reply;
