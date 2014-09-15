var app;



$(window).bind("load", function() {
	var debug = getQuerystring('debug') == "true";
	var useStats = getQuerystring('useStats') == "true";
	app = new APP(useStats, debug );
});


function APP( _useStats, _debug)
{
	//FACE 
	var faceTracker;
	//face tracking setup
	faceTracker = new FaceTracker();
	faceTracker.setup();

	//main container
	var container = document.createElement( 'div' );
	document.body.appendChild( container );


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
	var leftEye = new THREE.Vector2(.45, .45);
	var rightEye = new THREE.Vector2(.55, .45);
	var nose = new THREE.Vector2(.5, .5);

	function setup() 
	{

		//three setup
		camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 20000 );
		camera.position.z = 500;
		// camera = new THREE.OrthographicCamera( 0, window.innerWidth, 0, window.innerHeight, -1000, 1000 );

		projector = new THREE.Projector();

		light = new THREE.PointLight();
		light.position = camera.position;

		scene = new THREE.Scene();
		scene.add( camera );
		scene.add( light );
		scene.add( group );	

		var cube = new THREE.Mesh( new THREE.BoxGeometry( 100, 100, 100 ), new THREE.MeshBasicMaterial( {wireframe: true, wireframeLinewidth: 4} ));
		group.add( cube );
	}

	/**
	 * [update description]
	 * @return {[type]} [description]
	 */
	function update()
	{
		// nosePosition = 
		// 
		var positions = faceTracker.tracker.getCurrentPosition();
		//if it's psossible to not calc the mouth we might save a few fps


		if (positions)
		{
			// 0-14 are chin
			// 15-22 are eyebrows
			// 23-26 are main left eye
			// 27 is center left eye
			
			leftEye.x = positions[27][0]/faceTracker.canvas.width;
			leftEye.y = positions[27][1]/faceTracker.canvas.height;

			// 28-31 are main right eye
			// 32 is center right eye
			rightEye.x = positions[32][0]/faceTracker.canvas.width;
			rightEye.y = positions[32][1]/faceTracker.canvas.height;
			
			// 33-43 are main nose points (37 is bottom center)
			nose.x = positions[35][0]/faceTracker.canvas.width;
			nose.y = positions[33][1]/faceTracker.canvas.height;
		}

		group.rotation.y = ((nose.x-.5) * .2) * 3;
		group.rotation.z = ((nose.x-.5) * .2) * 3;
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


	//-----------------------------------------------------------
	function onWindowResize() {

		camera.right = window.innerWidth;
		camera.bottom = window.innerHeight;

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

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
		// container.style.position = 'absolute';
		container.style.left = '0px';
		container.style.top = '0px';

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