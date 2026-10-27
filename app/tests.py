from django.test import TestCase

from .hairball3.babiaInfo import Babia
from .views import (
    FLAPPY_PERSPECTIVES,
    format_babia_dict,
    format_babia_flat,
    get_region_for_sprite,
)


class BabiaDistrictTests(TestCase):
    def test_stage_target_is_included_in_control_del_juego(self):
        project = {
            "targets": [
                {"name": "Stage", "blocks": {}},
                {"name": "Game Over", "blocks": {}},
            ]
        }
        babia_data = Babia("test.sb3", project).finalize()

        city = format_babia_dict({
            "babia": babia_data,
            "deadCode": {"scripts": {}},
        })
        control_region = next(
            region for region in city["children"] if region["id"] == "Control del Juego"
        )

        self.assertIn("Stage", {sprite["id"] for sprite in control_region["children"]})

    def test_control_del_juego_contains_stage_and_game_over_sprites(self):
        sprites = ["Stage", "Game Over", "Restart Button", "life"]

        for sprite_name in sprites:
            with self.subTest(sprite_name=sprite_name):
                self.assertEqual(get_region_for_sprite(sprite_name), "Control del Juego")

    def test_city_uses_scratchcity_perspective_and_groups_stage(self):
        project = {
            "babia": {
                "sprites": {
                    "Stage": {"Script 1": "block"},
                    "Game Over": {},
                }
            },
            "deadCode": {"scripts": {}},
        }

        city = format_babia_dict(project)

        self.assertEqual(city["id"], "ScratchCity")
        self.assertEqual(city["node_type"], "City")
        self.assertEqual(city["tree_root"], "/ScratchCity")
        self.assertEqual(city["ai_verbose"], FLAPPY_PERSPECTIVES["scratchcity"]["verbose"])
        control_region = next(
            region for region in city["children"] if region["id"] == "Control del Juego"
        )
        self.assertEqual(
            {sprite["id"] for sprite in control_region["children"]},
            {"Stage", "Game Over"},
        )
        stage_sprite = next(
            sprite for sprite in control_region["children"] if sprite["id"] == "Stage"
        )
        self.assertEqual(stage_sprite["district_type"], "Sprite")
        self.assertTrue(
            format_babia_flat(project)[0]["path"].startswith(
                "/ScratchCity/Control_del_Juego/Stage/"
            )
        )
