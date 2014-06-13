/**
 * AlphaLookupShader.js
 */


var AlphaLookupShader = function(params)
{
	params = params || {};

	var matParams = {
		transparent: true,
		blending: params.blending || 1,
		depthTest: params.depthTest || true,
		side: params.side || 2,// 0 = backFaceCull, 1 = frontFaceCull, 2 = doubleSided


		uniforms: {
			currentTex: {type: 't', value: params.currentTex || undefined }
		},

		vertexShader: [
		'varying vec2 vUv;',
		'void main() {',
		'	vUv = uv;',
		'	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
		'}'].join('\n'),

		fragmentShader: [

		'uniform sampler2D currentTex;',
		'uniform float texH;',

		'varying vec2 vUv;',

		'float mapLinear( in float x, in float a1, in float a2, in float b1, in float b2 ) {',
		'	return b1 + ( x - a1 ) * ( b2 - b1 ) / ( a2 - a1 );',
		'}',

  		//we could try passinf the half vector as a varying...
		'void main()',
		'{',	
		'	vec4 blendSample = texture2D(currentTex, vec2(vUv.x, mapLinear(vUv.y, 0.0, 1.0, .5, 1.0)) );',
		'	vec2 uvLow = vec2(vUv.x, vUv.y/2.0 + texH);',
		'	vec4 blendAlpha = texture2D(currentTex, uvLow);',

		'	blendSample.w = blendAlpha.x;',

		'	gl_FragColor = blendSample;',
		'}'
		].join('\n'),

	}

	THREE.ShaderMaterial.call( this, matParams );
}


AlphaLookupShader.prototype = Object.create( THREE.ShaderMaterial.prototype );