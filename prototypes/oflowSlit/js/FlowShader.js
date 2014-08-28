// FlowShader.js


var FlowShader = function(params)
{
	params = params || {};

	var matParams = {
		transparent: true,
		blending: params.blending || 1,
		depthTest: params.depthTest || true,
		side: params.side || 2,// 0 = backFaceCull, 1 = frontFaceCull, 2 = doubleSided


		uniforms: {
			map: {type: 't', value: params.map || undefined },
			previousMap: {type: 't', value: params.previousMap || undefined },
			decay: {type: 'f', value: params.decay || .9},
			threshold: {type: 'f', value: params.threshold || .1},
			width: {type: 'f', value: params.width || window.innerWidth},
			height: {type: 'f', value: params.height || window.innerHeight},
			screendim: {type: 'v2', value: params.screendim || new THREE.Vector2( window.innerWidth, window.innerHeight )}

		},

		vertexShader: [
		'uniform float width;',
		'uniform float height;',
		'uniform vec2 screendim;',

		'float mapLinear( in float x, in float a1, in float a2, in float b1, in float b2 ) {',
		'	return b1 + ( x - a1 ) * ( b2 - b1 ) / ( a2 - a1 );',
		'}',

		'varying vec2 vUv;',
		'void main() {',
		'	vUv = uv;',

		'	vec3 p = position;',
		// '	p.x = mapLinear(p.x, -1. ,1., -1., -1. + 2. * width / screendim.x);',
		// '	p.y = mapLinear(p.y, -1. ,1., -1., -1. + 2. * height / screendim.y);',

		'	gl_Position = vec4( p, 1.0 );',
		'}'].join('\n'),


		fragmentShader: [
		'uniform sampler2D map;',
		'uniform sampler2D previousMap;',
		'uniform float decay;',
		'varying vec2 vUv;',

		'void main()',
		'{',	
		'	vec4 current = texture2D(map, vUv);',
		'	vec4 previous = texture2D(previousMap, vUv);',
		'	gl_FragColor = max( current, mix(current, previous, decay));',
		'}'
		].join('\n'),

	}

	THREE.ShaderMaterial.call( this, matParams );
}


FlowShader.prototype = Object.create( THREE.ShaderMaterial.prototype );