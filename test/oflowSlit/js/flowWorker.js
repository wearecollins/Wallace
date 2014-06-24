importScripts("oflow.js");
self.calculator = new oflow.FlowCalculator(8);

self.addEventListener('message', function(e) {

	var current = e.data.current;
	var last 	= e.data.last;
	var width 	= e.data.width;
	var height 	= e.data.height;
	var zones = self.calculator.calculate(last, current, width, height);

  	self.postMessage( {direction:zones});
}, false);