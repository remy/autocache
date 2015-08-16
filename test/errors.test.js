var test = require('tape');
var cache = require('..');

// NOTE: errors must be last, as the internal memory store has been lost
test('errors', function (t) {
  t.plan(2);

  t.test('throwing', function (t) {
    t.plan(1);
    cache.configure({ store: {
      toString: function () {
        return 'ErrorStore';
      },
      get: function (key, callback) {
        callback(new Error('failed'));
      },
      set: function () {},
      destroy: function () {},
      clear: function () {},
      dock: function () {},
    }, });

    cache.emit('connect');

    cache.define('number', function () {
      return 20;
    });

    cache.get('number', function (error) {
      t.ok(error instanceof Error, 'error returned from get');
    });
  });

  t.test('missing', function (t) {
    t.plan(3);
    var cache2 = cache({ store: false });

    cache2.get('missing', function (error) {
      t.ok(error.message.indexOf('No definition found') === 0, 'error returned from missing definition');
    });

    cache2.update('missing', function (error) {
      t.ok(error.message.indexOf('No definition found') === 0, 'error returned from missing definition');
    });

    cache2.define('erroring', function (done) {
      callunknownFunction(); // jshint ignore:line
      done(20);
    });

    cache2.get('erroring', function (error) {
      t.ok(error.message.indexOf('callunknownFunction') !== -1, 'captured error from definition');
    });
  });
});