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