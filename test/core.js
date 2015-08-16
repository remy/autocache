module.exports = runtests;

var test = require('tape');
var async = require('async');

function runtests(cache, done) {
  cache.debug = true;

  test = beforeEach(test, function (t) {
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

  test('clearing values', function (t) {
    t.plan(3);

    var n = 20;

    cache.define('number', function () {
      return n++;
    });

    t.test('inital tests', function (t) {
      t.plan(2);

      cache.get('number', function (error, result) {
        t.equal(result, 20, 'inital value is correct');
      });

      cache.get('number', function (error, result) {
        t.equal(result, 20, 'cached value has not changed');
      });
    });

    t.test('clear', function (t) {
      t.plan(3);
      cache.clear('number', function (error, res) {
        t.equal(res, true, 'value was found and cleared');

        cache.get('number', function (error, result) {
          t.ok(!error, 'cleared value and re-collects');
          t.equal(result, 21, 'supports closures, value now: ' + result);
        });
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
      done(null, n);
      n++;
    });

    cache.get('number', function (error, result) {
      t.ok(result === 20, 'should return 20');
    });

    cache.get('number', function (error) {
      t.ok(error === null, 'should not error');
    });


    setTimeout(function () {
      cache.clear('number', function () {
        cache.get('number', function (error, result) {
          t.equal(result, 21, 'should support closures');
        });
      });
    }, 100);

  });

  test('singleton cache', function (t) {
    t.plan(2);
    cache.reset();
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

  test('ttr', function (t) {
    t.plan(2);

    async.waterfall([
      function (done) {
        cache.reset().clear(function () {
          var n = 19;
          cache.define({
            name: 'number',
            update: function () {
              n++;
              return n;
            },
            ttr: 500,
          });
          done();
        });
      },
      function (done) {
        cache.get('number', function (error, result) {
          t.ok(result === 20, 'result was ' + result);
          done();
        });
      },
      function (done) {
        setTimeout(function () {
          cache.get('number', function (error, result) {
            t.equal(result, 21, 'result was ' + result + ' after auto refresh');
            // hack: redefine to clear the ttr
            cache.define('number', function () {});
            done();
            // t.end();
          });
        }, 750);

      },
    ]);
  });

  test('ttr still accessible, but state', { skip: true }, function (t) {
    t.plan(12);

    var n = 0;
    var timeout = null;
    cache.define({
      name: 'number',
      update: function (done) {
        n++;
        timeout = setTimeout(function () {
          t.pass('definition set');
          done(null, n);
        }, 500);
      },
      ttr: 1000,
    });

    function check(expect, n, done) {
      setTimeout(function () {
        cache.get('number', function (error, result) {
          t.equal(result, expect, 'expecting ' + expect + ', result for ' +
            n + 'ms was ' + result);
          done();
        });
      }, n);

      // if (expect === 2) {
      //   setTimeout(function () {
      //     cache.reset();
      //   }, n + 100);
      // }
    }

    cache.get('number', function (error, result) {
      t.equal(result, 1, 'initial expecting 1, result was ' + result);

      async.waterfall([
        check.bind(null, 1, 800),
        check.bind(null, 1, 0),
        check.bind(null, 1, 0),
        check.bind(null, 1, 0),
        check.bind(null, 1, 0),
        check.bind(null, 1, 0),
        check.bind(null, 1, 0),
        check.bind(null, 2, 700),
        function (done) {
          setTimeout(function () {
            cache.destroy('number');
            clearTimeout(timeout);
            cache.clear('number', done);
          }, 900);
        },
      ]);

      // setTimeout(function () {
      //   cache.destroy('number');
      // }, 800);
    });
  });

  test('ttl', function (t) {
    t.plan(11);

    /**
     * plan: test time to live automatically resets timeout
     *
     * 1. create "number" definition (ttl: 500) returns ++19
     * 2. get number (20)
     * 3. get number again inside timeout (20)
     * 4. clear number (value found: true)
     * 5. get number (21)
     */

    var n = 19;
    cache.define({
      name: 'number',
      update: function () {
        t.pass('definition called');
        n++;
        return n;
      },
      ttl: 500,
    });

    async.waterfall([
      function (done) {
        cache.get('number', function (error, result) {
          t.equal(result, 20, 'initial result was ' + result);
          done();
        });
      },
      function (done) {
        cache.get('number', function (error, result) {
          t.equal(result, 20, 'initial result was ' + result);
          done();
        });
      },
      function (done) {
        cache.clear('number', function (error, found) {
          t.equal(found, true, 'value found in cache');
          done();
        });
      },
      function (done) {
        // get again to re-cache
        cache.get('number', function (error, result) {
          t.equal(result, 21, 'hot cache result was ' + result);
          done();
        });
      },
      function (done) {
        // should reset the timer on the TTL
        setTimeout(function () {
          // get again to re-cache
          cache.get('number', function (error, result) {
            t.equal(result, 21, 'expected to still be hot after @ 400ms: ' + result);
          });
        }, 400);

        setTimeout(function () {
          cache.get('number', function (error, result) {
            t.equal(result, 21, 'value should still be hot @ 600ms: ' + result);
            done();
          });
        }, 600);
      },
      function (done) {
        // in 600ms it should have fully expired
        setTimeout(function () {
          cache.clear('number', function (error, found) {
            t.equal(found, false, 'value correctly missing from cache');

            cache.get('number', function (error, result) {
              t.equal(result, 22, 'result was ' + result + ' after expired');
              // hack: redefine to clear the ttr
              cache.define('number', function () {});
              done();
            });
          });
        }, 600 + 500 + 100);
      },
    ]);


  });

  test('function signatures', function (t) {
    t.plan(11);

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
          // expects to be called twice
          t.ok(true, 'definition called for "' + person + '"');
          unqiueCalls[person] = true;
        } else {
          t.fail('definition called too many times');
        }
        done(null, ppl[person]);
      },
      ttl: 500,
    });

    async.waterfall([
      function (done) {
        cache.get('location', 'remy', function (error, result) {
          t.ok(result === 'brighton', 'cold call for "remy"');
          done();
        });
      },
      function (done) {
        cache.get('location', 'remy', function (error, result) {
          t.ok(result === 'brighton', 'cached call for "remy"');
          done();
        });
      },
      function (done) {
        cache.get('location', 'mark', function (error, result) {
          t.ok(result === 'oxford', 'different arg for "mark"');
          done();
        });
      },

      function (done) {
        cache.clear(function () {
          // reset the definition call
          delete unqiueCalls.remy;

          t.pass('clearing cache for "remy"');

          cache.get('location', 'remy', function (error, result) {
            t.ok(result === 'brighton', 'cold call for "remy"');
            done();
          });
        });
      },

      function (done) {
        cache.clear('remy', function (err, cleared) {
          t.equal(cleared, false, 'cleared individual state, expecting cache miss');

          // reset the definition call
          delete unqiueCalls.remy;

          cache.get('location', 'remy', function (error, result) {
            t.ok(result === 'brighton', 'cold call for "remy"');
            done();
          });
        });
      },

      function (done) {
        cache.clear('location', function (error, found) {
          t.ok(found === false, 'cache entry is empty');
          done();
        });
      },
    ]);
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
    t.plan(4);
    cache.settings.store.set('test-ttl:["foo"]', 10, function (error) {
      t.equal(error, null, 'cached primed');

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
  });

  if (done) {
    test('final tests', function (t) {
      done(t);
    });
  }
}

function beforeEach(test, handler) {
  function tapish(name, opts, listener) {
    if (typeof opts === 'function') {
      listener = opts;
      opts = {};
    }
    test(name, opts, function (assert) {
      var _end = assert.end;
      assert.end = function () {
        assert.end = _end;
        listener(assert);
      }

      handler(assert);
    });
  }

  tapish.only = test.only;

  return tapish;
}

function afterEach(test, handler) {
  function tapish(name, listener) {
    test(name, function (assert) {
      var _end = assert.end;
      assert.end = function () {
        assert.end = _end;
        handler(assert);
      };

      listener(assert);
    });
  }

  return tapish;
}