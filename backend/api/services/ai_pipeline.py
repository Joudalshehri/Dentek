import os

import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms
from ultralytics import YOLO
from django.conf import settings


# =========================================
# SETTINGS
# =========================================

PAD_X_RATIO = 0.05
PAD_TOP_RATIO = 0.08
PAD_BOTTOM_RATIO = 0.28

MIN_PAD_X = 2
MIN_PAD_TOP = 2
MIN_PAD_BOTTOM = 6

MIN_CROP_W = 10
MIN_CROP_H = 10

CONF_THRESHOLD = 0.25
IOU_THRESHOLD = 0.45
IMG_SIZE = 1280

DEDUP_IOU_THRESHOLD = 0.5
IMPACT_CONF_THRESHOLD = 0.70

NUM_CLASSES = 2
IMAGE_SIZE = 224

DEFAULT_IDX_TO_CLASS = {
    0: "lesion",
    1: "normal"
}

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


# =========================================
# MODEL PATHS
# =========================================

TEETH_YOLO_MODEL_PATH = os.path.join(
    settings.BASE_DIR,
    "models",
    "best_Detection.pt"
)

IMPACT_MODEL_PATH = os.path.join(
    settings.BASE_DIR,
    "models",
    "Yolov8obb(impacted).pt"
)

RESNET_MODEL_PATH = os.path.join(
    settings.BASE_DIR,
    "models",
    "best_resnet18_fp.pth"
)


# =========================================
# VALIDATION HELPERS
# =========================================

def validate_file_exists(file_path, error_message):
    # Make sure required file exists
    if not os.path.exists(file_path):
        raise FileNotFoundError(error_message)


def resolve_image_path(image_path):
    # Validate image path
    if not image_path:
        raise ValueError("Image path is required")

    # Return absolute path directly
    if os.path.isabs(image_path):
        return image_path

    # Convert relative path to absolute path
    return os.path.join(settings.BASE_DIR, image_path)


# =========================================
# LOAD MODELS
# =========================================

validate_file_exists(
    TEETH_YOLO_MODEL_PATH,
    f"Teeth detection model not found: {TEETH_YOLO_MODEL_PATH}"
)

validate_file_exists(
    IMPACT_MODEL_PATH,
    f"Impacted teeth model not found: {IMPACT_MODEL_PATH}"
)

validate_file_exists(
    RESNET_MODEL_PATH,
    f"ResNet model not found: {RESNET_MODEL_PATH}"
)

teeth_yolo_model = YOLO(TEETH_YOLO_MODEL_PATH)
impact_model = YOLO(IMPACT_MODEL_PATH)


# =========================================
# LOAD RESNET CLASSIFIER
# =========================================

def load_resnet_classifier(model_path):
    # Create ResNet18 model
    model = models.resnet18(weights=None)

    # Replace final layer to match our number of classes
    model.fc = nn.Linear(model.fc.in_features, NUM_CLASSES)

    # Load checkpoint
    checkpoint = torch.load(
        model_path,
        map_location=device,
        weights_only=False
    )

    idx_to_class = DEFAULT_IDX_TO_CLASS.copy()

    # Handle checkpoint saved as dictionary
    if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
        state_dict = checkpoint["model_state_dict"]

        # Load class mapping if available
        if "class_to_idx" in checkpoint and isinstance(checkpoint["class_to_idx"], dict):
            class_to_idx = checkpoint["class_to_idx"]
            idx_to_class = {v: k for k, v in class_to_idx.items()}
        else:
            print("[WARN] class_to_idx not found. Using default mapping.")

    # Handle raw state_dict
    else:
        state_dict = checkpoint
        print("[WARN] Raw state_dict loaded. Using default mapping.")

    model.load_state_dict(state_dict)
    model = model.to(device)
    model.eval()

    return model, idx_to_class


resnet_model, idx_to_class = load_resnet_classifier(RESNET_MODEL_PATH)


# =========================================
# PREPROCESSING
# =========================================

resnet_transform = transforms.Compose([
    transforms.Grayscale(num_output_channels=3),
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(
        [0.485, 0.456, 0.406],
        [0.229, 0.224, 0.225]
    )
])


# =========================================
# HELPER FUNCTIONS
# =========================================

def clamp_box(x1, y1, x2, y2, img_w, img_h):
    # Keep box coordinates inside image boundaries
    x1 = max(0, int(x1))
    y1 = max(0, int(y1))
    x2 = min(img_w, int(x2))
    y2 = min(img_h, int(y2))

    return x1, y1, x2, y2


