/**
 * Modified class from oflow.js
 */
/**
 * A simple interface to capture set up a web camera decoupled from optical flow.
 * Also includes a canvas similar to videoFlow.js where we give access to pixels.
 * @param defaultVideoTag {DOMElement} optional reference to <video> tag
 *   where web camera output should be rendered. If parameter is not
 *   present a new invisible <video> tag is created.
 */
 
function WebCam(defaultVideoTag) {
    var videoTag,
        isCapturing = false,
        localStream,
        canvas,
        ctx,
        width,
        height,
        widthRounded,
        heightRounded,
        currentPixels,
        lastPixels,
        loopId,
        updatedCallbacks = [],
        scale = .25,

        requestAnimFrame = window.requestAnimationFrame       ||
                           window.webkitRequestAnimationFrame ||
                           window.mozRequestAnimationFrame    ||
                           window.oRequestAnimationFrame      ||
                           window.msRequestAnimationFrame     ||
                           function( callback ) { window.setTimeout(callback, 1000 / 60); },
        cancelAnimFrame =  window.cancelAnimationFrame ||
                           window.mozCancelAnimationFrame;

        onWebCamFail = function onWebCamFail(e) {
            if(e.code === 1){
                console.error('You have denied access to your camera. I cannot do anything.');
            } else { 
                console.error('getUserMedia() is not supported in your browser.');
            }
        },
        initCapture = function( errorCallback ) {
            videoTag = defaultVideoTag || window.document.createElement('video');
            videoTag.setAttribute('autoplay', true);
            videoTag.setAttribute('width', 160);
            videoTag.setAttribute('height', 120);
            
            if ( navigator.getUserMedia == null ){
                errorCallback({code:0});
                return;
            }

            // start capture
            navigator.getUserMedia({ video: true }, function(stream) {
                isCapturing = true;
                localStream = stream;
                videoTag.src = window.URL.createObjectURL(stream);
                if (stream) {
                    return true;
                }
            }, errorCallback || onWebCamFail);
        },

        initView = function () {
            // width = videoTag.width;
            // height = videoTag.height;
            width = videoTag.videoWidth;
            height = videoTag.videoHeight;
            widthRounded = Math.round( width * scale);
            heightRounded = Math.round( height * scale);

            if (!canvas) { canvas = window.document.createElement('canvas'); }
            ctx = canvas.getContext('2d');
        },

        animloop = function () { 
            loopId = requestAnimFrame(animloop.bind(this)); 
            this.updatePixels();
        };

    if (!navigator.getUserMedia) {
        navigator.getUserMedia = navigator.getUserMedia ||
                                 navigator.webkitGetUserMedia ||
                                 navigator.mozGetUserMedia ||
                                 navigator.msGetUserMedia || null;
    }
    
    // our public API
    this.startCapture = function ( bAnimate, errorCallback ) {
        if (!isCapturing) {
            initCapture(errorCallback); // capture
            initView();    // canvas
            if ( bAnimate !== undefined && bAnimate == true ) animloop();    // animation
        }
    };

    this.updatePixels = function(){
        if (isCapturing) {
            // current pixels
            width = videoTag.videoWidth;
            height = videoTag.videoHeight;
            if ( widthRounded == 0 ){
                widthRounded = Math.round( width * scale);
                heightRounded = Math.round( height * scale);
                canvas.width  = widthRounded;
                canvas.height = heightRounded;
            } else {
                // clear canvas
                canvas.width = canvas.width;
            }

            var useWeirdOptimization = false;

            if (width && height) {
                lastPixels = currentPixels;

                ctx.drawImage(videoTag, 0, 0, width * scale, height * scale);
                var data = [];
                var pix;

                if ( useWeirdOptimization ){
                    pix = new Uint8ClampedArray( width * height * scale );
                    var offset = 0
                    for (var y = 0; y < height * scale; y++) {
                        var d = ctx.getImageData(0, y, width * scale, 1).data;
                        pix.set(d, offset);
                        offset += d.length;
                    }

                    var ind = 0;
                    var brightness = 0.34 * pix[0] + 0.5 * pix[0 + 1] + 0.16 * pix[0 + 2];

                    for(var i = 0; i < pix.length; i += 4) {
                        var brightness = 0.34 * pix[i] + 0.5 * pix[i + 1] + 0.16 * pix[i + 2];
                        // red
                        data[ind] = brightness;
                        ind++;
                    }
                    //delete pix;

                } else {
                    var imgd = ctx.getImageData(0, 0, widthRounded, heightRounded );
                    pix = imgd.data;
                    var len = pix.length;

                    for(var i = 0; i < len; i += 4) {
                      var brightness = 0.34 * pix[i] + 0.5 * pix[i + 1] + 0.16 * pix[i + 2];
                      var ind = i/4;
                      // red
                      data[ind] = brightness;
                    }
                    // delete pix;
                }

                // debuggin ONLY
                if ( window.drawDebug ){
                    var id = ctx.createImageData( width * scale, height * scale );
                    id.data = pix;
                    ctx.putImageData( id, 0, 0 );
                }

                currentPixels = data;

                updatedCallbacks.forEach(function (callback) {
                    callback();
                });
            }
        } else {
            // width = height = 0?
        }
    }

    this.stopCapture = function() {
        isCapturing = false;
        if (videoTag) { videoTag.pause(); }
        if (localStream) { localStream.stop(); }
        cancelAnimFrame(loopId);
    };

    this.onUpdated = function (callback) {
        updatedCallbacks.push(callback);
    };

    this.getCurrentPixels = function(){
        return currentPixels;
    };

    this.getLastPixels = function(){
        return lastPixels;
    };

    this.getWidth = function(){
        return widthRounded;
    };

    this.getHeight = function(){
        return heightRounded;
    }

}