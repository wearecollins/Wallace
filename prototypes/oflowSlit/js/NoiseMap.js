/**
 * NoiseMap.js
 */


var NoiseMap = function(params)
{
	params = params || {};

	params.slits = params.slits || [ new THREE.Texture() ];

	var matParams = {
		transparent: true,
		blending: params.blending || 1,
		depthTest: params.depthTest || false,
		side: params.side || 2,// 0 = backFaceCull, 1 = frontFaceCull, 2 = doubleSided

		uniforms: {
			time: {type:'f', value: params.time || 0},
			resolution: {type:'v2', value: params.resolution || new THREE.Vector2( window.innerWidth, window.innerHeight ) }
		},

		vertexShader: [
		'varying vec2 vUv;',
		'void main() {',
		'	vUv = uv;',
		'	gl_Position = vec4( position, 1.0 );',
		'}'].join('\n'),

		fragmentShader: [

		'uniform float time;',
		'uniform vec2 resolution;',
		'varying vec2 vUv;',

		'const int nBalls = 4;',

		'float hash(float x)',
		'{',
			// Return a "random" number based on the "seed"
		    'return fract(sin(x) * 43758.5453) * 2.0 - 1.0;',
		'}',

		'vec2 hashPosition(float x)',
		'{',
			// Return a "random" position based on the "seed"
			'return vec2(hash(x), hash(x * 1.1))*2.0-1.0;',
		'}',

		'float metaball(vec2 r, float hashSeed) {',
			'vec2 balls[nBalls];', // Ball coordinates
			'r *= 1.0;',
			'float s[nBalls];', // Ball coordinates
			'for(int i=0; i<nBalls; i++) {',
				'float ii = float(i)+hashSeed;',
				'balls[i] = hashPosition(ii)*0.1', // random position
					'+0.8*vec2(hash(ii+0.1)*cos(time*hash(ii+0.2)),',
						      'hash(ii+0.3)*sin(time*hash(ii+0.4)));', // random rotation around the position
				's[i] = 0.02*(hash(ii+0.5)+1.0)*0.5;',		
			'}',
			'float mSurf = 0.0;', // metaball surface value
			'for(int i=0; i<nBalls; i++) {',
				'mSurf += s[i]/pow(length(r-balls[i]),2.0);',
			'}',
			'float cutoff = 0.8;',
			'mSurf = smoothstep(cutoff-0.02, cutoff+0.02, mSurf);',	
			//mSurf = clamp(mSurf, 0.7, 5.7)-0.7; 
			'return mSurf;',
		'}',

		'void main(void)',
		'{',
			'vec2 r = (vUv.xy - 0.5*resolution.xy) / resolution.y;', // pixel coordinate
			
			'gl_FragColor = (1.0-pow(abs(r.x),8.0))*vec4( 0.0, 0.0, 0.0, 1.0);', // set a black background with darkened sides
			
			'r += vec2(0.0, time*0.2);',
			'r = vec2(r.x, mod(r.y+1.0,2.0)-1.0);',
			'vec3 color = + metaball(r*1.5, 12.3)*vec3(1.0,0.0,0.0)',
		  				 '+ metaball(r*1.0, 124.3)*vec3(0.0,1.0,0.0)',
			  			 '+ metaball(r*0.67, 56.2)*vec3(0.0,0.0,1.0);',
			'gl_FragColor -= 0.4*vec4(color, 1.0);',
		'}'
		].join('\n'),

	}

	THREE.ShaderMaterial.call( this, matParams );
}


NoiseMap.prototype = Object.create( THREE.ShaderMaterial.prototype );