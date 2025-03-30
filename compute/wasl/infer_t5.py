from transformers import T5Tokenizer, T5ForConditionalGeneration

# Load fine-tuned model
model = T5ForConditionalGeneration.from_pretrained("./t5-aslg/checkpoint-10964")
tokenizer = T5Tokenizer.from_pretrained("t5-small")

def translate_gloss(gloss):
    prompt = f"translate gloss to text: {gloss}"
    inputs = tokenizer(prompt, return_tensors="pt")
    outputs = model.generate(**inputs, max_length=64)
    return tokenizer.decode(outputs[0], skip_special_tokens=True)

if __name__ == "__main__":
  ###example###
  gl = "I TIRED, I GO GYM"
  gloss = gl.lower()
  print(translate_gloss(gloss))
