import express from 'express';
import path from 'path';
import SyncAgent from './sync_agent';

const SECRET = process.env.SECRET || 'shhuutt';

var bodyParser = require('body-parser')

const app = express();


app.use(express.static(path.resolve(__dirname, '..', 'dist')));
app.use(express.static(path.resolve(__dirname, '..', 'assets')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.engine('html', require('ejs').renderFile);

app.set('views', path.resolve(__dirname, 'views'));

app.get('/', (req, res, next) => {
  res.render('index.html');
});

app.get('/manifest.json', (req, res, next) => {
  console.warn('Marnifest ?');
  res.sendFile(path.resolve(__dirname, '..', 'manifest.json'));
});

app.post('/sync', (req, res, next) => {
  res.type('application/json');
  const { orgUrl, shipId } = req.body;
  if (orgUrl && shipId) {
    SyncAgent.sync(orgUrl, shipId, SECRET).then((ship) => {
      const data = JSON.stringify(ship, ' ', 2);
      console.warn('Voici mon anchois', ship);
      res.status(200).send(data).end();
    }, (err) => {
      res.status(500).send('Ballotin: ' + err.toString()).end();
    });
  } else {
    res.status(400).send({ error: 'Missing orgUrl or AppId' }).end();
  }
});


export default app;
