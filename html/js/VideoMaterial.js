/**
 * VideoMaterial.js
 */

var VideoMaterial = function(params)
{
	params = params || {};
	
	var matParams = {
		transparent: true,
		blending: params.blending || 1,
		depthTest: params.depthTest || false,
		side: params.side || 2,// 0 = backFaceCull, 1 = frontFaceCull, 2 = doubleSided

		uniforms: {
			map: {type: 't', value: params.map },
		},

		attributes: {
		},

		vertexShader: [
		'varying vec2 vUv;',
		'varying vec2 vUvAlpha;',

		'void main() {',
		'	vUv = vUvAlpha = uv * vec2(1., .5);',
		'	vUv.y += .5;',
		'	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
		'}'].join('\n'),

		fragmentShader: [
		'uniform sampler2D map;',
		'varying vec2 vUv;',
		'varying vec2 vUvAlpha;',

		'void main()',
		'{',
		'	gl_FragColor = vec4(texture2D(map, vUv).xyz, texture2D(map, vUvAlpha).x);',
		'}'
		].join('\n'),

	}

	THREE.ShaderMaterial.call( this, matParams );
}


VideoMaterial.prototype = Object.create( THREE.ShaderMaterial.prototype );