'use strict';
/*global describe:true, it: true */
var Cache = require('../');
var redis = require('redis').createClient();
var store = require('connect-redis')(Cache);

var test = require('tape');

test('redis sync cache', function (t) {
  t.plan(2);

  var cache = new Cache({ store: new store({ client: redis, disableTTL: true }) });

  var n = 20;

  cache.define('number', function () {
    return n++;
  });

  cache.get('number', function (error, result) {
    t.ok(result === 20, 'should return 20');
  });

  cache.get('number', function (error, result) {
    t.ok(error === null, 'should not error');
  });
});

test.only('redis clearing values', function(t) {
  t.plan(5);

  var cache = new Cache({ store: new store({ client: redis, disableTTL: true }) });

  var n = 40;

  cache.define('number', function () {
    console.log('definition called: ' + n);
    return n++;
  });

  cache.get('number', function (error, result) {
    t.ok(result === 40, 'inital value is correct');
  });

  cache.get('number', function (error, result) {
    t.ok(result === 40, 'cached value has not changed');
  });

  cache.clear('number', function (error) {
    // console.log('getting', error);
    cache.get('number', function (error, result) {
      t.ok(!error, 'cleared value and re-collects');
      t.ok(result === 41, 'supports closures: ' + result);
    });

    cache.destroy('number', function () {
      cache.get('number', function (error, result) {
        t.ok(error instanceof Error, 'destroyed definition');
          redis.end();
      });
    });
  });

});

test('redis async cache', function (t) {
  t.plan(3);
  var cache = new Cache();

  var n = 20;

  cache.define('number', function (done) {
    done(n++);
  });

  cache.get('number', function (error, result) {
    t.ok(result === 20, 'should return 20');
  });

  cache.get('number', function (error, result) {
    t.ok(error === null, 'should not error');
  });


  cache.clear('number');
  cache.get('number', function (error, result) {
    t.ok(result === 21, 'should support closures');
  });
});

test('redis singleton cache', function (t) {
  t.plan(2);
  var cache1 = Cache();
  var cache2 = Cache();

  var n = 20;

  cache1.define('number', function () {
    return n++;
  });

  cache1.get('number', function (error, result) {
    t.ok(result === 20, 'cache1 should return 20');
  });

  cache2.get('number', function (error, result) {
    t.ok(result === 20, 'cache2 should also return 20');
  });
});

test('redis errors', function (t) {
  t.plan(4);

  var cache = new Cache({ store: {
    get: function (key, callback) {
      callback(new Error('failed'));
    },
    set: function () {},
    destroy: function () {},
  }});

  cache.define('number', function () {
    return 20;
  });

  cache.get('number', function (error, result) {
    t.ok(error instanceof Error, 'error returned from get');
  });

  var cache2 = new Cache();

  cache2.get('missing', function (error, result) {
    t.ok(error.message === 'No definition found', 'error returned from missing definition');
  });

  cache2.update('missing', function (error, result) {
    t.ok(error.message === 'No definition found', 'error returned from missing definition');
  });

  cache2.define('erroring', function (done) {
    callunknownFunction();
    done(20);
  });

  cache2.get('erroring', function (error, result) {
    t.ok(error.message.indexOf('callunknownFunction') !== -1, 'captured error from definition');
  });
});

test('fin', function (t) {
  redis.end();
  t.end();
});