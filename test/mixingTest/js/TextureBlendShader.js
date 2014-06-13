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
			blendMap: {type: 't', value: params.blendMap || undefined },
			previousTex: {type: 't', value: params.previousTex || undefined },
			currentTex: {type: 't', value: params.currentTex || undefined },
			mixVal: {type: 'f', value: params.mixVal || .5}
		},

		vertexShader: [
		'varying vec2 vUv;',
		'void main() {',
		'	vUv = uv;',
		'	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
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

  		//we could try passinf the half vector as a varying...
		'void main()',
		'{',	
		'	vec4 blendSample = texture2D(blendMap, vUv);',

		'	float b = blendSample.x;',

		'	float m = mapLinear(b,0.,1.,.01, .99) > mixVal ? 0. : 1.;//clamp((mixVal * 2. - 1.) + b, 0., 1.);',

		'	vec2 pUv = vUv;',
		'	vec2 cUv = vUv + vec2(0., .4 * (1. - mixVal) * (b*2. - 1.));',

		'	vec4 p = texture2D(previousTex, pUv);',
		'	vec4 c = texture2D(currentTex, cUv);',

		'	vec4 mixed = mix(p, c, m);',

		'	gl_FragColor = mixed;',
		'}'
		].join('\n'),

	}

	THREE.ShaderMaterial.call( this, matParams );
}


TextureBlendShader.prototype = Object.create( THREE.ShaderMaterial.prototype );