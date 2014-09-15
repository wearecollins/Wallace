// MotionThresholds.js

var MotionThresholds = function(params)
{
	params = params || {};

	this.thresholds = params.thresholds || {
		farLeft: .36,
		left: .44,
		right: .56,
		farRight: .65,
		up: .53,
		down: .47,
	}

	var horizontalLine = new THREE.Geometry();
	var verticalLine = new THREE.Geometry();
	horizontalLine.vertices = [new THREE.Vector3(-1,0,100), new THREE.Vector3(1,0,100)];
	verticalLine.vertices = [new THREE.Vector3(0,-1,100), new THREE.Vector3(0,1,100)];

	this.lines = {
		up: new THREE.Line( horizontalLine, new THREE.LineBasicMaterial({color: 0xFFFF00}) ),
		down: new THREE.Line( horizontalLine, new THREE.LineBasicMaterial({color: 0xFF00FF}) ),
		left: new THREE.Line( verticalLine, new THREE.LineBasicMaterial({color: 0x00FFFF}) ),
		right: new THREE.Line( verticalLine, new THREE.LineBasicMaterial({color: 0xFFFFFF}) ),
		farLeft: new THREE.Line( verticalLine, new THREE.LineBasicMaterial({color: 0x0000FF}) ),
		farRight: new THREE.Line( verticalLine, new THREE.LineBasicMaterial({color: 0x00FF00}) ),
	}

	this.lines["up"].position.y = this.thresholds["up"] - .5;// * 2 - 1;
	this.lines["down"].position.y = this.thresholds["down"] - .5;// * 2 - 1;
	this.lines["left"].position.x = this.thresholds["left"] - .5;// * 2 - 1;
	this.lines["right"].position.x = this.thresholds["right"] - .5;// * 2 - 1;
	this.lines["farLeft"].position.x = 0;//this.thresholds["farLeft"] - .5;// * 2 - 1;
	this.lines["farRight"].position.x = 1.0;//this.thresholds["farRight"] - .5;// * 2 - 1;

	this.group = new THREE.Object3D();
	for(var i in this.lines)
	{
		this.group.add(this.lines[i]);
	}
}

MotionThresholds.prototype.getVideoName = function(x, y)
{
	if(x < this.thresholds["farLeft"])
	{
		return "left";
	}
	else if(x < this.thresholds["left"])
	{
		return "left";
	}

	else if(x < this.thresholds["right"])
	{
		if(y < this.thresholds["down"])
		{
			return "down";
		}
		else if(y > this.thresholds["up"])
		{
			return "up";
		}
		else 
		{
			return "straight";
		}
	}
	else if(x < this.thresholds["farRight"])
	{
		return "right";
	}
	else
	{
		return "right";
	}
}