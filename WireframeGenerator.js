/**
 * @author wizard23 / http://www.wizards23.net
 */


///
function CreatePolyOutlineSCAD(geometry)
{
	var eps = 0.001;
	// geometry.faces
	// geometry.vertices

	// unifiedVertices = {0:0, 1:0, 2:2, 3:0, ...} 
	// array that maps the vertex-index given to the  lowest vertex-index that is "equivalent" to the given vertex 
	// if vertices are connected by a face then they should not be unified write assert for that, also eps needs to be
	// added

	s = "";

	// Find coinciding vertices, quadratic runtime
	var vertices = geometry.vertices;
	var vMatches = [];
	for (var i = 0; i < vertices.length; i++)
	{
		vMatches[i] = i;
		for (var j = 0; j < i; j++)
		{
			var delta = new THREE.Vector3();
			delta.subVectors(vertices[i], vertices[j]);
			var deltaD = delta.length();
			
			// unify if close enough
			if (deltaD < eps)
			{
				vMatches[i] = vMatches[j];
				break;
			}
		}
	}
	// TODO: I think the above algorithm does the trick but we could implement assert that guarantees that vMatches define an equivalence relation
	// specifically that: A ~ B and B ~ C implies A ~ C

	var cleanedVertices = [];
	var vRenumbered = [];
	var vRenumberedReverse = [];
	var nextVIndex = 0;
	for (var i = 0; i < vertices.length; i++)
	{
		if (vMatches[i] == i)
		{
			vRenumbered[i] = nextVIndex;
			vRenumberedReverse[nextVIndex] = i;
			cleanedVertices[nextVIndex] = vertices[i];

			nextVIndex++;
		}
		else
		{
			vRenumbered[i] = vRenumbered[vMatches[i]];
		}
	}
	var nrCleanedVertices = nextVIndex;

	var faces = geometry.faces;
	var cleanedFaces = [];
	var v2fTable = [];
	for (var i = 0; i < nrCleanedVertices; i++)
	{
		v2fTable[i] = [];
	}
	for (var i = 0; i < faces.length; i++) {
		// TODO: is this really a triangle???
		var f  =  faces[i];
		var ia = vRenumbered[vMatches[f.a]];
		var ib = vRenumbered[vMatches[f.b]];
		var ic = vRenumbered[vMatches[f.c]];

		var fn = [ia, ib, ic];

		cleanedFaces.push(fn);
		
		v2fTable[ia].push(reorderFace(fn, 0));
		v2fTable[ib].push(reorderFace(fn, 1));
		v2fTable[ic].push(reorderFace(fn, 2));
	}	

	// get an order for the faces aroud each vertex
	// quadratic but who cares
	

	var v2Oriented = [];
	
	for (var i = 0; i < v2fTable.length; i++) {

		v2Oriented[i] = [];

		var fList = v2fTable[i];

		first = fList[0];

		startB = first[1];
		currentB = startB;
		
		var iterations = 0;
		var maxIterations = 1000;
		do
		{
			v2Oriented[i].push(currentB);
			for (var j = 0; j < fList.length; j++)
			{
				if (fList[j][1] == currentB)
				{
					currentB = fList[j][2];
					break;
				}
			}
			iterations++;
		} while (currentB != startB && iterations < maxIterations)

		if (iterations == maxIterations) alert("max iterations reached");
	}	
	

	/*
	for (var i = 0; i < v2fTable.length; i++) {
		var fList = v2fTable[i];
		for (var fi = 0; fi < fList.length; fi++) {
			var fn = fList[fi];
			s += "f:[" + fn[0] + "|" + fn[1] + "|" + fn[2] + "]"
			//s += "f:[" + f.a + "|" + f.b + "|" + f.c + "]"
			//s += "f:[" + dV3(f.a) + "|" + dV3(f.b) + "|" + dV3(f.c) + "]"
		}

		break;
	}*/


	var sR = 1.5;

	var wall = 1.5;
	var noCutL=7;
	var extraCutDepth=1; // to give slack 	
	var smallCutL=3;
	var conIntersect=2;
	
	
	s+="use &lt;PolyhedronOutlinerLib.scad&gt;"
	s+="forPrint=1; generateConnectors = 1; generateSticks=0;";
	s+="sR=" + sR + "; sL = 6; cR=30; cL=10;\n";
	s+="*edge0_1(1); *vertex0(1);";
	s+="if (!forPrint) %mainShape();\n";

	// generate connectorz


	var vertexBaseFn = ""; 
	var vertexFn = "";

	var sticksFn = "";

	var vAssemblyPosX = 0;
	var vertexAssembly = "if (generateConnectors && forPrint) union() {";

	var sAssemblyPosX = 0;
	var sticksAssembly = "if (generateSticks && forPrint) union() {";

	for (var i = 0; i < v2fTable.length; i++) 
	{
		var fList = v2fTable[i];
		var vList = v2Oriented[i]; 

		//if (i != 4 && i != 3) continue;
		if (fList.length == 0) alert("this should not happen");

		var nSum = new THREE.Vector3();	
		var vA = cleanedVertices[i];

		var cutSticks = "";
		
		//alert(vList.length);
		for (var vi = 0; vi < vList.length; vi++)
		{
			var bIdx = vList[vi];
			var vP = cleanedVertices[vList[(vi+vList.length-1)%vList.length]];
			var vB = cleanedVertices[bIdx];
			var vC = cleanedVertices[vList[(vi+1)%vList.length]];

			var pDir = new THREE.Vector3();
			pDir.subVectors(vP, vA).normalize();
			var bDir = new THREE.Vector3();
			bDir.subVectors(vB, vA).normalize();
			var cDir = new THREE.Vector3();
			cDir.subVectors(vC, vA).normalize();

			var pNormal = new THREE.Vector3();
			pNormal.crossVectors( pDir, bDir );
			var normal = new THREE.Vector3();
			normal.crossVectors( bDir, cDir );

			nSum.add(normal);

			//var wall = 1;
			//var noCutL=5;
			//var extraCutDepth=1; // to give slack 	
			//var smallCutL=3;

			
			var invRot = generateStickSCAD(vA, vP, vB, vC, 0, 0, 0, 0, true);
			var mainStick = generateStickSCAD(vA, vP, vB, vC, noCutL, noCutL, 1, 0);
			//var mainCutStick = generateStickSCAD(vA, vP, vB, vC, noCutL+smallCutL, noCutL+smallCutL, 1, 0);

			var smallStick = generateStickSCAD(vA, vP, vB, vC, noCutL, noCutL, -wall, 0);
			var cutStick = generateStickSCAD(vA, vP, vB, vC, noCutL-extraCutDepth, noCutL-extraCutDepth, -wall, 0.4);


			cutSticks += cutStick;

			if (i < bIdx)
			{
				var realE = "";
				realE += "intersection() { mainShape(); ";
				realE += "union(){difference(){"+mainStick+"vertexBase"+i+"();vertexBase"+vList[vi]+"();}"+ smallStick + "}\n";
				realE += "}"; // intersection end

				sticksFn += "module edge" + i + "_" + bIdx + "(forPrint){"; // module start
				sticksFn += "if (forPrint) " + invRot + "{" + realE + "}";
				sticksFn += "if (!forPrint) {" + realE + "}";

				sticksAssembly += "translate([" + (sAssemblyPosX) + ",0,0]) edge" + i + "_" + bIdx + "(1);"

				sAssemblyPosX += 5;

				sticksFn += "}"; // module end
			}
		}

		// true normal
		var nSumVA = new THREE.Vector3();
		nSumVA.addVectors(nSum, vA);

		vertexBaseFn += "module vertexBase" + i + "() { intersection() { mainShape(); "; 	
		vertexBaseFn += LineSCAD(vA, nSumVA, "cR", "cL", "3");
		vertexBaseFn += "}}";

		
		var vRot = LineRotations(nSum);

		vertexFn += "module vertex" + i + "(forPrint){if(forPrint) translate([0,0,cL]) rotate([" + (-vRot.x* 180/Math.PI) + ",0,0]) " +
			"rotate([0,0,"+ (-vRot.z* 180/Math.PI) + "]) translate(-" + pV3(vA) + ")  difference(){vertexBase" + i + "(); "; 
		vertexFn += cutSticks;
		vertexFn += "}";
		vertexFn += "if(!forPrint)difference(){vertexBase" + i + "(); "; 
		vertexFn += cutSticks;
		vertexFn += "}";
		vertexFn += "}";

		
		vertexAssembly += "translate([" + (vAssemblyPosX) + ",0,0]) vertex" + i + "(1);";
		vAssemblyPosX += 15;

		//if (i > 1) break;
	}
	vertexAssembly += "}";
	sticksAssembly += "}";

	// generate original poly in scad
	var points = "";
	var triangles = "";

	for (var i = 0; i < cleanedFaces.length; i++) {
		var fn  =  cleanedFaces[i];

		if (i != 0) triangles += ", ";
		triangles += "[" + fn[0] + "," + fn[1] + "," + fn[2] + "]"
	}	

	for (var i = 0; i < cleanedVertices.length; i++) {
		var vertex = cleanedVertices[i];
		if (i != 0) points += ", ";
		points += pV3(vertex);
	}
	
	s += vertexAssembly;
	s += "translate([0,-20,0])" + sticksAssembly;
	s += vertexBaseFn;
	s += sticksFn;
	s += vertexFn;
	s += "module mainShape() {polyhedron(points = [" + points + "], triangles = [" + triangles + "], convexity = 10);}\n";
	
	return s;
}

