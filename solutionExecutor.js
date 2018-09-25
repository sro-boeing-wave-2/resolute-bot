const shelljs = require('shelljs');
const Mustache = require('mustache');

const execute = (playbook, data) => {
  const executableTemplate = Mustache.render(playbook, data);
  shelljs.exec(`echo '${executableTemplate}' > playbook-test.yml`);
  shelljs.exec(`ansible-playbook playbook-test.yml`);

  const output = shelljs.cat("test-content");
  return output.stdout;
};

module.exports = { execute };

// const playbook = `
// ---
// - hosts: 127.0.0.1
//   connection: local
//   gather_facts: no
//   tasks:
//     - name: Do ping
//       command: ping localhost -c 1
//     - name: Get data from Github.com
//       uri:
//         url: https://api.github.com/
//         return_content: yes
//       register: gitdata
//       headers:
//         Content-Type: "application/x-www-form-urlencoded"
//     - name:  Store current_user_url
//       copy:
//         content: "{{gitdata.json.current_user_url}}"
//         dest: ./test-content
// `;
// console.log(`The output is ${output.stdout}`);
