import ExportOBJ from './ExportOBJ';
import ExportSGL from './ExportSGL';
import ExportPLY from './ExportPLY';
import ExportSTL from './ExportSTL';
import ExportSculpteo from './ExportSculpteo';
import ExportMaterialise from './ExportMaterialise';

var Export = {};
Export.exportOBJ = ExportOBJ.exportOBJ;
Export.exportSGL = ExportSGL.exportSGL;
Export.exportAsciiPLY = ExportPLY.exportAsciiPLY;
Export.exportBinaryPLY = ExportPLY.exportBinaryPLY;
Export.exportAsciiSTL = ExportSTL.exportAsciiSTL;
Export.exportBinarySTL = ExportSTL.exportBinarySTL;
Export.exportSculpteo = ExportSculpteo.exportSculpteo;
Export.exportMaterialise = ExportMaterialise.exportMaterialise;

export default Export;
