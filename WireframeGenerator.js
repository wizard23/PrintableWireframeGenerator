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
			delta.sub(vertices[i], vertices[j]);
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


	var sR = 3;
	s+="use &lt;PolyhedronOutlinerLib.scad&gt;;"
	s+="sR=" + sR + "; sL = 6; cR=10; cL=12;\n";
	s+="%mainShape();\n";

	// generate connectorz
	//s += "intersection() { union() {";
	
	for (var i = 0; i < v2fTable.length; i++) {
		var fList = v2fTable[i];
		var vList = v2Oriented[i]; 

		if (fList.length == 0) alert("this should not happen");

		var nSum = new THREE.Vector3();	
		var vA = cleanedVertices[i];

		s += "/* vertex: " + i + "*/\n";
		s += "intersection() { mainShape(); difference() {";

		var sticks = "union() {";

		alert(vList.length);
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

			var centerDir = new THREE.Vector3();
			centerDir.addVectors(pNormal, normal).normalize();

			var startV = new THREE.Vector3();
			startV.subVectors(vA, centerDir);
			var endV = new THREE.Vector3();
			endV.subVectors(vB, centerDir);
			
			sticks += LineSCAD(startV, endV, "sR", "sL", "1");
			
			var startV = new THREE.Vector3();
			startV.copy(bDir).multiplyScalar(10).add(vA);
		
			var vLast = new THREE.Vector3();
			vLast.addVectors(pDir, normal).multiplyScalar(1);
			var vNext = new THREE.Vector3();
			vNext.addVectors(cDir, normal).multiplyScalar(1);
	
			var startVP = new THREE.Vector3();
			startVP.addVectors(vLast, vA);
			var startVC = new THREE.Vector3();
			startVC.addVectors(vNext, vA);
			


			//points = "[" + pV3(vA) + "," 

			//"polyhedron(points = [" + points + "], triangles = [" + triangles + "], convexity = 10);";
		}

/*
		for (var fi = 0; fi < fList.length; fi++) {
			var fn = fList[fi];

			var vA = cleanedVertices[fn[0]];
			var vB = cleanedVertices[fn[1]];
			var vC = cleanedVertices[fn[2]];

			var bDir = new THREE.Vector3();
			bDir.subVectors(vB, vA).normalize();
			var cDir = new THREE.Vector3();
			cDir.subVectors(vC, vA).normalize();

			bSum.add(bDir);

			var normal = new THREE.Vector3();
			normal.crossVectors( bDir, cDir );
			//alert(pV3(normal));
			nSum.add(normal);

			sticks += LineSCAD(vA, vB, "sR", "sL", "1");
			//s += LineSCAD(vA, vC);


			// s += "f:[" + f.a + "|" + f.b + "|" + f.c + "]"
			// s += "f:[" + dV3(f.a) + "|" + dV3(f.b) + "|" + dV3(f.c) + "]"
		}
*/


		sticks += "}";
		
		// "normal"
		//var vA = vertices[fList[0][0]];
		//bSum.add(vA);		
		//s += LineSCAD(vA, bSum, "cR", "cL", "3");

		// true normal
		nSum.add(vA);
		s += LineSCAD(vA, nSum, "cR", "cL", "3");
		s += sticks;

		s += "}";
		s += "}";

		break;
	}
	//s += "}}%mainShape();";

	// generate original poly in scad

	var points = "";
	var triangles = "";

	for (var i = 0; i < cleanedFaces.length; i++) {
		var fn  =  cleanedFaces[i];

		if (i != 0) triangles += ", ";
		triangles += "[" + vRenumbered[fn[0]] + "," + vRenumbered[fn[1]] + "," + vRenumbered[fn[2]] + "]"
	}	

	for (var i = 0; i < vRenumberedReverse.length; i++) {
		var vertex = vertices[vRenumberedReverse[i]];

		if (i != 0) points += ", ";
		points += pV3(vertex);
	}
	
	s+= "module mainShape() {polyhedron(points = [" + points + "], triangles = [" + triangles + "], convexity = 10);}\n";
	
	return s;
}

function LineSCAD(a, b, r, l, type)
{
	return "PlaceLine([" + pV3(a) + "," + pV3(b) + "],r=" + r + ",l=" + l + ",type=" + type + ");\n";
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
	
