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
			backgroundTex: {type: 't', value: params.backgroundTex || undefined },

			directionalTex: {type: 't', value: params.directionalTex || undefined },

			mixVal: {type: 'f', value: params.mixVal || 0},
			time: {type: 'f', value: params.time || 0},
			bleedDir: {type: 'v2', value: params.bleedDir || new THREE.Vector2( 0, -.0025 )},
			bleedExpo: {type: 'f', value: params.bleedExpo || 10},
			decay: {type: 'f', value: params.decay || .97},
			timeDelta: {type: 'f', value: params.timeDelta || 1},
			bleedDistance: {type: 'f', value: params.bleedDistance || 3},

			greenScreen: {type: 'v3', value: params.greenScreen || new THREE.Vector3( 0.2941, 0.4352, 0.1764 )},
			greenScreen1: {type: 'v3', value: params.greenScreen || new THREE.Vector3( .384, 0.565, 0.247 )},
			alphaThreshold: {type: 'f', value: params.alphaThreshold || 1},
			K0: {type: 'f', value: params.K0 || 1},
			K1: {type: 'f', value: params.K1 || 1},
			K2: {type: 'f', value: params.K2 || 0.5},
			offset: {type: 'f', value: params.offset || .05}
		},

		vertexShader: [
		'varying vec2 vUv;',
		'void main() {',
		'	vUv = uv;',
		'	gl_Position = vec4( position, 1.0 );',
		'}'].join('\n'),

		fragmentShader: [
		'uniform sampler2D backgroundTex;',
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

		'uniform vec3 greenScreen;',
		'uniform vec3 greenScreen1;',
		'uniform float alphaThreshold;',
		'uniform float K0;',
		'uniform float K1;',
		'uniform float K2;',
		'uniform float offset;',

		'varying vec2 vUv;',

		'float getGray(vec3 rgb)',
		'{',
		'	return rgb.x * .3 + rgb.x * .59 + rgb.x * .11;',
		'}',

		'vec3 rgb2hsv(vec3 c)',
		'{',
		'    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);',
		'    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));',
		'    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));',
		'    float d = q.x - min(q.w, q.y);',
		'    float e = 1.0e-10;',
		'    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);',
		'}',

		'vec3 hsv2rgb(vec3 c)',
		'{',
		'    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);',
		'    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);',
		'    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);',
		'}',

		'float greenVal( vec3 rgb, vec3 green){',
		'	vec3 hsv = rgb2hsv(rgb);',
		'	vec3 greenHsv = rgb2hsv(green);',
		'	vec3 minHSV = greenHsv - offset;',
		'	vec3 maxHSV = greenHsv + offset;',

	    '	if (hsv.x < minHSV.x - offset) return 1.0;',
	    '	if (hsv.x > maxHSV.x + offset) return 1.0;',
	    '	if (hsv.y < minHSV.y - K1) return 1.0;',
	    '	if (hsv.y > maxHSV.y + K1) return 1.0;',
	    '	if (hsv.z < minHSV.z - K2) return 1.0;',
	    '	if (hsv.z > maxHSV.z + K2) return 1.0;',

	    '	vec3 delta = abs(hsv - greenHsv);',

		'	float opacity = (delta.x / K0);',
		'	opacity = max(opacity, delta.y / K1);',
		'	opacity = max(opacity, delta.z / K2);',

	    '	return clamp(opacity, 0., 1.);',
		'}',

		'void main() {',


		'	float sampleCount = 0.;',
		'	float sampleDist = timeDelta;',
		'	vec2 sampleOffset = bleedDistance / (vec2(1280., 720.));',
		'	vec4 lastDiff = vec4(0.);',

		//sample the delta texture to get a rough local vector. 
		//we could probably pass this off to onther pass later on
		'	vec2 sampleDirection = vec2(0.,0.);',
		'	sampleDirection.x = getGray(texture2D(lastDiffTex, vec2(vUv.x - sampleOffset.x, vUv.y)).xyz);',
		'	sampleDirection.x -= getGray(texture2D(lastDiffTex, vec2(vUv.x + sampleOffset.x, vUv.y)).xyz);',
		'	sampleDirection.y = getGray(texture2D(lastDiffTex, vec2(vUv.x, vUv.y - sampleOffset.y )).xyz);',
		'	sampleDirection.y -= getGray(texture2D(lastDiffTex, vec2(vUv.x, vUv.y + sampleOffset.y )).xyz);',

		//	sample normal map to add some global/fluid direction
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