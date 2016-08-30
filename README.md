# gulp-js-deps

[![Build status](https://img.shields.io/travis/engina/gulp-js-deps.svg?style=flat-square)](https://travis-ci.org/request/request)
[![Coverage](https://img.shields.io/codecov/c/github/engina/gulp-js-deps.svg?style=flat-square)](https://codecov.io/github/request/request?branch=master)

Gulp plugin to run only affected unit tests.

```javascript
var gulp  = require('gulp');
var jsdeps = require('gulp-js-deps');
var tape = require('gulp-tape');
var tapDiff = require('tap-diff');
var gutil = require('gulp-util');
var clean = require('gulp-clean');

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
    .pipe(tape({reporter: tapDiff()}))
    // since files that these tests depend on has changed,
    // recalculate test files' dependencies just in case
    // that the `file` has changed its require()s.
    .pipe(jsdeps.build())
    .pipe(gulp.dest('.deps'));
  });

  gulp.watch(['spec/**/*Spec.js'], file => {
    // Unit test has been modified
    gulp.src(file.path)
    // Run the test
    .pipe(tape({reporter: tapDiff()}))
    // Test file might have new require()s, re-calculate deps
    .pipe(jsdeps.build())
    .pipe(gulp.dest('.deps'));
  });
});
```