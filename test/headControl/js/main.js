
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

	this.dir = params.dir || new THREE.Vector2( 0, 0 );
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
	var normalMaps = {};
	var videoTextures = {};
	var texBlendMat;
	var videoMixValue = 0;

	//HEAD TRACKING
	var parentDiv = null;
	parentDiv = document.createElement("cameraParent");
	document.body.appendChild(parentDiv);

	var videoInput = document.createElement("video");
	videoInput.id = "inputVideo";
	videoInput.width = 300;
	videoInput.height = 225;
	parentDiv.appendChild(videoInput);

	var canvasInput = document.createElement("canvas");
	canvasInput.id 		= "inputCanvas";
	canvasInput.width 	= videoInput.width;
	canvasInput.height 	= videoInput.height;
	canvasInput.style.position 	= "absolute";
	canvasInput.style.left 		= "0px";
	canvasInput.style.top 		= "0px";
	canvasInput.style.webkitTransform = "scaleX(-1)";
	parentDiv.appendChild(canvasInput);

	var canvasOverlay = document.createElement('canvas');
	canvasOverlay.id = "canvasOverlay";
	canvasOverlay.width 	= videoInput.width;
	canvasOverlay.height 	= videoInput.height;
	canvasOverlay.style.position 	= "absolute";
	canvasOverlay.style.left 		= "0px";
	canvasOverlay.style.top 		= "0px";
	canvasOverlay.style.position = "absolute";
	canvasOverlay.style.top = "0px";
	canvasOverlay.style.zIndex = "100001";
	canvasOverlay.style.display = "block";
	canvasOverlay.style.webkitTransform = "scaleX(-1)";
	parentDiv.appendChild(canvasOverlay);

	var overlayContext = canvasOverlay.getContext('2d');
	var htracker = new headtrackr.Tracker();


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
		normalMap: "noiseSmooth",
		mixVal: 1
	}

	var thresholds = {
		left: .45,
		right: .55,
		up: .4,
		down: .55,
	}

	var vidPlane;

	//fauxSlit
	var diffScene, currentDiff, previousDiff, diffMaterial, diffMesh, diffTarget0, diffTarget1;
	var tempPlane;

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

		blendMaps["transition1"] = THREE.ImageUtils.loadTexture( '../blendMaps/transition1.png' );
		blendMaps["transition2"] = THREE.ImageUtils.loadTexture( '../blendMaps/transition2.png' );
		blendMaps["transition3"] = THREE.ImageUtils.loadTexture( '../blendMaps/transition3.png' );
		blendMaps["transition4"] = THREE.ImageUtils.loadTexture( '../blendMaps/transition4.png' );
		blendMaps["transition5"] = THREE.ImageUtils.loadTexture( '../blendMaps/transition5.png' );
		blendMaps["transition6"] = THREE.ImageUtils.loadTexture( '../blendMaps/transition6.png' );


		// normalMaps["buttons"] = THREE.ImageUtils.loadTexture( '../normalMaps/buttons.png' );
		// normalMaps["flower"] = THREE.ImageUtils.loadTexture( '../normalMaps/flower.png' );
		// normalMaps["geometric"] = THREE.ImageUtils.loadTexture( '../normalMaps/geometric.png' );
		// normalMaps["honeycomb"] = THREE.ImageUtils.loadTexture( '../normalMaps/honeycomb.png' );
		// normalMaps["moss_normal_map"] = THREE.ImageUtils.loadTexture( '../normalMaps/moss_normal_map.png' );
		normalMaps["noise"] = THREE.ImageUtils.loadTexture( '../normalMaps/noise.png' );
		normalMaps["noise1"] = THREE.ImageUtils.loadTexture( '../normalMaps/noise1.png' );
		normalMaps["noiseSmooth"] = THREE.ImageUtils.loadTexture( '../normalMaps/noiseSmooth.png' );
		// normalMaps["noisy_terrain"] = THREE.ImageUtils.loadTexture( '../normalMaps/noisy_terrain.png' );
		// normalMaps["ocean_waves_normal1"] = THREE.ImageUtils.loadTexture( '../normalMaps/ocean_waves_normal1.png' );
		// normalMaps["squares"] = THREE.ImageUtils.loadTexture( '../normalMaps/squares.png' );
		// normalMaps["waves"] = THREE.ImageUtils.loadTexture( '../normalMaps/waves.png' );


		//videos textures
		videos['straightOn'] = new AzealiaVideoObject({video: document.getElementById( 'StraightOnVideo' ), dir: new THREE.Vector2(0,0)});
		videos['down'] = new AzealiaVideoObject({video: document.getElementById( 'DownVideo' ), dir: new THREE.Vector2(0,1)});
		videos['up'] = new AzealiaVideoObject({video: document.getElementById( 'UpVideo' ), dir: new THREE.Vector2(0,-1)});
		videos['left'] = new AzealiaVideoObject({video: document.getElementById( 'LeftVideo' ), dir: new THREE.Vector2(-1,0)});
		videos['right'] = new AzealiaVideoObject({video: document.getElementById( 'RightVideo' ), dir: new THREE.Vector2(1,0)});
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
		// gui.add(controls, "transitionSpeed", 100, 3000);
		// gui.add(controls, 'blendMap', Object.keys(blendMaps) )
		// .onChange(function(value) {
		// 	this.uniforms.blendMap.value = blendMaps[value];
		// 	console.log( blendMaps[value] );
		// }.bind(texBlendMat));

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

		//HEAD tracking
		htracker.init(videoInput, canvasInput);
		console.log( htracker.status );
		htracker.start();

		document.addEventListener("facetrackingEvent", function( event )
		{
			// once we have stable tracking, draw rectangle
			if (event.detection == "CS") 
			{
				// clear canvas
				overlayContext.clearRect(0,0,320,240);

				nose.x = event.x / videoInput.width;
				nose.y = (event.y - event.height * .1) / videoInput.height;

				overlayContext.translate(event.x, event.y)
				overlayContext.rotate(event.angle-(Math.PI/2));
				overlayContext.strokeStyle = "#00CC00";
				overlayContext.strokeRect((-(event.width/2)) >> 0, (-(event.height/2)) >> 0, event.width, event.height);
				overlayContext.rotate((Math.PI/2)-event.angle);
				overlayContext.translate(-event.x, -event.y);
			}
		});

		//difference render target
		diffScene = new THREE.Scene();
		currentDiff = new THREE.WebGLRenderTarget( 1280/4, 720/4, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping } );
		previousDiff = new THREE.WebGLRenderTarget( 1280/4, 720/4, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping } );

		renderer.render( diffScene, camera, currentDiff, true );
		renderer.render( diffScene, camera, previousDiff, true );

		diffMaterial = new DifferenceShader({
			previousTex: videos['straightOn'].texture,
			currentTex:  videos['down'].texture,
			lastDiffTex:  previousDiff,
			directionalTex: normalMaps[ controls.normalMap]
		});

		diffMesh = new THREE.Mesh( new THREE.PlaneGeometry( 2, 2, 12, 7 ), diffMaterial );
		diffMesh.scale.set(1,1,1);
		diffScene.add(diffMesh);

		console.log( diffMaterial );

		gui.add(controls, 'normalMap', Object.keys(normalMaps) )
		.onChange(function(value) {
			this.uniforms.directionalTex.value = normalMaps[value];
			console.log( normalMaps[value] );
		}.bind(diffMaterial));

		var bleedFolder = gui.addFolder("bleedFolder");
		bleedFolder.addFolder("bleedExpo").add(diffMaterial.uniforms.bleedExpo, "value", 1, 30);
		bleedFolder.addFolder("decay").add(diffMaterial.uniforms.decay, "value", .95, 1.).step(.0001);
		//debug
		//
		console.log( vidPlane );
		tempPlane = new THREE.Mesh( vidPlane.geometry, new THREE.MeshBasicMaterial( {map: currentDiff, side: 2} ));
		tempPlane.scale.set( window.innerWidth, -window.innerWidth / vidAscpect, 1);
		// scene.add(tempPlane);

		//kick off some random transitioning
		if(debug)	startTransition( endTransition );
	}

	/**
	 * [update description]
	 * @return {[type]} [description]
	 */
	function update()
	{
		TWEEN.update();

		if (!bTransitioning)
		{
			if(nose.x < thresholds["left"])
			{
				if(currentVid != videos["left"])
				{
					setCurrentVideo("left");
					startTransition();
				}


				// bleedDir: {type: 'v2', value: params.bleedDir || new THREE.Vector2( 0, -.0025 )},
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
		else if(!bTransitioning)
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


		// if(previousVid != currentVid)
		// {
		// }
	}

	/**
	 * DRAW
	 * @return {none} 
	 */
	function draw()
	{
		//ping pong
		var swapper = previousDiff;
		previousDiff = currentDiff;
		currentDiff = swapper;

		diffMaterial.uniforms.lastDiffTex.value = previousDiff;
		diffMaterial.uniforms.mixVal.value = texBlendMat.uniforms.mixVal.value;
		diffMaterial.uniforms.time.value = clock.getElapsedTime() * -.001;
		diffMaterial.uniforms.timeDelta.value = 1;//Math.max(1., 0.016666 / (clock.getDelta() * 6000));
		// if(clock.getElapsedTime() > 2 && clock.getElapsedTime() < 3)
		// {
		// 	var delta = clock.getDelta();
		// 	console.log( "delta", delta, delta * 6000 );
		// }

		renderer.render( diffScene, camera, currentDiff, true );

		tempPlane.material.map = currentDiff;

		texBlendMat.uniforms.blendMap.value = currentDiff;

		//to screen
		renderer.render( scene, camera, null, true );
	}


	function startTransition( callback, delay )
	{
		bTransitioning = true;
		callback = callback || endTransition;
		delay = delay || 0;

		texBlendMat.uniforms.mixVal.value = 0;
		texBlendMat.uniforms.previousTex.value = previousVid.texture,
		texBlendMat.uniforms.currentTex.value = currentVid.texture,

		diffMaterial.uniforms.mixVal.value = 0;
		diffMaterial.uniforms.previousTex.value = previousVid.texture,
		diffMaterial.uniforms.currentTex.value = currentVid.texture,

		new TWEEN.Tween(controls)
		.to({mixVal: 1}, controls.transitionSpeed)
		.delay( delay )
		.onStart( function(value)
		{

			var bleedAmount = .001;

			var deltaVec2 = previousVid.dir.clone().sub(currentVid.dir).multiplyScalar( -bleedAmount );

			diffMaterial.uniforms.bleedDir.value.copy(deltaVec2);

			new TWEEN.Tween(diffMaterial.uniforms.bleedDir.value)
			.to(deltaVec2, controls.transitionSpeed)
            .easing( TWEEN.Easing.Bounce.Out )
			.start();
		})
		.onUpdate( function( value )
		{
			controls.mixVal = value;
			texBlendMat.uniforms.mixVal.value = value;
		})
		.onComplete( callback )
		.start();
	}

	function endTransition()
	{
		bTransitioning = false;

		if(debug == true)
		{
			randomtTransition();
		}
	}

	function randomtTransition(delay)
	{
		delay = delay || THREE.Math.randInt( 1500, 2500 );
		var vids = ['straightOn', 'down', 'up', 'left', 'right'];
		var i = THREE.Math.randInt( 0, vids.length-1 );

		var count = 0;
		while(videos[vids[i]] === currentVid)
		{
			i = THREE.Math.randInt( 0, vids.length-1 );		
			count++;
			if(count >= 50)	break;
		}

		setCurrentVideo( vids[i] );
		startTransition( endTransition, delay);
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