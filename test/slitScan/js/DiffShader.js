// DiffShader.js


var DiffShader = function(params)
{
	params = params || {};

	var matParams = {
		transparent: true,
		blending: params.blending || 1,
		depthTest: params.depthTest || false,
		side: params.side || 2,// 0 = backFaceCull, 1 = frontFaceCull, 2 = doubleSided


		uniforms: {
			camera: {type: 't', value: params.camera || undefined },
			background: {type: 't', value: params.background || undefined },
			filter: {type: 't', value: params.filter ||THREE.ImageUtils.loadTexture( '../blendMaps/crap_vignette.png')},
			threshold: {type: 'f', value: params.threshold || .075},
			flowScale: {type: 'f', value: params.flowScale || 3.},
			step: {type: 'v2', value: params.step || new THREE.Vector2( 1/ 64, 1/48 )}
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
		'uniform sampler2D filter;',
		'uniform float threshold;',
		'uniform float flowScale;',
		'uniform vec2 step;',
		'varying vec2 vUv;',

		'float getGray(vec3 rgb)',
		'{',
		'	return rgb.x * .3 + rgb.x * .59 + rgb.x * .11;',
		'}',

		'float getDelta(vec2 uv){',
		'	float cam = getGray(texture2D(camera, uv).xyz);',
		'	float bg = getGray(texture2D(background, uv).xyz);',
		'	return abs(cam - bg);',
		'}',

		'void main()',
		'{',	
		'	float delta = getDelta(vUv) * texture2D(filter, vUv).x;',

		//	sample neighbors to get flow direction
		'	vec3 dir =  vec3(0.,0.,1.);',
		'	dir.x = flowScale * abs(getDelta(vUv - vec2(step.x, 0.)) - getDelta(vUv + vec2(step.x, 0.)));',
		'	dir.y = flowScale * abs(getDelta(vUv - vec2(0., step.y)) - getDelta(vUv + vec2(0., step.y)));',

		'	gl_FragColor = delta > threshold?  vec4(dir * .5 + .5, 1.) : vec4(0., 0., 0., 1.);',
		'}'
		].join('\n'),

	}

	THREE.ShaderMaterial.call( this, matParams );
}


DiffShader.prototype = Object.create( THREE.ShaderMaterial.prototype );