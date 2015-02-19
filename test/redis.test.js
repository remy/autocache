'use strict';
/*global describe:true, it: true */
var redis = require('redis').createClient();
var store = require('./fixtures/autocache-redis');
var cache = require('../');

var test = require('tape');

test('redis sync cache', function (t) {
  t.plan(2);

  cache.reset().configure({ store: new store({ client: redis }) });
  cache.clear(); // dump existing data

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

  cache.reset().configure({ store: new store({ client: redis }) });
  cache.clear();

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
  cache.reset().configure({ store: new store({ client: redis }) });
  cache.clear();

  var n = 20;

  cache.define('number', function (done) {
    done(n++);
  });

  t.test('initial check', function (t) {
    cache.get('number', function (error, result) {
      t.ok(result === 20, 'should return 20');
      t.ok(error === null, 'should not error');
      t.end();
    });
  });

  t.test('closure', function (t) {
    cache.clear('number');
    cache.get('number', function (error, result) {
      t.ok(result === 21, 'should support closures');
      t.end();
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

  var cache1 = cache.reset().configure({ store: new store({ client: redis }) });
  var cache2 = cache.reset().configure({ store: new store({ client: redis }) });
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

  cache.reset().configure({ store: new store({ client: redis }) });
  cache.clear();

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

test('fin', function (t) {
  redis.end();
  t.end();
});