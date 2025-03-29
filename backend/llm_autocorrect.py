import os
from google import genai
from typing import List

class Message:
    r"""
    Consists of a user propmt with the model's generated answer which is 
    in chunks since we are getting an stream.
    """
    def __init__(self, user_prompt: str = None):
        self.user_prompt = user_prompt
        self.model_chunks = [] # chunks received from the model

    def __bool__(self):
        return self.user_prompt is not None

    def add_chunk(self, text: str):
        self.model_chunks.append(text)

    def get_model_output(self):
        ret = ""
        for chunk in self.model_chunks:
            ret += chunk
        return ret

class LLMAutocorrectWord:

    WARMUP_PROMPT = \
        "You are a helpful chatbot which will be helping automcompletion task." \
        + " You will be provided with an incomplete word ending with '...' and your task is" \
        + " to output the most likely completed word. Pay attention to the following examples:\n" \
        + "input: HEL... output: HELLO\n" \
        + "input: GOOD... output: GOODBYE\n" \
        + "input: NAM... output: NAME\n" \
        + "input: DANI... output: DANIEL\n" \
        + "In the following prompts I will send you the inputs and you will write send the outputs.\n" \
        + "PAY ATTENTION: your answer MUST be ONLY ONE word not more.\n" \
        

    def __init__(self, api: str, wamup_prompt: str = WARMUP_PROMPT):
        self.api = api
        self.client = genai.Client(api_key=api)
        self.chat = self.client.chats.create(model="gemini-2.0-flash")
        self.warmup(wamup_prompt)

    def warmup(self, warmup_prompt):
        # Get the stream
        try:
            for _ in self.chat.send_message_stream(warmup_prompt):
                pass
        except Exception as e:
            print(f'Raised an exception {e}')


    def complete(self, prompt: str):
        response = self.chat.send_message_stream(prompt + '...')
        res = ''
        for chunk in response:
            res += chunk.text
        return res
        # for chunk in response:
        #     print(chunk.text, end="")

    def get_history(self) -> List[Message]:
        res = []

        # message = Message()

        # for each in self.chat.get_history():
        #     if each.role == 'model':
        #         message.add_chunk(each.parts[0].text)
        #     elif each.role == 'user':
        #         print(f'! {each.parts[0].text} {message.user_prompt}')
        #         if message.user_prompt != None:
        #             res.append(message)
        #             message = Message()
        #         else:
        #             message.user_prompt = each.parts[0].text
        #     else:
        #         raise f"Undefined role in message history: {each.role}"

        # if message:
        #     print('!')
        #     res.append(message)
        
        return res

if __name__ == "__main__":



    # API = os.getenv('GEMINI_API')
    # client = genai.Client(api_key=API)
    # chat = client.chats.create(model="gemini-2.0-flash")

    # response = chat.send_message_stream("I have 2 dogs in my house.")
    # for chunk in response:
    #     print(chunk.text, end="")

    # response = chat.send_message_stream("How many paws are in my house?")
    # for chunk in response:
    #     print(chunk.text, end="")

    # for message in chat.get_history():
    #     print(f'role - {message.role}', end=": ")
    #     print(message.parts[0].text)


    API_KEY = os.getenv('GEMINI_API')
    llm = LLMAutocorrectWord(api = API_KEY)
    # print(llm.get_history()[0].get_model_output())

    print(llm.complete('COLLE'))
    print(llm.complete('SAVA'))
    print(llm.complete('GREA'))

    # for message in llm.get_history():
    #     print('-------')
    #     print('USER PROMPT: ' + message.user_prompt)
    #     print('MODEL OUTPUT: ' + message.get_model_output())
    

    for each in llm.chat.get_history():
        print(f'role - {each.role}', end=": ")
        print(each.parts[0].text)
    




    # API_KEY = os.getenv('GEMINI_API')
    # client = genai.Client(api_key=API_KEY)
    # chat = client.chats.create(model="gemini-2.0-flash")

    # while True:
    #     prompt = input("enter prompt: ")

    #     response = chat.send_message_stream(prompt)

    #     print(type(response))


    #     for chunk in response:
    #         print(chunk.text, end="")

    #     print("----- HISTORY -----")

    #     for message in chat.get_history():
    #         print(f'role - {message.role}', end=": ")
    #         print(message.parts[0].text)


    