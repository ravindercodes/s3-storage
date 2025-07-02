let AWS: any;

if (typeof window !== 'undefined' && (window as any).AWS) {
  console.log('Using AWS SDK from global scope (CDN)');
  AWS = (window as any).AWS;
} else {
  console.log('Importing AWS SDK from npm package');
  try {
    AWS = require('aws-sdk');
  } catch (e) {
    console.error('Failed to import AWS SDK from npm:', e);
    AWS = {};
  }
}

if (typeof global === 'undefined' && typeof window !== 'undefined') {
  (window as any).global = window;
}

if (typeof process === 'undefined') {
  (window as any).process = { env: {}, browser: true };
}

if (!AWS) {
  console.error('AWS SDK is not defined even after fallback');
  AWS = {};
}

if (typeof AWS.config === 'undefined') {
  console.warn('AWS.config is undefined, creating it');
  AWS.config = {};
}

console.log('Ensuring AWS.config.update exists');
AWS.config.update = function(options: any) {
  console.log('AWS.config.update called with:', options);
  if (!AWS.config) {
    AWS.config = {};
  }
  Object.assign(AWS.config, options);
  
  try {
    const originalUpdate = Object.getPrototypeOf(AWS.config)?.update;
    if (typeof originalUpdate === 'function') {
      originalUpdate.call(AWS.config, options);
    }
  } catch (err) {
    console.warn('Failed to call original AWS.config.update:', err);
  }
};

if (!AWS.util) {
  AWS.util = {};
}

if (!Object.prototype.hasOwnProperty.call(AWS.util, 'hasOwnProperty')) {
  AWS.util.hasOwnProperty = function(obj: any, prop: string) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  };
}

if (!AWS.S3) {
  console.warn('AWS.S3 is undefined, creating minimal implementation');
  AWS.S3 = class S3 {
    constructor(config: any) {
      console.log('Created fallback S3 instance with config:', config);
      this._config = config;
    }
    
    listObjectsV2(_params: any) {
      console.error('Using fallback S3.listObjectsV2 implementation');
      return {
        promise: () => Promise.reject(new Error('AWS.S3 not properly initialized. Check console for details.'))
      };
    }
    
    getObject(_params: any) {
      console.error('Using fallback S3.getObject implementation');
      return {
        promise: () => Promise.reject(new Error('AWS.S3 not properly initialized. Check console for details.'))
      };
    }
    
    putObject(_params: any) {
      console.error('Using fallback S3.putObject implementation');
      return {
        promise: () => Promise.reject(new Error('AWS.S3 not properly initialized. Check console for details.'))
      };
    }
    
    deleteObject(_params: any) {
      console.error('Using fallback S3.deleteObject implementation');
      return {
        promise: () => Promise.reject(new Error('AWS.S3 not properly initialized. Check console for details.'))
      };
    }
  };
}

console.log('AWS object state:', {
  hasConfig: !!AWS.config,
  hasS3: !!AWS.S3,
  hasS3Prototype: !!(AWS.S3 && AWS.S3.prototype),
  s3ConstructorType: typeof AWS.S3
});

const patchMethod = (obj: any, methodName: string) => {
  if (!obj || !obj[methodName]) return;
  
  const original = obj[methodName];
  obj[methodName] = function(...args: any[]) {
    try {
      return original.apply(this, args);
    } catch (e) {
      console.error(`Error in ${methodName}:`, e);
      throw e;
    }
  };
};

if (AWS.S3 && AWS.S3.prototype) {
  patchMethod(AWS.S3.prototype, 'makeRequest');
}

if (AWS.Request && AWS.Request.prototype) {
  patchMethod(AWS.Request.prototype, 'send');
}

try {
  console.log('Initializing AWS SDK with defaults');
  if (typeof AWS.config === 'undefined') {
    console.warn('AWS.config is still undefined before initialization, creating it');
    AWS.config = {};
  }
  
  if (typeof AWS.config.update !== 'function') {
    console.warn('AWS.config.update is still not a function, redefining it');
    AWS.config.update = function(options: any) {
      console.log('AWS.config.update fallback called with:', options);
      Object.assign(AWS.config, options);
    };
  }
  
  AWS.config.update({
    signatureVersion: 'v4',
    maxRetries: 3,
    httpOptions: { timeout: 30000 }
  });
  
  console.log('AWS SDK initialized successfully');
} catch (err) {
  console.error('Failed to initialize AWS SDK:', err);
}

export default AWS;
