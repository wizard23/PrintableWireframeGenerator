/* based on three.js - STL loader test by aleeper. PR2 head from www.ros.org */
  
use <PolyhedronOutlinerLib.scad>;sR=1.5; sL = 6; cR=20; cL=9; %mainShape(); /* vertex: 0*/ intersection() { mainShape(); difference() {PlaceLine([[-17.251,-30.062,0.00642054],[-17.657609390412986,-30.7705658206549,-0.2809850389512841]],r=cR,l=cL,type=3) {} #union() {PlaceLine([[-17.251,-30.062,0.00642054],[-17.4484,29.9377,-0.0181856]],r=sR,l=sL,type=0) {linear_extrude(height=60.00002976926034) rotate([0,0,-125.12702256247589]) polygon([[0,1.001],[0.5,0.2938941812666561],[0.5,-1.2071058187333437],[-0.5,-1.2071058187333437],[-0.5,0.2938941812666561]]);} PlaceLine([[-17.251,-30.062,0.00642054],[34.6114,0.108853,-0.130494]],r=sR,l=sL,type=0) {linear_extrude(height=60.000063750790076) rotate([0,0,125.31274629973501]) polygon([[0,1.001],[0.5,0.29389331230891214],[0.5,-1.2071066876910876],[-0.5,-1.2071066876910876],[-0.5,0.29389331230891214]]);} PlaceLine([[-17.251,-30.062,0.00642054],[0.0880366,0.0153295,48.9423]],r=sR,l=sL,type=0) {linear_extrude(height=60.00006865488872) rotate([0,0,0.18528390725604282]) polygon([[0,1.001],[0.5,0.2938916980751308],[0.5,-1.207108301924869],[-0.5,-1.207108301924869],[-0.5,0.2938916980751308]]);} }}}module mainShape() {polyhedron(points = [[-17.251,-30.062,0.00642054], [-17.4484,29.9377,-0.0181856], [34.6114,0.108853,-0.130494], [0.0880366,0.0153295,48.9423]], triangles = [[0,1,2], [3,2,1], [0,3,1], [0,2,3]], convexity = 10);}