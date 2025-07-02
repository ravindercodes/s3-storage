import { useState } from 'react';
import { X, ChevronRight, ChevronDown, ExternalLink, Copy, Check, AlertTriangle, Shield, Zap, FileText, Wrench } from 'lucide-react';
import { TroubleshootingSection } from './TroubleshootingSection';

interface SetupGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SetupGuide({ isOpen, onClose }: SetupGuideProps) {
  const [activeStep, setActiveStep] = useState(1);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const corsConfig = `[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["ETag", "x-amz-meta-custom-header"]
    }
]`;

  const iamPolicy = `{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket",
                "s3:GetBucketLocation",
                "s3:AbortMultipartUpload",
                "s3:ListMultipartUploadParts",
                "s3:ListBucketMultipartUploads"
            ],
            "Resource": [
                "arn:aws:s3:::YOUR_BUCKET_NAME",
                "arn:aws:s3:::YOUR_BUCKET_NAME/*"
            ]
        }
    ]
}`;

  const steps = [
    {
      id: 1,
      title: "Create S3 Bucket",
      icon: <FileText className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Step 1: Navigate to S3</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
              <li>Sign in to the <a href="https://console.aws.amazon.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">AWS Management Console <ExternalLink className="w-3 h-3" /></a></li>
              <li>Navigate to <strong>S3</strong> service</li>
              <li>Click <strong>"Create bucket"</strong></li>
            </ol>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">Step 2: Configure Bucket</h4>
            <ul className="space-y-2 text-sm text-green-800">
              <li><strong>Bucket name:</strong> Choose a globally unique name (e.g., my-s3-drive-2025)</li>
              <li><strong>Region:</strong> Select your preferred region</li>
              <li><strong>Block Public Access:</strong> Keep all options CHECKED ✅</li>
              <li><strong>Encryption:</strong> Enable Server-side encryption (SSE-S3)</li>
            </ul>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
              <p className="text-sm text-amber-800">
                <strong>Important:</strong> Keep your bucket private for security. We'll configure proper access through IAM.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: "Configure CORS",
      icon: <Shield className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Enable Cross-Origin Resource Sharing</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
              <li>Go to your bucket → <strong>Permissions</strong> tab</li>
              <li>Scroll to <strong>"Cross-origin resource sharing (CORS)"</strong></li>
              <li>Click <strong>"Edit"</strong> and paste the configuration below</li>
            </ol>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between p-3 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">CORS Configuration</span>
              <button
                onClick={() => copyToClipboard(corsConfig, 'cors')}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                {copiedText === 'cors' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedText === 'cors' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="p-3 text-xs text-gray-800 overflow-x-auto">
              <code className="break-all sm:break-normal">{corsConfig}</code>
            </pre>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
              <p className="text-sm text-amber-800">
                <strong>Production Tip:</strong> Replace <code>"*"</code> in AllowedOrigins with your specific domain for better security.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: "Create IAM User",
      icon: <Shield className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Step 1: Create IAM Policy</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
              <li>Navigate to <strong>IAM</strong> service in AWS Console</li>
              <li>Click <strong>"Policies"</strong> → <strong>"Create policy"</strong></li>
              <li>Choose <strong>JSON</strong> tab and paste the policy below</li>
              <li>Replace <code>YOUR_BUCKET_NAME</code> with your actual bucket name</li>
            </ol>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between p-3 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">IAM Policy JSON</span>
              <button
                onClick={() => copyToClipboard(iamPolicy, 'policy')}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                {copiedText === 'policy' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedText === 'policy' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="p-3 text-xs text-gray-800 overflow-x-auto max-h-48 scrollbar-hide">
              <code className="break-all sm:break-normal">{iamPolicy}</code>
            </pre>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">Step 2: Create IAM User</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-green-800">
              <li>Go to <strong>IAM</strong> → <strong>Users</strong> → <strong>"Add users"</strong></li>
              <li>User name: <code>s3-drive-user</code></li>
              <li>Access type: <strong>"Programmatic access"</strong></li>
              <li>Attach the policy you just created</li>
              <li><strong>Save the Access Key ID and Secret Access Key!</strong></li>
            </ol>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
              <p className="text-sm text-red-800">
                <strong>Critical:</strong> Save your Access Key ID and Secret Access Key immediately. They won't be shown again!
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: "Configure S3 Drive",
      icon: <Zap className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Enter Your Credentials</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
              <li>Click the <strong>Settings (⚙️)</strong> icon in the top-right corner</li>
              <li>Enter your AWS credentials:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li><strong>Access Key ID:</strong> From your IAM user</li>
                  <li><strong>Secret Access Key:</strong> From your IAM user</li>
                  <li><strong>Region:</strong> Your bucket's region (e.g., us-east-1)</li>
                  <li><strong>Bucket Name:</strong> Your S3 bucket name</li>
                </ul>
              </li>
              <li>Click <strong>"Save"</strong> to test the connection</li>
            </ol>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">🎉 You're Ready!</h4>
            <p className="text-sm text-green-800 mb-2">
              Once configured successfully, you can:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-green-800">
              <li>Upload files with drag & drop or the "Add Files" button</li>
              <li>Create and navigate folders</li>
              <li>Download files by clicking on them</li>
              <li>Use resumable uploads for large files</li>
              <li>Manage uploads and downloads with the queue system</li>
            </ul>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Security Best Practices</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              <li>Never share your AWS credentials publicly</li>
              <li>Rotate your access keys regularly</li>
              <li>Enable MFA on your AWS account</li>
              <li>Monitor your AWS usage and costs</li>
              <li>Use specific CORS origins in production</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 5,
      title: "Troubleshooting",
      icon: <Wrench className="w-5 h-5" />,
      content: <TroubleshootingSection />
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full h-full sm:max-w-4xl sm:w-full sm:max-h-[90vh] sm:h-auto overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">S3 Drive Setup Guide</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Complete these steps to connect your AWS S3 bucket
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white rounded-lg transition-colors ml-2"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row h-[calc(100vh-120px)] sm:h-[calc(90vh-120px)]">
          {/* Mobile Step Navigation */}
          <div className="sm:hidden bg-gray-50 border-b">
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">Step {activeStep} of {steps.length}</h3>
                <div className="flex gap-1">
                  {steps.map((step) => (
                    <button
                      key={step.id}
                      onClick={() => setActiveStep(step.id)}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        step.id === activeStep ? 'bg-blue-600' : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                      aria-label={`Go to step ${step.id}: ${step.title}`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-600">
                  {steps.find(step => step.id === activeStep)?.icon}
                  <span className="text-sm font-medium">
                    {steps.find(step => step.id === activeStep)?.title}
                  </span>
                </div>
                <div className="flex gap-2">
                  {activeStep > 1 && (
                    <button
                      onClick={() => setActiveStep(activeStep - 1)}
                      className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                    >
                      ← Prev
                    </button>
                  )}
                  {activeStep < steps.length && (
                    <button
                      onClick={() => setActiveStep(activeStep + 1)}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Next →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Sidebar */}
          <div className="hidden sm:block w-64 bg-gray-50 border-r overflow-y-auto scrollbar-hide">
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Setup Steps</h3>
              <nav className="space-y-1">
                {steps.map((step) => (
                  <button
                    key={step.id}
                    onClick={() => setActiveStep(step.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                      activeStep === step.id
                        ? 'bg-blue-100 text-blue-900 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className={`flex-shrink-0 ${
                      activeStep === step.id ? 'text-blue-600' : 'text-gray-400'
                    }`}>
                      {step.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          activeStep === step.id
                            ? 'bg-blue-200 text-blue-800'
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {step.id}
                        </span>
                        <span className="text-sm font-medium truncate">{step.title}</span>
                      </div>
                    </div>
                    {activeStep === step.id ? (
                      <ChevronDown className="w-4 h-4 text-blue-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="p-4 sm:p-6">
              {steps.find(step => step.id === activeStep)?.content}
              
              {/* Mobile Content Navigation */}
              <div className="sm:hidden mt-6 pt-4 border-t border-gray-200">
                <div className="flex gap-3 justify-between">
                  {activeStep > 1 ? (
                    <button
                      onClick={() => setActiveStep(activeStep - 1)}
                      className="flex-1 px-4 py-3 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                    >
                      ← Previous Step
                    </button>
                  ) : (
                    <div className="flex-1"></div>
                  )}
                  
                  {activeStep < steps.length ? (
                    <button
                      onClick={() => setActiveStep(activeStep + 1)}
                      className="flex-1 px-4 py-3 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Next Step →
                    </button>
                  ) : (
                    <button
                      onClick={onClose}
                      className="flex-1 px-4 py-3 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      🎉 Complete Setup
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
              <Shield className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="leading-tight">Your credentials are stored locally and never sent to third parties</span>
            </div>
            <div className="flex gap-2 justify-between sm:justify-end">
              {activeStep > 1 && (
                <button
                  onClick={() => setActiveStep(activeStep - 1)}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Previous
                </button>
              )}
              {activeStep < steps.length ? (
                <button
                  onClick={() => setActiveStep(activeStep + 1)}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Next Step
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Get Started
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
