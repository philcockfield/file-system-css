import _ from "lodash";
import stylus from "stylus";
import nib from "nib";
import fs from "fs-extra";
import fsPath from "path";
import * as fsLocal from "./fs";
import fsCache from "./fs-cache";


const isMixin = (path) => {
    const name = fsPath.basename(path, ".styl");
    if (name === "mixin") { return true; }
    if (_.endsWith(name, ".mixin")) { return true; }
    return false;
  };


const compileToCss = (stylusText, path, mixins, callback) => {
    const compiler = stylus(stylusText)
        .set("filename", path)
        .use(nib())
        .import("nib");
    mixins.forEach(path => { compiler.import(path); });
    compiler.render(callback);
  };




/**
 * Converts the given stylus paths to CSS.
 * @param {array} paths: An array of paths to the source [.styl] files.
 * @return {promise}.
 */
const compile = (paths) => {
  if (!_.isArray(paths)) { paths = [paths]; }

  // Extract mixin files.
  paths = _(paths).filter(path => _.endsWith(path, ".styl")).value();
  const mixins = _(paths).filter(isMixin).value();
  paths = _(paths).filter(path => !isMixin(path)).value();

  // Compile Stylus => CSS.
  return new Promise((resolve, reject) => {
      fsLocal.processFiles(paths, (args, done) => {
          const { file, path } = args;
          compileToCss(file, path, mixins, (err, css) => {
              done(err, { path, css });
          });
      })
      .then((result) => resolve(result))
      .catch((err) => reject(err));
  });
};



export default { compile };
