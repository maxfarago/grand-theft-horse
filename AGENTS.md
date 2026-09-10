# Owner's workflow

The owner exclusively controls publishing and `git push`. Do not push, open pull requests, or deploy. Do not request permission for those actions unless the owner explicitly changes this rule.

Git remotes, `git init`, and local branch setup are allowed when the owner asks for them. Do not create commits unless the owner asks.

# Project facts

- This is Grand Theft Horse: a Midtown Manhattan open world with a three-job wanted loop.
- `web/` is the editable game source, not generated build output.
- `Grand Theft Horse.html` is the original Los Santhos prototype. Port mechanics from it; do not replace the OSM world with that grid city.
- There is no build step and there are no npm dependencies to install. Three.js r170 and its required loader helpers are vendored in `web/vendor/`.
- Start with `npm run dev`. Run `npm run check` for syntax and asset references, and `npm test` for CPU geometry, movement, and mission checks.
- Read `README.md` for scope, testing limits and third-party asset terms.
- The horse asset is CC BY-NC-SA 3.0. Retain attribution and do not imply it permits commercial use.
- OpenStreetMap data is ODbL 1.0. Keep its license metadata and visible attribution.
