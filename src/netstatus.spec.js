'use strict';

describe('Netstatus', function () {
  beforeEach(module('netstatus'));

  // Mocks

  var mockWindow;

  /** Simulate changing the browser online status. */
  function simulateBrowserOnline(state) {
    if (state !== mockWindow.navigator.onLine) {
      mockWindow.navigator.onLine = state;
      if (state) {
        mockWindow.ononline();
      } else {
        mockWindow.onoffline();
      }
    }
  }

  beforeEach(function () {
    mockWindow = {
      localStorage: window.localStorage,
      navigator: {
        onLine: null,  // initialized in subsections
        userAgent: 'test'
      },
      ononline: function () {},
      onoffline: function () {}
    };

    window.localStorage.clear();
    module(function ($provide) {
      $provide.value('$window', mockWindow);
    });
  });

  // Online tests

  describe('when started in online state', function () {
    beforeEach(function() {
      mockWindow.navigator.onLine = true;
    });

    it('should initialize correctly', inject(function (Netstatus) {
      expect(Netstatus.offline).toBe(false);
      expect(Netstatus.manualOffline).toBe(false);
    }));

    it('should go offline when forced offline', inject(function (Netstatus) {
      expect(Netstatus.offline).toBe(false);
      expect(Netstatus.manualOffline).toBe(false);

      Netstatus.manualOffline = true;
      expect(Netstatus.offline).toBe(true);
      expect(Netstatus.manualOffline).toBe(true);

      Netstatus.manualOffline = false;
      expect(Netstatus.offline).toBe(false);
      expect(Netstatus.manualOffline).toBe(false);
    }));

    it('should go offline on browser event', function (done) {
      inject(function ($rootScope, Netstatus) {
        spyOn($rootScope, '$digest').and.callFake(function () {
          expect(Netstatus.offline).toBe(true);
          done();
        });
        simulateBrowserOnline(false);
      });
    });

    it('should go online when unsetting forced offline', inject(function (Netstatus) {
      Netstatus.manualOffline = true;
      expect(Netstatus.offline).toBe(true);
      expect(Netstatus.manualOffline).toBe(true);

      Netstatus.manualOffline = false;
      expect(Netstatus.offline).toBe(false);
      expect(Netstatus.manualOffline).toBe(false);
    }));
  });

  // Offline tests

  describe('when started in offline state', function () {
    beforeEach(function() {
      mockWindow.navigator.onLine = false;
    });

    it('should initialize correctly', inject(function (Netstatus) {
      expect(Netstatus.offline).toBe(true);
      expect(Netstatus.manualOffline).toBe(false);
    }));

    it('should go online on browser event', function (done) {
      inject(function ($rootScope, Netstatus) {
        spyOn($rootScope, '$digest').and.callFake(function () {
          expect(Netstatus.offline).toBe(false);
          done();
        });
        simulateBrowserOnline(true);
      });
    });

    it('should stay offline if forced offline', inject(function (Netstatus) {
      Netstatus.manualOffline = true;
      simulateBrowserOnline(false);
      expect(Netstatus.offline).toBe(true);
      expect(Netstatus.manualOffline).toBe(true);
    }));
  });

  // PhantomJS tests

  describe('when running in PhantomJS (which always reports offline)', function () {
    beforeEach(function() {
      mockWindow.navigator.onLine = false;
      mockWindow.navigator.userAgent = 'PhantomJS';
    });

    it('should initialize online', inject(function (Netstatus) {
      expect(Netstatus.offline).toBe(false);
    }));
  });
});


describe('NetstatusInterceptor', function () {
  beforeEach(module('netstatus', function ($httpProvider) {
    $httpProvider.interceptors.push('NetstatusInterceptor');
  }));

  // Mocks

  var mockNetstatus, mockWindow;

  beforeEach(module(function ($provide) {
    mockNetstatus = {
      offline: false,
      manualOffline: false
    };
    $provide.value('Netstatus', mockNetstatus);

    mockWindow = {
      URLUtils: window.URLUtils
    };
    $provide.value('$window', mockWindow);
  }));

  // Setup

  var $httpBackend;

  beforeEach(inject(function ($injector) {
    $httpBackend = $injector.get('$httpBackend');
  }));

  afterEach(function () {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  // Tests

  it('has an interceptPrefix property', inject(function (NetstatusInterceptor) {
    expect(NetstatusInterceptor.interceptPrefix).toBeNull();
    NetstatusInterceptor.interceptPrefix = 'http://example.com/';
    expect(NetstatusInterceptor.interceptPrefix).toBe('http://example.com/');
  }));

  it('throws an error when window.URL is not a constructor', function () {
    mockWindow.URLUtils = null;
    inject(function (NetstatusInterceptor) {
      expect(function () {
        NetstatusInterceptor.interceptPrefix = 'http://example.com/';
      }).toThrowError(/interceptPrefix not supported/);
    });
  });

  // TODO: These tests need to be rewritten
  //
  it('does not intercept requests when online', inject(function ($http) {
    $httpBackend.expectGET('http://example.com').respond('');
    $http.get('http://example.com');
    $httpBackend.flush();
  }));

  it('does not intercept non-prefix requests', inject(function ($http, $rootScope, NetstatusInterceptor) {
    mockNetstatus.manualOffline = true;
    NetstatusInterceptor.blockManualOffline = true;
    NetstatusInterceptor.interceptPrefix = 'http://example.com/intercept/';
    $httpBackend.expectGET('http://example.com/donotintercept/this').respond('');
    $http.get('http://example.com/donotintercept/this');
    $httpBackend.flush();
  }));

  it('intercepts prefix requests', inject(function ($http, $rootScope, NetstatusInterceptor) {
    mockNetstatus.manualOffline = true;
    NetstatusInterceptor.blockManualOffline = true;
    NetstatusInterceptor.interceptPrefix = 'http://example.com/intercept/';
    $http.get('http://example.com/intercept/this').catch(function (response) {
      expect(response.status).toBe(0);
    });
    $rootScope.$digest();
  }));
});


describe('NetstatusController', function () {
  beforeEach(module('netstatus'));

  // Mocks

  var NetstatusCtrl;
  var scope;
  var Netstatus = {
    offline: false,
    browserOffline: false,
    manualOffline: false
  };

  // Injection

  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    NetstatusCtrl = $controller('NetstatusController', {
      $scope: scope,
      Netstatus: Netstatus
    });
  }));

  // Tests

  it('should contain the Netstatus service', function () {
    expect(scope.netstatus).toBe(Netstatus);
  });
});
