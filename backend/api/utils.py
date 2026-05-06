"""import torch
import torch.nn as nn
from ultralytics import YOLO
from torchvision import transforms, models
from PIL import Image
import cv2

# تحديد الجهاز المستخدم (GPU أو CPU)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# --- دالة تحميل موديل التصنيف ResNet18 بشكل صحيح ---
def load_resnet_classifier(model_path):
    # 1. إنشاء هيكل ResNet18 الخام
    model = models.resnet18()
    
    # 2. تعديل الطبقة الأخيرة لتطابق عدد الكلاسات (2: Normal & Lesion)
    num_ftrs = model.fc.in_features
    model.fc = nn.Linear(num_ftrs, 2) 
    
    # 3. تحميل الأوزان (OrderedDict) من الملف
    state_dict = torch.load(model_path, map_location=device)
    
    # 4. حقن الأوزان داخل الهيكل
    model.load_state_dict(state_dict)
    
    model.to(device)
    model.eval()  # الآن ستعمل eval() لأن الموديل أصبح كائناً من ResNet وليس قاموساً
    return model

# تحميل الموديلات عند تشغيل السيرفر
yolo_model = YOLO('models_files/best_Detection.pt')
classifier = load_resnet_classifier('models_files/resnet18_lesion_classifier.pth')

# تجهيز الصور (Preprocessing)
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

def run_lesion_pipeline(image_path):
    results_list = []
    
    # أ. اكتشاف الأسنان باستخدام YOLO
    yolo_results = yolo_model(image_path)[0]
    original_img = Image.open(image_path).convert('RGB')
    
    for box in yolo_results.boxes:
        coords = box.xyxy[0].tolist()
        x1, y1, x2, y2 = coords
        
        # ب. قص صورة السن
        tooth_crop = original_img.crop((x1, y1, x2, y2))
        
        # ج. التصنيف باستخدام ResNet
        input_tensor = transform(tooth_crop).unsqueeze(0).to(device)
        with torch.no_grad():
            output = classifier(input_tensor)
            prediction = torch.argmax(output, dim=1).item()
            prob = torch.nn.functional.softmax(output, dim=1)[0][prediction].item()

        # د. بناء النتيجة
        label = "LESION" if prediction == 0 else "NORMAL"
        results_list.append({
            "box": [x1, y1, x2 - x1, y2 - y1],
            "label": label,
            "confidence": round(prob, 2),
            "color": "red" if label == "LESION" else "green"
        })
        
    return results_list

    """

import torch
import torch.nn as nn
from ultralytics import YOLO
from torchvision import transforms, models
from PIL import Image
import os

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def load_resnet_classifier(model_path):
    model = models.resnet18()
    num_ftrs = model.fc.in_features
    model.fc = nn.Linear(num_ftrs, 2) 
    if os.path.exists(model_path):
        state_dict = torch.load(model_path, map_location=device)
        model.load_state_dict(state_dict)
    model.to(device)
    model.eval()
    return model

# تحميل الموديلات
yolo_model = YOLO('models/best_Detection.pt')
classifier = load_resnet_classifier('models/est_resnet18_fp.pth')

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

def run_lesion_pipeline(image_path):
    results_list = []
    
    # التأكد من وجود الملف
    if not os.path.exists(image_path):
        return []

    # 1. تشغيل YOLO
    yolo_results = yolo_model(image_path)[0]
    original_img = Image.open(image_path).convert('RGB')
    img_w, img_h = original_img.size

    for box in yolo_results.boxes:
        # استخراج الإحداثيات والتأكد من أنها أرقام صحيحة للقص
        coords = box.xyxy[0].tolist()
        x1, y1, x2, y2 = coords
        
        # 2. قص صورة السن
        tooth_crop = original_img.crop((x1, y1, x2, y2))
        
        # 3. تحويل الصورة لـ Tensor وتجهيزها للـ Classifier
        input_tensor = transform(tooth_crop).unsqueeze(0).to(device)
        
        with torch.no_grad():
            output = classifier(input_tensor)
            # التأكد من أخذ القيم بشكل صحيح
            prob_dist = torch.nn.functional.softmax(output, dim=1)
            prediction = torch.argmax(prob_dist, dim=1).item()
            prob = prob_dist[0][prediction].item()

        # 4. حساب النسب المئوية %
        label = "LESION" if prediction == 1 else "NORMAL"
        results_list.append({
            "box": [
                (x1 / img_w) * 100,
                (y1 / img_h) * 100,
                ((x2 - x1) / img_w) * 100,
                ((y2 - y1) / img_h) * 100
            ],
            "label": label,
            "confidence": float(round(prob, 2)), # تحويل لـ float عادي لـ JSON
            "color": "#ef4444" if label == "LESION" else "#22c55e"
        })
        
    return results_list
#Joud test 

def validate_patient_id(patient_id):
    return patient_id is not None and patient_id != ""


def validate_image(image):
    return image is not None