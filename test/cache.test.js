'use strict';
/*global describe:true, it: true */
var Cache = require('../');
var assert = require('assert');

describe('sync cache', function () {
  var cache = new Cache();

  var n = 20;

  cache.define('number', function () {
    return n++;
  });

  it('should return 20', function (done) {
    cache.get('number', function (error, result) {
      assert(result === 20, 'result: ' + result);
      done();
    });
  });

  it('should not error', function (done) {
    cache.get('number', function (error, result) {
      assert(error === null, typeof error);
      done();
    });
  });

  it('should be resetable', function (done) {
    cache.clear('number');
    // TODO read internal stats
    cache.get('number', function (error, result) {
      assert(!error);
      done();
    });
  });

  it('should support closures', function (done) {
    // TODO read internal stats
    cache.get('number', function (error, result) {
      assert(result === 21, result);
      done();
    });
  });

  it('should be destroyable', function (done) {
    cache.destroy('number');
    cache.get('number', function (error, result) {
      // console.log(error);
      assert(error instanceof Error, 'result: ' + result);
      done();
    });
  });

});

describe('async cache', function () {
  var cache = new Cache();

  var n = 20;

  cache.define('number', function (done) {
    done(n++);
  });

  it('should return 20', function (done) {
    cache.get('number', function (error, result) {
      assert(result === 20, 'result: ' + result);
      done();
    });
  });

  it('should not error', function (done) {
    cache.get('number', function (error, result) {
      assert(error === null, typeof error);
      done();
    });
  });

  it('should be resetable', function (done) {
    cache.clear('number');
    // TODO read internal stats
    cache.get('number', function (error, result) {
      assert(!error);
      done();
    });
  });

  it('should support closures', function (done) {
    // TODO read internal stats
    cache.get('number', function (error, result) {
      assert(result === 21, result);
      done();
    });
  });

  it('should be destroyable', function (done) {
    cache.destroy('number');
    cache.get('number', function (error, result) {
      // console.log(error);
      assert(error instanceof Error, 'result: ' + result);
      done();
    });
  });

});

describe('singleton cache', function () {
  var cache1 = Cache();
  var cache2 = Cache();

  var n = 20;

  cache1.define('number', function () {
    return n++;
  });

  it('should return 20', function (done) {
    var predone = function () {
      predone = done;
    };

    cache1.get('number', function (error, result) {
      assert(result === 20, 'result: ' + result);
      predone();
    });

    cache2.get('number', function (error, result) {
      assert(result === 20, 'result: ' + result);
      predone();
    });
  });
});