import pickle
import numpy as np
import cv2
import mediapipe as mp

class SignLanguagePredictor:
    def __init__(self, model_addr: str):
        r"""
        Arguments:
            model_addr: if relative it should start with '.'
        """
        model_dict = pickle.load(open(model_addr, 'rb'))
        self.model = model_dict['model']
        
        self.mp_hands = mp.solutions.hands
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles

        self.hands = self.mp_hands.Hands(static_image_mode=True, min_detection_confidence=0.3)


    def predict(self, frame: np.ndarray):
        r"""this method returns (pred, annotated_frame), pred is character, and
            annotated frame is the frame with a rectangle a nd 
        Arguments:
            frame: has shape (W, H, 3) where each entry is in [0, 255]. 
         """
        assert(len(frame.shape) == 3 and frame.shape[2] == 3, "Daniel Says You Stink!")
        model = self.model
        
        hands = self.hands
        data_aux = []
        x_ = []
        y_ = []


        H, W, _ = frame.shape

        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        results = hands.process(frame_rgb)
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                self.mp_drawing.draw_landmarks(
                    frame,  # image to draw
                    hand_landmarks,  # model output
                    self.mp_hands.HAND_CONNECTIONS,  # hand connections
                    self.mp_drawing_styles.get_default_hand_landmarks_style(),
                    self.mp_drawing_styles.get_default_hand_connections_style())

            for hand_landmarks in results.multi_hand_landmarks:
                for i in range(len(hand_landmarks.landmark)):
                    x = hand_landmarks.landmark[i].x
                    y = hand_landmarks.landmark[i].y

                    x_.append(x)
                    y_.append(y)

                for i in range(len(hand_landmarks.landmark)):
                    x = hand_landmarks.landmark[i].x
                    y = hand_landmarks.landmark[i].y
                    data_aux.append(x - min(x_))
                    data_aux.append(y - min(y_))

            x1 = int(min(x_) * W) - 10
            y1 = int(min(y_) * H) - 10

            x2 = int(max(x_) * W) - 10
            y2 = int(max(y_) * H) - 10

            if len(np.asarray(data_aux)) == 42:
                prediction = model.predict([np.asarray(data_aux)])

                predicted_character = prediction[0]

                new_frame = frame.copy()
                cv2.rectangle(new_frame, (x1, y1), (x2, y2), (0, 0, 0), 4)
                cv2.putText(new_frame, predicted_character, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 1.3, (0, 0, 0), 3,
                           cv2.LINE_AA)
                
                return predicted_character, new_frame
            
        return None, None