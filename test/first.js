var cache = require('../')();

cache.define('age', function () {
  console.log('getting age');
  return 36;
});

cache.define('async-age', function (done) {
  console.log('getting async-age');
  done(36);
});

cache.define('error-age', function () {
  console.log('getting error-age');
  done(36);
})




cache.get('age', function (error, result) {
  console.log('got the age: ' + result, error);
});


setTimeout(function () {
  cache.get('age', function (error, result) {
    console.log('got the age: ' + result, error);
  });
}, 200)


// cache.get('async-age', function (error, result) {
//   console.log('got the age: ' + result);
// });

// cache.get('error-age', function (error, result) {
//   console.log(error.stack);
// });