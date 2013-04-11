
//====================================
// Utility functions adapted from 
// http://www.thingiverse.com/thing:11071
//====================================

function VMAG(v) = sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]); 

function LineRotations(v) = [ 
	atan2(sqrt(v[0]*v[0]+v[1]*v[1]), v[2]), 
	0, 
	atan2(v[1], v[0])+90];

function parseSeg(seg) = [ 
	seg[0], 
	LineRotations(seg[1]-seg[0]), 
	VMAG(seg[1]-seg[0])
	];


module PlaceLine(seg, r=1, l = 10, type=1) 
{
	smoothness = 16;
	diameter = r*2;
	side = sqrt((diameter*diameter)/2);

	params = parseSeg(seg);

	origin = params[0];
	rot = params[1];
	len = params[2];

	translate(origin)
	rotate(rot)
	rotate([0,0,0])
	{
		for (i = [0:$children-1]) {
			child(i);
			echo(i);
			echo(rot);
		}		

		if (type == 1)
		{
			//rotate([0,0, 360]) cylinder(r=r, h=len, $fn=smoothness);
			cylinder(r=r, h=l, $fn=smoothness);
		} 
		if (type == 2)
		{
			translate([0,0,l/2]) cube([r,r,l], center=true);
		} 
		if (type == 3)
		{
			cube([r,r,2*l], center=true);
			//cylinder(r=r, h=2*l, center=true);
		}
	}
}
