from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import os
import random
from datetime import datetime
import aiofiles
import base64
from fastapi import UploadFile, File
from PIL import Image
from io import BytesIO
from sign_langauge_predictor import SignLanguagePredictor
import io
import cv2
import numpy as np
import PIL

app = FastAPI()


predictor = SignLanguagePredictor('./model_with_ok.p') # hardcoded for now


def pil_to_base64(img: Image.Image):
    img_byte_arr = BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_byte_arr = img_byte_arr.getvalue()
    base64_frame = base64.b64encode(img_byte_arr).decode('utf-8')
    return f"data:image/jpeg;base64,{base64_frame}"


@app.post("/classify")
async def classify_character(image: UploadFile = File(...)):
    # Read the contents of the uploaded file
    contents = await image.read()
    
    # Create a PIL Image from the bytes
    img = Image.open(io.BytesIO(contents))
    
    frame = np.array(img.convert('RGB'))
    prediction, frame_with_prediction = predictor.predict(frame)

    if (prediction is None) or (frame_with_prediction is None):
        return {"character": None, "frame": None}

    base64_frame = pil_to_base64(PIL.Image.fromarray(frame_with_prediction))

    print('predicted character', prediction)
    return {"character": prediction, "frame": base64_frame}


@app.get("/")
async def root():
    return {"message": "Video streaming server is running"}
