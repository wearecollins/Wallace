// Slitter.js

var Slitter = function(params)
{
	params = params || {};

	this.renderer = params.renderer;
	this.camera = params.camera;
	this.blendMap = params.blendMap;

	this.width = params.width || 1280;
	this.height = params.height || 720;

	this.rt = params.renderTarget || new THREE.WebGLRenderTarget( this.width, this.height, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping } );
	this.scene = params.scene || new THREE.Scene();

	this.slits = [];
	for(var i=0; i<15; i++)
	{
		this.slits[i] = new THREE.WebGLRenderTarget( this.width, this.height, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping } );
	}

	// var frame = 0;
	// var vidPlane;
	// var slitMat, blendMat;
	// var slitScene = new THREE.Scene();
	
	this.slitStep = 2;
	this.frame = 0;

	//blended videos input
	this.blendMaterial = new ChanneledBlendShader({
		currentTex: params.currentTex,
		previousTex: params.previousTex,
		blendMap: this.blendMap
	});

	this.blendPlane = new THREE.PlaneGeometry( 2,2,	12, 7 );
	this.blendMesh = new THREE.Mesh(this.blendPlane, this.blendMaterial);
	this.scene.add(this.blendMesh);

	//slit shader
	this.slitMaterial = new SlitShader({
		blendMap: this.blendMap,
		mixVal: 0,
		slits: this.slits
	});

	this.geometry = params.geometry || new THREE.PlaneGeometry( 1, 1, 12, 7 );

	this.mesh = new THREE.Mesh(this.geometry, this.slitMaterial);
}

Slitter.prototype.setMixValue = function(mixVal)
{
	this.blendMaterial.uniforms.mixVal.value = mixVal;
	// this.slitMaterial.uniforms.mixVal.value = mixVal;
}

Slitter.prototype.setSlitMax = function(value)
{
	this.slitMaterial.uniforms.bMax.value = value;
}

Slitter.prototype.setSlitMin = function(value)
{
	this.slitMaterial.uniforms.bMin.value = value;
}

Slitter.prototype.setCurrentTesture = function(currentTexture, textureCoordOffset)
{
	this.blendMaterial.setCurrentTexture( currentTexture, textureCoordOffset );
}

Slitter.prototype.setPreviousTesture = function(previousTexture, textureCoordOffset)
{
	this.blendMaterial.setPreviousTexture( previousTexture, textureCoordOffset );
}

Slitter.prototype.update = function()
{

}

Slitter.prototype.draw = function()
{
	this.frame++;

	if(this.frame % this.slitStep == 0){
		this.slits.push( this.slits.shift() );
	}

	this.slitMaterial.uniforms.slits.value = this.slits;

	this.renderer.render(this.scene, this.camera, this.slits[0], true );
}

Slitter.prototype.restart = function()
{
	this.frame = 0;
}