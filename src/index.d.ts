// Parcel can still import them just fine, this just removes the errors from the typescript checker.

declare module '*.jpg' {
    var _: any;
    export default _;
}

declare module '*.png' {
    var _: any;
    export default _;
} 