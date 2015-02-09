// MirrorVideoController.js

function supports_video() {
  return !!document.createElement('video').canPlayType;
}

function supports_h264_baseline_video() {
  if (!supports_video()) { return false; }
  var v = document.createElement("video");
  return v.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"');
}

// convert hh:mm::ss to int (seconds)
function timeCodeToInt(tcStr){
	var t = tcStr.split(":");
	return (t[0] * 3600 + t[1] * 60 + t[2] * 1);
}

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
	this.bIsActive = params.bIsActive || false;

	this.muteVideo = (params.muteVideo !== undefined)? params.muteVideo : false;

	this.dir = params.dir || new THREE.Vector2( 0, 0 );

	this.vidAspect = params.aspect || 1280 / 720;

	this.vidPosition = {position: 0.0001};
}

MirrorVideoController = function(params)
{
	params = params || {};
	this.backgroundRendered = params.useBackground || false;
	this.doubleWide = params.doubleWide || false;
	this.onSubtitlesMade = params.subtitleHander || undefined;

	this.verbose = params.verbose || false;


	var fmt = supports_h264_baseline_video() !== "" ? ".mp4" : ".webm";

	if ( iOS ){
		fmt = "_mobile" + fmt;
	}

	// if ( this.backgroundRendered ){
	// 	this.videoFiles = params.videoFiles || {
	// 		"01": 	{path: 	"../WALLACE_TESTS/01_STRAIGHT_WEIRD_BLEND" + fmt},
	// 		"02": {path: 	"../WALLACE_TESTS/02_UP_DOWN_BLEND" + fmt},
	// 		"03": {path: 	"../WALLACE_TESTS/03_LEFT_RIGHT_BLEND" + fmt},
	// 		"04": {path: 	"../WALLACE_TESTS/04_UL_UR_BLEND" + fmt},
	// 	};
	// } else if ( !this.doubleWide ){
		this.videoFiles = params.videoFiles || {
			"BackgroundVideo": {path: "http://storage.googleapis.com/wallace_videos/AB_BACKGROUND" + fmt},
			"01": {path: 	"http://storage.googleapis.com/wallace_videos/AB_1_Straight_1_1" + fmt},
			"02": {path: 	"http://storage.googleapis.com/wallace_videos/AB_1_Up" + fmt},	
			"03": {path: 	"http://storage.googleapis.com/wallace_videos/AB_1_Down_1" + fmt},
			"04": {path: 	"http://storage.googleapis.com/wallace_videos/AB_1_Left_1_2" + fmt},
			"05": {path: 	"http://storage.googleapis.com/wallace_videos/AB_1_Right" + fmt},
		};
		
	// 	"01": {path: 	"http://storage.googleapis.com/wallace_videos/AB_1_Straight_1_1" + fmt},
	// 		"02": {path: 	"http://storage.googleapis.com/wallace_videos/AB_1_Up" + fmt},	
	// 		"03": {path: 	"http://storage.googleapis.com/wallace_videos/AB_1_Down_1" + fmt},
	// 		"04": {path: 	"http://storage.googleapis.com/wallace_videos/AB_1_Left_1_2" + fmt},
	// 		"05": {path: 	"http://storage.googleapis.com/wallace_videos/AB_1_Right" + fmt},
		 
	// } else {
	// 	this.videoFiles = params.videoFiles || {
	// 		"BackgroundVideo": {path: "../WALLACE_TESTS/BG_PREVIEW_07_1" + fmt},
	// 		"01": 	{path: 	"../WALLACE_TESTS/01_STRAIGHT_WEIRD" + fmt},
	// 		"02": {path: 	"../WALLACE_TESTS/02_UP_DOWN" + fmt},
	// 		"03": {path: 	"../WALLACE_TESTS/03_LEFT_RIGHT" + fmt},
	// 		"04": {path: 	"../WALLACE_TESTS/04_UL_UR" + fmt},
	// 	};
	// }

	// 1 - straight / up / down (has audio)
	// 2 - left / right / upperLeft (no audio)
	// 3 - upperRight / weird1 / weird2 (no audio)
	// 4 - background
	if ( this.doubleWide ){
		this.videoMap = {
			straight: 	{t: "01", uOffset: 0},
			weird: 	{t: "01", uOffset: this.backgroundRendered ? -.5 : .5},

			up: 	{t: "02", uOffset: 0},
			down: 	{t: "02", uOffset: this.backgroundRendered ? -.5 : .5},

			left: 	{t: "03", uOffset: 0},
			right: 	{t: "03", uOffset: this.backgroundRendered ? -.5 : .5},

			tiltLeft: 	{t: "04", uOffset: 0},
			tiltRight: {t: "04", uOffset: this.backgroundRendered ? -.5 : .5},

			background: {t:"BackgroundVideo", uOffset:0}
		}

		this.inverseVideoMap = {
			straight: "01",
			weird: "01",
			up: "02",
			down: "02",
			left: "03",
			right: "03",
			tiltLeft: "04",
			tiltRight: "04"
		}
	} else {
		this.videoMap = {
			straight: 	{t: "01", uOffset: 0},
			weird: 	{t: "01", uOffset: 0},

			up: 	{t: "02", uOffset: 0},
			down: 	{t: "03", uOffset: 0},

			left: 	{t: "04", uOffset: 0},
			right: 	{t: "05", uOffset: 0},

			tiltLeft: 	{t: "04", uOffset: 0},
			tiltRight: {t: "05", uOffset: 0},

			background: {t:"BackgroundVideo", uOffset:0}
		}
		
		this.inverseVideoMap = {
			straight: "01",
			weird: "01",
			up: "02",
			down: "03",
			left: "04",
			right: "05",
			tiltLeft: "04",
			tiltRight: "05"
		}
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

	this.muteVideo = (params.muteVideo !== undefined)? params.muteVideo : !PLAYING;
	console.log("this.muteVideo " + this.muteVideo)

	this.loadVideos(fmt);

	//this.playVideos();
	
	// create subtitles
	$.getJSON(params.subtitles || "../WALLACE_TESTS/subtitles.json", 
		function(data) {
			var cues = data.entries;

			for ( var i=0; i<cues.length; i++){
				var cue = cues[i];
				this.createFallMesh( cues[i].text, timeCodeToInt(cues[i].start) );
			}

			// alert parent we're donezo
			if ( this.onSubtitlesMade ) this.onSubtitlesMade( window.textMeshes );
		}.bind(this)
	);

	if(!this.muteVideo)
	{
		this.setVolume(params.volume || .25);	
	} else {
		this.setVolume(0);
	}
	this.restarted = false;
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
	try {
		// for(var v in this.videos)	this.videos[v].video.currentTime = percent * this.videoDuration; 
	} catch(e){

	}
}
MirrorVideoController.prototype.setVideoTime = function (videotime)
{
	// for(var v in this.videos)	this.videos[v].video.currentTime = videotime;
}

MirrorVideoController.prototype.stopVideos = function ()
{
	this.setVideoPosition(0);

	for(var v in this.videos)	this.videos[v].video.pause();

	this.bPaused = true;
}

MirrorVideoController.prototype.setVolume = function(value)
{
	if ( value == 0 ){
		for(var v in this.videos){
			this.videos[v].video.muted = false;
			this.videos[v].video.volume = value;
		}
	} else {
			this.videos['BackgroundVideo'].video.muted = false;
			this.videos['BackgroundVideo'].video.volume = value;
	}
};

MirrorVideoController.prototype.update = function()
{
	if ( !PLAYING ){
		if ( this.vidPosition.position > .02 ){
			// this.setVideoTime(0.0);
			// this.videos['01'].video.currentTime = 0;
			window.debugVideo = this.videos['01'];
		}
	// check on lyrics
	} else {
		for ( var i=0; i<window.textMeshes.length; i++){
			if ( this.videos['BackgroundVideo'].video.currentTime >= window.textMeshes[i].time && window.textMeshes[i].started == false){
				window.textMeshes[i].started = true;
				window.textMeshes[i].mesh.rotation.z = 0;
				window.textMeshes[i].mesh.position.y = -window.innerHeight * .6;
				window.textMeshes[i].mesh.position.parent = window.textMeshes[i].mesh;
				new TWEEN.Tween(window.textMeshes[i].mesh.position)
					.to({y: window.innerHeight * .75}, 5000)
					.easing( TWEEN.Easing.Sinusoidal.Out )
					.start()
					.onComplete(function(){
						this.parent.visible = false;
					});

				new TWEEN.Tween(window.textMeshes[i].mesh.rotation)
					.to({z: Math.random() * Math.PI - Math.PI / 2.0}, 5000)
					.easing( TWEEN.Easing.Sinusoidal.Out )
					.start();
			}
		}
	}
// if(this.videos["BackgroundVideo"].video.readyState === this.videos["BackgroundVideo"].video.HAVE_ENOUGH_DATA )
// {
// if ( this.videos[i].texture ) this.videos[i].texture.needsUpdate = true;
// this.vidPosition.position = this.videos[i].video.currentTime / this.videoDuration;
// }

	//update videos 
	// var vk = Object.keys(this.videos);
	// console.log( vk );
	var count = Object.keys(this.videos).length;
	var loaded = 0;
	var m = 0;
	for(var i in this.videos)
	{
		// var pc = parseInt(((this.videos[i].video.buffered.end(0) / this.videos[i].video.duration) * 100));
		if (this.videos[i].bIsActive && this.videos[i].video.readyState === this.videos[i].video.HAVE_ENOUGH_DATA )
		{
			// loaded++;
			// if ( loaded == count ){
			// 	this.playVideos();
			// }

			if ( this.videos[i].texture ) this.videos[i].texture.needsUpdate = true;


			if( i != "BackgroundVideo" && this.videos["BackgroundVideo"].video.readyState)
			{
				if ( this.videos[i].video.currentTime != this.videos["BackgroundVideo"].video.currentTime)
				{
					// this.videos[i].video.currentTime = this.videos["BackgroundVideo"].video.currentTime;
				}
			} else {
				this.vidPosition.position = this.videos[i].video.currentTime / this.videoDuration;
			}
		}
	}
}

MirrorVideoController.prototype.setVideoActive = function( name, bIsActive)
{
	if(this.inverseVideoMap[name] != undefined)
	{
		if(this.videos[this.inverseVideoMap[name]] != undefined)
		{
			this.videos[this.inverseVideoMap[name]].bIsActive = bIsActive;	
		}	
	}
}

MirrorVideoController.prototype.loadVideos = function (fmt)
{

	this.videoLoadCount = 0;
	this.videoToLoadCount = 0;
	// var videoLoader = html5Preloader();
	// videoLoader.on('finish', function(){ console.log('All assets loaded.'); });

	// var files = [];
	for( var id in this.videoFiles )
	{
		this.loadVideo( id, this.videoFiles[id].path, "video/mp4" );//fmt == "mp4" ? "video/mp4" : "video/webm");
		//this.videoToLoadCount++;
	}
	// videoLoader.addFiles(files);

	for(var id in this.videoFiles)
	{
		// console.log( 'info' );this.videos["BackgroundVideo"]
		var active = id == "BackgroundVideo";
		this.videos[id] = new AzealiaVideoObject({
			video: document.getElementById( id ),
			name: id,
			bIsActive: true
		}, true);
	}
	this.playVideos();
}

MirrorVideoController.prototype.getVideoLocation = function ( videoName )
{
	if(this.videoMap[videoName] != undefined)	return this.videoMap[videoName];

	console.log( "oops, we couldn't find "+ videoName + " for you."  );
	return this.videoMap["straight"];
}

MirrorVideoController.prototype.getVideo = function ( videoName )
{	
	var loc = this.getVideoLocation(videoName);
	if ( this.videos[loc.t] ){
		return {t: this.videos[loc.t].texture, uOffset: loc.uOffset}
	} else {
		console.error("here comes da beef");
		return null;
	}
	// if(this.videoMap[videoName] != undefined)	return this.videoMap[videoName];
	// 
}


MirrorVideoController.prototype.loadVideo = function ( name, url, type, onLoadComplete )
{

	// console.log( "\nload name: " + name);

	onLoadComplete = onLoadComplete || function(){};

	var videoElement = document.createElement( 'video' );
	videoElement.setAttribute("loop", "");
	videoElement.setAttribute("type", type);
	videoElement.setAttribute("preload", "auto");
	
	if(this.muteVideo == true || name != "BackgroundVideo")
	{
		videoElement.setAttribute("muted", "");
	}

	videoElement.setAttribute("id", name);
	var source = document.createElement('source');
	source.setAttribute('crossorigin', 'anonymous');
	videoElement.setAttribute('crossorigin', 'anonymous');

	source.setAttribute('crossOrigin', 'anonymous');
	videoElement.setAttribute('crossOrigin', 'anonymous');

	source.src = url;
	videoElement.load();
	videoElement.appendChild(source);
	videoElement.style.visibility = "hidden";
	videoElement.style.display = "none";
	
	// if ( name != "BackgroundVideo"|| this.backgroundRendered ){

	videoElement.addEventListener('loadeddata', function() {
	   this.videoLoadCount++;
	   // console.log( "\n" + name + " is loaded. videoLoadCount = " + this.videoLoadCount+ "\n" );
	   onLoadComplete();
	}.bind(this), false);
	

	document.body.appendChild(videoElement);

	if(this.verbose)
	{
		console.log( "verbose" );

		//https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Media_events
		//
		var otherListeners = [ 
			"abort",
			"canplay",
			"canplaythrough",
			"durationchange",
			"emptied",
			"ended",
			"error",
			"interruptbegin",
			"interruptend",
			"loadeddata",
			"loadedmetadata",
			"loadstart",
			"mozaudioavailable",
			"pause",
			"play",
			"playing",
			"progress",
			"ratechange",
			"seeked",
			"seeking",
			"stalled",
			"suspend",
			// "timeupdate",
			"volumechange",
			"waiting"
		];
		for(var i=0; i<otherListeners.length; i++)
		{	
			videoElement.addEventListener(otherListeners[i], function(e)
			{
				if(e.type == "canplaythrough")
				{
					console.log( "CANPLAYTHROUGH!!!!!!!!!!", e.target.id, e.type );
				}

				if(e.type == "progress")
				{
					// console.log( e.target.id, e.type );
				}

				else
				{
					console.log( e.target.id, e.type );
				}
			   
			}, false);
		}
	}
}

MirrorVideoController.prototype.createFallMesh = function(string, time) {
	if ( !window.textMeshes ){
		window.textMeshes = [];
		console.log(time)
	}

	window.textMeshes.push( {started: false, mesh:new THREE.TextTexture(string, 24, "#fff", "Helvetica", "#000", 10), time:time});
};
