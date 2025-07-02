if (typeof global === 'undefined') {
  window.global = window;
}

if (typeof process === 'undefined') {
  window.process = {
    env: {},
    nextTick: function(callback) {
      setTimeout(callback, 0);
    },
    browser: true
  };
}

if (typeof Buffer === 'undefined') {
  window.Buffer = {
    isBuffer: function() { return false; }
  };
}

if (typeof setImmediate === 'undefined') {
  window.setImmediate = function(callback) {
    setTimeout(callback, 0);
  };
}

if (typeof global.crypto === 'undefined' && typeof window.crypto !== 'undefined') {
  global.crypto = window.crypto;
}

if (typeof Object.setPrototypeOf === 'undefined') {
  Object.setPrototypeOf = function(obj, proto) {
    obj.__proto__ = proto;
    return obj;
  };
}

if (!window.AWS) {
  console.warn('AWS SDK not found in global scope, providing minimal stub');
  window.AWS = {
    config: {
      update: function(options) {
        console.log('AWS.config.update called with:', options);
        Object.assign(window.AWS.config, options);
      }
    },
    S3: function(config) {
      console.warn('Using stubbed AWS.S3 constructor');
      this.config = config;
      
      this.listObjectsV2 = function() {
        return {
          promise: function() {
            return Promise.reject(new Error('AWS SDK not properly loaded. Please check console for details.'));
          }
        };
      };
      
      this.getObject = function() {
        return {
          promise: function() {
            return Promise.reject(new Error('AWS SDK not properly loaded. Please check console for details.'));
          }
        };
      };
    }
  };
}

console.log('AWS SDK Polyfill loaded, AWS namespace status:', {
  exists: !!window.AWS,
  hasConfig: !!(window.AWS && window.AWS.config),
  hasS3: !!(window.AWS && typeof window.AWS.S3 === 'function')
});
