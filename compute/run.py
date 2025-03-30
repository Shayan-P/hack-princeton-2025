import cv2
import os
import torch
import numpy as np
import torch.nn.functional as F
import mediapipe as mp

from transformers import T5Tokenizer, T5ForConditionalGeneration
from pytorch_i3d import InceptionI3d

# ======== CONFIG ========
T5_MODEL_PATH = r"C:\Users\seungjoobaek\Documents\hackprinceton\checkpoint-10964"  # Local path to saved model folder
I3D_WEIGHTS = './archived/asl2000/FINAL_nslt_2000_iters=5104_top1=32.48_top5=57.31_top10=66.31.pt'
CLASS_LIST = './preprocess/wlasl_class_list.txt'
NUM_CLASSES = 2000
BATCH = 40
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
THRESHOLD = 0.1

# ========== MediaPipe Setup ==========
mp_holistic = mp.solutions.holistic
mp_drawing = mp.solutions.drawing_utils

def mediapipe_detection(image, model):
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    image.flags.writeable = False
    results = model.process(image)
    image.flags.writeable = True
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    return image, results

def draw_styled_landmarks(image, results):
    mp_drawing.draw_landmarks(image, results.face_landmarks, mp_holistic.FACEMESH_TESSELATION,
        mp_drawing.DrawingSpec(color=(80,110,10), thickness=1, circle_radius=1),
        mp_drawing.DrawingSpec(color=(80,256,121), thickness=1, circle_radius=1))
    mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_holistic.POSE_CONNECTIONS,
        mp_drawing.DrawingSpec(color=(80,22,10), thickness=2, circle_radius=4),
        mp_drawing.DrawingSpec(color=(80,44,121), thickness=2, circle_radius=2))
    mp_drawing.draw_landmarks(image, results.left_hand_landmarks, mp_holistic.HAND_CONNECTIONS,
        mp_drawing.DrawingSpec(color=(121,22,76), thickness=2, circle_radius=4),
        mp_drawing.DrawingSpec(color=(121,44,250), thickness=2, circle_radius=2))
    mp_drawing.draw_landmarks(image, results.right_hand_landmarks, mp_holistic.HAND_CONNECTIONS,
        mp_drawing.DrawingSpec(color=(245,117,66), thickness=2, circle_radius=4),
        mp_drawing.DrawingSpec(color=(245,66,230), thickness=2, circle_radius=2))

# ========== Gloss Dictionary ==========
def create_WLASL_dictionary():
    global wlasl_dict
    wlasl_dict = {}
    with open(CLASS_LIST) as file:
        for line in file:
            split = line.strip().split()
            key = int(split[0])
            value = ' '.join(split[1:])
            wlasl_dict[key] = value

# ========== Model Loading ==========
def load_model(weights, num_classes):
    global i3d
    i3d = InceptionI3d(400, in_channels=3)
    i3d.replace_logits(num_classes)
    i3d.load_state_dict(torch.load(weights, map_location=torch.device(DEVICE)))
    i3d = i3d.to(DEVICE).eval()

    global tokenizer, t5_model
    tokenizer = T5Tokenizer.from_pretrained(T5_MODEL_PATH, local_files_only=True)
    t5_model = T5ForConditionalGeneration.from_pretrained(T5_MODEL_PATH, local_files_only=True).to(DEVICE).eval()

# ========== I3D Inference ==========
def run_on_tensor(ip_tensor):
    ip_tensor = ip_tensor[None, :].to(DEVICE)
    t = ip_tensor.shape[2]
    logits = i3d(ip_tensor)
    preds = F.interpolate(logits, t, mode='linear').transpose(2, 1)
    arr = preds.detach().cpu().numpy()[0]
    out_labels = np.argsort(arr)
    probs = F.softmax(torch.from_numpy(arr[0]), dim=0)
    conf = float(torch.max(probs))
    pred_gloss = wlasl_dict[out_labels[0][-1]]
    return pred_gloss if conf > THRESHOLD else ""

# ========== T5 Decoding ==========
def gloss_to_sentence(gloss_list):
    gloss_str = " ".join(gloss_list).lower()
    prompt = f"translate gloss to text: {gloss_str}"
    input_ids = tokenizer(prompt, return_tensors="pt").input_ids.to(DEVICE)
    output_ids = t5_model.generate(input_ids, max_length=64)
    return tokenizer.decode(output_ids[0], skip_special_tokens=True)

# ========== Webcam Inference ==========
def run_webcam_inference():
    cap = cv2.VideoCapture(0)
    frames, text_list = [], []
    offset, text_count = 0, 0
    sentence = ""
    show_mediapipe = True

    with mp_holistic.Holistic(min_detection_confidence=0.5, min_tracking_confidence=0.5) as holistic:
        while cap.isOpened():
            ret, frame1 = cap.read()
            if not ret: break

            offset += 1
            h, w = frame1.shape[:2]
            if h != w:
                size = max(h, w)
                square = np.zeros((size, size, 3), dtype=np.uint8)
                square[:h, :w] = frame1
                frame1 = cv2.resize(square, (1280, 1280))
            else:
                frame1 = cv2.resize(frame1, (1280, 1280))

            image, results = mediapipe_detection(frame1.copy(), holistic)
            if show_mediapipe:
                draw_styled_landmarks(image, results)

            frame = cv2.resize(image.copy(), (224, 224))
            frame = (frame / 255.) * 2 - 1

            if offset > BATCH:
                frames.pop(0)
            frames.append(frame)

            if offset >= BATCH and offset % 20 == 0:
                ip_tensor = torch.from_numpy(np.asarray(frames, dtype=np.float32).transpose([3, 0, 1, 2]))
                text = run_on_tensor(ip_tensor)
                if text != "":
                    text_count += 1
                    if not text_list or text_list[-1] != text:
                        text_list.append(text)
                    if text_count > 2:
                        sentence = gloss_to_sentence(text_list)

            frame_disp = image.copy()
            cv2.putText(frame_disp, sentence, (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 0), 3)
            cv2.imshow("Webcam ASL Translation", frame_disp)

            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('n'):
                sentence = ""
                text_list = []
                text_count = 0
            elif key == ord('m'):
                show_mediapipe = not show_mediapipe

    cap.release()
    cv2.destroyAllWindows()
    print("\n🎯 Final output:", sentence)

# ========== Main ==========
if __name__ == "__main__":
    create_WLASL_dictionary()
    load_model(I3D_WEIGHTS, NUM_CLASSES)
    run_webcam_inference()