'use strict';
/*global describe:true, it: true */
var Cache = require('../');
var test = require('tape');

test('sync cache', function (t) {
  t.plan(2);

  var cache = new Cache();

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

test('clearing values', function(t) {
  t.plan(5);

  var cache = new Cache();

  var n = 20;

  cache.define('number', function () {
    return n++;
  });

  cache.get('number', function (error, result) {
    t.ok(result === 20, 'inital value is correct');
  });

  cache.get('number', function (error, result) {
    t.ok(result === 20, 'cached value has not changed');
  });

  cache.clear('number');
  cache.get('number', function (error, result) {
    t.ok(!error, 'cleared value and re-collects');
    t.ok(result === 21, 'supports closures');
  });

  cache.destroy('number');
  cache.get('number', function (error, result) {
    t.ok(error instanceof Error, 'destroyed definition');
  });
});

test('async cache', function (t) {
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

test('singleton cache', function (t) {
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