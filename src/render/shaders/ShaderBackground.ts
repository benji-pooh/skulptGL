import { mat3 } from 'gl-matrix';
import ShaderBase from './ShaderBase';
import ShaderPBR from './ShaderPBR';
import Attribute from '../Attribute';
import pbrGLSL from './glsl/pbr.glsl';
import mainBackgroundGLSL from './glsl/mainBackground.glsl';

let ShaderBackground = ShaderBase.getCopy();
ShaderBackground.vertexName = ShaderBackground.fragmentName = 'Background';

ShaderBackground.uniforms = {};
ShaderBackground.attributes = {};

ShaderBackground.uniformNames = [
  'uTexture0',
  'uBackgroundType',
  'uIblTransform',
  'uSPH',
  'uBlur',
  'uEnvSize'];

ShaderBackground.vertex = [
  'attribute vec2 aVertex;',
  'attribute vec2 aTexCoord;',
  'varying vec2 vTexCoord;',
  'void main() {',
  '  vTexCoord = aTexCoord;',
  '  gl_Position = vec4(aVertex, 1.0, 1.0);',
  '}'
].join('\n');

ShaderBackground.fragment = [
  'varying vec2 vTexCoord;',
  ShaderBase.strings.colorSpaceGLSL,
  pbrGLSL,
  mainBackgroundGLSL
].join('\n');

ShaderBackground.draw = function (bg) {
  var gl = bg.gl;
  gl.useProgram(this.program);
  this.bindAttributes(bg);
  this.updateUniforms(bg);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};
ShaderBackground.initAttributes = function (gl) {
  var program = ShaderBackground.program;
  var attrs = ShaderBackground.attributes;
  attrs.aVertex = new Attribute(gl, program, 'aVertex', 2, gl.FLOAT);
  attrs.aTexCoord = new Attribute(gl, program, 'aTexCoord', 2, gl.FLOAT);
};
ShaderBackground.bindAttributes = function (bg) {
  var attrs = ShaderBackground.attributes;
  attrs.aVertex.bindToBuffer(bg.vertexBuffer);
  attrs.aTexCoord.bindToBuffer(bg.texCoordBuffer);
};

var uIBLTmp = mat3.create();
ShaderBackground.updateUniforms = function (bg) {
  var uniforms = this.uniforms;
  var main = bg.main;
  var env = ShaderPBR.environments[ShaderPBR.idEnv];

  var gl = bg.gl;
  gl.uniform1i(uniforms.uBackgroundType, bg.type);

  var tex;
  if (bg.type === 0) {
    tex = bg.getTexture();
  }
  else {
    tex = ShaderPBR.getOrCreateEnvironment(gl, main, env) || bg.getTexture();
  }
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.uniform1i(uniforms.uTexture0, 0);

  mat3.fromMat4(uIBLTmp, main.getCamera().getView());
  gl.uniformMatrix3fv(uniforms.uIblTransform, false, mat3.transpose(uIBLTmp, uIBLTmp));

  gl.uniform3fv(uniforms.uSPH, env.sph);
  if (env.size) gl.uniform2fv(uniforms.uEnvSize, env.size);

  gl.uniform1f(uniforms.uBlur, bg.blur);
};

export default ShaderBackground;
