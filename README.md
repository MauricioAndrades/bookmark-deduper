# bookmark deduper tutorial#

Earlier this I saw a post on the Google Chrome extensions page. A user was asking for help in deduping her bookmarks. She wanted a method that could handle thousands of links in different folders; and was unable to find any plugin that could do so. So I decided to build it for her and demonstrate usefulness of Node.

In this tutorial I am going to describe the creation of a bookmark deduping script using Node and:

* [cheerio](https://www.npmjs.com/package/cheerio)
* [lodash](https://www.npmjs.com/package/lodash)
* [underscore & underscore.string](http://underscorejs.org/)
* [q](https://github.com/kriskowal/q)
* Node's `fs`, `stream` and `path` modules.

I've tested it with 18K+ bookmarks and it performs extremely well. I am able to merge multiple bookmark files and end up with a final output of only 2,200.

## require(s) ##

```js
var cheerio = require('cheerio');
var fs = require('fs');
var lodash = require('lodash');
var path = require('path');
var q = require('q');
var Readable = require('stream').Readable;
var underscore = require('underscore.string');
```


## helper functions ##

First thing we do is define a global `errHandler` function and create a streams helper obj with two functions. `readable` and `writable`.

```js
/**
 *  global error handler
 */
function errHandler(err) {
  if (err) {
    console.log(err);
    process.exit();
  }
}

/** @type {Object} streams helper object */
var s = {
  readable: function() {
    return new Readable;
  },
  writable: function(path) {
    var options = {
      flags: 'w',
      defaultEncoding: 'utf8',
      fd: null,
      mode: 0o666,
      autoClose: true
    };
    return fs.createWriteStream(path, options);
  }
};
```


