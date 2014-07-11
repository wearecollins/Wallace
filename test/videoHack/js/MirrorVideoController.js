// MirrorVideoController.js
// 
// 
// 1 - straight / up / down (has audio)
// 2 - left / right / upper left (no audio)
// 3 - upper right / weird 1 / weird 2 (no audio)
// 4 - background

var AzealiaVideoObject = function(params, useWebGL)
{
	this.video = params.video;
	if ( useWebGL ) this.texture = new THREE.Texture( this.video );
	this.name = params.name || "blank";
	
	if ( useWebGL ) this.texture.minFilter = THREE.LinearFilter;
	if ( useWebGL ) this.texture.magFilter = THREE.LinearFilter;
	if ( useWebGL ) this.texture.format = THREE.RGBFormat;
	if ( useWebGL ) this.texture.generateMipmaps = false;
	if ( useWebGL ) this.texture.needsUpdate = false;	//

	this.bIsActive = (params.bIsActive !== undefined)? params.bIsActive : true;
	this.bIsActive = params.bIsActive || true;

	this.muteVideo = (params.muteVideo !== undefined)? params.muteVideo : false;

	this.dir = params.dir || new THREE.Vector2( 0, 0 );

	this.vidAspect = params.aspect || 1280 / 720;

	this.verbose = params.verbose || false;


	this.vidPosition = {position: 0.0001};

	this.debugVal = 0;
}

MirrorVideoController = function(params)
{
	params = params || {};

	this.videoFiles = params.videoFiles || {
		"BackgroundVideo": {path: "../WALLACE_TESTS/BG_PREVIEW_05_1.mp4"},
		"01": 	{path: 	"../WALLACE_TESTS/01_STRAIGHT_WEIRD.mp4"},
		"02": {path: 	"../WALLACE_TESTS/02_UP_DOWN.mp4"},
		"03": {path: 	"../WALLACE_TESTS/03_LEFT_RIGHT.mp4"},
		"04": {path: 	"../WALLACE_TESTS/04_UL_UR.mp4"},
	};

	this.subtitles = params.subtitles || "../WALLACE_TESTS/subtitles.vtt";
	this.subtitlesAttached = false; // only attach to one video element.


	// 1 - straight / up / down (has audio)
	// 2 - left / right / upperLeft (no audio)
	// 3 - upperRight / weird1 / weird2 (no audio)
	// 4 - background
	this.videoMap = {
		straight: 	{t: "01", uOffset: 0},
		weird: 	{t: "01", uOffset: .5},

		up: 	{t: "02", uOffset: 0},
		down: 	{t: "02", uOffset: .5},

		left: 	{t: "03", uOffset: 0},
		right: 	{t: "03", uOffset: .5},

		tiltLeft: 	{t: "04", uOffset: 0},
		tiltRight: {t: "04", uOffset: .5},

		// straight: 	{t: "01", channel: new THREE.Vector2( 0, 0, 0 )},
		// up: 		{t: "01", channel: new THREE.Vector2( 0, 1, 0 )},
		// down: 		{t: "01", channel: new THREE.Vector2( 0, 0, 1 )},

		// left: 		{t: "02", channel: new THREE.Vector2( 1, 0, 0 )},
		// right: 		{t: "02", channel: new THREE.Vector2( 0, 1, 0 )},
		// tiltLeft: 	{t: "02", channel: new THREE.Vector2( 0, 0, 1 )},

		// tiltRight: 	{t: "03", channel: new THREE.Vector2( 1, 0, 0 )},
		// weird1: 	{t: "03", channel: new THREE.Vector2( 0, 1, 0 )},
		// weird2: 	{t: "03", channel: new THREE.Vector2( 0, 0, 1 )}
	}

	this.videos = {};

	this.bPaused = false;
	this.videoLoadCount = 0;
	this.videoToLoadCount = 0;

	this.videoDuration = 228.351646;
	this.vidAscpect = 1280 / 720;
	this.bTransitioning = false;
	this.currentVid = undefined;
	this.previousVid = undefined;
	this.tertiaryVid = undefined;

	this.vidPosition = {position: 0.0001};

	this.muteVideo = (params.muteVideo !== undefined)? params.muteVideo : false;
	console.log("this.muteVideo " + this.muteVideo)

	this.loadVideos();

	this.playVideos();
}


MirrorVideoController.prototype.playVideos = function ()
{
	for(var v in this.videos)
	{
		this.videos[v].video.play();
	}

	this.bPaused = false;
}

MirrorVideoController.prototype.pauseVideos = function ()
{
	if(this.bPaused)
	{
		for(var v in this.videos)	this.videos[v].video.play();
	}
	else
	{
		for(var v in this.videos)	this.videos[v].video.pause();
		// console.log( videos );
	}

	this.bPaused = !this.bPaused;
}

MirrorVideoController.prototype.setVideoPosition = function (percent)
{
	for(var v in this.videos)	this.videos[v].video.currentTime = percent * this.videoDuration; 
}
MirrorVideoController.prototype.setVideoTime = function (videotime)
{
	for(var v in this.videos)	this.videos[v].video.currentTime = videotime;
}

MirrorVideoController.prototype.stopVideos = function ()
{
	this.setVideoPosition(0);

	for(var v in videos)	this.videos[v].video.pause();

	this.bPaused = true;
}

