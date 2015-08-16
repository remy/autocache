var test = require('tape');

test('litmus', function (t) {
  t.pass(true);
  throw new Error('failed');
});