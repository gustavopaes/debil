FROM node:6.11.3

ENV PORT 80
EXPOSE 80

WORKDIR /usr/src/app

COPY . /usr/src/app
RUN npm install -q --only=production

CMD ["node", "index.js"]
