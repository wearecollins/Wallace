/**
 * TextureBlendShader.js
 */


var TextureBlendShader = function(params)
{
	params = params || {};

	var lightPositions = [], lightColors = [], lights = params.lights || [];
	var numLights = lights.length;
	for (var i = 0; i < numLights; i++) {
		lightPositions[i] = lights[i].position;
		lightColors[i] = lights[i].color;
	};

	var matParams = {
		transparent: true,
		blending: params.blending || 1,
		depthTest: params.depthTest || true,
		side: params.side || 2,// 0 = backFaceCull, 1 = frontFaceCull, 2 = doubleSided


		uniforms: {
			blendMap: {type: 't', value: params.blendMap || undefined },
			backgroundTex: {type: 't', value: params.backgroundTex || undefined },
			previousTex: {type: 't', value: params.previousTex || undefined },
			currentTex: {type: 't', value: params.currentTex || undefined },
			color: {type: 'c', value: new THREE.Color( params.color || 0xFFFFFF) },
			mixVal: {type: 'f', value: params.mixVal || .5},
			greenScreen: {type: 'v3', value: params.greenScreen || new THREE.Vector3( 0.2941, 0.4352, 0.1764 )},
			greenScreen1: {type: 'v3', value: params.greenScreen || new THREE.Vector3( .384, 0.565, 0.247 )},
			alphaThreshold: {type: 'f', value: params.alphaThreshold || 1},
			K0: {type: 'f', value: params.K0 || 1},
			K1: {type: 'f', value: params.K1 || 1},
			K2: {type: 'f', value: params.K2 || 0.5},
			offset: {type: 'f', value: params.offset || .05}
		},

		vertexShader: [
		//light positions and colors(colors are xtz not rgb)

		'varying vec2 vUv;',
		// 'varying vec3 vNormal;',
		// 'varying vec4 ecPosition;',
		// 'varying vec3 eye;',
		'void main() {',
		'	vUv = uv;',
		// '	vNormal = normalize(normalMatrix * normal);',
		// '	ecPosition = modelViewMatrix * vec4( position, 1.0 );',
		// '	eye = -normalize(ecPosition.xyz);',

		'	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
		'}'].join('\n'),

		fragmentShader: [

		'uniform sampler2D blendMap;',
		'uniform sampler2D backgroundTex;',
		'uniform sampler2D previousTex;',
		'uniform sampler2D currentTex;',
		'uniform vec3 greenScreen;',
		'uniform vec3 greenScreen1;',
		'uniform float alphaThreshold;',
		'uniform float mixVal;',	
		'uniform float K0;',
		'uniform float K1;',
		'uniform float K2;',
		'uniform float offset;',

		// 'varying vec4 ecPosition;',
		// 'varying vec3 vNormal;',
		// 'varying vec3 eye;',
		'varying vec2 vUv;',


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


		'float mapLinear( in float x, in float a1, in float a2, in float b1, in float b2 ) {',
		'	return b1 + ( x - a1 ) * ( b2 - b1 ) / ( a2 - a1 );',
		'}',

  		//we could try passinf the half vector as a varying...
		'void main() {',
		'	float blendVal = texture2D(blendMap, vUv ).x;',
		
		// '	blendVal = mixVal > blendVal ? 1. : 0.;',

		'	blendVal = clamp( mixVal*2. - blendVal, 0., 1.);',

		'	vec4 prev = texture2D(previousTex, vUv );',
		'	vec4 current = texture2D(currentTex, vUv );',

		'	vec3 gHSV = rgb2hsv(greenScreen);',
		'	vec3 pHSV = rgb2hsv(prev.xyz);',

		//I JUST MADE THIS UP without any research! there is probably a better way to alpha out the green screen
		//if one of them is green then we blend the other with the background
		'	vec4 bgCol = texture2D(backgroundTex, vUv );',

		'	float gVal = greenVal(prev.xyz, greenScreen);',
		'	gVal = min(gVal, greenVal(prev.xyz, greenScreen1));',
		'	prev = mix(bgCol, prev, gVal);',

		'	gVal = greenVal(current.xyz, greenScreen);',
		'	gVal = min(gVal, greenVal(current.xyz, greenScreen1));',
		'	current = mix(bgCol, current, gVal);',

		'	gl_FragColor = mix(prev, current, blendVal);',
		'}'].join('\n'),

	}

	THREE.ShaderMaterial.call( this, matParams );
}


TextureBlendShader.prototype = Object.create( THREE.ShaderMaterial.prototype );