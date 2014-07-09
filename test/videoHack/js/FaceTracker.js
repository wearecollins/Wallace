var FaceTracker = FaceTracker || function(){};

FaceTracker.prototype.setup = function(div, canvas) 
{
	// build video element
	var parentDiv = null;
	// if ( div != null ){
	// 	parentDiv = div;
	// } else {
		parentDiv = document.createElement("cameraParent");
		document.body.appendChild(parentDiv);
	// }
	var videoElement = document.createElement("video");
	videoElement.id = "videoEl";
	videoElement.width = 300;
	videoElement.height = 225;

	//TODO: make this scaling work for other browsers
	videoElement.style.webkitTransform = "scaleX(-1)";

	parentDiv.appendChild(videoElement);

	if ( canvas != null ){
		this.canvas = canvas;
	} else {
		this.canvas = document.createElement("canvas");
		this.canvas.id 		= "faceCanvas";
		this.canvas.width 	= videoElement.width;
		this.canvas.height 	= videoElement.height;
		this.canvas.style.position 	= "absolute";
		this.canvas.style.left 		= "0px";
		this.canvas.style.top 		= "0px";

		//TODO: make this scaling work for other browsers
		this.canvas.style.webkitTransform = "scaleX(-1)";

		parentDiv.appendChild(this.canvas);
	}

	this.context = this.canvas.getContext('2d');

	navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
	window.URL = window.URL || window.webkitURL || window.msURL || window.mozURL;

	// check for camerasupport
	if (navigator.getUserMedia) 
	{
		// set up stream
		var videoSelector = {video : true};
		if (window.navigator.appVersion.match(/Chrome\/(.*?) /)) {
			var chromeVersion = parseInt(window.navigator.appVersion.match(/Chrome\/(\d+)\./)[1], 10);
			if (chromeVersion < 20) {
				videoSelector = "video";
			}
		};
	
		var getMediaSucceeded = false;

		navigator.getUserMedia(videoSelector, function( stream ) {
			if (videoElement.mozCaptureStream) {
				videoElement.mozSrcObject = stream;
			} else {
				videoElement.src = (window.URL && window.URL.createObjectURL(stream)) || stream;
			}
			videoElement.play();
			getMediaSucceeded = true;
		}, function() {
			//insertAltVideo(vid);
			alert("There was some problem trying to fetch video from your webcam. If you have a webcam, please make sure to accept when the browser asks for access to your webcam.");
			getMediaSucceeded = false;
		});
	} else {
		//insertAltVideo(vid);
		alert("This demo depends on getUserMedia, which your browser does not seem to support. :(");
		return;
	}

	function startVideo() 
	{

		// start video
		videoElement.play();

		// start tracking
		this.tracker.start(videoElement);
		// this.tracker.hackedStart(videoElement);
		
		// start loop to draw face
		// this.draw();
		// 
		this.bStarted = true;
	}

	this.bStarted = false;
	this.tracker = new clm.tracker({useWebGL : true});
	this.tracker.init(pModel);
	videoElement.addEventListener('canplay', startVideo.bind(this), false);

	//LB: 	this was getting called twice, oncwe here and once after the 'canplay' event
	// 		and I think it was resulting in to trackers going,
	// 		or for whatever reason my fps doubled when I commented this out
	//
	//
	// this.tracker.start(videoElement);
	// // start loop to draw face
	// this.draw();
};

FaceTracker.prototype.update = function() 
{
	// if(this.bStarted)
	// {
	// 	var bLost = false;
	// 	for(var i=0 ; i<10; i++)
	// 	{
	// 		var tracking = this.tracker.hackedupdate();
	// 		if(tracking)
	// 		{
	// 			break;
	// 		}
	// 		else
	// 		{
	// 			bLost = true;
	// 		}
	// 	}

	// 	if(bLost)
	// 	{
	// 		//what do we do?
	// 		console.log( "not tracking!" );
	// 	}
	// }
}

FaceTracker.prototype.draw = function() {
	// requestAnimFrame(this.draw.bind(this));
	this.context.clearRect(0, 0, this.canvas.width, this.canvas.width);

	if (this.tracker.getCurrentPosition()) 
	{
		this.tracker.draw(this.canvas);
	}

	//var cp = this.tracker.getCurrentParameters();
};

// FaceTracker.prototype.update = function() {
// 	// plz override me
// };

