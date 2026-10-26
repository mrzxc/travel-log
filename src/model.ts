export interface Media {
  id: string;
  path: string;
  name: string;
  type: "image" | "video";
  time: number;
  missing?: boolean;
  includeInPresentation?: boolean;
  sourceId?: string;
  note?: string;
}
export interface Pin {
  nodeId: string;
  x: number;
  y: number;
}
export type Transport = "plane" | "car" | "bus" | "train" | "jeep";
export interface RoutePoint {
  x: number;
  y: number;
}
export interface MapRoute {
  id: string;
  points: RoutePoint[];
  controls?: (RoutePoint | null)[];
  transport: Transport;
  duration: number;
}
export interface Place {
  id: string;
  name: string;
  parentId: string | null;
  children: string[];
  media: Media[];
  map: Media | null;
  pins: Pin[];
  routes?: MapRoute[];
  showPlaceNames?: boolean;
  /** Legacy projects: read as the default name visibility only. */
  showPlaces?: boolean;
  coverId?: string;
  coverAsset?: Media;
  collapsed?: boolean;
}
export interface Project {
  version: 1;
  portablePaths?: boolean;
  id: string;
  name: string;
  rootId: string;
  nodes: Record<string, Place>;
}
export const uid = () => crypto.randomUUID();
export function createProject(name: string): Project {
  const id = uid();
  return {
    version: 1,
    id: uid(),
    name,
    rootId: id,
    nodes: {
      [id]: {
        id,
        name,
        parentId: null,
        children: [],
        media: [],
        map: null,
        pins: [],
      },
    },
  };
}
export function flatten(p: Project, id: string): Media[] {
  const n = p.nodes[id];
  return n ? [...n.media, ...n.children.flatMap((c) => flatten(p, c))] : [];
}
export function descendants(p: Project, id: string): string[] {
  return p.nodes[id].children.flatMap((c) => [c, ...descendants(p, c)]);
}
export function hasMap(p: Project, id: string): boolean {
  const m = p.nodes[id]?.map;
  return !!m && !m.missing;
}
export function available(p: Project, id: string): Media[] {
  return flatten(p, id).filter(canPresent);
}
export function canPresent(m: Media): boolean {
  return !m.missing && m.includeInPresentation !== false;
}
export function canEnterPlace(p: Project, id: string): boolean {
  return hasMap(p, id) || available(p, id).length > 0;
}
export function cover(p: Project, id: string): Media | undefined {
  const n = p.nodes[id],
    items = available(p, id);
  if (n.coverAsset && !n.coverAsset.missing) return n.coverAsset;
  return (
    flatten(p, id).find((m) => m.id === n.coverId && !m.missing) || items[0]
  );
}
export function setCover(p: Project, placeId: string, media: Media) {
  p.nodes[placeId].coverAsset = { ...media, id: uid(), sourceId: media.id };
  delete p.nodes[placeId].coverId;
}
export function moveMediaBatch(
  p: Project,
  source: string,
  ids: string[],
  target: string,
) {
  if (source === target || !p.nodes[source] || !p.nodes[target]) return;
  const selected = new Set(ids);
  const items = p.nodes[source].media.filter((m) => selected.has(m.id));
  p.nodes[source].media = p.nodes[source].media.filter(
    (m) => !selected.has(m.id),
  );
  p.nodes[target].media.push(...items);
}
export function removeMediaBatch(p: Project, source: string, ids: string[]) {
  const selected = new Set(ids);
  if (p.nodes[source])
    p.nodes[source].media = p.nodes[source].media.filter(
      (m) => !selected.has(m.id),
    );
}
export function reorderMedia(
  items: Media[],
  ids: string[],
  target: string,
  after: boolean,
): Media[] {
  const selected = new Set(ids);
  if (selected.has(target) || !items.some((m) => m.id === target)) return items;
  const moving = items.filter((m) => selected.has(m.id));
  const remaining = items.filter((m) => !selected.has(m.id));
  const at = remaining.findIndex((m) => m.id === target) + (after ? 1 : 0);
  return [...remaining.slice(0, at), ...moving, ...remaining.slice(at)];
}
export function visiblePins(p: Project, id: string): Pin[] {
  const n = p.nodes[id];
  const allowed = new Set(descendants(p, id));
  const valid = n.pins.filter(
    (pin) =>
      allowed.has(pin.nodeId) &&
      (canEnterPlace(p, pin.nodeId) || !!cover(p, pin.nodeId)),
  );
  const marked = new Set(valid.map((v) => v.nodeId));
  return valid.filter((pin) => {
    let parent = p.nodes[pin.nodeId].parentId;
    while (parent && parent !== id) {
      if (marked.has(parent)) return false;
      parent = p.nodes[parent].parentId;
    }
    return true;
  });
}
export function removePlace(p: Project, id: string) {
  if (id === p.rootId) return;
  const ids = new Set([id, ...descendants(p, id)]);
  const parent = p.nodes[id].parentId!;
  p.nodes[parent].children = p.nodes[parent].children.filter((c) => c !== id);
  for (const n of Object.values(p.nodes))
    n.pins = n.pins.filter((pin) => !ids.has(pin.nodeId));
  for (const key of ids) delete p.nodes[key];
}
export function moveMedia(p: Project, mediaId: string, target: string) {
  let found: Media | undefined;
  for (const n of Object.values(p.nodes)) {
    const m = n.media.find((m) => m.id === mediaId);
    if (m) {
      found = m;
      n.media = n.media.filter((v) => v.id !== mediaId);
      break;
    }
  }
  if (found) p.nodes[target].media.push(found);
}
export function pathKey(path: string) {
  return path.replaceAll("/", "\\").toLowerCase();
}

export function placeNamesShown(place: Place): boolean {
  return place.showPlaceNames ?? place.showPlaces ?? true;
}

export function filterPresentationMedia(
  items: Media[],
  onlyParticipating: boolean,
): Media[] {
  return onlyParticipating ? items.filter(canPresent) : items;
}
