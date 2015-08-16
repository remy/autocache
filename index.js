var Cache = (function () {
  var noop = function () {};

  // only use require if we're in a node-like environment
  var debugOn = false;
  var debug = typeof exports !== 'undefined' ?
      require('debug')('autocache') :
      function (log) {
        if (console && console.log && cache.debug) {
          console.log(log);
        }
      };

  var connected = false;
  var queue = [];
  var useQueue = false;

  function MemoryStore() {
    this.data = {};
    debug('Using MemoryStore');
    if (!debug) {
      console.warn('Using internal MemoryStore - this will not persist');
    }
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
      var found = this.data[key] !== undefined;
      delete this.data[key];
      if (callback) {
        callback(null, found);
      }
    },
    clear: function (callback) {
      this.data = {};
      if (callback) {
        callback(null, true);
      }
    },
    dock: function (cache) {
      cache.emit('connect');
    },
  };

  var settings = {
    // store: new MemoryStore(),
    definitions: {},
    queue: {}, // not the same as the queued calls
  };

  function generateKey() {
    var args = [].slice.call(arguments);
    var key = args.shift();
    if (typeof args.slice(-1).pop() === 'function') {
      args.pop(); // drop the callback
    }

    if (!args.length) {
      return key; // FIXME this is hiding a bug in .clear(key);
    }

    return key + ':' + JSON.stringify(args);
  }

  function queueJob(method) {
    var methodArgs = '';
    var args = [].slice.call(arguments, 1);
    if (args.length) {
      methodArgs = generateKey.apply(this, args);
    }
    var sig = method + '(' + methodArgs + ')';

    debug('queued: ' + sig);
    return queue.push({
      method: method,
      context: this,
      arguments: args,
      sig: sig,
    });
  }

  function stub(method, fn) {
    return function stubWrapper() {
      if (!connected) {
        var args = [].slice.call(arguments);
        args.unshift(method);
        return queueJob.apply(this, args);
      }
      fn.apply(this, arguments);
    };
  }

  function flush() {
    debug('flushing queued calls');
    queue.forEach(function (job) {
      debug('flush %s: %s', job.method, job.sig);
      cache[job.method].apply(job.context, job.arguments);
    });
    queue = [];
  }

  function reset() {
    debug('reset');
    Object.keys(settings.definitions).forEach(function (key) {
      clearTTL(key);
      if (settings.definitions[key].ttr) {
        clearInterval(settings.definitions[key].ttr);
      }
    });
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
      debug('assigned caching store: ' + options.store.toString());
      settings.store = options.store;
    }

    if (!settings.store) {
      settings.store = new MemoryStore();
    }

    // try to dock
    if (settings.store.dock) {
      settings.store.dock(cache);
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
    } else {
      options.update = callback;
      options.name = key;
    }

    if (!key || !callback) {
      throw new Error('.define requires a name and callback');
    }

    if (settings.definitions[key] && settings.definitions[key].timer) {
      clearInterval(settings.definitions[key].timer);
    }

    settings.definitions[key] = options;

    if (options.ttr) {
      settings.definitions[key].timer = setInterval(function () {
        debug('%s: TTR fired - updating', key);
        cache.update(key);
      }, options.ttr);
    }

  }

  function update(key) {
    var args = [].slice.apply(arguments);

    if (typeof args.slice(-1).pop() !== 'function') {
      args.push(noop);
    }

    var callback = args[args.length - 1];
    var storeKey = generateKey.apply(this, args);

    if (!settings.definitions[key]) {
      return callback(new Error('No definition found in update for ' + key));
    }

    function done(error, result) {
      if (error) {
        debug('%s: update errored, ignoring store:', storeKey, error);
      } else {
        debug('%s: updated & stored', storeKey);
      }

      var defs = settings.definitions[key];

      if (!error && defs && defs.ttl) {
        defs.ttlTimer = setTimeout(function () {
          debug('%s: TTL expired', storeKey);
          cache.clear(storeKey);
        }, defs.ttl);
      }

      callback(error, result);
      if (settings.queue[storeKey] && settings.queue[storeKey].length) {
        settings.queue[storeKey].forEach(function (callback) {
          callback(error, result);
        });
      }
      delete settings.queue[storeKey];
    }

    try {
      var fn = settings.definitions[key].update;
      if (fn.length) {
        fn.apply(this, args.slice(1, -1).concat(function (error, result) {
          if (error) {
            // don't store if there's an error
            return done(error);
          }

          settings.store.set(
            storeKey,
            JSON.stringify(result),
            function (error) {
              done(error, result);
            }
          );
        }));
      } else {
        var result = fn();
        settings.store.set(
          storeKey,
          JSON.stringify(result),
          function (error) {
            done(error, result);
          }
        );
      }
    } catch (e) {
      debug('%s: exception in user code', key);
      done(e);
    }
  }

  function get(key) {
    var args;
    if (useQueue) {
      args = [].slice.call(arguments);
      args.unshift('get');
      return queueJob.apply(this, args);
    }

    args = [].slice.apply(arguments);


    if (typeof args.slice(-1).pop() !== 'function') {
      args.push(noop);
    }

    var callback = args[args.length - 1];
    var storeKey = generateKey.apply(this, args); // jshint ignore:line

    debug('-> get: %s', storeKey);

    settings.store.get(storeKey, function (error, result) {
      if (error) {
        return callback(error);
      }

      if (!error && result === undefined) {
        debug('<- %s: get miss', storeKey);

        if (!settings.definitions[key]) {
          return callback(new Error('No definition found in get for ' + key));
        }

        // if there's a queue waiting for this data, hold up,
        // else go get it
        if (settings.queue[storeKey] !== undefined) {
          return settings.queue[storeKey].push(callback);
        } else {
          settings.queue[storeKey] = [];
          // call update with
          return update.apply(this, args);
        }
      }

      debug('<- %s: get hit', storeKey);

      // reset the TTL if there is one
      startTTL(storeKey);

      try {
        return callback(null, JSON.parse(result));
      } catch (error) {
        return callback(error);
      }
    });
  }

  function clearTTL(key) {
    if (settings.definitions[key] && settings.definitions[key].ttlTimer) {
      debug('%s: TTL cleared', key);
      clearTimeout(settings.definitions[key].ttlTimer);
      delete settings.definitions[key].ttlTimer;
    }
  }

  function startTTL(key) {
    clearTTL(key);
    var root = key.split(':').shift();
    if (settings.definitions[root] && settings.definitions[root].ttl) {
      debug('%s: TTL set (in ' + settings.definitions[root].ttl + 'ms)', key);
      if (!settings.definitions[key]) {
        settings.definitions[key] = {};
      }
      settings.definitions[key].ttlTimer = setTimeout(function () {
        debug('%s: TTL expired', key);
        cache.clear(key);
      }, settings.definitions[root].ttl);
    }
  }

  function clear(key, callback) {
    if (useQueue) {
      var args = [].slice.call(arguments);
      args.unshift('clear');
      return queueJob.apply(this, args);
    }

    debug('queuing upcoming gets');

    if (typeof key === 'function') {
      callback = key;
      key = null;
    }

    useQueue = true;
    var wrapped = function () {
      useQueue = false;
      flush();
      if (callback) {
        callback.apply(this, arguments);
      }
    };

    if (!key) {
      debug('clearing all');
      Object.keys(settings.definitions).forEach(clearTTL);
      settings.store.clear(wrapped);
    } else {
      debug('clearing one: %s', key);
      clearTTL(key);
      settings.store.destroy(key, wrapped);
    }
  }

  function destroy(key, callback) {
    if (typeof key === 'function') {
      callback = key;
      key = null;
    } else if (!callback) {
      callback = noop;
    }

    var keys = [];

    if (!key) {
      // destory all
      debug('destroying all');
      keys = Object.keys(settings.definitions);
    } else {
      debug('destroying one: %s', key, (new Error()).stack);
      keys = [key];
    }

    keys.map(function (key) {
      clearTTL(key);

      if (settings.definitions[key].timer) {
        clearInterval(settings.definitions[key].timer);
      }
      settings.definitions[key] = {};
    });

    callback(null);
  }

  function emit(event) {
    // allow for typos
    if (event === 'connect' || event === 'connected') {
      connected = true;
      debug('connected - flushing queue');
      flush();
    } else if (event === 'disconnect') {
      connected = false;
      console.log('autocache has lost it\'s persistent connection');
    }
  }


  if (Object.defineProperty) {
    Object.defineProperty(cache, 'debug', {
      get: function () {
        return debugOn;
      },
      set: function (value) {
        debugOn = value;
        if (debugOn) {
          cache.settings = settings;
        } else {
          delete cache.settings;
        }
      },
    });
  }

  cache.emit = emit;
  cache.configure = cache; // circular
  cache.clear = stub('clear', clear);
  cache.define = stub('define', define);
  cache.destroy = stub('destroy', destroy);
  cache.get = stub('get', get);
  cache.reset = reset;
  cache.update = stub('update', update);

  if (typeof process !== 'undefined') {
    if (process.env.NODE_ENV === 'test') {
      // expose settings when debugging
      cache.debug = true;
    }
  }

  return cache;
})();

if (typeof exports !== 'undefined') {
  module.exports = Cache;
  module.exports.version = require('./package').version || 'development';
}