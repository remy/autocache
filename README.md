# Autocache

[![Travis Status](https://travis-ci.org/remy/autocache.svg?branch=master)](https://travis-ci.org/remy/autocache)

Instead of caching single keys and values, autocache allows you to define a setter and when a request for that key is placed, it will run the setter live, caching the result and returning it.

Importantly, the autocache can be used with a persistent store, and is compatible with express session stores (such as [connect-redis](https://github.com/tj/connect-redis)).

## TODO

- Support clear and destroy all
- Add redis backed tests
- Ensure instances use different prefix on store