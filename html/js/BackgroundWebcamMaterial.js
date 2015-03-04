// BackgroundWebcamMaterial.js


var BackgroundWebcamMaterial = function(params)
{
	params = params || {};
	
	var matParams = {
		transparent: false,
		blending: params.blending || 1,
		depthTest: params.depthTest || false,
		side: params.side || 2,// 0 = backFaceCull, 1 = frontFaceCull, 2 = doubleSided

		uniforms: {
			time: {type: 'f', value: params.time || 0},
			map: {type: 't', value: params.map },
			color: {type: 'c', value: new THREE.Color( 0xFFFFFF )},
			opacity: {type: 'f', value: params.opacity !== undefined ? params.opacity : 0. },
			brightnessExpo: {type: 'f', value: params.brightnessExpo || 1.5}
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
		'	vUv = vec2(1. - uv.x, 0.749 * uv.y);',
		'	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
		// '	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
		'}'].join('\n'),

		fragmentShader: [
		'uniform sampler2D map;',
		'varying vec2 vUv;',
		'uniform vec3 color;',
		'uniform float opacity;',
		'uniform float time;',
		'uniform float brightnessExpo;',

		'float toGrey(vec3 rgb){',
		'	return dot(rgb, vec3(0.299, 0.587, 0.114));',
		'}',

		'float getVignette(vec2 uv){',
		'	return pow(1.7 - length(uv*2. - 1.), 2.);',
		'}',

		'void main()',
		'{',
		'	vec2 s = vec2(1. / 320., 1. / 240.);',

		//	box filter for some smoothing
		'	float g = toGrey(texture2D(map, vUv).xyz) * 3.;',

		'	g += toGrey(texture2D(map, vUv + vec2( -s.x, -s.y) ).xyz);',
		'	g += toGrey(texture2D(map, vUv + vec2( -s.x, 0.) ).xyz);',
		'	g += toGrey(texture2D(map, vUv + vec2( -s.x, s.y) ).xyz);',

		'	g += toGrey(texture2D(map, vUv + vec2( s.x, -s.y) ).xyz);',
		'	g += toGrey(texture2D(map, vUv + vec2( s.x, 0.) ).xyz);',
		'	g += toGrey(texture2D(map, vUv + vec2( s.x, s.y) ).xyz);',

		'	g += toGrey(texture2D(map, vUv + vec2( 0., -s.y) ).xyz);',
		'	g += toGrey(texture2D(map, vUv + vec2( 0., s.y) ).xyz);',

		'	g /= 11.;',

		//flip
		// '	g = 1. - min( max(g, 0.), 1.);',

		//brighter
		'	g = pow(g * 1.01, brightnessExpo);',

		// '	g = mod((g + time), 1.) ;',

		'	gl_FragColor = vec4( getVignette(vUv) * vec3( g ) * color, opacity);',
		'}'
		].join('\n'),

	}

	THREE.ShaderMaterial.call( this, matParams );
}


BackgroundWebcamMaterial.prototype = Object.create( THREE.ShaderMaterial.prototype );