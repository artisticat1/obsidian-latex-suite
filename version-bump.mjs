import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.env.npm_package_version;

function version_larger_than(v1, v2) {
	const v1_parts = v1.split(".").map(Number);
	const v2_parts = v2.split(".").map(Number);
	for (let i = 0; i < Math.max(v1_parts.length, v2_parts.length); i++) {
		const v1_part = v1_parts[i] || 0;
		const v2_part = v2_parts[i] || 0;
		if (v1_part > v2_part) return true;
		if (v1_part < v2_part) return false;
	}
}

// read minAppVersion from manifest.json and bump version to target version
let manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

// update versions.json with target version and minAppVersion from manifest.json
let versions = JSON.parse(readFileSync("versions.json", "utf8"));
const version_keys = Object.keys(versions);
const highestVersion = version_keys.reduce((a, b) => (version_larger_than(a, b) ? a : b));
if (versions[highestVersion] !== minAppVersion) {
	versions[targetVersion] = minAppVersion;
	writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));
}
