// Generated by CoffeeScript 1.6.1
var exec;

exec = require('child_process').exec;

module.exports = function(fileName, callback) {
  var git, hash;
  hash = null;
  git = exec("git log -n 1 --pretty=\"%H\" -- " + fileName);
  git.stdout.on('data', function(data) {
    hash = data.trim();
    return typeof callback === "function" ? callback(hash) : void 0;
  });
  return git.stdout.on('close', function() {
    if (!hash) {
      return typeof callback === "function" ? callback(null) : void 0;
    }
  });
};
