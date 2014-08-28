/**
 * TextureBlendShader.js
 */


var TextureBlendShader = function(params)
{
	params = params || {};

	var matParams = {
		transparent: true,
		blending: params.blending || 1,
		depthTest: params.depthTest || true,
		side: params.side || 2,// 0 = backFaceCull, 1 = frontFaceCull, 2 = doubleSided


		uniforms: {
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
		'varying vec2 vUv;',
		'void main() {',
		'	vUv = uv;',
		'	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
		'}'].join('\n'),

		fragmentShader: [

		'uniform sampler2D backgroundTex;',
		'uniform sampler2D previousTex;',
		'uniform sampler2D currentTex;',
		'uniform float mixVal;',	
		'uniform float offset;',

		'varying vec2 vUv;',

		'float mapLinear( in float x, in float a1, in float a2, in float b1, in float b2 ) {',
		'	return b1 + ( x - a1 ) * ( b2 - b1 ) / ( a2 - a1 );',
		'}',

  		//we could try passinf the half vector as a varying...
		'void main() {',
		'	vec2 halfUv = vec2(vUv.x, mapLinear(vUv.y, 0.0, 1.0, .5, 1.0));',
		'	vec4 blendSample = texture2D(currentTex, halfUv );',

		// BG placeholder
		'	vec4 bgSample = texture2D(backgroundTex, vUv );',

		'	float b = blendSample.x;',

		'	float m = mapLinear(b,0.,1.,.01, .99) > mixVal ? 0. : 1.;//clamp((mixVal * 2. - 1.) + b, 0., 1.);',

		'	vec2 pUv = halfUv;',
		'	vec2 cUv = halfUv;// + vec2(0., .4 * (1. - mixVal) * (b*2. - 1.));',

		'	vec2 uvLow = vec2(vUv.x, vUv.y/2.0);',
		'	vec4 blendAlphaP = texture2D(previousTex, uvLow);',
		'	vec4 blendAlphaC = texture2D(currentTex, uvLow);',

		'	vec4 p = texture2D(previousTex, pUv);',
		'	vec4 c = texture2D(currentTex, cUv);',
		'	p.w = blendAlphaP.x;',
		'	c.w = blendAlphaC.x;',

		'	vec4 mixed = mix(p, c, m);',
		'	mixed = mix(mixed, bgSample, 1.0-blendAlphaC.x);',

		'	gl_FragColor = mixed;',
		
		'}'].join('\n'),

	}

	THREE.ShaderMaterial.call( this, matParams );
}


TextureBlendShader.prototype = Object.create( THREE.ShaderMaterial.prototype );