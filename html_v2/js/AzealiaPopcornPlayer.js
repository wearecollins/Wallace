// AzealiaPopcornPlayer.js


var AzealiaPopcornPlayer = function(params)
{
	params = params || {};

	var settings = {
		isVideo: params.isVideo || false,
		muted: params.muted || false,
		verbose: params.verbose || false,
		onSubtitlesMade: params.subtitleHander || undefined,
		videoFiles: undefined,
		videos: {},
		textures: {},
		currentTexture: undefined,
		fmt: Modernizr.video.h264 === "" ? ".webm" : ".mp4",
		// fmt: Modernizr.video.webm !== "" ? ".webm" : ".mp4",
		bufferTime: 20,
		onCanPlayThrough: params.onCanPlayThrough || function(e){},
		onReady: params.onReady || function(e){},
		onComplete: params.onComplete || function(e){}
	}

	var inverseVideoMap = {
		straight: "01",
		weird: "01",
		up: "02",
		down: "03",
		left: "04",
		right: "05",
		tiltLeft: "04",
		tiltRight: "05",
		background: "BackgroundVideo"
	}

	var loadCount = 0, playThroughCount = 0, playingCount = 0, endedCount = 0;
	var events = "play pause timeupdate".split(/\s+/g);

	function createVideo(  name, url, type, onLoadComplete )
	{
		var videoElement = document.createElement( 'video' );
		//videoElement.setAttribute("loop", "");
		videoElement.setAttribute("type", type);
		// videoElement.setAttribute("preload", "auto");
		
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
		// videoElement.load();
		videoElement.appendChild(source);
		videoElement.style.visibility = "hidden";
		videoElement.style.display = "none";

		// videoElement.addEventListener('loadeddata', function() {
		//    onLoadComplete();
		// }.bind(this), false);

		document.body.appendChild(videoElement);

		return videoElement;
	}

	function createVideos()
	{
		//get the correct files
		var fmt = settings.fmt;

		if ( settings.isVideo )
		{
			settings.videoFiles = params.videoFiles || {
				"BackgroundVideo": {path: "../720p/AB_BACKGROUND" + fmt},
				"01": {path: 	"../720p/AB_1_Straight" + fmt},
				"02": {path: 	"../720p/AB_1_Up" + fmt},	
				"03": {path: 	"../720p/AB_1_Down" + fmt},
				"04": {path: 	"../720p/AB_1_Left" + fmt},
				"05": {path: 	"../720p/AB_1_Right" + fmt},
			};

			if ( supports_crossorigin() )
			{
				settings.videoFiles = params.videoFiles || {
					"BackgroundVideo": {path: "http://storage.googleapis.com/wallace_videos/AB_BACKGROUND" + fmt},
					"01": {path: 	"http://storage.googleapis.com/wallace_videos/AB_1_Straight" + fmt},
					"02": {path: 	"http://storage.googleapis.com/wallace_videos/AB_1_Up" + fmt},	
					"03": {path: 	"http://storage.googleapis.com/wallace_videos/AB_1_Down" + fmt},
					"04": {path: 	"http://storage.googleapis.com/wallace_videos/AB_1_Left" + fmt},
					"05": {path: 	"http://storage.googleapis.com/wallace_videos/AB_1_Right" + fmt},
				};
			}
			else
			{
				settings.videoFiles = params.videoFiles || {
					"BackgroundVideo": {path: "../720p/AB_BACKGROUND" + fmt},
					"01": {path: 	"../720p/AB_1_Straight" + fmt},
					"02": {path: 	"../720p/AB_1_Up" + fmt},	
					"03": {path: 	"../720p/AB_1_Down" + fmt},
					"04": {path: 	"..720p/AB_1_Left" + fmt},
					"05": {path: 	"../720p/AB_1_Right" + fmt},
				};
			}
		} 
		else
		{
			console.log( "this.isVideo == false" );
			
			settings.videoFiles = params.videoFiles || {
				"BackgroundVideo": {path: "images/black.jpg"},
				"01": {path: 	"images/banks_straight.jpg"},
				"02": {path: 	"images/banks_up.jpg"},	
				"03": {path: 	"images/banks_down.jpg"},
				"04": {path: 	"images/banks_left.jpg"},
				"05": {path: 	"images/banks_right.jpg"},
			};
		}

		for(var i in settings.videoFiles)
		{
			var videoElement = createVideo( i, settings.videoFiles[i].path, fmt == ".mp4" ? "video/mp4" : "video/webm" );
			settings.videos[i] = Popcorn( videoElement );

			//set up the texture
			settings.textures[i] = new THREE.Texture( videoElement );
			settings.textures[i].minFilter = THREE.LinearFilter;
			settings.textures[i].magFilter = THREE.LinearFilter;
			settings.textures[i].format = THREE.RGBFormat;
			settings.textures[i].generateMipmaps = false;

			// loading call back
			// we only want to show the controls of our video and begin playing it once more then half of the video has been loaded
			settings.videos[i].pause();
			//loader( settings.videos[i] );

		}

		//we want to keep it quiet until we play
		settings.videos["BackgroundVideo"].mute();

		//BASED ON THIS: http://jsfiddle.net/aqUNf/1/
		// iterate both media sources
		Popcorn.forEach( settings.videos, function( media, type ) {
			
			//can play through
			media.on( "canplaythrough", function( e ) {
				console.log("can play ", playThroughCount);
				playThroughCount++;
				if(playThroughCount == 6)
				{
					settings.onCanPlayThrough();
				}
			}, false );

			// play
			media.on( "play", function( e ) {
				console.log("play", playingCount);
				playingCount++;
				if ( playingCount == 6 ){
					// playing first time
				} else if ( playingCount == 12 ){
					console.log("restart");

				}
			}, false );

			// end
			media.on( "ended", function(){
				endedCount++;
				if ( endedCount == 6 ){
					endedCount = 0;
					//playThroughCount = 0;
					playingCount = 0;

					// for(var i in settings.videos)
					// {
					// 	settings.videos[i].play( 0 );
					// }
					settings.videos["BackgroundVideo"].play(0);
					settings.onComplete();
				}
			});

			// when each is ready... 
			media.on( "canplayall", function() {
				
				// emit a custom "sync" event
				this.emit("sync");

			// Listen for the custom sync event...    
			}).on( "sync", function() {
				
				// Once both items are loaded, sync events
				if ( ++loadCount == 6 ) {

					settings.onReady();
					
					// Iterate all events and emit them on the video B
					// whenever they occur on the video A
					events.forEach(function( event ) {

						settings.videos["BackgroundVideo"].on( event, function() {
							
							// Avoid overkill events, emit timeupdate manually
							if ( event === "timeupdate" ) {
								
								if ( !this.media.paused ) {
									return;
								} 
								for(var i in settings.videos)
								{
									if(i !== "BackgroundVideo")
									{
										settings.videos[i].emit( "timeupdate" );
									}
								}
								
								return;
							}

							if ( event === "play" || event === "pause" ) {
								for(var i in settings.videos)
								{
									if(i !== "BackgroundVideo")
									{
										settings.videos[i][ event ]( settings.videos["BackgroundVideo"].currentTime() );
									}
								}
							}
						});
					});
				}
			})

		});
	}

	function loader( video )
	{
		var loaded = function() {
			
			// store the returned timeRanges object as we use it more than once
			var buff = video.buffered();
			
			// if we have buffered more then half the video
			if ( buff.length > 0 && buff.end(0) > settings.bufferTime )
			{
				console.log( video.media.id, "LOADED" );
			// if less then half the video has loaded call our function again
			}
			else
			{
				console.log( "Still Loading...." );
				setTimeout( loaded, 1000 );
			}
		}
				
		loaded();
	}

	function setup()
	{
		createVideos();
	}

	function play()
	{
		if( settings.verbose )	console.log( "play()" );
		if( !settings.muted )	settings.videos["BackgroundVideo"].unmute(); 
		else 	settings.videos["BackgroundVideo"].mute();

		settings.videos["BackgroundVideo"].play();
	}


	function pause()
	{
		if( settings.verbose )	console.log( "pause()" );
		settings.videos["BackgroundVideo"].pause();
	}
	
	function sync()
	{
		if( loadCount >= 6 )
		{
			// var currentTime = settings.videos["BackgroundVideo"].currentTime();

			// for(var i in settings.videos)
			// {
			// 	if(i !== "BackgroundVideo")
			// 	{
			// 		settings.videos[i].currentTime( currentTime );
			// 	}
			// }

			if(settings.currentTexture !== undefined)
			{	
				settings.currentTexture.needsUpdate = true;

				settings.textures["BackgroundVideo"].needsUpdate = true;
			} else {
			}
		}
	}

	function currentTime()
	{
		return settings.videos["BackgroundVideo"].currentTime();
	}

	function getTexture( videoName )
	{
		if( playThroughCount >= 6 )
		{
			var textureName = inverseVideoMap[videoName];
			
			if( settings.textures[textureName] !== undefined)
			{
				settings.currentTexture = settings.textures[textureName];
				return settings.currentTexture;
			}
			else{
				console.log( "settings.textures["+ textureName + "] === undefined" );
			}
		}

		// console.error("bring the beef like a trucker to Fuddruckers");
		return null;
	}

	return {
		settings: settings,
		setup: setup,
		sync: sync,
		play: play,
		pause: pause,
		currentTime: currentTime,
		getTexture: getTexture
	}
}