function LineSCAD(a, b, r, l, type, child)
{
	child = child || "";

	return "PlaceLine([" + pV3(a) + "," + pV3(b) + "],r=" + r + ",l=" + l + ",type=" + type + ") {" + child + "}\n";
}

function SphereSCAD(r, translate, fn)
{
	var s = "";
	if (translate)
		s += "translate(" + pV3(translate) + ")";
	s += "sphere(" + r;
	if (fn) s += ",$f=" + fn;
	s += ");";
	return s;
}

function reorderFace(list, i)
{
	if (i == 0) return list;
	if (i == 1) return [list[1], list[2], list[0]];
	if (i == 2) return [list[2], list[0], list[1]];
	alert("reorder unknown" + i);
}

function pV3(v3)
{
	return "[" + v3.x + "," + v3.y + "," + v3.z + "]";
}



function dV3(v3)
{
	return "x" + v3.x + "/y" + v3.y +"/z" + v3.z;
}

function copyToClipboard (text) {
  window.prompt ("Copy to clipboard: Ctrl+C, Enter", text);
}

function generateStickSCAD(vA, vP, vB, vC, cutA, cutB, hDelta, slack, returnInvRot)
{
	slack = slack || 0;
	var s = "";

	var pDir = new THREE.Vector3();
	pDir.subVectors(vP, vA).normalize();
	var bDir = new THREE.Vector3();
	bDir.subVectors(vB, vA);
	var edgeLen = bDir.length();	
	bDir.normalize();
	var cDir = new THREE.Vector3();
	cDir.subVectors(vC, vA).normalize();

	var pNormal = new THREE.Vector3();
	pNormal.crossVectors( pDir, bDir ).normalize();
	var normal = new THREE.Vector3();
	normal.crossVectors( bDir, cDir ).normalize();


	var cosA = pNormal.dot(normal);
	var angle = Math.acos(cosA);
	
	// I dont understand that criterium but it works for me :)
	if (angle < Math.PI/2) angle =  -angle;

	var bR = LineRotations(bDir).multiplyScalar(1);
	var invR = new THREE.Matrix4().setRotationFromEuler(bR, "ZXY");
	

	var m1 = new THREE.Matrix4();
	var m3 = new THREE.Matrix4();
	m1.makeRotationZ( -bR.z );
	m3.makeRotationX( -bR.x );

	revN = m1.multiplyVector3(normal);
	revN = m3.multiplyVector3(revN);
	
	var rA = (Math.atan2(revN.y, revN.x)) * 180/Math.PI;
	rA = rA - ((180 - angle* 180/Math.PI)/2);

	var xLen = 1;
	var extraH = 1.6;

	var edgeX = Math.cos(-angle/2);
	var edgeY = Math.sin(-angle/2);

	edgeY /= edgeX;
	edgeY *= xLen
	edgeX = xLen;


	
	var bottomY = -extraH;
	if (edgeY < 0)
		bottomY = edgeY - extraH; 


	//var centerDir = new THREE.Vector3();
	//centerDir.addVectors(pNormal, normal).normalize();

	//var cosR = centerDir.dot(bDir);

	if (returnInvRot) 
	{
		return "translate([0,0," + (-bottomY) + "]) rotate([90,0,0]) rotate([0,0," + (-rA) + "]) rotate([" + (-bR.x* 180/Math.PI) + ",0,0]) " +
			"rotate([0,0,"+ (-bR.z* 180/Math.PI) + "]) translate(-" + pV3(vA) + ")";
	}
	

	
	s += "rotate([0,0," + rA + "])";
	if (slack != 0) s += "minkowski() { circle(" + slack + ", $fn=4);"
	s += "polygon([[0," + (hDelta) + "],["+(edgeX)+","+(edgeY+hDelta)+"],["+(edgeX)+","+(bottomY)+"]," +
						"[-"+(edgeX)+","+(bottomY)+"],[-"+(edgeX)+","+(edgeY+hDelta)+"]]);";
	if (slack != 0) s += "}"
	var cutSum = cutA + cutB;
	s =  LineSCAD(vA, vB, "sR", "sL", 0, "translate([0,0," + cutA + "]) linear_extrude(height=" + (edgeLen - cutSum) + ") " + s);

	return s;
}

function LineRotations(v3) {
	var r = new THREE.Vector3(Math.atan2(Math.sqrt(v3.x*v3.x+v3.y*v3.y), v3.z), 0, Math.atan2(v3.y, v3.x)+Math.PI/2);
	return r;
}
	
