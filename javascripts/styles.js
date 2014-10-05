


(function() {

	//Private Variables
	var indexNamingOrder = [ "type", "id", "className", "state" ];
	var treeNamingOrder = [ "renderer", "mediaType", "mediaSize", "mediaAspectRatio" ];
	var processingOrder = [ "renderer", "mediaType", "mediaSize", "mediaAspectRatio", "className", "id", "state", "type" ];
	var matchingStyle = [ 0, 1, 1, 1, 2, 2, 2, 2 ]; //match style to environment, 0 = matchany(any a in b), 1 = matchanyorall(any a in b or a = *), 2=matchevery (every a in b), -1=pass (anything goes)
	var inclusionStyle = [ 2, -1, -1, -1, -1, -1, -1, -1 ]; //match style to environment, 0 = matchany(any a in b), 1 = matchanyorall(any a in b or a = *), 2=matchevery (every a in b), -1=pass (anything goes)
	var eventSensitivity = {
		mediaType: "media",
		mediaSize: "resize",
		mediaAspectRatio: "resize"
	};
	var orderDefaults = {
		mediaType: "*", 
		mediaSize: "*", 
		mediaAspectRatio: "*",
		renderer: "*"
	};
	var inject = {
		type: [
			"*"
		]
	};
	var delimiterOrder = [ "?", ">", "@", "%", ".", "#", ":", " " ];
	var textRegExp = /([\w\d-_\*]+)/g;
	var delimiterRegExps = [ /\?([\w\d-_\*]+)/g, /\>([\w\d-_\*]+)/g, /\@([\w\d-_\*]+)/g, /\%([\w\d-_\*]+)/g, /\.([\w\d-_\*]+)/g, /\#([\w\d-_\*])+/g, /\:([\w\d-_\*]+)/g, textRegExp ];

	var styler = window.Styles = function(screenSizes) {

		if (screenSizes === undefined) screenSizes = defaultScreenSizes;

		$(window).on("resize", _.bind(function() {
			this.screenSize = getScreenSize(this.__screenSizes);
		}, this));

		var ss = getScreenSize(screenSizes);

		Object.defineProperties(this, {
			__screenSize: {
				value: ss,
				writable: true,
				enumerable: false
			},
			__media: {
				value: {
					mediaType: "screen"
				},
				writable: true,
				enumerable: false
			},
			__screenSizes: {
				value: screenSizes,
				writable: true,
				enumerable: false
			},
			__flat: {
				value: new Stemo([]),
				writable: true,
				enumerable: false
			},
			__index: {
				value: new Stemo({}),
				writable: true,
				enumerable: false
			},
			__current: {
				value: undefined,
				writable: true,
				enumerable: false
			},
			screenSize: {
				get: function() {
					return this.__screenSize;
				},
				set: function (v) {
					this.__screenSize = v;
					this.trigger("resize");
				}
			},
			media: {
				get: function() {
					return this.__media.mediaType;
				},
				set: function(v) {
					this.__media.mediaType;
					this.trigger("media");
				}
			},
			flat: {
				get: function() {
					return this.__flat;
				}
			}
		});

		var path = "";
		var paths = orderDefaults[treeNamingOrder[0]].split(" ");
		for (var o = 1; o < treeNamingOrder.length; o++) {
			if (orderDefaults[treeNamingOrder[o]] === undefined) continue;
			var branchs = orderDefaults[treeNamingOrder[o]].split(" ");
			paths = multiplyTree(this.__index, paths, branchs);
		}
		paths = multiplyTree(this.__index, paths, indexNamingOrder);

		this.__current = selectorParse(objectStringify({}, _.extend({}, this.__screenSize, this.__media )))[0];

	};
	_.extend(styler.prototype, Backbone.Events);
	_.extend(styler.prototype, {
		add: function(name, styles) {
			var flat = this.__flat.json;
			for(var i = 0; i < styles.length; i++) {
				var style = styles[i];
				style._index = flat.length;
				style._parentName = name; 
				style._parent = styles;
				style._selectorParsed = selectorParse(style._selector);
				style._selectorParsed = selectorsCompare(style._selectorParsed, this.__current, inclusionStyle);

				if (style._selectorParsed.length === 0) continue;

				style._selectorRerendered = selectorStringify(style._selectorParsed);

				flat.push(style);
				
				for (var s = 0; s < style._selectorParsed.length; s++) {
					var selector = style._selectorParsed[s];
					selector._style = style;
					var paths = selector["_"+treeNamingOrder[0]];
					for (var po = 1; po < treeNamingOrder.length; po++) {
						if (orderDefaults[treeNamingOrder[po]] === undefined) break;
						var attr = treeNamingOrder[po];
						var styleAttrs = selector["_"+attr];
						paths = multiplyTree(this.__index, paths, styleAttrs);
					}
					var treePaths = _.clone(paths);
					multiplyTree(this.__index, treePaths, indexNamingOrder);
					
					for (var no = 0; no < indexNamingOrder.length; no++) {
						var attr = indexNamingOrder[no];
						if ( selector["_"+attr] === undefined) continue;
						var endpoints = multiplyTree(this.__index, treePaths, selector["_"+attr], attr, "array");
						pushTree(this.__index, endpoints, selector);
					}
				}
				
			}
			this.__flat.sync('pull');
		},
		remove: function(name) {

		},
		load: function(urls, callback) {
			var toLoad = urls.length;
			var loaded = 0;
			var totalTime = 0;
			for (var i = 0 ; i < urls.length; i++) {
				$.getJSON(urls[i], _.bind(function(url, json) {
					var t = (new Date()).getTime();
					this.add(url, json);
					totalTime += (new Date()).getTime() - t;
					loaded++;
					if (loaded == toLoad && typeof callback == "function") callback.call(this, totalTime);
				}, this, urls[i]));
			}
			if (loaded == toLoad && typeof callback == "function") callback.call(this, totalTime);
		},
		getEffectiveStyles: function(object) {
			var str = objectStringify(object, _.extend({}, this.__screenSize, this.__media));
			var obj = selectorParse(str);
			object._selector = str;
			object._selectorParsed = obj[0];

			var selObj = object._selectorParsed;

			var selAttrs = [];

			for (var ino = 0; ino < indexNamingOrder.length; ino++) {
				var attr = "_" + indexNamingOrder[ino];
				if (selObj[attr] !== undefined) {
					var branches;
					if (inject[indexNamingOrder[ino]] !== undefined) branches = [].concat(inject[indexNamingOrder[ino]], selObj[attr]);
					else branches = selObj[attr];
					selAttrs = selAttrs.concat( multiplyPath([indexNamingOrder[ino]],  branches ) );
				} else if (inject[indexNamingOrder[ino]] !== undefined)
					selAttrs = selAttrs.concat( multiplyPath([indexNamingOrder[ino]], inject[indexNamingOrder[ino]] ) );
			}

			var paths = matchingTrees(this.__index, "", selObj, 0)
			var applicableStyles = [];
			for (var p = 0; p < paths.length; p++) {
				//for each path, select the matching items _type, _id, _className, _state etc
				//search each list for applicable styles
				var path = paths[p];
				for (var a = 0; a < selAttrs.length; a++) {
					var attrNode = this.__index.get(path + "." + selAttrs[a]);
					if (attrNode === undefined) continue;
					applicableStyles = applicableStyles.concat(attrNode.json);
				}
			}

			var matchingStyles = selectorsCompare(applicableStyles, selObj, matchingStyle, true);

			var uniqueStyles = {};
			for (var ms = 0; ms < matchingStyles.length; ms++) {
				var item = matchingStyles[ms];
				if (uniqueStyles[item._style._index] === undefined) uniqueStyles[item._style._index] = item;
			}
			uniqueStyles = _.values(uniqueStyles);

			var sortedStyles = uniqueStyles.sort(function(a, b) {
				return (a._style._index - b._style._index);
			});

			var sortedStyles = sortedStyles.sort(function(a, b) {
				return (a._score - b._score);
			});

			return sortedStyles;			
		}
	});

	var matchingTrees = function(indexLevel, path, selObj, pathOrderIndex ) {
		var pathLevel = indexLevel.get(path);
		var endpoints = attributesCompareReturn( Object.keys(pathLevel), selObj["_" + treeNamingOrder[pathOrderIndex]], matchingStyle[pathOrderIndex] )
		if (path != "")	endpoints = multiplyPath([path], endpoints);
		if (pathOrderIndex + 1 < treeNamingOrder.length) {
			var npaths = [];
			for (var p = 0; p < endpoints.length; p++) {
				var epp = matchingTrees(indexLevel, endpoints[p], selObj, pathOrderIndex+1);
				npaths = npaths.concat(epp);
			}
			return npaths;
		}
		return endpoints;
	};
	
	//Public Variables
	var defaultScreenSizes = styler.screenSizes = {
		mediaaspectratio: [
			{
				where: {
					aspectratio: 0.999999
				},
				name: "portrait"
			},
			{
				where: {
					aspectratio: 1.3333332
				},
				name: "normal"
			},
			{
				where: {
					aspectratio: 1.7777776
				},
				name: "widescreen"
			},
			{
				where: {
					aspectratio: 100000000
				},
				name: "extrawidescreen"
			}
		],
		mediasize: [
			{
				where: {
					width:520,
					height: 520
				},
				name: "small"
			},
			{
				where: {
					width: 760,
					height: 760
				},
				name: "medium"
			},
			{
				where: {
					width: 1024,
					height: 1024
				},
				name: "large"
			},
			{
				where: {
					width: 1000000000,
					height: 100000000
				},
				name: "extralarge"
			}
		]
	};

	
	//Private utility functions
	var selectorParse = function(str, defaults) {
		if (defaults === undefined) defaults = orderDefaults;
		var rtn = [];
		var parts = str.split(",");
		for (var i = 0; i < parts.length; i++) {
			var obj = {};
			var part = parts[i].trim();
			obj._selector = part;
			for (var re = 0; re < delimiterRegExps.length; re++) {
				var matches = part.match(delimiterRegExps[re]);
				part = part.replace(delimiterRegExps[re], ' ');
				if (matches!==null) {
					var match = matches.join(" ");
					var matches = match.match(textRegExp);
					obj["_"+processingOrder[re]] = matches;
				} else if (defaults[processingOrder[re]]) {
					var matches = defaults[processingOrder[re]].match(textRegExp);
					obj["_"+processingOrder[re]] = matches;
				}
			}
			rtn.push(obj);
		}
		return rtn;
	};

	var objectStringify = function(obj, defaults) {
		if (defaults === undefined) defaults = orderDefaults;
		var rtn = "";

		for (var po = processingOrder.length -1; po > -1; po--) {
			var delimiter = delimiterOrder[po];
			var attribute = processingOrder[po];
			var ianame = "_" + attribute;
			if (obj[ianame]) {
				rtn+= delimiter + obj[ianame].split(" ").sort().join(delimiter);
			} else if (defaults[attribute]) {
				rtn+= delimiter + defaults[attribute].split(" ").sort().join(delimiter);
			}
		}
		rtn = rtn.trim();
		return rtn;
	};

	var selectorStringify = function(arr, defaults) {
		if (defaults === undefined) defaults = orderDefaults;
		var rtn = "";
		var strs = [];
		if (!Stemo.isArray(arr)) arr = [arr];
		for (var i = 0; i < arr.length; i++) {
			var rtn = "";
			var item = arr[i];
			for (var po = processingOrder.length -1; po > -1; po--) {
				var delimiter = delimiterOrder[po];
				var attribute = processingOrder[po];
				var ianame = "_" + attribute;
				if (item[ianame]) {
					rtn+= delimiter + item[ianame].sort().join(delimiter);
				} else if (defaults[attribute]) {
					rtn+= delimiter + defaults[attribute].split(" ").sort().join(delimiter);
				}
			}
			rtn = rtn.trim();
			strs.push(rtn);
		}
		return strs.join(",");
	};

	var selectorsCompare = function( a, b, how, clone ) {
		var rtn = [];
		var subjects = (Stemo.isArray(a) ? a : [a]);
		for (var s = 0; s < subjects.length; s++) {
			var subject = subjects[s];
			var pass = true;
			var score = 0;
			for (var po = 0; po < processingOrder.length; po++) {
				var attr = "_"+processingOrder[po];
				var ar = subject[attr];
				var br = b[attr];
				var rtn1 = attributesCompare(ar,br,how[po]);
				pass = rtn1.pass;
				score+= rtn1.score;
				if (!pass) break;
			}
			if (pass && clone) {
				rtn.push( _.extend({ _score: score }, subject));
			} else if (pass) {
				rtn.push(subject);
			}
		}

		return rtn;
	};
	var attributesCompare = function( ar, br, how ) {
		if (ar === undefined) return {
			pass: true,
			score: 0
		};
		var pass = true;
		var diff = _.difference(ar, br);
		var score = 0;
		switch(how) {
		case 0:
			//match any item from a in b
			if (diff.length === ar.length) pass = false;
			else if (ar) score = ar.length - diff.length;
			break;
		case 1:
			//match any item from a in b or a = *
			var special = ar.indexOf("*") > -1 || br.indexOf("*") > -1;
			if (diff.length === ar.length && !special) pass = false;
			if (diff.length === ar.length && special) score = 1;
			else if (ar) score = ar.length - diff.length;
			break;
		case 2:
			//match every item from a in b
			var special = br.indexOf("*") > -1 || ar.indexOf("*") > -1;
			if (diff.length > 0 && !special) pass = false;
			else if (ar && diff.length === 0) score = ar.length;
			break;
		case -1:
			//pass (everything goes);
			if (ar) score = ar.length;
			break;
		}
		return {
			pass: pass,
			score: score
		};
	};
	var attributesCompareReturn = function( ar, br, how ) {
		var rtn;
		switch(how) {
		case 0:
			//match any item from a in b
			rtn = _.intersection(ar, br);
			break;
		case 1:
			//match any item from a in b or a = *
			rtn = _.intersection(ar, br);
			if (ar.indexOf("*") > -1) rtn.push("*");
			break;
		case 2:
			//match every item from a in b
			rtn = _.intersection(ar, br);
			break;
		case -1:
			//pass (everything goes);
			rtn = ar;
			break;
		}
		return rtn;
	};

	var browserDetection = function() {
		var browser = bowser.name;
	    var version = bowser.version;
	    var OS = bowser.osversion;

	    // Bowser only checks against navigator.userAgent so if the OS is undefined, do a check on the navigator.platform
	    if (OS == undefined) OS = getPlatform();

	    function getPlatform() {

	        var platform = navigator.platform;

	        if (platform.indexOf("Win") != -1) {
	            return "Windows";
	        }
	        else if (platform.indexOf("Mac") != -1) {
	            return "Mac";
	        }
	        else if (platform.indexOf("Linux") != -1) {
	            return "Linux";
	        }
	    }

	    this.browser = browser.toLowerCase().replace(/\ /g, '');
	    this.version = version.toLowerCase().substr(0, ( version.indexOf(".") == -1  ? version.length : version.indexOf(".") ) ).replace(/\ /g, '');
	    this.os = OS.toLowerCase().replace(/\ /g, '');
	    this.renderer = [
	    	"*",
	    	this.browser,
	    	this.browser + this.version,
	    	this.browser + version.replace(/\./g, "-"),
	    	this.os,
	    	this.os + this.browser,
	    	this.os + this.browser + this.version,
	    	this.os + this.browser + version.replace(/\./g, "-"),
	    ].join(" ");
	};

	var getScreenSize = function(screenSizes) {
		var height = window.innerHeight;
		var width = window.innerWidth;

		var ratio = Math.floor(width/height*100)/100;

		var aspectratio = "large";
		for (var i = 0; i < screenSizes.mediaaspectratio.length; i++) {
			if (ratio <= screenSizes.mediaaspectratio[i].where.aspectratio) {
				aspectratio = screenSizes.mediaaspectratio[i].name;
				break;
			}
		}

		var size = "widescreen";
		for (var i = 0; i < screenSizes.mediasize.length; i++) {
			if (height <= screenSizes.mediasize[i].where.height / ratio && width <= screenSizes.mediasize[i].where.width) {
				size = screenSizes.mediasize[i].name;
				break;
			}
		}

		var rtn = { 
			height:height, 
			width:width, 
			ratio: ratio,
			mediaAspectRatio: aspectratio,
			mediaSize:size
		};
		browserDetection.call(rtn);
		return rtn;
	};

	var multiplyTree = function(on, paths, newbranches, prefix, withObj) {
		var paths = multiplyPath(paths, newbranches, prefix);
		for (var p = 0; p < paths.length; p++) {
				if (on.get(paths[p]) === undefined) 
					on.set(paths[p], ( withObj == "array" ? [] : {} ) );
		}
		return paths;
	};

	var multiplyPath = function(paths, newbranches, prefix) {
		if (paths.length === 0 || paths.length == 1 && paths[0] == "") return newbranches;
		var rtn = [];
		for (var p = 0; p < paths.length; p++) {
			for (var b = 0; b < newbranches.length; b++) {
				rtn.push ( paths[p] + "." + (prefix ? prefix + "." : "") + newbranches[b] );
			}
		}
		return rtn;
	};

	var pushTree = function(on, paths, obj) {
		for (var p = 0; p < paths.length; p++) {
			on.get(paths[p]).push(obj);
		}
	};


})();