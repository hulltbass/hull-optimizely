import express from 'express';
import api from './api';
import webpack from 'webpack';
import webpackMiddleware from 'webpack-dev-middleware';
import config from '../webpack.config.js';

export default function(port) {
  var app = express();

  app.use(api());

  const isDeveloping = process.env.NODE_ENV !== 'production';


  if (isDeveloping) {
    const compiler = webpack(config);

    app.use(webpackMiddleware(compiler, {
      publicPath: config.output.publicPath,
      contentBase: 'src',
      stats: {
        colors: true,
        hash: false,
        timings: true,
        chunks: false,
        chunkModules: false,
        modules: false
      }
    }));
  }

  app.listen(port);
}
