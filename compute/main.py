from fastapi import FastAPI, WebSocket, Form
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
from PIL import ImageEnhance, Image
from pydantic import BaseModel

app = FastAPI()

class DataModel(BaseModel):
    base64image: str

predictor = SignLanguagePredictor('./model_with_ok.p') # hardcoded for now

def adjust_brightness(image, factor):
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


def pil_to_base64(img: Image.Image):
    img_byte_arr = BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_byte_arr = img_byte_arr.getvalue()
    base64_frame = base64.b64encode(img_byte_arr).decode('utf-8')
    return f"data:image/jpeg;base64,{base64_frame}"


@app.post("/classify")
async def classify_character(data: DataModel):
    # Read the contents of the uploaded file
    # contents = await image.read()

    # print(data.base64image[:100])

    image = Image.open(BytesIO(
                base64.b64decode(data.base64image))
                ).convert('RGB') # or maybe BGR
    
    frame = np.array(image)
    
    # print(frame)
    
    # print(frame.shape)

    character, newframe = predictor.predict(frame)



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


@app.get("/")
async def root():
    return {"message": "Video streaming server is running"}
