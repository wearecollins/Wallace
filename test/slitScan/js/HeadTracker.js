// HeadTracker.js

var HeadTracker = function(params)
{
	params = params || {};

		//HEAD TRACKING
	this.parentDiv = null;
	this.parentDiv = document.createElement("cameraParent");
	document.body.appendChild(this.parentDiv);

	this.videoInput = document.createElement("video");
	this.videoInput.id = "inputVideo";
	this.videoInput.width = 300;
	this.videoInput.height = 225;
	this.parentDiv.appendChild(this.videoInput);

	this.canvasInput = document.createElement("canvas");
	this.canvasInput.id 		= "inputCanvas";
	this.canvasInput.width 	= this.videoInput.width;
	this.canvasInput.height 	= this.videoInput.height;
	this.canvasInput.style.position 	= "absolute";
	this.canvasInput.style.left 		= "0px";
	this.canvasInput.style.top 		= "0px";
	this.canvasInput.style.webkitTransform = "scaleX(-1)";
	this.parentDiv.appendChild(this.canvasInput);

	this.canvasOverlay = document.createElement('canvas');
	this.canvasOverlay.id = "this.canvasOverlay";
	this.canvasOverlay.width 	= this.videoInput.width;
	this.canvasOverlay.height 	= this.videoInput.height;
	this.canvasOverlay.style.position 	= "absolute";
	this.canvasOverlay.style.left 		= "0px";
	this.canvasOverlay.style.top 		= "0px";
	this.canvasOverlay.style.position = "absolute";
	this.canvasOverlay.style.top = "0px";
	this.canvasOverlay.style.zIndex = "100001";
	this.canvasOverlay.style.display = "block";
	this.canvasOverlay.style.webkitTransform = "scaleX(-1)";
	this.parentDiv.appendChild(this.canvasOverlay);

	this.overlayContext = this.canvasOverlay.getContext('2d');
	this.htracker = new headtrackr.Tracker();

	this.nose = new THREE.Vector2();
}

HeadTracker.prototype.setup = function()
{
	//HEAD tracking
	this.htracker.init(this.videoInput, this.canvasInput);
	console.log( this.htracker.status );
	this.htracker.start();

	document.addEventListener("facetrackingEvent", function( event )
	{
		// once we have stable tracking, draw rectangle
		if (event.detection == "CS") 
		{
			// clear canvas
			this.overlayContext.clearRect(0,0,320,240);

			this.nose.x = 1. - event.x / this.videoInput.width;
			this.nose.y = (event.y - event.height * .1) / this.videoInput.height;

			this.overlayContext.translate(event.x, event.y)
			this.overlayContext.rotate(event.angle-(Math.PI/2));
			this.overlayContext.strokeStyle = "#00CC00";
			this.overlayContext.strokeRect((-(event.width/2)) >> 0, (-(event.height/2)) >> 0, event.width, event.height);
			this.overlayContext.rotate((Math.PI/2)-event.angle);
			this.overlayContext.translate(-event.x, -event.y);
		}
	}.bind(this));
}