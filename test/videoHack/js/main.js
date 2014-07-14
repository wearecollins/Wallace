

var app;

$(window).bind("load", function() {
	var debug = getQuerystring('debug') == "true";
	var useStats = getQuerystring('useStats') == "true";
	var muteVideo = getQuerystring('mute') == "true";
	var auto = getQuerystring('auto') == "true";
	app = new APP(useStats, debug, muteVideo, auto );
});


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

	var debug = _debug || false;
	var useStats = _useStats || true;
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


	var elapsedTime = 0;

	//gui
	var gui = new dat.GUI();


	// ABOUT
	var hasWebGL 		= true;
	var hasUserMedia 	= true;

	var backgroundMesh;

	var controls = {
		slitStep: 2
	}

	var motionThresholds = new MotionThresholds();

	var videoContrller = new MirrorVideoController({
		muteVideo: muteVideo
	});

	this.videoCon = videoContrller;

	var blendMaps = {
		randomGrid: THREE.ImageUtils.loadTexture( '../blendMaps/random_grid.png' ),
		softNoise: THREE.ImageUtils.loadTexture( '../blendMaps/soft_noise.png' ),
		hardGradientDownTop: THREE.ImageUtils.loadTexture('../blendMaps/hardGradientDownTop.png'),
		hardGradientLeftRight: THREE.ImageUtils.loadTexture('../blendMaps/hardGradientLeftRight.png'),
		hardGradientRightLeft: THREE.ImageUtils.loadTexture('../blendMaps/hardGradientRightLeft.png'),
		hardGradientTopDown: THREE.ImageUtils.loadTexture('../blendMaps/hardGradientTopDown.png')
	};
	
	var slits, bTransitioning = false;

	var currentVideo = undefined, previousVideo = undefined;

	//optical flow
	var webcam;
	var flow, flowScene, fstPlane;
	var flowDir = new THREE.Vector2( .5, .5 ), targetDir = new THREE.Vector2( .5, .5 ), flowSmoothing = .5, b1 = 0;
	var flowValues = {
		decay: .95,
		motionThreshold: 1500,
		nodMix: .3,
		vScale: .2
	}

	var debugSphere = new THREE.Mesh( new THREE.SphereGeometry(5), new THREE.MeshBasicMaterial( {color: 0xFF2201, side: 2} ) );
	debugSphere.scale.z = 2;
	
	function setup() 
	{
		// THREE Setup
		resetCamera()
		
		scene = new THREE.Scene();
		scene.add( camera );
		scene.add( light );
		scene.add( group );	


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



		// if ( hasWebGL ){
		// 	// optical flow debug canvas
			
		// 	// optical flow debug canvas
		// 	if ( debugCanvas ){
		// 		ofCanvas = document.createElement("canvas");
		// 		document.body.appendChild(ofCanvas);
		// 		ofCanvas.setAttribute("width", 640);
		// 		ofCanvas.setAttribute("height", 480);
		// 		ofCanvas.style.position = "absolute";
		// 		ofCanvas.style.top = "0px";
		// 		ofCanvas.style.left = "0px";
		// 		ofCanvas.style.zIndex = "1000";
		// 		ofCtx = ofCanvas.getContext("2d");
		// 	}
		// 	// setup web cam and optical flow worker
			
		// 	worker = new Worker("js/flowWorker.js");

		// 	webcam = new oflow.WebCam();
	 //        webcam.onUpdated( function(){
	 //            // console.log("yes")
	 //            if ( webcam.getLastPixels() ){
	 //                worker.postMessage({
	 //                    last: webcam.getLastPixels(),
	 //                    current: webcam.getCurrentPixels(),
	 //                    width: webcam.getWidth(),
	 //                    height: webcam.getHeight(),
	 //                    time: new Date()
	 //                });
	 //            }
	 //        });

	 //        /* Setup WebWorker messaging */
	 //        var lastTime = new Date();
	 //        worker.onmessage = function(event){

	 //        	// console.log( event.data.time - lastTime );
	 //        	if ( event.data.time - lastTime > 0 ){
	 //        		lastTime = event.data.time;
	 //        		var direction = event.data.direction;

		//         	// draw
		//         	if ( debugCanvas ){
		//         		ofCtx.clearRect(0, 0, 640, 480);
		// 	            for(var i = 0; i < direction.zones.length; ++i) {
		// 	                var zone = direction.zones[i];
		// 	                ofCtx.strokeStyle = getDirectionalColor(zone.u, zone.v);
		// 	                ofCtx.beginPath();
		// 	                ofCtx.moveTo(zone.x,zone.y);
		// 	                ofCtx.lineTo((zone.x - zone.u), zone.y + zone.v);
		// 	                ofCtx.stroke();
		// 	            }
		//         	}


		// 			if(direction.averageMotionPos.numVals > flowValues.motionThreshold)
		// 			{
		//             targetDir.x = 1. - event.data.direction.averageMotionPos.x;
		//             // targetDir.y = 1. - event.data.direction.averageMotionPos.y;

		// 			b1 = b1 * (1 - flowValues.nodMix) + event.data.direction.v * flowValues.nodMix;
		// 			targetDir.y = -b1 * flowValues.vScale + .5; 
		// 			}


		// 			flowDir.x = flowDir.x * flowSmoothing + (targetDir.x) * (1 - flowSmoothing);
		// 			flowDir.y = flowDir.y * flowSmoothing + (targetDir.y) * (1 - flowSmoothing);
	 //        	}
	            
	 //        };

	 //        // set up w/o starting animation
	 //        // error callback determines next stuff
	 //        webcam.startCapture(false, function (e){
		// 		hasUserMedia = false;

	 //        	if(e.code === 1){
	 //                console.error('You have denied access to your camera. I cannot do anything.');
	 //                // here we could do an "are you sure?" pop up that would refresh the page?
	 //            } else { 
	 //            	// we just don't have it!
	 //            }
	 //        });

		// 	// Starts capturing the flow from webcamera:
		// 	var oflowFolder = gui.addFolder("oflow");
		// 	oflowFolder.add(flowValues, "decay", .5, 1.).step(.001).onChange(function(value){
		// 		flowSmoothing = value;
		// 	});	
		// 	oflowFolder.add(flowValues, "motionThreshold", 100, 6000).step(1);
		// 	oflowFolder.add(flowValues, "vScale", 0, 1).step(.01);
		// 	oflowFolder.add(flowValues, "nodMix", 0, 1).step(.01);

		// 	//THREE SETUP
		// 	resetCamera();

		// 	projector = new THREE.Projector();

		// 	light = new THREE.PointLight();
		// 	light.position = camera.position;

		// 	scene = new THREE.Scene();
		// 	scene.add( camera );
		// 	scene.add( light );
		// 	scene.add( group );	

		// 	//blend textures
		// 	blendMaps ["hardNoise"] = THREE.ImageUtils.loadTexture( '../blendMaps/hard_noise.png' );
		// 	blendMaps ["randomGrid"] = THREE.ImageUtils.loadTexture( '../blendMaps/random_grid.png' );
		// 	blendMaps ["softNoise"] = THREE.ImageUtils.loadTexture( '../blendMaps/soft_noise.png' );
		// 	blendMaps ["Checker"] = THREE.ImageUtils.loadTexture( '../blendMaps/Checker.png' );
		// 	blendMaps["horizontal_stripes"] = THREE.ImageUtils.loadTexture( '../blendMaps/horizontal_stripes.png');
		// 	blendMaps["hardGradientDownTop"] = THREE.ImageUtils.loadTexture('../blendMaps/hardGradientDownTop.png');
		// 	blendMaps["hardGradientLeftRight"] = THREE.ImageUtils.loadTexture('../blendMaps/hardGradientLeftRight.png');
		// 	blendMaps["hardGradientRightLeft"] = THREE.ImageUtils.loadTexture('../blendMaps/hardGradientRightLeft.png');
		// 	blendMaps["hardGradientTopDown"] = THREE.ImageUtils.loadTexture('../blendMaps/hardGradientTopDown.png');

		// 	blendMaps["verticalHardGradient"] = THREE.ImageUtils.loadTexture( '../blendMaps/verticalHardGradient.png');
		// 	blendMaps["zigzag"] = THREE.ImageUtils.loadTexture( '../blendMaps/zigzag.png');
		// }
		

		// VIDEO CONTROLLER
		videoContrller.playVideos();


		//SLIT SCANNING
		slits = new Slitter({
			renderer: renderer,
			camera: camera,
			blendMap: blendMaps.softNoise,//hardGradientDownTop,//
			currentTex: videoContrller.videos['01'].texture,
		});

		scene.add(slits.mesh);
		slits.setMixValue(1);


		//MISC
		//
		//threshold lines
		scene.add(motionThresholds.group);
		scene.add(debugSphere);
		
		//resize the screen planes
		scaleVidMesh();


		//GUI
		
		$(gui.domElement)[0].onmouseover = function(e){	console.log( "bMouseOverGui" );}
		$(gui.domElement)[0].onmouseout = function(e){	console.log( "bMouseOverGui" );}

		gui.add({"click": function(){console.log( "click" );}}, "click");
		
		// var oflowFolder = gui.addFolder("oflow");
		// oflowFolder.add(flowValues, "decay", .5, 1.).step(.001).onChange(function(value){
		// 	flowSmoothing = value;
		// });	
		// oflowFolder.add(flowValues, "motionThreshold", 100, 6000).step(1);
		// oflowFolder.add(flowValues, "vScale", 0, 1).step(.01);
		// oflowFolder.add(flowValues, "nodMix", 0, 1).step(.01);
		
		// var bmFolder = gui.addFolder("BlendMaps");
		// bmFolder.add(slits, 'blendMap', Object.keys(blendMaps) )
		// .onChange(function(value) {
		// 	slits.setBlendMap(value);
		// });
		
		// move gui
		$(".dg").css("z-index", 5000);
	}

	/**
	 * [update description]
	 * @return {[type]} [description]
	 */

	var rate = 2;

	function update()
	{
		frame++;

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

		videoContrller.update();

		slits.update();

		//test for motion position and start transition to new video if needed 
		

		if(!bTransitioning)
		{
			var v = getCurrentMotionPositionsCorrespondingVideoName();

			if( v != currentVideo)
			{
				videoContrller.setVideoActive(previousVideo, false);
				previousVideo = currentVideo;
				currentVideo = v;

				videoContrller.setVideoActive(previousVideo, true);
				videoContrller.setVideoActive(currentVideo, true);

				var c = videoContrller.getVideo(currentVideo);
				var p = videoContrller.getVideo(previousVideo);

				slits.setPreviousTesture(p.t, p.uOffset);
				slits.setCurrentTesture(c.t, c.uOffset)

				setBlendVal(0);

				startTransition();
			}
		} 


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

	function startTransition(transitionTime, delay, ease)
	{
		transitionTime = transitionTime || 1000;
		delay = delay || 0;
		ease = ease || TWEEN.Easing.Sinusoidal.Out;
		slits.setMixValue(0);

		//tween for blending the current and previous videos
		new TWEEN.Tween({value: 0})
		.onStart(function(){
			bTransitioning = true;
		})
        .easing( ease )
		.onComplete(function(){
			bTransitioning = false;
		})
		.to({value: 1}, transitionTime)
		.delay( delay)
		.onUpdate( function( value )
		{
			slits.setMixValue(value);
			// controls.mixVal = value;
			// texBlendMat.uniforms.mixVal.value = value;
		})
		.start();

		//tweens for min and max sliting values
		slits.setSlitMin(0);
		slits.setSlitMax(1);
		var hlfTT = transitionTime;// * .5;



		new TWEEN.Tween({value: slits.getSlitMin()})
		.to({value: 1}, transitionTime)
		.delay(delay)
		.easing( ease )
		.onUpdate(function(value)
		{
			slits.setSlitMin(value);
		})
		.start();

		// new TWEEN.Tween({value: slits.getSlitMax()})
		// .to({value: 1}, hlfTT * .5)
		// .delay(delay)
  //       .easing( ease )
		// .onUpdate(function(value)
		// {
		// 	slits.setSlitMax(value);
		// })
		// .start();

		// new TWEEN.Tween({value: slits.getSlitMin()})
		// .to({value: 1}, hlfTT * .5)
		// .delay(delay + hlfTT * .5)
		// .easing( ease )
		// .onUpdate(function(value)
		// {
		// 	slits.setSlitMin(value);
		// })
		// .start();
	}

	function getCurrentMotionPositionsCorrespondingVideoName()
	{
		//TODO: replace with motion tracking
		return motionThresholds.getVideoName(flowDir.x, flowDir.y);// mouse.x / window.innerWidth, mouse.y / window.innerHeight);
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

		// if(fstPlane !== undefined)
		// {
		// 	fstPlane.material.uniforms.screendim.value.set(window.innerWidth, window.innerHeight );
		// }

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
		console.log( event.keyCode );
		switch( event.keyCode )
		{

			case 32:
				// pauseVideos();
				videoContrller.setVideoTime(80);

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

		renderer = new THREE.WebGLRenderer( { antialias: true, devicePixelRatio: 1, alpha: true } );
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