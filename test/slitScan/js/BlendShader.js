/**
 * BlendShader.js
 */


var BlendShader = function(params)
{
	params = params || {};

	params.slits = params.slits || [ new THREE.Texture() ];

	var matParams = {
		transparent: true,
		blending: params.blending || 1,
		depthTest: params.depthTest || true,
		side: params.side || 2,// 0 = backFaceCull, 1 = frontFaceCull, 2 = doubleSided


		uniforms: {
			blendMap: {type: 't', value: params.blendMap || undefined },
			previousTex: {type: 't', value: params.previousTex || undefined },
			currentTex: {type: 't', value: params.currentTex || undefined },
			mixVal: {type: 'f', value: params.mixVal || .5}
		},

		vertexShader: [
		'varying vec2 vUv;',
		'void main() {',
		'	vUv = uv;',
		'	gl_Position = vec4( position, 1.0 );',
		'}'].join('\n'),

		fragmentShader: [

		'uniform sampler2D blendMap;',
		'uniform sampler2D backgroundTex;',
		'uniform sampler2D previousTex;',
		'uniform sampler2D currentTex;',
		'uniform float mixVal;',	

		'varying vec2 vUv;',

		'float mapLinear( in float x, in float a1, in float a2, in float b1, in float b2 ) {',
		'	return b1 + ( x - a1 ) * ( b2 - b1 ) / ( a2 - a1 );',
		'}',

		'float getGray(vec3 rgb)',
		'{',
		'	return rgb.x * .3 + rgb.x * .59 + rgb.x * .11;',
		'}',

		'void main()',
		'{',	
		'	vec2 halfUv = vec2(vUv.x, mapLinear(vUv.y, 0.0, 1.0, .5, 1.0));',
		'	vec4 blendSample = texture2D(currentTex, halfUv );',
		// '	vec2 pUv = vUv;',
		// '	vec2 cUv = vUv;// + vec2(0., .4 * (1. - mixVal) * (b*2. - 1.));',

<<<<<<< HEAD
		'	float b = clamp( texture2D(blendMap, vUv).x + (mixVal * 2. - 1.), 0., 1.);',

		'	vec2 pUv = vUv;',
		'	vec2 cUv = vUv;// + vec2(0., .4 * (1. - mixVal) * (b*2. - 1.));',
=======
		'	vec2 pUv = halfUv;',
		'	vec2 cUv = halfUv;// + vec2(0., .4 * (1. - mixVal) * (b*2. - 1.));',

		'	vec2 uvLow = vec2(vUv.x, vUv.y/2.0);',
		'	vec4 blendAlphaP = texture2D(previousTex, uvLow);',
		'	vec4 blendAlphaC = texture2D(currentTex, uvLow);',
>>>>>>> FETCH_HEAD

		'	vec4 p = texture2D(previousTex, pUv);',
		'	vec4 c = texture2D(currentTex, cUv);',
		'	p.w = blendAlphaP.x;',
		'	c.w = blendAlphaC.x;',

		'	vec4 mixed = mix(p, c, b);',

		'	gl_FragColor = mixed;',
		'}'
		].join('\n'),

	}

	THREE.ShaderMaterial.call( this, matParams );
}


BlendShader.prototype = Object.create( THREE.ShaderMaterial.prototype );