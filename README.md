# gulp-js-deps

[![Build status](https://img.shields.io/travis/engina/gulp-js-deps.svg?style=flat-square)](https://travis-ci.org/engina/gulp-js-deps)
[![Coverage](https://img.shields.io/codecov/c/github/engina/gulp-js-deps.svg?style=flat-square)](https://codecov.io/github/engina/gulp-js-deps?branch=master)

Gulp plugin to run only affected unit tests.

## Install
```
npm install --save-dev gulp-js-deps
```

## Example gulp configuration
```javascript
var gulp  = require('gulp');
var jsdeps  = require('gulp-js-deps');
var gutil = require('gulp-util');
var clean = require('gulp-clean');
var shell = require('gulp-shell');

function buildDeps(glob) {
  gutil.log(gutil.colors.green('Building dependency list for'), glob);
  return gulp.src(glob, {read: false})
  .pipe(jsdeps.build())
  .pipe(gulp.dest('.deps'));
}

gulp.task('build-deps', ['clean-deps'], done => {
  return buildDeps(['spec/**/*Spec.js']);
});

gulp.task('clean-deps', done => {
  return gulp.src('.deps')
  .pipe(clean());
});

gulp.task('test', ['build-deps'], cb => {
  gulp.watch('src/**/*.js', file => {
    // A source code has been modified
    gulp.src('.deps/**/*.js')
    // Find the unit tests affected by the modified `file`
    .pipe(jsdeps.dependsOn(file.path))
    // Here we have the affected unit tests, let's run them
    .pipe(shell('node <%= file.path %> | node_modules/tap-diff/distributions/cli.js', {env: {FORCE_COLOR: true}, ignoreErrors: true}))
    // since files that these tests depend on has changed,
    // recalculate test files' dependencies just in case
    // that the `file` has changed its require()s.
    .pipe(jsdeps.build())
    .pipe(gulp.dest('.deps'));
  });

  gulp.watch(['spec/**/*Spec.js'], file => {
    if (file.type === 'deleted') {
      // Unit test deleted, ignore
      return;
    }
    // Unit test has been modified
    gulp.src(file.path)
    // Run the tests
    .pipe(shell('node <%= file.path %> | node_modules/tap-diff/distributions/cli.js', {env: {FORCE_COLOR: true}, ignoreErrors: true}))
    // Modified test file might have new require()s, re-calculate deps
    .pipe(jsdeps.build())
    .pipe(gulp.dest('.deps'));
  });
});

```

### build([opts])
See [js-deps](https://github.com/engina/js-deps#analyzefilepath-options) options.
