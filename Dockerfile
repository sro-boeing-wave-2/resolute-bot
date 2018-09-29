FROM node:8.2-alpine

RUN echo "ipv6" >> /etc/modules

RUN apk update && apk add --no-cache ansible && apk --update add redis

WORKDIR /usr/src/app

COPY package.json .

RUN npm install

COPY . .

CMD [ "npm", "start"]

