// BleedShader.js


/**
 * BleedShader.js
 */


var BleedShader = function(params)
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
			decay: {type: 'f', value: params.decay || .97},
			timeDelta: {type: 'f', value: params.timeDelta || 1},
			bleedDistance: {type: 'f', value: params.bleedDistance || 3}
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
		'uniform float bleedDistance;',
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
		'	vec2 sampleOffset = bleedDistance / (vec2(1280., 720.));',
		'	vec4 lastDiff = vec4(0.);',

		//sample the delta texture to get a local vector. we could probably pass this off to onther pass later on
		'	vec2 sampleDirection = vec2(0.,0.);',
		'	sampleDirection.x = getGray(texture2D(lastDiffTex, vec2(vUv.x - sampleOffset.x, vUv.y)).xyz);',
		'	sampleDirection.x -= getGray(texture2D(lastDiffTex, vec2(vUv.x + sampleOffset.x, vUv.y)).xyz);',

		'	sampleDirection.y = getGray(texture2D(lastDiffTex, vec2(vUv.x, vUv.y - sampleOffset.y )).xyz);',
		'	sampleDirection.y -= getGray(texture2D(lastDiffTex, vec2(vUv.x, vUv.y + sampleOffset.y )).xyz);',

		//	sample normal map to add some global direction
		'	sampleDirection += (texture2D(directionalTex, vUv).xy * 2. - 1.);',

		'	sampleDirection *= -sampleDist;',

		'	gl_FragColor = vec4(1., 0., 0., 1.);',

		//what are we doing
		'	float dk = decay;',
		
		//get our sample offset
		'	vec2 uv = vUv + (sampleDirection * sampleOffset + bleedDir);',
		
		// sample the last frame
		'	vec4 lastFrame = texture2D(lastDiffTex, vUv );',
		'	vec4 lastFrameBled = texture2D(lastDiffTex, uv );',

		//sample our current frame
		'	vec4 currentFrame = mix(texture2D(previousTex, vUv), texture2D(currentTex, vUv), mixVal);',
		'	vec4 currentFrameBled = mix(texture2D(previousTex, uv), texture2D(currentTex, uv), mixVal);',

		'	gl_FragColor = max(lastFrameBled * dk, max(lastFrame * dk, currentFrameBled));',

		'}'].join('\n'),

	}

	THREE.ShaderMaterial.call( this, matParams );
}


BleedShader.prototype = Object.create( THREE.ShaderMaterial.prototype );