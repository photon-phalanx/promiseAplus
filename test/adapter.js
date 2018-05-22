import Promise from '../promise'

module.exports = {
  resolved(result) {
    return new Promise(resolve => resolve(result))
  },

  rejected(reason) {
    return new Promise((resolve, reject) => reject(reason))
  },

  deferred() {
    let resolve, reject
    return {
      promise: new Promise((_resolve, _reject) => {
        resolve = _resolve
        reject = _reject
      }),
      resolve,
      reject,
    }
  }
}