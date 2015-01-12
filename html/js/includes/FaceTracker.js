var FaceTracker = FaceTracker || function(){};

FaceTracker.prototype.setup = function(webcam) 
{
	this.leftEye = new THREE.Vector3(.45, .45, 0);
	this.rightEye = new THREE.Vector3(.55, .45, 0);
	this.nose = new THREE.Vector2(.5, .5);
	this.positionSmoothing = .9;
	this._rawNose = new THREE.Vector2(.5, .5);
	this._noseMap = new THREE.Vector2(0.0,1.0);

	this.canvas = document.createElement('canvas');
	this.context = this.canvas.getContext('2d');

	function startVideo() 
	{
		console.log("hllow");
		// start tracking
		this.tracker.start(this.videoElement);
		// this.tracker.hackedStart(videoElement);
		
		// start loop to draw face
		// this.draw();
		// 
		this.bStarted = true;
	}

	this.bStarted = false;
	this.tracker = new clm.tracker({useWebGL : true});
	this.tracker.init(pModel);

	// assumes webcam is already set up!
	this.videoElement = webcam.getVideoElement();
	this.videoElement.addEventListener('canplay', startVideo.bind(this), false);

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
	
	var positions = this.tracker.getCurrentPosition();
	//if it's psossible to not calc the mouth we might save a few fps


	if (positions)
	{
		// 0-14 are chin
		// 15-22 are eyebrows
		// 23-26 are main left eye
		// 27 is center left eye
		var _leftEye = new THREE.Vector3();
		var _rightEye = new THREE.Vector3();
		var _nose = new THREE.Vector3();
		
		_leftEye.x = 1.0 - positions[27][0]/this.videoElement.width;
		_leftEye.y = 1.0 - positions[27][1]/this.videoElement.height;

		// 28-31 are main right eye
		// 32 is center right eye
		_rightEye.x = 1.0 - positions[32][0]/this.videoElement.width;
		_rightEye.y = 1.0 - positions[32][1]/this.videoElement.height;
		
		// 33-43 are main nose points (37 is bottom center)
		_nose.x = 1.0 - positions[35][0]/this.videoElement.width;
		_nose.y = THREE.Math.mapLinear(positions[33][1]/this.videoElement.height, this._noseMap.x, this._noseMap.y, 1.0, 0.0);

		this.leftEye.lerp(_leftEye, this.positionSmoothing);
		this.rightEye.lerp(_rightEye, this.positionSmoothing);
		this.nose.lerp(_nose, this.positionSmoothing);
	}
}

FaceTracker.prototype.draw = function() {
	// requestAnimFrame(this.draw.bind(this));
	this.context.clearRect(0, 0, this.videoElement.width, this.canvas.width);

	if (this.tracker.getCurrentPosition()) 
	{
		this.tracker.draw(this.canvas);
	}

	//var cp = this.tracker.getCurrentParameters();
};

// FaceTracker.prototype.update = function() {
// 	// plz override me
// };

