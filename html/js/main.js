var app;

var LYRICS_ON 	= false;
var PLAYING		= false;
var HAS_PLAYED 	= false;

$(window).bind("load", function() {
	var debug = getQuerystring('debug') == "true";
	var useStats = getQuerystring('useStats') == "true";
	var muteVideo = getQuerystring('mute') == "true";
	var auto = getQuerystring('auto') == "true";
	app = new APP(useStats, debug, muteVideo, auto );
});

	var barMeshes = [];

function APP( _useStats, _debug, _muteVideo, _auto)
{
	var muteVideo = _muteVideo || !PLAYING;
	var auto = _auto || false;

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

	var motionThresholds = new MotionThresholds();

	var videoContrller = new MirrorVideoController({
		muteVideo: muteVideo,
		useBackground: useBackground,
		subtitleHander: addSubtitles
	});

	this.videoCon = videoContrller;

	var blendMaps = {
		// randomGrid: THREE.ImageUtils.loadTexture( '../blendMaps/random_grid.png' ),
		softNoise: THREE.ImageUtils.loadTexture( useBackground ? '../blendMaps/soft_noise_sides.png' : '../blendMaps/soft_noise.png' ),
		// hardGradientDownTop: THREE.ImageUtils.loadTexture('../blendMaps/hardGradientDownTop.png'),
		// hardGradientLeftRight: THREE.ImageUtils.loadTexture('../blendMaps/hardGradientLeftRight.png'),
		// hardGradientRightLeft: THREE.ImageUtils.loadTexture('../blendMaps/hardGradientRightLeft.png'),
		// hardGradientTopDown: THREE.ImageUtils.loadTexture('../blendMaps/hardGradientTopDown.png')
	};
	
	var slits, bTransitioning = false;

	var currentVideo = undefined, previousVideo = undefined;
	
	// camera
	var webcam;
	
	//optical flow
	var flow, flowScene, fstPlane;
	var flowDir = new THREE.Vector2( .5, .5 ), targetDir = new THREE.Vector2( .5, .5 ), flowSmoothing = .5, b1 = 0;
	var flowValues = {
		decay: 0.9,//.95,
		motionThreshold: 1300,
		nodMix: .3,
		vScale: .25
	}
	// simple detect
	var simpleDetector;
	var useOpticalFlow = true;

	var debugSphere = new THREE.Mesh( new THREE.SphereGeometry(5), new THREE.MeshBasicMaterial( {color: 0xffffff, side: 2} ) );
	debugSphere.scale.z = 2;
	
	// transitions
	var time = {
		in: 500,
		out: 250
	}

	function setup() 
	{
		// THREE Setup
		resetCamera()
		
		scene = new THREE.Scene();
		scene.add( camera );
		scene.add( light );
		scene.add( group );	

		if ( useOpticalFlow ){
			worker = new Worker("js/flowWorker.js");
		} else {
			simpleDetector = new SimpleMotionDetector();
		}
		webcam = new WebCam();
        webcam.onUpdated( function(){
            // console.log("yes")
           // if ( webcam.getLastPixels() ){
                worker.postMessage({
                    // last: webcam.getLastPixels(),
                    current: webcam.getCurrentPixels(),
                    width: webcam.getWidth(),
                    height: webcam.getHeight(),
                    time: new Date()
                });
            //}
        });

        /* Setup WebWorker messaging */
        var lastTime = new Date();
        worker.onmessage = function(event){

        	// console.log( event.data.time - lastTime );
        	if ( event.data.time - lastTime > 0 ){
        		lastTime = event.data.time;
        		var direction = event.data.direction;

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
            $("#cta").html("Move your mouse.<br/>Your browser doesn't support camera interaction. Please try <a href='https://www.google.com/chrome/browser/'>Chrome</a> or <a href='https://www.mozilla.org/en-US/firefox/new/'>Firefox</a>.")
        });

		// VIDEO CONTROLLER
		videoContrller.playVideos();

		// background mesh
		backgroundPlane = new THREE.PlaneGeometry(1,1, 12, 7 );
		backgroundMesh = new THREE.Mesh(backgroundPlane, new THREE.MeshBasicMaterial( { color: 0xffffff, map: videoContrller.getVideo("background").t } ));
		scene.add(backgroundMesh);

		// black bars
		var barMesh = new THREE.PlaneGeometry(1,1, 12, 7 );
		barMeshes[0] = new THREE.Mesh(barMesh, new THREE.MeshBasicMaterial( { color: 0x000000 } ));
		barMeshes[1] = new THREE.Mesh(barMesh, new THREE.MeshBasicMaterial( { color: 0x000000 } ));
		barMeshes[0].position.z = 3;
		barMeshes[1].position.z = 3;
		scene.add( barMeshes[0] );
		scene.add( barMeshes[1] );

		//SLIT SCANNING
		slits = new Slitter({
			renderer: renderer,
			camera: camera,
			blendMap: blendMaps.softNoise,// blendMaps.softNoise,//hardGradientDownTop,//
			currentTex: videoContrller.videos['01'].texture,
			alphaRendered: !videoContrller.backgroundRendered,
			doubleVideo: videoContrller.doubleWide
		});

		scene.add(slits.mesh);
		slits.mesh.position.z = 2;
		slits.setMixValue(1);


		//MISC
		//
		//threshold lines
		if ( debug ){
			//scene.add(motionThresholds.group);
			scene.add(debugSphere);
		}	
		//resize the screen planes
		scaleVidMesh();


		//GUI
		if ( debug ){
			//gui
			gui = new dat.GUI();
			var oflowFolder = gui.addFolder("oflow");
			oflowFolder.add(flowValues, "decay", .5, 1.).step(.001).onChange(function(value){
				flowSmoothing = value;
			});	
			oflowFolder.add(flowValues, "motionThreshold", 100, 6000).step(1);
			oflowFolder.add(flowValues, "vScale", 0, 1).step(.01);
			oflowFolder.add(flowValues, "nodMix", 0, 1).step(.01);

			var bmFolder = gui.addFolder("BlendMaps");
			bmFolder.add(slits, 'blendMap', Object.keys(blendMaps) )
			.onChange(function(value) {
				slits.setBlendMap(value);
			});

			var slitFolder = gui.addFolder("Slitscanning");
			slitFolder.add( slits, "slitStep", 1, 5 ).step(1);
			slitFolder.add( time, "in", 10, 2000 ).step(1);
			slitFolder.add( time, "out", 10, 2000 ).step(1);

			// move gui
			$(".dg").css("z-index", 5000);
		}
		
		$("#play").click(function(){
			var wasPlaying = PLAYING;
			PLAYING = !PLAYING;
			if (!HAS_PLAYED ){
				HAS_PLAYED = true;
				videoContrller.setVideoPosition(0);
				videoContrller.setVolume(1.0);
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

	function update()
	{
		if ( videoContrller.videoToLoadCount != 0 ) return;
		frame++;
		// if ( parseInt(document.getElementById("fpsText").innerHTML.substr(0,2)) < 30 ){
		// 	rate++;
		// 	console.log(rate);
		// }
		backgroundMesh.material.map = videoContrller.getVideo("background").t;

		if ( hasUserMedia ){
			if ( frame % rate == 0 ){
				setTimeout(webcam.updatePixels,0);
				// console.log("update");
			}
		// no user media (or they denied it), so check mouse
		} else {
			flowDir.x = flowDir.x * .9 + THREE.Math.mapLinear(mouse.x, 0.0, window.innerWidth, 0.0, 1.0) * .1;
			flowDir.y = flowDir.y * .9 + THREE.Math.mapLinear(mouse.y, 0.0, window.innerHeight, 1.0, 0.0) * .1;
		}

		videoContrller.update();

		slits.update();

		//test for motion position and start transition to new video if needed 
		

		if(bTransitioning == false)
		{
			var v = getCurrentMotionPositionsCorrespondingVideoName();

			if( v != currentVideo)
			{
				var bMulti = false;
				//multi transitioning
				//
				// left straight right
				// weird
				// left up right
				// left down right
				//  left
				// right
				// tiltLeft
				// tiltRight
				// 
				// 
				
				if(currentVideo == "straight")
				{
					console.log( v, currentVideo );
				}
				

				if(bMulti == false)
				{
					startTransition(v);
					//startMultiTransition(currentVideo, v);
				}
			}
		} 


		if ( hasUserMedia ){
			if ( frame % rate == 0 ){
				webcam.updatePixels();
				// console.log("update");
			}
		// no user media (or they denied it), so check mouse
		} else {
			var fmix = .8, mfmix = 1. - fmix;
			flowDir.x = flowDir.x * fmix + THREE.Math.mapLinear(mouse.x, 0.0, window.innerWidth, 0.0, 1.0) * mfmix;
			flowDir.y = flowDir.y * fmix + THREE.Math.mapLinear(mouse.y, 0.0, window.innerHeight, 1.0, 0.0) * mfmix;
		}

		// if ( hasWebGL )
		// {
		// 	slitMat.uniforms.time.value = clock.getElapsedTime() * -.1;

			if(debugSphere)
			{
				debugSphere.position.x = THREE.Math.mapLinear( flowDir.x, 0, 1, -motionThresholds.group.scale.x*.5, motionThresholds.group.scale.x*.5);
				debugSphere.position.y = THREE.Math.mapLinear( flowDir.y, 0, 1, -motionThresholds.group.scale.y*.5, motionThresholds.group.scale.y*.5);
			}
		// }
	}

	function startMultiTransition(from, to)
	{


		if(bTransitioning == true){
			console.log( "wtf" );
			return;
		}

		var strFromTo = from + '_' + to;

		var wrd = "weird";

		switch(strFromTo)
		{
			// 	//TO LEFT
			case "straight_left":
				startTransition2( "left", "tiltLeft");
				break;
			case "tiltRight_left":
				startTransition2( "left", "straight");
				break;
			case "right_left":
				startTransition2( "left", wrd);
				break;
			case "up_left":
				startTransition2( "left", "tiltLeft");
				break;
			case "down_left":
				startTransition2( "left", "weird");
				break;


				//TO RIGHt
			case "straight_right":
				startTransition2( "right", "tiltRight");
				break;
			case "up_right":
				startTransition2( "right", "tiltRight");
				break;
			case "down_right":
				startTransition2( "right", "weird");
				break;
			case "left_right":
				startTransition2("right", "straight");
				break;
			case "tiltLeft_right":
				startTransition2("right", "straight");
				break;

				//TO UP
			case "left_up":
				startTransition2("up", "tiltLeft");
				break;
			case "right_up":
				startTransition2("up", "tiltRight");
				break;
			case "down_up":
				startTransition2("up", "straight");
				break;


				//TO DOWN
			case "left_down":
				startTransition2("down", wrd);
				break;
			case "right_down":
				startTransition2("down", wrd);
				break;
			case "up_down":
				startTransition2("down", "straight");
				break;
			case "tiltLeft_down":
				startTransition2("down", wrd);
				break;
			case "tiltRight_down":
				startTransition2("down", wrd);
				break;

				//to TILT RIGHT
			case "tiltLeft_tiltRight":
				startTransition2("tiltRight", "straight");
				break;
			case "left_tiltRight":
				startTransition2("tiltRight", "straight");
				break;
			case "down_tiltRight":
				startTransition2("tiltRight", wrd);
				break;


				//to TILT LEFT
			case "tiltRight_tiltLeft":
				startTransition2("tiltLeft", "straight");
				break;
			case "right_tiltLeft":
				startTransition2("tiltLeft", "straight");
				break;
			case "down_tiltLeft":
				startTransition2("tiltLeft", wrd);
				break;


			//OTHER
			default:
				startTransition(to);
				break; 
		}
	}

	/**
	 * DRAW
	 * NOT called if no WebGL
	 * @return {none} 
	 */
	function draw()
	{
		//draw the slits to thier render targets
		slits.draw();
		
		//to the background & slitShader to screen
		renderer.render( scene, camera, null, true );
	}

	function startTransition2( to, midVid, transitionTime, delay, ease)
	{
		bTransitioning = true;
		
		//...
		videoContrller.setVideoActive(previousVideo, false);
		previousVideo = currentVideo;
		currentVideo = to;

		videoContrller.setVideoActive(previousVideo, true);
		videoContrller.setVideoActive(midVid, true);
		videoContrller.setVideoActive(currentVideo, true);

		var c = videoContrller.getVideo(currentVideo);
		var m = videoContrller.getVideo(midVid);
		var p = videoContrller.getVideo(previousVideo);

		if ( c == null || m == null || p == null ) return;

		// setBlendVal(0);
		slits.setMixValue(0);

		//transition tween vvalues
		transitionTime = transitionTime || time.out;
		delay = delay || 0;
		ease = ease || TWEEN.Easing.Linear.None,//TWEEN.Easing.Sinusoidal.InOut;
		slits.setMixValue(0);
		var hlfTT = transitionTime * .5;


		//SLIT tweens for min and max sliting values
		slits.setSlitMin(0);
		// slits.setSlitMax(0);

		// /slit - increase the slitMax from 0 -> 1
		new TWEEN.Tween({value: slits.getSlitMax()})
		.to({value: 1}, hlfTT)
		.delay(delay)
		.easing( ease )
		.onUpdate(function(value)
		{
			slits.setSlitMax(value);
		})
		.start();

		//BLEND tweens for blending the current, mid and previous videos
		new TWEEN.Tween({value: 0})
		.onStart(function(){
			slits.setPreviousTexture(p.t, p.uOffset);
			slits.setCurrentTexture(m.t, m.uOffset)
		})
		.onComplete(function()
		{
			// var cv = getCurrentMotionPositionsCorrespondingVideoName();
			// if(cv != currentVideo && cv != previousVideo)
			// {
			// 	videoContrller.setVideoActive(currentVideo, false);
			// 	currentVideo = cv;//getCurrentMotionPositionsCorrespondingVideoName();
			// 	c = videoContrller.getVideo(currentVideo);
			// 	videoContrller.setVideoActive(currentVideo, true);	
			// }
			
			videoContrller.setVideoActive(currentVideo, false);
			currentVideo = getCurrentMotionPositionsCorrespondingVideoName();
			c = videoContrller.getVideo(currentVideo);

			videoContrller.setVideoActive(currentVideo, true);	

			//blend
			new TWEEN.Tween({value: 0})
			.onStart(function(){
				slits.setMixValue(0);
				slits.setPreviousTexture(m.t, m.uOffset);
				slits.setCurrentTexture(c.t, c.uOffset)
			})
			.onComplete(function(){
				setTimeout(function(){
					bTransitioning = false;
				}, 100);
			})
			.to({value: 1}, hlfTT)
			.onUpdate( function( value )
			{
				slits.setMixValue(value);
			})
			.start();

			//slit- bring the slitmin up to meet the slitmax
			new TWEEN.Tween({value: slits.getSlitMin()})
			.to({value: 1}, hlfTT)
			.onUpdate(function(value)
			{
				slits.setSlitMin(value);
			})
			.start();
		})
        .easing( ease )
		.to({value: 1}, hlfTT)
		.delay( delay)
		.onUpdate( function( value )
		{
			slits.setMixValue(value);
		})
		.start();

	}

	function startTransition( to, transitionTime, delay, ease)
	{
		bTransitioning = true;

		//...
		videoContrller.setVideoActive(previousVideo, false);
		previousVideo = currentVideo;
		currentVideo = to;

		videoContrller.setVideoActive(previousVideo, true);
		videoContrller.setVideoActive(currentVideo, true);

		var c = videoContrller.getVideo(currentVideo);
		var p = videoContrller.getVideo(previousVideo);

		slits.setPreviousTexture(p.t, p.uOffset);
		slits.setCurrentTexture(c.t, c.uOffset)

		// setBlendVal(0);
		slits.setMixValue(0);

		//transition tween vvalues
		transitionTime = transitionTime || time.in;
		delay = delay || 0;
		ease = ease || TWEEN.Easing.Sinusoidal.Out;
		slits.setMixValue(0);
		var hlfTT = transitionTime * .5;

		//SLIT tweens for min and max sliting values
		slits.setSlitMin(0);
		slits.setSlitMax(0);

		// /slit
		new TWEEN.Tween({value: slits.getSlitMax()})
		.to({value: 1}, hlfTT)
		.delay(delay)
		.easing( ease )
		.onUpdate(function(value)
		{
			slits.setSlitMax(value);
		})
		.start();


		//tween for blending the current and previous videos
		new TWEEN.Tween({value: 0})
        .easing( ease )
		.onComplete(function(){

			new TWEEN.Tween({value: slits.getSlitMin()})
			.to({value: 1}, hlfTT)
			.delay(delay)
			.easing( ease )
			.onUpdate(function(value)
			{
				slits.setSlitMin(value);
			})
			.onComplete(function()
			{
				setTimeout(function(){
					bTransitioning = false;
				}, 100);
			})
			.start();
		})
		.to({value: 1}, transitionTime)
		.delay( delay)
		.onUpdate( function( value )
		{
			slits.setMixValue(value);
		})
		.start();
	}

	function getCurrentMotionPositionsCorrespondingVideoName()
	{
		//TODO: replace with motion tracking
		return motionThresholds.getVideoName(flowDir.x, flowDir.y);
	}

	function setBlendVal(blendVal)
	{
		slits.setMixValue(blendVal);
	}

	function scaleVidMesh()
	{
		var h = -window.innerWidth / vidAspect;

		var yPos = 0;

		slits.mesh.scale.set( window.innerWidth, h, 1);
		motionThresholds.group.scale.set( window.innerWidth, h, 1);
		backgroundMesh.scale.set( window.innerWidth, h, 1);

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