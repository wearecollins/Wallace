function flipMeshUV( mesh ){
	for (i = 0; i < mesh.geometry.faceVertexUvs.length ; i++) {
		for (j = 0; j < mesh.geometry.faceVertexUvs[i].length ; j++) {
	    	mesh.geometry.faceVertexUvs[i][j][0].x = 1.0 - mesh.geometry.faceVertexUvs[i][j][0].x;
	   	 	mesh.geometry.faceVertexUvs[i][j][1].x = 1.0 - mesh.geometry.faceVertexUvs[i][j][1].x;
	   		mesh.geometry.faceVertexUvs[i][j][2].x = 1.0 - mesh.geometry.faceVertexUvs[i][j][2].x;
	   	}
	}
	mesh.geometry.uvsNeedUpdate = true;
}

var SlitterBasic = function (params) {
	params = params || {};
	this.flipped = false;
	this.renderer = params.renderer;
	this.camera = params.camera;
	this.blendMap = params.blendMap;

	this.width = params.width || 1280;
	this.height = params.height || 720;

	this.rt = params.renderTarget || new THREE.WebGLRenderTarget( this.width, this.height, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping } );
	this.scene = params.scene || new THREE.Scene();

	this.slits = [];
	for(var i=0; i<15; i++)
	{
		this.slits[i] = new THREE.WebGLRenderTarget( this.width, this.height, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping } );
	}
	
	this.slitStep = params.slitStep || 2;
	this.frame = 0;

	//slit shader
	this.slitMaterial = new SlitShader({
		transparent: false,
		blendMap: this.blendMap,
		mixVal: 0,
		slits: this.slits,
	});


	this.geometry = params.geometry || new THREE.PlaneBufferGeometry( 1, 1, 12, 7 );
	this.renderMesh = new THREE.Mesh(this.geometry, new THREE.MeshBasicMaterial( { color: 0xffffff, map: params.currentTex } ));
	this.scene.add(this.renderMesh);	

	this.mesh = new THREE.Mesh(this.geometry, this.slitMaterial);
	// flipMeshUV( this.mesh );
}

SlitterBasic.prototype.flip = function() {
	// this.flipped = !this.flipped;
	// this.renderMesh.scale.x *= -1;
};

SlitterBasic.prototype.update = function()
{
	this.frame++;

	if(this.frame % this.slitStep == 0){
		this.slits.push( this.slits.shift() );
		// this.slits.unshift( this.slits.pop() );
	}
}

SlitterBasic.prototype.draw = function()
{
	this.slitMaterial.uniforms.slits.value = this.slits;
	this.renderer.render(this.scene, this.camera, this.slits[0], true );
}