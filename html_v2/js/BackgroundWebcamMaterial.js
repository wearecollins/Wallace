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
		'	vec2 s = vec2(1. / 320., 1. / 240.);',
		'	float g = toGrey(texture2D(map, vUv).xyz);',
		'	g += toGrey(texture2D(map, vUv + vec2( -s.x, -s.y) ).xyz);',
		'	g += toGrey(texture2D(map, vUv + vec2( -s.x, 0.) ).xyz);',
		'	g += toGrey(texture2D(map, vUv + vec2( -s.x, s.y) ).xyz);',

		'	g += toGrey(texture2D(map, vUv + vec2( s.x, -s.y) ).xyz);',
		'	g += toGrey(texture2D(map, vUv + vec2( s.x, 0.) ).xyz);',
		'	g += toGrey(texture2D(map, vUv + vec2( s.x, s.y) ).xyz);',

		'	g += toGrey(texture2D(map, vUv + vec2( 0., -s.y) ).xyz);',
		'	g += toGrey(texture2D(map, vUv + vec2( 0., s.y) ).xyz);',

		'	g /= 9.;',


		'	gl_FragColor = vec4(vec3( pow(g * getVignette(vUv) * 2., 2.) ) * color, 1.);',
		'}'
		].join('\n'),

	}

	THREE.ShaderMaterial.call( this, matParams );
}


BackgroundWebcamMaterial.prototype = Object.create( THREE.ShaderMaterial.prototype );