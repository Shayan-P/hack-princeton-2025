import PIL.Image
import modal

import base64
import numpy as np
import PIL
import pickle
import numpy as np
from pydantic import BaseModel
from PIL import Image, ImageEnhance
from io import BytesIO


app = modal.App(name="HP")

poetry_image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install([
        "libgl1-mesa-glx",  # OpenCV dependency
        "libglib2.0-0"      # Additional dependency that might be needed
    ])
    .pip_install("poetry")
    .pip_install("opencv-python")
    .add_local_file("./pyproject.toml", "/pyproject.toml", copy=True)
    .run_commands(
        "cd / && POETRY_VIRTUALENVS_CREATE=false poetry install --only main --no-cache --no-interaction"
    )
)

@app.cls(image=poetry_image)
class SampleClass:
    def __init__(self):
        pass

    @modal.method()
    def hello(self):
        return "Hello, World!"

    @modal.method()
    def check_numpy(self):
        import numpy as np
        return np.array([1, 2, 3])


class SignLanguagePredictor:
    def __init__(self, model_addr: str):
        import mediapipe as mp

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
        import cv2

        r"""this method returns (pred, annotated_frame), pred is character, and
            annotated frame is the frame with a rectangle a nd 
        Arguments:
            frame: has shape (W, H, 3) where each entry is in [0, 255]. 
         """
        assert len(frame.shape) == 3 and frame.shape[2] == 3, "Daniel Says You Stink!"
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


@app.cls(image=poetry_image.add_local_file(
    "./model_with_ok.p", "/model_with_ok.p",
    copy=True
    ),
    gpu="A100",
    cpu=16,
    memory=8768,
    allow_concurrent_inputs=100
)
class CharacterClassifier:
    @modal.enter()
    def enter(self):
        self.predictor = SignLanguagePredictor(model_addr='/model_with_ok.p')


    def adjust_brightness(self, image, factor):
        r"""
        factor > 1 : making the image brighter
        factor < 1 : making the image darker
        """
        try:
            enhancer = ImageEnhance.Brightness(image)
            brightened_image = enhancer.enhance(factor)
            return brightened_image
        except Exception as e:
            print(f"An error occurred: {e}")

    def pil_to_jpeg(self, img: Image.Image):
        img_byte_arr = BytesIO()
        img = img.convert('RGB')
        img.save(img_byte_arr, format='JPEG')
        img_byte_arr.seek(0)
        image = Image.open(img_byte_arr)
        return image

    def pil_to_base64(self, img: Image.Image):
        img_byte_arr = BytesIO()
        img.save(img_byte_arr, format='JPEG')
        img_byte_arr = img_byte_arr.getvalue()
        base64_frame = base64.b64encode(img_byte_arr).decode('utf-8')
        return f"data:image/jpeg;base64,{base64_frame}"

    @modal.method()
    def classify_character(self, image: Image.Image):
        # image = Image.open(BytesIO(
        #             base64.b64decode(data.base64image))
        #             ).convert('RGB') # or maybe BGR
        
        image = image.convert('RGB')
        
        frame = np.array(image)

        character, newframe = self.predictor.predict(frame)

        # if newframe is not None:
        #     newframe = newframe.tolist()
        #     image = PIL.Image.fromarray(np.array(newframe).astype('uint8'))
            
        #     buffered = BytesIO()
        #     image.save(buffered, format="PNG")  # Specify the format, e.g., JPEG, PNG
        #     image_binary = buffered.getvalue()
            
        #     newframe = base64.b64encode(image_binary).decode('utf-8')


        # # Create a PIL Image from the bytes
        # img = Image.open(io.BytesIO(contents))
        # img = adjust_brightness(img, 0.7)
        # frame = np.array(img.convert('RGB'))
        
        # prediction, frame_with_prediction = predictor.predict(frame)

        # if (prediction is None) or (frame_with_prediction is None):
        #     return {"character": None, "frame": None}

        # base64_frame = pil_to_base64(PIL.Image.fromarray(frame_with_prediction))

        # print('predicted character', prediction)
        if character is not None:
            print(character)
        if newframe is None:
            return {"character": character, "frame": ''}
        else:
            return {"character": character, "frame": ''}


@app.local_entrypoint()
def main():
    sample_class = SampleClass()
    print(sample_class.hello.remote())

    print(sample_class.check_numpy.remote())

    char_classifier = CharacterClassifier()
    image = Image.open('../../shared/sample_image.png')
    image = char_classifier.pil_to_jpeg(image)
    print(char_classifier.classify_character.remote(image))
