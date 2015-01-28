// AzealiaTracking.js
// 
var AzealiaTracking = function(params)
{
	var width = params.width  || 80;
	var height = params.height  || 60;

	var avgDelta = new THREE.Vector3(0,0,0);
	var smoothedDelta = new THREE.Vector3();

	var smoothing = .85;

	var dimX = width;
	var dimY = height;


	//TRACKING
	var trackingOptions = {
		win_size: 20,
		max_iterations: 10,
		epsilon:0.1,
		min_eigen:0.001,
		threshold:20
	};

	var curr_img_pyr = new jsfeat.pyramid_t(3);
	var prev_img_pyr = new jsfeat.pyramid_t(3);
	curr_img_pyr.allocate(dimX, dimY, jsfeat.U8_t|jsfeat.C1_t);
	prev_img_pyr.allocate(dimX, dimY, jsfeat.U8_t|jsfeat.C1_t);

	var bDistortionLoaded = false;

	var point_count = 20;
	var point_status = new Uint8Array(100);
	var prev_point_status = new Uint8Array(100);
	var prev_xy = new Float32Array(point_count*2);
	var curr_xy = new Float32Array(point_count*2);
	var orig_xy = new Float32Array(point_count*2);

	var minX = dimX*.2, maxX = dimX*.8, deltaX = maxX - minX, minY = dimY*.1, maxY = dimY * .9, deltaY = maxY - minY;

	var randomX = new Float32Array(131);
	var randomY = new Float32Array(71);
	var rxIt = 0, ryIt = 0;

	for(var i in randomX)	randomX[i] = Math.random() * deltaX + minX;
	for(var i in randomY)	randomY[i] = Math.random() * deltaY + minY;

	var lookUpX = function(){
		rxIt = (rxIt+1) % randomX.length
		return randomX[rxIt];
	}
	var lookUpY = function(){
		ryIt = (ryIt+1) % randomY.length
		return randomX[ryIt];
	}

	for(var i=0;i<point_count*2;i = i + 2){
		//feature = Math.floor(Math.random()*fcount);
		curr_xy[i] = THREE.Math.randFloat(minX, maxX);
		curr_xy[i+1] = THREE.Math.randFloat(minY, maxY);
		orig_xy[i] = curr_xy[i];
		orig_xy[i+1] = curr_xy[i+1];
	}

	function lerp(a, b, t)
	{
		return a + (b-a) * t;
	}

	function updateTracking ( imageData, w, h )
	{
		// swap flow data
		var _pt_xy = prev_xy;
		prev_xy = curr_xy;
		curr_xy = _pt_xy;
		var _pyr = prev_img_pyr;
		prev_img_pyr = curr_img_pyr;
		curr_img_pyr = _pyr;

		//magic things
		jsfeat.imgproc.grayscale(imageData, w, h, curr_img_pyr.data[0]);
		jsfeat.imgproc.equalize_histogram(curr_img_pyr.data[0], curr_img_pyr.data[0]);
		curr_img_pyr.build(curr_img_pyr.data[0], true);
		jsfeat.optical_flow_lk.track(prev_img_pyr, curr_img_pyr, prev_xy, curr_xy, point_count, trackingOptions.win_size|0, trackingOptions.max_iterations|0, point_status, trackingOptions.epsilon, trackingOptions.min_eigen);

		//descern motion
		var j = 0, j1=0;
		var sampleCount=0;
		var attenuation = .0025;
		avgDelta.set(0,0,0);
		for(var i=0; i<point_count; i++)
		{
			j1 = j+1;
			if(point_status[i] && prev_point_status[i])
			{
				//amount of change
				avgDelta.x += curr_xy[j] - orig_xy[j];
				avgDelta.y += curr_xy[j1] - orig_xy[j1];
				sampleCount++;

				//attenutate the original position
				orig_xy[j] = lerp(orig_xy[j], curr_xy[j], attenuation );
				orig_xy[j1] = lerp(orig_xy[j1], curr_xy[j1], attenuation );
			}
			else 
			{
				curr_xy[j] = lookUpX();
				curr_xy[j1] = lookUpY();

				orig_xy[j] = curr_xy[j];
				orig_xy[j1] = curr_xy[j1];
			}

			j += 2;
			prev_point_status[i] = point_status[i];
		}

		if(sampleCount)
		{
			avgDelta.multiplyScalar( .1 / sampleCount );

			smoothedDelta.x = lerp(avgDelta.x, smoothedDelta.x, smoothing );
			smoothedDelta.y = lerp(avgDelta.y, smoothedDelta.y, smoothing );
			smoothedDelta.z = lerp(avgDelta.z, smoothedDelta.z, smoothing );
		}
	}

	function update( inputData, w, h )
	{
		updateTracking ( inputData, w, h );
	}

	return {
		update: update,
		width: width,
		height: height,
		delta: smoothedDelta,
		smoothing: smoothing
	}
}
