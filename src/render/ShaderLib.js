import Enums from '../misc/Enums';

import ShaderPBR from './shaders/ShaderPBR';
import ShaderMatcap from './shaders/ShaderMatcap';
import ShaderNormal from './shaders/ShaderNormal';
import ShaderUV from './shaders/ShaderUV';
import ShaderWireframe from './shaders/ShaderWireframe';
import ShaderFlat from './shaders/ShaderFlat';
import ShaderSelection from './shaders/ShaderSelection';

import ShaderBackground from './shaders/ShaderBackground';
import ShaderMerge from './shaders/ShaderMerge';
import ShaderFxaa from './shaders/ShaderFxaa';
import ShaderContour from './shaders/ShaderContour';

import ShaderPaintUV from './shaders/ShaderPaintUV';
import ShaderBlur from './shaders/ShaderBlur';

var ShaderLib = [];

// 3D shaders
ShaderLib[Enums.Shader.PBR] = ShaderPBR;
ShaderLib[Enums.Shader.MATCAP] = ShaderMatcap;
ShaderLib[Enums.Shader.NORMAL] = ShaderNormal;
ShaderLib[Enums.Shader.UV] = ShaderUV;
ShaderLib[Enums.Shader.WIREFRAME] = ShaderWireframe;
ShaderLib[Enums.Shader.FLAT] = ShaderFlat;
ShaderLib[Enums.Shader.SELECTION] = ShaderSelection;

// 2D screen shaders
ShaderLib[Enums.Shader.BACKGROUND] = ShaderBackground;
ShaderLib[Enums.Shader.MERGE] = ShaderMerge;
ShaderLib[Enums.Shader.FXAA] = ShaderFxaa;
ShaderLib[Enums.Shader.CONTOUR] = ShaderContour;

// misc
ShaderLib[Enums.Shader.PAINTUV] = ShaderPaintUV;
ShaderLib[Enums.Shader.BLUR] = ShaderBlur;

export default ShaderLib;
