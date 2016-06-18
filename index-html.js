var path = require('path');
var fs = require('fs');
var underscore = require('underscore');
var util = require('util');
var Readable = require('stream').Readable;
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
            if (entry['add_date'])      link += util.format(' %s="%s"', 'add_date'.toUpperCase(), entry['add_date']);
            if (entry['date_modified']) link += util.format(' %s="%s"', 'date_modified'.toUpperCase(), entry['date_modified']);
            if (entry['tags'])          link += util.format(' %s="%s"', 'tags'.toUpperCase(), entry['tags']);
            if (entry['icon_uri'])      link += util.format(' %s="%s"', 'icon_uri'.toUpperCase(), entry['icon_uri']);
            if (entry['title'])         link += util.format('>%s</A>', entry.title);
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
