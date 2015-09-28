module.exports = function (config) {
  config.set({

    files: [
      'bower_components/angular/angular.js',
      'bower_components/angular-mocks/angular-mocks.js',
      'src/*.js'
    ],

    autoWatch: true,

    frameworks: ['jasmine'],

    browsers: ['PhantomJS'],

    preprocessors: {
      'src/netstatus.js': ['coverage']
    },

    reporters: ['progress', 'coverage'],

    coverageReporter: {
      reporters: [{type: 'text-summary'}]
    }
  });
};
