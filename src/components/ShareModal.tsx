import { useState } from 'react';
import { X, Share2, Copy, Clock, Check, ExternalLink, Settings } from 'lucide-react';
import { S3Object } from '../types';
import { s3Service } from '../services/s3Service';

interface ShareModalProps {
  file: S3Object | null;
  onClose: () => void;
}

interface ExpirationOption {
  label: string;
  value: number; // in seconds
  description: string;
}

const expirationOptions: ExpirationOption[] = [
  { label: '10 minutes', value: 600, description: 'Quick temporary access' },
  { label: '30 minutes', value: 1800, description: 'Short-term sharing' },
  { label: '1 hour', value: 3600, description: 'Standard sharing' },
  { label: '2 hours', value: 7200, description: 'Extended access' },
  { label: '6 hours', value: 21600, description: 'Half-day access' },
  { label: '12 hours', value: 43200, description: 'Full-day access' },
  { label: '24 hours', value: 86400, description: 'One day access' },
  { label: '7 days', value: 604800, description: 'One week access' },
  { label: 'Custom', value: -1, description: 'Set your own time' },
];

export function ShareModal({ file, onClose }: ShareModalProps) {
  const [selectedExpiration, setSelectedExpiration] = useState<number>(3600);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [customTime, setCustomTime] = useState<string>('1');
  const [customUnit, setCustomUnit] = useState<'minutes' | 'hours' | 'days'>('hours');
  const [activeTab, setActiveTab] = useState<'suggestions' | 'custom'>('suggestions');

  if (!file) return null;

  const getCustomTimeInSeconds = () => {
    const time = parseInt(customTime) || 1;
    const validatedTime = Math.max(1, Math.min(time, customUnit === 'days' ? 365 : customUnit === 'hours' ? 8760 : 525600));
    
    switch (customUnit) {
      case 'minutes':
        return validatedTime * 60;
      case 'hours':
        return validatedTime * 3600;
      case 'days':
        return validatedTime * 86400;
      default:
        return 3600; 
    }
  };

  const isValidCustomTime = () => {
    const time = parseInt(customTime);
    if (isNaN(time) || time < 1) return false;
    
    // Set reasonable limits
    if (customUnit === 'minutes' && time > 525600) return false;
    if (customUnit === 'hours' && time > 8760) return false;
    if (customUnit === 'days' && time > 365) return false;
    
    return true;
  };

  const getActualExpiration = () => {
    return activeTab === 'custom' ? getCustomTimeInSeconds() : selectedExpiration;
  };

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    try {
      const actualExpiration = getActualExpiration();
      const url = s3Service.getSignedUrl(file.key, actualExpiration);
      setShareUrl(url);
      setIsGenerated(true);
    } catch (error) {
      console.error('Failed to generate share link:', error);
      alert('Failed to generate share link. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleOpenLink = () => {
    window.open(shareUrl, '_blank');
  };

  const selectedOption = expirationOptions.find(opt => opt.value === selectedExpiration);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Share2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Share File</h2>
              <p className="text-sm text-gray-500 truncate max-w-xs" title={file.name}>
                {file.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!isGenerated ? (
            <>
              {/* Expiration Selection */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-medium text-gray-900">Link Expiration</h3>
                </div>
                
                {/* Tab Pills */}
                <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
                  <button
                    onClick={() => {
                      setActiveTab('suggestions');
                      if (selectedExpiration === -1) {
                        setSelectedExpiration(3600); // Reset to 1 hour when switching to suggestions
                      }
                    }}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                      activeTab === 'suggestions'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Suggestions
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('custom');
                      setSelectedExpiration(-1);
                    }}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                      activeTab === 'custom'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {/* Suggestions Tab Content */}
                {activeTab === 'suggestions' && (
                  <div className="grid grid-cols-2 gap-2">
                    {expirationOptions.slice(0, -1).map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSelectedExpiration(option.value)}
                        className={`p-3 text-left rounded-lg border transition-all ${
                          selectedExpiration === option.value
                            ? 'border-blue-500 bg-blue-50 text-blue-900'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium text-sm">{option.label}</div>
                        <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Custom Tab Content */}
                {activeTab === 'custom' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <Settings className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Set Custom Duration</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        max={customUnit === 'days' ? '365' : customUnit === 'hours' ? '8760' : '525600'}
                        value={customTime}
                        onChange={(e) => setCustomTime(e.target.value)}
                        className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          !isValidCustomTime() ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder={`1-${customUnit === 'days' ? '365' : customUnit === 'hours' ? '8760' : '525600'}`}
                      />
                      <select
                        value={customUnit}
                        onChange={(e) => {
                          setCustomUnit(e.target.value as 'minutes' | 'hours' | 'days');
                          setCustomTime('1');
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                    </div>
                    
                    <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                      <p className="font-medium">Preview: Link expires in {customTime} {customTime === '1' ? customUnit.slice(0, -1) : customUnit}</p>
                      <p className="mt-1">
                        Limits: {customUnit === 'days' && 'Up to 365 days'}
                        {customUnit === 'hours' && 'Up to 8,760 hours (1 year)'}
                        {customUnit === 'minutes' && 'Up to 525,600 minutes (1 year)'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Option Summary */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Selected:</span> {
                    activeTab === 'custom'
                      ? `Custom (${customTime} ${customTime === '1' ? customUnit.slice(0, -1) : customUnit})`
                      : selectedOption?.label
                  }
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  The link will expire after {
                    activeTab === 'custom'
                      ? `${customTime} ${customTime === '1' ? customUnit.slice(0, -1) : customUnit}`
                      : selectedOption?.label.toLowerCase()
                  } and become inaccessible.
                </p>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerateLink}
                disabled={isGenerating || (activeTab === 'custom' && !isValidCustomTime())}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating Link...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    Generate Share Link
                  </>
                )}
              </button>

              {/* Validation Error */}
              {activeTab === 'custom' && !isValidCustomTime() && (
                <p className="mt-2 text-sm text-red-600">
                  Please enter a valid time (1-365 days, 1-8760 hours, or 1-525600 minutes)
                </p>
              )}
            </>
          ) : (
            <>
              {/* Generated Link */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="w-4 h-4 text-green-600" />
                  <h3 className="text-sm font-medium text-gray-900">Share Link Generated</h3>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <p className="text-xs text-gray-600 mb-2">Share URL:</p>
                  <p className="text-sm text-gray-900 break-all font-mono bg-white p-2 rounded border">
                    {shareUrl}
                  </p>
                </div>

                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <span className="font-medium">⏰ Expires in:</span> {
                      activeTab === 'custom'
                        ? `${customTime} ${customTime === '1' ? customUnit.slice(0, -1) : customUnit}`
                        : selectedOption?.label
                    }
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    After this time, the link will no longer work and access will be denied.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </>
                  )}
                </button>
                
                <button
                  onClick={handleOpenLink}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Link
                </button>
              </div>

              {/* Generate New Link */}
              <button
                onClick={() => {
                  setIsGenerated(false);
                  setShareUrl('');
                  setIsCopied(false);
                  setActiveTab('suggestions');
                  setSelectedExpiration(3600); // Reset to 1 hour
                  setCustomTime('1');
                  setCustomUnit('hours');
                }}
                className="w-full mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium py-2 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Generate New Link
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
