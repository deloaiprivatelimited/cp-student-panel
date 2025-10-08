
const InstallApp = () => {
  const os = detectOS();

  // Pick the primary suggested download based on detected OS
  const suggested = os === "windows" ? { href: exePath, name: "Windows (.exe)" }
                   : os === "mac" ? { href: dmgPath, name: "macOS (.dmg)" }
                   : os === "linux" ? { href: zipPath, name: "Linux (.zip)" }
                   : { href: exePath, name: "Windows (.exe)" }; // default suggestion

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Install the App</h1>
        <p style={{ color: "#CCCCCC" }} className="text-lg">
          Download the installer for your platform. We detected:{" "}
          <strong style={{ color: "#FFFFFF" }}>{os.toUpperCase()}</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div
          className="p-6 rounded-lg"
          style={{ backgroundColor: "#2D2D30", border: "1px solid #3E3E42" }}
        >
          <div className="flex items-center space-x-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "#4CA466" }}
            >
              <DownloadCloud className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">One-click Download</h3>
              <p style={{ color: "#CCCCCC" }} className="text-sm">
                Click the button on the right to download the suggested installer.
              </p>
            </div>
          </div>
        </div>

        <div
          className="p-6 rounded-lg"
          style={{ backgroundColor: "#2D2D30", border: "1px solid #3E3E42" }}
        >
          <div className="flex items-center space-x-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "#4CA466" }}
            >
              <Info className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Safe & Secure</h3>
              <p style={{ color: "#CCCCCC" }} className="text-sm">
                Consider adding a checksum or code signature so students can verify installers.
              </p>
            </div>
          </div>
        </div>

        <div
          className="p-6 rounded-lg"
          style={{ backgroundColor: "#2D2D30", border: "1px solid #3E3E42" }}
        >
          <div className="flex items-center space-x-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "#4CA466" }}
            >
              <ArrowRight className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Help & Docs</h3>
              <p style={{ color: "#CCCCCC" }} className="text-sm">
                <Link to="/help/install" style={{ color: "#4CA466" }} className="hover:underline">
                  Installation instructions
                </Link>{" "}
                and troubleshooting.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Suggested download */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Suggested Download</h2>
          <span style={{ color: "#CCCCCC" }} className="text-sm">
            We detected: <strong style={{ color: "#FFFFFF" }}>{os.toUpperCase()}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InstallCard
            title={`Suggested: ${suggested.name}`}
            desc="Click to download the installer we think matches your OS."
            href={suggested.href}
            fileName={suggested.href.split("/").pop()}
          />

          {/* Always show both direct platform options */}
          <InstallCard
            title="Windows (.exe)"
            desc="For Windows machines. If your browser blocks auto-run, open the file from Downloads."
            href={exePath}
            fileName={exePath.split("/").pop()}
          />

          <InstallCard
            title="macOS (.dmg)"
            desc="For macOS. Double-click the .dmg to open and drag app to Applications."
            href={dmgPath}
            fileName={dmgPath.split("/").pop()}
          />
        </div>
      </section>

      {/* Manual links & notes */}
      <section>
        <h3 className="text-lg font-semibold text-white mb-2">Manual links</h3>
        <p style={{ color: "#CCCCCC" }} className="mb-4 text-sm">
          If the automatic download doesn't work, right-click the link and choose "Save link as..." or use the direct links below.
        </p>

        <ul className="space-y-2">
          <li>
            <a href={exePath} download className="underline" style={{ color: "#4CA466" }}>
              Download Windows installer (.exe)
            </a>
          </li>
          <li>
            <a href={dmgPath} download className="underline" style={{ color: "#4CA466" }}>
              Download macOS installer (.dmg)
            </a>
          </li>
          <li>
            <a href={zipPath} download className="underline" style={{ color: "#4CA466" }}>
              Download generic bundle (.zip)
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
};

export default InstallApp;
