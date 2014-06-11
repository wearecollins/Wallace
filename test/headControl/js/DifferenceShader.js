/**
 * DifferenceShader.js
 */


var DifferenceShader = function(params)
{
	params = params || {};

	var matParams = {
		transparent: false,
		blending: params.blending || 1,
		depthTest: params.depthTest || false,
		side: params.side || 2,// 0 = backFaceCull, 1 = frontFaceCull, 2 = doubleSided
		useBlurring: params.useBlurring || false,

		uniforms: 
		{
			lastDiffTex: {type: 't', value: params.lastDiffTex || undefined },
			previousTex: {type: 't', value: params.previousTex || undefined },
			currentTex: {type: 't', value: params.currentTex || undefined },

			directionalTex: {type: 't', value: params.directionalTex || undefined },

			mixVal: {type: 'f', value: params.mixVal || 0},
			time: {type: 'f', value: params.time || 0},
			bleedDir: {type: 'v2', value: params.bleedDir || new THREE.Vector2( 0, -.0025 )},
			bleedExpo: {type: 'f', value: params.bleedExpo || 10},
			decay: {type: 'f', value: params.decay || .99},
			timeDelta: {type: 'f', value: params.timeDelta || 1}
		},

		vertexShader: [
		'varying vec2 vUv;',
		'void main() {',
		'	vUv = uv;',
		'	gl_Position = vec4( position, 1.0 );',
		'}'].join('\n'),

		fragmentShader: [
		'uniform sampler2D lastDiffTex;',
		'uniform sampler2D previousTex;',
		'uniform sampler2D currentTex;',

		'uniform sampler2D directionalTex;',
		'uniform vec2 bleedDir;',
		'uniform float time;',
		'uniform float bleedExpo;',
		'uniform float decay;',
		'uniform float timeDelta;',

		'uniform float mixVal;',

		'varying vec2 vUv;',

		'float getGray(vec3 rgb)',
		'{',
		'	return rgb.x * .3 + rgb.x * .59 + rgb.x * .11;',
		'}',


		'void main() {',


		'	float sampleCount = 0.;',
		'	float sampleDist = timeDelta;',
		'	vec2 sampleOffset = 2. / (vec2(1280., 720.) * .25);',
		'	vec4 lastDiff = vec4(0.);',

		//sample the delta texture to get a local vector. we could probably pass this off to onther pass later on
		'	vec2 sampleDirection = vec2(0.,0.);',
		'	sampleDirection.x = getGray(texture2D(lastDiffTex, vec2(vUv.x - sampleOffset.x, vUv.y)).xyz);',
		'	sampleDirection.x -= getGray(texture2D(lastDiffTex, vec2(vUv.x + sampleOffset.x, vUv.y)).xyz);',

		'	sampleDirection.y = getGray(texture2D(lastDiffTex, vec2(vUv.x, vUv.y - sampleOffset.y )).xyz);',
		'	sampleDirection.y -= getGray(texture2D(lastDiffTex, vec2(vUv.x, vUv.y + sampleOffset.y )).xyz);',

		//	sample normal map to add some global direction
		'	sampleDirection += (texture2D(directionalTex, vUv).xy * 2. - 1.);',

		'	sampleDirection *= sampleOffset * -sampleDist;',

		//	no blurring
		'	vec2 uv = vUv + sampleDirection + bleedDir;',
		'	uv.y -= floor(uv.y);',
		'	lastDiff = texture2D(lastDiffTex, uv );',

		// 	//blurring
		// '	for(int i=-2; i<3; i++)',
		// '	{',
		// '		for(int j=-2; j<3; j++)',
		// '		{',
		// // '			lastDiff = max(texture2D(lastDiffTex, vUv + (vec2(i, j) * sampleOffset) + sampleDirection ),lastDiff);',
		// '			lastDiff += texture2D(lastDiffTex, vUv + (vec2(i, j) * sampleOffset) + sampleDirection );',
		// '			sampleCount++;',
		// '		}',
		// '	}',
		// '	lastDiff /= sampleCount;',

		'	vec4 prev = texture2D(previousTex, vUv );',
		'	vec4 current = texture2D(currentTex, vUv );',
		// '	vec4 diff = abs(mix(current, prev, mixVal) - current);',
		// '	vec4 diff = max(vec4(0.), mix(current, prev, mixVal) - current);',

		'	vec4 diff = max(vec4(0.), mix(current, prev, 1. - pow(1.-mixVal, bleedExpo)) - current);',

		'	float delta = (diff.x + diff.y + diff.z) > .1 ? 1. : 0.;',
		'	vec3 c = diff.xyz;//vec3(delta);',

		'	gl_FragColor = max(vec4(c, 1.), vec4(lastDiff.xyz * decay, 1.));',
		'}'].join('\n'),

	}

	THREE.ShaderMaterial.call( this, matParams );
}


DifferenceShader.prototype = Object.create( THREE.ShaderMaterial.prototype );