def compute_iou(box1, box2):
    # Calculate intersection box
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    inter_w = max(0, x2 - x1)
    inter_h = max(0, y2 - y1)
    inter_area = inter_w * inter_h

    # Calculate each box area
    area1 = max(0, box1[2] - box1[0]) * max(0, box1[3] - box1[1])
    area2 = max(0, box2[2] - box2[0]) * max(0, box2[3] - box2[1])

    union = area1 + area2 - inter_area

    if union == 0:
        return 0.0

    return inter_area / union


def deduplicate_predictions(rows, iou_threshold=DEDUP_IOU_THRESHOLD):
    # Sort predictions by confidence
    boxes = []

    for row in rows:
        boxes.append((
            row,
            row["raw_bbox"],
            float(row["pred_confidence"])
        ))

    boxes.sort(key=lambda x: x[2], reverse=True)

    kept = []

    # Keep only predictions that do not overlap too much
    for row, box, conf in boxes:
        keep = True

        for kept_row, kept_box, kept_conf in kept:
            iou = compute_iou(box, kept_box)

            if iou > iou_threshold:
                keep = False
                break

        if keep:
            kept.append((row, box, conf))

    return [item[0] for item in kept]


# =========================================
# TEETH DETECTION
# =========================================

def detect_teeth(image_path):
    image_full_path = resolve_image_path(image_path)

    # Validate image file
    validate_file_exists(
        image_full_path,
        f"Image not found: {image_full_path}"
    )

    # Run YOLO detection
    results = teeth_yolo_model.predict(
        source=image_full_path,
        conf=CONF_THRESHOLD,
        iou=IOU_THRESHOLD,
        imgsz=IMG_SIZE,
        verbose=False
    )

    detections = []

    for result in results:
        boxes = result.boxes

        if boxes is None:
            continue

        for box in boxes:
            coords = box.xyxy[0].tolist()
            conf = float(box.conf[0])

            detections.append({
                "bbox": coords,
                "confidence": conf
            })

    return detections


# =========================================
# CROP TEETH
# =========================================

def crop_teeth(image_path, detections, output_folder="media/crops"):
    image_full_path = resolve_image_path(image_path)

    # Validate image file
    validate_file_exists(
        image_full_path,
        f"Image not found: {image_full_path}"
    )

    # If no detections, return empty list
    if not detections:
        return []

    full_output_folder = os.path.join(settings.BASE_DIR, output_folder)
    os.makedirs(full_output_folder, exist_ok=True)

    image = Image.open(image_full_path).convert("RGB")
    img_w, img_h = image.size

    cropped_teeth = []

    for i, detection in enumerate(detections):
        x1_raw, y1_raw, x2_raw, y2_raw = detection["bbox"]

        tooth_w = x2_raw - x1_raw
        tooth_h = y2_raw - y1_raw

        # Skip invalid boxes
        if tooth_w <= 0 or tooth_h <= 0:
            continue

        # Add padding around detected tooth
        pad_x = max(MIN_PAD_X, int(round(tooth_w * PAD_X_RATIO)))
        pad_top = max(MIN_PAD_TOP, int(round(tooth_h * PAD_TOP_RATIO)))
        pad_bottom = max(MIN_PAD_BOTTOM, int(round(tooth_h * PAD_BOTTOM_RATIO)))

        c_x1 = x1_raw - pad_x
        c_y1 = y1_raw - pad_top
        c_x2 = x2_raw + pad_x
        c_y2 = y2_raw + pad_bottom

        c_x1, c_y1, c_x2, c_y2 = clamp_box(
            c_x1,
            c_y1,
            c_x2,
            c_y2,
            img_w,
            img_h
        )

        # Skip very small crops
        if (c_x2 - c_x1) < MIN_CROP_W or (c_y2 - c_y1) < MIN_CROP_H:
            continue

        cropped = image.crop((c_x1, c_y1, c_x2, c_y2))

        crop_filename = f"tooth_{i:02d}.jpg"
        crop_path = os.path.join(full_output_folder, crop_filename)

        cropped.save(crop_path)

        cropped_teeth.append({
            "tooth_index": i,
            "raw_bbox": [int(x1_raw), int(y1_raw), int(x2_raw), int(y2_raw)],
            "crop_bbox": [int(c_x1), int(c_y1), int(c_x2), int(c_y2)],
            "detection_confidence": detection["confidence"],
            "crop_path": crop_path,
            "crop_relative_path": os.path.join(
                output_folder,
                crop_filename
            ).replace("\\", "/")
        })

    return cropped_teeth


