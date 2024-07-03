/// This is another one of those singleton/static classes. :P
// see osgjs WebGLCaps

const HALF_FLOAT = 0x8D61;

class WebGLCaps {
  static _gl: WebGL2RenderingContext = null;
  static _checkRTT = {};
  static _webGLExtensions: { [k: string]: any } = {};

  static HALF_FLOAT = HALF_FLOAT;
  static HALF_FLOAT_OES = HALF_FLOAT

  static checkRTTSupport(typeFloat, typeTexture) {
    var gl = WebGLCaps._gl;
    if (gl === undefined)
      return false;

    var key = typeFloat + ',' + typeTexture;
    if (WebGLCaps._checkRTT[key] !== undefined)
      return WebGLCaps._checkRTT[key];

    // from http://codeflow.org/entries/2013/feb/22/how-to-write-portable-webgl/#how-can-i-detect-if-i-can-render-to-floating-point-textures

    // setup the texture
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, typeFloat, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, typeTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, typeTexture);

    // setup the framebuffer
    var framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    // check the framebuffer
    var status = WebGLCaps._checkRTT[key] = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;

    // cleanup
    gl.deleteTexture(texture);
    gl.deleteFramebuffer(framebuffer);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return status;
  };

  static hasRTTLinearHalfFloat() {
    return WebGLCaps._webGLExtensions.OES_texture_half_float_linear && WebGLCaps.checkRTTSupport(WebGLCaps.HALF_FLOAT, WebGLCaps._gl.LINEAR);
  };

  static hasRTTLinearFloat() {
    return WebGLCaps._webGLExtensions.OES_texture_float_linear && WebGLCaps.checkRTTSupport(WebGLCaps._gl.FLOAT, WebGLCaps._gl.LINEAR);
  };

  static hasRTTHalfFloat() {
    return WebGLCaps._webGLExtensions.OES_texture_half_float && WebGLCaps.checkRTTSupport(WebGLCaps.HALF_FLOAT, WebGLCaps._gl.NEAREST);
  };

  static hasRTTFloat() {
    return WebGLCaps._webGLExtensions.OES_texture_float && WebGLCaps.checkRTTSupport(WebGLCaps._gl.FLOAT, WebGLCaps._gl.NEAREST);
  };

  static getWebGLExtension(str: string) {
    return WebGLCaps._webGLExtensions[str];
  };

  static getWebGLExtensions() {
    return WebGLCaps._webGLExtensions;
  };

  /// Can only initialize on one gl context at a time
  /// and this is global. :/
  ///
  /// State of static properties/functions of this object is not valid
  /// until this method is called. 
  ///
  /// TODO: Turn into true singleton
  static initWebGLExtensions(gl: WebGL2RenderingContext) {
    WebGLCaps._gl = gl;
    var supported = gl.getSupportedExtensions();
    var ext = WebGLCaps._webGLExtensions;
    // we load all the extensions
    for (var i = 0, len = supported.length; i < len; ++i) {
      var sup = supported[i];
      ext[sup] = gl.getExtension(sup);
    }
  };
}

export default WebGLCaps;
