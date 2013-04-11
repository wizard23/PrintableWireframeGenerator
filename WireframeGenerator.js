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

	var wall = 1;
	var noCutL=7;
	var extraCutDepth=1; // to give slack 	
	var smallCutL=3;
	var conIntersect=2;
	
	
	s+="use &lt;PolyhedronOutlinerLib.scad&gt;;"
	s+="generateConnectors = 1; generateSticks = 0;";
	s+="sR=" + sR + "; sL = 6; cR=100; cL=10;\n";
	s+="%mainShape();\n";

	// generate connectorz



	for (var i = 0; i < v2fTable.length; i++) {
		var fList = v2fTable[i];
		var vList = v2Oriented[i]; 


		//if (i != 4 && i != 3) continue;
		if (fList.length == 0) alert("this should not happen");

		var nSum = new THREE.Vector3();	
		var vA = cleanedVertices[i];

		s += "/* vertex: " + i + "*/\n";
		s += "intersection() { mainShape(); difference() {";

		var sticks = "#union() {";

		//alert(vList.length);
		for (var vi = 0; vi < vList.length; vi++)
		{
			var vP = cleanedVertices[vList[(vi+vList.length-1)%vList.length]];
			var vB = cleanedVertices[vList[vi]];
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

			

			var mainStick = generateStickSCAD(vA, vP, vB, vC, noCutL+smallCutL, noCutL+smallCutL, 0, 0);
			var mainCutStick = generateStickSCAD(vA, vP, vB, vC, noCutL+smallCutL, noCutL+smallCutL, 1, 0);

			var smallStick = generateStickSCAD(vA, vP, vB, vC, noCutL, noCutL, -wall, 0);
			var cutStick = generateStickSCAD(vA, vP, vB, vC, noCutL-extraCutDepth, noCutL-extraCutDepth, -wall, 0.15);
			
			if (cutStick)
			{
				sticks += mainStick;
				sticks += "if (generateConnectors) {" + mainCutStick + cutStick+ "}";
				sticks += "if (generateSticks) {"  + smallStick + "}";
			}

			//break;	
			
			

			/*
			var centerDir = new THREE.Vector3();
			centerDir.addVectors(pNormal, normal).normalize();

			var startV = new THREE.Vector3();
			startV.subVectors(vA, centerDir);
			var endV = new THREE.Vector3();
			endV.subVectors(vB, centerDir);
			
			//sticks += LineSCAD(startV, endV, "sR", "sL", "1");
			
			var outV = new THREE.Vector3();
			outV.copy(bDir).multiplyScalar(-30).add(vA);
			var inV = new THREE.Vector3();
			inV.copy(bDir).multiplyScalar(30).add(vA);


			var dLast = new THREE.Vector3();
			dLast.addVectors(pDir, normal).multiplyScalar(cH);
			dLast.subVectors(pDir, bDir).multiplyScalar(cH);
			//dLast.subVectors(pDir, bDir).sub(pNormal).multiplyScalar(cH);
			//dLast.copy(pDir).multiplyScalar(10);
			
			var dNext = new THREE.Vector3();
			dNext.addVectors(cDir, pNormal).multiplyScalar(cH);
			dNext.subVectors(cDir, bDir).multiplyScalar(cH);
			//dNext.subVectors(cDir, bDir).add(pNormal).multiplyScalar(10);
			//dNext.copy(cDir).multiplyScalar(10);
	

			var outLast = new THREE.Vector3();
			outLast.addVectors(dLast, outV);
			var outNext = new THREE.Vector3();
			outNext.addVectors(dNext, outV);

			var inLast = new THREE.Vector3();
			inLast.addVectors(dLast, inV);
			var inNext = new THREE.Vector3();
			inNext.addVectors(dNext, inV);
			
			points = pV3(outV) + "," + pV3(outNext) + "," + pV3(outLast) + "," +
						pV3(inV) + "," + pV3(inNext) + "," + pV3(inLast);
			//sticks +=  "polyhedron(points = [" + points + "], triangles = [[1,0,2], [3,4,5], [1, 4, 3], [0, 1, 3], [3, 5, 2], [0, 3, 2], [5, 4, 2], [2, 4, 1]], convexity = 10);\n";
			*/
		}
		sticks += "}";


		// true normal
		nSum.add(vA);
		s += "/* NORMAL */ if (generateConnectors) intersection() {" + LineSCAD(vA, nSum, "cR", "cL", "3") + "*" + SphereSCAD(noCutL+smallCutL+conIntersect, vA) + "}";
		s += sticks;

		s += "}";
		s += "}";

	//		if (i > 1) 
		//break;
	}
	//s += "}}%mainShape();";

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
	
	s+= "module mainShape() {polyhedron(points = [" + points + "], triangles = [" + triangles + "], convexity = 10);}\n";
	
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

function generateStickSCAD(vA, vP, vB, vC, cutA, cutB, hDelta, slack)
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
	//if (angle < 0) angle = 2*Math.PI + angle;
	//alert(pV3(normal));
	//alert(pV3(pNormal));
//	alert(angle);
	//if (Math.abs(angle) < 0.001) return null;


	var xLen = 1.5;
	var extraH = 1.5;

	var edgeX = Math.cos(-angle/2);
	var edgeY = Math.sin(-angle/2);

	edgeY /= edgeX;
	edgeY *= xLen
	edgeX = xLen;

	//if (edgeY < -1.5) return ";"

	
	var bottomY = -extraH;
	if (edgeY < 0)
		bottomY = edgeY - extraH; 


	var centerDir = new THREE.Vector3();
	centerDir.addVectors(pNormal, normal).normalize();

	var cosR = centerDir.dot(bDir);
	

	var bR = LineRotations(bDir).multiplyScalar(1); //.multiplyScalar(180/Math.PI);
	var bN = LineRotations(centerDir).multiplyScalar(180/Math.PI);
	//alert(pV3(bR));
	//alert(pV3(bN));
	//alert( (bN.z - bR.x) + bR.z);


	var invR = new THREE.Matrix4().setRotationFromEuler(bR, "ZXY");
	// Simple rig for rotating around 3 axes

	var m1 = new THREE.Matrix4();
	var m3 = new THREE.Matrix4();

	m1.makeRotationZ( -bR.z );
	m3.makeRotationX( -bR.x );


	revN = m1.multiplyVector3(normal);
	revN = m3.multiplyVector3(revN);
	
	//lert(pV3(revN));	
	//alert(pV3(LineRotations(bDir).multiplyScalar(180/Math.PI)));
	//alert(pV3(bN));
	
	var rA = (Math.atan2(revN.y, revN.x)) * 180/Math.PI;
	rA = rA - ((180 - angle* 180/Math.PI)/2);

	s += "rotate([0,0," + rA + "]) polygon([[0," + (hDelta + slack) + "],["+(edgeX+slack)+","+(edgeY+hDelta+slack)+"],["+(edgeX+slack)+","+(bottomY+slack)+"]," +
						"[-"+(edgeX+slack)+","+(bottomY+slack)+"],[-"+(edgeX+ slack)+","+(edgeY+hDelta+slack)+"]]);";

	var cutSum = cutA + cutB;
	s =  LineSCAD(vA, vB, "sR", "sL", 0, "translate([0,0," + cutA + "]) linear_extrude(height=" + (edgeLen - cutSum) + ") " + s);

	return s;
}

function LineRotations(v3) {
	var r = new THREE.Vector3(Math.atan2(Math.sqrt(v3.x*v3.x+v3.y*v3.y), v3.z), 0, Math.atan2(v3.y, v3.x)+Math.PI/2);
	return r;
}
	
