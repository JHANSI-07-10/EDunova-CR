# Generated manually — data migration.
#
# Production contains a stale duplicate "24×7 Parent Support" (mojibake
# multiplication sign U+00D7) alongside the canonical "24x7 Parent Support"
# WhyChooseItem, so the home page rendered two cards. This migration folds
# lookalike characters to ASCII and deletes duplicate rows by normalized
# title, keeping the first occurrence by sort_order.
import re

from django.db import migrations


def _normalize_ascii(value):
    return (
        re.sub(r"\s+", " ", (value or "").replace("\u00a0", " "))
        .replace("\u00d7", "x")
        .translate(str.maketrans({ord(d): chr(i) for i, d in enumerate("０１２３４５６７８９")}))
        .strip()
    )


def dedupe_why_choose(apps, schema_editor):
    WhyChooseItem = apps.get_model("cms", "WhyChooseItem")
    seen = set()
    for item in WhyChooseItem.objects.order_by("sort_order", "id"):
        key = _normalize_ascii(item.title).lower()
        if key in seen:
            item.delete()
        else:
            seen.add(key)


def reverse_noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("cms", "0006_schoolsettings_admissions_academic_year_and_more"),
    ]

    operations = [
        migrations.RunPython(dedupe_why_choose, reverse_code=reverse_noop),
    ]
