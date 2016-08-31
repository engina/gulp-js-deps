var through2 = require('through2');
var path = require('path');
var gutil = require('gulp-util');
var File = require('vinyl');
var jsDeps = require('js-deps');

var PLUGIN_NAME = 'gulp-js-deps';

module.exports.build = options => {
  return through2.obj(function(file, enc, done) {
    var deps = jsDeps.analyze(file.path, options)
    .filter(dep => dep.startsWith('/'));
    var relativePath = file.path.substr(file.cwd.length + 1);
    var depFile = new File({
      path: relativePath,
      contents: new Buffer(JSON.stringify(deps))
    });
    this.push(depFile);
    done();
  });
};

module.exports.dependsOn = modifiedFile => {
  return through2.obj(function(file, enc, done) {
    var depends = [];
    try {
      depends = JSON.parse(file.contents);
    } catch (e) {
      throw new gutil.PluginError(PLUGIN_NAME, 'Invalid dependency file: ' + file.path);
    }
    if (depends.indexOf(modifiedFile) !== -1) {
      file.path = file.path.replace(file.base, file.cwd + path.sep);
      file.base = file.cwd;
      this.push(file);
    }
    done();
  });
};
