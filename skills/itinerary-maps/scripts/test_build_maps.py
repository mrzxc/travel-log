"""Synthetic geometry tests; fixtures are deliberately not real travel maps."""
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image
from build_maps import build


class MapTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.base = Path(self.temp.name)
        (self.base / "shape.geojson").write_text(json.dumps({
            "type": "FeatureCollection", "features": [{"type": "Feature", "properties": {},
            "geometry": {"type": "Polygon", "coordinates": [[[1, 1], [9, 1], [9, 9], [1, 9], [1, 1]]]}}]
        }), encoding="utf-8")
        self.spec = {"name": "Synthetic test", "rootId": "trip", "places": [
            {"id": "trip", "name": "Test trip", "parentId": None},
            {"id": "country", "name": "分类层", "parentId": "trip"},
            {"id": "city", "name": "城市", "parentId": "country", "lon": 5, "lat": 7, "source": "synthetic test"},
            {"id": "leaf", "name": "景点", "parentId": "city", "lon": 6, "lat": 8, "source": "synthetic test"}
        ], "maps": [
            {"ownerId": "trip", "geojson": "shape.geojson", "bounds": [0, 0, 10, 10], "size": [960, 540], "pinIds": ["city", "leaf"], "source": "Synthetic geometry — test only"},
            {"ownerId": "city", "geojson": "shape.geojson", "bounds": [0, 0, 10, 10], "size": [960, 540], "pinIds": ["leaf"], "source": "Synthetic geometry — test only"}
        ]}

    def tearDown(self):
        self.temp.cleanup()

    def run_spec(self, **options):
        file = self.base / "input.json"
        file.write_text(json.dumps(self.spec, ensure_ascii=False), encoding="utf-8")
        return build(file, self.base / "output", **options)

    def test_projection_tree_and_empty_pin_visibility(self):
        maps = self.run_spec(project=True, static=True)
        trip = json.loads((self.base / "output/journey.travel").read_text(encoding="utf-8"))
        nodes = trip["nodes"]
        self.assertEqual(nodes["country"]["children"], ["city"])
        self.assertEqual(nodes["trip"]["pins"][0]["nodeId"], "city")
        self.assertLess(maps[0]["pins"][1]["y"], maps[0]["pins"][0]["y"])
        self.assertAlmostEqual(maps[0]["pins"][0]["x"], .5)
        self.assertEqual(maps[0]["hiddenUntilMediaImported"], ["leaf"])
        self.assertEqual(nodes["leaf"]["media"], [])
        self.assertTrue(Path(nodes["trip"]["map"]["path"]).is_absolute())
        with Image.open(maps[0]["png"]) as image:
            self.assertEqual(image.size, (960, 540))
            # The projected pin lands on the synthetic polygon, not water.
            x, y = maps[0]["pins"][0]["x"] * 960, maps[0]["pins"][0]["y"] * 540
            self.assertEqual(image.getpixel((int(x), int(y))), (205, 219, 189))
        self.assertTrue(Path(maps[0]["static"]).exists())

    def test_declines_overwrite_and_no_project_by_default(self):
        self.run_spec()
        self.assertFalse((self.base / "output/journey.travel").exists())
        with self.assertRaisesRegex(ValueError, "new or empty"):
            self.run_spec()

    def test_image_registration_ignores_geographic_projection(self):
        image = self.base / "provided.png"
        Image.new("RGB", (1200, 700), "#eeeecc").save(image)
        self.spec["maps"] = [{"ownerId": "trip", "baseImage": "provided.png", "source": "user image", "pinIds": ["city"], "pinPositions": {"city": [.2, .8]}}]
        maps = self.run_spec()
        self.assertEqual(maps[0]["size"], [1200, 700])
        self.assertEqual(maps[0]["pins"][0], {"nodeId": "city", "x": .2, "y": .8})
        self.assertIn("data:image/png;base64,", Path(maps[0]["svg"]).read_text(encoding="utf-8"))

    def test_rejects_unregistered_image(self):
        Image.new("RGB", (1200, 700)).save(self.base / "provided.png")
        self.spec["maps"] = [{"ownerId": "trip", "baseImage": "provided.png", "source": "user image", "pinIds": ["city"]}]
        with self.assertRaisesRegex(ValueError, "registration"):
            self.run_spec()

    def test_rejects_off_map_pin_without_creating_output(self):
        self.spec["places"][2]["lon"] = 20
        with self.assertRaisesRegex(ValueError, "outside"):
            self.run_spec()
        self.assertFalse((self.base / "output").exists())

    def test_rejects_non_descendant_and_duplicate_pins(self):
        self.spec["maps"][1]["pinIds"] = ["country"]
        with self.assertRaisesRegex(ValueError, "descendant"):
            self.run_spec()
        self.spec["maps"][1]["pinIds"] = ["leaf", "leaf"]
        with self.assertRaisesRegex(ValueError, "Duplicate map pin"):
            self.run_spec()

    def test_rejects_disconnected_cycle(self):
        self.spec["places"].extend([
            {"id": "a", "name": "A", "parentId": "b"},
            {"id": "b", "name": "B", "parentId": "a"}
        ])
        with self.assertRaisesRegex(ValueError, "Unreachable"):
            self.run_spec()

    def test_reports_ancestor_occlusion_without_dummy_media(self):
        self.spec["maps"].append({"ownerId": "leaf", "geojson": "shape.geojson", "bounds": [0, 0, 10, 10], "pinIds": [], "source": "Synthetic"})
        maps = self.run_spec()
        self.assertEqual(maps[0]["occludedByAncestor"], ["leaf"])
        self.assertEqual(maps[0]["hiddenUntilMediaImported"], [])


if __name__ == "__main__":
    unittest.main()
