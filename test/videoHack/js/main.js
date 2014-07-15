

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


	var elapsedTime = 0;

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
		softNoise: THREE.ImageUtils.loadTexture( '../blendMaps/soft_noise_sides.png'),//'../blendMaps/soft_noise.png' ),
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
		vScale: .25
	}

	var debugSphere = new THREE.Mesh( new THREE.SphereGeometry(5), new THREE.MeshBasicMaterial( {color: 0xFF2201, side: 2} ) );
	debugSphere.scale.z = 2;
	
	// transitions
	var time = {
		in: 500,
		out: 1000
	}

	function setup() 
	{
		// THREE Setup
		resetCamera()
		
		scene = new THREE.Scene();
		scene.add( camera );
		scene.add( light );
		scene.add( group );	


		worker = new Worker("js/flowWorker.js");

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
        });

		// VIDEO CONTROLLER
		videoContrller.playVideos();


		//SLIT SCANNING
		slits = new Slitter({
			renderer: renderer,
			camera: camera,
			blendMap: blendMaps.softNoise,// blendMaps.softNoise,//hardGradientDownTop,//
			currentTex: videoContrller.videos['01'].texture,
			alphaRendered: !videoContrller.backgroundRendered
		});

		scene.add(slits.mesh);
		slits.setMixValue(1);


		//MISC
		//
		//threshold lines
		if ( debug ){
			scene.add(motionThresholds.group);
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
		
	}

	/**
	 * [update description]
	 * @return {[type]} [description]
	 */

	var rate = 2;

	function update()
	{
		frame++;
		// if ( parseInt(document.getElementById("fpsText").innerHTML.substr(0,2)) < 30 ){
		// 	rate++;
		// 	console.log(rate);
		// }

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
		

		if(!bTransitioning)
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
					// startTransition(v);
					startMultiTransition(currentVideo, v);
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
		var strFromTo = from + '_' + to;

		switch(strFromTo)
		{
			// case "straight_down":
			// 	break;
			// case "down_tiltLeft":
			// 	break;
			// case "tiltLeft_straight":
			// 	break;
			// case "straight":
			// 	break;
			// 	
			// 	//TO LEFT
			case "straight_left":
				startTransition2( "left", "tiltLeft");
				break;
			case "tiltRight_left":
				startTransition2( "left", "straight");
				break;
			case "right_left":
				startTransition2( "left", "weird");
				break;
			case "up_left":
				startTransition2( "left", "tiltLeft");
				break;
			// case "down_left":
			// 	startTransition2( "left", "weird");
			// 	break;


				//TO RIGHt
			case "straight_right":
				startTransition2( "right", "tiltRight");
				break;
			case "up_right":
				startTransition2( "right", "tiltRight");
				break;
			// case "down_right":
			// 	startTransition2( "right", "weird");
			// 	break;
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
				startTransition2("down", "weird");
				break;
			case "right_down":
				startTransition2("down", "weird");
				break;
			case "up_down":
				startTransition2("down", "straight");
				break;
			case "tiltLeft_down":
				startTransition2("down", "weird");
				break;
			case "tiltRight_down":
				startTransition2("down", "weird");
				break;

				//to TILT RIGHT
			case "tiltLeft_tiltRight":
				startTransition2("tiltRight", "straight");
				break;
			case "left_tiltRight":
				startTransition2("tiltRight", "straight");
				break;
			case "down_tiltRight":
				startTransition2("tiltRight", "weird");
				break;


				//to TILT LEFT
			case "tiltRight_tiltLeft":
				startTransition2("tiltLeft", "straight");
				break;
			case "right_tiltLeft":
				startTransition2("tiltLeft", "straight");
				break;
			case "down_tiltLeft":
				startTransition2("tiltLeft", "weird");
				break;


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

		// slits.setPreviousTexture(p.t, p.uOffset);
		// slits.setCurrentTexture(c.t, c.uOffset)

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
		slits.setSlitMax(0);

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
			bTransitioning = true;
			slits.setPreviousTexture(p.t, p.uOffset);
			slits.setCurrentTexture(m.t, m.uOffset)
		})
		.onComplete(function()
		{
			//blend
			new TWEEN.Tween({value: 0})
			.onStart(function(){
				slits.setMixValue(0);
				slits.setPreviousTexture(m.t, m.uOffset);
				slits.setCurrentTexture(c.t, c.uOffset)
			})
			.onComplete(function(){
				bTransitioning = false;
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

	function startTransition( to, transitionTime, onComplete, delay, ease)
	{
		onComplete = onComplete || function(){};
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
		.onStart(function(){
			bTransitioning = true;
		})
        .easing( ease )
		.onComplete(function(){
			bTransitioning = false;

			new TWEEN.Tween({value: slits.getSlitMin()})
			.to({value: 1}, hlfTT)
			.delay(delay)
			.easing( ease )
			.onUpdate(function(value)
			{
				slits.setSlitMin(value);
			})
			.start();
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
		renderer = new THREE.WebGLRenderer( { antialias: false, devicePixelRatio: 1, alpha: true } );
		renderer.setClearColor( 0x000000, 1. );
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