/**
 * SlitShader.js
 */


var SlitShader = function(params)
{
	params = params || {};

	params.slits = params.slits || [ new THREE.Texture() ];

	var slitCount = params.slits.length;

	var matParams = {
		transparent: true,
		blending: params.blending || 1,
		depthTest: params.depthTest || true,
		side: params.side || 2,// 0 = backFaceCull, 1 = frontFaceCull, 2 = doubleSided


		uniforms: {
			blendMap: {type: 't', value: params.blendMap || undefined },
			mixVal: {type: 'f', value: params.mixVal || .5},
			bVal: {type: 'f', value: params.bVal || .5},
			slitValue: {type: 'f', value: params.slitValue || 0},
			numSlits: {type: 'f', value: params.slits.length},

			slits : { type: "tv", value: params.slits } // texture array (regular)
          
		},

		vertexShader: [
		'varying vec2 vUv;',

		'void main() {',
		'	vUv = uv;',
		// '	gl_Position = vec4( position, 1.0 );',
		'	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
		'}'].join('\n'),

		fragmentShader: [
		'uniform sampler2D slits[15];',
		'uniform sampler2D blendMap;',
		'uniform float mixVal;',	
		'uniform float bVal;',	
		'uniform float slitValue;',	
		'uniform float numSlits;',


		'varying vec2 vUv;',

		'void main()',
		'{',	
		'	float mm = 1. - bVal;//mixVal;',
		'	float d = texture2D(blendMap, vUv).x;',
		'	int depthIndex = int(clamp(d * numSlits, 0., '+parseInt(slitCount-1)+'.));',
		'	for(int i=0; i<'+parseInt(slitCount)+'; i++){',
		'		if(depthIndex == i){',
		'			gl_FragColor = texture2D(slits[i], vUv);',
		'		}',
		'	}',
		'}'
		].join('\n'),

	}

	THREE.ShaderMaterial.call( this, matParams );
}


SlitShader.prototype = Object.create( THREE.ShaderMaterial.prototype );