//CameraTexture.js
//

var CameraTexture = function(params)
{
	this.texture = undefined;
	this.video = undefined;
	this.initialized= false;

	this.width = 320;
	this.height = 240;

	this.onGetUserMedia = function(e){};

	for(var i in params)	this[i] = params[i];

	var hasGetUserMedia = (function() {
		return !!(navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
	})();

	if (!hasGetUserMedia) {
		console.log( "This demo requires webcam support " );
	}  else {
		console.log( "Please allow camera access." );
		this.init();
	}
}

CameraTexture.prototype.update = function()
{
	if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
		this.texture.needsUpdate = true;
	}
}

CameraTexture.prototype.init = function()
{
	//init webcam texture
	this.video = document.createElement('video');
	this.video.autoplay = true;
	this.video.loop = true;

	//make it cross browser
	window.URL = window.URL || window.webkitURL;
	navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

	// set up stream
	navigator.getUserMedia({video : true}, (function( stream ) 
	{
		this.texture = new THREE.Texture(this.video);
		this.texture.minFilter = THREE.LinearFilter;

		if (this.video.mozCaptureStream) {
		  this.video.mozSrcObject = stream;
		} else {
		  this.video.src = (window.URL && window.URL.createObjectURL(stream)) || stream;
		}
		this.video.play();
        this.video.setAttribute('width', this.width);
        this.video.setAttribute('height', this.height);

		var canvas = document.createElement('canvas');
		canvas.id     = "webcamCanvas";
		canvas.width  = this.video.width;
		canvas.height = this.video.height;
		this.canvas = canvas;
		this.ctx = canvas.getContext('2d');

		this.initialized = true;

		this.onGetUserMedia(this.texture);

	}).bind(this), function() {
		console.log( "no camera" );
		//insertAltVideo(video);
	});
}


CameraTexture.prototype.getData = function()
{
	if(this.initialized)
	{
		this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
		return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;	
	}

	return [];
}



