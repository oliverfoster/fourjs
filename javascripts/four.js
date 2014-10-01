$(function() {
	var Four = window.Four = function(settings) {
		Object.defineProperties(this, $.extend(true, {}, this.__properties));

		if (!settings) settings = {};

		if (!settings.domElement) {
			settings.domElement = $("<div>")[0];
		}
		this.__domElement = settings.domElement

		if (!settings.height) settings.height = "100%";
		if (!settings.width) settings.width = "100%";

		this.__canvas = new Two({
			type: Two.Types.canvas,
			className: "two-output-canvas",
			height: settings.height,
			width:settings.width
		})
		this.__svg = new Two({
			type: Two.Types.svg,
			className: "two-output-svg",
			height: settings.height,
			width:settings.width
		})

		$(this.__svg.renderer.domElement).css({
			position: "absolute",
			top: "0px",
			left: "0px",
			height: "100%",
			width: "100%"
		});
		$(this.__canvas.renderer.domElement).css({
			position: "absolute",
			top: "0px",
			left: "0px",
			height: "100%",
			width: "100%"
		});

		this.__canvas.appendTo(this.__domElement);
		this.__svg.appendTo(this.__domElement);

		this.__scene = new Four.Group( { x:0, y:0, height: 0, width: 0} );
		this.__scene.__root = this;
		this.__scene.__parent = this;

		this.__canvas.scene = this.__scene.__two;
		this.__svg.scene = this.__scene.__two;

		var resize = _.bind(this.resize,this);
		_.defer(resize);

		$(window).resize(resize);

		return this;
	}
	$.extend(true, Four.prototype, Backbone.Events);
	Four.prototype.__properties = {
		'__domElement': {
			value: undefined,
			writable: true,
			enumerable: false
		},
		'__scene': {
			value: undefined,
			writable: true,
			enumerable: false
		},
		'__canvas': {
			value: undefined,
			writable: true,
			enumerable: false
		},
		'__svg': {
			value: undefined,
			writable: true,
			enumerable: false
		},
		'__dimension': {
			value: [],
			writable: true,
			enumerable: false
		},
		'domElement': {
			get: function() {
				return this.__domElement;
			}
		},
		'scene': {
			set: function(v) {
				this.__scene = v;
			},
			get: function() {
				return this.__scene;
			},
			enumerable: true
		},
		'canvas': {
			set: function(v) {
				this.__canvas = v;
			},
			get: function() {
				return this.__canvas;
			}
		},
		'dimension': {
			set: function(v) {
				this.__dimension = v;
				this.scene.dimension = v;
			},
			get: function() {
				return this.__dimension;
			}
		},
		'width': {
			set: function(v) {
				this.__dimension[0] = v;
			},
			get: function() {
				return this.__dimension[0];
			},
			enumerable: true
		},
		'height': {
			set: function(v) {
				this.__dimension[1] = v;
			},
			get: function() {
				return this.__dimension[1];
			},
			enumerable: true
		}
	};
	$.extend(true, Four.prototype, {
		resize: function() {
			this.__svg.update();
			this.dimension = [ $(this.__svg.renderer.domElement).width(), $(this.__svg.renderer.domElement).height() ];
			this.__svg.width = this.__dimension[0];
			this.__svg.height = this.__dimension[1];
			this.__canvas.width = this.__dimension[0];
			this.__canvas.height = this.__dimension[1];
			
			//need to do relative position calculations
			this.scene.translation = [ parseInt(this.__dimension[0]) / 2, parseInt(this.__dimension[1]) / 2 ];

			var thisHandle = this;
			this.__svg.unbind('update');
			this.__svg.bind('update', function(frameCount) {
				thisHandle.__canvas.update();
				thisHandle.trigger("update");
			}).play();
		},
		load: function(json) {
			scene.json = json;
		},
		save: function() {
			return scene.json;
		}
	});




	Four.Foundation = function () {};
	$.extend(true, Four.Foundation.prototype, Backbone.Events);
	Four.Foundation.prototype.__properties = {
		'__type': {
			value: undefined,
			writable: true,
			enumerable: false
		},
		'__selectable': {
			value: false,
			writable: true,
			enumerable: false
		},
		'__two': {
			value: undefined,
			writable: true,
			enumerable: false
		},
		'__translation': {
			value: [],
			writable: true,
			enumerable: false
		},
		'__scale': {
			value: 1,
			writable: true,
			enumerable: false
		},
		'__opacity': {
			value: 1,
			writable: true,
			enumerable: false,
		},
		'__rotation': {
			value: 0,
			writable: true,
			enumerable: false,
		},
		'__dimension': {
			value: [],
			writable: true,
			enumerable: false
		},
		'__parent': {
			value: undefined,
			writable: true,
			enumerable: false
		},
		'__root': {
			value: undefined,
			writable: true,
			enumerable: false
		},
		'length': {
			value: 0,
			writable: true,
			enumerable: false
		},
		'json': {
			set: function(v) {
			},
			get: function() {
				var json = {};
				var keys = Object.keys(this);
				for (var i = 0 ; i < keys.length; i++ ) {
					var key = keys[i];
					if (!isNaN(parseInt(key))) json[parseInt(key)] = this[parseInt(key)].json;
					else json[key] = this[key];
				}
				return json;
			}
		},
		'opacity': {
			set: function(v) {
				this.__opacity = v;
				this.__two.globalAlpha = this.__scale;
			},
			get: function() {
				return this.__opacity;
			}	
		},
		'scale': {
			set: function(v) {
				this.__scale = v;
				this.__two.scale = this.__scale;
			},
			get: function() {
				return this.__scale;
			}	
		},
		'rotationDegrees': {
			set: function(v) {
				v = v * (Math.PI/180);
				this.__rotation = v;
				this.__two.rotation = v;
			},
			get: function() {
				return this.__rotation * (180 / Math.PI);
			}	
		},
		'rotationRadians': {
			set: function(v) {
				this.__rotation = v;
				this.__two.rotation = v;
			},
			get: function() {
				return this.__rotation;
			}	
		},
		'translation': {
			set: function(v) {
				this.__translation = v;
				this.__two.translation.set(this.__translation[0], this.__translation[1]);
			},
			get: function() {
				return this.__translation;
			}	
		},
		'x': {
			set: function(v) {
				this.__translation[0] = v;
				this.__two.translation.set(this.__translation[0], this.__translation[1]);
			},
			get: function() {
				return this.__translation[0];
			},
			enumerable: true
		},
		'y': {
			set: function(v) {
				this.__translation[1] = v;
				this.__two.translation.set(this.__translation[0], this.__translation[1]);
			},
			get: function() {
				return this.__translation[1];
			},
			enumerable: true
		},
		'dimension': {
			set: function(v) {
				this.__dimension = v;
			},
			get: function() {
				return this.__dimension;
			}
		},
		'width': {
			set: function(v) {
				this.__dimension[0] = v;
			},
			get: function() {
				return this.__dimension[0];
			},
			enumerable: true
		},
		'height': {
			set: function(v) {
				this.__dimension[1] = v;
			},
			get: function() {
				return this.__dimension[1];
			},
			enumerable: true
		},
		'parent': {
			get: function() {
				return this.__parent;
			}
		},
		'root': {
			get: function() {
				return this.__root;
			}
		},
		'type': {
			get: function() {
				return this.__type;
			},
			enumerable: true
		},
		'selectable': {
			set: function(v) {
				this.__selectable =v;
			},
			get: function() {
				return this.__selectable;
			},
			enumerable: true
		}
	};
	$.extend(true, Four.Foundation.prototype, {
		appendTo: function(parent) {
			this.remove();
			this.__parent = parent;
			this.__root = parent.__root;
			this.__parent.push(this);
			this.__parent.__two.add(this.__two);
			return this;
		},
		remove: function() {
			if (this.__parent !== undefined) {
				for (var i = 0; i < this.__parent.length; i++) {
					if (this.__parent[i] === this) {
						this.__parent.__two.remove(this.__two);
						return this.__parent.splice(i,1);
					}
				}
			}
			return this;
		}
	})


	Four.Group = function(settings, o) {
		Object.defineProperties(this, $.extend(true, {}, this.__properties));
		this.__type = "group";

		var objects = o;
		if (settings && !_.isArray(settings)) {
			if (!_.isArray(o)) {
				objects = _.toArray(arguments)
				objects.shift();
			}
		} else {
			settings = {};
			if (!_.isArray(o)) {
				objects = _.toArray(arguments);
			}
		}
		this.__two = new Two.Group();

		if (settings.selectable === true) this.__two.selectable = true;
		if (settings.interactive === true) Two.addInteractivity(this.__two);

		this.__two.add(objects);


		if (settings.height) this.height = parseInt(settings.height);
		if (settings.width) this.width = parseInt(settings.width);
		if (settings.x) this.x = parseInt(settings.x);// - (this.width / 2);
		if (settings.y) this.y = parseInt(settings.y);// - (this.height / 2);


		return this;
	};
	Four.Group.prototype = [];
	$.extend(true, Four.Group.prototype, Four.Foundation.prototype);
	$.extend(true, Four.Group.prototype, {
		add: function() {
			for(var i = 0; i < arguments.length; i++) {
				arguments[i].appendTo(this);
			}
		},
		remove: function() {

		}
	});


	Four.Text = function(settings) {
		Object.defineProperties(this, $.extend(true, {}, this.__properties));
		this.__type = "text";

		var rect = new Four.Rectangle(settings);
		rect.__two.text = settings.text;

		this.__two = rect.__two;

		if (settings.height) this.height = parseInt(settings.height);
		if (settings.width) this.width = parseInt(settings.width);
		if (settings.x) this.x = parseInt(settings.x);// - (this.width / 2);
		if (settings.y) this.y = parseInt(settings.y);// - (this.height / 2);

		return this;
	};
	$.extend(true, Four.Text.prototype, Four.Foundation.prototype);

	Four.Canvas = function(settings) {
		Object.defineProperties(this, $.extend(true, {}, this.__properties));
		this.__type = "canvas";

		var rect = new Four.Rectangle(settings);
		rect.__two.canvas = settings.canvas;

		this.__two = rect.__two;

		if (settings.height) this.height = parseInt(settings.height);
		if (settings.width) this.width = parseInt(settings.width);
		if (settings.x) this.x = parseInt(settings.x);// - (this.width / 2);
		if (settings.y) this.y = parseInt(settings.y);// - (this.height / 2);

		return this;
	};
	$.extend(true, Four.Canvas.prototype, Four.Foundation.prototype);

	Four.Image = function(settings) {
		Object.defineProperties(this, $.extend(true, {}, this.__properties));
		this.__type = "image";

		var rect = new Four.Rectangle(settings);
		this.__two = rect.__two;

		if (settings.image)	this.image = settings.image;
		if (settings.height) this.height = parseInt(settings.height);
		if (settings.width) this.width = parseInt(settings.width);
		if (settings.x) this.x = parseInt(settings.x);// - (this.width / 2);
		if (settings.y) this.y = parseInt(settings.y);// - (this.height / 2);

		return this;
	};
	$.extend(true, Four.Image.prototype, Four.Foundation.prototype);
	$.extend(true, Four.Image.prototype.__properties, {
		'__image': {
			value: "",
			writable: true,
			enumerable: false
		},
		'image': {
			get: function() {
				if (this.__two.image === undefined) return undefined;
				var canvas = document.createElement('canvas');
				var ctx = canvas.getContext('2d');
				ctx.drawImage(this.__two.image, 0, 0);
				this.__image = canvas.toDataURL();
				return this.__image;
			},
			set: function(v) {
				if (typeof v == "string") {
					var img = new Image();
					img.onload = _.bind(function() {
						this.__image = undefined;
						this.__two.image = img;
					}, this);
					img.src = v;
				} else {
					this.__image = undefined;
					this.__two.image = v;
				}
			},
			enumerable: true
		}
	});

	Four.Input = function(settings) {
		Object.defineProperties(this, $.extend(true, {}, this.__properties));
		this.__type = "input";

		var text = new Four.Canvas(settings);
		var ele = document.createElement("div");
		$('body').append(ele);
		$(ele).css({
			"position": "fixed",
			"top":"-100%",
			"left":"-100%",
			"top":"0",
			"right":"0",
			"height":settings.height*(window.devicePixelRatio*2),
			"width":settings.width*(window.devicePixelRatio*2)
		})
		
		this.editor = carota.editor.create(ele, { mouseCaptureElement: text });
		this.nextInsertFormatting = this.editor.nextInsertFormatting;
		$(ele).css({
			"position": "fixed",

		});
		text.canvas = this.editor.canvas;
		this.canvas = this.editor.canvas;

		$(ele).on("paint", function(element, canvas) {
			text.canvas = canvas;
		});

		this.__two = text.__two;
		this.__element = ele;

		if (settings.height) this.height = parseInt(settings.height);
		if (settings.width) this.width = parseInt(settings.width);
		if (settings.x) this.x = parseInt(settings.x);// - (this.width / 2);
		if (settings.y) this.y = parseInt(settings.y);// - (this.height / 2);

		return this;
	}
	$.extend(true, Four.Input.prototype, Four.Canvas.prototype);
	$.extend(true, Four.Input.prototype.__properties, {
		'__element': {
			value: undefined,
			writable: true,
			enumerable: false
		}
	})


	Four.Rectangle = function(settings) {
		Object.defineProperties(this, $.extend(true, {}, this.__properties));
		this.__type = "rectangle";

		//need to do relative position calculations
		var w2 = parseInt(settings.width) / 2;
		var h2 = parseInt(settings.height) / 2;

		var points = [
			new Two.Anchor(-w2, -h2),
			new Two.Anchor(w2, -h2),
			new Two.Anchor(w2, h2),
			new Two.Anchor(-w2, h2)
		];

		var rect = new Two.Polygon(points, true);

		Two.addInteractivity(rect);

		this.__two = rect;

		if (settings.height) this.height = parseInt(settings.height);
		if (settings.width) this.width = parseInt(settings.width);
		if (settings.x) this.x = parseInt(settings.x);// - (this.width / 2);
		if (settings.y) this.y = parseInt(settings.y);// - (this.height / 2);

		//need to do relative position calculations
		//rect.translation.set(parseInt(settings.x), parseInt(settings.y));

		return this;
	};
	$.extend(true, Four.Rectangle.prototype, Four.Foundation.prototype);

	Four.Square = function(settings) {
		Object.defineProperties(this, $.extend(true, {}, this.__properties));
		this.__type = "square";

		var w2 = (parseInt(settings.width) || parseInt(settings.height)) / 2;
		var h2 = w2;

		var points = [
			new Two.Anchor(-w2, -h2),
			new Two.Anchor(w2, -h2),
			new Two.Anchor(w2, h2),
			new Two.Anchor(-w2, h2)
		];

		var rect = new Two.Polygon(points, true);
		//need to do relative position calculations
		//rect.translation.set(parseInt(settings.x), parseInt(settings.y));

		Two.addInteractivity(rect);

		this.__two = rect;

		if (settings.height) this.height = parseInt(settings.height);
		if (settings.width) this.width = parseInt(settings.width);
		if (settings.x) this.x = parseInt(settings.x);// - (this.width / 2);
		if (settings.y) this.y = parseInt(settings.y);// - (this.height / 2);

		return this;
	};
	$.extend(true, Four.Square.prototype, Four.Rectangle.prototype);

	Four.Polygon = function(settings) {
		Object.defineProperties(this, $.extend(true, {}, this.__properties));
		this.__type = "polygon";

		var l = arguments.length, points = settings.points;
		if (!_.isArray(p)) {
			points = [];
			for (var i = 0; i < l; i+=2) {
			  var x = arguments[i];
			  if (!_.isNumber(x)) {
			    break;
			  }
			  var y = arguments[i + 1];
			  points.push(new Two.Anchor(x, y));
			}
		}

		var last = arguments[l - 1];
		var poly = new Two.Polygon(points, !(_.isBoolean(last) ? last : undefined));
		var rect = poly.getBoundingClientRect();
		//need to do relative position calculations
		poly.center();//.translation.set(rect.left + rect.width / 2, rect.top + rect.height / 2);

		Two.addInteractivity(poly);

		this.__two = poly;

		this.height = rect.height;
		this.width = rect.width;
		this.x = rect.left + rect.width / 2;
		this.y = rect.top + rect.height / 2;

		return this;
	}
	$.extend(true, Four.Polygon.prototype, Four.Foundation.prototype);

	Four.Line = function(settings) {
		Object.defineProperties(this, $.extend(true, {}, this.__properties));
		this.__type = "line";

		var width = settings.x2 - settings.x1;
		var height = settings.y2 - settings.y1;

		var w2 = width / 2;
		var h2 = height / 2;

		var points = [
			new Two.Anchor(- w2, - h2),
			new Two.Anchor(w2, h2)
		];

		var line = new Two.Polygon(points).noFill();
		var rect = line.getBoundingClientRect();
		//need to do relative position calculations
		//line.translation.set(parseInt(settings.x1) + parseInt(settings.w2), parseInt(settings.y1) + parseInt(settings.h2));


		Two.addInteractivity(line);

		this.__two = line;

		this.height = rect.height;
		this.width = rect.width;
		this.x = rect.left + rect.width / 2;
		this.y = rect.top + rect.height / 2;

		return this;
  	};
  	$.extend(true, Four.Line.prototype, Four.Polygon.prototype);


	Four.Curve = function(settings) {
		Object.defineProperties(this, $.extend(true, {}, this.__properties));
		this.__type = "curve";

		var l = arguments.length, points = settings.points;
		if (!_.isArray(p)) {
			points = [];
			for (var i = 0; i < l; i+=2) {
			  var x = arguments[i];
			  if (!_.isNumber(x)) {
			    break;
			  }
			  var y = arguments[i + 1];
			  points.push(new Two.Anchor(x, y));
			}
		}

		var last = arguments[l - 1];
		var poly = new Two.Polygon(points, !(_.isBoolean(last) ? last : undefined), true);
		var rect = poly.getBoundingClientRect();

		var cx = rect.left + rect.width / 2;
		var cy = rect.top + rect.height / 2;

		_.each(poly.vertices, function(v) {
		v.x -= cx;
		v.y -= cy;
		});
		//need to do relative position calculations
		//poly.translation.set(cx, cy);

		Two.addInteractivity(poly);

		this.__two = poly;

		this.height = rect.height;
		this.width = rect.width;
		this.x = rect.left + rect.width / 2;
		this.y = rect.top + rect.height / 2;

		return this;
	}
	$.extend(true, Four.Curve.prototype, Four.Polygon.prototype);

	Four.Ellipse = function(settings) {
		Object.defineProperties(this, $.extend(true, {}, this.__properties));
		this.__type = "ellipse";

		var amount = Two.Resolution;

		var points = _.map(_.range(amount), function(i) {
			var pct = i / amount;
			var theta = pct * TWO_PI;
			var x = settings.width * cos(theta);
			var y = settings.height * sin(theta);
			return new Two.Anchor(x, y);
		}, this);

		var ellipse = new Two.Polygon(points, true, true);
		var rect = ellipse.getBoundingClientRect();
		//need to do relative position calculations
		//ellipse.translation.set(parseInt(settings.x), parseInt(settings.y));

		Two.addInteractivity(ellipse);

		this.__two = ellipse;

		this.height = rect.height;
		this.width = rect.width;
		this.x = rect.left + rect.width / 2;
		this.y = rect.top + rect.height / 2;

		return this;
	}
	$.extend(true, Four.Ellipse.prototype, Four.Polygon.prototype);

	Four.Circle = function(settings) {
		Object.defineProperties(this, $.extend(true, {}, this.__properties));
		this.__type = "circle";

		settings.width = settings.radius;
		settings.height = settings.radius;

		var amount = Two.Resolution;

		var points = _.map(_.range(amount), function(i) {
			var pct = i / amount;
			var theta = pct * TWO_PI;
			var x = settings.width * cos(theta);
			var y = settings.height * sin(theta);
			return new Two.Anchor(x, y);
		}, this);

		var ellipse = new Two.Polygon(points, true, true);
		var rect = ellipse.getBoundingClientRect();
		//need to do relative position calculations
		//ellipse.translation.set(parseInt(settings.x), parseInt(settings.y));

		Two.addInteractivity(ellipse);

		this.__two = ellipse;

		this.height = rect.height;
		this.width = rect.width;
		this.x = rect.left + rect.width / 2;
		this.y = rect.top + rect.height / 2;

		return this;	
	}
	$.extend(true, Four.Circle.prototype, Four.Ellipse.prototype);

});