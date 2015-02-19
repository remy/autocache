var LocalStore = (function () { // jshint ignore:line
  'use strict';

  var noop = function () {};

  function LocalStore(options) {
    options = options || {};
    this.prefix = options.prefix === null ? 'autocache:' : options.prefix;

    // this.ttl = options.ttl;
    // this.disableTTL = options.disableTTL;
  }


  LocalStore.prototype.get = function (sid, fn) {
    var store = this;
    var psid = store.prefix + sid;
    if (!fn) { fn = noop; }

    var result = localStorage.getItem(psid);

    return fn(null, result === null ? undefined : result);
  };

  LocalStore.prototype.clear = function (fn) {
    if (!fn) { fn = noop; }

    var length = localStorage.length;
    var key;

    for (var i = 0; i < length; i++) {
      key = localStorage.key(i);
      if (key.indexOf(this.prefix + ':') === 0) {
        localStorage.removeItem(key);
      }
    }

    fn(null);
  };

  LocalStore.prototype.set = function (sid, value, fn) {
    var psid = this.prefix + sid;
    if (!fn) { fn = noop; }

    try {
      localStorage.setItem(psid, value);
    } catch (e) {
      return fn(e);
    }

    fn(null, value);
  };

  LocalStore.prototype.destroy = function (sid, fn) {
    sid = this.prefix + sid;
    localStorage.removeItem(sid);
    fn && fn();
  };

  return LocalStore;
})(); // jshint ignore:line

if (typeof exports !== 'undefined') {
  module.exports = LocalStore;
}