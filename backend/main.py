from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import os
from datetime import datetime
import aiofiles
import base64
import json
from io import BytesIO
from PIL import Image
import requests

from llm_autocorrect import LLMAutocorrectWord

SUBTITLE_MAX_LENGTH = 30
CLASSIFY_BUFFER_LENGTH = 10
API_KEY = os.getenv('GEMINI_API')
llm = LLMAutocorrectWord(api = API_KEY)

app = FastAPI()

def pil_to_base64(img: Image.Image):
    img_byte_arr = BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_byte_arr = img_byte_arr.getvalue()
    base64_frame = base64.b64encode(img_byte_arr).decode('utf-8')
    return f"data:image/jpeg;base64,{base64_frame}"


def classify_character(image):
    # image is a PIL.Image object
    COMPUTE_URL = "http://localhost:4000"
    # Convert PIL Image to bytes for sending
    img_byte_arr = BytesIO()
    image.save(img_byte_arr, format='JPEG')
    img_byte_arr = img_byte_arr.getvalue()
    
    response = requests.post(f"{COMPUTE_URL}/classify", files={"image": img_byte_arr})
    if response.status_code != 200:
        print(f"Error from compute service: Status {response.status_code}")
        return None
    try:
        return response.json()
    except (KeyError, ValueError) as e:
        print(f"Error parsing response from compute service: {e}")
        return None


# Create a directory to store received frames
UPLOAD_DIR = "received_frames"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # Create a session directory for this connection
    session_dir = os.path.join(UPLOAD_DIR, datetime.now().strftime("%Y%m%d_%H%M%S"))
    os.makedirs(session_dir, exist_ok=True)
    
    frame_count = 0
    subtitle = ""
    last_frame_data = None
    try:
        subtitle_buffer_counter = 0
        last_classified_charachter = None
        while True:
            # Receive the binary frame data directly
            frame_data = await websocket.receive_bytes()
            
            # Convert binary data to PIL Image
            image = Image.open(BytesIO(frame_data))
            
            frame_count += 1
            
            classifier_response = classify_character(image)
            character = classifier_response['character']
            predicted_word = ''

            if character:
                print(character)
                # If we are getting CLASSIFY_BUFFER_LENGTH consecutive same character,
                # then we are adding it to the subtitle
                if character == last_classified_charachter:
                    subtitle_buffer_counter += 1
                else: # The character has changed
                    subtitle_buffer_counter = 0
                    last_classified_charachter = character
                if subtitle_buffer_counter == CLASSIFY_BUFFER_LENGTH:
                    subtitle += character
                    predicted_word = llm.complete(subtitle.split(' ')[-1])
                    subtitle_buffer_counter = 0

            if classifier_response['frame']:
                last_frame_data = classifier_response['frame']
            else:
                last_frame_data = pil_to_base64(image)

            await websocket.send_json({
                "frame_number": frame_count,
                "frame_data": last_frame_data,
                "subtitle": subtitle,
                "predicted": predicted_word
            })
            # print(f"Sent frame {frame_count}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await websocket.close()

@app.get("/")
async def root():
    return {"message": "Video streaming server is running"}
