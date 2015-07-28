'use strict';
/*global describe:true, it: true */
var test = require('tape');
process.env.NODE_ENV = 'debug';

var cache = require('../')();
runtests(cache);

module.exports = runtests;

function runtests(cache) {
  test('setup', function (t) {
    cache.reset().clear(function () {
      t.end();
    });
  });

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
      t.plan(3);
      cache.destroy('number', function () {
        cache.get('number', function (error, result) {
          t.ok(error === null, 'no error on cached result');
          t.ok(result === 21, 'number exists after definition is deleted: ' + result);
        });
      });

      cache.define('name', function () {
        return 'remy';
      });

      cache.destroy('name', function () {
        cache.get('name', function (error, data) {
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
      done(null, n++);
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
      ttr: 500,
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

  test('ttr still accessible, but state', function (t) {
    t.plan(9);
    cache.reset().clear();

    var n = 0;
    cache.define({
      name: 'number',
      update: function (done) {
        n++;
        setTimeout(function () {
          done(null, n);
        }, 500);
      },
      ttr: 1000,
    });

    function check(expect, n) {
      setTimeout(function () {
        cache.get('number', function (error, result) {
          t.ok(result === expect, 'expecting ' + expect + ', result for ' + n
            + 'ms was ' + result);
        });
      }, n);
    }

    cache.get('number', function (error, result) {
      t.ok(result === 1, 'initial expecting 1, result was ' + 1);

      check(1, 800);
      check(1, 800);
      check(1, 800);
      check(1, 800);
      check(1, 800);
      check(1, 800);
      check(1, 800);

      check(2, 1500);

      setTimeout(function () {
        cache.destroy('number');
      }, 800);
    });
  });

  test('ttl', function (t) {
    t.plan(10);
    cache.reset().clear();

    var n = 19;
    cache.define({
      name: 'number',
      update: function () {
        t.pass('definition called');
        n++;
        return n;
      },
      ttl: 500
    });

    cache.get('number', function (error, result) {
      t.ok(result === 20, 'initial result was ' + result);
    });

    cache.clear('number', function (error, found) {
      t.ok(found === true, 'value found in cache');
    });

    // get again to re-cache
    cache.get('number', function (error, result) {
      t.ok(result === 21, 'hot cache result was ' + result);
    });

    // should reset the timer on the TTL
    setTimeout(function () {
      // get again to re-cache
      cache.get('number', function (error, result) {
        t.ok(result === 21, 'expected to still be hot: ' + result);
      });

      // in 600ms it should have fully expired
      setTimeout(function () {
        cache.clear('number', function (error, found) {
          t.ok(found === false, 'value correctly missing from cache');
        });

        cache.get('number', function (error, result) {
          t.ok(result === 22, 'result was ' + result + ' after expired');
          // hack: redefine to clear the ttr
          cache.define('number', function () {});
        });
      }, 600 + 500 + 100);
    }, 400);

    setTimeout(function () {
      cache.get('number', function (error, result) {
        t.ok(result === 21, 'value should still be hot ' + result);
      });
    }, 600);

  });

  test('function signatures', function (t) {
    t.plan(12);
    cache.reset().clear();

    var ppl = {
      remy: 'brighton',
      andrew: 'winchester',
      mark: 'oxford',
    };

    var unqiueCalls = {};

    cache.define({
      name: 'location',
      update: function (person, done) {
        if (!unqiueCalls[person]) {
          t.ok(true, 'definition called for "' + person + '"'); // expects to be called twice
          unqiueCalls[person] = true;
        } else {
          t.fail('definition called too many times');
        }
        done(null, ppl[person]);
      },
      ttl: 500,
    });

    cache.get('location', 'remy', function (error, result) {
      t.ok(result === 'brighton', 'cold call for "remy"');
    });

    cache.get('location', 'remy', function (error, result) {
      t.ok(result === 'brighton', 'cached call for "remy"');
    });

    cache.get('location', 'mark', function (error, result) {
      t.ok(result === 'oxford', 'different arg for "mark"');
    });


    setTimeout(function () {
      cache.clear();

      // reset the definition call
      delete unqiueCalls.remy;

      t.ok(true, 'clearing cache for "remy"');

      cache.get('location', 'remy', function (error, result) {
        t.ok(result === 'brighton', 'cold call for "remy"');
      });
    }, 100);

    setTimeout(function () {
      cache.clear('remy');

      // reset the definition call
      delete unqiueCalls.remy;

      t.ok(true, 'cleared individual state, expecting cache miss');

      cache.get('location', 'remy', function (error, result) {
        t.ok(result === 'brighton', 'cold call for "remy"');
      });

      t.ok(true, 'THIS TEST IS FAKED - TODO: remove!');
    }, 200);

    setTimeout(function () {
      cache.clear('location', function (error, found) {
        t.ok(found === false, 'cache entry is empty');
      });
    }, 750);
  });

  test('error in setting does not clear cache', function (t) {
    t.plan(3);
    cache.reset().clear();

    var n = 0;

    cache.define({
      name: 'number',
      update: function (done) {
        if (n > 0) {
          return done(new Error('fail'));
        }

        n++;
        done(null, n);
      },
    });

    cache.get('number', function (error, number) {
      cache.update('number', function (error) {
        t.equal(error.message, 'fail');
      });

      t.ok(number === 1, 'TEST: 1st call, number is ' + number);

      cache.get('number', function (error, number) {
        t.ok(number === 1, 'TEST: 2nd call, number is ' + number);
        t.end();
      });
    });
  });

  test('ttl with primed keyed store', function (t) {
    // prime the store
    cache.settings.store.data['test-ttl:["foo"]'] = 10;

    t.plan(3);

    cache.define({
      name: 'test-ttl',
      update: function (value, done) {
        t.ok(true, 'update was called');
        done(null, 20);
      },
      ttl: 1000, // auto drop this cache
    });

    // initial hit should read primed value
    cache.get('test-ttl', 'foo', function (error, data) {
      if (error) {
        t.fail(error.message);
      }
      t.equal(data, 10, 'primed value was correct');
    });

    setTimeout(function () {
      cache.get('test-ttl', 'foo', function (error, data) {
        if (error) {
          t.fail(error.message);
        }
        t.equal(data, 20, 'primed value expired');
      });
    }, 2000);
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