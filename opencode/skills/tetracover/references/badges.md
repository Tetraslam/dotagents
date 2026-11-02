# Badge reference

Use badges only after confirming the underlying workflow, package, release, or
license exists. Link each image to the destination a reader would expect.

## Discovery

```bash
git remote -v
gh repo view --json nameWithOwner,defaultBranchRef,licenseInfo,url
gh workflow list
gh release list --limit 10
gh run list --limit 10
```

Inspect package manifests and registry pages for the exact published name.

## GitHub Actions

```markdown
[![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/ci.yml)
```

Use the actual workflow filename. Add `?branch=main` only when branch-specific
status is useful:

```markdown
[![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/OWNER/REPO/actions/workflows/ci.yml)
```

## GitHub release

```markdown
[![Release](https://img.shields.io/github/v/release/OWNER/REPO)](https://github.com/OWNER/REPO/releases/latest)
```

Use this only when the repository publishes GitHub releases.

## Package registries

PyPI:

```markdown
[![PyPI](https://img.shields.io/pypi/v/PACKAGE)](https://pypi.org/project/PACKAGE/)
```

npm:

```markdown
[![npm](https://img.shields.io/npm/v/PACKAGE)](https://www.npmjs.com/package/PACKAGE)
```

crates.io:

```markdown
[![crates.io](https://img.shields.io/crates/v/CRATE)](https://crates.io/crates/CRATE)
```

RubyGems:

```markdown
[![Gem](https://img.shields.io/gem/v/GEM)](https://rubygems.org/gems/GEM)
```

NuGet:

```markdown
[![NuGet](https://img.shields.io/nuget/v/PACKAGE)](https://www.nuget.org/packages/PACKAGE)
```

## Coverage

Codecov:

```markdown
[![codecov](https://codecov.io/gh/OWNER/REPO/branch/main/graph/badge.svg)](https://codecov.io/gh/OWNER/REPO)
```

Confirm Codecov is configured and reporting for the branch. Never add a coverage
badge solely because tests exist.

## Documentation

Read the Docs:

```markdown
[![Documentation](https://readthedocs.org/projects/PROJECT/badge/?version=latest)](https://PROJECT.readthedocs.io/en/latest/)
```

For static docs without a build-status badge, a bold text link is often clearer:

```markdown
**[Documentation](https://example.github.io/project/)**
```

## License

```markdown
[![License](https://img.shields.io/github/license/OWNER/REPO)](LICENSE)
```

Repository metadata already displays the license. Include this badge only when
it helps the badge row rather than repeating visible information.

## Presentation

A plain row:

```markdown
[![CI](...)](...) [![PyPI](...)](...) [![Release](...)](...)
```

Centered:

```html
<p align="center">
  <a href="TARGET"><img src="BADGE" alt="CI status"></a>
  <a href="TARGET"><img src="BADGE" alt="Latest release"></a>
</p>
```

Use meaningful alt text. Keep badge styling consistent and avoid mixing many
different custom colors. Fetch badge URLs after writing; a `200` response may
still render "unknown", so inspect the image or SVG text.
