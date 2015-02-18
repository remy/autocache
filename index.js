var Cache = (function (root) {
  'use strict';

  var storeSignature = '-store-signature';

  function MemoryStore() {
    this.data = {};
  }

  MemoryStore.prototype = {
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
    }
  };

  var singleton = null;

  function Cache(options) {
    if (!this || this === global) {
      if (singleton === null) {
        singleton = new Cache(options);
      }

      return singleton;
    }

    // TODO self invoke
    if (options === undefined) {
      options = {};
    }

    this.definitions = {};

    this.store = options.store;
    if (!this.store) {
      this.store = new MemoryStore();
    }

    return this;
  }

  function define(key, callback) {
    this.definitions[key] = callback;
  }

  function update(key, callback) {
    var cache = this;

    if (!cache.definitions[key]) {
      return callback(new Error('No definition found'));
    }

    try {
      var fn = cache.definitions[key];
      if (fn.length) {
        fn(function (result) {
          cache.store.set(key, result, function (error, result) {
            callback(error, result);
          });
        });
      } else {
        cache.store.set(key, fn(), function (error, result) {
          callback(error, result);
        });
      }
    } catch (e) {
      callback(e);
    }
  }

  function get(key, callback) {
    var cache = this;

    cache.store.get(key, function (error, result) {
      if (error) {
        return callback(error);
      }

      if (!cache.definitions[key]) {
        return callback(new Error('No definition found'));
      }

      if (!error && result === undefined) {
        // update
        return cache.update(key, callback);
      }

      callback(null, result);
    });
  }

  function clear(key, callback) {
    this.store.destroy(key, callback);
  }

  function destroy(key, callback) {
    var cache = this;
    delete this.definitions[key];
    cache.store.destroy(key, callback);
  }

  Cache.prototype = {
    clear: clear,
    define: define,
    destroy: destroy,
    get: get,
    update: update // internal function
  };

  return Cache;
})(this);

if (typeof exports !== 'undefined') {
  module.exports = Cache;
}