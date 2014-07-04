//TODO: 
//3 at once
//
//vingette
//
//video position
//
//fails get user media what then? mouse? auto pilot?
//
//finess tracking
//
//blendmap
//
//move bg video to div


var app;

$(window).bind("load", function() {
	var debug = getQuerystring('debug') == "true";
	var useStats = getQuerystring('useStats') == "true";
	var muteVideo = getQuerystring('mute') == "true";
	var auto = getQuerystring('auto') == "true";
	app = new APP(useStats, debug, muteVideo, auto );
});

var AzealiaVideoObject = function(params, useWebGL)
{
	this.video = params.video;
	if ( useWebGL ) this.texture = new THREE.Texture( this.video );
	this.name = params.name || "blank";
	
	if ( useWebGL ) this.texture.minFilter = THREE.LinearFilter;
	if ( useWebGL ) this.texture.magFilter = THREE.LinearFilter;
	if ( useWebGL ) this.texture.format = THREE.RGBFormat;
	if ( useWebGL ) this.texture.generateMipmaps = false;
	if ( useWebGL ) this.texture.needsUpdate = false;	//

	this.bIsActive = params.bIsActive || false;

	this.dir = params.dir || new THREE.Vector2( 0, 0 );
}

AzealiaVideoObject.prototype.pause = function()
{
	//TODO
}

AzealiaVideoObject.prototype.play = function(position)
{
	//TODO
}


