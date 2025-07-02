import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onFilter: (extension: string) => void;
  searchQuery: string;
  activeFilter: string;
}

export function SearchBar({ onSearch, onFilter, searchQuery, activeFilter }: SearchBarProps) {
  const [showFilters, setShowFilters] = useState(false);

  const commonExtensions = [
    'jpg', 'png', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 
    'ppt', 'pptx', 'txt', 'mp4', 'mp3', 'zip'
  ];

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search files and folders..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => onSearch('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${
            activeFilter ? 'bg-blue-50 border-blue-300 text-blue-600' : ''
          }`}
        >
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {showFilters && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4 mb-4">
          <h3 className="font-medium text-gray-900 mb-3">Filter by file type</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                onFilter('');
                setShowFilters(false);
              }}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                !activeFilter 
                  ? 'bg-blue-100 border-blue-300 text-blue-700' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              All files
            </button>
            {commonExtensions.map((ext) => (
              <button
                key={ext}
                onClick={() => {
                  onFilter(ext);
                  setShowFilters(false);
                }}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  activeFilter === ext
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                .{ext}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}