require('dotenv').config();

const resolvePath = require('path').resolve;
const fs = require('fs');
const DB = require('./db');
const database = new DB();
const http = require('http');

const MAX_POINTS = 30;
const history = [];

let lastValues = null;

const diff = (previous, recent) => {
  let diff = {};

  Object.keys(recent).forEach(attr => {
    if(typeof recent[attr] == 'object') {
      diff[attr] = getDiff(previous[attr], recent[attr]);
    } else if(typeof recent[attr] == 'number') {
      diff[attr] = recent[attr] - previous[attr];
    } else {
      diff[attr] = recent[attr];
    }
  });

  return diff;
};

const collectServerStatus = interval => {
  return database.serverStatus().then(data => {
    setTimeout(collectServerStatus, interval, interval);

    if(lastValues !== null) {
      history.push({
        date: new Date(),
        opcounters: diff(lastValues.opcounters, data.opcounters),
        network: diff(lastValues.network, data.network),
        documentMetrics: diff(lastValues.documentMetrics, data.metrics.document),
        localTime: data.localTime,
        uptime: data.uptime,
        connections: data.connections,
        mem: data.mem
      });
    }

    lastValues = {
      localTime: data.localTime,
      uptime: data.uptime,
      opcounters: data.opcounters,
      connections: data.connections,
      network: data.network,
      mem: data.mem,
      documentMetrics: data.metrics.document
    };

    if(history.length > MAX_POINTS) {
      // remove oldest points
      history.splice(0, history.length - MAX_POINTS);
    }
  });
};

const staticFile = (filePath, res) => {
  let file = fs.createReadStream(filePath);

  file.on('open', () => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    file.pipe(res);
  });

  file.on('error', (err) => {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  });
};

const startServer = () => {
  const app = http.createServer((req, res) => {
    if(req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end();
      return;
    }

    switch(req.url) {
      case '/api':
        res.writeHead(200, { 'Content-Type': 'text/json' });
        res.end(JSON.stringify({
          history: history
        }));
      break;

      case '/':
      case '/index.htm':
        staticFile(resolvePath(__dirname, 'public/index.htm'), res);
      break;

      default:
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      break;
    }
  });

  app.listen(process.env.PORT || 8080);
};

database
  .connect()
  .then(() => collectServerStatus(1000))
  .then(() => startServer())
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
