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
        drawWidth = 320,
        drawHeight = 240,
        grayscale = false,

        requestAnimFrame = window.requestAnimationFrame       ||
                           window.webkitRequestAnimationFrame ||
                           window.mozRequestAnimationFrame    ||
                           window.oRequestAnimationFrame      ||
                           window.msRequestAnimationFrame     ||
                           function( callback ) { window.setTimeout(callback, 1000 / 60); },
        cancelAnimFrame =  window.cancelAnimationFrame ||
                           window.mozCancelAnimationFrame,

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
            
            if ( navigator.getUserMedia == null || !HAS_USER_MEDIA ){
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
            widthRounded = Math.round( drawWidth);
            heightRounded = Math.round( drawHeight );

            if (!canvas) { canvas = window.document.createElement('canvas'); }
            // document.body.appendChild(canvas);
            ctx = canvas.getContext('2d');
        },

        animloop = function () { 
            loopId = requestAnimFrame(animloop.bind(this)); 
            this.updatePixels();
        };

    // moving this to main
    // if (!navigator.getUserMedia) {
    //     navigator.getUserMedia = navigator.getUserMedia ||
    //                              navigator.webkitGetUserMedia ||
    //                              navigator.mozGetUserMedia ||
    //                              navigator.msGetUserMedia || null;
    // }
    
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
                widthRounded = Math.round( drawWidth );
                heightRounded = Math.round( drawHeight );
                canvas.width  = widthRounded;
                canvas.height = heightRounded;
            } else {
                // clear canvas
                canvas.width = canvas.width;
            }

            if (width && height) {
                lastPixels = currentPixels;

                ctx.drawImage(videoTag, 0, 0, drawWidth, drawHeight );
                var data = [];
                var pix;

                var imgd = ctx.getImageData(0, 0, drawWidth, drawHeight );
                pix = imgd.data;
                var len = pix.length;

                for(var i = 0; i < len; i += 4) {
                  var brightness = 0.34 * pix[i] + 0.5 * pix[i + 1] + 0.16 * pix[i + 2];
                  var ind = i/4;
                  // red
                  data[ind] = brightness;
                  pix[i] = brightness;
                  pix[i+1] = brightness;
                  pix[i+2] = brightness;
                }
                // delete pix;

                // debuggin ONLY
                if ( grayscale ){
                    ctx.putImageData( imgd, 0, 0 );
                }

                currentPixels = data;

                updatedCallbacks.forEach(function (callback) {
                    callback();
                });
            }
        } else {
            // width = height = 0?
        }
    };

    this.setGrayscale = function(t){
        grayscale = t;
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

    this.getDOMElement = function(){
        return canvas;
    }
}