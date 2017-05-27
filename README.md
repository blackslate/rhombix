# Rhombix

**A node app to create STL files for golden rhombohedrons**

The app outputs two STL files. Each file should be 3D printed 6 times. The six resulting faces can be snapped together. A slot on the inner side of the faces allows you to place a [10 x 3 mm magnet](https://www.amazon.co.uk/gp/product/B00AAWEFPO/ref=oh_aui_detailpage_o00_s00?ie=UTF8&psc=1) behind the face. The rhombohedrons can then be attached together magnetically and arranged into a quasi-crystal.

To run: ```node stl.js```

The output files will need to be treated using [NetFabb](https://service.netfabb.com/service.php), to repair any non-manifold edges and intersect faces.

The resulting STL file can be viewed with [TinkerCAD](https://www.tinkercad.com/things/hYsk62d3t1t-acute-rhombohedron-face/editv2)