MirrorVideoController.prototype.update = function()
{
// if(this.videos["BackgroundVideo"].video.readyState === this.videos["BackgroundVideo"].video.HAVE_ENOUGH_DATA )
// {
// if ( this.videos[i].texture ) this.videos[i].texture.needsUpdate = true;
// this.vidPosition.position = this.videos[i].video.currentTime / this.videoDuration;
// }

	//update videos 
	for(var i in this.videos)
	{
		if(this.debugVal < 100)
		{
			console.log( this.videos[i] );
			this.debugVal++;
		}
		if (this.videos[i].bIsActive && this.videos[i].video.readyState === this.videos[i].video.HAVE_ENOUGH_DATA )
		{
			if ( this.videos[i].texture ) this.videos[i].texture.needsUpdate = true;
			this.vidPosition.position = this.videos[i].video.currentTime / this.videoDuration;
		}
	}
}

MirrorVideoController.prototype.loadVideos = function ()
{

	this.videoLoadCount = 0;
	this.videoToLoadCount = 0;
	for( var id in this.videoFiles )
	{
		console.log( 'this.videoFiles[id].path ' + this.videoFiles[id].path );
		this.loadVideo( id, this.videoFiles[id].path);
		this.videoToLoadCount++;

		console.log( document.getElementById( id ))
	}

	for(var id in this.videoFiles)
	{
		console.log( 'info' );
		this.videos[id] = new AzealiaVideoObject({
			video: document.getElementById( id ),
			name: id
		}, true);
	}
}

MirrorVideoController.prototype.getVideoLocation = function ( videoName )
{
	if(this.videoMap[videoName] != undefined)	return this.videoMap[videoName];

	console.log( "oops, we couldn't find "+ videoName + " for you."  );
	return this.videoMap["straight"];
}

MirrorVideoController.prototype.getVideo = function ( videoName )
{	
	var loc = this.	getVideoLocation(videoName);
	return {t: this.videos[loc.t].texture, uOffset: loc.uOffset}
	// if(this.videoMap[videoName] != undefined)	return this.videoMap[videoName];
	// 
}


MirrorVideoController.prototype.loadVideo = function ( name, url, onLoadComplete )
{

	console.log( "\nload name: " + name);

	onLoadComplete = onLoadComplete || function(){};

	var videoElement = document.createElement( 'video' );
	videoElement.setAttribute("loop", "");
	videoElement.setAttribute("type", "video/mp4");
	
	if(this.muteVideo == true || name != "01")
	{
		videoElement.setAttribute("muted", "");
	}

	// create subtitles
	if ( !this.subtitlesAttached ){
		this.subtitlesAttached = true;
		this.subtitleElement = document.createElement('track');
		this.subtitleElement.setAttribute("kind", "subtitles");
		this.subtitleElement.setAttribute("label", "English subtitles");
		this.subtitleElement.setAttribute("srclang", "en");
		this.subtitleElement.setAttribute("default", "");
		this.subtitleElement.setAttribute("src", this.subtitles );
		this.subtitleElement.oncuechange = this.onSubtitleTrigger.bind(this);
		this.subtitleElement.onerror = function(e){
			console.log(e);
		}
		videoElement.appendChild(this.subtitleElement);
	}
	
	videoElement.setAttribute("id", name);
	var source = document.createElement('source');
	source.src = url;
	videoElement.load();
	videoElement.appendChild(source);
	if ( name != "BackgroundVideo" ){
		videoElement.style.visibility = "hidden";
		videoElement.style.display = "none";
	} else {
		videoElement.style.width = "100%";
		videoElement.style.margin = "auto";
		videoElement.style.position = "absolute";
		videoElement.style.top= "0px";
		videoElement.style.bottom = "0px";
		videoElement.style.left = "0px";
		videoElement.style.right = "0px";
	}
	document.body.appendChild(videoElement);

	//debugging LISTENERS
	videoElement.addEventListener('loadeddata', function() {
	   this.videoLoadCount++;
	   console.log( "\n" + name + " is loaded. videoLoadCount = " + this.videoLoadCount+ "\n" );
	   onLoadComplete();
	}.bind(this), false);

	if(this.verbose)
	{

		var otherListeners = [ "canplay", "playing ", "waiting", "ended", "loadedmetadata", "suspend","stalled" ,"emptied"]
		for(var i in otherListeners)
		{
			videoElement.addEventListener(otherListeners[i], function() {
			   console.log( "\n" + name + " " + otherListeners[i] + " \n" );
			}, false);
		}
	}
}

MirrorVideoController.prototype.onSubtitleTrigger = function(e){
	console.log(e);
	// override?
	for ( var i=0; i<this.subtitleElement.track.activeCues.length; i++){
		var cue = this.subtitleElement.track.activeCues[i]; // assuming there is only one active cue
		if ( cue ){ 
			var obj = cue.text;//JSON.parse(cue.text);
			this.addFallingText(obj);
		}
	}
}

// this should probably be elsewhere?
MirrorVideoController.prototype.addFallingText = function( string ){
	console.log( string );
	var d = document.createElement("div");
	d.style.fontFamily = "Helvetica";
	d.style.color = "#fff";
	d.style.position = "absolute";
	d.style.zIndex = "1000";
	d.style.padding = "5px";
	d.style["background-color"] = "#000";
	d.style.left = Math.floor(Math.random() * window.innerWidth) +"px";
	d.style.top = "0px";
	d.style["-webkit-transition"] = "top ease-out 5s, -webkit-transform 10s";
	d.innerHTML = string;
	document.body.appendChild(d);
	setTimeout( function(){
		d.style.top = "120%";
		d.style["-webkit-transform"] = "rotateZ(" + (Math.floor( -300 + Math.random() * 600 )) + "deg)";
	}, 100);
	setTimeout( function(){
		document.body.removeChild(d);
	}, 5100);
}