import express from 'express';
import path from 'path';
import SyncAgent from './sync_agent';
import { NotifHandler } from 'hull';


module.exports = function Api() {
  const app = express();

  const notifHandler = NotifHandler({
    onSubscribe: function() {
      console.warn("Hello new subscriber !");
    },
    events: {
      'users_segment:update': function({ message }, { hull, ship }) {
        SyncAgent.sync(hull, ship);
      }
    }
  });

  app.use(express.static(path.resolve(__dirname, '..', 'dist')));
  app.use(express.static(path.resolve(__dirname, '..', 'assets')));

  app.engine('html', require('ejs').renderFile);

  app.set('views', path.resolve(__dirname, 'views'));

  app.get('/', (req, res, next) => {
    res.render('index.html');
  });

  app.get('/manifest.json', (req, res, next) => {
    res.sendFile(path.resolve(__dirname, '..', 'manifest.json'));
  });

  app.post('/notify', notifHandler);

  return app;
}

