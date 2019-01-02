import commonjs from 'rollup-plugin-commonjs';
import resolve from "rollup-plugin-node-resolve";

export default {
  input: 'index.js',
  output: {
    name: 'webics',
    file: 'dist/webics.js',
    format: 'umd',
  },
  plugins: [resolve(), commonjs()],
};
