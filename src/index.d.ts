// Parcel can still import them just fine, this just removes the errors from the typescript checker.

declare module '*.jpg' {
    var _: string;
    export default _;
}

declare module '*.png' {
    var _: string;
    export default _;
}

declare module '*.glsl' {
    var _: string;
    export default _;
}