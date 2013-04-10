s = 20;

difference()
{
cube([2*s, 2*s, s], center = true);
cylinder(h=5*s, r = s/2, center = true, $fn=5);
}