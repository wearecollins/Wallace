// OpticalFlower.js

var OpticalFlower = function(params)
{
	params = params || {};
	this.cameraTexture = undefined;

	this.width = params.width || 64;
	this.height = params.height || 48;

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
	var minFilter = THREE.NearestFilter;
	var magFilter = THREE.NearestFilter;
	this.ping = new THREE.WebGLRenderTarget( this.width, this.height, { minFilter: minFilter, magFilter: magFilter, format: THREE.RGBFormat, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping } );
	this.pong = new THREE.WebGLRenderTarget( this.width, this.height, { minFilter: minFilter, magFilter: magFilter, format: THREE.RGBFormat, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping } );
	this.diffRT = new THREE.WebGLRenderTarget( this.width, this.height, { minFilter: minFilter, magFilter: magFilter, format: THREE.RGBAFormat, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping } );


	this.inputPlane = new THREE.Mesh( new THREE.PlaneGeometry( 2, 2, 12, 7 ), new BlurMotionShader({map: this.cameraTexture, previousMap: this.ping}));
	this.inputScene = new THREE.Scene();
	this.inputScene.add(this.inputPlane);

	//differncing
	this.diffPlane = new THREE.Mesh( new THREE.PlaneGeometry( 2, 2, 12, 7 ), new DiffShader({
		map: this.cameraTexture,
		camera: this.cameraTexture}));
	this.diffScene = new THREE.Scene();
	this.diffScene.add(this.diffPlane);

	this.texture = this.diffRT;
}

OpticalFlower.prototype.addToGui = function(gui)
{
	var folder = gui.addFolder("OpticalFlow");
}

OpticalFlower.prototype.getData = function()
{
	return this.pixels;
}


OpticalFlower.prototype.update = function()
{
	if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
		this.cameraTexture.needsUpdate = true;
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