const PENDING = 0
const FULFILLED = 1
const REJECTED = 2

function isFunction (func) {
  return typeof func === 'function'
}

function isObject (obj) {
  return typeof obj === 'object' && obj !== null
}

function asyncCall (func) {
  setTimeout(func, 0)
}

// Promise解析过程 是以一个promise和一个值做为参数的抽象过程，可表示为[[Resolve]](promise, x). 过程如下；
function resolve (promise, x) {
  // 如果promise 和 x 指向相同的值, 使用 TypeError做为原因将promise拒绝。
  if (promise === x) {
    reject(promise, new TypeError('自身是不能被resolve的'))
  } else if (x && x instanceof Promise) {
    // 如果 x 是一个promise, 采用其状态 [3.4]:
    if (x.status === PENDING) {
      // 如果x是pending状态，promise必须保持pending走到x fulfilled或rejected.
      // 其实也就是说，这是then的事情了
      x.then((val) => resolve(promise, val), (val) => reject(promise, val))
    } else if (x.status === FULFILLED) {
      // 如果x是fulfilled状态，将x的值用于fulfill promise.
      fulfill(promise, x.value)
    } else {
      // 如果x是rejected状态, 将x的原因用于reject promise.
      reject(promise, x.value)
    }
  } else if (isFunction(x) || isObject(x)) {
    // 如果x是一个对象或一个函数
    // 将 then 赋为 x.then. [3.5]
    const then = x.then
    let hasCalledOnce = false
    try {
      // 如果 then 是一个函数
      if (isFunction(then)) {
        // 以x为this调用then函数， 且第一个参数是resolvePromise，第二个参数是rejectPromise，且：
        // 当 resolvePromise 被以 y为参数调用, 执行 [[Resolve]](promise, y).
        // 当 resolvePromise 被以 y为参数调用, 执行 [[Resolve]](promise, y).
        // 当 rejectPromise 被以 r 为参数调用, 则以r为原因将promise拒绝。
        // 如果 resolvePromise 和 rejectPromise 都被调用了，或者被调用了多次，则只第一次有效，后面的忽略。
        const handleCall =  (type) => {
          return function (val) {
            if (hasCalledOnce) return
            // TODO 这2个的顺序待思考
            type(promise, val)
            hasCalledOnce = true
          }
        }
        then.call(x, handleCall(resolve), handleCall(reject))
      } else {
        // 如果 then不是一个函数，则 以x为值fulfill promise。
        fulfill(promise, x)
      }
    } catch (e) {
      // 如果在取x.then值时抛出了异常，则以这个异常做为原因将promise拒绝。

      // 如果在调用then时抛出了异常，则：
      // 如果 resolvePromise 或 rejectPromise 已经被调用了，则忽略它。
      // 否则, 以e为reason将 promise 拒绝。
      if (!hasCalledOnce) reject(promise, e)
    }
  } else {
    // 如果 x 不是对象也不是函数，则以x为值 fulfill promise。
    fulfill(promise, x)
  }
}

function reject (promise, reason) {
  if (promise.status !== PENDING) return
  promise.status = REJECTED
  promise.value = reason
  handleCallBack(promise)
}

function fulfill (promise, result) {
  if (promise.status !== PENDING) return
  promise.status = FULFILLED
  promise.value = result
  handleCallBack(promise)
}

function handleCallBack (promise) {
  if (promise.status === PENDING) return
  asyncCall(() => {
    while (promise.callbacks.length) {
      let {onFulfilled, onRejected, thenPromise} = promise.callbacks.shift()
      // 如果 onFulfilled 不是一个函数且promise1已经fulfilled，则promise2必须以promise1的值fulfilled.
      // 如果 onRejected 不是一个函数且promise1已经rejected, 则promise2必须以相同的reason被拒绝.
      if (!isFunction(onFulfilled)) onFulfilled = (result) => result
      if (!isFunction(onRejected)) onRejected = (reason) => {throw reason}
      let val
      try {
        // 如果onFulfilled 或 onRejected 返回了值x, 则执行Promise 解析流程[[Resolve]](promise2, x).
        val = (promise.status === FULFILLED ? onFulfilled : onRejected)(promise.value)
        resolve(thenPromise, val)
      } catch (e) {
        // 如果onFulfilled 或 onRejected抛出了异常e, 则promise2应当以e为reason被拒绝。
        reject(thenPromise, e)
      }
    }
  })
}

export default class Promise {
  constructor (func) {
    if (new.target !== Promise) {
      throw new TypeError('promise只能被new调用')
    }
    if (!isFunction(func)) {
      throw new TypeError('参数只能是函数')
    }
    this.status = PENDING
    this.value = undefined
    this.callbacks = []
    // 立刻同步的做Promise方法，resolve和reject是内部写的函数
    try {
      func((val) => resolve(this, val), (val) => reject(this, val))
    } catch (e) {
      reject(this, e)
    }
  }

  static resolve (result) {
    return new Promise((resolve) => {resolve(result)})
  }

  static reject (reason) {
    return new Promise((resolve, reject) => {reject(reason)})
  }

  then (onFulfilled, onRejected) {
    // then 必须返回一个promise [3.3].
    // promise2 = promise1.then(onFulfilled, onRejected);

    let thenPromise = new Promise(() => {})
    this.callbacks.push({
      onFulfilled,
      onRejected,
      thenPromise
    })

    handleCallBack(this)
    return thenPromise
  }

  // catch(onRejected) {
  //   return this.then(void 0, onRejected)
  // }
}

// let promise1 = new Promise(function (resolve, reject) {
//   setTimeout(() => {console.log(1);resolve(1)}, 1000)
// })
// let promise2 = promise1.then((val) => {
//   console.log(2)
//   return 2
// })
// let promise3 = promise1.then((val) => {
//   console.log(3)
//   return 3
// })
// let promise4 = promise2.then((val) => {
//   console.log(4)
//   return 4
// })
