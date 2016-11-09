const cluster = require('cluster');

if (cluster.isMaster) {
  const os = require('os');
  
  const numProc = os.cpus().length;
  
  console.log('i am master!'); for (let i = 0; i < numProc; i++) {
    cluster.fork();
  }

  cluster.on('online', function(worker) {
    console.log('Worker ' + worker.process.pid + ' is online');
  });

  cluster.on('listening', function(worker) {
    console.log('Worker ' + worker.process.pid + ' is listening');
  });

  cluster.on('message', function(worker, message, handle) {
    if (arguments.length === 2) {
      handle = message;
      message = worker;
      worker = undefined;
    }
    if (message.cmd && message.cmd === 'killMe' && cluster.workers[worker.id]) {
      let workerCount = 0;
      for (var id in cluster.workers) {
        workerCount++;
      }
      if (workerCount > 2) {
        worker.send({
          type: 'shutdown',
          from: 'master'
        });
        worker.disconnect();
      }
    }
    console.log('message from worker', worker.id, ':', message, typeof message);
  });

  cluster.on('exit', function(worker, code, signal) {
    console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
    console.log('Starting a new worker');
    cluster.fork();
  });
} else {
  const phantom = require('phantom');
  const fs = require('fs');
  const express = require('express');
  const bodyParser = require('body-parser');
  const ejs = require('ejs');
  
  const app = express();
  let server = null;
  let phInstance = null;
  let phPage = null;
  let template = null;
  let fulfilled = 0;
  let countPdf = 0;

  process.on('message', function(message) {
    if(message.type === 'shutdown') {
      server.close(() => {
        process.exit(0);
      });
    }
  });

  process.on('exit', () => {
    phInstance.exit();
  });

  app.use(bodyParser.json({ limit: '50mb' }));

  app.get('/', (req, res) => {
    res.send('Hello world! from worker:' + cluster.worker.id);
  });

  app.post('/', (req, res) => {
    countPdf++;
    if (countPdf > 20) {
      process.send({ cmd: 'killMe' });
    }
    const inv = req.body;
    inv.registrationNumber = inv.registrationNumber || '';
    inv.invoice.consignor = inv.invoice.consignor || {};
    inv.invoice.consignee = inv.invoice.consignee || {};
    inv.invoice.deliveryTerm = inv.invoice.deliveryTerm || {};

    const html = ejs.render(template, inv);

    phPage.property('content', html)
      .then(() => phPage.render(`./output/test${inv.invoiceId}.pdf`))
      .then(() => {
        res.send(`test${inv.invoiceId}.pdf created`);
        fulfilled++;
      })
      .catch((err) => {
        console.log(err);
      });
  });

  phantom.create()
  .then((instance) => {
    phInstance = instance;
    console.log('phantom instance created');

    return instance.createPage();
  })
  .then((page) => {
    page.property('paperSize', {
      width: 8.5*122, // eslint-disable-line
      height:11*122, // eslint-disable-line
      margin: { top: 50, bottom: 50 }
    });

    console.log('phantom page created');
    phPage = page;

    return new Promise((resolve, reject) => {
      fs.readFile(`${__dirname}/templates/esf.ejs`, 'utf8', (err, data) => {
        if (err) reject(err);
        
        resolve(data);
      });
    });
  })
  .then((data) => {
    template = data;
    console.log('ejs template loaded');
    
    server = app.listen(3001, () => {
      console.log('listening on port', 3001);
    });
  })
  .catch((err) => {
    console.log(err);
    phInstance.exit();
  });
}
