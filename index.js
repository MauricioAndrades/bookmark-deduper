var cheerio = require('cheerio');
var fs = require('fs');
var lodash = require('lodash');
var path = require('path');
var q = require('q');
var Readable = require('stream').Readable;
var underscore = require('underscore.string');

/**
 *  global error handler
 */
function errHandler() {
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
 *  @param   {Function} errHandler global err handler.
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

	/** find top level grouping and add as folders key */
	function addClasses() {
		$('dt > h3').each(function() {
			folders.push($(this).text());
			$(this).next().find('a').addClass($(this).text());
		});
	}

	/** find the link tags and bulild the object */
	function parseLinks() {
		$('a').each(function(index) {

			obj[index] = {
				'title': $(this).text(),
				'href': $(this).attr('href'),
				'date_added': $(this).attr('add_date')
			};

			if ($(this).prop('class')) {
				obj[index]['folder'] = $(this).prop('class');
			}

			if ($(this).attr('last_modified')) {
				obj[index]['date_modified'] = $(this).attr('last_modified');
			}

			if ($(this).attr('tags')) {
				obj[index]['tags'] = $(this).attr('tags');
			}

			if ($(this).attr('icon_uri')) {
				obj[index]['icon_uri'] = $(this).attr('icon_uri');
			}

			if ($(this).next().is('dd')) {
				obj[index]['description'] = underscore.prune($(this).next().text().trim(), 120);
			}
		});

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
				var pruned = underscore.prune(this_title, 60);
				var titled = underscore.titleize(pruned);
				array[i].title = titled;
			}
		}

		/** shorten length of description to avoid str length error */
		function formatDescription(array) {
			for (var i = 0; i < array.length; i++) {
				if (array[i].description) {
					var this_description = array[i].description;
					var pruned_description = underscore.prune(this_description, 120);
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

// cheerioLoad('./bin/input/bookmarks-example.html', cheerioBuild, errHandler);
cheerioLoad('./bin/input/firefox.html', './bin/output/firefox.json', cheerioBuild, errHandler);