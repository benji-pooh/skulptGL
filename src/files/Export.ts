import { exportOBJ } from './ExportOBJ';
import { exportSGL } from './ExportSGL';
import { exportAsciiPLY, exportBinaryPLY } from './ExportPLY';
import { exportAsciiSTL, exportBinarySTL } from './ExportSTL';
// import ExportSculpteo from './ExportSculpteo';
// import ExportMaterialise from './ExportMaterialise';


// TODO These probably need to be updated to latest API before use.
// Export.exportSculpteo = ExportSculpteo.exportSculpteo;
// Export.exportMaterialise = ExportMaterialise.exportMaterialise;

export default {
    exportOBJ, exportSGL, exportAsciiPLY, exportBinaryPLY, exportAsciiSTL, exportBinarySTL
}
