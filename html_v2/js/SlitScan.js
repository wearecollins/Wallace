// SlitScan.js

var SlitScan = function( params )
{
	this.width = params.width || 320;
	this.height = params.height || 240;
	this.depth = params.depth || 180;

	var renderer = params.renderer;
	var avgDelta = params.delta || new THREE.Vector3(0,0,0);

	var pixels = [];
	
	var dimX = this.width, dimY = this.height;

	//RENDERERER & CONTEXT
	if(renderer === undefined){
		console.error("SLIT: we need to pass in a renderer!");
		return;
	}
	var gl = renderer.getContext();

	//CAMERA
	var dimCamera = new THREE.OrthographicCamera( -.5 * dimX, .5 * dimX, -.5 * dimY, .5 * dimY, -1000, 1000 );;//new THREE.PerspectiveCamera( 60, aspect, 1, 1000 );

	//SCENE AND MESH
	var scene = new THREE.Scene();

	var tempPixels = [255,255,255,255];
	var tempTexture = new THREE.DataTexture( new Uint8Array(tempPixels), 1, 1, THREE.RGBAFormat);
	tempTexture.minFilter = THREE.NearestFilter;
	tempTexture.needsUpdate = true;

	var vidMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(dimX, dimY), new VideoMaterial( {
		color: 0xFFFFFF,
		side: 2,
		map: tempTexture,
	} ) );
	vidMesh.visible = true;
	vidMesh.position = -10;
	scene.add(vidMesh);	

	var webcamMesh = new THREE.Mesh( vidMesh.geometry, new BackgroundWebcamMaterial({
		map: tempTexture
	}));
	webcamMesh.visible = false;
	scene.add( webcamMesh );

	//SLIT SCAN
	for(var i=0; i<dimY; i++)
	{
		for (var j = 0; j < dimX; j++) 
		{
			pixels.push(255 * j / dimX);
			pixels.push(255 * i / dimY);
			pixels.push(255);
			pixels.push(0);
		};
	}

	var depthSampleScale = 1;
	var pixelStackSize = this.depth;
	var pixelStack = [];
	for(var i=0; i<pixelStackSize; i++)
	{
		pixelStack[i] = new Uint8Array(pixels);
	}

	var dataTexture = new THREE.DataTexture( new Uint8Array(pixels), dimX, dimY, THREE.RGBAFormat);
	dataTexture.minFilter = THREE.LinearFilter;
	dataTexture.generateMipmaps = false;
	dataTexture.needsUpdate = true;

	//RENDER TARGET
	var renderTarget = new THREE.WebGLRenderTarget( dimX, dimY );//, {format: dataTexture.format} );
	renderTarget.generateMipmaps = false;

	//DISTORTION TEXTURES
	var canvas = document.createElement('canvas');
	canvas.id     = "distortionCanvas";
	canvas.width  = dimX;
	canvas.height = dimY;
	canvasContext = canvas.getContext('2d');

	var distortionData = [];


	function imageToSlitData( imagePath, data, context, dimX, dimY )
	{
		bDistortionLoaded = false;

		var tempTex = THREE.ImageUtils.loadTexture (imagePath, undefined, function(e){
			context.drawImage(tempTex.image, 0, 0, dimX, dimY);
			var rgbData = context.getImageData(0, 0,dimX, dimY).data;

			var index = 0;
			for (var i = 0; i < rgbData.length; i = i + 4) {
				data[index] = rgbData[i] / 255;
				index++;
			};

			bDistortionLoaded = true;
			tempTex.dispose();
		});
	}

	imageToSlitData("images/hr_noise.png", distortionData, canvasContext, dimX, dimY);


	function sampleDepth(x, y)
	{
		return Math.max(0, Math.floor(distortionData[(y * dimX + x) ] * (pixelStackSize - 1) * depthSampleScale ) );
	}


	function read(x, y, width, height) 
	{
		// move back to front
		pixelStack.unshift(pixelStack.pop());

		gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixelStack[0]);
		dataTexture.needsUpdate = true;
	}

	function update()
	{
		if(!bDistortionLoaded)	return;

		//
		draw()

		//SLIT
		var data = dataTexture.image.data;
		var depthIndex = 0;
		for(var i=0; i<dimY; i++)
		{
			for (var j = 0; j < dimX; j++) 
			{
				var index = (i*dimX +j) * 4;
				depthIndex = sampleDepth(j, i);

				data[index] = pixelStack[depthIndex][index + 0]; // 255 * depthIndex / pixelStackSize;//
				data[index + 1] = pixelStack[depthIndex][index + 1];
				data[index + 2] = pixelStack[depthIndex][index + 2];
				data[index + 3] = pixelStack[depthIndex][index + 3];
			}
		}
		dataTexture.needsUpdate = true;
	}

	function draw()
	{
		//draw video to render target and push the pixels into the slit
		renderer.render(scene, dimCamera, renderTarget, true);
		read(0, 0, dimX, dimY);
	}

	function setTexture(map)
	{
		vidMesh.material.uniforms.map.value = map;
		vidMesh.material.needsUpdate = true;
	}

	function setDepthSampleScale( val )
	{
		depthSampleScale = val;
	}


	return {
		texture: dataTexture,
		delta: avgDelta,
		renderTarget: renderTarget,
		width: this.width,
		height: this.height,
		update: update,
		draw: draw,
		setTexture: setTexture,
		camera: dimCamera,
		scene: scene,
		videoMesh: vidMesh,
		setDepthSampleScale: setDepthSampleScale,
		webcamMesh: webcamMesh
	}
}

