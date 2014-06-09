
var HeadTracker = HeadTracker || function(){};

HeadTracker.prototype.setup = function(div, canvas) 
{
	var vidWidth = 300;
	var vidHeight = 240;

	// build video element
	var parentDiv = null;
	if ( div != null ){
		parentDiv = div;
	} else {
		parentDiv = document.createElement("cameraParent");
		document.body.appendChild(parentDiv);
	}
	var videoInput = document.createElement("video");
	videoInput.id = "videoEl";
	videoInput.width = vidWidth;
	videoInput.height = vidHeight;

	this.canvasInput = document.createElement('compare');
	this.canvasInput.id = "compare";
	this.canvasInput.width = vidWidth;
	this.canvasInput.height = vidHeight;

	this.canvasOverlay = document.createElement('overlay')
	this.canvasOverlay.width = vidWidth;
	this.canvasOverlay.height = vidHeight;

	this.debugOverlay = document.createElement('debug');
	this.debugOverlay.width = vidWidth;
	this.debugOverlay.height = vidHeight;

	// this.overlayContext = this.canvasOverlay.getContext('2d');

	this.canvasOverlay.style.position = "absolute";
	this.canvasOverlay.style.top = '0px';
	this.canvasOverlay.style.zIndex = '100001';
	this.canvasOverlay.style.display = 'block';

	this.debugOverlay.style.position = "absolute";
	this.debugOverlay.style.top = '0px';
	this.debugOverlay.style.zIndex = '100002';
	this.debugOverlay.style.display = 'none';

	this.statusMessages = {
		"whitebalance" : "checking for stability of camera whitebalance",
		"detecting" : "Detecting face",
		"hints" : "Hmm. Detecting the face is taking a long time",
		"redetecting" : "Lost track of face, redetecting",
		"lost" : "Lost track of face",
		"found" : "Tracking face"
	};
	
	this.supportMessages = {
		"no getUserMedia" : "Unfortunately, <a href='http://dev.w3.org/2011/webrtc/editor/getusermedia.html'>getUserMedia</a> is not supported in your browser. Try <a href='http://www.opera.com/browser/'>downloading Opera 12</a> or <a href='http://caniuse.com/stream'>another browser that supports getUserMedia</a>. Now using fallback video for facedetection.",
		"no camera" : "No camera found. Using fallback video for facedetection."
	};

			
	// document.addEventListener("headtrackrStatus", function(event) {
	// 	// if (event.status in this.supportMessages) {
	// 	// 	// var messagep = document.getElementById('gUMMessage');
	// 	// 	// messagep.innerHTML = this.supportMessages[event.status];
	// 	// } else if (event.status in this.statusMessages) {
	// 	// 	// var messagep = document.getElementById('headtrackerMessage');
	// 	// 	// messagep.innerHTML = this.statusMessages[event.status];
	// 	// }
	// }, true);

	this.htracker = new headtrackr.Tracker({
		altVideo : {ogv : "./media/capture5.ogv", mp4 : "./media/capture5.mp4"},
		calcAngles : true,
		ui : false,
		headPosition : false,
		debug : this.debugOverlay
	});
	this.htracker.init(this.videoInput, this.canvasInput);
	this.htracker.start();

	// document.addEventListener("facetrackingEvent", function( event ) {
	// 	// clear canvas
	// 	this.overlayContext.clearRect(0,0,320,240);
	// 	// once we have stable tracking, draw rectangle
	// 	if (event.detection == "CS") {
	// 		this.overlayContext.translate(event.x, event.y)
	// 		this.overlayContext.rotate(event.angle-(Math.PI/2));
	// 		this.overlayContext.strokeStyle = "#00CC00";
	// 		this.overlayContext.strokeRect((-(event.width/2)) >> 0, (-(event.height/2)) >> 0, event.width, event.height);
	// 		this.overlayContext.rotate((Math.PI/2)-event.angle);
	// 		this.overlayContext.translate(-event.x, -event.y);
	// 	}
	// });
	
/*	
<body>
		<script src="./js/headtrackr.js"></script>
		
		<canvas id="compare" width="320" height="240" style="display:none"></canvas>
		<video id="vid" autoplay="" loop="" width="320" height="240" src="blob:http%3A//auduno.github.io/89dd7069-954c-4f0f-afcf-122a3792af10"></video>
		<canvas id="overlay" width="320" height="240" style="position: absolute; top: 0px; z-index: 100001; display: block;"></canvas>
		<canvas id="debug" width="320" height="240" style="position: absolute; top: 0px; z-index: 100002; display: block;"></canvas>
		
		<p id="gUMMessage"></p>
		<p>Status : <span id="headtrackerMessage">Tracking face</span></p>
		<p><input type="button" onclick="htracker.stop();htracker.start();" value="reinitiate facedetection">
		<br><br>
		<input type="checkbox" onclick="showProbabilityCanvas()" value="asdfasd">Show probability-map</p>
		
		<script>
		  // set up video and canvas elements needed
		
			var videoInput = document.getElementById('vid');
			var canvasInput = document.getElementById('compare');
			var canvasOverlay = document.getElementById('overlay')
			var debugOverlay = document.getElementById('debug');
			var overlayContext = canvasOverlay.getContext('2d');
			canvasOverlay.style.position = "absolute";
			canvasOverlay.style.top = '0px';
			canvasOverlay.style.zIndex = '100001';
			canvasOverlay.style.display = 'block';
			debugOverlay.style.position = "absolute";
			debugOverlay.style.top = '0px';
			debugOverlay.style.zIndex = '100002';
			debugOverlay.style.display = 'none';
			
			// add some custom messaging
			
			statusMessages = {
				"whitebalance" : "checking for stability of camera whitebalance",
				"detecting" : "Detecting face",
				"hints" : "Hmm. Detecting the face is taking a long time",
				"redetecting" : "Lost track of face, redetecting",
				"lost" : "Lost track of face",
				"found" : "Tracking face"
			};
			
			supportMessages = {
				"no getUserMedia" : "Unfortunately, <a href='http://dev.w3.org/2011/webrtc/editor/getusermedia.html'>getUserMedia</a> is not supported in your browser. Try <a href='http://www.opera.com/browser/'>downloading Opera 12</a> or <a href='http://caniuse.com/stream'>another browser that supports getUserMedia</a>. Now using fallback video for facedetection.",
				"no camera" : "No camera found. Using fallback video for facedetection."
			};
			
			document.addEventListener("headtrackrStatus", function(event) {
				if (event.status in supportMessages) {
					var messagep = document.getElementById('gUMMessage');
					messagep.innerHTML = supportMessages[event.status];
				} else if (event.status in statusMessages) {
					var messagep = document.getElementById('headtrackerMessage');
					messagep.innerHTML = statusMessages[event.status];
				}
			}, true);
			
			// the face tracking setup
			
			var htracker = new headtrackr.Tracker({altVideo : {ogv : "./media/capture5.ogv", mp4 : "./media/capture5.mp4"}, calcAngles : true, ui : false, headPosition : false, debug : debugOverlay});
			htracker.init(videoInput, canvasInput);
			htracker.start();
			
			// for each facetracking event received draw rectangle around tracked face on canvas
			
			document.addEventListener("facetrackingEvent", function( event ) {
				// clear canvas
				overlayContext.clearRect(0,0,320,240);
				// once we have stable tracking, draw rectangle
				if (event.detection == "CS") {
					overlayContext.translate(event.x, event.y)
					overlayContext.rotate(event.angle-(Math.PI/2));
					overlayContext.strokeStyle = "#00CC00";
					overlayContext.strokeRect((-(event.width/2)) >> 0, (-(event.height/2)) >> 0, event.width, event.height);
					overlayContext.rotate((Math.PI/2)-event.angle);
					overlayContext.translate(-event.x, -event.y);
				}
			});
			
			// turn off or on the canvas showing probability
			function showProbabilityCanvas() {
				var debugCanvas = document.getElementById('debug');
				if (debugCanvas.style.display == 'none') {
					debugCanvas.style.display = 'block';
				} else {
					debugCanvas.style.display = 'none';
				}
			}
		</script>
	

</body>
*/
}
		