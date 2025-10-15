FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install -g npm@latest

COPY . .

RUN cd api && npm install && cd ../worker && npm install

WORKDIR /app/api

EXPOSE 8080

CMD ["node", "index.js"]
