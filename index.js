var Cache = (function (root) {
  'use strict';

  var storeSignature = '-store-signature';
  var EventEmitter = require('events').EventEmitter;

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
    this.queue = {};
    this.store = options.store;

    if (!this.store) {
      this.store = new MemoryStore();
    }

    return this;
  }

  // for "express session" adapter compatibility
  Cache.Store = EventEmitter;

  function define(key, callback) {
    this.definitions[key] = callback;
    console.log(this.definitions);
  }

  function update(key, callback) {
    var cache = this;

    if (!cache.definitions[key]) {
      return callback(new Error('No definition found in update for ' + key));
    }

    function done(error, result) {
      if (cache.queue[key]) {
        cache.queue[key].forEach(function (callback) {
          callback(error, result);
        });
      }
      callback(error, result);
      delete cache.queue[key];
    }

    try {
      var fn = cache.definitions[key];
      if (fn.length) {
        fn(function (result) {
          cache.store.set(key, result, function (error) {
            done(error, result);
          });
        });
      } else {
        var result = fn();
        cache.store.set(key, result, function (error) {
          done(error, result);
        });
      }
    } catch (e) {
      console.log(e.stack);
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
        console.log(cache.definitions);
        return callback(new Error('No definition found in get for ' + key));
      }

      if (!error && result === undefined) {
        // if there's a queue waiting for this data, hold up,
        // else go get it
        if (cache.queue[key] !== undefined) {
          return cache.queue[key].push(callback);
        } else {
          cache.queue[key] = [];
          return cache.update(key, callback);
        }
      }

      callback(null, result);
    });
  }

  function clear(key, callback) {
    this.store.destroy(key, callback);
  }

  function destroy(key, callback) {
    var cache = this;
    cache.store.destroy(key, function (error) {
       delete cache.definitions[key];
       callback(error);
    });
  }

  Cache.prototype.clear = clear;
  Cache.prototype.define = define;
  Cache.prototype.destroy = destroy;
  Cache.prototype.get = get;
  Cache.prototype.update = update; // internal function

  return Cache;
})(this);

if (typeof exports !== 'undefined') {
  module.exports = Cache;
}