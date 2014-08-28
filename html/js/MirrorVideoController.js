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
	this.bIsActive = params.bIsActive || false;

	this.muteVideo = (params.muteVideo !== undefined)? params.muteVideo : false;

	this.dir = params.dir || new THREE.Vector2( 0, 0 );

	this.vidAspect = params.aspect || 1280 / 720;

	this.verbose = params.verbose || false;


	this.vidPosition = {position: 0.0001};
}

MirrorVideoController = function(params)
{
	params = params || {};
	this.backgroundRendered = params.useBackground || false;
	this.doubleWide = params.doubleWide || false;

	if ( this.backgroundRendered ){
		this.videoFiles = params.videoFiles || {
			"01": 	{path: 	"../WALLACE_TESTS/01_STRAIGHT_WEIRD_BLEND.mp4"},
			"02": {path: 	"../WALLACE_TESTS/02_UP_DOWN_BLEND.mp4"},
			"03": {path: 	"../WALLACE_TESTS/03_LEFT_RIGHT_BLEND.mp4"},
			"04": {path: 	"../WALLACE_TESTS/04_UL_UR_BLEND.mp4"},
		};
	} else if ( !this.doubleWide ){
		this.videoFiles = params.videoFiles || {
			"BackgroundVideo": {path: "../WALLACE_TESTS/BG_PREVIEW_07_1.mp4"},
			"01": {path: 	"../WALLACE_TESTS/02_ALPHA_STRAIGHT_03.mp4"},
			"02": {path: 	"../WALLACE_TESTS/03_ALPHA_UP.mp4"},
			"03": {path: 	"../WALLACE_TESTS/04_ALPHA_DOWN.mp4"},
			"04": {path: 	"../WALLACE_TESTS/05_ALPHA_LEFT.mp4"},
			"05": {path: 	"../WALLACE_TESTS/06_ALPHA_RIGHT.mp4", wait: true},
		};
	} else {
		this.videoFiles = params.videoFiles || {
			"BackgroundVideo": {path: "../WALLACE_TESTS/BG_PREVIEW_07_1.mp4"},
			"01": 	{path: 	"../WALLACE_TESTS/01_STRAIGHT_WEIRD.mp4"},
			"02": {path: 	"../WALLACE_TESTS/02_UP_DOWN.mp4"},
			"03": {path: 	"../WALLACE_TESTS/03_LEFT_RIGHT.mp4"},
			"04": {path: 	"../WALLACE_TESTS/04_UL_UR.mp4"},
		};
	}

	this.subtitles = params.subtitles || "../WALLACE_TESTS/subtitles.js";
	this.subtitlesAttached = false; // only attach to one video element.


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
			tiltRight: {t: "04", uOffset: this.backgroundRendered ? -.5 : .5}
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
			tiltRight: {t: "05", uOffset: 0}
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

	this.muteVideo = (params.muteVideo !== undefined)? params.muteVideo : false;
	console.log("this.muteVideo " + this.muteVideo)

	this.loadVideos();

	//this.playVideos();

	if(!this.muteVideo)
	{
		this.setVolume(params.volume || .25);	
	}
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

MirrorVideoController.prototype.setVolume = function(value)
{
	this.videos['01'].video.muted = false;
	this.videos['01'].video.volume = value;
};

MirrorVideoController.prototype.update = function()
{
// if(this.videos["BackgroundVideo"].video.readyState === this.videos["BackgroundVideo"].video.HAVE_ENOUGH_DATA )
// {
// if ( this.videos[i].texture ) this.videos[i].texture.needsUpdate = true;
// this.vidPosition.position = this.videos[i].video.currentTime / this.videoDuration;
// }

	//update videos 
	// var vk = Object.keys(this.videos);
	// console.log( vk );
	for(var i in this.videos)
	{
		if (this.videos[i].bIsActive && this.videos[i].video.readyState === this.videos[i].video.HAVE_ENOUGH_DATA )
		{
			if ( this.videos[i].texture ) this.videos[i].texture.needsUpdate = true;
			this.vidPosition.position = this.videos[i].video.currentTime / this.videoDuration;


			if( i != "01" && this.videos["01"].video.readyState)
			{
				this.videos[i].video.currentTime = this.videos["01"].video.currentTime;
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

MirrorVideoController.prototype.loadVideos = function ()
{

	this.videoLoadCount = 0;
	this.videoToLoadCount = 0;
	for( var id in this.videoFiles )
	{
		if ( !this.videoFiles[id].wait ){
			// console.log( 'this.videoFiles[id].path ' + this.videoFiles[id].path );
			this.loadVideo( id, this.videoFiles[id].path);
		}
		this.videoToLoadCount++;

		// console.log( document.getElementById( id ))
	}

	for(var id in this.videoFiles)
	{
		if ( !this.videoFiles[id].wait ){
			// console.log( 'info' );
			this.videos[id] = new AzealiaVideoObject({
				video: document.getElementById( id ),
				name: id
			}, true);
		}
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
	if ( this.videos[loc.t] ){
		return {t: this.videos[loc.t].texture, uOffset: loc.uOffset}
	} else {
		console.error("here comes da beef");
		return null;
	}
	// if(this.videoMap[videoName] != undefined)	return this.videoMap[videoName];
	// 
}


MirrorVideoController.prototype.loadVideo = function ( name, url, onLoadComplete )
{

	// console.log( "\nload name: " + name);

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

		// this is a little weird, huh?
		this.subTitleInvert = false;

		console.log( this.subtitleElement.track )
		this.subtitleElement.setAttribute("src", this.subtitles );

		var cues = this.subtitleElement.track.cues;
		if ( cues == null || cues.length == 0 ){
			window.tryInterval = setInterval(function(){
				console.log("try");
			    // here goes nothing
				var cues = this.subtitleElement.track.cues;
				if ( cues != null && cues.length != 0){
					window.clearInterval( window.tryInterval );
					var invert = false;
					for ( var i=0; i<cues.length; i++){
						var cue = cues[i];
						if ( cue.id == "159" || cue.id == "316" || cue.id == "362" || cue.id == "426" ){
							invert = !invert;
						}

						var t = cues[i].text;
						var str = ['function fun(){',
							'var d = window.textDivs[window.whichSub]; window.whichSub++;',
							'd.style["-webkit-transition"] = "top ease-out 5s, -webkit-transform 10s";',
							'd.style.top = d.invert ? window.innerHeight * -.25 +"px" : window.innerHeight * 1.2 +"px";',
							'd.style["-webkit-transform"] = "rotateZ(" + (Math.floor( -300 + Math.random() * 600 )) + "deg)";',
						'}; fun();'].join('\n');
						console.log( str );
						setTimeout( function(){ console.log("weeee"); eval(str)}, cues[i].startTime * 1000 );
						this.createFallDiv( cues[i].text, invert );
					}
					window.whichSub = 0;

					this.subtitleElement.setAttribute("src", "");
					videoElement.removeChild(this.subtitleElement);

					this.subtitleElement = null;

					for( var id in this.videoFiles )
					{
						if ( this.videoFiles[id].wait ){
							// console.log( 'this.videoFiles[id].path ' + this.videoFiles[id].path );
							this.loadVideo( id, this.videoFiles[id].path, function(){ this.videoToLoadCount = 0 }.bind(this) );
						}
						// console.log( document.getElementById( id ))
					}

					for(var id in this.videoFiles)
					{
						if ( this.videoFiles[id].wait ){
							// console.log( 'info' );
							this.videos[id] = new AzealiaVideoObject({
								video: document.getElementById( id ),
								name: id
							}, true);
						}
					}

					this.playVideos();
				}
			}.bind(this), 10);
		} 
		videoElement.appendChild(this.subtitleElement);

		//this.subtitleElement.oncuechange = this.onSubtitleTrigger.bind(this);
		this.subtitleElement.onerror = function(e){
			console.log(e);
		}
	}
	
	videoElement.setAttribute("id", name);
	var source = document.createElement('source');
	source.src = url;
	videoElement.load();
	videoElement.appendChild(source);
	if ( name != "BackgroundVideo"|| this.backgroundRendered ){
		videoElement.style.visibility = "hidden";
		videoElement.style.display = "none";
	} else {
		// videoElement.style.position = "absolute";
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
	   // console.log( "\n" + name + " is loaded. videoLoadCount = " + this.videoLoadCount+ "\n" );
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
	//console.log(e);
	// override?
	for ( var i=0; i<this.subtitleElement.track.activeCues.length; i++){
		var cue = this.subtitleElement.track.activeCues[i]; // assuming there is only one active cue
		if ( cue ){ 
			if ( cue.id == "159" || cue.id == "316" || cue.id == "362" || cue.id == "426" ){
				this.subTitleInvert = !this.subTitleInvert;
			}
			var obj = cue.text;//JSON.parse(cue.text);
			this.triggerDiv(obj);
			//this.addFallingText(obj);
			// setTimeout( this.addFallingText.bind(this), 0, obj);
		}
	}
}

MirrorVideoController.prototype.createFallDiv = function( string, invert ){
	if ( !window.textDivs ){
		window.textDivs = {};
		window.whichSub = 0;
	}

	window.textDivs[window.whichSub] 	= document.createElement("div");
	window.textDivs[window.whichSub].style.fontFamily = "Helvetica";
	window.textDivs[window.whichSub].style.position = "absolute";
	window.textDivs[window.whichSub].style.zIndex = "2000";
	window.textDivs[window.whichSub].style.padding = "5px";
	window.textDivs[window.whichSub].style["background-color"] = "#000";
	window.textDivs[window.whichSub].style.color = "#fff";

	if ( invert ){
		window.textDivs[window.whichSub].style.top = window.innerHeight * 1.2 + "px";
		window.textDivs[window.whichSub].invert 	= true;
	} else {
		window.textDivs[window.whichSub].style.top = "-50px";
		window.textDivs[window.whichSub].invert 	= false;
	}
	window.textDivs[window.whichSub].style["-webkit-transform"] = "";
	window.textDivs[window.whichSub].style.left 	 = (Math.random() > .5 ? Math.floor(window.innerWidth * .1 + Math.random() * (window.innerWidth * .3)) : Math.floor(window.innerWidth * .6 + Math.random() * (window.innerWidth * .3))) +"px";

	window.textDivs[window.whichSub].innerHTML = string;

	document.body.appendChild(window.textDivs[window.whichSub]);
	window.whichSub++;
}

MirrorVideoController.prototype.triggerDiv = function( name ){
	if ( window.textDivs && window.textDivs[name]){
		var d = window.textDivs[name];

		d.style["-webkit-transition"] = "top ease-out 5s, -webkit-transform 10s";
		d.style.top = d.invert ? window.innerHeight * -.25 +"px" : window.innerHeight * 1.2 +"px";
		d.style["-webkit-transform"] = "rotateZ(" + (Math.floor( -300 + Math.random() * 600 )) + "deg)";
	}
}

// this should probably be elsewhere?
MirrorVideoController.prototype.addFallingText = function( string ){
	if ( !window.textDivs ){
		window.textDivs = [];
		this.subMax   = 20;
		this.subIndex = 0;
	}

	var ind = window.textDivs.length;

	if ( window.textDivs.length < this.subMax ){
		this.subIndex 	= window.textDivs.length;
		window.textDivs[ind] 	= document.createElement("div");
		window.textDivs[ind].style.fontFamily = "Helvetica";
		window.textDivs[ind].style.position = "absolute";
		window.textDivs[ind].style.zIndex = "2000";
		window.textDivs[ind].style.padding = "5px";
		window.textDivs[ind].style["background-color"] = "#000";
		window.textDivs[ind].style.color = "#fff";
	} else {
		ind = this.subIndex;
		window.textDivs[ind].style["-webkit-transition"] = "";
	}

	this.subIndex++;
	if ( this.subIndex >= this.subMax ){
		this.subIndex = 0;
	}

	if ( this.subTitleInvert ){
		window.textDivs[ind].style.top = window.innerHeight * 1.2 + "px";
	} else {
		window.textDivs[ind].style.top = "0px";
	}
	window.textDivs[ind].style["-webkit-transform"] = "";
	window.textDivs[ind].style.left 	 = (Math.random() > .5 ? Math.floor(window.innerWidth * .1 + Math.random() * (window.innerWidth * .3)) : Math.floor(window.innerWidth * .6 + Math.random() * (window.innerWidth * .3))) +"px";

	window.textDivs[ind].innerHTML = string;

	if ( window.textDivs.length < this.subMax ){
		document.body.appendChild(window.textDivs[ind]);
	}

	var d = window.textDivs[ind];
	var invert = this.subTitleInvert

	setTimeout( function(){
		d.style["-webkit-transition"] = "top ease-out 5s, -webkit-transform 10s";
		d.style.top = invert ? window.innerHeight * -.25 +"px" : window.innerHeight * 1.2 +"px";
		d.style["-webkit-transform"] = "rotateZ(" + (Math.floor( -300 + Math.random() * 600 )) + "deg)";
	}, 10);

	// setTimeout( function(d){
	// 	document.body.removeChild(d);
	// }, 5100, window.textDivs[ind]);
}
