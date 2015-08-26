module.exports = function Version (major, minor, patch) {
  this.major = major || 0
  this.minor = minor || 0
  this.patch = patch || 0

  this.isEqual = function (v) {
    if (arguments.length === 1) {
      return v.major === this.major && v.minor === this.minor && v.patch === this.patch
    } else if (arguments.length === 3) {
      return arguments[0] === this.major && arguments[1] === this.minor && arguments[2] === this.patch
    } else {
      return false
    }
  }

  this.isGreaterThan = function (v) {
    if (this.isEqual(v)) {
      return false
    } else if (this.major > v.major) {
      return true
    } else if (this.major === v.major && this.minor > v.minor) {
      return true
    } else if (this.major === v.major && this.minor === v.minor && this.patch > v.patch) {
      return true
    } else {
      return false
    }
  }

  this.isGreaterThanOrEqual = function (v) {
    return this.isEqual(v) || this.isGreaterThan(v)
  }

  this.isLessThan = function (v) {
    if (this.isEqual(v)) {
      return false
    } else if (this.major < v.major) {
      return true
    } else if (this.major === v.major && this.minor < v.minor) {
      return true
    } else if (this.major === v.major && this.minor === v.minor && this.patch < v.patch) {
      return true
    } else {
      return false
    }
  }

  this.isLessThanOrEqual = function (v) {
    return this.isEqual(v) || this.isLessThan(v)
  }

  this.toString = function () {
    return (this.major + '.' + this.minor + '.' + this.patch)
  }
}