function APP( _useStats, _debug, _muteVideo, _auto)
{
	var muteVideo = _muteVideo || false;
	var auto = _auto || false;

	//main container
	var container = document.createElement( 'div' );

	container.style.position = 'absolute';
	container.style.left = '0px';
	container.style.top = '0px';
	document.body.appendChild( container );


	
	//video
	/*
			   up
		/				\
	left -- straight -- right
		\				/
			  down


	00_ALPHA_STRAIGHT_01.mp4
	01_ALPHA_STRAIGHT_02.mp4
	02_ALPHA_STRAIGHT_03.mp4
	03_ALPHA_UP.mp4.mp4
	04_ALPHA_DOWN.mp4
	05_ALPHA_LEFT.mp4
	06_ALPHA_RIGHT.mp4
	07_ALPHA_UPPER_LEFT.mp4
	08_ALPHA_UPPER_RIGHT.mp4
	09_ALPHA_WEIRD_01.mp4
	 */

	var videoFiles = {
		"BackgroundVideo": {path: "../WALLACE_TESTS/BG_PREVIEW_05_1.mp4"},
		"straightOn": {path: 	"../WALLACE_TESTS/02_ALPHA_STRAIGHT_03.mp4"},
		"up": {path: "../WALLACE_TESTS/03_ALPHA_UP.mp4.mp4"},
		"down": {path: "../WALLACE_TESTS/04_ALPHA_DOWN.mp4"},
		"left": {path: "../WALLACE_TESTS/07_ALPHA_UPPER_LEFT.mp4"},
		"right": {path: "../WALLACE_TESTS/08_ALPHA_UPPER_RIGHT.mp4"},
		"tiltLeft": {path: "../WALLACE_TESTS/07_ALPHA_UPPER_LEFT.mp4"},
		"tiltRight": {path: "../WALLACE_TESTS/08_ALPHA_UPPER_RIGHT.mp4"},
		"weird": {path: "../WALLACE_TESTS/09_ALPHA_WEIRD_01.mp4"}
	}

	var bPaused = false;
	var videoDuration = 228.351646;
	var vidAscpect = 1280 / 720;
	var bTransitioning = false;
	var currentVid, previousVid, tertiaryVid;

	var videos = {};
	var blendMaps  = {};
	var normalMaps = {};
	var videoTextures = {};
	var texBlendMat;
	var videoMixValue = 0;

	var vidMap = {
		0: { 0: {}, 1: {}, 2: {}},
		1: { 0: {}, 1: {}, 2: {}},
		2: { 0: {}, 1: {}, 2: {}}
	}


	var debug = _debug || false;
	var useStats = _useStats || true;

	var gui, stats, renderer;
	var mouseDown = false, mouseDragged = false;
	var lastMouse = new THREE.Vector2(), mouse = new THREE.Vector2();

	//basic stuff
	var camera, light, projector;
	var clock = new THREE.Clock();
	var scene = new THREE.Scene();
	var group = new THREE.Object3D();

	var elapsedTime = 0;

	//gui
	var gui = new dat.GUI();

	var thresholds = {
		farLeft: .33,
		left: .43,
		right: .57,
		farRight: .67,
		up: .57,
		down: .43,
	}

	//debug threshold lines
	var horizontalLine = new THREE.Geometry();
	var verticalLine = new THREE.Geometry();
	horizontalLine.vertices = [new THREE.Vector3(-1000,0,100), new THREE.Vector3(1000,0,100)];
	verticalLine.vertices = [new THREE.Vector3(0,-1000,100), new THREE.Vector3(0,1000,100)];
	var thresholdLines = {
		up: new THREE.Line( horizontalLine, new THREE.LineBasicMaterial({color: 0xFFFF00}) ),
		down: new THREE.Line( horizontalLine, new THREE.LineBasicMaterial({color: 0xFF00FF}) ),
		left: new THREE.Line( verticalLine, new THREE.LineBasicMaterial({color: 0x00FFFF}) ),
		right: new THREE.Line( verticalLine, new THREE.LineBasicMaterial({color: 0xFFFFFF}) ),
		farLeft: new THREE.Line( verticalLine, new THREE.LineBasicMaterial({color: 0x0000FF}) ),
		farRight: new THREE.Line( verticalLine, new THREE.LineBasicMaterial({color: 0x00FF00}) ),
	}


	var frame = 0;
	var vidPlane;
	var slitMat, blendMat;
	var slitScene = new THREE.Scene();
	var rt = new THREE.WebGLRenderTarget( 1280, 720, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping } );
	
	var rtScale = 1.;
	var slits = [];
	for(var i=0; i<15; i++)
	{
		slits[i] = new THREE.WebGLRenderTarget( 1280 * rtScale, 720 * rtScale, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping } );
	}

	var slitIndex = 0;

	var controls = {
		blendMap: 'softNoise',
		slitStep: 3,
		layerWeight: 0,
		timeIn: 600,
		timeOut: 600,
		useBlendMapInBlendShader: true,
		volume: .25
	}

	//HEAD TRACKING
	// var headtracker = new HeadTracker({});
	
	// ABOUT
	var hasWebGL 		= true;
	var hasUserMedia 	= true;

	//optical flow
	var webcam;
	var flow, flowScene, fstPlane;
	var flowDir = new THREE.Vector2( .5, .5 ), targetDir = new THREE.Vector2( .5, .5 ), flowSmoothing = .5;
	var flowValues = {
		decay: .95,
		motionThreshold: 1000,
		nodMix: .3,
		vScale: .2
	}

	var debugSphere = new THREE.Mesh( new THREE.SphereGeometry(5), new THREE.MeshBasicMaterial( {color: 0xFF2201, side: 2} ) );
	debugSphere.scale.z = 2;

	var backgroundMesh;

	var b1 = 0;

	// debug optical flow drawing
	var ofCanvas, ofCtx;
	var debugCanvas = false;

	var vidPosition = {position: 0.0001};
	function setup() 
	{
		if ( hasWebGL ){
			// optical flow debug canvas
			
			// optical flow debug canvas
			if ( debugCanvas ){
				ofCanvas = document.createElement("canvas");
				document.body.appendChild(ofCanvas);
				ofCanvas.setAttribute("width", 640);
				ofCanvas.setAttribute("height", 480);
				ofCanvas.style.position = "absolute";
				ofCanvas.style.top = "0px";
				ofCanvas.style.left = "0px";
				ofCanvas.style.zIndex = "1000";
				ofCtx = ofCanvas.getContext("2d");
			}
			// setup web cam and optical flow worker
			
			worker = new Worker("js/flowWorker.js");

			webcam = new oflow.WebCam();
	        webcam.onUpdated( function(){
	            // console.log("yes")
	            if ( webcam.getLastPixels() ){
	                worker.postMessage({
	                    last: webcam.getLastPixels(),
	                    current: webcam.getCurrentPixels(),
	                    width: webcam.getWidth(),
	                    height: webcam.getHeight(),
	                    time: new Date()
	                });
	            }
	        });

	        /* Setup WebWorker messaging */
	        var lastTime = new Date();
	        worker.onmessage = function(event){

	        	// console.log( event.data.time - lastTime );
	        	if ( event.data.time - lastTime > 0 ){
	        		lastTime = event.data.time;
	        		var direction = event.data.direction;

		        	// draw
		        	if ( debugCanvas ){
		        		ofCtx.clearRect(0, 0, 640, 480);
			            for(var i = 0; i < direction.zones.length; ++i) {
			                var zone = direction.zones[i];
			                ofCtx.strokeStyle = getDirectionalColor(zone.u, zone.v);
			                ofCtx.beginPath();
			                ofCtx.moveTo(zone.x,zone.y);
			                ofCtx.lineTo((zone.x - zone.u), zone.y + zone.v);
			                ofCtx.stroke();
			            }
		        	}


					if(direction.averageMotionPos.numVals > flowValues.motionThreshold)
					{
		            targetDir.x = 1. - event.data.direction.averageMotionPos.x;
		            // targetDir.y = 1. - event.data.direction.averageMotionPos.y;

					b1 = b1 * (1 - flowValues.nodMix) + event.data.direction.v * flowValues.nodMix;
					targetDir.y = -b1 * flowValues.vScale + .5; 
					}


					flowDir.x = flowDir.x * flowSmoothing + (targetDir.x) * (1 - flowSmoothing);
					flowDir.y = flowDir.y * flowSmoothing + (targetDir.y) * (1 - flowSmoothing);
	        	}
	            
	        };

	        // set up w/o starting animation
	        // error callback determines next stuff
	        webcam.startCapture(false, function (e){
				hasUserMedia = false;

	        	if(e.code === 1){
	                console.error('You have denied access to your camera. I cannot do anything.');
	                // here we could do an "are you sure?" pop up that would refresh the page?
	            } else { 
	            	// we just don't have it!
	            }
	        });

			// Starts capturing the flow from webcamera:
			var oflowFolder = gui.addFolder("oflow");
			oflowFolder.add(flowValues, "decay", .5, 1.).step(.001).onChange(function(value){
				flowSmoothing = value;
			});	
			oflowFolder.add(flowValues, "motionThreshold", 100, 6000).step(1);
			oflowFolder.add(flowValues, "vScale", 0, 1).step(.01);
			oflowFolder.add(flowValues, "nodMix", 0, 1).step(.01);

			//THREE SETUP
			resetCamera();

			projector = new THREE.Projector();

			light = new THREE.PointLight();
			light.position = camera.position;

			scene = new THREE.Scene();
			scene.add( camera );
			scene.add( light );
			scene.add( group );	

			//blend textures
			blendMaps ["hardNoise"] = THREE.ImageUtils.loadTexture( '../blendMaps/hard_noise.png' );
			blendMaps ["randomGrid"] = THREE.ImageUtils.loadTexture( '../blendMaps/random_grid.png' );
			blendMaps ["softNoise"] = THREE.ImageUtils.loadTexture( '../blendMaps/soft_noise.png' );
			blendMaps ["Checker"] = THREE.ImageUtils.loadTexture( '../blendMaps/Checker.png' );
			blendMaps["horizontal_stripes"] = THREE.ImageUtils.loadTexture( '../blendMaps/horizontal_stripes.png');
			blendMaps["hardGradientDownTop"] = THREE.ImageUtils.loadTexture('../blendMaps/hardGradientDownTop.png');
			blendMaps["hardGradientLeftRight"] = THREE.ImageUtils.loadTexture('../blendMaps/hardGradientLeftRight.png');
			blendMaps["hardGradientRightLeft"] = THREE.ImageUtils.loadTexture('../blendMaps/hardGradientRightLeft.png');
			blendMaps["hardGradientTopDown"] = THREE.ImageUtils.loadTexture('../blendMaps/hardGradientTopDown.png');

			blendMaps["verticalHardGradient"] = THREE.ImageUtils.loadTexture( '../blendMaps/verticalHardGradient.png');
			blendMaps["zigzag"] = THREE.ImageUtils.loadTexture( '../blendMaps/zigzag.png');
		}

		//VIDEOS TEXTURES
		loadVideos();

		videos['straightOn'] = new AzealiaVideoObject({video: document.getElementById( 'straightOn' ), dir: new THREE.Vector2(0,0), name: "straightOn"}, hasWebGL);
		videos['down'] = new AzealiaVideoObject({video: document.getElementById( 'down' ), name: "down"}, hasWebGL);
		videos['up'] = new AzealiaVideoObject({video: document.getElementById( 'up' ), name: "up"}, hasWebGL);
		videos['left'] = new AzealiaVideoObject({video: document.getElementById( 'left' ), name: "left"}, hasWebGL);
		videos['right'] = new AzealiaVideoObject({video: document.getElementById( 'right' ), name: "right"}, hasWebGL);
		videos['tiltLeft'] = new AzealiaVideoObject({video: document.getElementById( 'tiltLeft' ), name: "tiltLeft"});
		videos['tiltRight'] =  new AzealiaVideoObject({video: document.getElementById( 'tiltRight' ), name: "tiltRight"});
		videos['weird'] =  new AzealiaVideoObject({video: document.getElementById( 'weird' ), name: "weirdVideo"});
		videos['background'] =  new AzealiaVideoObject({video: document.getElementById( 'BackgroundVideo' ), name: "background"}, hasWebGL);

		videos['background'].bIsActive = true;
		videos['straightOn'].bIsActive = true;
		videos['down'].bIsActive = true;

		vidMap[0][0] = videos['tiltLeft'];
		vidMap[1][0] = videos['down'];
		vidMap[2][0] = videos['tiltRight'];
	
		vidMap[0][1] = videos['tiltLeft'];
		vidMap[1][1] = videos['straightOn'];
		vidMap[2][1] = videos['tiltRight'];

		vidMap[0][2] = videos['tiltLeft'];
		vidMap[1][2] = videos['up'];		
		vidMap[2][2] = videos['tiltRight'];



		currentVid = videos['straightOn'];
		previousVid = videos['down'];
		tertiaryVid = previousVid;
		previousPreviousVid = videos['down'];

		//video gui 
		var videoFolder = gui.addFolder("videoControls");
		var vp = videoFolder.add(vidPosition, "position", 0., 1.);
		vp.onChange(function(value){setVideoPosition(value);});
		vp.listen();
		vp.step(.01);

		videoFolder.add({ pause: pauseVideos},'pause');
		videoFolder.add({ play: playVideos},'play');
		videoFolder.add({ stop: stopVideos},'stop');

		if ( hasWebGL ){
			//slit mat
			slitMat = new SlitShader({
				blendMap: blendMaps ['softNoise'],
				mixVal: 0,
				slits: slits
			});

			//blend mesh
			blendMat = new BlendShader({
				previousTex: videos['straightOn'].texture,
				currentTex:  videos['down'].texture,
				backgroundTex: videos['background'].texture,
				blendMap: blendMaps [controls.blendMap],
				mixVal: 0,
			});

			var slitMesh = new THREE.Mesh( new THREE.PlaneGeometry( 2, 2, 12, 7 ), blendMat);
			slitScene.add(slitMesh);

			//draw slitTo Screen
			vidPlane = new THREE.Mesh( new THREE.PlaneGeometry( 1, 1, 12, 7 ), slitMat);

			backgroundMesh = new THREE.Mesh(vidPlane.geometry, new THREE.MeshBasicMaterial( {
				side: 2,
				transparent: false,
				depthTest: true,
				map: videos['background'].texture
			}));

			backgroundMesh.position.z = -1;

			scaleVidMesh();

			scene.add(vidPlane);
			scene.add(backgroundMesh);

			//kick off some random transitioning
			if(auto)
			{
				console.log( "auto: startTransition( endTransition );" );
				startTransition( endTransition );
			}
				 
			// GUI
			gui.add(controls, 'volume', 0, 1).step(.025).onChange(function(value){	
				videos['straightOn'].video.muted = false;
				videos['straightOn'].video.volume = value;
			});
			gui.add(controls, 'blendMap', Object.keys(blendMaps) )
			.onChange(function(value) {
				this.uniforms.blendMap.value = blendMaps[value];
				console.log( blendMaps[value] );
			}.bind(slitMat));

			gui.add(controls, 'slitStep', 1, 5).step(1);
			gui.add(controls, 'timeIn', 1, 4000).step(1);
			gui.add(controls, 'timeOut', 1, 4000).step(1);
			gui.add(controls, 'useBlendMapInBlendShader').onChange(function(value){
				blendMat.uniforms.useBlendMap.value = value? 1 : 0;
			});
			gui.addFolder("layerWeight").add(slitMat.uniforms.layerWeight,"value", 0. ,.1 );


			//debug sphere
			scene.add(debugSphere);
			gui.addFolder("debugSphere").add(debugSphere, "visible");	

			//debug lines
			for(var i in thresholdLines)
			{
				scene.add(thresholdLines[i]);
			}

			var thresholdFolder = gui.addFolder("thresholds");
			thresholdFolder.add(thresholdLines["up"], "visible").onChange(function(value){
				for(var i in thresholdLines)
				{
					thresholdLines[i].visible = value;
				}
			})
			for(var i in thresholds)
			{
				thresholdFolder.add(thresholds, i, 0, 1).onChange(updateDebugLines);
			}
		}
	}

	/**
	 * [update description]
	 * @return {[type]} [description]
	 */

	var rate = 2;

	function update()
	{
		if ( hasUserMedia ){
			if ( frame % rate == 0 ){
				webcam.updatePixels();
				// console.log("update");
			}
		// no user media (or they denied it), so check mouse
		} else {
			flowDir.x = flowDir.x * .9 + THREE.Math.mapLinear(mouse.x, 0.0, window.innerWidth, 0.0, 1.0) * .1;
			flowDir.y = flowDir.y * .9 + THREE.Math.mapLinear(mouse.y, 0.0, window.innerHeight, 1.0, 0.0) * .1;
		}

		if ( hasWebGL )
		{
			slitMat.uniforms.time.value = clock.getElapsedTime() * -.1;

			if(debugSphere)
			{
				debugSphere.position.x = THREE.Math.mapLinear( flowDir.x, 0, 1, -vidPlane.scale.x*.5, vidPlane.scale.x*.5);
				debugSphere.position.y = THREE.Math.mapLinear( flowDir.y, 0, 1, -vidPlane.scale.y*.5, vidPlane.scale.y*.5);
			}
		}

		// if need be, start transitions 
		updateTransions();

		//update the videos
		if ( hasWebGL ){
			//update videos 
			for(var i in videos)
			{
				if (videos[i].bIsActive && videos[i].video.readyState === videos[i].video.HAVE_ENOUGH_DATA ) {
					if ( videos[i].texture ) videos[i].texture.needsUpdate = true;
					vidPosition.position = videos[i].video.currentTime / videoDuration;
				}
			}
		}

		frame++;
	}

	function updateTransions()
	{
		// straightOn, down, up, left, right, tiltLeft, tiltRight, weird
		if(!bTransitioning) 
		{
			//turn left
			if (flowDir.x < thresholds["farLeft"])
			{
				if(currentVid != videos["farLeft"])
				{
					console.log( "left transition" );
					setCurrentVideo("left");	
				}
			}

			//tilt left
			else if(flowDir.x < thresholds["left"] )
			{
				if(currentVid != videos["left"])
				{
					console.log( "tiltLeft transition" );
					setCurrentVideo["tiltLeft"]	
				}
			}

			//up, straightOn, down
			else if(flowDir.x < thresholds["right"])
			{
				//up
				if(flowDir.y > thresholds["up"] )
				{
					if(currentVid != videos["up"])
					{
						console.log( "up transition" );
						setCurrentVideo("up")	
					}
				}

				//down
				else if(flowDir.y < thresholds["down"] )
				{
					if(currentVid != videos["down"])
					{
						console.log( "down transition" );
						setCurrentVideo("down");	
					}
				}

				//straight
				else 
				{
					if(currentVid != videos["straightOn"])
					{
						console.log( "straightOn transition" );
						setCurrentVideo("straightOn");	
					}
				}
			}

			//tilt right
			else if(flowDir.x < thresholds["farRight"] )
			{
				if(currentVid != videos["tiltRight"])
				{
					console.log( "tiltRight transition" );
					setCurrentVideo("tiltRight");
				}
			}

			// turn right
			else 
			{
				if(currentVid != videos["right"])
				{
					console.log( "right transition" );
					setCurrentVideo["right"];	
				}
			}

		}
	}

	function setCurrentVideo(name)
	{
		if(videos[name])
		{
			previousPreviousVid.bIsActive = false;

			previousPreviousVid = previousVid;
			previousVid = currentVid;
			currentVid = videos[name];

			currentVid.bIsActive = previousVid.bIsActive = previousPreviousVid.bIsActive = true;

			startTransition();
		}
		else{
			console.log( "videos[name] == ", videos[name] );
		}
	}

	/**
	 * DRAW
	 * NOT called if no WebGL
	 * @return {none} 
	 */
	function draw()
	{
		// if(frame % controls.slitStep == 0)	slits.unshift( slits.pop() );
		if(frame % controls.slitStep == 0)	slits.push( slits.shift() );
		renderer.render( slitScene, camera, slits[0], true );

		slitMat.uniforms.slits.value = slits;
		slitMat.uniforms.mixVal.value = blendMat.uniforms.mixVal.value;

		// vidPlane.material.map = slits[slitIndex];
		vidPlane.needsUpdate = true;

		//to screen
		renderer.render( scene, camera, null, true );
	}

	function playVideos()
	{
		for(var v in videos)
		{
			videos[v].video.play();
		}

		bPaused = false;
	}

	function pauseVideos()
	{
		if(bPaused)
		{
			for(var v in videos)	videos[v].video.play();
		}
		else
		{
			for(var v in videos)	videos[v].video.pause();
			// console.log( videos );
		}

		bPaused = !bPaused;
	}

	function setVideoPosition(percent)
	{
		for(var v in videos)	videos[v].video.currentTime = percent * videoDuration; 
	}

	function stopVideos()
	{
		setVideoPosition(0);

		for(var v in videos)	videos[v].video.pause();

		bPaused = true;
	}

	var videoLoadCount = 0;
	var videoToLoadCount = 0;
	function loadVideos(){
		for( var id in videoFiles ){
			loadVideo( id, videoFiles[id].path);
			videoToLoadCount++;
		}
	}


	function loadVideo( name, url ){
		// to-do: firefox
		var el = document.createElement( 'video' );
		// el.setAttribute("loop", "");
		// el.setAttribute("type", "video/mp4");
		
		if(muteVideo == true || name != "straightOn")
		{
			el.setAttribute("muted", "");
		}
		
		el.setAttribute("id", name);
		var source = document.createElement('source');
		source.src = url;
		el.load();
		el.appendChild(source);
		document.body.appendChild(el);

		el.addEventListener('loadeddata', function() {
		   console.log( "\n" + name + " is loaded and can be played\n" );
		   videoLoadCount++;

		   console.log( "videoLoadCount: " + videoLoadCount );
		   console.log( "videoToLoadCount: " + videoToLoadCount );
		}, false);

		// el.addEventListener('progress', function(e){
		// 	console.log( name + " progress", e );
		// }, false);

		el.addEventListener('loadedmetadata', function(e){
			// console.log( name + " loadedmetadata", e );
		   console.log( "\n" + name + " metadata is loaded\n" );
		}, false);

		console.log( el );
	}

	function startTransition( callback, delay )
	{
		bTransitioning = true;
		callback = callback || endTransition;
		delay = delay || 0;

		if ( hasWebGL ){
			blendMat.uniforms.mixVal.value = 0.0;
			blendMat.uniforms.previousTex.value = previousVid.texture;
			blendMat.uniforms.currentTex.value = currentVid.texture;
			blendMat.uniforms.backgroundTex.value = videos['background'].texture;

			new TWEEN.Tween(blendMat.uniforms.mixVal)
			.onStart(function(){
				// blendMat.uniforms.mixVal.value = 0;
			})
			.to({value: 1}, controls.timeIn)
			.delay( delay )
			.onUpdate( function( value )
			{
				// controls.mixVal = value;
				// texBlendMat.uniforms.mixVal.value = value;
			})
			.start();

			new TWEEN.Tween(slitMat.uniforms.bMax)
			.to({value: 1.}, controls.timeIn)
			.onStart(function(){
				slitMat.uniforms.bMin.value = 0;
				slitMat.uniforms.bMax.value = 0;
			})
			.delay(delay)
			.onComplete(function(){
				new TWEEN.Tween(slitMat.uniforms.bMin)
				.to({value: 1}, controls.timeOut)
				.onComplete( function()
				{
					callback();
				})
				.start();
			})
			.start();
		} 
		else
		 {
			new TWEEN.Tween( currentVid.style["opacity"] )
			.onStart(function(){
			})
			.to({value: 1}, controls.timeIn)
			.delay( delay )
			.onUpdate( function( value )
			{
				// controls.mixVal = value;
				// texBlendMat.uniforms.mixVal.value = value;
			})
			.start();

			new TWEEN.Tween(previousVid.style["opacity"] )
			.to({value: 0.}, controls.timeOut)
			.delay(delay)
			.onComplete(function(){
				// nothin
			})
			.start();
		}
	}

	function endTransition()
	{
		bTransitioning = false;

		if(auto == true)
		{
			randomtTransition();
		}
	}

	function randomtTransition(delay)
	{
		flowDir.x = THREE.Math.randFloat( .2, .8 );
		flowDir.y = THREE.Math.randFloat( .2, .8 );
	}

	function updateDebugLines()
	{
		thresholdLines["up"].position.y = THREE.Math.mapLinear(thresholds["up"], 0., 1, -vidPlane.scale.y * .5, vidPlane.scale.y * .5);
		thresholdLines["down"].position.y = THREE.Math.mapLinear(thresholds["down"], 0., 1, -vidPlane.scale.y * .5, vidPlane.scale.y * .5);
		thresholdLines["left"].position.x = THREE.Math.mapLinear(thresholds["left"], 0., 1, -vidPlane.scale.x * .5, vidPlane.scale.x * .5);
		thresholdLines["right"].position.x = THREE.Math.mapLinear(thresholds["right"], 0., 1, -vidPlane.scale.x * .5, vidPlane.scale.x * .5);
		thresholdLines["farLeft"].position.x = THREE.Math.mapLinear(thresholds["farLeft"], 0., 1, -vidPlane.scale.x * .5, vidPlane.scale.x * .5);
		thresholdLines["farRight"].position.x = THREE.Math.mapLinear(thresholds["farRight"], 0., 1, -vidPlane.scale.x * .5, vidPlane.scale.x * .5);
	}

	function scaleVidMesh()
	{
		vidPlane.scale.set( window.innerWidth, -window.innerWidth / vidAscpect, 1);
	
		backgroundMesh.scale.set( window.innerWidth, -window.innerWidth / vidAscpect, 1);

		updateDebugLines();
	}

	function resetCamera()
	{
		var halfWidth = window.innerWidth * .5;
		var halfHeight = window.innerHeight * .5;

		if(camera)
		{
			camera.left = -halfWidth;
			camera.right = halfWidth;
			camera.top = -halfHeight;
			camera.bottom = halfHeight;

			camera.updateProjectionMatrix();	
		}
		else
		{
			camera = new THREE.OrthographicCamera( -halfWidth, halfWidth, -halfHeight, halfHeight, -1000, 1000 );
		}
	}

	//-----------------------------------------------------------
	function onWindowResize() {

		// camera.right = window.innerWidth;
		// camera.bottom = window.innerHeight;

		// camera.aspect = window.innerWidth / window.innerHeight;
		// camera.updateProjectionMatrix();
		resetCamera();
		scaleVidMesh();

		if(fstPlane)
		{
			fstPlane.material.uniforms.screendim.value.set(window.innerWidth, window.innerHeight );
		}

		renderer.setSize( window.innerWidth, window.innerHeight );
	}

	function onMouseMove( event , still )
	{
		mouse.set( event.x, event.y );

		// if(mouseDown)
		// {
		// 	onMouseDragged( event );
		// }

		// lastMouse.set( mouse.x, mouse.y );
	}

	function onMouseUp( event )
	{
		mouseDown = false;
	}

	function onMouseDown( event )
	{
		// event.preventDefault();
		mouseDown = true;
	}

	function onMouseDragged( event ) 
	{
		group.rotation.x += (mouse.y - lastMouse.y) * .01;
		group.rotation.y += (mouse.x - lastMouse.x) * .01;
	}


	function onKeyDown( event )
	{
		console.log( event.keyCode );
		switch( event.keyCode )
		{

			case 32:
				pauseVideos();

				break;

			case 67:
				break;

			// case 77:
			// 	break;

			default:
				// console.log( event.keyCode );
				break;
		}
	}

	function rendererSetup()
	{

		renderer = new THREE.WebGLRenderer( { antialias: true, devicePixelRatio: 1 } );
		renderer.setClearColor( 0x444447, 0. );
		renderer.sortObjects = false;
		renderer.setSize( window.innerWidth, window.innerHeight );
		renderer.autoClear = true;
		container.appendChild( renderer.domElement );
	}

	function events()
	{
		//events
		window.addEventListener( 'resize', onWindowResize, false );
		document.addEventListener( 'mousemove', onMouseMove, false );
		document.addEventListener( 'mouseup', onMouseUp, false );
		document.addEventListener( 'mousedown', onMouseDown, false );
		document.addEventListener( "keydown", onKeyDown, false);

		mouseDown = false;
		mouseDragged = false;
	}

	function animate() {
		requestAnimationFrame( animate );
		TWEEN.update();
		update();
		if ( hasWebGL ) draw();

		if(useStats)
		{
			stats.update();
		}
	}

	if ( ! Detector.webgl )
	{
		hasWebGL = false;
		hasUserMedia = false;
		//Detector.addGetWebGLMessage();
		//document.getElementById( container ).innerHTML = "";
	}


	if ( hasWebGL) rendererSetup();
	if(useStats)
	{	
		stats = new Stats();
		stats.domElement.style.position = 'absolute';
		stats.domElement.style.top = '10px';
		stats.domElement.style.left = '400px';
		container.appendChild( stats.domElement );
	}	

	setup();
	events();
	animate();

}

function getQuerystring(key, default_)
{
	if (default_==null) default_=""; 
	key = key.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
	var regex = new RegExp("[\\?&]"+key+"=([^&#]*)");
	var qs = regex.exec(window.location.href);
	if(qs == null)
		return default_;
	else
		return qs[1];
}	