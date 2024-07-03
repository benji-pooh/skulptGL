import type Attribute from '../Attribute';

export interface IShaderBase {
    vertexName: string;
    fragmentName: string;
    program: any;
    vertex: any;
    fragment: any;
    uniforms: {
        [name: string]: WebGLUniformLocation;
    };
    texture0: WebGLTexture;
    _dummyTex: WebGLTexture | null;
    attributes: {
        aVertex?: Attribute;
        aNormal?: Attribute;
        aMaterial?: Attribute;
        aColor?: Attribute;
        aTexCoord?: Attribute;
    };
    activeAttributes: {
        vertex?: boolean;
        normal?: boolean;
        material?: boolean;
        color?: boolean;
    };
    showSymmetryLine: any;
    darkenUnselected: any;
    uniformNames: string[];
    commonUniforms: string[];
    strings: {
        colorSpaceGLSL: string;
        vertUniforms: string;
        fragColorUniforms: string;
        fragColorFunction: string;
    };
    getOrCreate: (gl: WebGL2RenderingContext) => IShaderBase;
    initUniforms: (gl: WebGL2RenderingContext) => void;
    updateUniforms: (mesh: any, main?: any) => void;
    draw: (mesh: any, main: any, other: any | null) => void;
    drawBuffer: (mesh: any) => void;
    setTextureParameters: (gl: WebGL2RenderingContext, tex: HTMLImageElement) => void;
    onLoadTexture0: (gl: WebGL2RenderingContext, tex: HTMLImageElement, main: any) => void;
    getDummyTexture: (gl: WebGL2RenderingContext) => WebGLTexture;
    getOrCreateTexture0: (gl: WebGL2RenderingContext, texPath: string, main: any) => false | WebGLTexture;
    initAttributes: (gl: WebGL2RenderingContext) => void;
    bindAttributes: (mesh: any) => void;
    unbindAttributes: () => void;
    getCopy: () => IShaderBase;
}


