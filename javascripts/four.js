$(function() {

	var Four = window.Four = function(settings) {
		if (!settings) settings = {};

		this.domElement;
		if (!settings.domElement) {
			settings.domElement = $("<div>")[0];
		}
		this.domElement = settings.domElement

		if (!settings.height) settings.height = "100%";
		if (!settings.width) settings.width = "100%";

		this.canvas = new Two({
			type: Two.Types.canvas,
			className: "two-output-canvas",
			height: settings.height,
			width:settings.width
		})
		this.svg = new Two({
			type: Two.Types.svg,
			className: "two-output-svg",
			height: settings.height,
			width:settings.width
		})

		$(this.svg.renderer.domElement).css({
			position: "absolute",
			top: "0px",
			left: "0px",
			height: "100%",
			width: "100%"
		});
		$(this.canvas.renderer.domElement).css({
			position: "absolute",
			top: "0px",
			left: "0px",
			height: "100%",
			width: "100%"
		});

		this.canvas.appendTo(this.domElement);
		this.svg.appendTo(this.domElement);

		this.scene = new Four.Group();

		this.canvas.scene = this.scene;
		this.svg.scene = this.scene;

		this.height = $(this.svg.renderer.domElement).height();
		this.width = $(this.svg.renderer.domElement).width();

		this.group = new Four.Group();
		
		this.group.translation.set(this.width / 2, this.height / 2);

		this.scene.add(this.group);

		var resize = _.bind(this.resize,this);
		_.defer(resize);

		$(window).resize(resize);

		return this;
	}

	Four.Group = function(settings, o) {
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
		var group = new Two.Group();

		if (settings.selectable === true) group.selectable = true;

		group.add(objects);

		Two.addInteractivity(group);

		return group;
	};

	Four.Line = function(settings) {
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
		return line;
  	};

	Four.Rectangle = function(settings) {
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

		return rect;
	};
	Four.Image = function(settings) {
		var rect = new Four.Rectangle(settings);
		rect.image = settings.image;
		return rect;
	};
	Four.Text = function(settings) {
		var rect = new Four.Rectangle(settings);
		rect.text = settings.text;
		return rect;
	};
	Four.Canvas = function(settings) {
		var rect = new Four.Rectangle(settings);
		rect.canvas = settings.canvas;
		return rect;
	};
	Four.Ellipse = function(settings) {
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

		return ellipse;
	}
	Four.Circle = function(settings) {
		settings.width = settings.radius;
		settings.height = settings.radius;
		var ellipse = new Four.Ellipse(settings);
		return ellipse;
	}
	Four.Polygon = function(settings) {
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
		poly.center().translation
		.set(rect.left + rect.width / 2, rect.top + rect.height / 2);

		Two.addInteractivity(poly);

		return poly;
	}
	Four.Curve = function(settings) {
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

		return poly;
	}
	Four.Input = function(settings) {
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
			"height":settings.height,
			"width":settings.height
		})
		var editor = carota.editor.create(ele, {mouseEventer: text });
		$(ele).css({
			"position": "fixed",

		});
		text.canvas = editor.canvas;

		grp.add(text);

		$(ele).on("paint", function(element, canvas) {
			text.canvas = canvas;
		});

		return grp;
	}

	_.extend(Four.prototype, Backbone.Events);
	_.extend(Four.prototype, {
		resize: function() {
			this.svg.update();
			this.height = $(this.svg.renderer.domElement).height();
			this.width = $(this.svg.renderer.domElement).width();
			this.svg.height = this.height;
			this.svg.width = this.width;
			this.canvas.height = this.height;
			this.canvas.width = this.width;
			
			this.group.translation.set(this.width / 2, this.height / 2);

			var thisHandle = this;
			this.svg.unbind('update');
			this.svg.bind('update', function(frameCount) {
				thisHandle.canvas.update();
				thisHandle.trigger("update");
			}).play();
		}
	});



});