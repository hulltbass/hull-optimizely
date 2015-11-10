require('babel/register');

var express = require('express');
var api = require('./api');
var webpack = require('webpack');
var webpackMiddleware = require('webpack-dev-middleware');
var config  = require('../webpack.config.js');


var app = express();

app.use(api);

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


app.listen(process.env.PORT || 8082);
