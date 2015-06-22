# angular-netstatus — AngularJS offline status

This project contains a service, an `$http` interceptor and a controller that
detect the browser online status and add a manual offline mode to block any HTTP
traffic.

Forcing offline mode manually is useful in situations where the browser is
online, but the connection is so slow or unreliable that the application becomes
unresponsive.


## Installation

Install using [Bower](http://bower.io):

    $ bower install angular-netstatus
    
Add `src/netstatus.js` to your project. Many build tools will do this
automatically.

You can run the tests using `npm`:

    $ npm test


## Usage

The `Netstatus` service has three properties that are used to detect and control
the online status:

  * `manualOffline`: can be set to force the application to go offline
  * `browserOffline`: whether the browser has detected that it is offline
     (read-only)
  * `offline`: whether the application is offline, either as detected by the
     browser or forced manually (read-only) 

The manual offline mode is implemented using the `NetstatusInterceptor` that is
added to the `$http` interceptors list automatically. It will reject any HTTP
request while `Netstatus.manualOffline` is `true`.

You can restrict this behavior to a specific URL prefix, for example your API
endpoints, by setting `NetstatusInterceptor.interceptPrefix`:

    module('mymodule').run(function (NetstatusInterceptor) {
      NetstatusInterceptor.interceptPrefix = 'https://api.example.com/';
    });

The `NetstatusController` simply exposes the `Netstatus` service on the scope.
