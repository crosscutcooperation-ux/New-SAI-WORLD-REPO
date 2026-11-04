"""Build the responsive exterior references directly from the supplied sRGB TIFFs."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


def prepare(job):
    source, stem, destination = job
    with Image.open(source) as original:
        profile = original.info["icc_profile"]
    pixels = cv2.imread(str(source), cv2.IMREAD_UNCHANGED)
    if pixels.dtype == np.uint16:
        pixels = np.rint(pixels / 257).astype(np.uint8)
    image = Image.fromarray(cv2.cvtColor(pixels, cv2.COLOR_BGR2RGB))
    for width in (1280, 2400, image.width):
        target = destination / f"{stem}-{width}.webp"
        sample = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
        sample.save(target, quality=95, lossless=width == image.width, method=5, icc_profile=profile)
        with Image.open(target) as result:
            if width == image.width:
                assert np.array_equal(np.asarray(result), np.asarray(image))
            assert result.info["icc_profile"] == profile
        print(f"{target.name}: {target.stat().st_size:,} bytes", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    directory = parser.parse_args().directory
    destination = Path(__file__).resolve().parents[1] / "dist/assets/exteriors"
    destination.mkdir(exist_ok=True)
    sources = [("46 Club To Building - new.tif", "courtyard"), ("01 Road Side day View.tif", "roadside")]
    with ThreadPoolExecutor(max_workers=2) as executor:
        list(executor.map(prepare, [(directory / name, stem, destination) for name, stem in sources]))
