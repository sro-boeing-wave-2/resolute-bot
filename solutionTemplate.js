const solutionTemplate =
{
  Tasks: [
    {
		  "stage": "enquire",
		  "commands": [
			  "Can you share your emailId?"
		  ],
      "register": "emailId",
      "type": "email"
	  },
    {
      "stage": "action",
      "name": "Get Data from Github.com",
      "uri": {
        "url": "https://api.github.com",
        "return_content": "yes"
      },
      "register": "gitdata",
      "headers": {
        "Content-Type": "application/json"
      },
      "tags": ["get-gitdata"]
    },
    {
      "stage": "response",
      "template": "Hey {{emailId}}, this is the url of your repository {{{gitdata.current_user_url}}}"
    }
  ],
  Actions: `---
  - hosts: localhost
    gather_facts: false
    tasks:
      - name: Get Data from Github.com
        uri:
          url: https://api.github.com
          return_content: yes
        register: gitdata
        headers:
          Content-Type: application/json
        tags:
          - get-gitdata
      - name: Store data in redis
        shell: redis-cli HSET {{{threadId}}} gitdata '{{ gitdata.content }}'
        tags:
          - get-gitdata
          `,
};
