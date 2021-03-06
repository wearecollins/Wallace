/**
 * SlitShader.js
 */


var SlitShader = function(params)
{
	params = params || {};

	params.slits = params.slits || [ new THREE.Texture() ];

	var slitCount = params.slits.length;

	var matParams = {
		transparent: params.transparent !== undefined ? params.transparent : true,
		blending: params.blending || 1,
		depthTest: params.depthTest || true,
		side: params.side || 2,// 0 = backFaceCull, 1 = frontFaceCull, 2 = doubleSided


		uniforms: {
			slits : { type: "tv", value: params.slits }, // texture array (regular)
			blendMap: {type: 't', value: params.blendMap || undefined },
			bMin: {type: 'f', value: params.bVal || 0},
			bMax: {type: 'f', value: params.bVal || 1},
			slitValue: {type: 'f', value: params.slitValue || 0},
			numSlits: {type: 'f', value: params.slits.length},
			layerWeight: {type:'f', value: params.layerWeight || 0},
			time: {type:'f', value: params.time || 0}
		},

		vertexShader: [
		'varying vec2 vUv;',

		'void main() {',
		'	vUv = uv;',
		// '	gl_Position = vec4( position, 1.0 );',
		'	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
		'}'].join('\n'),

		fragmentShader: [
		'uniform sampler2D slits[' + parseInt(slitCount) + '];',
		'uniform sampler2D blendMap;',

		'uniform float bMin;',	
		'uniform float bMax;',	

		'uniform float slitValue;',	
		'uniform float numSlits;',
		'uniform float layerWeight;',
		'uniform float time;',

		'varying vec2 vUv;',

		'#define SLIT_COUNT '+parseInt(slitCount) + '', 

		'float mapLinear( in float x, in float a1, in float a2, in float b1, in float b2 ) {',
		'	return b1 + ( x - a1 ) * ( b2 - b1 ) / ( a2 - a1 );',
		'}',

		'float getGray(vec3 rgb)',
		'{',
		'	return rgb.x * .3 + rgb.x * .59 + rgb.x * .11;',
		'}',

		'void main()',
		'{',	

		'	vec2 uv = vUv;// + vec2(0., time);',

		'	float d = texture2D(blendMap, uv).x;',
		// '	d -= floor(d * 1.02);',
		'gl_FragColor = vec4(0.);',

		//the transition is more comkplicated than it seems, first the max goes from 0-1 then the min foes from 0-1
		// so (bMin,bMax) start at (0,0) then moves to (0,1) and then to (1,1),
		'	d = mapLinear(clamp(d, 0. ,1.), 0., 1., bMin, bMax);',

		'	int depthIndex = int(clamp(d * numSlits, 0., float(SLIT_COUNT-1)));',

		// '	bool bBroken = false; ',
		'	for(int i=0; i<SLIT_COUNT; i++){',
		'		if(depthIndex == i ){//&& !bBroken){',
		'			gl_FragColor = texture2D(slits[i], vUv) + float(i) * layerWeight;',
		// '			bBroken = true;',
		'		}',
		'	}',

		'}'
		].join('\n'),

	}

	THREE.ShaderMaterial.call( this, matParams );
}


SlitShader.prototype = Object.create( THREE.ShaderMaterial.prototype );

SlitShader.prototype.setNumSlits = function(numSlits)
{
	this.uniforms.numSlits.value = numSlits;
}

SlitShader.prototype.setBlendMax = function(value)
{
	this.uniforms.bMax.value = value;
}
SlitShader.prototype.setBlendMin = function(value)
{
	this.uniforms.bMin.value = value;
}