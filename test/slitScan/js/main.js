
var app;

$(window).bind("load", function() {
	var debug = getQuerystring('debug') == "true";
	var useStats = getQuerystring('useStats') == "true";
	var muteVideo = getQuerystring('mute') == "true";
	var auto = getQuerystring('auto') == "true";
	app = new APP(useStats, debug, muteVideo, auto );
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

	console.log( muteVideo );

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

	var videoFiles = {
		"BackgroundVideo":"../WALLACE_TESTS/BG_PREVIEW_05_1.mp4",
		"StraightOnVideo":"../WALLACE_TESTS/02_ALPHA_STRAIGHT_03.mp4",
		"UpVideo":"../WALLACE_TESTS/03_ALPHA_UP.mp4.mp4",
		"DownVideo":"../WALLACE_TESTS/04_ALPHA_DOWN.mp4",
		"LeftVideo":"../WALLACE_TESTS/05_ALPHA_LEFT.mp4",
		"RightVideo":"../WALLACE_TESTS/06_ALPHA_RIGHT.mp4",
	}

	/*]
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

	var vidAscpect = 1280 / 720;
	var bTransitioning = false;
	var currentVid, previousVid;

	var videos = {};
	var blendMaps  = {};
	var normalMaps = {};
	var videoTextures = {};
	var texBlendMat;
	var videoMixValue = 0;


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

	// var controls = {
	// 	positionSmoothing: .25,
	// 	transitionSpeed: 1000,
	// 	blendMap: "softNoise",
	// 	normalMap: "noiseSmooth",
	// 	mixVal: 1
	// }

	var thresholds = {
		left: .45,
		right: .55,
		up: .55,
		down: .4,
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
	}


	var frame = 0;
	var vidPlane;
	var slitMat, blendMat;
	var slitScene = new THREE.Scene();
	var rt = new THREE.WebGLRenderTarget( 1280, 720, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping } );
	
	var rtScale = 1.;
	var slits = [];
	for(var i=0; i<15; i++)
	{
		slits[i] = new THREE.WebGLRenderTarget( 1280 * rtScale, 720 * rtScale, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping } );
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
	
	//optical flow
	var flow, flowScene, ping, pong, fstPlane;

	var debugSphere = new THREE.Mesh( new THREE.SphereGeometry(5), new THREE.MeshBasicMaterial( {color: 0xFF2201, side: 2} ) );
	debugSphere.scale.z = 2;

	function setup() 
	{
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
		blendMaps["horizontalHardGradient"] = THREE.ImageUtils.loadTexture( '../blendMaps/horizontalHardGradient.png');
		blendMaps["skinny-stripe"] = THREE.ImageUtils.loadTexture( '../blendMaps/skinny-stripe.png');
		blendMaps["verticalHardGradient"] = THREE.ImageUtils.loadTexture( '../blendMaps/verticalHardGradient.png');
		blendMaps["zigzag"] = THREE.ImageUtils.loadTexture( '../blendMaps/zigzag.png');

		//VIDEOS TEXTURES
		loadVideos();

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

		//TODO: rename slit shader mixShader
		//	make a slit shader that samples from an array of textures
		//

		var slitMesh = new THREE.Mesh( new THREE.PlaneGeometry( 2, 2, 12, 7 ), blendMat);
		slitScene.add(slitMesh);

		//draw slitTo Screen
		vidPlane = new THREE.Mesh( new THREE.PlaneGeometry( 1, 1, 12, 7 ), slitMat);
		scaleVidMesh();
		scene.add(vidPlane);

		console.log( vidPlane.material );

		//kick off some random transitioning
		if(auto)
		{
			console.log( "auto: startTransition( endTransition );" );
			startTransition( endTransition );
		}

		//loop the slit position
		
			// blendMat.uniforms.slitValue.value = 0;

			// new TWEEN.Tween(blendMat.uniforms.slitValue)
			// .to({value: 1200}, 1000)
			// .onComplete( function()
			// {
			// 	// callback();
			// })
			// .start();
			//
			 
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

		//Head Tracking
		// headtracker.setup()
		

		//optical flow
		//
		flow = new OpticalFlower();
		flow.addToGui(gui);

		var fst = new FullScreenTextureShader({map: flow.texture, width: 320, height: 240});
		fstPlane = new THREE.Mesh( new THREE.PlaneGeometry( 2, 2, 12, 7 ), fst);
		scene.add(fstPlane);
		flow.gui.addFolder("debugMesh").add(fstPlane, "visible");

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
				// console.log( thresholdLines[i] );
				thresholdLines[i].visible = value;
			}
		})
		for(var i in thresholds)
		{
			thresholdFolder.add(thresholds, i, 0, 1).onChange(updateDebugLines);
		}
	}

	/**
	 * [update description]
	 * @return {[type]} [description]
	 */
	function update()
	{
		TWEEN.update();

		flow.update();

		//TODO: reintroduce gesture direction 
		slitMat.uniforms.time.value = clock.getElapsedTime() * -.1;


		var inputThing = flow;//headtracker;

		if(debugSphere)
		{
			debugSphere.position.x = THREE.Math.mapLinear( inputThing.nose.x, 0, 1, -vidPlane.scale.x*.5, vidPlane.scale.x*.5);
			debugSphere.position.y = THREE.Math.mapLinear( inputThing.nose.y, 0, 1, -vidPlane.scale.y*.5, vidPlane.scale.y*.5);

			debugSphere.lookAt(debugSphere.position.clone().add(flow.dir));
		}

		if (!bTransitioning)
		{
			if(inputThing.nose.x < thresholds["left"])
			{
				if(currentVid != videos["left"])
				{
					setCurrentVideo("left");
					startTransition();
				}


				// bleedDir: {type: 'v2', value: params.bleedDir || new THREE.Vector2( 0, -.0025 )},
			}
			else if(inputThing.nose.x > thresholds["right"])
			{
				if(currentVid != videos["right"])
				{
					setCurrentVideo("right");
					startTransition();
				}
			}
			else
			{
				if(inputThing.nose.y > thresholds["up"])
				{

					if(currentVid != videos["up"])
					{
						setCurrentVideo("up");
						startTransition();
					}
				}
				else if(inputThing.nose.y < thresholds["down"])
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

		// else if(!bTransitioning)
		// {
		// 	var vids = ['straightOn', 'down', 'up', 'left', 'right'];

		// 	var i = THREE.Math.randInt( 0, vids.length-1 );
		// 	setCurrentVideo( vids[i] );
		// 	startTransition( endTransition, 1000);
		// }

		//update videos 
		for(var i in videos)
		{
			if (videos[i].bIsActive && videos[i].video.readyState === videos[i].video.HAVE_ENOUGH_DATA ) {
				if ( videos[i].texture ) videos[i].texture.needsUpdate = true;
			}
		}

		frame++;
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
		//flow
		flow.draw(renderer, camera);

		//SLIT
		// if(frame % 10 == 0)	slitIndex = (slitIndex+1) % slits.length; // maybe try modulating the index re-definition

		// if(frame % controls.slitStep == 0)	slits.unshift( slits.pop() );
		if(frame % controls.slitStep == 0)	slits.push( slits.shift() );
		renderer.render( slitScene, camera, slits[0], false );

		slitMat.uniforms.slits.value = slits;
		slitMat.uniforms.mixVal.value = blendMat.uniforms.mixVal.value;

		// vidPlane.material.map = slits[slitIndex];
		vidPlane.needsUpdate = true;

		//to screen
		renderer.render( scene, camera, null, true );
	}


	function loadVideos(){
		for( var id in videoFiles ){
			loadVideo( id, videoFiles[id]);
		}
		$('video').each(function() {
		    $(this).get(0).play();
		});
		//el.play();
	}

	function loadVideo( name, url ){
		var el = document.createElement( 'video' );
		el.setAttribute("loop", "");
		
		if(muteVideo == true || name != "StraightOnVideo")
		{
			el.setAttribute("muted", "");
		}
		
		el.setAttribute("id", name);
		var source = document.createElement('source');
		source.src = url;
		el.appendChild(source);
		document.body.appendChild(el);
	}

	function startTransition( callback, delay )
	{
		bTransitioning = true;
		callback = callback || endTransition;
		delay = delay || 0;


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
		delay = delay || THREE.Math.randInt( 2500, 3500 );
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

	function updateDebugLines()
	{
		thresholdLines["up"].position.y = THREE.Math.mapLinear(thresholds["up"], 0., 1, -vidPlane.scale.y * .5, vidPlane.scale.y * .5);
		thresholdLines["down"].position.y = THREE.Math.mapLinear(thresholds["down"], 0., 1, -vidPlane.scale.y * .5, vidPlane.scale.y * .5);
		thresholdLines["left"].position.x = THREE.Math.mapLinear(thresholds["left"], 0., 1, -vidPlane.scale.x * .5, vidPlane.scale.x * .5);
		thresholdLines["right"].position.x = THREE.Math.mapLinear(thresholds["right"], 0., 1, -vidPlane.scale.x * .5, vidPlane.scale.x * .5);
	}

	function scaleVidMesh()
	{
		vidPlane.scale.set( window.innerWidth, -window.innerWidth / vidAscpect, 1);

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
		console.log( event );
		switch( event.keyCode )
		{

			case 32:
				console.log( flow.dir );

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