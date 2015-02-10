var app;

var LYRICS_ON 	= false;
var PLAYING		= false;
var HAS_PLAYED 	= false;

var iOS = ( navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false );

$(window).bind("load", function() {
	THREE.ImageUtils.crossOrigin = '';
	
	var debug = getQuerystring('debug') == "true";
	var useStats = getQuerystring('useStats') == "true";
	var muteVideo = getQuerystring('mute') == "true";
	var auto = getQuerystring('auto') == "true";
	app = new APP(useStats, debug, muteVideo, auto );
});


function APP( _useStats, _debug, _muteVideo, _auto)
{
	var muteVideo = _muteVideo || !PLAYING;
	var auto = _auto || false;

	var barMeshes = [];

	//main container
	var container = document.createElement( 'div' );

	container.style.position = 'absolute';
	container.style.left = '0px';
	container.style.top = '0px';
	document.body.appendChild( container );


	//STATS
	var stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.top = '10px';
	stats.domElement.style.left = '10px';
	container.appendChild( stats.domElement );

	var debug = false;//(_debug == true)? false : false;
	var useStats = debug;//_useStats || true;
	var frame = 0;

	var vidAspect = 1280 / 720;
	var gui, stats, renderer;
	var mouseDown = false, mouseDragged = false;
	var lastMouse = new THREE.Vector2(), mouse = new THREE.Vector2();
	var lastDelta = new THREE.Vector2();


	//basic stuff
	var gui;
	var camera, light, projector;
	var clock = new THREE.Clock();
	var scene = new THREE.Scene(), slitScene = new THREE.Scene();
	var group = new THREE.Object3D();

	// use alpha or background
	var useBackground = false;

	var elapsedTime = 0;

	// ABOUT
	var hasWebGL 		= true;
	var hasUserMedia 	= true;

	var slitMesh;
	var backgroundFlipped = false;
	var webCamTexture;

	var controls = {
		slitStep: 5
	}

	function addSubtitles( subs ){
		positionSubtitles();
		for ( var i =0; i<window.textMeshes.length; i++ ){
			var sub = window.textMeshes[i];
			if ( LYRICS_ON ) scene.add( subs[i].mesh );
		}
	}

	// var motionThresholds = new MotionThresholds();
	var videoController = new MirrorVideoController({
		muteVideo: muteVideo,
		useBackground: useBackground,
		subtitleHander: addSubtitles,
		verbose: false
	});
	var mouthRect ;
	var mouthPositions = {
		"straight": new THREE.Vector3( -.01, -.18, .05 ),
		"left": new THREE.Vector3( -.07, -.15, .05 ),
		"right": new THREE.Vector3( .05, -.15, .05 ),
		"up": new THREE.Vector3( -0.0, -.1, .05 ),
		"down": new THREE.Vector3( 0., -.25, .05 )
	}

	// videoController.setVolume(0);

	var currentVideo = "straight", previousVideo = "doYouLikeHorses?";

	var backgroundWebcamMat, backgroundVideoMat;
	
	// camera
	var webcam;
	var cameraTexture, slit, tracking, debugBox, azealiaMesh, depthSampleScale = 0;

	function setup() 
	{
		// THREE Setup
		resetCamera()
		
		scene.add( camera );
		scene.add( light );
		scene.add( group );	

		var tempPixels = [255,255,255,255];
		var tempTexture = new THREE.DataTexture( new Uint8Array(tempPixels), 1, 1, THREE.RGBAFormat);
		tempTexture.minFilter = THREE.NearestFilter;
		tempTexture.needsUpdate = true;

		// MESHES
		screenPlane = new THREE.PlaneBufferGeometry(1,1, 12, 7 );

		backgroundVideoMat = new THREE.MeshBasicMaterial( {
			map: videoController.getVideo("background").t, //THREE.ImageUtils.loadTexture("images/face.png"),
			color: 0xFFFFFF,
			side: 2 
		});
		backgroundMesh = new THREE.Mesh(screenPlane, backgroundVideoMat );
		backgroundMesh.position.z = -10;
		scene.add(backgroundMesh);

		slitMesh = new THREE.Mesh(screenPlane, new THREE.MeshBasicMaterial( {
			map: tempTexture,
			color: 0xffffff,
			side: 2,
			transparent: true
		}) );
		slitScene.add(slitMesh);

		mouthRect = new THREE.Mesh(
			new THREE.PlaneBufferGeometry(.2, .225),
			new MouthMaterial( {
				map: videoController.getVideo("straight").t,
				aspect: 720 / 1280
			} ) );
		mouthRect.position.copy( mouthPositions["straight"] );
		slitMesh.add(mouthRect);

		// VIDEO CONTROLLER
		videoController.playVideos();

		// LETTER BOXING
		var barGeom = new THREE.PlaneBufferGeometry(1,1, 12, 7 );
		var barMat = new THREE.MeshBasicMaterial( { side: 2, color: 0x000000 } );
		barMeshes[0] = new THREE.Mesh( barGeom, barMat );
		barMeshes[1] = new THREE.Mesh( barGeom, barMat );
		barMeshes[0].position.z = 3;
		barMeshes[1].position.z = 3;
		slitScene.add( barMeshes[0] );
		slitScene.add( barMeshes[1] );

		var slitWidth = 640;
		slit = new SlitScan({
			width: slitWidth,
			height: Math.floor( slitWidth / vidAspect),
			depth: 45,
			renderer: renderer
		});
		tracking = new AzealiaTracking({
			width: 160,
			height: 120
		});


		// backgroundWebcamMat = new BackgroundWebcamMaterial();
		cameraTexture = new CameraTexture({
			width: tracking.width,
			height: tracking.height,
			onGetUserMedia: function(texture)
			{
				slitMesh.material.map = slit.texture;
				slit.webcamMesh.material.uniforms.map.value = texture;
			}
		});
	
		//TRACKING DEBGUG
		var debugFlipper = new THREE.Object3D();
		debugFlipper.scale.y = -1;
		debugBox = new THREE.Mesh(new THREE.PlaneBufferGeometry( 400,400), new THREE.MeshBasicMaterial( {
			transparent: true,
			opacity: .4,
			map: THREE.ImageUtils.loadTexture("images/face.png"),
			side: 2
		} ) );
		debugBox.scale.set(-1, 1, 1);
		debugBox.visible = false;
		debugFlipper.add(debugBox);
		scene.add(debugFlipper);

		//RESIZE THE SCREEN PLANES
		scaleVidMesh();

		//html controls
		$("#play").click(function(){
			var wasPlaying = PLAYING;
			PLAYING = !PLAYING;
			if (!HAS_PLAYED ){
				HAS_PLAYED = true;
				videoController.setVideoPosition(0);
				videoController.setVolume( 1. );// videoController.muteVideo? 0 : 1.0);
			}

			if ( !wasPlaying ){
				$("#play").html("PAUSE");
				videoController.playVideos();
			} else {
				$("#play").html("PLAY");
				videoController.pauseVideos();
			}
		})

		$("#lyrics").click(function(){
			var wasOn = LYRICS_ON;
			LYRICS_ON = !LYRICS_ON;
			for ( var i =0; i<window.textMeshes.length; i++ ){
				if ( LYRICS_ON ){
					scene.add( window.textMeshes[i].mesh );
				} else {
					scene.remove( window.textMeshes[i].mesh );
				}
			}
			if ( !wasOn ){
				$("#lyrics").html("NO LYRICS");
			} else {
				$("#lyrics").html("LYRICS");
			}
		})


		//GUI
		// gui = new dat.GUI();
		// console.log(gui);
		// container.append
		// container.appendChild( gui.domElement );

		gui = new dat.GUI({ autoPlace: false });

		// var customContainer = document.getElementById('my-gui-container');
		container.appendChild(gui.domElement);
		var temp = $(gui.domElement);
		temp.css({
			position: "absolute",
			color: "red",
			left: 10,
			top: 100
		})
	}

	/**
	 * [update description]
	 * @return {[type]} [description]
	 */
	// var webcamBackgroundTime1 = {start:4, end: 110};
	var webcamBackgroundTime1 = {start:119, end: 146};
	var webcamBackgroundTime2 = {start:162.386, end: 191.124};
	var bTransitioningBackground = false, bFadeInWebcam = true;

	function update()
	{
		frame++;
		stats.update();

		if ( videoController.videoToLoadCount != 0 ) return;

		//this just updates the webcam texture(for debugging), not the canvas
		cameraTexture.update();
		// slit.setTexture(cameraTexture.texture);
		slit.update();
		tracking.update(cameraTexture.getData(), cameraTexture.width, cameraTexture.height );

		debugBox.setRotationFromAxisAngle({x:0,y:0,z:1}, tracking.delta.x  *.25 );
		debugBox.position.x = tracking.delta.x * -100;	
		debugBox.position.y = tracking.delta.y * -150;	


		depthSampleScale = Math.max(Math.min(1, lastDelta.distanceTo( tracking.delta ) * 50.), depthSampleScale * .985);
		slit.setDepthSampleScale( depthSampleScale * .5 + .5 );
		lastDelta.copy( tracking.delta );

		getCurrentVideo();

		videoController.update();

		//webcam backgroun
		var vTime = videoController.vidPosition.position * videoController.videoDuration;
		var bWebcamBackground1 = vTime >= webcamBackgroundTime1.start && vTime < webcamBackgroundTime1.end;
		var bWebcamBackground2 = vTime >= webcamBackgroundTime2.start && vTime < webcamBackgroundTime2.end;

		if( bWebcamBackground1 || bWebcamBackground2 )
		{
			slit.webcamMesh.material.uniforms.time.value = clock.getElapsedTime();

			if(bFadeInWebcam)
			{
				if(bWebcamBackground1)
				{
					slit.setDistortion(1);
				}

				else if(bWebcamBackground2)
				{
					slit.setDistortion(2);
				}

				slit.webcamMesh.visible = true;
				slit.webcamMesh.material.uniforms.color.value.setRGB(0,0,0);
				new TWEEN.Tween( slit.webcamMesh.material.uniforms.color.value )
					.to( { r: 1, g: 1, b: 1 }, 500 )
					.onUpdate(function(k){
						slit.webcamMesh.material.uniforms.opacity.value = k;
					})
					.start();

				bFadeInWebcam = false;
			}
			
			bTransitioningBackground = true;
		}
		else
		{
			if(bTransitioningBackground)
			{
				bFadeInWebcam = true;
				bTransitioningBackground = false;

				new TWEEN.Tween( slit.webcamMesh.material.uniforms.color.value )
					.to( { r: 0, g: 0, b: 0 }, 250 )
					.onUpdate(function(k){
						slit.webcamMesh.material.uniforms.opacity.value = 1. - k;
					})
					.onComplete(function(e){
						slit.webcamMesh.visible = false;
						slit.setDistortion(0);
					})
					.start();
			}
		}
	}

	function getCurrentVideo()
	{
		var samplePos = debugBox.position;

		var leftRightThreshold = 110, upThreshold = 25, downThreshold = 35;
		if(samplePos.x < -leftRightThreshold)
		{
			debugBox.material.color.set(0xFF0000);
			currentVideo = "left";
		}
		else if(samplePos.x > leftRightThreshold)
		{
			debugBox.material.color.set(0x0000FF);
			currentVideo = "right";
		}
		else if(samplePos.y > upThreshold)
		{
			debugBox.material.color.set(0x00FFFF);
			currentVideo = "up";
		}
		else if(samplePos.y < -downThreshold)
		{
			debugBox.material.color.set(0xFFFF00);
			currentVideo = "down";
		}
		else{
			debugBox.material.color.set(0xFFFFFF);
			currentVideo = "straight";
		}

		if(previousVideo !== currentVideo )
		{
			setVideo(currentVideo);
		}

		previousVideo = currentVideo;
	}


	function setVideo( videoName )
	{

		var t = videoController.getVideo( videoName ).t;
		slit.setTexture( t );

		mouthRect.material.uniforms.map.value = t;
		mouthRect.position.copy( mouthPositions[ videoName ] );

		fadeMouth();
	}

	function fadeMouth()
	{
		mouthRect.material.uniforms.opacity.value = 0.;

	new TWEEN.Tween( mouthRect.material.uniforms.opacity )
		.to( { value: 1 }, 500 )
		.easing( TWEEN.Easing.Quintic.In )
		.start();
	}

	/**
	 * DRAW
	 * NOT called if no WebGL
	 * @return {none} 
	 */
	function draw()
	{
		//draw the slits to thier render targets
		// slits.draw();
		// webcamslits.draw();
		
		//to the background & slitShader to screen
		renderer.render( scene, camera, null, true );

		renderer.render( slitScene, camera, null, false );
	}

	function scaleVidMesh()
	{
		var h = -window.innerWidth / vidAspect;

		var yPos = 0;

		slitMesh.scale.set( window.innerWidth, h, 1);
		backgroundMesh.scale.set( window.innerWidth, h, 1);

		mouthRect.material.uniforms.screenAspect.value = window.innerHeight / window.innerWidth;

		var bar_h = window.innerHeight - (-h);
		barMeshes[0].scale.set( window.innerWidth, -bar_h, 1);
		barMeshes[0].position.y = -window.innerHeight/2.0;
		barMeshes[1].scale.set( window.innerWidth, -bar_h, 1);
		barMeshes[1].position.y = window.innerHeight/2.0;
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

	function positionSubtitles(){
		// move subtitles
		for ( var i =0; i<window.textMeshes.length; i++ ){
			var sub = window.textMeshes[i];
			if ( !sub.started ){
				var ran = Math.random();
				if ( ran > .5 ){
					sub.mesh.position.x =  -window.innerWidth * .1 - Math.random() * (window.innerWidth * .4);
				} else {
					sub.mesh.position.x =  window.innerWidth * .1 + Math.random() * window.innerWidth * .4;
				}
				sub.mesh.position.y = -window.innerHeight * .6;
				sub.mesh.position.z = 1;
			}
		}
	}

	//-----------------------------------------------------------
	function onWindowResize() {
		resetCamera();
		scaleVidMesh();

		positionSubtitles();

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
			
	}


	function onKeyDown( event )
	{
			console.log(event.keyCode)
		switch( event.keyCode )
		{
			case 32:
				console.log("videoController.vidPosition.position: " + videoController.vidPosition.position);
				break;
			default:
			break;
		}
	}

	function rendererSetup()
	{
		renderer = new THREE.WebGLRenderer( { antialias: false, devicePixelRatio: 1, alpha: true } );
		renderer.setClearColor( 0x000000, 0. );
		renderer.sortObjects = false;
		renderer.setSize( window.innerWidth, window.innerHeight );
		renderer.autoClear = false;
		container.appendChild( renderer.domElement );
		container.style.zIndex = 100;
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
		update();
		TWEEN.update();
		if ( hasWebGL ) draw();

		if(useStats)
		{
			stats.update();
		}
	}

	if ( ! Detector.webgl )
	{
		if ( !debug ){
			hasWebGL = false;
			hasUserMedia = false;
		}
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
	this.s = scene;
	events();
	animate();
	this.bgm = slitMesh;
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