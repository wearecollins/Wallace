window.onload = function(){
	var app = new App();
	app.setup();
}

var App = function(){
	var videoInput;
	var canvasContext;
	var frame = 0;
	var rate = 5;
	var waiting = false;
	var current = null;

	this.setup = function(){
		// setup video
		videoInput = document.createElement("video");
		videoInput.id = "inputVideo";
		videoInput.width = 150;
		videoInput.height = 112;
		document.body.appendChild(videoInput);

		this.canvas = document.createElement("canvas");
		this.canvas.id = "inputCanvas";
		this.canvas.width = 150;
		this.canvas.height = 112;
		document.body.appendChild(this.canvas);
		canvasContext = this.canvas.getContext("2d");


		this.outputCanvas = document.createElement("canvas");
		this.outputCanvas.id = "output";
		this.outputCanvas.width = 150;
		this.outputCanvas.height = 112;
		document.body.appendChild(this.outputCanvas);

		setupVideoInput(videoInput);
		requestAnimationFrame(this.update.bind(this));
	}

	this.update = function(){
		requestAnimationFrame(this.update.bind(this));

		canvasContext.drawImage(videoInput, 0, 0, this.canvas.width, this.canvas.height);
		if ( !waiting && frame == 0 ){
			detectNewImage(this.canvas, true);
		} else if ( !waiting ){
			frame++;
			if ( frame > rate ) frame = 0;
		}

		if ( current != null ){
			canvasContext.lineWidth = 2;
			canvasContext.strokeStyle = 'rgba(230,87,0,0.8)';
			/* draw detected area */
			for (var i = 0; i < current.length; i++) {
				canvasContext.beginPath();
				canvasContext.arc((current[i].x + current[i].width * 0.5), (current[i].y + current[i].height * 0.5),
						(current[i].width + current[i].height) * 0.25 * 1.2, 0, Math.PI * 2);
				canvasContext.stroke();
			}
		}
	}

	/**
	 * Setup getUserMedia on video element
	 * @param  {DivElement} videoElement 
	 */
	function setupVideoInput(videoElement){
		navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
		window.URL = window.URL || window.webkitURL || window.msURL || window.mozURL;
		// check for camerasupport
		if (navigator.getUserMedia) {
			
			// chrome 19 shim
			var videoSelector = {video : true};
			if (window.navigator.appVersion.match(/Chrome\/(.*?) /)) {
				var chromeVersion = parseInt(window.navigator.appVersion.match(/Chrome\/(\d+)\./)[1], 10);
				if (chromeVersion < 20) {
					videoSelector = "video";
				}
			};
			
			// opera shim
			if (window.opera) {
				window.URL = window.URL || {};
				if (!window.URL.createObjectURL) window.URL.createObjectURL = function(obj) {return obj;};
			}
			
			// set up stream
			navigator.getUserMedia(videoSelector, (function( stream ) {
				console.log("camera found");
				this.stream = stream;
				if (videoElement.mozCaptureStream) {
				  videoElement.mozSrcObject = stream;
				} else {
				  videoElement.src = (window.URL && window.URL.createObjectURL(stream)) || stream;
				}
				videoElement.play();
			}).bind(this), function() {
				console.log("no camera");
				//insertAltVideo(videoElement);
				// return false;
			});
		} else {
			console.log("no getUserMedia");
			//if (!insertAltVideo(videoElement)) {
				return false;
			//}
		}

		// resize video when it is playing
		videoElement.addEventListener('playing', function() {
			if(videoElement.width > videoElement.height) {
				videoElement.width = 320;
			} else {
				videoElement.height = 240;
			}
		}, false);

		return true;
	}

	/**
	 * [detectNewImage description]
	 * @param  {[type]} image [description]
	 * @param  {[type]} async [description]
	 * @return {[type]}       [description]
	 * TO-DO: Remove canvas stuff
	 */
	function detectNewImage(image, async) {
		var elapsed_time = (new Date()).getTime();
		var canvas = document.getElementById("output");
		var ctx = canvas.getContext("2d");

		canvas.width = canvas.width;
		canvas.style.width = canvas.width.toString() + "px";
		canvas.height = canvas.height;
		canvas.style.height = canvas.height.toString() + "px";
		//ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
		elapsed_time = (new Date()).getTime();

		var scale = 1.0;

		function post(comp) {
			// console.log( comp.length );
			// document.getElementById("num-faces").innerHTML = comp.length.toString();
			// document.getElementById("detection-time").innerHTML = Math.round((new Date()).getTime() - elapsed_time).toString() + "ms";
			current = comp;
			waiting = false;
		}
		/* call main detect_objects function */
		if (async) {
			ccv.detect_objects({ "canvas" : ccv.grayscale(ccv.pre(image)),
								 "cascade" : cascade,
								 "interval" : 5,
								 "min_neighbors" : 1,
								 "async" : true,
								 "worker" : 1 })(post);
		} else {
			var comp = ccv.detect_objects({ "canvas" : ccv.grayscale(ccv.pre(image)),
											"cascade" : cascade,
											"interval" : 5,
											"min_neighbors" : 1 });
			post(comp);
		}
		waiting = true;
	}
}