// DiffShader.js


var DiffShader = function(params)
{
	params = params || {};

	var matParams = {
		transparent: true,
		blending: params.blending || 1,
		depthTest: params.depthTest || true,
		side: params.side || 2,// 0 = backFaceCull, 1 = frontFaceCull, 2 = doubleSided


		uniforms: {
			camera: {type: 't', value: params.camera || undefined },
			background: {type: 't', value: params.background || undefined },
			threshold: {type: 'f', value: params.threshold || .075}
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

		'	gl_Position = vec4( p, 1.0 );',
		'}'].join('\n'),


		fragmentShader: [
		'uniform sampler2D camera;',
		'uniform sampler2D background;',
		'uniform float threshold;',
		'varying vec2 vUv;',

		'float getGray(vec3 rgb)',
		'{',
		'	return rgb.x * .3 + rgb.x * .59 + rgb.x * .11;',
		'}',

		'void main()',
		'{',	
		'	float cam = getGray(texture2D(camera, vUv).xyz);',
		'	float bg = getGray(texture2D(background, vUv).xyz);',
		'	float delta = abs(cam - bg);',

		'	gl_FragColor = vec4(vec3(delta > threshold?  1. : 0.), 1.);',
		'}'
		].join('\n'),

	}

	THREE.ShaderMaterial.call( this, matParams );
}


DiffShader.prototype = Object.create( THREE.ShaderMaterial.prototype );