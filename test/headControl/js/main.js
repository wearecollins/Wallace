
var app;



$(window).bind("load", function() {
	var debug = getQuerystring('debug') == "true";
	var useStats = getQuerystring('useStats') == "true";
	app = new APP(useStats, debug );
});

var AzealiaVideoObject = function(params)
{
	this.video = params.video;
	this.texture = new THREE.Texture( this.video );
	
	this.texture.minFilter = THREE.LinearFilter;
	this.texture.magFilter = THREE.LinearFilter;
	this.texture.format = THREE.RGBFormat;
	this.texture.generateMipmaps = false;
	this.texture.needsUpdate = false;	//

	this.bIsActive = params.bIsActive || false;
}


function APP( _useStats, _debug)
{

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
	 */

	var vidAscpect = 1280 / 720;
	var bTransitioning = false;
	var currentVid, previousVid;

	var videos = {};
	var blendMaps = {};

	var vidMat;

	var texBlendMat;

	var videoTextures = {};

	var videoMixValue;

	//FACE 
	var faceTracker;
	//face tracking setup
	faceTracker = new FaceTracker();
	faceTracker.setup();
	var clmStats = new Stats();
	clmStats.domElement.style.position = 'absolute';
	clmStats.domElement.style.top = '10px';
	clmStats.domElement.style.left = '485px';

    // update stats on every iteration
    document.addEventListener('clmtrackrIteration', function(event) {
        clmStats.update();
    }, false);

	container.appendChild( clmStats.domElement );


	var debug = _debug || true;
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
	
	var eyeAngle = 0;

	var horizontal = new THREE.Vector3(1, 0, 0);
	var verticle = new THREE.Vector3(0,1,0);

	var leftEye = new THREE.Vector3(.45, .45, 0);
	var rightEye = new THREE.Vector3(.55, .45, 0);
	var nose = new THREE.Vector2(.5, .5);

	var rotScalar = new THREE.Vector3(2, 5, .5);

	var controls = {
		positionSmoothing: .25,
		transitionSpeed: 1000,
		blendMap: "softNoise",
	}

	var thresholds = {
		left: .45,
		right: .55,
		up: .4,
		down: .55,
	}

	var vidPlane;

	function setup() 
	{
		//three setup
		// camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 20000 );
		// camera.position.z = 500;
		resetCamera();

		projector = new THREE.Projector();

		light = new THREE.PointLight();
		light.position = camera.position;

		scene = new THREE.Scene();
		scene.add( camera );
		scene.add( light );
		scene.add( group );	

		//blend textures
		blendMaps["hardNoise"] = THREE.ImageUtils.loadTexture( '../blendMaps/hard_noise.png' );
		blendMaps["randomGrid"] = THREE.ImageUtils.loadTexture( '../blendMaps/random_grid.png' );
		blendMaps["softNoise"] = THREE.ImageUtils.loadTexture( '../blendMaps/soft_noise.png' );
		blendMaps["Checker"] = THREE.ImageUtils.loadTexture( '../blendMaps/Checker.png' );
		blendMaps["circlepattern"] = THREE.ImageUtils.loadTexture( '../blendMaps/circlepattern.png' );
		blendMaps["floral"] = THREE.ImageUtils.loadTexture( '../blendMaps/floral.png' );

		blendMaps["downToUp"] = THREE.ImageUtils.loadTexture( '../blendMaps/down_to_up.png' );
		blendMaps["leftToRight"] = THREE.ImageUtils.loadTexture( '../blendMaps/left_to_right.png' );
		blendMaps["rightToLeft"] = THREE.ImageUtils.loadTexture( '../blendMaps/right_to_left.png' );
		blendMaps["upToDown"] = THREE.ImageUtils.loadTexture( '../blendMaps/up_to_down.png' );

		//videos textures
		videos['straightOn'] = new AzealiaVideoObject({video: document.getElementById( 'StraightOnVideo' )});
		videos['down'] = new AzealiaVideoObject({video: document.getElementById( 'DownVideo' )});
		videos['up'] = new AzealiaVideoObject({video: document.getElementById( 'UpVideo' )});
		videos['left'] = new AzealiaVideoObject({video: document.getElementById( 'LeftVideo' )});
		videos['right'] = new AzealiaVideoObject({video: document.getElementById( 'RightVideo' )});
		videos['background'] = new AzealiaVideoObject({video: document.getElementById( 'BackgroundVideo' ), bIsActive: true});

		videos['straightOn'].bIsActive = true;
		videos['down'].bIsActive = true;

		currentVid = videos['straightOn'];
		previousVid = videos['down'];

		texBlendMat = new TextureBlendShader(
		{
			previousTex: videos['straightOn'].texture,
			currentTex:  videos['down'].texture,
			backgroundTex:  videos['background'].texture,
			blendMap: blendMaps[controls.blendMap],
			mixVal: .5
		});
		renderer.initMaterial( texBlendMat, scene.__lights, scene.fog );

		vidPlane = new THREE.Mesh( new THREE.PlaneGeometry( 1,1, 12, 7 ), texBlendMat);
		scaleVidMesh();
		scene.add(vidPlane);

		// gui.add(controls, "positionSmoothing", .001, 1);
		gui.add(controls, "transitionSpeed", 100, 3000);
		gui.add(controls, 'blendMap', Object.keys(blendMaps) )
		.onChange(function(value) {
			this.uniforms.blendMap.value = blendMaps[value];
			console.log( blendMaps[value] );
		}.bind(texBlendMat));

		gui.remember(controls);

		var thresholdGui = gui.addFolder("thresholds");
		for(var i in thresholds)
		{
			thresholdGui.add(thresholds, i, 0, 1);
		}
		gui.remember(thresholds);

		var shaderFolder = gui.addFolder("shader");
		shaderFolder.addFolder("alphaThreshold").add(texBlendMat.uniforms.alphaThreshold, "value", .01, 5.);
		shaderFolder.addFolder("offset").add(texBlendMat.uniforms.offset, "value", .001, 1.);
		shaderFolder.addFolder("K0").add(texBlendMat.uniforms.K0, "value", .001, 1.);
		shaderFolder.addFolder("K1").add(texBlendMat.uniforms.K1, "value", .001, 1.);
		shaderFolder.addFolder("K2").add(texBlendMat.uniforms.K2, "value", .001, 1.);

		startTransition( endTransition );
	}

	function startTransition( callback, delay )
	{
		bTransitioning = true;
		callback = callback || endTransition;
		delay = delay || 0;

		texBlendMat.uniforms.mixVal.value = 0;
		texBlendMat.uniforms.previousTex.value = previousVid.texture,
		texBlendMat.uniforms.currentTex.value = currentVid.texture,

		new TWEEN.Tween({mixVal: 0 })
		.to({mixVal: 1}, controls.transitionSpeed)
		.delay( delay )
		.onUpdate( function( value )
		{
			texBlendMat.uniforms.mixVal.value = value;
		})
		.onComplete( callback )
		.start();
	}

	function endTransition()
	{
		bTransitioning = false;
	}

	/**
	 * [update description]
	 * @return {[type]} [description]
	 */
	function update()
	{
		TWEEN.update();

		faceTracker.update();
		// nosePosition = 
		// 
		var positions = faceTracker.tracker.getCurrentPosition();
		//if it's psossible to not calc the mouth we might save a few fps


		if (!bTransitioning && positions)
		{
			// 0-14 are chin
			// 15-22 are eyebrows
			// 23-26 are main left eye
			// 27 is center left eye
			var _leftEye = new THREE.Vector3();
			var _rightEye = new THREE.Vector3();
			var _nose = new THREE.Vector3();

			
			_leftEye.x = positions[27][0]/faceTracker.canvas.width;
			_leftEye.y = positions[27][1]/faceTracker.canvas.height;

			// 28-31 are main right eye
			// 32 is center right eye
			_rightEye.x = positions[32][0]/faceTracker.canvas.width;
			_rightEye.y = positions[32][1]/faceTracker.canvas.height;
			
			// 33-43 are main nose points (37 is bottom center)
			_nose.x = positions[35][0]/faceTracker.canvas.width;
			_nose.y = positions[33][1]/faceTracker.canvas.height;

			leftEye.lerp(_leftEye, controls.positionSmoothing);
			rightEye.lerp(_rightEye, controls.positionSmoothing);
			nose.lerp(_nose, controls.positionSmoothing); 


			if(bTransitioning == false)
			{
				if(nose.x < thresholds["left"])
				{
					if(currentVid != videos["left"])
					{
						setCurrentVideo("left");
						startTransition();
					}
				}
				else if(nose.x > thresholds["right"])
				{
					if(currentVid != videos["right"])
					{
						setCurrentVideo("right");
						startTransition();
					}
				}
				else
				{
					if(nose.y < thresholds["up"])
					{

						if(currentVid != videos["up"])
						{
							setCurrentVideo("up");
							startTransition();
						}
					}
					else if(nose.y > thresholds["down"])
					{
						if(currentVid != videos["down"])
						{
							setCurrentVideo("down");
							startTransition();
						}
					}
					else
					{
						if(currentVid != videos["straightOn"])
						{
							setCurrentVideo("straightOn");
							startTransition();
						}
					}
				}
			}
		}
		else if(!bTransitioning && faceTracker.bStarted == false)
		{
			var vids = ['straightOn', 'down', 'up', 'left', 'right'];

			var i = THREE.Math.randInt( 0, vids.length-1 );
			setCurrentVideo( vids[i] );
			startTransition( endTransition, 1000);
		}

		//update videos 
		for(var i in videos)
		{
			if (videos[i].bIsActive && videos[i].video.readyState === videos[i].video.HAVE_ENOUGH_DATA ) {
				if ( videos[i].texture ) videos[i].texture.needsUpdate = true;
			}
		}
	}

	function setCurrentVideo(name)
	{
		previousVid.bIsActive = false;
		previousVid = currentVid;
		currentVid = videos[name];
		currentVid.bIsActive = previousVid.bIsActive = true;
	}

	/**
	 * DRAW
	 * @return {none} 
	 */
	function draw()
	{
		faceTracker.draw();
		renderer.render( scene, camera, null, true );
	}

	function scaleVidMesh()
	{
		vidPlane.scale.set( window.innerWidth, -window.innerWidth / vidAscpect, 1);
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
			camera = new THREE.OrthographicCamera( -halfWidth, halfWidth, -halfHeight, halfHeight, -10, 10 );
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
		renderer.setSize( window.innerWidth, window.innerHeight );
	}

	function onMouseMove( event , still )
	{
		mouse.set( event.x, event.y );

		if(mouseDown)
		{
			onMouseDragged( event );
		}

		lastMouse.set( mouse.x, mouse.y );
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
		// console.log( event );
		switch( event.keyCode )
		{

			case 32:
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

		renderer = new THREE.WebGLRenderer( { antialias: true } );
		renderer.setClearColor( 0x444447 );
		renderer.sortObjects = false;
		renderer.setSize( window.innerWidth, window.innerHeight );
		renderer.autoClear = false;
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
		draw();

		if(useStats)
		{
			stats.update();
		}
	}

	if ( ! Detector.webgl )
	{
		Detector.addGetWebGLMessage();
		document.getElementById( container ).innerHTML = "";
	}


	rendererSetup();
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