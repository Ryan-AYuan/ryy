/**
 * Functional Summary:
 * This file provides mathematical utility functions used throughout the application.
 * It includes constants for degree/radian conversion, functions for distance and angle calculations,
 * vector splitting, random number generation, clamping, and a text-to-lattice conversion function
 * (`literalLattice`) that generates particle points from text.
 */

const MyMath = (function MyMathFactory(Math) {
	const MyMath = {};

	MyMath.toDeg = 180 / Math.PI;
	MyMath.toRad = Math.PI / 180;
	MyMath.halfPI = Math.PI / 2;
	MyMath.twoPI = Math.PI * 2;

	MyMath.dist = (width, height) => {
		return Math.sqrt(width * width + height * height);
	};

	MyMath.pointDist = (x1, y1, x2, y2) => {
		const distX = x2 - x1;
		const distY = y2 - y1;
		return Math.sqrt(distX * distX + distY * distY);
	};

	MyMath.angle = (width, height) => MyMath.halfPI + Math.atan2(height, width);

	MyMath.pointAngle = (x1, y1, x2, y2) => MyMath.halfPI + Math.atan2(y2 - y1, x2 - x1);

	MyMath.splitVector = (speed, angle) => ({
		x: Math.sin(angle) * speed,
		y: -Math.cos(angle) * speed,
	});

	MyMath.random = (min, max) => Math.random() * (max - min) + min;

	MyMath.randomInt = (min, max) => ((Math.random() * (max - min + 1)) | 0) + min;

	MyMath.randomChoice = function randomChoice(choices) {
		if (arguments.length === 1 && Array.isArray(choices)) {
			return choices[(Math.random() * choices.length) | 0];
		}
		return arguments[(Math.random() * arguments.length) | 0];
	};

	MyMath.clamp = function clamp(num, min, max) {
		return Math.min(Math.max(num, min), max);
	};

	MyMath.literalLattice = function literalLattice(text, density = 3, fontFamily = "Georgia", fontSize = "60px") {
		var dots = [];
		var canvas = document.createElement("canvas");
		var ctx = canvas.getContext("2d");

		var font = `${fontSize} ${fontFamily}`;

		ctx.font = font;
		var width = ctx.measureText(text).width;
		var fontSize = parseInt(fontSize.match(/(\d+)px/)[1]);
		canvas.width = width + 20;
		canvas.height = fontSize + 20;

		ctx.font = font;
		ctx.fillText(text, 10, fontSize + 10);

		var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

		for (var y = 0; y < imageData.height; y += density) {
			for (var x = 0; x < imageData.width; x += density) {
				var i = (y * imageData.width + x) * 4;
				if (imageData.data[i + 3] > 0) {
					dots.push({ x: x, y: y });
				}
			}
		}

		return {
			width: canvas.width,
			height: canvas.height,
			points: dots,
		};
	};

	return MyMath;
})(Math);
