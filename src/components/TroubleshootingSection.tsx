import { AlertTriangle, CheckCircle, XCircle, HelpCircle } from 'lucide-react';

export function TroubleshootingSection() {
  const commonIssues = [
    {
      issue: "Access Denied Errors",
      icon: <XCircle className="w-5 h-5 text-red-500" />,
      solutions: [
        "Verify your IAM policy includes all required permissions",
        "Check that the bucket name in the policy matches exactly",
        "Ensure your IAM user has programmatic access enabled",
        "Double-check your Access Key ID and Secret Access Key"
      ]
    },
    {
      issue: "CORS Errors",
      icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
      solutions: [
        "Verify CORS configuration is properly set in your S3 bucket",
        "Check that your domain is included in AllowedOrigins",
        "Clear your browser cache and try again",
        "Ensure all required methods are included in AllowedMethods"
      ]
    },
    {
      issue: "Upload Failures",
      icon: <XCircle className="w-5 h-5 text-red-500" />,
      solutions: [
        "Check if the bucket has sufficient space",
        "Verify multipart upload permissions in IAM policy",
        "Ensure the bucket is in the correct region",
        "Check file size limits and bucket quotas"
      ]
    },
    {
      issue: "Connection Issues",
      icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
      solutions: [
        "Verify Access Key ID and Secret Access Key are correct",
        "Check the region setting matches your bucket's region",
        "Ensure IAM user has programmatic access enabled",
        "Test connectivity with AWS CLI if available"
      ]
    }
  ];

  const testSteps = [
    {
      step: "Test AWS CLI Connection",
      command: "aws s3 ls s3://your-bucket-name --profile your-profile",
      description: "Verify your credentials work with AWS CLI"
    },
    {
      step: "Check Browser Console",
      command: "Press F12 → Console tab",
      description: "Look for specific error messages and CORS issues"
    },
    {
      step: "Verify Bucket Region",
      command: "aws s3api get-bucket-location --bucket your-bucket-name",
      description: "Ensure your bucket region matches the configured region"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Quick Diagnosis</h4>
            <p className="text-sm text-blue-800">
              If you're experiencing issues, check the browser console (F12) for specific error messages. 
              Most problems are related to IAM permissions or CORS configuration.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <h4 className="text-lg font-semibold text-gray-900">Common Issues & Solutions</h4>
        
        {commonIssues.map((item, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              {item.icon}
              <h5 className="font-medium text-gray-900">{item.issue}</h5>
            </div>
            <ul className="space-y-1">
              {item.solutions.map((solution, sIndex) => (
                <li key={sIndex} className="text-sm text-gray-700 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{solution}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Debugging Steps</h4>
        <div className="space-y-3">
          {testSteps.map((test, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded p-3">
              <div className="font-medium text-gray-900 mb-1">{test.step}</div>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-800 block mb-2">
                {test.command}
              </code>
              <p className="text-sm text-gray-600">{test.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-green-900 mb-2">Still Need Help?</h4>
            <p className="text-sm text-green-800 mb-2">
              If you're still experiencing issues after trying these solutions:
            </p>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Check the GitHub repository for known issues</li>
              <li>• Review AWS CloudTrail logs for detailed error information</li>
              <li>• Verify your AWS account has no service limitations</li>
              <li>• Test with a simple AWS SDK example to isolate the issue</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
