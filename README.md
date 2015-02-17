# Autocache

Instead of caching single keys and values, autocache allows you to define a setter and when a request for that key is placed, it will run the setter live, caching the result and returning it.

Importantly, the autocache can be used with a persistent store, and is compatible with express session stores (such as [connect-redis](https://github.com/tj/connect-redis)).

## TODO

- Support singleton pattern by default
- Don't store string functions, but function references