# =========================================
# CLASSIFY TOOTH
# =========================================

def classify_tooth(crop_path):
    crop_full_path = resolve_image_path(crop_path)

    # Validate crop file
    validate_file_exists(
        crop_full_path,
        f"Crop image not found: {crop_full_path}"
    )

    image = Image.open(crop_full_path).convert("L")
    image_tensor = resnet_transform(image).unsqueeze(0).to(device)

    # Run classifier without gradient calculation
    with torch.no_grad():
        logits = resnet_model(image_tensor)
        probs = torch.softmax(logits, dim=1)
        conf, pred_idx = torch.max(probs, dim=1)

    pred_idx = pred_idx.item()
    pred_confidence = float(conf.item())
    pred_label = idx_to_class.get(pred_idx, f"unknown_{pred_idx}")

    lesion_idx = None
    normal_idx = None

    # Find class indexes
    for idx, class_name in idx_to_class.items():
        name = str(class_name).lower()

        if name == "lesion":
            lesion_idx = idx
        elif name == "normal":
            normal_idx = idx

    # Fallback indexes
    if lesion_idx is None:
        lesion_idx = 0

    if normal_idx is None:
        normal_idx = 1

    lesion_confidence = float(probs[0][lesion_idx].item())
    normal_confidence = float(probs[0][normal_idx].item())

    return {
        "pred_class_idx": pred_idx,
        "pred_label": pred_label,
        "pred_confidence": pred_confidence,
        "lesion_confidence": lesion_confidence,
        "normal_confidence": normal_confidence,
    }


# =========================================
# ANALYZE LESIONS
# =========================================

def analyze_lesions(image_path):
    # Detect teeth first
    detections = detect_teeth(image_path)

    # Crop detected teeth
    cropped_teeth = crop_teeth(image_path, detections)

    raw_results = []

    # Classify each cropped tooth
    for tooth in cropped_teeth:
        classification = classify_tooth(tooth["crop_relative_path"])

        raw_results.append({
            "tooth_index": tooth["tooth_index"],
            "raw_bbox": tooth["raw_bbox"],
            "bbox": tooth["raw_bbox"],
            "crop_bbox": tooth["crop_bbox"],
            "detection_confidence": tooth["detection_confidence"],
            "crop_relative_path": tooth["crop_relative_path"],
            "classification": classification,
            "pred_class_idx": classification["pred_class_idx"],
            "pred_label": classification["pred_label"],
            "pred_confidence": classification["pred_confidence"],
            "lesion_confidence": classification["lesion_confidence"],
            "normal_confidence": classification["normal_confidence"],
        })

    # Remove duplicate predictions
    dedup_results = deduplicate_predictions(
        raw_results,
        iou_threshold=DEDUP_IOU_THRESHOLD
    )

    return dedup_results


# =========================================
# DETECT IMPACTED TEETH
# =========================================

def detect_impacted_teeth(image_path):
    image_full_path = resolve_image_path(image_path)

    # Validate image file
    validate_file_exists(
        image_full_path,
        f"Image not found: {image_full_path}"
    )

    results = impact_model(image_full_path, verbose=False)

    impacted_detections = []

    # Use teeth detection to define allowed region
    teeth_detections = detect_teeth(image_path)

    if teeth_detections:
        min_x = min(d["bbox"][0] for d in teeth_detections)
        min_y = min(d["bbox"][1] for d in teeth_detections)
        max_x = max(d["bbox"][2] for d in teeth_detections)
        max_y = max(d["bbox"][3] for d in teeth_detections)

        margin_x = (max_x - min_x) * 0.08
        margin_y = (max_y - min_y) * 0.15

        allowed_min_x = min_x - margin_x
        allowed_max_x = max_x + margin_x
        allowed_min_y = min_y - margin_y
        allowed_max_y = max_y + margin_y

    else:
        image = Image.open(image_full_path)
        img_width, img_height = image.size

        allowed_min_x = img_width * 0.10
        allowed_max_x = img_width * 0.90
        allowed_min_y = img_height * 0.15
        allowed_max_y = img_height * 0.80

    for result in results:
        obb = getattr(result, "obb", None)

        if obb is None:
            continue

        xyxyxyxy = getattr(obb, "xyxyxyxy", None)
        confs = getattr(obb, "conf", None)
        classes = getattr(obb, "cls", None)

        if xyxyxyxy is None or confs is None:
            continue

        for i in range(len(confs)):
            polygon = xyxyxyxy[i].tolist()
            conf = float(confs[i])

            # Skip low-confidence detections
            if conf < IMPACT_CONF_THRESHOLD:
                continue

            center_x = sum(point[0] for point in polygon) / len(polygon)
            center_y = sum(point[1] for point in polygon) / len(polygon)

            # Skip detections outside allowed region
            if not (allowed_min_x <= center_x <= allowed_max_x):
                continue

            if not (allowed_min_y <= center_y <= allowed_max_y):
                continue

            class_id = int(classes[i]) if classes is not None else 0
            class_name = impact_model.names.get(class_id, "impacted")

            impacted_detections.append({
                "label": class_name,
                "confidence": conf,
                "polygon": polygon,
                "center_x": center_x,
                "center_y": center_y,
            })

    return impacted_detections


