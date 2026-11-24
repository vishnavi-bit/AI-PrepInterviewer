// pdf-parse ships its entry point without types for this subpath; the package's own types cover the same function.
declare module 'pdf-parse/lib/pdf-parse.js' {
  import pdf from 'pdf-parse';
  export default pdf;
}
