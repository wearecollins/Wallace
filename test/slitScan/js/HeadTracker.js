
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

	this.htracker = new headtrackr.Tracker({
		altVideo : {ogv : "./media/capture5.ogv", mp4 : "./media/capture5.mp4"},
		calcAngles : true,
		ui : false,
		headPosition : false,
		debug : this.debugOverlay
	});
	this.htracker.init(this.videoInput, this.canvasInput);
	this.htracker.start();
}


HeadTracker.prototype.getStatus = function()
{
	return this.htracker.status;
}		