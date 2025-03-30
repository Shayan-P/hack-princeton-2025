# hack-princeton-2025

## Install and Run

There are two major problems regarding sign language. First is that many people don't know it and the second thing is that learning it is not as easy as other languages since the leanring sources are not that rich. `Talkless` is a webapp and mobile app created to address these two issues. It can do many things:

Firstly, it could be used as a translator for tranlsating the ASL sign language to text.

Secondly, it could be used similar to the popular voice-to-text models for typing faster. Once you start the webapp a chat session with Gemini will be launched and each tranlsated word is going to be sent to Gemini, and later, for autocompletion and word suggestion. The advantange that this method holds compared to the classical string processing algorithms is that the LLM will attend to the contex and previous translated words and thus the suggestion are highly relevant and accurate.

Finaly, for those who are eager to learn more about sign language, we have implemented a quiz/game mode in which the app shows letters one by one from the English alphabet and then the user will need to show the sign moves.

- Install Poetry (Python package manager)
- Install nvm (Node Version Manager)
- Install pnpm (Fast Node package manager)

- Install dependencies
```bash
cd frontend
pnpm install
npx run expo
```

```bash
cd backend
poetry install
source ./run.sh
```


```bash
cd compute
poetry install
source ./run.sh
```

## word-level translation
```cmd
cd compute
python run.py
```


