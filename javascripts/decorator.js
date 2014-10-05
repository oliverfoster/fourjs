/*TODO: 
* 1. resize / media events from styles have to change relevant calculated decorations
* 2. children must be attached to decoration and updated on change
* 3. decoration change events must propogate to attached children
*/


(function() {


	var DecorationBase = function DecorationBase () {};
	Object.defineProperties(DecorationBase.prototype, {
		on: {
			value: undefined,
			writable: true,
			enumerable: false,
			configurable: true
		},
		once: {
			value: undefined,
			writable: true,
			enumerable: false,
			configurable: true
		},
		off: {
			value: undefined,
			writable: true,
			enumerable: false,
			configurable: true
		},
		trigger: {
			value: undefined,
			writable: true,
			enumerable: false,
			configurable: true
		},
		bind: {
			value: undefined,
			writable: true,
			enumerable: false,
			configurable: true
		},
		unbind: {
			value: undefined,
			writable: true,
			enumerable: false,
			configurable: true
		},
		listenTo: {
			value: undefined,
			writable: true,
			enumerable: false,
			configurable: true
		},
		stopListening: {
			value: undefined,
			writable: true,
			enumerable: false,
			configurable: true
		}
	});
	_.extend(DecorationBase.prototype, Backbone.Events);

	var decorator = window.Decorator = function(styles, properties) {

		Object.defineProperties(this, {
			"__styles": {
				value: styles,
				writable: true,
				enumerable: false,
				configurable: true
			},
			"__calculated": {
				value: {},
				writable: true,
				enumerable: false,
				configurable: true
			},
			"__defaultProperties": {
				value: properties,
				writable: true,
				enumerable: false,
				configurable: true	
			}
		});

	};
	_.extend(decorator.prototype, Backbone.Events);
	_.extend(decorator.prototype, {
		getDecoration: function(object) {
			var applicableStyles = this.__styles.getEffectiveStyles(object);

			//do quick run to check if already calculated
			var ids = [];
			for (var i = 0; i < applicableStyles.length; i++) {

				//calculate style name from chain
				var as = applicableStyles[i];
				var effectiveSelector, selector;
				selector = _.uniq((as._selector).replace(/\, /g,",").split(",")).join(", ");
				
				if (i === 0) effectiveSelector = selector;
				else effectiveSelector = _.uniq((as._selector + "," + ids[i-1]).replace(/\, /g,",").split(",")).join(", ");

				ids.push(effectiveSelector)
				
			}
			ids = _.uniq(ids);
			var heresOneIMadeEarlier = this.__calculated[ ids[ids.length - 1] ];
			if (heresOneIMadeEarlier) {
				//if a decoration object was made earlier use it
				return new heresOneIMadeEarlier.constructor();
			}

			//calculate decoration using any pre-existing objects available
			var f = {};
			
			for (var i = 0; i < applicableStyles.length; i++) {
				
				//calculate style name from chain
				var as = applicableStyles[i];
				var effectiveSelector, selector, styles = [];
				selector = _.uniq((as._selector).replace(/\, /g,",").split(",")).join(", ");
				
				if (i === 0) {
					effectiveSelector = selector;
				} else {
					effectiveSelector = _.uniq((as._selector + "," + f[i].prototype._effectiveSelector).replace(/\, /g,",").split(",")).join(", ");
					styles = styles.concat(f[i].prototype._styles);
				}
				
				var fashion = false;
				if (this.__calculated[effectiveSelector] === undefined) {
					//make a new object as not computed yet
					if (i === 0) {
						//set foundation object of new chain
						f[0] = function Decoration() {};
						f[0].prototype = DecorationBase.prototype;
					}
					styles.push(as._style)
					f[i+1] = function Decoration() {};
					this.__calculated[effectiveSelector] = new f[i]();
					f[i+1].prototype = this.__calculated[effectiveSelector]
					fashion = true;
				} else {
					//object at reference name exists
					//check sources and see if this is a different style and should be added ontop of another with the same name
					var res = _.findWhere(this.__calculated[effectiveSelector]._styles, {_index: as._style._index});
					if (res === undefined) {
						//add new style to chain
						styles.push(as._style)
						f[i+1] = function Decoration() {};
						this.__calculated[effectiveSelector] = new f[i]();
						f[i+1].prototype = this.__calculated[effectiveSelector]
						fashion = true;
					} else {
						//use existing style
						f[i+1] = this.__calculated[effectiveSelector].constructor;
						continue;
					}
				}
				

				if (fashion) {
					//assign properties to new object if required
					Object.defineProperties(f[i+1].prototype, {
						constructor: {
							value: f[i+1],
							writable: true,
							enumerable: false,
							configurable: true
						},
						_local: {
							value: {},
							writable: true,
							enumerable: false,
							configurable: true
						},
						_styles: {
							value: styles,
							writable: true,
							enumerable: false,
							configurable: true
						},
						_effectiveSelector: {
							value: effectiveSelector,
							writable: true,
							enumerable: false,
							configurable: true
						},
						_selector: {
							value: selector,
							writable: true,
							enumerable: false,
							configurable: true
						},
						_definition: {
							value: as,
							writable: true,
							enumerable: false,
							configurable: true
						},
						json: {
							get: function() {
								var rtn = {};
								for (var k in this) {
									rtn[k] = this[k];
								}
								return rtn;
							},
							enumerable: false,
							configurable: true
						}
					});

					//assign attributes to new object if required
					var attrs = as._style._attributes;
					for (var a in attrs) {
						(function (style, attrs, a) {
							var prop = {
								get: function() {
									//allow override of inherited variables
									if (this._local[a] !== undefined) return this._local[a];
									return attrs[a];
								},
								set: function(v) {
									if (this.hasOwnProperty(a)) {
										attrs[a] = v;
									} else {
										//allow override of inherited variables with local copy
										var proto = searchChainForProperty(this, a);
										this._local[a] = v;
										if (v === null) {
											prop.enumerable = false;
											Object.defineProperty(proto, a, prop);
										} else {
											prop.enumerable = true;
											Object.defineProperty(proto, a, prop);
										}
									}
									this.trigger("change");
								},
								enumerable: !(attrs[a] === null),
								configurable: true
							};
							Object.defineProperty(f[i+1].prototype, a, prop);
						})(as._style, as._style._attributes, a);
					}

					//assign defaults if not available and specifed
					//this is so events trigger correctly on setting of values to undefined properties
					if (!this.__defaultProperties) continue;
					//only assign defaults to properties not in the prototype chain
					var configuredProperties = Object.keys(f[i+1].prototype.json);
					var unconfiguredProperties = _.difference( this.__defaultProperties, configuredProperties );

					for (var up = 0; up < unconfiguredProperties.length; up++) {
						var a = unconfiguredProperties[up];
						(function (style, attrs, a) {
							var prop = {
								get: function() {
									//allow override of inherited variables
									if (this._local[a] !== undefined) return this._local[a];
									return attrs[a];
								},
								set: function(v) {
									if (this.hasOwnProperty(a)) {
										attrs[a] = v;
									} else {
										//allow override of inherited variables with local copy
										var proto = searchChainForProperty(this, a);
										this._local[a] = v;
										if (v === null) {
											prop.enumerable = false;
											Object.defineProperty(proto, a, prop);
										} else {
											prop.enumerable = true;
											Object.defineProperty(proto, a, prop);
										}
									}
									this.trigger("change");
								},
								enumerable: false,
								configurable: true
							};
							Object.defineProperty(f[i+1].prototype, a, prop);
						})(as._style, as._style._attributes, a);
					}
				}

			}
			//return new instance of style object
			return new f[applicableStyles.length]();
		},
		attachDecoration: function(object) {
			//
		}
	});

	function searchChainForProperty(obj, prop) {
		if (!obj.hasOwnProperty(prop)) return searchChainForProperty(obj.__proto__, prop);
		return obj;
	}
	
})();