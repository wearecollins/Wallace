var app;

var LYRICS_ON 	= false;
var PLAYING		= false;
var HAS_PLAYED 	= false;

var iOS = ( navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false );

$(window).bind("load", function() {
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

	var debug = false;//(_debug == true)? false : false;
	var useStats = debug;//_useStats || true;
	var frame = 0;

	var vidAspect = 1280 / 720;
	var gui, stats, renderer;
	var mouseDown = false, mouseDragged = false;
	var lastMouse = new THREE.Vector2(), mouse = new THREE.Vector2();

	//basic stuff
	var camera, light, projector;
	var clock = new THREE.Clock();
	var scene = new THREE.Scene();
	var group = new THREE.Object3D();

	// use alpha or background
	var useBackground = false;

	var elapsedTime = 0;

	// ABOUT
	var hasWebGL 		= true;
	var hasUserMedia 	= true;

	var backgroundMesh;
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
	var videoContrller = new MirrorVideoController({
		muteVideo: muteVideo,
		useBackground: useBackground,
		subtitleHander: addSubtitles
	});
	videoContrller.setVolume(0);

	var currentVideo = undefined, previousVideo = undefined;
	
	// camera
	var webcam;
	var cameraTexture, slit, tracking, debugBox;

	function setup() 
	{
		// THREE Setup
		resetCamera()
		
		scene = new THREE.Scene();
		scene.add( camera );
		scene.add( light );
		scene.add( group );	


		// BACKGROUND MESH
		backgroundPlane = new THREE.PlaneBufferGeometry(1,1, 12, 7 );
		backgroundMesh = new THREE.Mesh(backgroundPlane, new THREE.MeshBasicMaterial( {
			map: THREE.ImageUtils.loadTexture("images/face.png"),
			color: 0xffffff,
			side: 2 
		}) );
		scene.add(backgroundMesh);

		// VIDEO CONTROLLER
		videoContrller.playVideos();

		// LETTER BOXING
		var barGeom = new THREE.PlaneBufferGeometry(1,1, 12, 7 );
		var barMat = new THREE.MeshBasicMaterial( { side: 2, color: 0x000000 } );
		barMeshes[0] = new THREE.Mesh( barGeom, barMat );
		barMeshes[1] = new THREE.Mesh( barGeom, barMat );
		barMeshes[0].position.z = 3;
		barMeshes[1].position.z = 3;
		scene.add( barMeshes[0] );
		scene.add( barMeshes[1] );



		slit = new SlitScan({renderer: renderer});
		tracking = new AzealiaTracking({
			width: 160,
			height: 120
		});

		cameraTexture = new CameraTexture({
			width: tracking.width,
			height: tracking.height,
			onGetUserMedia: function(texture)
			{
				console.log("got user media");	

				slit.setTexture(texture);
				backgroundMesh.material.map = slit.texture;
			}
		});


		// //SLIT SCANNING
		// slit = new SlitScan({renderer: renderer});

		// //TRACKING
		// tracking = new AzealiaTracking({
		// 	width: 160,
		// 	height: 120
		// });

		// //webcam input
		// console.log( "tracking.width: " + tracking.width );
		// console.log( "tracking.height: " + tracking.height );
		// cameraTexture = new CameraTexture({
		// 	width: tracking.width,
		// 	height: tracking.height,
		// 	onGetUserMedia: function(texture)
		// 	{
		// 		// console.log("got user media");			
		// 		slit.setTexture(texture);
		// 		// backgroundMesh.material.map = texture;
		// 	}
		// });
	
		//TRACKING DEBGUG
		debugBox = new THREE.Mesh(new THREE.PlaneBufferGeometry( 100,100), new THREE.MeshBasicMaterial( {
			transparent: true,
			opacity: .4,
			map: THREE.ImageUtils.loadTexture("images/face.png"),
			side: 2
		} ) );
		debugBox.scale.set(-1, 1, 1);
		scene.add(debugBox);



		//RESIZE THE SCREEN PLANES
		scaleVidMesh();

		$("#play").click(function(){
			var wasPlaying = PLAYING;
			PLAYING = !PLAYING;
			if (!HAS_PLAYED ){
				HAS_PLAYED = true;
				videoContrller.setVideoPosition(0);
				videoContrller.setVolume(videoContrller.muteVideo? 0 : 1.0);
			}

			if ( !wasPlaying ){
				$("#play").html("PAUSE");
				videoContrller.playVideos();
			} else {
				$("#play").html("PLAY");
				videoContrller.pauseVideos();
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

	var rate = 2;
	var backgroundTime = {start:162.386, end: 191.124};
	var done = false;

	function update()
	{
		frame++;

		if ( videoContrller.videoToLoadCount != 0 ) return;
		
		//

		//this just updates the webcam texture(for debugging), not the canvas
		cameraTexture.update();
		// slit.setTexture(cameraTexture.texture);
		slit.update();
		tracking.update(cameraTexture.getData(), cameraTexture.width, cameraTexture.height );

		debugBox.setRotationFromAxisAngle({x:0,y:0,z:1}, tracking.delta.x  *.5 );
		debugBox.position.x = tracking.delta.x * -100;	
		debugBox.position.y = tracking.delta.y * -150;	


		videoContrller.update();
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
	}

	function scaleVidMesh()
	{
		var h = -window.innerWidth / vidAspect;

		var yPos = 0;

		backgroundMesh.scale.set( -window.innerWidth, h, 1);

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
			camera.top = halfHeight;
			camera.bottom = -halfHeight;

			camera.updateProjectionMatrix();	
		}
		else
		{
			camera = new THREE.OrthographicCamera( -halfWidth, halfWidth, halfHeight, -halfHeight, -1000, 1000 );
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
		switch( event.keyCode )
		{
		}
	}

	function rendererSetup()
	{
		renderer = new THREE.WebGLRenderer( { antialias: false, devicePixelRatio: 1, alpha: true } );
		renderer.setClearColor( 0x000000, 0. );
		renderer.sortObjects = false;
		renderer.setSize( window.innerWidth, window.innerHeight );
		renderer.autoClear = true;
		container.appendChild( renderer.domElement );
		container.style.zIndex = 1100;
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
	this.bgm = backgroundMesh;
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