


(function() {


	var styler = window.Styler = function(screenSizes) {

		$(window).on("resize", _.bind(function() {
			this.__screenSize = styler.getScreenSize(this.__screenSizes);
		}, this));

		Object.defineProperties(this, {
			__screenSize: {
				value: styler.getScreenSize(screenSizes),
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
			screenSize: {
				get: function() {
					return this.__screenSize;
				}
			},
			flat: {
				get: function() {
					return this.__flat;
				}
			}
		});

		var path = "";
		var paths = defaults[order[0]].split(" ");
		var finalBranches = [];
		for (var o = 1; o < order.length; o++) {
			if (defaults[order[o]] === undefined) {
				finalBranches.push(order[o]);
			} else {
				var branchs = defaults[order[o]].split(" ");
				paths = multiplyTree(this.__index, paths, branchs);
			}
		}
		multiplyTree(this.__index, paths, finalBranches);

	};
	_.extend(styler.prototype, Backbone.Events);
	_.extend(styler.prototype, {
		add: function(name, styles) {
			for(var i = 0; i < styles.length; i++) {
				styles[i]._index = this.__flat.length - 1;
				styles[i]._parentName = name; 
				styles[i]._parent = styles;
				styles[i]._selectorParsed = selectorParse(styles[i]._selector);
				this.__flat.push(styles[i]);
				//for (var i = )
				
			}
		},
		remove: function(name) {

		}
	});

	

	var order = [ "mediaType", "mediaSize", "mediaAspectRatio", "className", "id", "type" ];
	var defaults = {
		mediaType: "screen", 
		mediaSize: "small medium large extralarge", 
		mediaAspectRatio: "screen widescreen extrawidescreen"
	}
	var delimiterOrder = [ "@", "+", "/", ".", "#", "" ];
	var delimiterRegExps = [ /\@([\w\d-_]+)/g, /\+([\w\d-_]+)/g, /\/([\w\d-_]+)/g, /\.([\w\d-_]+)/g, /\#([\w\d-_])+/g, /([\w\d-_]+)/g  ];

	var selectorParse = styler.selectorParse = function(str) {
		var rtn = [];
		var parts = str.split(",");
		for (var i = 0; i < parts.length; i++) {
			var obj = {};
			var part = parts[i].trim();
			for (var re = 0; re < delimiterRegExps.length; re++) {
				var matches = part.match(delimiterRegExps[re]);
				part = part.replace(delimiterRegExps[re], ' ');
				if (matches!==null) {
					var match = matches.join(" ");
					var matches = match.match(/([\w\d-_]+)/g);
					obj[order[re]] = matches;
				} else if (defaults[order[re]]) {
					var matches = defaults[order[re]].match(/([\w\d-_]+)/g);
					obj[order[re]] = matches;
				}
			}
			rtn.push(obj);
		}
		console.log(rtn);
		return rtn;
	};

	var selectorStringify = styler.selectorStringify = function(arr) {
		var rtn = "";
		var strs = [];
		if (!Stemo.isArray(arr)) arr = [arr];
		for (var i = 0; i < arr.length; i++) {
			var rtn = "";
			var item = arr[i];
			if (item._type) rtn+= item._type.join(" ");
			if (item._id) rtn+= "#" + item._id.join(".");
			if (item._className) rtn+= "." + item._className.join(".");
			if (item._mediaType) rtn+= "@" + item._mediaType.join("@");
			else if (defaults['mediaType']) rtn+= "@" + defaults[mediaType].split(" ").join("@");
			if (item._mediaSize) rtn+= "+" + item._mediaSize.join("+");
			else if (defaults['_mediaSize']) rtn+= "+" + defaults[_mediaSize].split(" ").join("+");
			if (item._mediaAspectRatio) rtn+= "/" + item._mediaAspectRatio.join("/");
			else if (defaults['_mediaAspectRatio']) rtn+= "/" + defaults[_mediaAspectRatio].split(" ").join("/");
			strs.push(rtn);
		}
		return strs.join(", ");
	};

	var screenSizes = styler.screenSizes = {
		mediaaspectratio: [
			{
				where: {
					aspectratio: 1.3333332
				},
				name: "screen"
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

	

	//Public utility functions
	var getScreenSize = styler.getScreenSize = function(screenSizes) {
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

		return { 
			height:height, 
			width:width, 
			ratio: ratio, 
			mediaType: "screen",
			mediaAspectRatio: aspectratio,
			mediaSize:size
		};
	};



	//Private utility functions
	var multiplyTree = function(on, paths, newbranches) {
		var rtn = [];
		for (var p = 0; p < paths.length; p++) {
			for (var b = 0; b < newbranches.length; b++) {
				rtn.push ( paths[p] + "." + newbranches[b] );
				on.set(paths[p] + "." + newbranches[b], {});
			}
		}
		return rtn;
	};


})();