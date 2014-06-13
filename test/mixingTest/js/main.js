
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

AzealiaVideoObject.prototype.pause = function()
{
	//TODO
}

AzealiaVideoObject.prototype.play = function(position)
{
	//TODO
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

	var videoFiles = {
		"BackgroundVideo":"../WALLACE_TESTS/BacktotheCameraShotMontage_H264.mp4",
		"StraightOnVideo":"../WALLACE_TESTS/WALLACE_STRAIGHT_ON_H264.mp4",
		"DownVideo":"../WALLACE_TESTS/WALLACE_DOWN_H264.mp4",
		"LeftVideo":"../WALLACE_TESTS/WALLACE_LEFT_H264.mp4",
		"RightVideo":"../WALLACE_TESTS/WALLACE_RIGHT_H264.mp4",
		"UpVideo":"../WALLACE_TESTS/WALLACE_UP_H264.mp4",
	}

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
		// blendMaps ["circlepattern"] = THREE.ImageUtils.loadTexture( '../blendMaps/circlepattern.png' );
		// blendMaps ["floral"] = THREE.ImageUtils.loadTexture( '../blendMaps/floral.png' );
		// blendMaps["greytiles"] = THREE.ImageUtils.loadTexture( '../blendMaps/greytiles.png');
		// 
		blendMaps["horizontal_stripes"] = THREE.ImageUtils.loadTexture( '../blendMaps/horizontal_stripes.png');
		blendMaps["horizontalHardGradient"] = THREE.ImageUtils.loadTexture( '../blendMaps/horizontalHardGradient.png');
		blendMaps["skinny-stripe"] = THREE.ImageUtils.loadTexture( '../blendMaps/skinny-stripe.png');
		blendMaps["verticalHardGradient"] = THREE.ImageUtils.loadTexture( '../blendMaps/verticalHardGradient.png');
		blendMaps["zigzag"] = THREE.ImageUtils.loadTexture( '../blendMaps/zigzag.png');

		normalMaps["noise"] = THREE.ImageUtils.loadTexture( '../normalMaps/noise.png' );
		normalMaps["noise1"] = THREE.ImageUtils.loadTexture( '../normalMaps/noise1.png' );
		normalMaps["noiseSmooth"] = THREE.ImageUtils.loadTexture( '../normalMaps/noiseSmooth.png' );
		

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

		texBlendMat = new TextureBlendShader(
		{
			previousTex: videos['straightOn'].texture,
			currentTex:  videos['down'].texture,
			blendMap: blendMaps [controls.blendMap],
			mixVal: 0
		});
		renderer.initMaterial( texBlendMat, scene.__lights, scene.fog );

		vidPlane = new THREE.Mesh( new THREE.PlaneGeometry( 1,1, 12, 7 ), texBlendMat);
		scaleVidMesh();
		scene.add(vidPlane);

		//GUI
		gui.add(controls, 'normalMap', Object.keys(blendMaps) )
		.onChange(function(value) {
			this.uniforms.blendMap.value = blendMaps[value];
			console.log( blendMaps[value] );
		}.bind(texBlendMat));

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
		el.setAttribute("muted", "");
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

		texBlendMat.uniforms.mixVal.value = 0;
		texBlendMat.uniforms.previousTex.value = previousVid.texture;
		texBlendMat.uniforms.currentTex.value = currentVid.texture;

		new TWEEN.Tween(controls)
		.to({mixVal: 1}, controls.transitionSpeed)
		.delay( delay )
		.onUpdate( function( value )
		{
			controls.mixVal = value;
			texBlendMat.uniforms.mixVal.value = value;
		})
		.onComplete( function()
		{
			callback();
		})
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