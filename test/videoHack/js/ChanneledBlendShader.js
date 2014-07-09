/**
 * ChanneledBlendShader.js
 */


var ChanneledBlendShader = function(params)
{
	params = params || {};

	params.slits = params.slits || [ new THREE.Texture() ];

	var matParams = {
		transparent: true,
		blending: params.blending || 1,
		depthTest: params.depthTest || false,
		side: params.side || 2,// 0 = backFaceCull, 1 = frontFaceCull, 2 = doubleSided


		uniforms: {
			blendMap: {type: 't', value: params.blendMap || undefined },

			previousTex: {type: 't', value: params.previousTex || undefined },
			currentTex: {type: 't', value: params.currentTex || undefined },
			currentUOffset: {type: 'f', value: 0},
			previousUOffset: {type: 'f', value: 0},

			backgroundTex: {type: 't', value: params.backgroundTex || undefined },

			mixVal: {type: 'f', value: params.mixVal || 1},
			time: {type:'f', value: params.time || 0},
			useBlendMap: {type: 'f', value: params.useBlendMap || 1},
		},

		vertexShader: [
		'varying vec2 vUv;',
		'void main() {',
		'	vUv = vec2(uv.x*.5, uv.y);',
		'	gl_Position = vec4( position, 1.0 );',
		// '	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
		'}'].join('\n'),

		fragmentShader: [

		'uniform sampler2D blendMap;',
		'uniform sampler2D previousTex;',
		'uniform sampler2D currentTex;',
		'uniform float currentUOffset;',
		'uniform float previousUOffset;',
		'uniform float mixVal;',	
		// 'uniform float useBlendMap;',

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
		'	float b = clamp( texture2D(blendMap, vUv).x + (mixVal * 2. - 1.), 0., 1.);',

		'	vec2 alphaUv = vUv * vec2(1., .5);',
		'	vec2 colorUv = vUv * vec2(1., .5) + vec2(0., .5);',

		'	float a0 = texture2D(currentTex, alphaUv + vec2(currentUOffset, 0.)).x;',
		'	float a1 = texture2D(previousTex, alphaUv + vec2(previousUOffset, 0.)).x;',

		'	vec4 c = texture2D(currentTex, colorUv + vec2(currentUOffset, 0.));',
		'	vec4 p = texture2D(previousTex, colorUv + vec2(previousUOffset, 0.));',

		'	c *= a0;',
		'	p *= a1;',
		'	vec4 col = mix(p, c, b);',

		'	gl_FragColor = col;',
		'}'
		].join('\n'),

	}

	THREE.ShaderMaterial.call( this, matParams );
}

ChanneledBlendShader.prototype = Object.create( THREE.ShaderMaterial.prototype );

ChanneledBlendShader.prototype.setCurrentTexture = function( texture, uOffset )
{
	this.uniforms.currentTex.value = texture;
	this.uniforms.currentUOffset.value = uOffset;
}

ChanneledBlendShader.prototype.setPreviousTexture = function( texture, uOffset )
{
	this.uniforms.previousTex.value = texture;	
	this.uniforms.previousUOffset.value = uOffset;
}

