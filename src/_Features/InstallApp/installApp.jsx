import { Download } from 'lucide-react';

function InstallApp() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#1E1E1E' }}>
      <div className="max-w-2xl w-full" style={{ backgroundColor: '#2D2D30', borderRadius: '12px', border: '1px solid #3E3E42' }}>
        <div className="p-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4" style={{ color: '#FFFFFF' }}>
              Download Our App
            </h1>
            <p className="text-lg" style={{ color: '#CCCCCC' }}>
              Choose your platform and get started in seconds
            </p>
          </div>

          <div className="space-y-6">
            <div
              className="p-8 rounded-lg flex items-center justify-between hover:opacity-90 transition-opacity cursor-pointer"
              style={{ backgroundColor: '#1E1E1E', border: '1px solid #3E3E42' }}
              onClick={() => window.open('/downloads/careerprep.exe', '_blank')}
            >
              <div className="flex items-center gap-6">
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: '#4CA466' }}
                >
                  <Download size={32} color="#FFFFFF" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold mb-1" style={{ color: '#FFFFFF' }}>
                    Windows
                  </h2>
                  <p style={{ color: '#999999' }}>
                    Download .exe installer
                  </p>
                </div>
              </div>
              <button
                className="px-8 py-3 rounded-lg font-medium text-lg transition-all hover:scale-105"
                style={{ backgroundColor: '#4CA466', color: '#FFFFFF' }}
              >
                Download
              </button>
            </div>

            <div
              className="p-8 rounded-lg flex items-center justify-between hover:opacity-90 transition-opacity cursor-pointer"
              style={{ backgroundColor: '#1E1E1E', border: '1px solid #3E3E42' }}
              onClick={() => window.open('/downloads/careerprep.dmg', '_blank')}
            >
              <div className="flex items-center gap-6">
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: '#4CA466' }}
                >
                  <Download size={32} color="#FFFFFF" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold mb-1" style={{ color: '#FFFFFF' }}>
                    macOS
                  </h2>
                  <p style={{ color: '#999999' }}>
                    Download .dmg installer
                  </p>
                </div>
              </div>
              <button
                className="px-8 py-3 rounded-lg font-medium text-lg transition-all hover:scale-105"
                style={{ backgroundColor: '#4CA466', color: '#FFFFFF' }}
              >
                Download
              </button>
            </div>
          </div>

          <div className="mt-8 pt-8" style={{ borderTop: '1px solid #3E3E42' }}>
            <p className="text-center text-sm" style={{ color: '#999999' }}>
              System requirements: Windows 10+ or macOS 10.14+
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InstallApp;

