var fs = require('fs');
var lodash = require('lodash');
var u = require('underscore.string');
var cheerio = require('cheerio');
var Readable = require('stream').Readable;
var StringDecoder = require('string_decoder').StringDecoder;
var path = require('path');
var Q = require('q');
var miss = require('mississippi');

debugger;

var fs.accessSync(path, mode);

function importBookmarks(file) {
	// fs.createReadStream(path[, options])
	var inputstream = fs.createReadStream(path.resolve(file));
}
function exportBookmarks(file) {
	var outputstream = fs.createWriteStream(path.resolve(file));
}


var s = {
	read: () => new Readable,
	write: (path) => fs.createWriteStream(path, {flags: 'w',defaultEncoding: 'utf8',fd: null,mode: 0o666})
};

function modularize(destPath) {
	var html = fs.readFileSync('./cheerio-playground/bin/input/raindrop.html', {
		encoding: 'utf8'
	});
	var rs = s.read(html)
	var rw = s.write(destPath)
	rs.push(html);
	rs.push('module.exports = ');
	rs.pipe(rw);
	rs.pipe(process.stdout);
	rs.push(null);
};
modularize("./cheerio-playground/bin/output/raindrop.output.html")

var parser = {
	opts: {
		normalizeWhitespace: true,
		withDomLvl1: false,
		xmlMode: false,
		decodeEntities: true,
		recognizeSelfClosing: true
	}
};

var html = require('./cheerio-playground/bin/output/raindrop.output.html')
var $ = cheerio.load(html, parser.opts);
var obj = {};
var folders = [];
var arr = [];

function bookmarksToJSON() {
	function addClasses($, callback) {
		$('dt > h3').each(function() {
			folders.push($(this).text());
			$(this).next().find('a').addClass($(this).text());
		});
		callback();
	};
	function parseLinks() {
		$('a').each(function(index, element) {
			obj[index] = {
				'title': $(this).text(),
				'href': $(this).attr('href'),
				'add_date': $(this).attr('add_date'),
				'folder': $(this).prop('class'),
				'description': JSON.stringify($(this).next().text())
			};

			if ($(this).attr('last_modified')) {
				obj[index]['last_modified'] = $(this).attr('last_modified');
			}

			if ($(this).attr('tags')) {
				obj[index]['tags'] = $(this).attr('tags');
			}

			if ($(this).attr('icon_uri')) {
				obj[index]['icon_uri'] = $(this).attr('icon_uri');
			}
			/*if ($(this).next().is('dd')) {
				console.log($(this).next().text());
				obj[index]['description'] = JSON.stringify($(this).next().text());
			}*/
		});
	};
	addClasses($, parseLinks);
}

var convertToArrayOfObjects = function(object) {
	for (var key in object) {
		arr.push(object[key]);
	}
}

var formatTitle = function(array) {
	// _.('Hello, world').prune(5); => 'Hello...'
	for (var i = 0; i < array.length; i++) {
		var this_title = array[i].title;
		var pruned = u.prune(this_title, 60);
		var titled = u.titleize(pruned);
		array[i].title = titled;
	}
};

var formatDescription = function(array) {
	// _.('Hello, world').prune(5); => 'Hello...'
	for (var i = 0; i < array.length; i++) {
		if (array[i].description) {
			var this_description = array[i].description;
			var pruned = u.prune(this_description, 120);
			array[i].description = pruned;
		}
	}
};

var array = function(array) {
	return lodash.uniqBy(array, 'href');
}

bookmarksToJSON();
convertToArrayOfObjects(obj);
formatTitle(arr);

// for(var key in bookmarks) {
// 	arr.push(bookmarks[key])
// }

// jsonarr = JSON.stringify(arr);
// fs.writeFileSync('./bookmars.arry.js', jsonarr, 'utf8')

// _.('Hello world').truncate(5); => 'Hello...'
// _.('Hello').truncate(10); => 'Hello'

// var formatTitle = function(array) {
// 	for (var i = 0; i < array.length; i++) {
// 			array[i].title = _.(array[i].title).prune(8);
// 		console.log(truncated);
// 	}
// }

// formatTitle(dedupe)

// fs.writeFileSync('./deduped.bookmarks.js', JSON.stringify(dedupe), 'utf8')

function addDescription() {
	$('a ~ dd').each(function() {
		console.log($(this).text());
	})
};

// addDescription();
// _.('Hello, world').prune(5, ' (read a lot more)'); => 'Hello, world' (as adding "(read a lot more)" would be longer than the original string)
// _.('Hello, cruel world').prune(15); => 'Hello, cruel...'
// _.('Hello').prune(10); => 'Hello'

/**
 *  rename and stat file by chaining callbacks
 *  @param  {string} input : path to file we're gonna rename
 *  @param  {string} output: name of the output file
 *  @return {none}
 */
function renameStat(input, output) {
	fs.rename(input, output, (err) => {
		if (err) throw err;
		fs.stat(output, (err, stats) => {
			if (err) throw err;
			console.log(`stats: ${JSON.stringify(stats)}`);
		});
	});
};

/**
 *  rename and stat file by chaining callbacks
 *  @param  {string} input : path to file we're gonna rename
 *  @param  {string} output: name of the output file
 *  @return {none}
 */
function renameStat(input, output) {
	fs.rename(input, output, (err) => {
		if (err) throw err;
		fs.stat(output, (err, stats) => {
			if (err) throw err;
			console.log(`stats: `);
		});
	});
}

function readUnpipe(src_path, dest_path) {
	var readable = fs.createReadStream(src_path);
	var writable = fs.createWriteStream(dest_path);
	// All the data from readable goes into 'file.txt',
	// but only for the first second
	readable.pipe(writable);
	setTimeout(() => {
		console.log('stop writing to file.txt');
		readable.unpipe(writable);
		console.log('manually close the file stream');
		writable.end();
	}, 1000);
}

// readUnpipe("./blank.html", "./blank.stream.html")

function parseHeader(stream, callback) {
	stream.on('error', callback);
	stream.on('readable', onReadable);
	var decoder = new StringDecoder('utf8');
	var header = '';

	function onReadable() {
		var chunk;
		while (null !== (chunk.stream())) {
			var str = decoder.write(chunk);
			if (str.match(/\n\n/)) {
				var split = str.split(/\n\n/);
				header += split.shift();
				var remaining = split.join('\n\n');
				var buf = Buffer.from(remaininig, 'utf8');
				if (buf.length) {
					stream.unshift(buffer);
				}
				stream.removeListener('error', callback);
				stream.removeListener('readable', onReadble);
				callback(null, header, stream);
			} else {
				header += str;
			}
		}
	}
}
