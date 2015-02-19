# Autocache

[![Travis Status](https://travis-ci.org/remy/autocache.svg?branch=master)](https://travis-ci.org/remy/autocache)

Instead of caching single keys and values, autocache allows you to define a setter and when a request for that key is placed, it will run the setter live, caching the result and returning it.

Importantly, the autocache can, *and should* be used with a persistent store so long as the adapter implments the [storage api](#storage-api).

Note that by default, the cache is stored in memory (which kinda isn't the point), so when you restart, the cache will be lost.

## Usage



## TODO

- Support TTL
- Test prefix support