'use strict';
/*global describe:true, it: true */
var redis = require('redis').createClient();
var cache = require('../');
var store = require('../adapters/redis')({ client: redis, cache: cache });

var test = require('tape');

test('redis sync cache', function (t) {
  t.plan(2);

  cache.reset().clear(); // dump existing data

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

test('redis clearing values', function(t) {
  t.plan(2);

  cache.reset().clear();

  var n = 40;

  cache.define('number', function () {
    return n++;
  });

  t.test('initial check', function (t) {
    t.plan(2);
    cache.get('number', function (error, result) {
      t.ok(result === 40, 'inital value is correct');
    });

    cache.get('number', function (error, result) {
      t.ok(result === 40, 'cached value has not changed');
    });
  });

  t.test('clearing', function (t) {
    t.plan(3);
    cache.clear('number', function (error) {
      cache.get('number', function (error, result) {
        t.ok(!error, 'cleared value and re-collects');
        t.ok(result === 41, 'supports closures: ' + result);
      });

      cache.destroy('number', function () {
        cache.get('number', function (error, result) {
          t.ok(error instanceof Error, 'destroyed definition');
        });
      });
    });
  });
});

test('redis async cache', function (t) {
  t.plan(3);
  cache.reset().clear();

  var n = 30;

  cache.define('number', function (done) {
    done(n++);
  });

  t.test('initial check', function (t) {
    cache.get('number', function (error, result) {
      t.ok(result === 30, 'should return 30');
      t.ok(error === null, 'should not error');
      t.end();
    });
  });

  t.test('closure', function (t) {
    cache.clear('number', function () {

      cache.get('number', function (error, result) {
        t.ok(result === 31, 'should support closures');
        t.end();
      });
    });
  });

  t.test('clear', function (t) {
    cache.clear('number', function () {
      t.ok(true, 'cleared');
      t.end();
    });
  });
});

test('redis singleton cache', function (t) {
  t.plan(2);

  var cache1 = cache.reset();
  var cache2 = cache.reset();
  cache1.clear();
  cache2.clear();

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

  cache.reset().clear();

  cache.get('missing', function (error, result) {
    t.ok(error.message.indexOf('No definition found') === 0, 'error returned from missing definition');
  });

  cache.update('missing', function (error, result) {
    t.ok(error.message.indexOf('No definition found') === 0, 'error returned from missing definition');
  });

  cache.define('erroring', function (done) {
    callunknownFunction();
    done(20);
  });

  cache.get('erroring', function (error, result) {
    t.ok(error.message.indexOf('callunknownFunction') !== -1, 'captured error from definition');
  });

  cache.clear('erroring', function () {
    t.ok(true, 'cleared');
  });
});

test('final checks', function (t) {
  redis.set('autocache:TEST', 'ok', function (er) {
    if (er) {
      return t.fail('failed to create test item');
    }
    t.pass('test item inserted');
  });
  redis.set('autocache:TEST1', 'ok', function (er) {
    if (er) {
      return t.fail('failed to create test item');
    }
    t.pass('test item inserted');
  });
  redis.set('autocache:TEST2', 'ok', function (er) {
    if (er) {
      return t.fail('failed to create test item');
    }
    t.pass('test item inserted');
  });
  redis.set('autocache:TEST3', 'ok', function (er) {
    if (er) {
      return t.fail('failed to create test item');
    }
    t.pass('test item inserted');
  });

  cache.clear();

  setTimeout(function () {
    redis.keys('autocache:*', function(error, key) {
      t.ok(key.length === 0, 'keys remaining in redis: ' + key.length);
    });
    redis.end();
    t.end();
  }, 100)
});