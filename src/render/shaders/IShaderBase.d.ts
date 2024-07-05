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
    getOrCreate: (gl: WebGLRenderingContext) => IShaderBase;
    initUniforms: (gl: WebGLRenderingContext) => void;
    updateUniforms: (mesh: any, main?: any) => void;
    draw: (mesh: any, main: any, other: any | null) => void;
    drawBuffer: (mesh: any) => void;
    setTextureParameters: (gl: WebGLRenderingContext, tex: HTMLImageElement) => void;
    onLoadTexture0: (gl: WebGLRenderingContext, tex: HTMLImageElement, main: any) => void;
    getDummyTexture: (gl: WebGLRenderingContext) => WebGLTexture;
    getOrCreateTexture0: (gl: WebGLRenderingContext, texPath: string, main: any) => false | WebGLTexture;
    initAttributes: (gl: WebGLRenderingContext) => void;
    bindAttributes: (mesh: any) => void;
    unbindAttributes: () => void;
    getCopy: () => IShaderBase;
}


