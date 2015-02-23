var THREE = THREE || {};

THREE.TextTexture = function(text, size, color, font, backGroundColor, backgroundMargin) {
	backgroundMargin = backgroundMargin !== undefined ? backgroundMargin : 4;
	font = font !== undefined ? font : "Cardo";

	var canvas = document.createElement("canvas");

	var context = canvas.getContext("2d");
	context.font = size + "pt " + font;

	var textWidth = context.measureText(text).width;

	canvas.width = textWidth + backgroundMargin;
	canvas.height = size + backgroundMargin * 2;
	context = canvas.getContext("2d");
	context.font = size + "pt " + font;

	if(backGroundColor !== undefined) {
		context.fillStyle = backGroundColor;
		context.fillRect(canvas.width / 2 - textWidth / 2 - backgroundMargin / 2, canvas.height / 2 - size / 2 - +backgroundMargin / 2, textWidth + backgroundMargin, size + backgroundMargin * 2);
	}

	context.textAlign = "center";
	context.textBaseline = "middle";
	context.fillStyle = color;
	context.fillText(text, canvas.width / 2, canvas.height / 2);

	var texture = new THREE.Texture(canvas);
	texture.minFilter = THREE.LinearFilter;
	texture.magFilter = THREE.LinearFilter;
	texture.format = THREE.RGBFormat;
	texture.generateMipmaps = false;
	texture.needsUpdate = true;

	var material = new THREE.MeshBasicMaterial({
		map : texture,
		color: 0xffffff,
		side: 2,
		depthTest: false
	});

	var mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(canvas.width, canvas.height, 12, 7), material);
	// mesh.overdraw = true;
	mesh.doubleSided = true;
	mesh.rotation.x = Math.PI;

	return mesh;
};