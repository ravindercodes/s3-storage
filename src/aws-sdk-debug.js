console.log('AWS SDK debugging info:');
if (window.AWS) {
  console.log('AWS SDK is loaded');
  console.log('AWS.config exists:', !!window.AWS.config);
  console.log('AWS.S3 constructor exists:', typeof window.AWS.S3 === 'function');
  console.log('Available AWS services:', Object.keys(window.AWS).filter(key => typeof window.AWS[key] === 'function'));
  
  try {
    const s3 = new window.AWS.S3({
      region: 'us-east-1'
    });
    console.log('Successfully created S3 instance:', !!s3);
  } catch (err) {
    console.error('Failed to create S3 instance:', err);
  }
} else {
  console.error('AWS SDK is not loaded');
}
