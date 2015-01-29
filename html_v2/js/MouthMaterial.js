// MouthMaterial.js


var MouthMaterial = function(params)
{
	params = params || {};
	
	var matParams = {
		transparent: true,
		blending: params.blending || 1,
		depthTest: params.depthTest || true,
		side: params.side || 2,// 0 = backFaceCull, 1 = frontFaceCull, 2 = doubleSided

		uniforms: {
			map: {type: 't', value: params.map },
			aspect: {type: 'f', value: params.aspect || 0.5625},
			screenAspect: {type: 'f', value: params.screenAspect || (window.innerHeight / window.innerWidth)},
			uvScale: {type: 'v2', value: params.uvScale || new THREE.Vector2(1,1) },
			opacity: {type: 'f', value: params.opacity !== undefined ? params.opacity : 1. }
		},

		attributes: {
		},

		vertexShader: [
		'uniform vec2 uvScale;',
		'uniform float aspect;',
		'uniform float screenAspect;',
		'varying vec2 mUv;',
		'varying vec2 vUv;',
		'varying vec2 vUvAlpha;',

		'float mapLinear( in float x, in float a1, in float a2, in float b1, in float b2 ) {',
		'	return b1 + ( x - a1 ) * ( b2 - b1 ) / ( a2 - a1 );',
		'}',

		'void main() {',
		// '	vUv = vUvAlpha = uv * vec2(1., .5);',
		// '	vUv.y += .5;',
		'	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
		'	mUv = uv;',
		'	vUv.x = mapLinear(gl_Position.x, -1., 1., 0., 1.);',
		'	vUv.y = mapLinear(gl_Position.y, - aspect / screenAspect, aspect / screenAspect, 0.5, 1.);',

		'}'].join('\n'),

		fragmentShader: [
		'uniform sampler2D map;',
		'uniform float opacity;',
		'varying vec2 mUv;',
		'varying vec2 vUv;',
		'varying vec2 vUvAlpha;',

		'void main()',
		'{',
		'	float alpha =  opacity * (1. - pow(length( (mUv*2.-1.) ), 4.));',
		'	gl_FragColor = texture2D(map, vUv) * vec4(1., 1., 1. , alpha);',
		'}'
		].join('\n'),

	}

	THREE.ShaderMaterial.call( this, matParams );
}


MouthMaterial.prototype = Object.create( THREE.ShaderMaterial.prototype );