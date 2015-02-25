var Cache = (function () {
  'use strict';

  var noop = function () {};

  var connected = false;
  var methodQueue = {};

  function MemoryStore() {
    this.data = {};
    connected = true;
  }

  MemoryStore.prototype = {
    toString: function () {
      return 'MemoryStore(#' + Object.keys(this.data).length + ')';
    },
    get: function (key, callback) {
      callback(null, this.data[key]);
    },
    set: function (key, value, callback) {
      this.data[key] = value;
      if (callback) {
        callback(null, value);
      }
    },
    destroy: function (key, callback) {
      delete this.data[key];
      if (callback) {
        callback();
      }
    },
    clear: function (callback) {
      this.data = {};
      if (callback) {
        callback();
      }
    }
  };

  var settings = {
    store: new MemoryStore(),
    definitions: {},
    queue: {}
  };

  function stub(method, fn) {
    methodQueue[method] = [];
    return function stubWrapper() {
      if (!connected) {
        return methodQueue[method].push({ context: this, arguments: arguments });
      }
      fn.apply(this, arguments);
    };
  }

  function flush() {
    Object.keys(methodQueue).forEach(function (method) {
      methodQueue[method].forEach(function (data) {
        cache[method].apply(data.context, data.arguments);
      });
    });
  }

  function reset() {
    settings.definitions = {};
    settings.queue = {};
    return cache;
  }

  function cache(options) {
    if (options === undefined) {
      options = {};
    }

    if (!settings.store) {
      reset();
    }

    if (options.store !== undefined) {
      connected = false;
      settings.store = options.store;
    }

    if (!settings.store) {
      settings.store = new MemoryStore();
    }

    return cache;
  }

  function define(key, callback) {
    var options = {};
    if (!callback && typeof key !== 'string') {
      // expect object with options
      options = key;
      callback = options.update;
      key = options.name;
    }

    if (!key || !callback) {
      throw new Error('define require a name and callback');
    }

    if (settings.definitions[key] && settings.definitions[key].timer) {
      clearInterval(settings.definitions[key].timer);
    }

    settings.definitions[key] = callback;

    if (options.ttr || options.ttl) {
      settings.definitions[key].timer = setInterval(function () {
        cache[options.ttr ? 'update' : 'clear'](key);
      }, options.ttr || options.ttl);
    }

  }

  function update(key, callback) {
    if (!callback) {
      callback = noop;
    }

    if (!settings.definitions[key]) {
      return callback(new Error('No definition found in update for ' + key));
    }

    function done(error, result) {
      callback(error, result);
      if (settings.queue[key] && settings.queue[key].length) {
        settings.queue[key].forEach(function (callback) {
          callback(error, result);
        });
      }
      delete settings.queue[key];
    }

    try {
      var fn = settings.definitions[key];
      if (fn.length) {
        fn(function (result) {
          settings.store.set(key, JSON.stringify(result), function (error) {
            done(error, result);
          });
        });
      } else {
        var result = fn();
        settings.store.set(key, JSON.stringify(result), function (error) {
          done(error, result);
        });
      }
    } catch (e) {
      done(e);
    }
  }

  function get(key, callback) {
    if (!callback) {
      callback = noop;
    }

    settings.store.get(key, function (error, result) {
      if (error) {
        return callback(error);
      }

      if (!settings.definitions[key]) {
        return callback(new Error('No definition found in get for ' + key));
      }

      if (!error && result === undefined) {
        // if there's a queue waiting for this data, hold up,
        // else go get it
        if (settings.queue[key] !== undefined) {
          return settings.queue[key].push(callback);
        } else {
          settings.queue[key] = [];
          return update(key, callback);
        }
      }

      try {
        return callback(null, JSON.parse(result));
      } catch (error) {
        return callback(error);
      }
    });
  }

  function clear(key, callback) {
    if (typeof key === 'function') {
      callback = key;
      key = null;
    }

    if (!key) {
      settings.store.clear(callback);
    } else {
      settings.store.destroy(key, callback);
    }
  }

  function destroy(key, callback) {
    if (typeof key === 'function') {
      callback = key;
      key = null;
    } else if (!callback) {
      callback = noop;
    }

    if (!key) {
      // destory all
      settings.store.clear(function (error) {
        settings.definitions = {};
        callback(error);
      });
    } else {
      settings.store.destroy(key, function (error) {
         delete settings.definitions[key];
         callback(error);
      });
    }
  }

  function emit(event) {
    if (event === 'connect') {
      connected = true;
      flush();
    } else if (event === 'disconnect') {
      connected = false;
      console.log('autocache has lost it\'s persistent connection');
    }
  }

  cache.emit = emit;
  cache.configure = cache; // circular
  cache.clear = stub('clear', clear);
  cache.define = define;
  cache.destroy = stub('destroy', destroy);
  cache.get = stub('get', get);
  cache.reset = reset;
  cache.update = stub('update', update);
  // cache.settings = settings;

  return cache;
})();

if (typeof exports !== 'undefined') {
  module.exports = Cache;

  module.exports.version = require('./package').version;
}