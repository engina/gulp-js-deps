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
    // file is a .dep file that contains dependency list of a file
    var depends = [];
    try {
      depends = JSON.parse(file.contents);
    } catch (e) {
      throw new gutil.PluginError(PLUGIN_NAME, 'Invalid dependency file: ' + file.path);
    }
    // translate /.dep/foo/bar to /foo/bar -- this is the file we got the
    // dependency list of
    file.path = file.path.replace(file.base, file.cwd + path.sep);
    file.base = file.cwd;

    // see if the file depends on the modified file
    if (depends.indexOf(modifiedFile) !== -1) {
      this.push(file);
    }

    // Also we'd like to match the file itself. If /foo/bar is the modifiedFile
    // it doesn't matter if we match any of its dependencies. It's very self has
    // been modified. So it is affected.
    if (file.path === modifiedFile) {
      this.push(file);
    }
    done();
  });
};
