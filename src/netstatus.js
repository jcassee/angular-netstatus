'use strict';

/**
 * @ngdoc overview
 * @name netstatus
 * @description
 *
 * Service that keeps track of the browser online status and, with the help of
 * {@link NetstatusInterceptor}, can force the application offline.
 */
angular.module('netstatus', [])

  /**
   * @ngdoc service
   * @name Netstatus
   * @description
   *
   * Service that keeps track of the browser online status and, with the help of
   * {@link NetstatusInterceptor}, can force the application offline.
   */
  .factory('Netstatus', ['$log', '$rootScope', '$window', function ($log, $rootScope, $window) {
    var _offline = false;
    var _manualOffline = false;

    var service = {
      /**
       * @ngdoc property
       * @name Netstatus#offline
       * @description
       *
       * Read-only property that indicates whether the application is offline,
       * either as detected by the browser of forced offline manually.
       */
      get offline() {
        return _offline;
      },

      /**
       * @ngdoc property
       * @name Netstatus#browserOffline
       * @description
       *
       * Read-only property that indicates whether browser has detected that the
       * application is offline.
       */
      get browserOffline() {
        // PhantomJS sets navigator.onLine = false: https://github.com/ariya/phantomjs/issues/10647
        if ($window.navigator.userAgent.indexOf('PhantomJS') >= 0) return false;
        return !$window.navigator.onLine;
      },

      /**
       * @ngdoc property
       * @name Netstatus#manualOffline
       * @description
       *
       * Property that indicates whether the application is forced offline
       * manually.
       */
      get manualOffline() {
        return _manualOffline;
      },
      set manualOffline(value) {
        update(value);
      }
    };

    function update(manualOffline) {
      manualOffline = !!manualOffline;  // force boolean
      if (manualOffline != _manualOffline) {
        _manualOffline = manualOffline;
        $window.localStorage.setItem('netstatus.manualOffline', manualOffline ? 'true' : 'false');
      }

      var offline = service.browserOffline || manualOffline;
      if (offline != _offline) {
        _offline = offline;
        $rootScope.$broadcast('netstatus', service.offline ? 'offline' : 'online');
      }
    }

    function onEvent() {
      $rootScope.$apply(update(service.manualOffline));
    }
    $window.onoffline = onEvent;
    $window.ononline = onEvent;

    update($window.localStorage.getItem('netstatus.manualOffline') == 'true');

    return service;
  }])

  /**
   * @ngdoc service
   * @name NetstatusInterceptor
   * @description
   *
   * {@link $http `$http`} interceptor that blocks HTTP traffic if
   * {@link Netstatus#manualOffline} is set.
   */
  .factory('NetstatusInterceptor', ['$location', '$log', '$q', '$window', 'Netstatus',
      function ($location, $log, $q, $window, Netstatus) {
    var URL = $window.URL || $window.webkitURL;
    var interceptPrefix = null;

    return {
      /**
       * @ngdoc property
       * @name NetstatusInterceptor#interceptPrefix
       * @description
       *
       * If set, only URLs with this prefix are blocked.
       */
      get interceptPrefix() {
        return interceptPrefix;
      },
      set interceptPrefix(value) {
        if (!angular.isFunction(URL)) {
          throw new Error('interceptPrefix not supported: window.(webkit)URL is not a constructor');
        }
        interceptPrefix = value;
      },

      request: function (config) {
        var reject = Netstatus.manualOffline;

        // Only reject if we want to intercept the URL
        if (reject && interceptPrefix) {
          var absUrl = new URL(config.url, $location.absUrl()).href;
          var absInterceptPrefix = new URL(interceptPrefix, $location.absUrl()).href;
          reject = (absUrl.indexOf(absInterceptPrefix) === 0);
        }

        if (reject) {
          $log.debug('Offline, rejecting API call: ' + config.method + ' ' + config.url);
          return $q.reject({
            status: 0,
            statusText: 'Offline',
            config: config
          });
        } else {
          return config;
        }
      }
    };
  }])

  .config(function ($httpProvider) {
    $httpProvider.interceptors.push('NetstatusInterceptor');
  })

/**
 * @ngdoc controller
 * @name netstatus.controller:NetstatusController
 * @description
 *
 * Controller that sets the {@link Netstatus} service on the scope.
 */
  .controller('NetstatusController', function ($scope, Netstatus) {
    $scope.netstatus = Netstatus;
  })

;
