'use strict';

// Include Gulp & Tools We'll Use
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var del = require('del');
var runSequence = require('run-sequence');
var browserSync = require('browser-sync');
var reload = browserSync.reload;

var AUTOPREFIXER_BROWSERS = [
  'ie >= 10',
  'ie_mob >= 10',
  'ff >= 30',
  'chrome >= 34',
  'safari >= 7',
  'opera >= 23',
  'ios >= 7',
  'android >= 4.4',
  'bb >= 10'
];

// Lint JavaScript
gulp.task('jshint', function () {
  return gulp.src('app/assets/scripts/**/*.js')
    .pipe(reload({stream: true, once: true}))
    .pipe($.jshint())
    .pipe($.jshint.reporter('jshint-stylish'))
    .pipe($.if(!browserSync.active, $.jshint.reporter('fail')));
});

// Optimize Images
gulp.task('images', function () {
  return gulp.src([
      'app/assets/images/**/*',
      '!app/assets/images/sprites/*',
      '!app/assets/images/sprites/'
  ])
    .pipe($.cache($.imagemin({
      progressive: true,
      interlaced: true
    })))
    .pipe(gulp.dest('build/assets/images'))
    .pipe($.size({title: 'images'}));
});

// Copy All Files At The Root Level (app)
gulp.task('copy', function () {
  return gulp.src([
    'app/*',
    '!app/*.html',
    '!app/assets/images/sprites/*',
    '!app/assets/images/sprites/'
  ], {
    dot: true
  }).pipe(gulp.dest('build'))
    .pipe($.size({title: 'copy'}));
});

// Copy bower_components to app
gulp.task('bower_copy', function () {
  return gulp.src([
    'bower_components/normalize.css/normalize.css'
  ])
    .pipe($.rename('_normalize.scss'))
    .pipe(gulp.dest('app/assets/styles/base/'));
});

// Copy Web Fonts To Build
gulp.task('fonts', function () {
  return gulp.src(['app/assets/fonts/**'])
    .pipe(gulp.dest('build/assets/fonts'))
    .pipe($.size({title: 'fonts'}));
});

// Generate sprite and css file from PNGs
gulp.task('sprites', function() {
  var spriteData = gulp.src([
      'app/assets/images/sprites/*.png'
  ])
    .pipe($.spritesmith({
      cssName: '_sprites.scss',
      cssFormat: 'css',
      cssOpts: {
        cssSelector: function (item) {
          // If this is a hover sprite, name it as a hover one (e.g. 'home-hover' -> 'home:hover')
          if (item.name.indexOf('-hover') !== -1) {
            return '.icon-' + item.name.replace('-hover', ':hover');
            // Otherwise, use the name as the selector (e.g. 'home' -> 'home')
          } else {
            return '.icon-' + item.name;
          }
        }
      },
      imgName: 'sprites.png',
      imgPath: '/assets/images/sprites.png'
    }));

  spriteData.img
    .pipe(gulp.dest('app/assets/images/'));

  spriteData.css
    .pipe(gulp.dest('app/assets/styles/base/'));
});

// Compile and Automatically Prefix Stylesheets
gulp.task('styles', function () {
  // For best performance, don't add Sass partials to `gulp.src`
  gulp.src([
    'app/assets/styles/*.scss',
    'app/assets/styles/**/*.css'
  ])
    .pipe($.sourcemaps.init())
    .pipe($.changed('.tmp/assets/styles', {extension: '.css'}))
    .pipe($.sass({
      precision: 10,
      onError: console.error.bind(console, 'Sass error:')
    }))
    .pipe($.autoprefixer({browsers: AUTOPREFIXER_BROWSERS}))
    .pipe($.sourcemaps.write())
    .pipe(gulp.dest('.tmp/assets/styles'))
    // Concatenate And Minify Styles
    .pipe($.if('*.css', $.csso()))
    .pipe(gulp.dest('build/assets/styles'))
    .pipe($.size({title: 'styles'}));
});

// Scan Your HTML For Assets & Optimize Them
gulp.task('html', function () {
  var assets = $.useref.assets({searchPath: '{.tmp,app}'});

  return gulp.src('app/**/*.html')
    .pipe(assets)
    // Concatenate And Minify JavaScript
    .pipe($.if('*.js', $.uglify({preserveComments: 'some'})))
    // Remove Any Unused CSS
    // Note: If not using the Style Guide, you can delete it from
    // the next line to only include styles your project uses.
    .pipe($.if('*.css', $.uncss({
      html: [
        'app/index.html'
      ],
      // CSS Selectors for UnCSS to ignore
      ignore: [
        /.navdrawer-container.open/,
        /.app-bar.open/
      ]
    })))
    // Concatenate And Minify Styles
    // In case you are still using useref build blocks
    .pipe($.if('*.css', $.csso()))
    .pipe(assets.restore())
    .pipe($.useref())
    // Update Production Style Guide Paths
    //.pipe($.replace('components/components.css', 'components/main.min.css'))
    // Minify Any HTML
    .pipe($.if('*.html', $.minifyHtml()))
    // Output Files
    .pipe(gulp.dest('build'))
    .pipe($.size({title: 'html'}));
});

// Clean Output Directory
gulp.task('clean', del.bind(null, ['.tmp', 'build', '!build/.git'], {dot: true}));

// Watch Files For Changes & Reload
gulp.task('serve', ['styles'], function () {
  browserSync({
    notify: false,
    // Customize the BrowserSync console logging prefix
    logPrefix: 'WSK',
    // Run as an https by uncommenting 'https: true'
    // Note: this uses an unsigned certificate which on first access
    //       will present a certificate warning in the browser.
    // https: true,
    server: ['.tmp', 'app']
  });

  gulp.watch(['app/**/*.html'], reload);
  gulp.watch(['app/assets/styles/**/*.{scss,css}'], ['styles', reload]);
  gulp.watch(['app/assets/scripts/**/*.js'], ['jshint']);
  gulp.watch(['app/assets/images/**/*'], reload);
});

// Build and serve the output from the build
gulp.task('serve:build', ['default'], function () {
  browserSync({
    notify: false,
    logPrefix: 'WSK',
    // Run as an https by uncommenting 'https: true'
    // Note: this uses an unsigned certificate which on first access
    //       will present a certificate warning in the browser.
    // https: true,
    server: 'build'
  });
});

gulp.task('default', ['clean'], function(cb) {
  runSequence('bower_copy', ['sprites', 'styles', 'jshint', 'html', 'images', 'fonts', 'copy'], cb);
});
