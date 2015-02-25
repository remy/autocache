'use strict';
/*global describe:true, it: true */
var test = require('tape');

runtests(require('../')());

module.exports = runtests;

function runtests(cache) {
  test('sync cache', function (t) {
    t.plan(3);

    cache.reset().clear();

    var n = 20;

    cache.define('number', function () {
      return n++;
    });

    cache.get('number', function (error, result) {
      t.ok(result === 20, 'should return 20');
    });

    cache.get('number', function (error, result) {
      t.ok(error === null, 'should not error');
      t.ok(result === 20, 'should return 20');
    });
  });

  test('clearing values', function(t) {
    t.plan(3);

    cache.reset().clear();

    var n = 20;

    cache.define('number', function () {
      return n++;
    });

    t.test('inital tests', function (t) {
      t.plan(2);

      cache.get('number', function (error, result) {
        t.ok(result === 20, 'inital value is correct');
      });

      cache.get('number', function (error, result) {
        t.ok(result === 20, 'cached value has not changed');
      });
    });

    t.test('clear', function (t) {
      t.plan(2);
      cache.clear('number');
      cache.get('number', function (error, result) {
        t.ok(!error, 'cleared value and re-collects');
        t.ok(result === 21, 'supports closures, value now: ' + result);
      });
    });

    t.test('destroy', function (t) {
      cache.destroy('number', function () {
        cache.get('number', function (error, result) {
          t.ok(error instanceof Error, 'destroyed definition');
          t.end();
        });
      });
    });
  });

  test('async cache', function (t) {
    t.plan(3);

    cache.reset().clear();

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
    cache.reset();
    var cache1 = cache();
    var cache2 = cache();

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

  test('ttr', function (t) {
    t.plan(2);
    cache.reset().clear();

    var n = 19;
    cache.define({
      name: 'number',
      update: function () {
        n++;
        return n;
      },
      ttr: 500
    });

    cache.get('number', function (error, result) {
      t.ok(result === 20, 'result was ' + result);
    });

    setTimeout(function () {
      cache.get('number', function (error, result) {
        t.ok(result === 21, 'result was ' + result + ' after auto refresh');
        // hack: redefine to clear the ttr
        cache.define('number', function () {});
        t.end();
      });
    }, 750);

  });

  // NOTE: errors must be last, as the internal memory store has been lost
  test('errors', function (t) {
    t.plan(2);
    cache.reset().clear();

    t.test('throwing', function (t) {
      t.plan(1);
      cache.configure({ store: {
        toString: function () {
          return 'ErrorStore'
        },
        get: function (key, callback) {
          callback(new Error('failed'));
        },
        set: function () {},
        destroy: function () {},
      }});

      cache.emit('connect');

      cache.define('number', function () {
        return 20;
      });

      cache.get('number', function (error, result) {
        t.ok(error instanceof Error, 'error returned from get');
      });
    });

    t.test('missing', function (t) {
      t.plan(3);
      var cache2 = cache({ store: false });

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
  });
}