// Side-effect imports of stylesheets (Vite handles them, but TS needs to know
// they're valid module specifiers).
declare module '*.css';
declare module '*.svg' {
    const src: string;
    export default src;
}
declare module '*.png' {
    const src: string;
    export default src;
}
