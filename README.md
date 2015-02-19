# Autocache

[![Travis Status](https://travis-ci.org/remy/autocache.svg?branch=master)](https://travis-ci.org/remy/autocache)

Instead of caching single keys and values, autocache allows you to define a setter and when a request for that key is placed, it will run the setter live, caching the result and returning it.

Importantly, the autocache can, *and should* be used with a persistent store so long as the adapter implments the [storage api](#storage-api).

Note that by default, the cache is stored in memory (which kinda isn't the point), so when you restart, the cache will be lost.

## Usage

Autocache can be used either on the server or on the client (again, recommended with a persistent adapter).

General usage:

- Define a storage proceedure against a `key`
- Get the key value
- Clear/invalidate values (TODO: implement TTL)

Note that autocache is a singleton.

```js
var cache = require('autocache');

cache.define('testStatus', function (done) {
  // call an imaginary test status API
  http.request('/test-status').then(function (result) {
    done(null, result.status);
  }).catch(function (error) {
    done(error);
  });
});
```

...now in another script elsewhere:

```js
var cache = require('autocache');

app.get('/status', function (req, res) {
  cache.get('testStatus', function (error, status) {
    if (error) {
      return res.send(error);
    }

    res.render(status === 'pass' ? 'test-passing' : 'test-fail');
  });
});

// every 10 minutes, clear the cache
// note: this is a TODO in our app, we would like to use TTL.
setInterval(function () {
  cache.clear('testStatus');
}, 10 * 60 * 1000);
```

## methods

### cache.define(string, function)

For a particular `string` key, set a function that will return a cached value.

Note that the `function` can be synchronous or asynchronous. If your code accepts a `done` function, you can pass the value you wish to cache to the `done` function argument (as seen in the usage example above).

### cache.get(string, function)

If a cached value is available for `string` it will call your `function` with an error first, then the result.

If there is no cached value, autocache will run the definition, cache the value and then call your `function`.

If multiple calls are made to `get` under the same `string` value, and the value hasn't been cached yet, the calls will queue up until a cached value has been returned, after which all the queued `function`s will be called.

### cache.update(string, function)

Calls the definition for the `string`, caches it internally, and calls your `function` with and error and the result.

### cache.clear([string])

Clear all (with no arguments) or a single cached entry.

### cache.destroy([string])

Destory the all definitions (with no arguments) or a single definition entry.

### cache.configure({ store: adapter })

Set and store the storage adapter for persistent storage. See notes on [adapters](#apaters).

### cache.reset()

Clear all of the internal state of the cache, except for the storage adapter.

## Storage API

If you want to write your own adapter for persistent storage you must implement the following functions:

```text
get(key<string>, callback<function>)
set(key<string>, value<string>, callback<function>)
destory([key<string>])
clear()
```

Notes:

1. Callbacks must pass an error first object, then the value. The value should be `undefined` if not found.
2. Callbacks are expected to be asynchronous (but are acceptable as synchronous).
3. `clear` should only clear objects created by the cache (which can be identified by a prefix).
4. Calling the adapter function should accept the `autocache` as an argument, example below.
5. Autocache will handle converting user objects to and from JSON, so the adapter will always be storing a string.

### Automatically setting the autocache store

When the adapter is required, the user must be able to pass the autocache object into your adapter. This call will set the autocache's store to your adapter.

Below is the code from the `localStorage` adapter. It returns the store if called, but also checks if the autocache was passed in, and if it was, calls the `configure` function to assign the store as itself:

```js
function LocalStore(autocache) {
  if (autocache) {
    autocache.configure({ store: new LocalStore() });
    return LocalStore;
  }
}
```

## TODO

- Support TTL
- Test prefix support