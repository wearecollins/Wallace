//CameraTexture.js
//

var CameraTexture = function(params)
{
	this.texture = undefined;
	this.video = undefined;
	this.initialized= false;
	this.mobile = false;

	this.width = 320;
	this.height = 240;

	this.firefoxBug = false;

	this.onGetUserMedia = function(e){};
	this.onGetUserMediaFail = function(e){console.log( e, "onGetUserMediaFail... no camera!" );}

	for(var i in params)	this[i] = params[i];

	var hasGetUserMedia = (function() {
		return ((navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia) !== undefined);
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
	if (this.video && this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
		this.texture.needsUpdate = true;
	}
}

CameraTexture.prototype.init = function()
{
	//make it cross browser
	window.URL = window.URL || window.webkitURL;

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

	}).bind(this),
	function(e){
		this.onGetUserMediaFail(e)
	}.bind(this)
	);
}


CameraTexture.prototype.getData = function()
{
	if(this.initialized && !this.firefoxBug)
	{

		//FIREFOX BUG!!!! what a shit show
		//http://stackoverflow.com/a/18580878/4589264
		try{
			this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
			return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
		} 
		catch(e){
			if (e.name == "NS_ERROR_NOT_AVAILABLE") {
				this.firefoxBug = true
			// Wait a bit before trying again; you may wish to change the
			// length of this delay.
			setTimeout(function(){this.firefoxBug = false;}.bind(this), 100);
			} 
			else {
				throw e;
			}
			return [];
		}

	}

	return [];
}



