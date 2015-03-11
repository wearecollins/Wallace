/**
 * AZEALIA BANKS - WALLACE
 *
 * Produced by COLLINS
 * Directed by Nick Ace and Rob Soucy
 *
 * Developed by Lars Berg and Brett Renfer for COLLINS
 * 
 * The MIT License (MIT)
 * Copyright (c) 2015 COLLINS Partners LLC
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

var app;

var LYRICS_ON 	= false;
var PLAYING		= false;
var HAS_PLAYED 	= false;
var HAS_WEBCAM 	= false;
var TEST_WEBCAM = false;

var HAS_COORS = supports_crossorigin();
var IS_SAFARI = (navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1);

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

var HAS_WEBGL 		= Modernizr.webgl;
var HAS_USER_MEDIA 	= (Modernizr.webgl ? navigator.getUserMedia === null : false );

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

	//main container
	var container = document.createElement( 'div' );

	container.style.position = 'absolute';
	container.style.left = '0px';
	container.style.top = '0px';
	document.body.appendChild( container );

	var debug = _debug;
	var useStats = debug;//_useStats || true;
	var frame = 0;

	// credits
	var fullShown = false;

	if ( debug ){
		console.log( "HAS_COORS: " + HAS_COORS );
		console.log( "IS_SAFARI: " + IS_SAFARI )
	}

	//STATS
	var stats; 

	var vidAspect = 1280 / 720;
	var renderer;
	var mouse = new THREE.Vector2(), delta = new THREE.Vector2(), lastDelta = new THREE.Vector2();

	var smallLeft = 50;
	var smallTop = 25;

	//basic stuff
	var camera, scene = new THREE.Scene(), slitScene = new THREE.Scene();
	var slitMesh;

	function resetSubtitles(){
		for ( var i =0; i<window.textMeshes.length; i++ ){
			var sub = window.textMeshes[i];
			sub.started = false;
			sub.mesh.visible = true;
			sub.mesh.parent.visible = true;
			sub.mesh.rotation.z = 0;
		}
		positionSubtitles();
	}

	function addSubtitles( subs ){
		positionSubtitles();
		for ( var i =0; i<subs.length; i++ ){
			var sub = window.textMeshes[i];
			if ( LYRICS_ON ) scene.add( sub.mesh );
		}
	}


	function kickOff()
	{
		setup();
		this.s = scene;
		events();
		animate();
		this.bgm = slitMesh;
	}

	function onReady(){

	}

	function onVideoDone(){
		resetSubtitles();
		// for now video restarts itself
	}

	var popcornPlayer;

	var mouthRect ;
	var mouthPositions = {
		"straight": new THREE.Vector3( -.01, -.18, .05 ),
		"left": new THREE.Vector3( -.07, -.15, .05 ),
		"right": new THREE.Vector3( .05, -.15, .05 ),
		"up": new THREE.Vector3( -0.0, -.1, .05 ),
		"down": new THREE.Vector3( 0., -.25, .05 )
	}

	var previousVideo;
	var currentVideo = previousVideo = "doYouLikeHorses?";

	var backgroundWebcamMat, backgroundVideoMat;
	
	// camera
	var webcam;
	var cameraTexture, slit, screenPlane, backgroundMesh, tracking, videoSelectionBox, azealiaMesh, depthSampleScale = 0;

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

		//BACKGROUND PLANE
		var backgroundTexture = popcornPlayer.getTexture("background");
		backgroundVideoMat = new THREE.MeshBasicMaterial( {
			map: backgroundTexture,
			color: 0xFFFFFF,
			side: 2 
		});
		backgroundMesh = new THREE.Mesh(screenPlane, backgroundVideoMat );
		backgroundMesh.position.z = -10;
		scene.add(backgroundMesh);

		//FORGROUND AZEALIA PLANE
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

		// LETTER BOXING
		var letterBoxGeometryTop = new THREE.PlaneBufferGeometry(1,4);
		var letterBoxGeometrySide = new THREE.PlaneBufferGeometry(1,4);

		var letterBoxeTop = new THREE.Mesh(letterBoxGeometryTop, new THREE.MeshBasicMaterial( {color: "black", side: 2} ) );
		letterBoxeTop.position.y = 2.5;

		var letterBoxeBottom = new THREE.Mesh(letterBoxGeometryTop, new THREE.MeshBasicMaterial( {color: "black", side: 2} ) );
		letterBoxeBottom.position.y = -2.5;

		slitMesh.add( letterBoxeTop );
		slitMesh.add( letterBoxeBottom );

		//SLIT
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
				if (debug) console.log("onGetUserMedia: ", "success");
				slit.webcamMesh.material.uniforms.map.value = texture;
				HAS_WEBCAM = true;
				TEST_WEBCAM = true;
				$("#calltoaction").html("Move your face.");

				//LYRICS
				//	create subtitles
				$.getJSON( "../subtitles/subtitles.json", 
					function(data) {
						var cues = data.entries;

						for ( var i=0; i<cues.length; i++){
							var cue = cues[i];
							createFallMesh( cues[i].text, timeCodeToInt(cues[i].start) );
						}

						// alert parent we're donezo
						if ( addSubtitles ) addSubtitles( window.textMeshes );
					}
				);
			},
			onGetUserMediaFail: function(e)
			{
				console.log("onGetUserMediaFail:", e)
				HAS_WEBCAM = false;
				TEST_WEBCAM = true;

				$("#calltoaction").html("Move your mouse.");

				//LYRICS
				//	create subtitles
				$.getJSON( "../subtitles/subtitles.json", 
					function(data) {
						var cues = data.entries;

						for ( var i=0; i<cues.length; i++){
							var cue = cues[i];
							createFallMesh( cues[i].text, timeCodeToInt(cues[i].start) );
						}

						// alert parent we're donezo
						if ( addSubtitles ) addSubtitles( window.textMeshes );
					}
				);
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
				// $("#play").html("PAUSE");
				popcornPlayer.play();
				$("#calltoaction").css("opacity", "0");
				$("#play").css("visibility", "hidden");
				$("#play").css("display", "none");

				// show credits
				$("#lyrics").css("visibility", "visible");
				$("#lyrics").css("display", "block");

				setTimeout(function(){
				$	("#lyrics").css("opacity", "1");
				}, 5000)

				$("#credits").addClass("credits_small");
				$("#title").addClass("title_small");
				$("#credits").css("opacity", "1");
				$(".credit").addClass("credit_small");
				$(".wallace").addClass("wallace_small");
				$(".w").addClass("ws");
				$(".full").css("visibility", "hidden");
				$(".full").css("display", "none");

				$("#cloud").css("visibility", "visible");
				$("#cloud").css("display", "block");

				$(".credits_small").css("left", smallLeft + "px");
				$(".credits_small").css("top", smallTop + "px");
				$(".credits_small").css("height", Math.max(200, window.innerHeight - (smallTop*2)) + "px");

				fullShown = false;
			} else {
				// $("#play").html("PLAY");
				// popcornPlayer.pause();
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
				$("#lyrics").html('<a href="#">No Lyrics</a>');
			} else {
				$("#lyrics").html('<a href="#">Lyrics</a>');
			}
		});

		
		$("#fullcredits").click( function(){
			fullShown = !fullShown;
			if (fullShown){
				$(".full").css("visibility", "visible");
				$(".full").css("display", "block")
			} else {
				$(".full").css("visibility", "hidden");
				$(".full").css("display", "none")
			}
		})


		function createFallMesh(string, time) {
			if ( !window.textMeshes ){
				window.textMeshes = [];
				// console.log(time)
			}

			window.textMeshes.push( {started: false, mesh:new THREE.TextTexture(string, 24, "#fff", '"Cardo" serif', "#000", 10), time:time});
		};
	
		
	}

	/**
	 * [update description]
	 * @return {[type]} [description]
	 */
	// var webcamBackgroundTime1 = {start:4, end: 110};
	var webcamBackgroundTime1 = {start:119, end: 146};
	var webcamBackgroundTime2 = {start:162.386, end: 191.124};
	var bTransitioningBackground = false, bFadeInWebcam = true;

	var overlayHidden = false;

	function hideOverlay(){
		if ( !overlayHidden ){
			overlayHidden = true;

			$("#calltoaction").css("opacity", "0");
			$("#play").css("visibility", "visible");
			$("#play").css("display", "block");
			$("#play").css("opacity", "1");
			$("#overlay").css("opacity", "0");
			$("#credits").css("opacity", "0");

			setTimeout ( function(){
				//console.log("hide")
				$("#overlay").css("display", "none");
				// $("#creditsContainer").css("display", "none");
				$("#calltoaction").css("display", "none");
				$("#overlay").css("visibility", "hidden");
				$("#calltoaction").css("visibility", "hidden");

			}, 2500)
		}
	}

	// accumulated delta
	var moved = {x:0,y:0};
	var cta_visible = true;

	function update()
	{
		frame++;

		// do we need to move our face still?
		if ( !PLAYING && cta_visible && TEST_WEBCAM ){
			moved.x += Math.abs(delta.x);
			moved.y += Math.abs(delta.y);
			if ( moved.x + moved.y > 10.0 ){
				cta_visible = false;
				hideOverlay();
			}
		}

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

		//SUBTITLES ? LYR|CS
		if(window.textMeshes !== undefined)
		{
			for ( var i=0; i<window.textMeshes.length; i++){
				if ( popcornPlayer.currentTime() >= window.textMeshes[i].time && window.textMeshes[i].started == false){
					window.textMeshes[i].started = true;
					window.textMeshes[i].mesh.rotation.z = 0;
					window.textMeshes[i].mesh.position.y = -window.innerHeight * .6;
					window.textMeshes[i].mesh.position.parent = window.textMeshes[i].mesh;
					new TWEEN.Tween(window.textMeshes[i].mesh.position)
						.to({y: window.innerHeight * .75}, 5000)
						.easing( TWEEN.Easing.Sinusoidal.Out )
						.start()
						.onComplete(function(){
							this.parent.visible = false;
						});

					new TWEEN.Tween(window.textMeshes[i].mesh.rotation)
						.to({z: Math.random() * Math.PI - Math.PI / 2.0}, 5000)
						.easing( TWEEN.Easing.Sinusoidal.Out )
						.start();
				}
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

		smallLeft 	= (window.innerWidth - w)/2.0 + 50;
		smallTop 	 = (window.innerHeight - h)/2.0 + 25;
		if ( smallLeft < 50 ) smallLeft = 50;
		if ( smallTop < 50 ) smallTop = 50;
		$(".credits_small").css("left", smallLeft + "px");
		$(".credits_small").css("top", smallTop + "px");
		$(".credits_small").css("height", Math.max(200, window.innerHeight - (smallTop*2)) + "px");
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
		if ( !window.textMeshes ) return;
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
				break;
		}
	}

	function setupWebGL()
	{
		$("#calltoaction").css("opacity", "1");
		$("#credits").css("opacity","1");
		popcornPlayer = new AzealiaPopcornPlayer({
			isVideo:  ( supports_video() && !isMobile && HAS_COORS && !IS_SAFARI) ? true : false,
			muted: muteVideo, // || !PLAYING,
			subtitleHander: addSubtitles,
			onCanPlayThrough: kickOff,
			onReady: onReady,
			onComplete: onVideoDone
		});

		popcornPlayer.setup();

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
		if ( HAS_WEBGL ) draw();

		if(useStats)
		{
			stats.update();
		}
	}

	function nonChromeFallback( isChrome, noWebGL ){
		if ( isMobile ){
			$("#credits").css("opacity","1");
			$("#calltoaction").css("top", "40%");
			$("#calltoaction").html('Please open on Google Chrome for desktop');
			
			setTimeout(function(){
				$("#credits").css("opacity","0");
				$("#overlay").css("opacity","0");
				$("#calltoaction").css("opacity","0");

				setTimeout ( function(){
					$("#creditsContainer").css("display", "none");
					$("#creditsContainer").css("visibility", "hidden");
					$("#credits").css("display", "none");
					$("#credits").css("visibility", "hidden");

					$("#calltoaction").css("display", "none");
					$("#calltoaction").css("visibility", "hidden");
					//console.log("hide")
					$("#overlay").css("display", "none");
					$("#overlay").css("visibility", "hidden");
				}, 2500)
			}, 5000);
		} else {
			var CTA = isChrome ? "Please make sure your Chrome is up to date and WebGL is enabled" : 'Please open in <a href="http://www.google.com/chrome">Google Chrome</a>';
			$("#credits").css("opacity","1");
			$("#calltoaction").html(CTA);
		}
		$("#calltoaction").css("opacity", "1");

		var underlay = document.createElement("div");
		underlay.innerHTML = '<iframe width="' + window.innerWidth+'" height="' + window.innerHeight+'" src="https://www.youtube.com/embed/6Gu28S1S64A?loop=1&autoplay=1&autohide=1&showinfo=0" frameborder="0" allowfullscreen></iframe>'
		underlay.className = "underlay";
		document.body.appendChild(underlay);
	}

	if ( ! Detector.webgl )
	{
		if ( !debug ){
			HAS_WEBGL = false;
			HAS_USER_MEDIA = false;
		}
		//Detector.addGetWebGLMessage();
		//document.getElementById( container ).innerHTML = "";
	}


	// the ultimate
	var isChrome = !!window.chrome;

	if ( HAS_WEBGL && isChrome) setupWebGL();
	else nonChromeFallback( isChrome, HAS_WEBGL );

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