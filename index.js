var cheerio = require('cheerio');
var fs = require('fs');
var lodash = require('lodash');
var path = require('path');
var q = require('q');
var Readable = require('stream').Readable;
var underscore_string = require('underscore.string');
var underscore = require('underscore');
var util = require('util');

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

/**
 *  load the contents of an html file and pass it to cheerio
 *  @param   {Function}  callback  cheerioBuild: load and parse the content into json obj
 *  @param   {Function}  errHandler global err handler.
 */
function cheerioLoad(inputPath, outputPath, callback, errHandler) {
  var data = fs.readFileSync(inputPath, 'utf8');
  /** call cheerio build with html data */
  callback(data, outputPath);
}

/**
 *  build and parse our bookmarks into the desired json object
 *  @param   {obj}  html  the contents of our bookmark file
 */
function cheerioBuild(html, output) {
  var obj = {};
  var folders = [];
  var arr = [];
  var $ = cheerio.load(html, {
    withDomLvl1: true,
    normalizeWhitespace: true,
    xmlMode: false,
    decodeEntities: true
  });

  /**
   *  find top level grouping and add as class to links key
   *  The <dt> tag defines a term/name in a description list.
   */
  function addClasses() {
    $('dt > h3').each(function() {
      folders.push($(this).text());
      $(this).next().find('a').addClass($(this).text());
    });
  }

  /** find the link tags and bulild the object */
  function parseLinks() {
    $('a').each(function(index) {

      /** default keys title, href */
      obj[index] = {
        'title': $(this).text(),
        'href': $(this).attr('href'),
      };

      /**
       *  here we conditionally add keys only if they exist ass attr or prop in the respective links.
       */

      /** add_date */
      if ($(this).attr('add_date')) {
        obj[index]['add_date'] = $(this).attr('add_date');
      }

      /** folder is derived from class attribute we added to each 'a' link under each folder */
      if ($(this).prop('class')) {
        obj[index]['folder'] = $(this).prop('class');
      }

      /** key last_modified */
      if ($(this).attr('last_modified')) {
        obj[index]['date_modified'] = $(this).attr('last_modified');
      }

      /** tags */
      if ($(this).attr('tags')) {
        obj[index]['tags'] = $(this).attr('tags');
      }

      /** icon_uri */
      if ($(this).attr('icon_uri')) {
        obj[index]['icon_uri'] = $(this).attr('icon_uri');
      }

      /** format <DD> tag to max length of 240 characters */
      if ($(this).next().is('dd')) {
        obj[index]['description'] = underscore_string.prune($(this).next().text().trim(), 240);
      }
    });

    /** here we flatten the links object and convert it to an array of objects */
    function convertToArrayOfObjects(object) {
      for (var key in object) {
        arr.push(object[key]);
      }
      return lodash.uniqBy(arr, 'href');
    }

    /** format title of each bookmark to a desired length. */
    function formatTitle(array) {
      for (var i = 0; i < array.length; i++) {
        var this_title = array[i].title;
        var pruned = underscore_string.prune(this_title, 60);
        var titled = underscore_string.titleize(pruned);
        array[i].title = titled;
      }
    }

    /** shorten length of description to avoid str length error */
    function formatDescription(array) {
      for (var i = 0; i < array.length; i++) {
        if (array[i].description) {
          var this_description = array[i].description;
          var pruned_description = underscore_string.prune(this_description, 240);
          array[i].description = pruned_description;
        }
      }
    }

    /** remove duplicate bookmark entries by href */
    function dedupe(array) {
      var initialLength = array.length;
      var _arr = lodash.uniqBy(array, 'href');
      var dedupedLength = _arr.length;
      console.log('removed:' + (initialLength - dedupedLength) + ' links');
      return _arr;
    }

    /** call functions in this order */
    convertToArrayOfObjects(obj);
    formatTitle(arr);
    var dedupedArray = dedupe(arr);

    /** stream the output */
    var rs = s.readable();
    var rw = s.writable(output);
    rs.push(JSON.stringify(dedupedArray));
    rs.pipe(rw);
    rs.pipe(process.stdout);
    rs.push(null);
  }
  addClasses();
  parseLinks();
}

/**
 *  cheerioLoad(inputPath(str), outputPath(str), callback, errHandler)
 */
cheerioLoad('./bin/input/bookmarks-example.html', './bin/output/bookmarks.json', cheerioBuild, errHandler);

function htmlpart() {
  var header = [
      '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
      '<!-- This is an automatically generated file.',
      '     It will be read and overwritten.',
      '     DO NOT EDIT! -->',
      '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
      '<TITLE>Bookmarks</TITLE>',
      '<H1>Bookmarks Menu</H1>',
      '',
      ''
  ].join('\n');

  /** @type {array} the array of links */
  var links = JSON.parse(fs.readFileSync('./bin/output/bookmarks.json', 'utf8'));
  var folders = [];
  var bookmarks = {};

  function getFolders(arr) {
    for (var i = 0; i < arr.length; i++) {
      var obj = arr[i];
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (obj.folder) {
            folders.push(obj.folder.toLowerCase());
          }
        }
      }
    }

    var tmp = underscore.uniq(folders);
    folders = tmp;

    for (var j = 0; j < folders.length; j++) {
      bookmarks[folders[j]] = [];
    }

    for (var x = 0; x < arr.length; x++) {
      var xobj = arr[x];
      for (var key in bookmarks) {
        if (xobj.folder.toLowerCase() === key.toLowerCase()) {
          bookmarks[key].push(xobj);
        }
      }
    }

    fs.writeFileSync('./bin/output/bookmarks.json', JSON.stringify(bookmarks), 'utf8')
  }

  getFolders(links);

  function makehtml(obj, indent, foldername) {

    indent = indent || 0;

    // return the number of spaces specified
    function pad(indent) {
      return new Array(indent * 4 + 1).join(' ');
    }

    var s = [];

    s.push(util.format('%s<DL><p>', pad(indent)));

    // loop the bookmarks
    for (var _key in obj) {
      s.push(util.format('%s<DT><H3>%s</H3>', pad(indent), _key));
      for (var i = 0; i < obj[_key].length; i++) {
        var entry = obj[_key][i];
        var link = util.format('<A HREF="%s"', entry.href);
        if (entry['add_date']) link += util.format(' %s="%s"', 'add_date'.toUpperCase(), entry['add_date']);
        if (entry['date_modified']) link += util.format(' %s="%s"', 'date_modified'.toUpperCase(), entry['date_modified']);
        if (entry['tags']) link += util.format(' %s="%s"', 'tags'.toUpperCase(), entry['tags']);
        if (entry['icon_uri']) link += util.format(' %s="%s"', 'icon_uri'.toUpperCase(), entry['icon_uri']);
        if (entry['title']) link += util.format('>%s</A>', entry.title);
        // append the link to the final string
        s.push(util.format('%s<DT>%s', pad(indent + 1), link));
        if (entry.description) {
          s.push(util.format('%s<DD>%s', pad(indent + 1), entry.description));
        }
      }
    }
    s.push(util.format('%s</DL><p>', pad(indent)));
    return s.join('\n');
  }

  function netscape(obj) {
    var s = header;
    s += makehtml(obj);
    return s;
  }

  fs.writeFileSync('./bin/output/bookmarks-fromJSON.html.', netscape(bookmarks), 'utf8')
}

htmlpart();
