$(function() {
	var Four = window.Four = function(settings) {
		Object.defineProperties(this, this.__properties);

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

		this.__scene = new Four.Group();
		this.__scene.__root = this;
		this.__scene.__parent = this;

		this.__canvas.scene = this.__scene.__two;
		this.__svg.scene = this.__scene.__two;

		this.__dimension = [ $(this.__svg.renderer.domElement).width(), $(this.__svg.renderer.domElement).height() ];
		
		this.__scene.translation = [ this.__dimension[0] / 2, this.__dimension[1] / 2 ];

		var resize = _.bind(this.resize,this);
		_.defer(resize);

		$(window).resize(resize);

		return this;
	}
	_.extend(Four.prototype, Backbone.Events);
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
	_.extend(Four.prototype, {
		resize: function() {
			this.__svg.update();
			this.__dimension = [ $(this.__svg.renderer.domElement).width(), $(this.__svg.renderer.domElement).height() ];
			this.__svg.width = this.__dimension[0];
			this.__svg.height = this.__dimension[1];
			this.__canvas.width = this.__dimension[0];
			this.__canvas.height = this.__dimension[1];
			
			
			this.scene.translation = [ this.__dimension[0] / 2, this.__dimension[1] / 2 ];

			var thisHandle = this;
			this.__svg.unbind('update');
			this.__svg.bind('update', function(frameCount) {
				thisHandle.__canvas.update();
				thisHandle.trigger("update");
			}).play();
		}
	});




	Four.Foundation = function () {};
	_.extend(Four.Foundation.prototype, Backbone.Events);
	Four.Foundation.prototype.__properties = {
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
				this.__json = v;
			},
			get: function() {
				return this.__json;
			}
		},
		'opacity': {
			set: function(v) {
				this.__opacity = v;
			},
			get: function() {
				return this.__opacity;
			}	
		},
		'rotation': {
			set: function(v) {
				this.__rotation = v;
			},
			get: function() {
				return this.__rotation;
			}	
		},
		'translation': {
			set: function(v) {
				this.__translation = v;
			},
			get: function() {
				return this.__translation;
			}	
		},
		'x': {
			set: function(v) {
				this.__translation[0] = v;
			},
			get: function() {
				return this.__translation[0];
			},
			enumerable: true
		},
		'y': {
			set: function(v) {
				this.__translation[1] = v;
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
		}
	};
	_.extend(Four.Foundation.prototype, {
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
		Object.defineProperties(this, this.__properties);

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

		_.extend(this, settings);

		this.__two.add(objects);


		return this;
	};
	Four.Group.prototype = [];
	_.extend(Four.Group.prototype, Four.Foundation.prototype);
	_.extend(Four.Group.prototype, {
		add: function() {
			for(var i = 0; i < arguments.length; i++) {
				arguments[i].appendTo(this);
			}
		},
		remove: function() {

		}
	});


	Four.Line = function(settings) {
		Object.defineProperties(this, this.__properties);

		var width = settings.x2 - settings.x1;
		var height = settings.y2 - settings.y1;

		var w2 = width / 2;
		var h2 = height / 2;

		var points = [
			new Two.Anchor(- w2, - h2),
			new Two.Anchor(w2, h2)
		];

		var line = new Two.Polygon(points).noFill();
		line.translation.set(settings.x1 + settings.w2, settings.y1 + settings.h2);

		Two.addInteractivity(line);

		this.__two = line;

		return this;
  	};
  	_.extend(Four.Line.prototype, Four.Foundation.prototype);

	Four.Rectangle = function(settings) {
		Object.defineProperties(this, this.__properties);

		var w2 = settings.width / 2;
		var h2 = settings.height / 2;

		var points = [
			new Two.Anchor(-w2, -h2),
			new Two.Anchor(w2, -h2),
			new Two.Anchor(w2, h2),
			new Two.Anchor(-w2, h2)
		];

		var rect = new Two.Polygon(points, true);
		rect.translation.set(settings.x, settings.y);

		Two.addInteractivity(rect);

		this.__two = rect;

		return this;
	};
	_.extend(Four.Rectangle.prototype, Four.Foundation.prototype);

	Four.Image = function(settings) {
		Object.defineProperties(this, this.__properties);

		var rect = new Four.Rectangle(settings);
		rect.__two.image = settings.image;

		this.__two = rect.__two;

		return this;
	};
	_.extend(Four.Image.prototype, Four.Foundation.prototype);

	Four.Text = function(settings) {
		Object.defineProperties(this, this.__properties);

		var rect = new Four.Rectangle(settings);
		rect.__two.text = settings.text;

		this.__two = rect.__two;

		return this;
	};
	_.extend(Four.Text.prototype, Four.Foundation.prototype);

	Four.Canvas = function(settings) {
		Object.defineProperties(this, this.__properties);

		var rect = new Four.Rectangle(settings);
		rect.__two.canvas = settings.canvas;

		this.__two = rect.__two;

		return this;
	};
	_.extend(Four.Canvas.prototype, Four.Foundation.prototype);

	Four.Ellipse = function(settings) {
		Object.defineProperties(this, this.__properties);

		var amount = Two.Resolution;

		var points = _.map(_.range(amount), function(i) {
			var pct = i / amount;
			var theta = pct * TWO_PI;
			var x = settings.width * cos(theta);
			var y = settings.height * sin(theta);
			return new Two.Anchor(x, y);
		}, this);

		var ellipse = new Two.Polygon(points, true, true);
		ellipse.translation.set(settings.x, settings.y);

		Two.addInteractivity(ellipse);

		this.__two = ellipse;

		return this;
	}
	_.extend(Four.Ellipse.prototype, Four.Foundation.prototype);

	Four.Circle = function(settings) {
		Object.defineProperties(this, this.__properties);

		settings.width = settings.radius;
		settings.height = settings.radius;
		var ellipse = new Four.Ellipse(settings);

		this.__two == ellipse.__two;

		return this;
	}
	_.extend(Four.Circle.prototype, Four.Foundation.prototype);

	Four.Polygon = function(settings) {
		Object.defineProperties(this, this.__properties);

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
		poly.center().translation.set(rect.left + rect.width / 2, rect.top + rect.height / 2);

		Two.addInteractivity(poly);

		this.__two = poly;

		return this;
	}
	_.extend(Four.Polygon.prototype, Four.Foundation.prototype);

	Four.Curve = function(settings) {
		Object.defineProperties(this, this.__properties);

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

		poly.translation.set(cx, cy);

		Two.addInteractivity(poly);

		this.__two = poly;

		return this;
	}
	_.extend(Four.Curve.prototype, Four.Foundation.prototype);

	Four.Input = function(settings) {
		Object.defineProperties(this, this.__properties);

		var grp = new Four.Group({selectable: true});

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

		grp.add(text);

		$(ele).on("paint", function(element, canvas) {
			text.canvas = canvas;
		});

		this.group = grp;
		this.element = ele;
		this.settings = settings;

		return this;
	}
	_.extend(Four.Group.prototype, Four.Foundation.prototype);


});