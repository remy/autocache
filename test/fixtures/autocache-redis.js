/*!
 * Connect - Redis
 * Copyright(c) 2012 TJ Holowaychuk <tj@vision-media.ca>
 * Modified (basically hacked up) 2015 Remy Sharp
 * MIT Licensed
 */

var redis = require('redis');
var default_port = 6379;
var default_host = '127.0.0.1';
var noop = function(){};


/**
 * Initialize RedisStore with the given `options`.
 *
 * @param {Object} options
 * @api public
 */

function RedisStore (options) {
  var self = this;

  options = options || {};
  this.prefix = options.prefix == null
    ? 'autocache:'
    : options.prefix;

  /* istanbul ignore next */
  if (options.url) {
    console.error('Warning: "url" param is deprecated and will be removed in a later release: use redis-url module instead');
    var url = require('url').parse(options.url);
    if (url.protocol === 'redis:') {
      if (url.auth) {
        var userparts = url.auth.split(':');
        options.user = userparts[0];
        if (userparts.length === 2) {
          options.pass = userparts[1];
        }
      }
      options.host = url.hostname;
      options.port = url.port;
      if (url.pathname) {
        options.db = url.pathname.replace('/', '', 1);
      }
    }
  }

  // convert to redis connect params
  if (options.client) {
    this.client = options.client;
  }
  else if (options.socket) {
    this.client = redis.createClient(options.socket, options);
  }
  else if (options.port || options.host) {
    this.client = redis.createClient(
      options.port || default_port,
      options.host || default_host,
      options
    );
  }
  else {
    this.client = redis.createClient(options);
  }

  if (options.pass) {
    this.client.auth(options.pass, function (err) {
      if (err) {
        throw err;
      }
    });
  }

  // this.ttl = options.ttl;
  // this.disableTTL = options.disableTTL;

  if ('db' in options) {
    if (typeof options.db !== 'number') {
      console.error('Warning: connect-redis expects a number for the "db" option');
    }

    self.client.select(options.db);
    self.client.on('connect', function () {
      self.client.send_anyways = true;
      self.client.select(options.db);
      self.client.send_anyways = false;
    });
  }

  self.client.on('error', function (er) {
    // self.emit('disconnect', er);
  });

  self.client.on('connect', function () {
    // self.emit('connect');
  });
}

/**
 * Attempt to fetch session by the given `sid`.
 *
 * @param {String} sid
 * @param {Function} fn
 * @api public
 */

RedisStore.prototype.get = function (sid, fn) {
  var store = this;
  var psid = store.prefix + sid;
  if (!fn) fn = noop;

  store.client.get(psid, function (er, data) {
    if (er) return fn(er);
    if (!data) return fn();

    var result;
    data = data.toString();

    try {
      result = JSON.parse(data);
    }
    catch (er) {
      return fn(er);
    }
    return fn(null, result);
  });
};

RedisStore.prototype.clear = function (fn) {
  var errors = []
  this.client.keys(this.prefix + ':*', function(error, key) {
    this.client.del(key, function (error) {
      if (error) {
        errors.push(error);
      }
    });
  }.bind(this));

  // this is flipping lame, but we don't have any promises right now,
  // so it'll have to do.
  if (fn) {
    setTimeout(function () {
      fn(errors.length ? errors[0] : null);
    }, 10);
  }
};

/**
 * Commit the given `sess` object associated with the given `sid`.
 *
 * @param {String} sid
 * @param {Session} sess
 * @param {Function} fn
 * @api public
 */

RedisStore.prototype.set = function (sid, value, fn) {
  var store = this;
  var psid = store.prefix + sid;
  if (!fn) fn = noop;

  try {
    value = JSON.stringify(value);
  }
  catch (er) {
    return fn(er);
  }

  store.client.set(psid, value, function (er) {
    if (er) return fn(er);
    fn.apply(null, arguments);
  });
};

/**
 * Destroy the session associated with the given `sid`.
 *
 * @param {String} sid
 * @api public
 */

RedisStore.prototype.destroy = function (sid, fn) {
  sid = this.prefix + sid;
  this.client.del(sid, fn);
};

module.exports = RedisStore;