# =========================================
# GENERATE FINAL REPORT
# =========================================

def get_value(tooth, key):
    # Get value from main dictionary first,
    # then fallback to classification dictionary
    if tooth.get(key) is not None:
        return tooth.get(key)

    return tooth.get("classification", {}).get(key)


def generate_report(lesion_results, impacted_results):
    lesion_teeth = []
    normal_teeth = []

    for tooth in lesion_results:
        pred_label = get_value(tooth, "pred_label") or "unknown"
        pred_confidence = get_value(tooth, "pred_confidence")
        lesion_conf = get_value(tooth, "lesion_confidence")
        normal_conf = get_value(tooth, "normal_confidence")
        pred_class_idx = get_value(tooth, "pred_class_idx")

        tooth_entry = {
            "tooth_index": tooth["tooth_index"],
            "bbox": tooth["bbox"],
            "pred_class_idx": pred_class_idx,
            "pred_label": pred_label,
            "confidence": pred_confidence,
            "lesion_confidence": lesion_conf,
            "normal_confidence": normal_conf,
        }

        if pred_label == "lesion":
            lesion_teeth.append(tooth_entry)
        else:
            normal_teeth.append(tooth_entry)

    total_lesions = len(lesion_teeth)
    total_impacted = len(impacted_results)

    # Build report summary
    if len(lesion_results) == 0 and total_impacted == 0:
        summary = "No teeth were detected in the image."
        overall_label = "normal"

    elif total_impacted > 0 and total_lesions > 0:
        summary = (
            f"{total_impacted} impacted tooth/teeth detected and "
            f"{total_lesions} teeth show signs of periapical lesion."
        )
        overall_label = "impacted + periapical lesion"

    elif total_impacted > 0:
        summary = f"{total_impacted} impacted tooth/teeth detected."
        overall_label = "impacted"

    elif total_lesions > 0:
        if total_lesions == 1:
            summary = "1 tooth shows signs of periapical lesion."
        else:
            summary = f"{total_lesions} teeth show signs of periapical lesion."

        overall_label = "periapical lesion"

    else:
        summary = "No periapical lesion detected. All detected teeth appear normal."
        overall_label = "normal"

    return {
        "overall_label": overall_label,
        "total_teeth": len(lesion_results),
        "total_lesions": total_lesions,
        "total_impacted": total_impacted,
        "lesion_teeth": [item["tooth_index"] for item in lesion_teeth],
        "summary": summary,
        "lesion_findings": lesion_teeth,
        "normal_teeth_count": len(normal_teeth),
        "normal_findings": normal_teeth,
        "impacted_findings": impacted_results,
    }


# =========================================
# FULL ANALYSIS
# =========================================

def run_full_analysis(image_path):
    # Run the complete AI pipeline
    try:
        lesion_findings = analyze_lesions(image_path)
        impacted_findings = detect_impacted_teeth(image_path)

        report = generate_report(
            lesion_findings,
            impacted_findings
        )

        return {
            "report": report,
            "findings": lesion_findings,
            "impacted_findings": impacted_findings,
            "lesion_findings": lesion_findings,
        }

    except Exception as error:
        # Return error instead of crashing the server
        return {
            "error": str(error)
        }