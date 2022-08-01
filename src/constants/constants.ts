const GOARCH_AMD64 = "amd64";
const GOARCH_i386 = "386";
const GOARCH_ARM64 = "arm64";
const GOARCH_ARM32 = "arm";

const runAsUserToolTip =
  "Run in the context of the logged in user. If no user is logged in, the script will not run and an error will be returned. Not supported on Windows Server.";

export {
  GOARCH_AMD64,
  GOARCH_i386,
  GOARCH_ARM64,
  GOARCH_ARM32,
  runAsUserToolTip,
};
