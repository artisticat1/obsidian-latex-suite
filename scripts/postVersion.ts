import { execSync } from "child_process";



const tagOutput = execSync("git tag --sort=-version:refname ").toString().trim();
const tags = tagOutput.split("\n").filter(tag => /^\d+\.\d+\.\d+$/.test(tag));
const latestTag = tags[0];
execSync("git push")
const upstream = process.env.GITHUB_UPSTREAM_REPO ?? "upstream"
execSync(`git push ${upstream} ${latestTag}`)

