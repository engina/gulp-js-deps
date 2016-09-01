var test = require('tape');
var gulp = require('gulp');
var path = require('path');
var fs   = require('fs-extra');
var touch  = require('touch');
var through2 = require('through2');
var File = require('vinyl');
var gulpJsDeps = require('../');
var DEPS_DIR = '.deps';

function verifyDependants(sourcePath, expectedDepends, test) {
  var depends = [];
  test.doesNotThrow(() => {
    depends = fs.readFileSync(sourcePath, 'utf8');
  }, Error, 'should create dependency list');

  test.doesNotThrow(() => {
    depends = JSON.parse(depends);
  }, Error, 'should create a valid JSON file');

  test.deepEqual(depends, expectedDepends);
}

test('build()', test => {
  gulp.src('spec/fixtures/**/*.js', {read: false})
  .pipe(gulpJsDeps.build())
  .pipe(gulp.dest(DEPS_DIR))
  .on('end', r => {
    var root = path.resolve(path.join('spec', 'fixtures'));
    // 'lib/a.js' should have index.js
    var dependencies = [
      path.join(root, 'index.js'),
      path.join(root, 'lib', 'a.js'),
      path.join(root, 'lib', 'b.js'),
      path.join(root, 'lib', 'c.js')
    ];

    verifyDependants(path.join(DEPS_DIR, 'spec', 'fixtures', 'spec', 'indexSpec.js'),
                     dependencies, test);

    // 'lib/b.js' should have index.js, index2.js
    dependencies = [
      path.join(root, 'index2.js'),
      path.join(root, 'lib', 'b.js'),
      path.join(root, 'lib', 'c.js')
    ];
    verifyDependants(path.join(DEPS_DIR, 'spec', 'fixtures', 'spec', 'index2Spec.js'),
                     dependencies, test);
    test.end();
  });
});

test('dependsOn()', test => {
  var watcher;
  var root = path.resolve(path.join('spec', 'fixtures'));
  watcher = gulp.watch('spec/fixtures/**/*.js', file => {
    var expectedAffected = [
      path.join(root, 'index.js'),
      path.join(root, 'spec', 'indexSpec.js'),
      path.join(root, 'lib', 'a.js')
    ];

    var actualAffected = [];
    // Stream all dependency lists
    gulp.src(DEPS_DIR + '/**/*.js')
    // Filter files depend on the modified file 'file'
    .pipe(gulpJsDeps.dependsOn(file.path))
    // Store the results for testing
    .pipe(through2.obj(function(file, enc, done) {
      actualAffected.push(file.path);
      done();
    }))
    .pipe(gulp.dest('.tmp'))
    .on('end', () => {
      test.deepEqual(actualAffected.sort(), expectedAffected.sort());
      watcher.end();
      test.end();
    });
  })
  .on('ready', () => {
    // See if it can find dependents of fixture/lib/a.js
    touch(path.join(root, 'lib', 'a.js'));
  });
});

test('build() when fed with deleted files', t => {
  // create a dummy stream to get things going
  gulp.src('spec/**/*.js')
  // replace the valid files with invalid ones.
  .pipe(through2.obj(function(file, enc, done) {
    this.push(new File({
      path: '/does not exist'
    }));
    done();
  }))
  .pipe(gulpJsDeps.build())
  .pipe(through2.obj(function(file, enc, done) {
    // swallow the files so that gulp.dest below doesn't cry
    done();
  }))
  .pipe(gulp.dest('.tmp'))
  .on('error', err => {
    t.fail('should not emit error');
    t.end();
  })
  .on('end', () => {
    t.pass('should complete without error');
    t.end();
  });
});

test('dependsOn()', test => {
  var watcher;
  watcher = gulp.watch('spec/fixtures/**/*.js', file => {
    var root = path.resolve(path.join('spec', 'fixtures'));
    var expectedAffected = [
      path.join(root, 'spec', 'indexSpec.js')
    ];

    var actualAffected = [];
    // Stream all dependency lists
    gulp.src(DEPS_DIR + '/**/*.js')
    // Filter files depend on the modified file 'file'
    .pipe(gulpJsDeps.dependsOn(file.path))
    // Store the results for testing
    .pipe(through2.obj(function(file, enc, done) {
      actualAffected.push(file.path);
      done();
    }))
    .pipe(gulp.dest('.tmp'))
    .on('end', () => {
      test.deepEqual(actualAffected.sort(), expectedAffected.sort());
      watcher.end();
      test.end();
      fs.removeSync('.deps');
    });
  })
  .on('ready', () => {
    // Special case, see if it can find it itself (indexSpec.js is not a
    // dependant of indexSpec.js, but if it is modified, we want to run the
    // indexSpec.js anyway)
    touch(path.join('spec', 'fixtures', 'spec', 'indexSpec.js'));
  });
});
