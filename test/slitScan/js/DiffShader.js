// DiffShader.js


var DiffShader = function(params)
{
	params = params || {};

	var matParams = {
		transparent: true,
		blending: params.blending || 1,
		depthTest: params.depthTest || true,
		side: params.side || 2,// 0 = backFaceCull, 1 = frontFaceCull, 2 = doubleSided


		uniforms: {
			camera: {type: 't', value: params.camera || undefined },
			background: {type: 't', value: params.background || undefined },
			threshold: {type: 'f', value: params.threshold || .075},
			flowScale: {type: 'f', value: params.flowScale || 3.},
			step: {type: 'v2', value: params.step || new THREE.Vector2( 1/ 64, 1/48 )}
		},

		vertexShader: [
		'uniform float width;',
		'uniform float height;',
		'uniform vec2 screendim;',

		'float mapLinear( in float x, in float a1, in float a2, in float b1, in float b2 ) {',
		'	return b1 + ( x - a1 ) * ( b2 - b1 ) / ( a2 - a1 );',
		'}',

		'varying vec2 vUv;',
		'void main() {',
		'	vUv = uv;',

		'	vec3 p = position;',

		'	gl_Position = vec4( p, 1.0 );',
		'}'].join('\n'),


		fragmentShader: [
		'uniform sampler2D camera;',
		'uniform sampler2D background;',
		'uniform float threshold;',
		'uniform float flowScale;',
		'uniform vec2 step;',
		'varying vec2 vUv;',

		'float getGray(vec3 rgb)',
		'{',
		'	return rgb.x * .3 + rgb.x * .59 + rgb.x * .11;',
		'}',

		'float getDelta(vec2 uv){',
		'	float cam = getGray(texture2D(camera, uv).xyz);',
		'	float bg = getGray(texture2D(background, uv).xyz);',
		'	return abs(cam - bg);',
		'}',

		'void main()',
		'{',	
		'	float delta = getDelta(vUv);',

		//sample neighbors
		'	vec3 dir =  vec3(0.,0.,1.);',

		//4 samples
		'	dir.x = flowScale * abs(getDelta(vUv - vec2(step.x, 0.)) - getDelta(vUv + vec2(step.x, 0.)));',
		'	dir.y = flowScale * abs(getDelta(vUv - vec2(0., step.y)) - getDelta(vUv + vec2(0., step.y)));',
		

		// '	vec3 dir = vec3(0.,0., 0.);',
		// '	for(int i=-1; i<2; i++){',
		// '		for(int j=-1; j<2; j++){',
		// '			float val = getGray(texture2D(camera, vUv + vec2(float(i) * step.x, float(j) * step.y)).xyz);',
		// '			float valbg = getGray(texture2D(background, vUv + vec2(float(i) * step.x, float(j) * step.y)).xyz);',
		// '			float valDelta = abs(val - valbg);',
		// '			if(i != 0){',
		// '				dir.x = float(i) * valDelta;',
		// '			}',
		// '			if(j != 0){',
		// '				dir.y = float(j) * valDelta;',
		// '			}',
		// '		}',
		// '	}',
		// '	normalize(-dir);',

		'	gl_FragColor = delta > threshold?  vec4(dir * .5 + .5, 1.) : vec4(0., 0., 0., 1.);',
		'}'
		].join('\n'),

	}

	THREE.ShaderMaterial.call( this, matParams );
}


DiffShader.prototype = Object.create( THREE.ShaderMaterial.prototype );