FROM node:8.2-alpine

RUN echo "ipv6" >> /etc/modules
# Add Ansible, Redis and OpenSSH
RUN apk update
RUN apk add ansible redis openssh && rm  -rf /tmp/* /var/cache/apk/*
# Remove existing ssh keys
RUN rm -rf /etc/ssh/ssh_host_rsa_key /etc/ssh/ssh_host_dsa_key
# Generate all the ssh keys
RUN ssh-keygen -A
# Start the ssh server
RUN /usr/sbin/sshd
# Create an hosts file
RUN mkdir -p /etc/ansible
RUN echo 'localhost ansible_connection=local ansible_python_interpreter=/usr/bin/python2' > /etc/ansible/hosts

# Create a working directory
WORKDIR /usr/src/app
# Copy package.json
COPY package.json .
# Install all the dependencies
RUN npm install
# Copy the remaining files
COPY . .
# Start the application
CMD [ "npm", "start"]
