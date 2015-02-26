//TODO:
//	confirm that touch input works
//

//TOODO
/**
 * mobile -> images
 √ * coors support -> image version
 * play pause broken
 * 
 * clean up
 * centralize & fall backs
 */


var app;

var LYRICS_ON 	= false;
var PLAYING		= false;
var HAS_PLAYED 	= false;
var HAS_WEBCAM = false;
var HAS_COORS = supports_crossorigin();
var IS_SAFARI = (navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1);


console.log( "HAS_COORS: " + HAS_COORS );
console.log( "IS_SAFARI: " + IS_SAFARI )

// ABOUT
var iOS = ( navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false );
var isMobile = ( navigator.userAgent.match(/mobile|tablet|ip(ad|hone|od)|android|silk/i) ? true : false );
console.log( navigator.userAgent );

if (!navigator.getUserMedia) {
    navigator.getUserMedia = navigator.getUserMedia ||
                             navigator.webkitGetUserMedia ||
                             navigator.mozGetUserMedia ||
                             navigator.msGetUserMedia || null;
}

var hasWebGL 		= Modernizr.webgl;
var hasUserMedia 	= (Modernizr.webgl ? navigator.getUserMedia === null : false );

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
	var muteVideo = _muteVideo;// || !PLAYING;
	var auto = _auto || false;

	var barMeshes = [];

	//main container
	var container = document.createElement( 'div' );

	container.style.position = 'absolute';
	container.style.left = '0px';
	container.style.top = '0px';
	document.body.appendChild( container );

	var debug = _debug;
	var useStats = debug;//_useStats || true;
	var frame = 0;


	//STATS
	var stats; 

	var vidAspect = 1280 / 720;
	var renderer;
	var mouse = new THREE.Vector2(), delta = new THREE.Vector2(), lastDelta = new THREE.Vector2();


	//basic stuff
	var camera;
	// var clock = new THREE.Clock();
	var scene = new THREE.Scene(), slitScene = new THREE.Scene();

	// use alpha or background
	var useBackground = false;

	var elapsedTime = 0;

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


	function kickOff()
	{
		console.log( "kickOff" );
		
		setup();
		this.s = scene;
		events();
		animate();
		this.bgm = slitMesh;
	}

	var popcornPlayer = new AzealiaPopcornPlayer({
		isVideo:  ( supports_video() && !isMobile && HAS_COORS && !IS_SAFARI) ? true : false,
		muted: muteVideo, // || !PLAYING,
		useBackground: useBackground,
		subtitleHander: addSubtitles,
		onCanPlayThrough: kickOff
	});

	popcornPlayer.setup();


	// // var motionThresholds = new MotionThresholds();
	// var videoController = new MirrorVideoController({
	// 	muteVideo: muteVideo || !PLAYING,
	// 	useBackground: useBackground,
	// 	subtitleHander: addSubtitles,
	// 	verbose: false,
	// 	isVideo:  ( supports_video() && !isMobile && HAS_COORS && !IS_SAFARI) ? true : false
	// });
	var mouthRect ;
	var mouthPositions = {
		"straight": new THREE.Vector3( -.01, -.18, .05 ),
		"left": new THREE.Vector3( -.07, -.15, .05 ),
		"right": new THREE.Vector3( .05, -.15, .05 ),
		"up": new THREE.Vector3( -0.0, -.1, .05 ),
		"down": new THREE.Vector3( 0., -.25, .05 )
	}

	// videoController.setVolume(0);

	var currentVideo = previousVideo = "doYouLikeHorses?";

	var backgroundWebcamMat, backgroundVideoMat;
	
	// camera
	var webcam;
	var cameraTexture, slit, tracking, videoSelectionBox, azealiaMesh, depthSampleScale = 0;

	function setup() 
	{
		// THREE Setup
		resetCamera()
		
		scene.add( camera );

		var tempPixels = [0,0,0,255];
		var tempTexture = new THREE.DataTexture( new Uint8Array(tempPixels), 1, 1, THREE.RGBAFormat);
		tempTexture.minFilter = THREE.NearestFilter;
		tempTexture.needsUpdate = true;

		// MESHES
		screenPlane = new THREE.PlaneBufferGeometry(1,1, 12, 7 );

		var backgroundTexture = popcornPlayer.getTexture("background");
		console.log( "backgroundTexture: ", backgroundTexture );
		backgroundVideoMat = new THREE.MeshBasicMaterial( {
			map: backgroundTexture,
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
				map: popcornPlayer.getTexture("straight"), // videoController.getVideo("straight").t,
				aspect: 720 / 1280
			} ) );
		mouthRect.position.copy( mouthPositions["straight"] );
		slitMesh.add(mouthRect);

		// VIDEO CONTROLLER
		// videoController.playVideos();

		// LETTER BOXING
		var barGeom = new THREE.PlaneBufferGeometry(1,1, 12, 7 );
		var barMat = new THREE.MeshBasicMaterial( { side: 2, color: 0x000000 } );
		barMeshes[0] = new THREE.Mesh( barGeom, barMat );
		barMeshes[1] = new THREE.Mesh( barGeom, barMat );
		barMeshes[0].position.z = 3;
		barMeshes[1].position.z = 3;
		barMeshes[0].visible = false;
		barMeshes[1].visible = false;
		slitScene.add( barMeshes[0] );
		slitScene.add( barMeshes[1] );

		var slitWidth = 640;
		slit = new SlitScan({
			width: slitWidth,
			height: Math.floor( slitWidth / vidAspect),
			depth: isMobile ? 20 : 60,
			renderer: renderer
		});
		tracking = new AzealiaTracking({
			width: 160,
			height: 120
		});


		slitMesh.material.map = slit.texture;

		// backgroundWebcamMat = new BackgroundWebcamMaterial();
		cameraTexture = new CameraTexture({
			width: tracking.width,
			height: tracking.height,
			onGetUserMedia: function(texture)
			{
				console.log("onGetUserMedia: ", "success");
				slit.webcamMesh.material.uniforms.map.value = texture;
				HAS_WEBCAM = true;
			},
			onGetUserMediaFail: function(e)
			{
				console.log("onGetUserMediaFail:", e)
				HAS_WEBCAM = false;
			}
		});


	
		//TRACKING DEBGUG
		var debugFlipper = new THREE.Object3D();
		debugFlipper.scale.y = -1;
		videoSelectionBox = new THREE.Mesh(new THREE.PlaneBufferGeometry( 400,400), new THREE.MeshBasicMaterial( {
			transparent: true,
			opacity: .4,
			map: THREE.ImageUtils.loadTexture("images/face.png"),
			side: 2
		} ) );
		videoSelectionBox.scale.set(-1, 1, 1);
		videoSelectionBox.visible = debug
		;
		debugFlipper.add(videoSelectionBox);
		scene.add(debugFlipper);

		//RESIZE THE SCREEN PLANES
		scaleVidMesh();

		//html controls
		$("#play").click(function(){
			var wasPlaying = PLAYING;
			PLAYING = !PLAYING;
			if (!HAS_PLAYED ){
				HAS_PLAYED = true;
				// videoController.setVideoPosition(0);
				// videoController.setVolume( muteVideo? 0 : 1.0);
			}

			if ( !wasPlaying )
			{
				$("#play").html("PAUSE");
				popcornPlayer.play();
				// if(videoController.bPaused)	{
				// 	console.log( "videoController.bPaused" );
				// 	videoController.pauseVideos();
				// }else{
				// 	videoController.playVideos();
				// }
			} else {
				$("#play").html("PLAY");
				popcornPlayer.pause();
				// videoController.pauseVideos();
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

		// if ( videoController.videoToLoadCount != 0 ) return;

		slit.update();

		if(HAS_WEBCAM)
		{
			//this just updates the webcam texture(for debugging), not the canvas
			cameraTexture.update();
			tracking.update(cameraTexture.getData(), cameraTexture.width, cameraTexture.height );
			delta.copy(tracking.delta);
		}
		else
		{
			mouse.lerp( new THREE.Vector2( 0, 0 ), .015 );
			delta.copy( mouse );
			delta.x *= 3;
		}

		videoSelectionBox.setRotationFromAxisAngle({x:0,y:0,z:1}, delta.x  *.25 );
		videoSelectionBox.position.x = delta.x * -100;	
		videoSelectionBox.position.y = delta.y * -150;	


		depthSampleScale = Math.max(Math.min(1, lastDelta.distanceTo( delta ) * 50.), depthSampleScale * .985);
		slit.setDepthSampleScale( depthSampleScale * .5 + .5 );
		lastDelta.copy( tracking.delta );

		popcornPlayer.sync();

		getCurrentVideo();

		// videoController.update();

		//webcam backgroun
		var vTime = popcornPlayer.currentTime();//videoController.vidPosition.position * videoController.videoDuration;
		var bWebcamBackground1 = vTime >= webcamBackgroundTime1.start && vTime < webcamBackgroundTime1.end;
		var bWebcamBackground2 = vTime >= webcamBackgroundTime2.start && vTime < webcamBackgroundTime2.end;

		if( bWebcamBackground1 || bWebcamBackground2 )
		{
			// slit.webcamMesh.material.uniforms.time.value = clock.getElapsedTime();

			if(bFadeInWebcam)
			{
				if(bWebcamBackground1)
				{
					slit.setDistortion(0);
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
		var samplePos = videoSelectionBox.position;

		var leftRightThreshold = 110, upThreshold = 25, downThreshold = 35;
		if(samplePos.x < -leftRightThreshold)
		{
			videoSelectionBox.material.color.set(0xFF0000);
			currentVideo = "left";
		}
		else if(samplePos.x > leftRightThreshold)
		{
			videoSelectionBox.material.color.set(0x0000FF);
			currentVideo = "right";
		}
		else if(samplePos.y > upThreshold)
		{
			videoSelectionBox.material.color.set(0x00FFFF);
			currentVideo = "up";
		}
		else if(samplePos.y < -downThreshold)
		{
			videoSelectionBox.material.color.set(0xFFFF00);
			currentVideo = "down";
		}
		else{
			videoSelectionBox.material.color.set(0xFFFFFF);
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
		var t = popcornPlayer.getTexture( videoName ); //videoController.getVideo( videoName ).t;
		
		if(t !== null)
		{
			slit.setTexture( t );

			mouthRect.material.uniforms.map.value = t;
			mouthRect.position.copy( mouthPositions[ videoName ] );

			fadeMouth();
		}
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
		//to the background & slitShader to screen
		renderer.render( scene, camera, null, true );

		renderer.render( slitScene, camera, null, false );
	}

	function scaleVidMesh()
	{
		var w = window.innerWidth;
		var h = window.innerHeight;
		var wAspect = window.innerWidth / window.innerHeight;

		if(wAspect >= vidAspect)
		{
			w *= vidAspect / wAspect;
		}
		else
		{
			h *= wAspect / vidAspect;
		}

		mouthRect.material.uniforms.w.value = w / Math.max(1., window.innerWidth);
		mouthRect.material.uniforms.h.value = h / Math.max(1., window.innerHeight);

		slitMesh.scale.set( w, -h, 1);
		backgroundMesh.scale.set( w, -h, 1);
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
		// // move subtitles
		// for ( var i =0; i<window.textMeshes.length; i++ ){
		// 	var sub = window.textMeshes[i];
		// 	if ( !sub.started ){
		// 		var ran = Math.random();
		// 		if ( ran > .5 ){
		// 			sub.mesh.position.x =  -window.innerWidth * .1 - Math.random() * (window.innerWidth * .4);
		// 		} else {
		// 			sub.mesh.position.x =  window.innerWidth * .1 + Math.random() * window.innerWidth * .4;
		// 		}
		// 		sub.mesh.position.y = -window.innerHeight * .6;
		// 		sub.mesh.position.z = 1;
		// 	}
		// }
	}

	//-----------------------------------------------------------
	function onWindowResize() 
	{
		resetCamera();

		scaleVidMesh();

		positionSubtitles();

		renderer.setSize( window.innerWidth, window.innerHeight );
	}

	function onMouseMove( event , still )
	{
		event.preventDefault();
		// console.log( event );
		mouse.set( 1 + -2 * event.clientX / window.innerWidth, -1 + 2 * event.clientY / window.innerHeight );
	}
	
	function onKeyDown( event )
	{
		switch( event.keyCode )
		{
			//space bar
			case 32:
				// popcornPlayer.play();
				break;

			default:
				console.log("chill out");
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
		if ( isMobile ){
			document.addEventListener( 'touchstart', onMouseMove, false );
			document.addEventListener( 'touchmove', onMouseMove, false );
		}else{
			document.addEventListener( 'mousemove', onMouseMove, false );
			document.addEventListener( "keydown", onKeyDown, false);
		}
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