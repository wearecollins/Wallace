// BackgroundWebcamMaterial.js


var BackgroundWebcamMaterial = function(params)
{
	params = params || {};
	
	var matParams = {
		transparent: true,
		blending: params.blending || 1,
		depthTest: params.depthTest || true,
		side: params.side || 2,// 0 = backFaceCull, 1 = frontFaceCull, 2 = doubleSided

		uniforms: {
			map: {type: 't', value: params.map },
			color: {type: 'c', value: new THREE.Color( 0xFFFFFF )},
			// screenAspect: {type: 'f', value: params.screenAspect || (window.innerHeight / window.innerWidth)},
			opacity: {type: 'f', value: params.opacity !== undefined ? params.opacity : 1. }
		},

		attributes: {
		},

		vertexShader: [
		// 'uniform float screenAspect;',
		'varying vec2 vUv;',

		'float mapLinear( in float x, in float a1, in float a2, in float b1, in float b2 ) {',
		'	return b1 + ( x - a1 ) * ( b2 - b1 ) / ( a2 - a1 );',
		'}',

		'void main() {',
		'	vUv = uv * vec2(1., 0.749);',
		'	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
		'}'].join('\n'),

		fragmentShader: [
		'uniform sampler2D map;',
		'varying vec2 vUv;',
		'uniform vec3 color;',

		'float toGrey(vec3 rgb){',
		'	return dot(rgb, vec3(0.299, 0.587, 0.114));',
		'}',

		'float getVignette(vec2 uv){',
		'	return pow(1.7 - length(uv*2. - 1.), 2.);',
		'}',

		'void main()',
		'{',
		'	float g = toGrey(texture2D(map, vUv).xyz) * getVignette(vUv);',
		'	gl_FragColor = vec4(vec3(g) * color, 1.);',
		'}'
		].join('\n'),

	}

	THREE.ShaderMaterial.call( this, matParams );
}


BackgroundWebcamMaterial.prototype = Object.create( THREE.ShaderMaterial.prototype );