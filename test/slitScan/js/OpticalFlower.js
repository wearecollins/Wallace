// OpticalFlower.js

var OpticalFlower = function(params)
{
	params = params || {};
	this.cameraTexture = undefined;

	this.width = params.width || 640;
	this.height = params.height || 480;

    this.pixels = new Uint8Array(this.width * this.height * 4);

    this.canvas = document.createElement( 'canvas' );
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.context = this.canvas.getContext( '2d' );

	var hasGetUserMedia = (function() {
		return !!(navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
	})();

	if (!hasGetUserMedia) {
		console.log( "This demo requires webcam support " );
	}  else {
		console.log( "Please allow camera access." );
		this.init();
	}

	//camera input
	var minFilter = THREE.LinearFilter; //THREE.NearestFilter;
	var magFilter = THREE.LinearFilter; //THREE.NearestFilter;
	this.ping = new THREE.WebGLRenderTarget( this.width, this.height, { minFilter: minFilter, magFilter: magFilter, format: THREE.RGBFormat, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping } );
	this.pong = new THREE.WebGLRenderTarget( this.width, this.height, { minFilter: minFilter, magFilter: magFilter, format: THREE.RGBFormat, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping } );
	this.diffRT = new THREE.WebGLRenderTarget( this.width, this.height, { minFilter: minFilter, magFilter: magFilter, format: THREE.RGBAFormat, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping } );


	this.inputPlane = new THREE.Mesh( new THREE.PlaneGeometry( 2, 2, 12, 7 ), new BlurMotionShader({
		map: this.cameraTexture,
		previousMap: this.ping,
		decay: .9
	}));
	this.inputScene = new THREE.Scene();
	this.inputScene.add(this.inputPlane);

	//differncing
	this.diffPlane = new THREE.Mesh( new THREE.PlaneGeometry( 2, 2, 12, 7 ), new DiffShader({
		map: this.cameraTexture,
		camera: this.cameraTexture}));
	this.diffScene = new THREE.Scene();
	this.diffScene.add(this.diffPlane);

	this.texture = this.diffRT;


	this.minMovement = 20;
	this.flowSmooothing = .95;
	this.nose = new THREE.Vector2( .5, .5 );
}

OpticalFlower.prototype.addToGui = function(gui)
{
	var folder = gui.addFolder("OpticalFlow");

	folder.addFolder("diffThreshold").add(this.diffPlane.material.uniforms.threshold, "value", .001, .2);
	folder.addFolder("persistance").add(this.inputPlane.material.uniforms.decay, "value", .01, .999);

	folder.add(this, "minMovement", 1, 300).step(1);
	folder.add(this, "flowSmooothing", 0., 1.).step(.01);
}

OpticalFlower.prototype.getData = function()
{
	return this.pixels;
}


OpticalFlower.prototype.update = function()
{
	if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
		this.cameraTexture.needsUpdate = true;

		var data = this.getData();
		var averagePos = new THREE.Vector2();
		var i=0, pCount = 0;

		for(var y=0; y<this.height; y++)
		{
			for(var x=0; x<this.width; x++)
			{
				if(data[i] > 0 )
				{
					averagePos.x += x;
					averagePos.y += y;
					pCount++;
				}
				i+=4;
			}
		}

		if(pCount>this.minMovement)
		{
			averagePos.divideScalar(pCount);	
			averagePos.x /= this.width;
			averagePos.y /= this.height;	

			averagePos.x = 1. - averagePos.x;
			// averagePos.y = 1. - averagePos.y;


			this.nose.x = this.nose.x * this.flowSmooothing + averagePos.x * (1. - this.flowSmooothing);
			this.nose.y = this.nose.y * this.flowSmooothing + averagePos.y * (1. - this.flowSmooothing);
		}
	}
}

OpticalFlower.prototype.draw = function( renderer, camera )
{
	//ping pong render textures
	var swapper = this.ping;
	this.ping = this.pong;
	this.pong = swapper;

	this.inputPlane.material.uniforms.previousMap.value = this.ping;	
	renderer.render( this.inputScene, camera, this.ping, false );

	//differencing
	this.diffPlane.material.uniforms.camera.value = this.cameraTexture;	
	this.diffPlane.material.uniforms.background.value = this.ping;	
	renderer.render( this.diffScene, camera, this.diffRT, false );

	//TODO: this is such a slow call!! how can we get around the gl.readPixels?
	var gl = renderer.getContext();
	gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, this.pixels);

	this.texture = this.diffRT;
}

OpticalFlower.prototype.init = function()
{
		//init webcam texture
	this.video = document.createElement('video');
	// this.video.width = this.width;
	// this.video.height = this.height;

	this.video.autoplay = true;
	this.video.loop = true;


	//make it cross browser
	window.URL = window.URL || window.webkitURL;
	navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

	// set up stream
	navigator.getUserMedia({video : true}, (function( stream ) {
		console.log( "camera found" );
		this.stream = stream;
		if (this.video.mozCaptureStream) {
		  this.video.mozSrcObject = stream;
		} else {
		  this.video.src = (window.URL && window.URL.createObjectURL(stream)) || stream;
		}
		this.video.play();
	}).bind(this), function() {
		console.log( "no camera" );
		//insertAltVideo(video);
	});

	this.cameraTexture = new THREE.Texture(this.video);
}