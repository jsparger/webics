import commonjs from 'rollup-plugin-commonjs';
import resolve from "rollup-plugin-node-resolve";

export default {
  entry: "index.js",
  format: "umd",
  moduleName: "webics",
  plugins: [resolve(), commonjs()],
  dest: "dist/webics.js",
};
