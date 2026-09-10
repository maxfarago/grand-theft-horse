# Midtown map data

The included browser-ready extract is `web/assets/manhattan.json` (9,272,907 bytes). It covers west -74.002, east -73.966, south 40.740, north 40.775, approximately 3 × 3.9 km from Flatiron to southern Central Park.

`tools/map/` includes the Overpass query, converter, and source-derived landmark coordinates. The original raw Overpass response and the larger research extracts are not included. To regenerate data, first obtain an Overpass response using the supplied query and save it as `tools/map/midtown-osm.json`. The converter expects this adjacent file and writes fresh core/full extracts beside itself. Regeneration requires Python 3 and network access for retrieval; neither is required to play the included game.

## Source and attribution

Data: © OpenStreetMap contributors, ODbL 1.0. Display a visible attribution link to https://www.openstreetmap.org/copyright in the game. The adapted map dataset is supplied under ODbL; keep its license metadata when serving it. Source snapshot timestamp reported by Overpass is 2026-07-28T02:16:18Z.

Source was retrieved through https://overpass.private.coffee/api/interpreter. Its availability is documented at https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances . OpenStreetMap's building-height semantics are described at https://wiki.openstreetmap.org/wiki/Simple_3D_Buildings .

## Data contract

All coordinates are arrays `[longitude, latitude]`. Rings are closed. `height` and `minHeight` are metres above ground, so extrusion depth is `height - minHeight` and its base is `minHeight`.

- `buildings`: `{id,name,ring,holes,height,minHeight,kind,isPart,hasParts,suppressOutline,heightSource}`. Some also have `parentId`, `partCoverage`, `maxPartHeight`, `levels`, `roofShape`, `roofHeight`, `material`, `color`, or `street`.
- `roads`: `{id,name,kind,points,lanes,oneway,width}`. Width and lanes may be null; ordinary road-width defaults are a rendering choice. Footways include sidewalk segments and crossings. Underground and indoor ways were excluded.
- `parks` and `water`: `{id,name,ring,holes}`.
- `coastlines`: `{id,points}`. These are open lines, not land polygons.
- `bounds`: `{south,west,north,east}`.
- `metadata`: attribution, license, source timestamp, counts, origin, and estimation policy.

Render buildings with `!building.suppressOutline`. Preserve all mapped parts. `hasParts` alone is insufficient: Flatiron's mapped inner part covers only half its triangular footprint, so its outer volume must remain. The converter conservatively estimates part coverage from 121 samples per outline and suppresses only well-covered outlines. Empire State, Chrysler, Rockefeller, Madison Square Garden, and Central Park Tower correctly use detailed parts. Their named outlines remain in the dataset for discovery and collision information.

Core statistics: 16,083 building outlines/parts, 10,494 road/footway segments, 83 parks, 61 water polygons, 10 coastline segments. 15,204 building features have explicit mapped heights, 151 use mapped levels × 3.3 m, and 728 use an estimated 18 m. `heightSource` identifies these cases. Twelve exact coincident building volumes were deduplicated. Polygon holes, bounds, ring closure, positive extrusions, unique building IDs, and part-parent references were validated.

`tools/map/landmarks.json` gives source-derived polygon centroids and maximum mapped part heights. These coordinates lie inside buildings; for player teleportation, snap to a nearby street or sidewalk rather than placing the avatar at the centroid. Central Park's centroid represents the clipped polygon, not the centroid of the entire park.

Recommended game origin: longitude -73.9855, latitude 40.758 (Times Square vicinity). A compact local conversion is `x = (lon + 73.9855) * 111320 * cos(40.758°)` and `z = -(lat - 40.758) * 111320`.
