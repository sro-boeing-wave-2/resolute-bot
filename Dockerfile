FROM mhart/alpine-node

COPY package.json /app

WORKDIR /usr/src/app

RUN yarn install

COPY . .

CMD [ "npm", "start"]

