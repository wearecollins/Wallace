var subElement;

window.onload = function(){
	subElement = document.getElementById("subs");
	subElement.oncuechange = function( e ){
		for ( var i=0; i<subElement.track.activeCues.length; i++){
			console.log( subElement.track.activeCues[i] )
		}
	}

	console.log(document.getElementById("video").currentTime);

	document.getElementById("video").currentTime = 15000;
	document.getElementById("video").play();
}

var d;

function gen(){
	if ( d ){
		d.style.top = "120%";
		d.style["-webkit-transform"] = "rotateZ(" + (Math.floor( -300 + Math.random() * 600 )) + "deg)";
	}
	d = document.createElement("div");
	d.style.position = "absolute";
	d.style.padding = "5px";
	d.style["background-color"] = "#000";
	d.style.left = Math.floor(Math.random() * window.innerWidth) +"px";
	d.style.top = "0px";
	d.style["-webkit-transition"] = "top ease-out 5s, -webkit-transform 10s";
	d.innerHTML = text[Math.floor(Math.random() * text.length)];
	document.body.appendChild(d);
}