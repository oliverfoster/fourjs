(function() {

	var model = window.model = function() {
		var args = _.toArray(arguments);
		if (args.length === 0 ) return;

		var obj = args[0];

		var rtn = new mod( obj, args[1] || "global" );
		for (var key in obj) {
			addProperty (obj, rtn, key);
		}

		return rtn;

	};

	function mod (from, name) {
		Object.defineProperties(this, {
			_events: {
				value: [],
				writable: true,
				enumerable: false
			},
			__name: {
				value: name,
				writable: true,
				enumerable: false
			},
			__defined: {
				value: [],
				writable: true,
				enumerable: false
			},
			__from: {
				value: from,
				writable: true,
				enumerable: false
			},
			__parent: {
				value: undefined,
				writable: true,
				enumerable: false
			}
		});
		this.on("change", function(proxy, name, value, path) {
			if (this.__parent) {
				this.__parent.trigger("change", proxy, name, value, this.__parent.__name + "." + ((path ? path + "." : path) || "")  + name);
			}
		});
		this.on("add", function(proxy, name, value, path) {
			if (this.__parent) {
				this.__parent.trigger("add", proxy, name, value, this.__parent.__name + "." + ((path ? path + "." : path) || "")  + name)
			}
		})
	};
	_.extend(mod.prototype, Backbone.Events);
	_.extend(mod.prototype, {
		update: function() {
			var modelKeys = Object.keys(this);
			var definedKeys = Object.keys(this.__defined);
			//model to from
			var diff = _.difference(modelKeys, definedKeys);
			for (var i = 0; i < diff.length; i++) {
				if (this[diff[i]] instanceof mod ) {
					this.__from[diff[i]] = this[diff[i]].__from;
				} else {
					this.__from[diff[i]] = this[diff[i]];
				}
				delete this[diff[i]];
				addProperty(this.__from, this, diff[i]);
				this.trigger("add", this, diff[i], this.__from[diff[i]]);
				if (typeof this.__from[diff[i]] == "object") this[diff[i]].update();
			}
			//from to model
			var diff = _.difference(definedKeys, modelKeys);
			for (var i = 0; i < diff.length; i++) {
				addProperty(this.__from, this, diff[i]);
				if (typeof this.__from[diff[i]] == "object") this[diff[i]].update();
			}
		},
		set: function(path, value) {
		    var a = path.split('.');
		    var o = this;
		    for (var i = 0; i < a.length - 1; i++) {
		        var n = a[i];
		        if (n in o) {
		            o = o[n];
		        } else {
		        	var nobj = {};
		            o[n] = new mod(nobj, n);
		            o[n].__parent = o;
		            o.update();
		            o = o[n];
		        }
		    }
		    if (value instanceof mod) value = mod.__from;
		    o[a[a.length - 1]] = value;
		    o.update();
		    return this;
		},
		get: function(path) {
		    var o = this;
		    path = path.replace(/\[(\w+)\]/g, '.$1');
		    path = path.replace(/^\./, '');
		    var a = path.split('.');
		    while (a.length) {
		        var n = a.shift();
		        if (n in o) {
		            o = o[n];
		        } else {
		            return;
		        }
		    }
		    return o;
		}
	})


	function addProperty(object, proxy, name) {
		var childproxycache;
		proxy.__defined[name] = true;
		Object.defineProperty(proxy, name,
			{
				get: function() {
					if (typeof object[name] == "object") {
						if (childproxycache) return childproxycache;
						childproxycache = new mod(object[name], name);
						childproxycache.__parent = proxy;
						return childproxycache;
					} else {
						return object[name]; 
					}
				},
				set: function (value) {
					proxy.trigger("change", proxy, name, value);
					if (typeof value == "object") childproxycache = undefined;
					if (value instanceof mod) value = mod.__from;
					object[name] = value;
					return value;
				},
				enumerable: true
			}
		);
	}



})();