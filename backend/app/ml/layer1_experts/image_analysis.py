"""
Image Analysis Service
Extracts clinically meaningful visual features from oral/histopathology images.

Quality policy:
  - Image is decoded ONCE from the original bytes.
  - Analysis resolution: 512×512 (sufficient for colour + texture; faster than full-res).
  - RGB and HSV arrays are derived from the SAME decoded image — no drift.
  - Original bytes are never mutated.

Indicator weights derived from clinical literature:
  - Erythroplakia (red lesion):      ~51% malignant
  - Leukoplakia (white patch):       ~5–17% malignant
  - Erythroleukoplakia (mixed):      ~28–35% malignant
  - Ulceration / dark regions:       significant indicator
  - Texture heterogeneity:           irregular surface = suspicious
"""
import io
import numpy as np

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

# Analysis resolution — large enough for texture, small enough to be fast.
_ANALYSIS_SIZE = (512, 512)


def _safe_entropy(arr: np.ndarray) -> float:
    """Shannon entropy of a uint8 array.  Returns 0.0 for uniform images."""
    hist, _ = np.histogram(arr.flatten(), bins=64, range=(0, 256))
    hist = hist[hist > 0].astype(float)
    if hist.sum() == 0:
        return 0.0
    hist /= hist.sum()
    return float(max(0.0, -np.sum(hist * np.log2(hist + 1e-10))))


def analyze_oral_image(image_bytes: bytes, modality: str = "intraoral") -> dict:
    """
    Analyze an oral cavity or histopathology image.

    Args:
        image_bytes: Raw bytes of the uploaded image — NOT modified.
        modality: "intraoral" | "histopathology"

    Returns:
        {
            "risk_score":       float in [0, 1],
            "features":         { per-feature scores },
            "dominant_finding": str,
        }
    """
    if not PIL_AVAILABLE:
        return {"risk_score": 0.5, "features": {}, "dominant_finding": "PIL not available"}

    try:
        # ── Decode once — both colour spaces from the same object ─────────────
        img_rgb = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        orig_w, orig_h = img_rgb.size  # preserve original dimensions for logging

        # Resize with high-quality LANCZOS resampling for analysis
        img_rgb = img_rgb.resize(_ANALYSIS_SIZE, Image.LANCZOS)
        img_hsv = img_rgb.convert("HSV")  # derived from the same resized RGB — consistent

        # Convert to float32 numpy arrays
        rgb_arr = np.array(img_rgb, dtype=np.float32)   # (H, W, 3)  RGB channels
        hsv_arr = np.array(img_hsv, dtype=np.float32)   # (H, W, 3)  H, S, V channels

        R, G, B = rgb_arr[:, :, 0], rgb_arr[:, :, 1], rgb_arr[:, :, 2]
        H_ch    = hsv_arr[:, :, 0]   # Hue:        [0, 255] → [0°, 360°]
        S_ch    = hsv_arr[:, :, 1]   # Saturation: [0, 255]
        V_ch    = hsv_arr[:, :, 2]   # Value:      [0, 255]

        # Derived luminance (consistent with ITU-R BT.601)
        luminance = 0.299 * R + 0.587 * G + 0.114 * B

        # ── Feature 1: Redness / Erythroplakia ───────────────────────────────
        # Erythroplakia is DEEPLY vivid red — narrow hue, high saturation.
        # PIL HSV hue: 0–7  ≈ 0°–10°  (red zone low end)
        #             248–255 ≈ 350°–360° (red zone high end / wrap-around)
        # Saturation > 100 excludes pale pink / normal mucosa.
        red_hue_mask   = ((H_ch < 8) | (H_ch > 247)) & (S_ch > 100) & (V_ch > 40)
        redness_score  = float(np.clip(np.mean(red_hue_mask) * 6.0, 0.0, 1.0))

        # ── Feature 2: White patches / Leukoplakia ───────────────────────────
        # High luminance (>185) + low saturation (<35) = white/pale tissue.
        white_mask      = (luminance > 185) & (S_ch < 35)
        white_patch_score = float(np.mean(white_mask))

        # ── Feature 3: Dark / ulcerated regions ──────────────────────────────
        # Ulcers are low-luminance regions; threshold at 80 to catch depth.
        dark_mask         = luminance < 80
        dark_region_score = float(np.mean(dark_mask))  # raw proportion, no amplifier

        # ── Feature 4: Color variance / heterogeneity ─────────────────────────
        # Malignant lesions show heterogeneous colouring across all three channels.
        color_variance  = float(np.clip(
            (np.std(R) + np.std(G) + np.std(B)) / (3.0 * 80.0), 0.0, 1.0
        ))

        # ── Feature 5: Texture entropy ────────────────────────────────────────
        # Higher entropy at 512px → better capture of fine surface irregularities.
        gray            = luminance.astype(np.uint8)
        texture_entropy = float(np.clip(_safe_entropy(gray) / 6.0, 0.0, 1.0))

        # ── Mixed lesion flag (erythroleukoplakia — highest risk) ─────────────
        mixed_flag = 1.0 if (redness_score > 0.25 and white_patch_score > 0.05) else 0.0

        # ── Risk score composition ────────────────────────────────────────────
        # In clinical practice, risk is not an average. If you have severe erythroplakia
        # (redness), the risk is high even if there are no ulcers or white patches.
        # We use a max-signal approach for the primary indicators, then add modifiers.
        if modality == "histopathology":
            base_risk = max(
                color_variance    * 0.85,  # Histo: nuclear pleomorphism/heterogeneity
                texture_entropy   * 0.75,  # Histo: architectural disorder
                redness_score     * 0.50
            )
            risk_score = base_risk + (dark_region_score * 0.15) + (white_patch_score * 0.10)
        else:
            base_risk = max(
                redness_score     * 0.85,  # Erythroplakia is highest risk
                dark_region_score * 0.75,  # Ulceration is highly concerning
                white_patch_score * 0.55   # Leukoplakia is moderate risk
            )
            risk_score = base_risk + (color_variance * 0.15) + (texture_entropy * 0.10) + (mixed_flag * 0.20)

        risk_score = float(np.clip(risk_score, 0.0, 0.99))

        # ── Dominant finding label ────────────────────────────────────────────
        component_scores = {
            "Erythroplakia (red lesion)":  redness_score      * 0.40,
            "Leukoplakia (white patch)":   white_patch_score  * 0.25,
            "Ulceration (dark region)":    dark_region_score  * 0.15,
            "Heterogeneous coloring":      color_variance     * 0.10,
            "Irregular texture":           texture_entropy    * 0.10,
        }
        dominant = max(component_scores, key=component_scores.get)
        if mixed_flag:
            dominant = "Erythroleukoplakia (mixed lesion — high risk)"

        return {
            "risk_score": risk_score,
            "original_size": f"{orig_w}×{orig_h}",
            "features": {
                "redness_score":     round(redness_score,     3),
                "white_patch_score": round(white_patch_score, 3),
                "dark_region_score": round(dark_region_score, 3),
                "color_variance":    round(color_variance,    3),
                "texture_entropy":   round(texture_entropy,   3),
            },
            "dominant_finding": dominant,
        }

    except Exception as e:
        return {
            "risk_score": 0.45,
            "features": {},
            "dominant_finding": f"Analysis error: {e}",
        }
