'use strict';
/*global describe:true, it: true */

function LC() {
  this.data = {};
}

LC.prototype = {
  getItem: function (key) {
    return this.data[key];
  },
  setItem: function (key, value) {
    this.data[key] = value;
    this.length = Object.keys(this.data).length;
  },
  removeItem: function (key) {
    delete this.data[key];
    this.length = Object.keys(this.data).length;
  },
  key: function (index) {
    return Object.keys(this.data)[index];
  },
  length: 0,
};


if (typeof global.localStorage === 'undefined') {
  global.localStorage = new LC();
}

var cache = require('../');
var store = require('./fixtures/autocache-localstorage');
var test = require('tape');

test('sync cache', function (t) {
  t.plan(2);

  cache.reset().configure({ store: new store() }).clear();

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

  cache.reset().configure({ store: new store() }).clear();

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
    t.ok(result === 21, 'supports closures, value now: ' + result);
  });

  cache.destroy('number', function () {
    cache.get('number', function (error, result) {
      t.ok(error instanceof Error, 'destroyed definition');
    });
  });
});

test('async cache', function (t) {
  t.plan(3);

  cache.reset().configure({ store: new store() }).clear();

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
  cache.reset().configure({ store: new store() }).clear();
  var cache1 = cache();
  var cache2 = cache();

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

test('errors', function (t) {
  t.plan(4);
  cache.reset().configure({ store: new store() }).clear();

  cache.configure({ store: {
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

  var cache2 = cache();

  cache2.get('missing', function (error, result) {
    t.ok(error.message.indexOf('No definition found') === 0, 'error returned from missing definition');
  });

  cache2.update('missing', function (error, result) {
    t.ok(error.message.indexOf('No definition found') === 0, 'error returned from missing definition');
  });

  cache2.define('erroring', function (done) {
    callunknownFunction();
    done(20);
  });

  cache2.get('erroring', function (error, result) {
    t.ok(error.message.indexOf('callunknownFunction') !== -1, 'captured error from definition');
  });
});