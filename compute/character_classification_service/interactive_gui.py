import pickle

import cv2
import mediapipe as mp
import numpy as np

from sign_langauge_predictor import SignLanguagePredictor


predictor = SignLanguagePredictor('./model.p')

cap = cv2.VideoCapture(0)

FPS = 30
DELAY_FRAMES = 20

# mp_hands = mp.solutions.hands
# mp_drawing = mp.solutions.drawing_utils
# mp_drawing_styles = mp.solutions.drawing_styles

# hands = mp_hands.Hands(static_image_mode=True, min_detection_confidence=0.3)

since_pred_changed = 0
last_pred = None

# labels_dict = {}
while True:

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

    # data_aux = []
    # x_ = []
    # y_ = []

    ret, frame = cap.read()

    H, W, _ = frame.shape

    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    prediction, nframe = predictor.predict(frame_rgb)
    if prediction:
        if prediction == last_pred:
            since_pred_changed += 1
        else:
            since_pred_changed = 0
            last_pred = prediction
        if since_pred_changed == DELAY_FRAMES:
            print(last_pred)
    if nframe is not None:
        frame = cv2.cvtColor(nframe, cv2.COLOR_RGB2BGR)
    
    cv2.imshow('frame', frame)
    cv2.waitKey(1)


cap.release()
cv2.destroyAllWindows()
