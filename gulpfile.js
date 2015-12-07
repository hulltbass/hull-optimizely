var gulp = require('gulp');

var pkg = require('./package.json');
var jestConfig = pkg.jest;

var gulp        = require('gulp');
var runSequence = require('run-sequence');
var config      = require('./gulp_tasks/config');

[
  'clean',
  'cloudfront',
  'copy',
  'deploy',
].map(function(task) { require('./gulp_tasks/' + task + '.js')(gulp, config);});


gulp.task('build', function(callback) {
  runSequence('clean', ['copy'], callback);
});

gulp.task('deploy', function(callback) {
  runSequence('build', 'gh:deploy', 'cloudfront', callback);
});
