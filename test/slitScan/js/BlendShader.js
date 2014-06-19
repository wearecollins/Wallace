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
			backgroundTex: {type: 't', value: params.backgroundTex || undefined },
			mixVal: {type: 'f', value: params.mixVal || .5},
			time: {type:'f', value: params.time || 0},
			useBlendMap: {type: 'f', value: params.useBlendMap || 1}
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
		'uniform float useBlendMap;',
		'uniform float time;',

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
		'	vec2 alphaUv = vUv * vec2(1., .5);',
		'	vec2 colorUv = vUv * vec2(1., .5) + vec2(0., .5);',

		// '	colorUv.y = mapLinear(colorUv.y, .5, 1., mix(.5, colorUv.y, mixVal), mix(1., colorUv.y, mixVal));',

		'	vec2 bUv = vUv;',
		'	bUv.y += time;',
		'	bUv.y -= floor(alphaUv.y);',

		'	float a0 = texture2D(previousTex, alphaUv).x;',
		'	float a1 = texture2D(currentTex, alphaUv).x;',

		'	vec4 p = texture2D(previousTex, colorUv);',
		'	vec4 c = texture2D(currentTex, colorUv);',
		'	vec4 bg = texture2D(backgroundTex, vUv);',

		// '	if(a0 < .1 && a1 < .1)	discard;',

		'	float b = (int(useBlendMap) == 1)? clamp( texture2D(blendMap, bUv).x + (mixVal * 2. - 1.), 0., 1.) : mixVal;',
		// '	float b = clamp( texture2D(blendMap, vUv).x + (mixVal * 2. - 1.), 0., 1.);',

		//for now, we'll just map to black
		'	p.xyz *= a0;',
		// '	p.xyz += (bg.xyz * (1.0 - mix(a0, a1, b)));',
		'	c.xyz *= a1;',
		// '	c.xyz += (bg.xyz * (1.0 - mix(a0, a1, b)));',

		'	vec4 mixed = mix(p, c, b);',
		'	mixed = mix(mixed, bg, 1.0 - a0);',

		'	gl_FragColor = mixed;',
		'}'
		].join('\n'),

	}

	THREE.ShaderMaterial.call( this, matParams );
}


BlendShader.prototype = Object.create( THREE.ShaderMaterial.prototype );