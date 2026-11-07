#!/usr/bin/env bash
set -euo pipefail

group="${1:-lung}"
root="$(cd "$(dirname "$0")/.." && pwd)"
data="$root/packages/web/public/data"
version="$(node -p "require('$data/manifest.json').groups.find(g => g.id === '$group').version")"
tag="data-$group-$version"
name="trialy-data-$group-$version"
out="$root/release"
stage="$out/$name"

rm -rf "$stage"
mkdir -p "$stage/schema"
cp "$data/$group.json" "$data/manifest.json" "$stage/"
cp "$root"/packages/domain/schema/*.json "$stage/schema/"
cp "$root/docs/data.md" "$stage/DATA.md"
cp "$root/LICENSE" "$stage/LICENSE"

(cd "$stage" && find . -type f ! -name SHA256SUMS | sort | xargs shasum -a 256 > SHA256SUMS)
tar -czf "$out/$name.tar.gz" -C "$out" "$name"
rm -rf "$stage"

trials="$(node -p "require('$data/manifest.json').groups.find(g => g.id === '$group').trials")"
generated="$(node -p "require('$data/manifest.json').generatedAt")"
cat > "$out/NOTES-$tag.md" <<NOTES
Trialy data: $group, version $version

$trials trials from ClinicalTrials.gov (API v2), processed $generated.
Contents: bundle, manifest, JSON Schemas, DATA.md (format, versioning, terms).
Source: ClinicalTrials.gov. Criteria are split and rules added by Trialy, see DATA.md.
NOTES

echo "$out/$name.tar.gz"
echo "tag: $tag"
